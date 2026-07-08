import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser } from '../types';
import { login as loginRequest, me as meRequest } from '../api/auth';
import { queryClient } from '../lib/queryClient';

const TENANT_SESSION_KEYS = ['portal-bookings-success-message'];
const AUTH_TOKEN_KEY = 'kost48_access_token';
const AUTH_USER_CACHE_KEY = 'kost48_last_authenticated_user';

function readCachedUser(): AuthUser | null {
  try {
    const value = sessionStorage.getItem(AUTH_USER_CACHE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<AuthUser>;
    if (
      typeof parsed.id !== 'number'
      || typeof parsed.fullName !== 'string'
      || typeof parsed.email !== 'string'
      || !['OWNER', 'ADMIN', 'STAFF', 'TENANT'].includes(String(parsed.role))
    ) {
      return null;
    }
    return parsed as AuthUser;
  } catch {
    return null;
  }
}

function cacheUser(user: AuthUser | null) {
  if (user) {
    sessionStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
  }
}

function clearTenantSessionStorage() {
  TENANT_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
}

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => (token ? readCachedUser() : null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await meRequest();
        setUser(me);
        cacheUser(me);
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          cacheUser(null);
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    async login(identifier: string, password: string) {
      clearTenantSessionStorage();
      queryClient.clear();
      const result = await loginRequest(identifier, password);
      localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken);
      cacheUser(result.user);
      setToken(result.accessToken);
      setUser(result.user);
      return result.user;
    },
    logout() {
      // P3-01: revoke refresh token di server (httpOnly cookie dikirim otomatis)
      fetch((import.meta.env.VITE_API_BASE_URL || '/api') + '/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch((e) => {
        console.warn("[Auth] Logout fetch gagal:", e);
        // tetap logout lokal walau server error
      });
      localStorage.removeItem(AUTH_TOKEN_KEY);
      cacheUser(null);
      clearTenantSessionStorage();
      queryClient.clear();
      setToken(null);
      setUser(null);
    },
    async refreshMe() {
      const me = await meRequest();
      cacheUser(me);
      setUser(me);
    },
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
