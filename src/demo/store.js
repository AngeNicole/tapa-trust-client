// ---------------------------------------------------------------------------
// Client-side demo store for the TaPa Trust loop.
//
// The backend's feature endpoints (workers/tasks/bookings/...) are not built
// yet, so this store holds the demo state in localStorage and exposes simple
// mutators. It lets the full trust loop run end-to-end in the browser:
//
//   post task -> select worker -> accept -> mutual check-in / confirm-start
//   -> check-out / confirm-completion -> payment released -> review -> rebook
//
// State is shared across tabs (e.g. worker in one tab, requester in another)
// via the `storage` event, so a presenter can show both sides live.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';

const KEY = 'tapa_demo_state_v1';
const listeners = new Set();

const SKILL_CATEGORIES = [
  'Plumbing',
  'Cleaning',
  'Moving / Lifting',
  'Electrical',
  'Furniture assembly',
  'Mounting / Installation',
  'Basic tech setup',
];

function seed() {
  return {
    categories: SKILL_CATEGORIES.map((name, i) => ({ category_id: i + 1, name })),
    workers: [
      {
        worker_id: 1,
        name: 'Jean Bosco',
        skills: 'Plumbing, Mounting / Installation',
        bio: 'Ten years fixing leaks and installing fixtures across Kigali.',
        rating: 4.8,
        tier: 'Admin-Certified',
      },
      {
        worker_id: 2,
        name: 'Aline Uwase',
        skills: 'Cleaning, Furniture assembly',
        bio: 'Fast, careful home cleaning and flat-pack assembly.',
        rating: 4.6,
        tier: 'Peer-Verified',
      },
      {
        worker_id: 3,
        name: 'Eric Niyonzima',
        skills: 'Electrical, Basic tech setup',
        bio: 'Licensed electrician. Wi-Fi, TVs and smart-home setup.',
        rating: 4.9,
        tier: 'Admin-Certified',
      },
      {
        worker_id: 4,
        name: 'Claudine Mukamana',
        skills: 'Moving / Lifting, Cleaning',
        bio: 'Reliable moving help and deep cleaning.',
        rating: 4.4,
        tier: 'Unverified',
      },
    ],
    tasks: [],
    bookings: [],
    savedWorkerIds: [],
    // the logged-in worker's own profile (the worker dashboard edits this)
    myProfile: {
      skills: 'Plumbing, Pipe fitting',
      bio: 'Experienced plumber serving Kigali. Available weekdays for installations and repairs.',
      rating: 0,
      tier: 'Unverified',
    },
    seq: { task: 1, booking: 1 },
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to seed */
  }
  const fresh = seed();
  localStorage.setItem(KEY, JSON.stringify(fresh));
  return fresh;
}

function write(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

// Apply a mutator function (state -> newState) and persist.
function update(mutator) {
  const next = mutator(read());
  write(next);
  return next;
}

// Cross-tab sync: when another tab writes, notify our listeners.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) listeners.forEach((l) => l());
  });
}

// --- mutators -------------------------------------------------------------

export function resetDemo() {
  write(seed());
}

export function postTask({ title, categoryId, description, location, requester }) {
  return update((s) => {
    const task_id = s.seq.task;
    s.tasks.push({
      task_id,
      title,
      category_id: categoryId ? Number(categoryId) : null,
      description: description || '',
      location: location || '',
      status: 'open',
      requesterName: requester?.name || 'Requester',
      requesterUserId: requester?.user_id ?? null,
    });
    s.seq.task += 1;
    return s;
  });
}

// Requester selects a worker for a task -> creates a pending booking.
export function selectWorker({ taskId, workerId }) {
  return update((s) => {
    const task = s.tasks.find((t) => t.task_id === Number(taskId));
    const worker = s.workers.find((w) => w.worker_id === Number(workerId));
    if (!task || !worker) return s;
    const booking_id = s.seq.booking;
    s.bookings.push({
      booking_id,
      task_id: task.task_id,
      taskTitle: task.title,
      worker_id: worker.worker_id,
      workerName: worker.name,
      requesterName: task.requesterName,
      requesterUserId: task.requesterUserId ?? null,
      status: 'pending', // pending -> accepted -> in_progress -> completed
      checkedIn: false,
      startConfirmed: false,
      checkedOut: false,
      endConfirmed: false,
      payment: 'pending', // pending -> confirmed -> released
      review: null,
    });
    task.status = 'assigned';
    s.seq.booking += 1;
    return s;
  });
}

// Generic booking patch by id.
function patchBooking(bookingId, patch) {
  return update((s) => {
    const b = s.bookings.find((x) => x.booking_id === Number(bookingId));
    if (b) Object.assign(b, typeof patch === 'function' ? patch(b) : patch);
    return s;
  });
}

export const acceptBooking = (id) => patchBooking(id, { status: 'accepted' });
export const checkIn = (id) => patchBooking(id, { checkedIn: true });
export const confirmStart = (id) =>
  patchBooking(id, { startConfirmed: true, status: 'in_progress', payment: 'confirmed' });
export const checkOut = (id) => patchBooking(id, { checkedOut: true });

export function confirmCompletion(id) {
  return update((s) => {
    const b = s.bookings.find((x) => x.booking_id === Number(id));
    if (b) {
      b.endConfirmed = true;
      b.status = 'completed';
      b.payment = 'released';
      const t = s.tasks.find((x) => x.task_id === b.task_id);
      if (t) t.status = 'completed';
    }
    return s;
  });
}

export function addReview({ bookingId, rating, comment }) {
  return update((s) => {
    const b = s.bookings.find((x) => x.booking_id === Number(bookingId));
    if (!b) return s;
    b.review = { rating: Number(rating), comment: comment || '' };
    const w = s.workers.find((x) => x.worker_id === b.worker_id);
    if (w) {
      // nudge the worker's rating toward the new review (simple demo average)
      w.rating = Math.round(((w.rating + Number(rating)) / 2) * 10) / 10;
    }
    return s;
  });
}

export function toggleSavedWorker(workerId) {
  return update((s) => {
    const id = Number(workerId);
    s.savedWorkerIds = s.savedWorkerIds.includes(id)
      ? s.savedWorkerIds.filter((x) => x !== id)
      : [...s.savedWorkerIds, id];
    return s;
  });
}

// One-tap rebook: post a fresh task for a saved worker and select them.
export function rebookWorker({ workerId, requester }) {
  const worker = read().workers.find((w) => w.worker_id === Number(workerId));
  if (!worker) return;
  const primarySkill = (worker.skills || '').split(',')[0].trim() || 'General help';
  postTask({
    title: `Rebooking: ${primarySkill}`,
    categoryId: null,
    description: `Repeat booking with ${worker.name}.`,
    location: '',
    requester,
  });
  const state = read();
  const newest = state.tasks[state.tasks.length - 1];
  selectWorker({ taskId: newest.task_id, workerId });
}

// --- the logged-in worker's own profile -----------------------------------
export function updateMyProfile({ skills, bio }) {
  return update((s) => {
    if (!s.myProfile) s.myProfile = {};
    if (skills !== undefined) s.myProfile.skills = skills;
    if (bio !== undefined) s.myProfile.bio = bio;
    return s;
  });
}

// --- React hook -----------------------------------------------------------
export function useDemoStore() {
  const [state, setState] = useState(read);
  useEffect(() => {
    const l = () => setState(read());
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return state;
}
