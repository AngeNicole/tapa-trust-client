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
// Update the logged-in user's personal details (name, phone, location).
export function updateMe(payload) {
  return apiFetch('/auth/me', { method: 'PUT', body: JSON.stringify(payload) });
}

// --- categories ---
export function getCategories() {
  return apiFetch('/categories');
}
export function createCategory(payload) {
  return apiFetch('/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
}

// --- public (unauthenticated) browse ---
// Powers the logged-out landing + worker profile. Narrow public projection.
export function getPublicWorkers(skill) {
  const q = skill && skill.trim() ? `?skill=${encodeURIComponent(skill.trim())}` : '';
  return apiFetch(`/public/workers${q}`);
}
export function getPublicWorker(id) {
  return apiFetch(`/public/workers/${id}`);
}
export function getPublicWorkerHistory(id) {
  return apiFetch(`/public/workers/${id}/history`);
}

// --- workers (authed, in-app) ---
// Browse: only available workers by default; optional skill filter.
export function getWorkers(skill) {
  const q = skill && skill.trim() ? `?skill=${encodeURIComponent(skill.trim())}` : '';
  return apiFetch(`/workers${q}`);
}
// All workers regardless of availability (admin/oversight).
export function getAllWorkers() {
  return apiFetch('/workers?all=true');
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
export function setAvailability(isAvailable) {
  return apiFetch('/workers/me/availability', { method: 'PUT', body: JSON.stringify({ is_available: isAvailable }) });
}
// Simulated digital-ID verification (Tier 1) — clearly mock, not a real check.
export function submitVerification(payload) {
  return apiFetch('/workers/me/verification', { method: 'POST', body: JSON.stringify(payload || {}) });
}

// --- bookings (the trust loop) ---
// The only booking-creation path: book straight from a worker profile.
// The server auto-creates the internal task; the client never touches tasks.
export function bookWorker(workerId) {
  return apiFetch(`/bookings/book/${workerId}`, { method: 'POST' });
}
export function getBookings() {
  return apiFetch('/bookings');
}
export function getBooking(id) {
  return apiFetch(`/bookings/${id}`);
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

// --- booking chat / price agreement ---
export function getBookingMessages(bookingId) {
  return apiFetch(`/bookings/${bookingId}/messages`);
}
export function sendBookingMessage(bookingId, { body, amount } = {}) {
  return apiFetch(`/bookings/${bookingId}/messages`, { method: 'POST', body: JSON.stringify({ body: body || null, amount: amount ?? null }) });
}
export function agreeBookingPrice(bookingId, amount) {
  return apiFetch(`/bookings/${bookingId}/agree-price`, { method: 'POST', body: JSON.stringify({ amount }) });
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

// --- notifications ---
export function getNotifications() {
  return apiFetch('/notifications');
}
export function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: 'POST' });
}

// --- admin ---
export function getAdminUsers() {
  return apiFetch('/admin/users');
}
export function verifyWorker(workerId) {
  return apiFetch(`/admin/workers/${workerId}/verify`, { method: 'POST' });
}
// Reject (or send back for redo): returns the worker to unverified and stores an
// optional note the worker sees; they can fix what was missing and resubmit.
export function rejectWorker(workerId, note) {
  return apiFetch(`/admin/workers/${workerId}/reject`, { method: 'POST', body: JSON.stringify({ note: note || null }) });
}
