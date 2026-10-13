import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

/** Loads `path` and reloads when it changes. `poll` (ms) refreshes quietly in the background. */
export function useFetch(path, { poll } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const first = useRef(true);

  const load = useCallback(async (quiet = false) => {
    if (!path) return;
    if (!quiet) setLoading(true);
    try {
      setData(await api(path));
      setError('');
    } catch (e) {
      if (!quiet) setError(e.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    first.current = true;
    load();
  }, [load]);

  useEffect(() => {
    if (!poll || !path) return undefined;
    const t = setInterval(() => load(true), poll);
    return () => clearInterval(t);
  }, [poll, path, load]);

  return { data, setData, error, loading, reload: () => load(), reloadQuiet: () => load(true) };
}
