import axios from 'axios';
import { API_BASE_URL } from './constants';
import { getSecureItem } from './secureStore';

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await getSecureItem('tt_access_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type Tokens = {
  access_token: string;
  refresh_token: string;
  timeout_token: string;
};

export async function login(email: string, password: string) {
  const { data } = await api.post<Tokens>('/auth/login', { email, password });
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
  position: string;
  payment_per_hour: number;
  location: string;
  when_need: string;
  experience_required: string;
  shift_morning: boolean;
  shift_evening: boolean;
  shift_weekends: boolean;
  shift_full_time: boolean;
  shift_part_time: boolean;
  about_job: string;
};

export async function listRoles() {
  const { data } = await api.get<RoleOut[]>('/roles');
  return data;
}

export async function likeRole(roleId: number) {
  const { data } = await api.post(`/roles/${roleId}/like`);
  return data as { liked: boolean; mutual_match: boolean };
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


