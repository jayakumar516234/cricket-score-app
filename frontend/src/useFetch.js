import { useCallback, useEffect, useRef, useState } from 'react';
import { api, pingServer } from './api.js';

// In-memory RAM cache for instant transitions between screens
const memoryCache = new Map();
const CACHE_PREFIX = 'cricket_c_';

export const clearMemoryCache = () => {
  memoryCache.clear();
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
    for (const k of keys) localStorage.removeItem(k);
  } catch {}
};

function readCache(path) {
  if (!path) return null;
  // 1. In-memory check (instant RAM)
  if (memoryCache.has(path)) return memoryCache.get(path);
  // 2. Persistent localStorage check for instant Stale-While-Revalidate
  // Note: We do NOT expire cached data on cold-boot; we show cached data immediately
  // while the fresh API call loads silently in the background.
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (entry && entry.data !== undefined && entry.data !== null) {
      memoryCache.set(path, entry.data);
      return entry.data;
    }
  } catch {}
  return null;
}

function writeCache(path, data) {
  if (!path || data === undefined || data === null) return;
  memoryCache.set(path, data);
  try {
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify({ time: Date.now(), data }));
  } catch {
    // If quota exceeded, clean up oldest cache entries
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
      for (const k of keys.slice(0, 15)) localStorage.removeItem(k);
    } catch {}
  }
}

/**
 * Loads `path` and reloads when it changes.
 * Supports Stale-While-Revalidate with persistent storage.
 * Automatically refetches when the user returns to the tab/app, turns on screen,
 * reconnects to the network, or window gains focus.
 * `poll` (ms) refreshes quietly in the background when tab is visible.
 */
export function useFetch(path, { poll, useCache = true, autoRetry = true } = {}) {
  const cached = useCache && path ? readCache(path) : null;
  const [data, setData] = useState(cached || null);
  const [error, setError] = useState('');
  // If we already have cached data, NEVER block the UI with a full-page skeleton loader!
  const [loading, setLoading] = useState(!cached);
  const [isValidating, setIsValidating] = useState(false);

  const dataRef = useRef(data);
  dataRef.current = data;

  const mountedRef = useRef(true);
  const lastFetchRef = useRef(0);
  const retryTimerRef = useRef(null);
  const isFetchingRef = useRef(false);

  // When path changes, switch to cached value of new path if available
  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    const c = useCache ? readCache(path) : null;
    if (c) {
      setData(c);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError('');
  }, [path, useCache]);

  const load = useCallback(async (quiet = false) => {
    if (!path || !mountedRef.current) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const hasCachedData = !!(dataRef.current || (useCache && readCache(path)));

    // Only set loading to true if we genuinely have no data to display
    if (!quiet && !hasCachedData) {
      setLoading(true);
    }
    setIsValidating(true);

    try {
      const res = await api(path);
      if (!mountedRef.current) return;

      if (useCache) writeCache(path, res);
      setData(res);
      setError('');
      lastFetchRef.current = Date.now();
    } catch (e) {
      if (!mountedRef.current) return;

      const currentHasData = !!(dataRef.current || (useCache && readCache(path)));

      // If we have cached or existing data, smoothly serve cached data without showing error
      if (currentHasData) {
        setError('');
      } else {
        if (!quiet) setError(e.message || 'Unable to load data');
      }

      // If we have NO data at all and failed (e.g. Render server waking up), automatically retry
      if (autoRetry && !currentHasData && mountedRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) load(false);
        }, 3000);
      }
    } finally {
      isFetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setIsValidating(false);
      }
    }
  }, [path, useCache, autoRetry]);

  // Initial load on mount or path change
  useEffect(() => {
    mountedRef.current = true;
    load(!!cached);

    return () => {
      mountedRef.current = false;
      clearTimeout(retryTimerRef.current);
    };
  }, [load]);

  // Automatic revalidation when user returns to app/tab (visibilitychange), focuses window, or reconnects online
  useEffect(() => {
    if (!path) return undefined;

    const handleRevalidate = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      // Debounce: only re-fetch if at least 5 seconds have passed since last fetch
      if (Date.now() - lastFetchRef.current > 5000) {
        load(true);
      }
    };

    const handleOnline = () => {
      pingServer();
      load(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleRevalidate);
      window.addEventListener('online', handleOnline);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleRevalidate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleRevalidate);
        window.removeEventListener('online', handleOnline);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleRevalidate);
      }
    };
  }, [path, load]);

  // Periodic polling (runs only when tab is active/visible)
  useEffect(() => {
    if (!poll || !path) return undefined;

    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        load(true);
      }
    }, poll);

    return () => clearInterval(interval);
  }, [poll, path, load]);

  return {
    data,
    setData,
    error,
    loading,
    isValidating,
    reload: () => load(false),
    reloadQuiet: () => load(true),
  };
}
