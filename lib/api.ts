import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { User } from './auth';
import { API_BASE_URL } from './constants';
import { deleteSecureItem, getSecureItem, saveSecureItem } from './secureStore';

export const api = axios.create({ baseURL: API_BASE_URL, maxRedirects: 0 });

// Simple logger helpers
function maskSensitive(value: any, key?: string) {
  if (!value) return value;
  const lower = (key ?? '').toLowerCase();
  if (lower.includes('password') || lower.includes('token')) return '***';
  return value;
}

function safeJson(obj: any) {
  try {
    return JSON.stringify(obj);
  } catch {
    return '[unserializable]';
  }
}

async function normalizeTokens(raw: any, hintEmail?: string): Promise<Tokens> {
  const container = (raw as any)?.rows?.[0] ?? raw;
  const maybeTokens = (container as any)?.tokens ?? container;
  const access = maybeTokens?.access_token;
  const refresh = maybeTokens?.refresh_token;
  const timeout = maybeTokens?.timeout_token;
  if (access == null || refresh == null || timeout == null) {
    throw new Error('Invalid tokens from report');
  }
  let user: User | null = (container as any)?.user_entity ?? (container as any)?.user ?? null;
  if (!user && hintEmail) {
    try {
      const userRes = await runReport<User>('user_get_by_email', { p_email: hintEmail });
      user = (userRes as any)?.rows?.[0] ?? null;
    } catch {}
  }
  if (!user) {
    user = { email: hintEmail || '', user_type: 'waiter' } as any;
  }
  return {
    access_token: String(access),
    refresh_token: String(refresh),
    timeout_token: String(timeout),
    user_entity: user as User,
  };
}

api.interceptors.request.use((config) => {
  (config as any).metadata = { start: Date.now() };
  const method = (config.method || 'get').toUpperCase();
  const url = config.baseURL ? config.url : `${API_BASE_URL}${config.url}`;
  const redactedData = config.data && typeof config.data === 'object'
    ? Object.fromEntries(Object.entries(config.data as any).map(([k, v]) => [k, maskSensitive(v, k)]))
    : config.data;
  console.log(`[API] → ${method} ${url} body=${safeJson(redactedData)}`);
  return config;
});

api.interceptors.response.use(
  (response) => {
    const meta = (response.config as any).metadata;
    const dur = meta?.start ? `${Date.now() - meta.start}ms` : 'n/a';
    console.log(`[API] ← ${response.status} ${response.config.url} (${dur})`);
    console.log(`[API Response] ← ${response.status} ${response.config.url} (${dur})`, response.data);
    return response;
  },
  (error: AxiosError) => {
    const cfg: any = error.config || {};
    const dur = cfg.metadata?.start ? `${Date.now() - cfg.metadata.start}ms` : 'n/a';
    const status = error.response?.status ?? 'ERR';
    const data = error.response?.data;
    console.warn(`[API] ← ${status} ${cfg?.url} (${dur}) err=${safeJson(data)}`);
    return Promise.reject(error);
  }
);

api.interceptors.request.use(async (config) => {
  const token = await getSecureItem('tt_access_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshQueue.push(cb);
}

function onRefreshed(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

async function logoutAndRedirect() {
  await deleteSecureItem('tt_access_token');
  await deleteSecureItem('tt_refresh_token');
  await deleteSecureItem('tt_timeout_token');
  try { await AsyncStorage.removeItem('tt_user'); } catch {}
  try {
    const { router } = await import('expo-router');
    router.replace('/start');
  } catch {}
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean });
    const status = error.response?.status;
    if (status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(async (newToken) => {
            if (!newToken) {
              reject(error);
              return;
            }
            try {
              originalRequest.headers = originalRequest.headers ?? {};
              (originalRequest.headers as any).Authorization = `Bearer ${newToken}`;
              resolve(api(originalRequest));
            } catch (e) {
              reject(e);
            }
          });
        });
      }

      isRefreshing = true;
      try {
        const newTokens = await refreshTokens();
        const access = newTokens?.access_token ?? null;
        onRefreshed(access);
        isRefreshing = false;
        if (!access) {
          await logoutAndRedirect();
          return Promise.reject(error);
        }
        // retry original request with new token
        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as any).Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (e) {
        onRefreshed(null);
        isRefreshing = false;
        await logoutAndRedirect();
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export type Tokens = {
  access_token: string;
  refresh_token: string;
  timeout_token: string;
  user_entity: User;
};

export async function login(email: string, password: string) {
  // Use backend /login endpoint to obtain tokens
  const { data } = await api.post<Tokens>('/auth/login', { email, password });
  return data;
}

export async function refreshTokens() {
  const refresh = await getSecureItem('tt_refresh_token');
  if (!refresh) return null;
  try {
    const res = await runReport<Tokens>('auth_refresh', { refresh_token: refresh });
    const data = await normalizeTokens(res);
    await saveSecureItem('tt_access_token', data.access_token);
    await saveSecureItem('tt_refresh_token', data.refresh_token);
    await saveSecureItem('tt_timeout_token', data.timeout_token);
    api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
    return data as Tokens;
  } catch (e) {
    return null;
  }
}

  export async function getUserById(id: number) {
    const { data } = await api.get<User>(`/waiters/${id}/`);
    return data;
  }

  export async function getBusinessById(id: number) {
    const { data } = await api.get<any>(`/businesses/${id}`);
    return data;
  }

export async function registerManager(payload: {
  display_name: string;
  email: string;
  password: string;
  business_name: string;
  business_location: string;
  business_type: 'bar' | 'restaurant' | 'cafe' | 'hotel';
  menu_url: string;
}) {
  const { data } = await api.post<Tokens>('/auth/register-manager', payload);
  return data;
}

export async function registerManagerBasic(payload: { display_name: string; email: string; password: string }) {
  await runReport('user_register_manager_basic', {
    p_display_name: payload.display_name,
    p_email: payload.email,
    p_password_hash: payload.password,
  });
  // Immediately login to obtain real tokens
  const tokens = await login(payload.email, payload.password);
  return tokens;
}

export async function registerWaiter(payload: { email: string; password: string; display_name?: string }) {
  await runReport('waiter_register_full', {
    p_display_name: payload.display_name ?? 'Waiter',
    p_email: payload.email,
    p_password_hash: payload.password,
  });
  // Immediately login to obtain real tokens
  const tokens = await login(payload.email, payload.password);
  return tokens;
}

export type RoleOut = {
  id: number;
  business_id: number;
  position: 'waiter' | 'bartender' | 'barista' | 'hostess' | 'shift_manager';
  payment_per_hour: number;
  min_hourly_wage?: number | null;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  when_need: 'this_week' | 'always_looking';
  experience_required: 'no_experience' | 'some_experience' | 'experience_only';
  shift_morning: boolean;
  shift_evening: boolean;
  shift_weekends: boolean;
  shift_full_time: boolean;
  shift_part_time: boolean;
  about_job?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type RoleCreate = {
  business_id: number;
  position: RoleOut['position'];
  payment_per_hour: number;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  when_need: RoleOut['when_need'];
  experience_required: RoleOut['experience_required'];
  shift_morning: boolean;
  shift_evening: boolean;
  shift_weekends: boolean;
  shift_full_time: boolean;
  shift_part_time: boolean;
  about_job?: string | null;
  min_hourly_wage?: number | null;
  is_active?: boolean;
};

export type RoleUpdate = Partial<Omit<RoleCreate, 'business_id'>> & { business_id?: number };

export async function listRoles(position: RoleOut['position'] = 'waiter') {
  const res = await runReport<RoleOut>('roles_by_position', { p_position: position });
  return res.rows as RoleOut[];
}

export async function likeRole(roleId: number) {
  const { data } = await api.post(`/roles/${roleId}/like/`);
  return data as { liked: boolean; mutual_match: boolean };
}

export async function getRole(roleId: number) {
  const { data } = await api.get<RoleOut>(`/roles/${roleId}/`);
  return data;
}

export async function createRole(payload: RoleCreate) {
  const { data } = await api.post<RoleOut>('/roles/', payload);
  return data;
}

export async function updateRole(roleId: number, payload: RoleUpdate) {
  const { data } = await api.put<RoleOut>(`/roles/${roleId}/`, payload);
  return data;
}

export async function deleteRole(roleId: number) {
  const { data } = await api.delete(`/roles/${roleId}/`);
  return data as { ok: boolean };
}

export type BusinessOut = {
  id: number;
  manager_user_ids: number[];
  name: string;
  location: string;
  business_type: 'bar' | 'restaurant' | 'cafe' | 'hotel';
  menu_url?: string;
  images?: string[];
};

export async function listBusinesses(managerUserId: number) {
  const res = await runReport<BusinessOut>('business_list_by_manager', { p_manager_user_id: managerUserId });
  return res.rows;
}

export type BusinessCreate = {
  name: string;
  location: string;
  business_type: 'bar' | 'restaurant' | 'cafe' | 'hotel';
  menu_url?: string;
  images?: string[];
  manager_user_ids?: number[];
};

export type BusinessUpdate = Partial<BusinessCreate>;

export async function createBusiness(payload: BusinessCreate) {
  const res = await runReport<BusinessOut>('business_create', {
    p_name: payload.name,
    p_location: payload.location,
    p_business_type: payload.business_type,
    p_menu_url: payload.menu_url,
    // Images should be uploaded after creation via upload endpoint
    p_manager_user_ids: payload.manager_user_ids,
  });
  return res.rows[0] as BusinessOut;
}

export async function updateBusiness(businessId: number, payload: BusinessUpdate & { requester_user_id?: number }) {
  const updates = { ...payload } as any;
  delete updates.requester_user_id;
  const res = await runReport<BusinessOut>('business_update', {
    p_business_id: businessId,
    p_manager_user_id: payload.requester_user_id ?? null,
    p_updates: updates,
  });
  return res.rows[0] as BusinessOut;
}

export async function deleteBusiness(businessId: number) {
  const { data } = await api.delete(`/businesses/${businessId}`);
  return data as { ok: boolean };
}

export async function uploadBusinessImages(businessId: number, files: { uri: string; name?: string; type?: string }[]) {
  const form = new FormData();
  for (const f of files) {
    form.append('files', {
      // @ts-ignore - React Native File type
      uri: f.uri,
      name: f.name ?? 'upload.jpg',
      type: f.type ?? 'image/jpeg',
    } as any);
  }
  const { data } = await api.post<BusinessOut>(`/businesses/${businessId}/images`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function addBusinessManager(businessId: number, requesterUserId: number, email: string) {
  const res = await runReport<BusinessOut>('business_add_manager_by_email', {
    p_business_id: businessId,
    p_requester_id: requesterUserId,
    p_email: email,
  });
  return res.rows[0] as BusinessOut;
}

// Waiter profile/preferences
export type WaiterOut = {
  user_id: number;
  display_name: string;
  email: string;
  status?: 'pre_army' | 'post_army' | 'student' | 'other';
  looking_for?: Array<'waiter' | 'bartender' | 'barista' | 'hostess' | 'shift_manager' | 'manager'>;
  about_me?: string;
  distance_km?: number;
  min_hourly_wage?: number;
  shifts_per_week?: number;
  hours?: Array<'part_time' | 'full_time' | 'morning' | 'evening' | 'weekends'>;
  experience?: Array<'waiter' | 'barman' | 'barista' | 'shift_manager' | 'host'>;
  people_say?: Array<'best_coffee_maker' | 'good_vibe' | 'best_cocktails' | 'customers_love_me'>;
  skills?: Array<'customer_service' | 'basic_computer' | 'coffee_making' | 'teamwork' | 'food_service' | 'working_under_pressure' | 'table_management'>;
};

export type WaiterUpdate = Partial<Omit<WaiterOut, 'user_id' | 'email'>>;

export async function getWaiter(userId: number) {
  // If still supported, fallback to REST. Otherwise use a report if available in future.
  const { data } = await api.get<WaiterOut>(`/waiters/${userId}/`);
  return data;
}

export async function updateWaiter(userId: number, payload: WaiterUpdate) {
  const res = await runReport<WaiterOut>('waiter_upsert_profile', {
    p_user_id: userId,
    p_status: payload.status,
    p_about_me: payload.about_me,
    p_distance_km: payload.distance_km,
    p_min_hourly_wage: payload.min_hourly_wage,
    p_shifts_per_week: payload.shifts_per_week,
    p_hours: payload.hours,
    p_experience: payload.experience,
    p_people_say: payload.people_say,
    p_skills: payload.skills,
    p_looking_for: payload.looking_for,
    p_display_name: payload.display_name,
  });
  return res.rows[0] as WaiterOut;
}

export async function createWaiterProfile(payload: Partial<WaiterOut>) {
  const { data } = await api.post<WaiterOut>('/waiters/', payload as any);
  return data;
}

export async function updateWaiterMe(payload: WaiterUpdate) {
  try {
    console.log('updateWaiterMe', payload);
    const { data } = await api.put<WaiterOut>('/waiters/me/', payload);
    return data;
  } catch (e: any) {
    const resp = e?.response?.data;
    if (resp) {
      console.warn('updateWaiterMe failed:', resp);
      throw new Error(typeof resp === 'string' ? resp : JSON.stringify(resp));
    }
    throw e;
  }
}

export type NotificationOut = {
  id: number;
  type: string;
  payload: any;
  created_at?: string;
  read_at?: string | null;
};

export async function listNotifications() {
  const { data } = await api.get<NotificationOut[]>('/notifications');
  return data;
}

export async function markNotificationRead(notificationId: number) {
  const { data } = await api.post(`/notifications/${notificationId}/read`);
  return data as { ok: boolean };
}

export async function deleteNotification(notificationId: number) {
  const { data } = await api.delete(`/notifications/${notificationId}`);
  return data as { ok: boolean };
}

export type Conversation = { id: number; participant_user_ids: number[] };

export async function listConversations() {
  const { data } = await api.get<Conversation[]>('/chat/conversations');
  return data;
}

export type ReportResult<T = any> = { report_name: string; rows: T[] };

export async function runReport<T = any>(report_name: string, parameters: Record<string, any>) {
  const { data } = await api.post<ReportResult<T>>('/reports/run', { report_name, parameters });
  return data;
}

export async function listNearbyRoles(userId: number, lat: number, lng: number, distanceKm?: number | null) {
  const params: any = { p_user_id: userId, p_lat: lat, p_lng: lng };
  if (distanceKm !== undefined) params.p_distance_km = distanceKm;
  const res = await runReport<RoleOut>('unswiped_roles_nearby', params);
  return res.rows;
}


