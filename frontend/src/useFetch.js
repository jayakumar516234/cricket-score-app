import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

// In-memory cache for ultra-fast navigation between screens
const memoryCache = new Map();
const CACHE_PREFIX = 'cricket_c_';
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export const clearMemoryCache = () => {
  memoryCache.clear();
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
    for (const k of keys) localStorage.removeItem(k);
  } catch {}
};

function readCache(path) {
  if (!path) return null;
  // 1. Fast in-memory RAM check
  if (memoryCache.has(path)) return memoryCache.get(path);
  // 2. Persistent localStorage check for instant cold startup on mobile
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (entry && Date.now() - entry.time < MAX_CACHE_AGE_MS) {
      memoryCache.set(path, entry.data);
      return entry.data;
    }
  } catch {}
  return null;
}

function writeCache(path, data) {
  if (!path || !data) return;
  memoryCache.set(path, data);
  try {
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify({ time: Date.now(), data }));
  } catch {
    // If quota exceeded, clean up old cache entries
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
      for (const k of keys.slice(0, 10)) localStorage.removeItem(k);
    } catch {}
  }
}

/** 
 * Loads `path` and reloads when it changes. 
 * Supports instant stale-while-revalidate from persistent cache.
 * `poll` (ms) refreshes quietly in the background. 
 */
export function useFetch(path, { poll, useCache = true } = {}) {
  const cached = useCache && path ? readCache(path) : null;
  const [data, setData] = useState(cached || null);
  const [error, setError] = useState('');
  // If we already have cached data, NEVER block the UI with a full-page loading state!
  const [loading, setLoading] = useState(!cached);

  const load = useCallback(async (quiet = false) => {
    if (!path) return;
    if (!quiet && !memoryCache.has(path)) setLoading(true);
    try {
      const res = await api(path);
      if (useCache) writeCache(path, res);
      setData(res);
      setError('');
    } catch (e) {
      if (!quiet) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path, useCache]);

  useEffect(() => {
    load(!!cached);
  }, [load]);

  useEffect(() => {
    if (!poll || !path) return undefined;
    const t = setInterval(() => load(true), poll);
    return () => clearInterval(t);
  }, [poll, path, load]);

  return { data, setData, error, loading, reload: () => load(), reloadQuiet: () => load(true) };
}
