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

const KEY = 'tapa_demo_state_v2';
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
    tasks: [
      { task_id: 1, title: 'Fix a leaking kitchen tap', category_id: 1, location: 'Kimironko', status: 'completed', requesterName: 'Patrick K.', requesterUserId: null },
      { task_id: 2, title: 'Mount a 55-inch TV', category_id: 6, location: 'Kacyiru', status: 'completed', requesterName: 'Diane I.', requesterUserId: null },
      { task_id: 3, title: 'Set up home Wi-Fi & smart TV', category_id: 7, location: 'Nyarutarama', status: 'completed', requesterName: 'You', requesterUserId: null },
      { task_id: 4, title: 'Deep clean a 2-bedroom flat', category_id: 2, location: 'Remera', status: 'assigned', requesterName: 'You', requesterUserId: null },
      { task_id: 5, title: 'Replace a broken light switch', category_id: 4, location: 'Kicukiro', status: 'assigned', requesterName: 'You', requesterUserId: null },
      { task_id: 6, title: 'Assemble a flat-pack wardrobe', category_id: 5, location: 'Gisozi', status: 'open', requesterName: 'You', requesterUserId: null },
    ],
    bookings: [
      mkBooking(1, 1, 'Fix a leaking kitchen tap', 1, 'Jean Bosco', 'Patrick K.', 'completed', 12000, { rating: 5, comment: 'On time and left everything tidy.' }),
      mkBooking(2, 2, 'Mount a 55-inch TV', 1, 'Jean Bosco', 'Diane I.', 'completed', 15000, { rating: 4, comment: 'Solid work, will rebook.' }),
      mkBooking(3, 3, 'Set up home Wi-Fi & smart TV', 3, 'Eric Niyonzima', 'You', 'completed', 20000, { rating: 5, comment: 'Very knowledgeable, sorted my Wi-Fi fast.' }),
      mkBooking(4, 4, 'Deep clean a 2-bedroom flat', 2, 'Aline Uwase', 'You', 'in_progress', 22000, null),
      mkBooking(5, 5, 'Replace a broken light switch', 3, 'Eric Niyonzima', 'You', 'pending', 9000, null),
    ],
    savedWorkerIds: [1, 3],
    // the logged-in worker's own profile (the worker dashboard edits this)
    myProfile: {
      skills: 'Plumbing, Pipe fitting',
      bio: 'Experienced plumber serving Kigali. Available weekdays for installations and repairs.',
      rating: 4.7,
      tier: 'Peer-Verified',
    },
    // worker wallet / invoices (RWF)
    earnings: [
      { id: 'INV-1018', date: '2026-01-12', task: 'Bathroom sink install', amount: 18000, status: 'released' },
      { id: 'INV-1024', date: '2026-02-03', task: 'Kitchen tap repair', amount: 12000, status: 'released' },
      { id: 'INV-1031', date: '2026-02-21', task: 'Radiator bleed & flush', amount: 9000, status: 'released' },
      { id: 'INV-1042', date: '2026-03-09', task: 'Pipe replacement', amount: 25000, status: 'released' },
      { id: 'INV-1055', date: '2026-04-02', task: 'Shower fitting', amount: 30000, status: 'released' },
      { id: 'INV-1067', date: '2026-04-27', task: 'Mount 55-inch TV', amount: 15000, status: 'released' },
      { id: 'INV-1079', date: '2026-05-15', task: 'Leak diagnosis', amount: 8000, status: 'released' },
      { id: 'INV-1088', date: '2026-06-04', task: 'Wi-Fi & smart TV setup', amount: 20000, status: 'released' },
      { id: 'INV-1093', date: '2026-06-16', task: 'Deep clean (in progress)', amount: 22000, status: 'pending' },
    ],
    seq: { task: 7, booking: 6, invoice: 1100 },
  };
}

// Build a seeded booking with its lifecycle flags derived from a status.
function mkBooking(booking_id, task_id, taskTitle, worker_id, workerName, requesterName, status, amount, review) {
  const done = status === 'completed';
  const started = done || status === 'in_progress';
  return {
    booking_id,
    task_id,
    taskTitle,
    worker_id,
    workerName,
    requesterName,
    requesterUserId: null,
    status,
    amount,
    checkedIn: started || status === 'accepted',
    startConfirmed: started,
    checkedOut: done,
    endConfirmed: done,
    payment: done ? 'released' : started ? 'confirmed' : 'pending',
    review: review || null,
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
      amount: 15000,
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
      // record the worker's earning (the wallet/invoices update live)
      if (!s.earnings) s.earnings = [];
      if (!s.seq.invoice) s.seq.invoice = 1100;
      s.seq.invoice += 1;
      s.earnings.unshift({
        id: `INV-${s.seq.invoice}`,
        date: new Date().toISOString().slice(0, 10),
        task: b.taskTitle,
        amount: b.amount || 15000,
        status: 'released',
      });
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
