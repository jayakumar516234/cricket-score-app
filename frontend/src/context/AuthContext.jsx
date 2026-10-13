import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) return;
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, [logout]);

  const login = async (identifier, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { identifier, password } });
    setToken(d.token);
    setUser(d.user);
  };
  const register = async (name, username, phone, password) => {
    const d = await api('/auth/register', { method: 'POST', body: { name, username, phone, password } });
    setToken(d.token);
    setUser(d.user);
  };

  const isSuper = user?.role === 'superadmin';
  const isViewer = user?.role === 'viewer';

  return <AuthContext.Provider value={{ user, loading, login, register, logout, isSuper, isViewer }}>{children}</AuthContext.Provider>;
}
