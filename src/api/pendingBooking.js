import { bookWorker } from './client.js';

// Remembers which worker a logged-out visitor was booking, so we can resume
// the booking after they register/log in. Kept in sessionStorage so it survives
// the navigation between the public page and the auth screens.
const KEY = 'tapa_pending_book';

export function setPendingBooking(workerId) {
  try { sessionStorage.setItem(KEY, String(workerId)); } catch { /* ignore */ }
}
export function getPendingBooking() {
  try { const v = sessionStorage.getItem(KEY); return v ? Number(v) : null; } catch { return null; }
}
export function clearPendingBooking() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

// After authentication, if there's a pending booking and the user is a
// requester, create it. Returns the path to land on, or null (caller falls
// back to the normal post-auth destination).
//   - success → '/requester?tab=bookings' (land on the new booking, not browse)
//   - failure → back to the worker's public profile so they can retry Book
// Pending is always cleared so we never re-fire it on a later login.
export async function resumeAfterAuth(user) {
  const id = getPendingBooking();
  if (!id || user?.role !== 'requester') {
    clearPendingBooking();
    return null;
  }
  try {
    await bookWorker(id);
    clearPendingBooking();
    // Flag survives the PublicOnly → homePath redirect (which strips query params),
    // so the dashboard reliably lands on Bookings and shows the continue prompt.
    try { sessionStorage.setItem('tapa_after_book', '1'); } catch { /* ignore */ }
    return '/requester?tab=bookings&booked=1';
  } catch (e) {
    clearPendingBooking();
    // Already had an active booking with this worker (server 409) → their booking
    // is already in the dashboard; send them there, not back to the public profile.
    if (e?.status === 409) {
      try { sessionStorage.setItem('tapa_after_book', '1'); } catch { /* ignore */ }
      return '/requester?tab=bookings';
    }
    return `/workers/${id}`;
  }
}
