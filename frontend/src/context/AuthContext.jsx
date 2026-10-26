import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('cricket_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  // Instant open: if user is already cached in localStorage, don't block the UI!
  const [loading, setLoading] = useState(() => !!getToken() && !localStorage.getItem('cricket_user'));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('cricket_user');
    } catch {}
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) {
      setLoading(false);
      return;
    }
    // Verify / refresh session in background without stalling app open
    api('/auth/me')
      .then((d) => {
        setUser(d.user);
        try {
          localStorage.setItem('cricket_user', JSON.stringify(d.user));
        } catch {}
      })
      .catch((err) => {
        // Only log out if specifically unauthorized 401
        if (err?.status === 401) {
          logout();
        }
      })
      .finally(() => setLoading(false));
  }, [logout]);

  const login = async (identifier, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { identifier, password } });
    setToken(d.token);
    setUser(d.user);
    try {
      localStorage.setItem('cricket_user', JSON.stringify(d.user));
    } catch {}
    return d.user;
  };
  const register = async (name, username, phone, password) => {
    const d = await api('/auth/register', { method: 'POST', body: { name, username, phone, password } });
    setToken(d.token);
    setUser(d.user);
    try {
      localStorage.setItem('cricket_user', JSON.stringify(d.user));
    } catch {}
  };

  const isSuper = user?.role === 'superadmin';
  const isAdmin = isSuper || user?.role === 'admin';
  const isViewer = user?.role === 'viewer';

  const updateUser = (updated) => {
    setUser((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem('cricket_user', JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const updateToken = (newToken) => setToken(newToken);

  return <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, updateToken, isSuper, isAdmin, isViewer }}>{children}</AuthContext.Provider>;
}
