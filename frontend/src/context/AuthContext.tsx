import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser } from '../types';
import { login as loginRequest, me as meRequest } from '../api/auth';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('kost48_access_token'));
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
      } catch {
        localStorage.removeItem('kost48_access_token');
        setToken(null);
        setUser(null);
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
    async login(email: string, password: string) {
      const result = await loginRequest(email, password);
      localStorage.setItem('kost48_access_token', result.accessToken);
      setToken(result.accessToken);
      setUser(result.user);
      return result.user;
    },
    logout() {
      localStorage.removeItem('kost48_access_token');
      setToken(null);
      setUser(null);
    },
    async refreshMe() {
      const me = await meRequest();
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
