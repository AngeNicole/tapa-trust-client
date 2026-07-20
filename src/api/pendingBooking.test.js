import { describe, it, expect, beforeEach } from 'vitest';
import {
  setPendingBooking, getPendingBooking, clearPendingBooking, resumeAfterAuth,
} from './pendingBooking.js';

// Remembers which worker a logged-out visitor was booking, across the auth
// redirect. Backed by sessionStorage (cleared between tests by the global setup).
describe('pendingBooking', () => {
  beforeEach(() => clearPendingBooking());

  it('round-trips a worker id as a number', () => {
    setPendingBooking(42);
    expect(getPendingBooking()).toBe(42);
  });

  it('returns null when nothing is pending', () => {
    expect(getPendingBooking()).toBeNull();
  });

  it('clears the pending booking', () => {
    setPendingBooking(7);
    clearPendingBooking();
    expect(getPendingBooking()).toBeNull();
  });

  it('resumeAfterAuth returns null and clears when there is no pending booking', async () => {
    const dest = await resumeAfterAuth({ role: 'requester' });
    expect(dest).toBeNull();
    expect(getPendingBooking()).toBeNull();
  });

  it('resumeAfterAuth does nothing for a non-requester even if a booking is pending', async () => {
    setPendingBooking(9);
    const dest = await resumeAfterAuth({ role: 'worker' });
    expect(dest).toBeNull();
    expect(getPendingBooking()).toBeNull(); // always cleared so it can't re-fire
  });
});
