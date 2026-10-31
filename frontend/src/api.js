const BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://cricket-score-api-9xe0.onrender.com/api');
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

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check that the backend is running on port 5000', 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login')) {
      handleUnauthorized(data?.error || 'You have been logged in on another device. Please sign in again');
    }
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

export const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};
