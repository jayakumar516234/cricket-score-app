import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

// In-memory response cache for instant UI rendering across navigation
const memoryCache = new Map();

/** Loads `path` and reloads when it changes. `poll` (ms) refreshes quietly in the background. */
export function useFetch(path, { poll, useCache = true } = {}) {
  const cached = useCache && path ? memoryCache.get(path) : null;
  const [data, setData] = useState(cached || null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!cached);

  const load = useCallback(async (quiet = false) => {
    if (!path) return;
    if (!quiet && !memoryCache.has(path)) setLoading(true);
    try {
      const res = await api(path);
      if (useCache) memoryCache.set(path, res);
      setData(res);
      setError('');
    } catch (e) {
      if (!quiet) setError(e.message);
    } finally {
      if (!quiet) setLoading(false);
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
