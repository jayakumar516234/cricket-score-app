import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { useAuth } from './AuthContext.jsx';

const MenuConfigContext = createContext(null);
export const useMenuConfig = () => useContext(MenuConfigContext);

// Keys that are always visible regardless of config
const ALWAYS_VISIBLE = ['home', 'settings'];

export function MenuConfigProvider({ children }) {
  const { user } = useAuth();
  const [visibleKeys, setVisibleKeys] = useState(null); // null = not yet loaded
  const [features, setFeatures] = useState({ offlineModeEnabled: false, liveMatchEnabled: true });

  const loadConfig = useCallback(async () => {
    try {
      const featRes = await api('/config/features/public').catch(() => null);
      if (featRes?.features) {
        setFeatures(featRes.features);
      }
    } catch {}

    if (!user) {
      setVisibleKeys(null);
      return;
    }
    try {
      const d = await api('/config/menu-visibility/public');
      setVisibleKeys(d.visibleKeys);
    } catch {
      // On error, show all menus (fail open)
      setVisibleKeys(null);
    }
  }, [user]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const isVisible = useCallback(
    (key) => {
      if (!visibleKeys) return true; // not loaded yet → show all
      if (ALWAYS_VISIBLE.includes(key)) return true;
      return visibleKeys.includes(key);
    },
    [visibleKeys]
  );

  return (
    <MenuConfigContext.Provider value={{ visibleKeys, isVisible, features, reload: loadConfig }}>
      {children}
    </MenuConfigContext.Provider>
  );
}
