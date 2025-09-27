import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { User } from './auth';
import { API_BASE_URL } from './constants';
import { deleteSecureItem, getSecureItem, saveSecureItem } from './secureStore';

export const api = axios.create({ baseURL: API_BASE_URL });

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
    const { data } = await api.post<Tokens>('/auth/login', { email, password });
    return data;
  }

export async function refreshTokens() {
  const refresh = await getSecureItem('tt_refresh_token');
  if (!refresh) return null;
  try {
    const { data } = await api.post<Tokens>('/auth/refresh', { refresh_token: refresh });
    await saveSecureItem('tt_access_token', data.access_token);
    await saveSecureItem('tt_refresh_token', data.refresh_token);
    await saveSecureItem('tt_timeout_token', data.timeout_token);
    api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
    return data;
  } catch (e) {
    return null;
  }
}

  export async function getUserById(id: number) {
    const { data } = await api.get<User>(`/waiters/${id}`);
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

export async function registerWaiter(payload: { email: string; password: string }) {
  const { data } = await api.post<Tokens>('/auth/register', payload);
  return data;
}

export type RoleOut = {
  id: number;
  business_id: number;
  position: 'waiter' | 'bartender' | 'barista' | 'hostess' | 'shift_manager';
  payment_per_hour: number;
  min_hourly_wage?: number | null;
  location: string;
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

export async function listRoles() {
  const { data } = await api.get<RoleOut[]>('/roles');
  return data;
}

export async function likeRole(roleId: number) {
  const { data } = await api.post(`/roles/${roleId}/like`);
  return data as { liked: boolean; mutual_match: boolean };
}

export async function getRole(roleId: number) {
  const { data } = await api.get<RoleOut>(`/roles/${roleId}`);
  return data;
}

export async function createRole(payload: RoleCreate) {
  const { data } = await api.post<RoleOut>('/roles', payload);
  return data;
}

export async function updateRole(roleId: number, payload: RoleUpdate) {
  const { data } = await api.put<RoleOut>(`/roles/${roleId}`, payload);
  return data;
}

export async function deleteRole(roleId: number) {
  const { data } = await api.delete(`/roles/${roleId}`);
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

export async function listBusinesses() {
  const { data } = await api.get<BusinessOut[]>('/businesses');
  return data;
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
  const { data } = await api.post<BusinessOut>('/businesses', payload);
  return data;
}

export async function updateBusiness(businessId: number, payload: BusinessUpdate) {
  const { data } = await api.put<BusinessOut>(`/businesses/${businessId}`, payload);
  return data;
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

export async function addBusinessManager(businessId: number, email: string) {
  const { data } = await api.post<BusinessOut>(`/businesses/${businessId}/managers`, { email });
  return data;
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


