export const BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://cricket-score-api-9xe0.onrender.com/api');
const TOKEN_KEY = 'cricket_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

let isRedirectingToLogin = false;

export function handleUnauthorized(errorMessage) {
  const hadToken = !!getToken();
  setToken(null);
  try {
    localStorage.removeItem('cricket_user');
    if (errorMessage) {
      sessionStorage.setItem('auth_notice', errorMessage);
    }
  } catch {}

  try {
    if (typeof onUnauthorized === 'function') {
      onUnauthorized(errorMessage);
    }
  } catch {}

  // If user had an active session and hits 401 on an authenticated screen, force clean redirect to /login
  if (hadToken && typeof window !== 'undefined' && !isRedirectingToLogin) {
    const pathname = window.location.pathname || '';
    if (!pathname.startsWith('/login') && !pathname.startsWith('/super-login') && !pathname.startsWith('/live/')) {
      isRedirectingToLogin = true;
      window.location.href = '/login';
    }
  }
}

/**
 * Lightweight health check to wake up Render container immediately on tab wake / app open
 */
export async function pingServer() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    await fetch(`${BASE}/health`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {
    // Ignore ping errors
  }
}

// HTTP status codes that indicate Render spinning up or temporary upstream failure
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export async function api(path, { method = 'GET', body, timeout = 25000, retries = 3 } = {}) {
  // We automatically retry idempotent GET requests when server is cold-starting
  const canRetry = method === 'GET' && retries > 0;
  let attempt = 0;
  const maxAttempts = canRetry ? retries : 1;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      let data = null;
      try { data = await res.json(); } catch { /* empty body */ }

      if (!res.ok) {
        if (res.status === 401 && !path.startsWith('/auth/login')) {
          handleUnauthorized(data?.error || 'You have been logged in on another device. Please sign in again');
          throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data);
        }

        // If server is spinning up or returning gateway 502/503/504, auto-retry with backoff
        if (canRetry && RETRYABLE_STATUSES.has(res.status) && attempt < maxAttempts) {
          const delay = Math.min(1200 * Math.pow(1.8, attempt - 1), 5000);
          console.warn(`[api] Received ${res.status} for ${path}, retrying (${attempt + 1}/${maxAttempts}) in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data);
      }

      return data;
    } catch (err) {
      clearTimeout(timer);

      // Never swallow 401
      if (err instanceof ApiError && err.status === 401) {
        throw err;
      }

      lastError = err;

      const isNetworkError =
        err.name === 'AbortError' ||
        err instanceof TypeError ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('network') ||
        err.message?.includes('aborted');

      if (canRetry && isNetworkError && attempt < maxAttempts) {
        const delay = Math.min(1200 * Math.pow(1.8, attempt - 1), 5000);
        console.warn(`[api] Connection issue for ${path} (${err.message}), retrying (${attempt + 1}/${maxAttempts}) in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (err instanceof ApiError) throw err;
      throw new ApiError(
        err.name === 'AbortError'
          ? 'Request timed out while connecting to server'
          : 'Cannot reach the server. Please check your internet connection.',
        0
      );
    }
  }

  throw lastError || new ApiError('Request failed after retries', 0);
}

api.get = (path, opts) => api(path, { method: 'GET', ...opts });
api.post = (path, body, opts) => api(path, { method: 'POST', body, ...opts });
api.put = (path, body, opts) => api(path, { method: 'PUT', body, ...opts });
api.delete = (path, body, opts) => api(path, { method: 'DELETE', body, ...opts });

export const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};
