import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Tokens } from './api';
import { SECURE_STORE_KEYS } from './constants';
import { deleteSecureItem, getSecureItem, saveSecureItem } from './secureStore';

type AuthContextType = {
  accessToken: string | null;
  setTokens: (tokens: Tokens | null) => Promise<void>;
  isHydrating: boolean;
  user: User | null;
  setUser: (user: User | null) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const queryClient = new QueryClient();

const USER_STORAGE_KEY = 'tt_user';

export type User = {
  id?: number;
  email: string;
  display_name?: string;
  user_type: 'business_manager' | 'waiter';
  is_active?: boolean;
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getSecureItem(SECURE_STORE_KEYS.accessToken);
      const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
      setAccessToken(token);
      setUserState(userJson ? (JSON.parse(userJson) as User) : null);
      setIsHydrating(false);
    })();
  }, []);

  const setTokens = async (tokens: Tokens | null) => {
    if (!tokens) {
      await deleteSecureItem(SECURE_STORE_KEYS.accessToken);
      await deleteSecureItem(SECURE_STORE_KEYS.refreshToken);
      await deleteSecureItem(SECURE_STORE_KEYS.timeoutToken);
      setAccessToken(null);
      return;
    }
    await saveSecureItem(SECURE_STORE_KEYS.accessToken, tokens.access_token);
    await saveSecureItem(SECURE_STORE_KEYS.refreshToken, tokens.refresh_token);
    await saveSecureItem(SECURE_STORE_KEYS.timeoutToken, tokens.timeout_token);
    setAccessToken(tokens.access_token);
  };

  const setUser = async (next: User | null) => {
    if (next) {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
    } else {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    }
    setUserState(next);
  };

  const value = useMemo(
    () => ({ accessToken, setTokens, isHydrating, user, setUser }),
    [accessToken, isHydrating, user]
  );

  return (
    <AuthContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within Providers');
  return ctx;
}


