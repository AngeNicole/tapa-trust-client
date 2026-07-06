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
    return '/requester?tab=bookings&booked=1';
  } catch {
    clearPendingBooking();
    return `/workers/${id}`;
  }
}
