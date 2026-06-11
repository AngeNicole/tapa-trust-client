// Thin fetch wrapper around the backend API.
// The backend base URL (including the /api path) comes from VITE_API_URL so the
// same build works locally and when deployed. No hardcoded localhost here:
// set it in client/.env (see client/.env.example).
const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL) {
  // Surface misconfiguration early instead of silently calling the wrong origin.
  console.error('VITE_API_URL is not set. Copy client/.env.example to client/.env and set it.');
}

const TOKEN_KEY = 'tapa_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  // Attach the JWT as a Bearer header when we have one.
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (body && body.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return body;
}

// --- health ---
export function getHealth() {
  return apiFetch('/health');
}

// --- auth ---
export function registerUser(payload) {
  return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}
export function loginUser(payload) {
  return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}
export function fetchMe() {
  return apiFetch('/auth/me');
}
