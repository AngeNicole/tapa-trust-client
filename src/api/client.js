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

// --- categories ---
export function getCategories() {
  return apiFetch('/categories');
}
export function createCategory(payload) {
  return apiFetch('/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
}

// --- workers ---
export function getWorkers() {
  return apiFetch('/workers');
}
export function getWorker(id) {
  return apiFetch(`/workers/${id}`);
}
export function getWorkerHistory(id) {
  return apiFetch(`/workers/${id}/history`);
}
export function getMyWorkerProfile() {
  return apiFetch('/workers/me');
}
export function updateMyWorkerProfile(payload) {
  return apiFetch('/workers/me', { method: 'PUT', body: JSON.stringify(payload) });
}

// --- tasks ---
export function createTask(payload) {
  return apiFetch('/tasks', { method: 'POST', body: JSON.stringify(payload) });
}
export function getMyTasks() {
  return apiFetch('/tasks');
}
export function getTask(id) {
  return apiFetch(`/tasks/${id}`);
}

// --- bookings (the trust loop) ---
export function createBooking(payload) {
  return apiFetch('/bookings', { method: 'POST', body: JSON.stringify(payload) });
}
export function getBookings() {
  return apiFetch('/bookings');
}
const bookingAction = (id, action) => apiFetch(`/bookings/${id}/${action}`, { method: 'POST' });
export const acceptBooking = (id) => bookingAction(id, 'accept');
export const checkinBooking = (id) => bookingAction(id, 'checkin');
export const confirmStart = (id) => bookingAction(id, 'confirm-start');
export const checkoutBooking = (id) => bookingAction(id, 'checkout');
export const confirmCompletion = (id) => bookingAction(id, 'confirm-completion');
export function getPaymentStatus(id) {
  return apiFetch(`/bookings/${id}/payment-status`);
}
export function rebookWorker(workerId) {
  return apiFetch(`/bookings/rebook/${workerId}`, { method: 'POST' });
}

// --- reviews ---
export function createReview(payload) {
  return apiFetch('/reviews', { method: 'POST', body: JSON.stringify(payload) });
}

// --- saved workers ---
export function getSavedWorkers() {
  return apiFetch('/saved-workers');
}
export function saveWorker(workerId) {
  return apiFetch('/saved-workers', { method: 'POST', body: JSON.stringify({ worker_id: workerId }) });
}
export function unsaveWorker(workerId) {
  return apiFetch(`/saved-workers/${workerId}`, { method: 'DELETE' });
}

// --- admin ---
export function getAdminUsers() {
  return apiFetch('/admin/users');
}
