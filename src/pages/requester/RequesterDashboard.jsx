import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getWorkers,
  getWorker,
  bookWorker,
  getBookings,
  createReview,
  getSavedWorkers,
  saveWorker,
  unsaveWorker,
  rebookWorker,
  updateMe,
} from '../../api/client.js';
import { useAsync, useBookingAlerts } from '../../api/hooks.js';
import { StatusBadge, PaymentBadge, VerifyBadge, TierBadge, Stars, Avatar, Loading, ErrorNote, EmptyState, duration, rwf } from '../../components/shared/ui.jsx';
import { DashShell } from '../../components/DashShell.jsx';
import { BookingStepper } from '../../components/BookingStepper.jsx';
import { Settings } from '../../components/Settings.jsx';
import { MessagesView } from '../../components/MessagesView.jsx';
import { useChat } from '../../context/ChatContext.jsx';
import { Analytics, bookingActivity } from '../../components/shared/Analytics.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Icons } from '../../components/shared/icons.jsx';

function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'U';
}

export default function RequesterDashboard() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const TABS = ['overview', 'hire', 'bookings', 'messages', 'history', 'saved', 'profile'];
  // Land on Bookings if arriving from a resumed booking — via ?tab=bookings OR
  // the sessionStorage flag (which survives the PublicOnly redirect that strips
  // the query after signup).
  const resumedBooking = (() => { try { return sessionStorage.getItem('tapa_after_book') === '1'; } catch { return false; } })();
  const initialTab = resumedBooking || params.get('tab') === 'bookings' ? 'bookings' : (TABS.includes(params.get('tab')) ? params.get('tab') : 'overview');
  const [tab, setTab] = useState(initialTab);
  const [reviewBooking, setReviewBooking] = useState(null); // booking awaiting a review prompt
  const notify = useToast();
  const bookings = useAsync(() => getBookings(), [], { intervalMs: 7000 });
  useBookingAlerts(bookings.data, 'requester', notify);
  const saved = useAsync(() => getSavedWorkers(), []);

  // Just resumed a booking after signup/login → land on Bookings + confirm.
  useEffect(() => {
    if (resumedBooking || params.get('booked') === '1') {
      setTab('bookings');
      notify('Booking placed — waiting for the worker to accept. Track it here.');
      try { sessionStorage.removeItem('tapa_after_book'); } catch { /* ignore */ }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const all = bookings.data || [];
  const active = all.filter((b) => b.status !== 'completed');
  const history = all.filter((b) => b.status === 'completed');
  // Workers the requester already has an in-flight booking with — used to
  // disable Book/Rebook so the same worker can't be double-booked.
  const bookedIds = [...new Set(all.filter((b) => !['completed', 'cancelled'].includes(b.status)).map((b) => b.worker_id))];

  const items = [
    { key: 'overview', label: 'Dashboard', icon: Icons.grid || Icons.spark },
    { key: 'hire', label: 'Find workers', icon: Icons.briefcase },
    { key: 'bookings', label: 'Bookings', icon: Icons.calendar, count: active.length },
    { key: 'history', label: 'History', icon: Icons.clock, count: history.length },
    { key: 'messages', label: 'Messages', icon: Icons.chat },
    { key: 'saved', label: 'Saved workers', icon: Icons.bookmark, count: (saved.data || []).length },
    { key: 'profile', label: 'Settings', icon: Icons.settings },
  ];

  const afterBook = () => { bookings.reload(); setTab('bookings'); notify('Booking requested — waiting for the worker to accept.'); };

  return (
    <>
    <DashShell items={items} active={tab} onSelect={setTab}>
      {tab === 'overview' && <OverviewView user={user} bookings={all} savedCount={(saved.data || []).length} />}
      {tab === 'hire' && (
        <HireView
          savedIds={(saved.data || []).map((w) => w.worker_id)}
          bookedIds={bookedIds}
          onBooked={afterBook}
          onSavedChange={() => saved.reload()}
        />
      )}
      {tab === 'bookings' && <BookingsView state={bookings} bookings={active} onReview={setReviewBooking} />}
      {tab === 'messages' && <MessagesView bookings={all} loading={bookings.loading} />}
      {tab === 'history' && <HistoryView state={bookings} bookings={history} onReview={setReviewBooking} savedIds={(saved.data || []).map((w) => w.worker_id)} bookedIds={bookedIds} onSavedChange={() => saved.reload()} />}
      {tab === 'saved' && <SavedView state={saved} bookedIds={bookedIds} onRebook={afterBook} />}
      {tab === 'profile' && <Settings profileTab={<ProfileView user={user} bookings={all} saved={saved.data || []} />} />}
    </DashShell>
    {reviewBooking && (
      <ReviewModal
        workerName={reviewBooking.workerName}
        onClose={() => setReviewBooking(null)}
        onSubmit={async (rating, comment) => {
          await createReview({ booking_id: reviewBooking.booking_id, rating, comment });
          bookings.reload();
          setReviewBooking(null);
        }}
      />
    )}
    </>
  );
}

function OverviewView({ user, bookings, savedCount }) {
  const amountOf = (b) => Number(b.agreedPrice) || 0;
  const active = bookings.filter((b) => !['completed', 'cancelled'].includes(b.status)).length;
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const spent = bookings.filter((b) => b.status === 'completed').reduce((a, b) => a + amountOf(b), 0);
  const first = (user?.name || '').split(/\s+/)[0] || 'there';

  const buckets = [
    { label: 'Pending', value: bookings.filter((b) => b.status === 'pending').length },
    { label: 'Accepted', value: bookings.filter((b) => b.status === 'accepted').length },
    { label: 'Active', value: bookings.filter((b) => b.status === 'in_progress').length },
    { label: 'Done', value: completed },
  ];

  return (
    <Analytics
      title={`Welcome, ${first}`}
      subtitle="Your bookings at a glance — track every job through to done."
      kpis={[
        { icon: Icons.calendar, value: bookings.length, label: 'Total bookings' },
        { icon: Icons.clock, value: active, label: 'Active' },
        { icon: Icons.checkCircle, value: completed, label: 'Completed' },
        { icon: Icons.wallet, value: rwf(spent), label: 'Total spent' },
        { icon: Icons.bookmark, value: savedCount, label: 'Saved workers' },
      ]}
      chart={{ title: 'Bookings by stage', data: buckets, format: (v) => v }}
      activity={bookingActivity(bookings, 'requester')}
    />
  );
}

function ProfileView({ user, bookings, saved }) {
  const { refreshUser } = useAuth();
  const active = bookings.filter((b) => b.status !== 'completed').length;
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [location, setLocation] = useState(user.location || '');
  const [saved2, setSaved2] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await updateMe({ name, phone, location }); await refreshUser(); setSaved2(true); setTimeout(() => setSaved2(false), 1500); }
    catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="card">
        <div className="card-head" style={{ alignItems: 'center' }}>
          <div className="row" style={{ alignItems: 'center', gap: '1rem', flexWrap: 'nowrap' }}>
            <div className="avatar">{initials(user.name)}</div>
            <div>
              <div className="row" style={{ gap: '0.6rem' }}><span className="card-title">{user.name}</span><span className="badge badge--primary">Requester</span></div>
              <div className="meta" style={{ marginTop: '0.35rem' }}>{user.email}</div>
            </div>
          </div>
        </div>
        <div className="divider" />
        <form className="form" onSubmit={save} style={{ maxWidth: '100%' }}>
          <div className="grid2">
            <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07…" /></label>
            <label>Location<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kigali, Kimironko" /></label>
          </div>
          <ErrorNote message={err} />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            {saved2 && <span className="badge badge--done">Saved</span>}
            <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button>
          </div>
        </form>
      </div>
      <div className="grid2">
        <div className="card"><div className="stat-num">{bookings.length}</div><div className="meta">Total bookings</div></div>
        <div className="card"><div className="stat-num">{active}</div><div className="meta">Active bookings</div></div>
        <div className="card"><div className="stat-num">{completed}</div><div className="meta">Completed jobs</div></div>
        <div className="card"><div className="stat-num">{saved.length}</div><div className="meta">Saved workers</div></div>
      </div>
    </>
  );
}

// ── Find workers: browse → open a worker profile → Book ──────────────────
function HireView({ savedIds, bookedIds = [], onBooked, onSavedChange }) {
  const [selected, setSelected] = useState(null); // worker_id being viewed
  if (selected) {
    return (
      <WorkerProfilePanel
        workerId={selected}
        saved={savedIds.includes(selected)}
        alreadyBooked={bookedIds.includes(selected)}
        onBack={() => setSelected(null)}
        onBooked={onBooked}
        onSavedChange={onSavedChange}
      />
    );
  }
  return <BrowseWorkers savedIds={savedIds} onOpen={setSelected} onSavedChange={onSavedChange} />;
}

function BrowseWorkers({ savedIds, onOpen, onSavedChange }) {
  const [term, setTerm] = useState('');
  const [skill, setSkill] = useState('');
  const workers = useAsync(() => getWorkers(skill), [skill]);
  const [err, setErr] = useState('');

  async function toggleSave(w) {
    setErr('');
    try {
      await (savedIds.includes(w.worker_id) ? unsaveWorker(w.worker_id) : saveWorker(w.worker_id));
      onSavedChange?.();
    } catch (e) { setErr(e.message); }
  }

  // Only verified (Admin-Certified) workers are bookable, and the server already
  // filters browse to those — this is just belt-and-suspenders against any stray
  // Unverified row.
  const list = (workers.data || []).filter((w) => w.tier && w.tier !== 'Unverified');

  return (
    <>
      <h1>Find workers</h1>
      <p className="subtitle">Browse admin-verified workers, open a profile, and book — no task to post.</p>
      <ErrorNote message={err} />

      <form className="row" onSubmit={(e) => { e.preventDefault(); setSkill(term.trim()); }} style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
        <input className="input" style={{ flex: 1, minWidth: '180px' }} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search a skill, e.g. Plumbing" />
        <button className="btn-primary" type="submit">Search</button>
        {skill && <button type="button" className="btn-secondary" onClick={() => { setTerm(''); setSkill(''); }}>Clear</button>}
      </form>
      {workers.loading ? <Loading /> : workers.error ? <ErrorNote message={workers.error} /> : list.length === 0 ? (
        <EmptyState icon={Icons.search} title={skill ? `No workers for “${skill}”` : 'No available workers yet'} hint="Try a different skill, or check back soon as more workers get verified." />
      ) : (
        <div className="grid2">
          {list.map((w) => (
            <div className="card" key={w.worker_id}>
              <div className="card-head">
                <div className="row" style={{ gap: '0.6rem' }}>
                  <Avatar name={w.name} photo={w.photo} className="avatar" style={{ width: 40, height: 40, borderRadius: 12, fontSize: '0.9rem' }} />
                  <div>
                    <div className="card-title">{w.name}</div>
                    <div className="meta">{w.skills || 'No skills listed yet'}</div>
                  </div>
                </div>
                <Stars rating={Number(w.rating) || 0} />
              </div>
              <div className="row" style={{ marginTop: '0.6rem' }}>
                <TierBadge tier={w.tier} />
                <span className="meta">{w.completedJobs || 0} jobs done</span>
              </div>
              <div className="actions">
                <button className="btn-primary" onClick={() => onOpen(w.worker_id)}>View profile</button>
                <button className="btn-secondary" onClick={() => toggleSave(w)}>{savedIds.includes(w.worker_id) ? '★ Saved' : '☆ Save'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function WorkerProfilePanel({ workerId, saved, alreadyBooked, onBack, onBooked, onSavedChange }) {
  const { data: w, loading, error } = useAsync(() => getWorker(workerId), [workerId]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function book() {
    if (alreadyBooked) return;
    setBusy(true); setErr('');
    try { await bookWorker(workerId); onBooked?.(); } catch (e) { setErr(e.message); setBusy(false); }
  }
  async function toggleSave() {
    setErr('');
    try { await (saved ? unsaveWorker(workerId) : saveWorker(workerId)); onSavedChange?.(); } catch (e) { setErr(e.message); }
  }

  return (
    <>
      <button type="button" className="btn-ghost" onClick={onBack} style={{ paddingLeft: 0 }}>← Back to workers</button>
      {loading ? <Loading /> : error ? <ErrorNote message={error} /> : (
        <>
          <div className="card" style={{ marginTop: '0.5rem' }}>
            <div className="card-head">
              <div className="row" style={{ gap: '0.75rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                <Avatar name={w.name} photo={w.photo} />
                <div>
                  <div className="row" style={{ gap: '0.5rem' }}>
                    <span className="card-title">{w.name}</span>
                    <TierBadge tier={w.tier} />
                    <VerifyBadge status={w.verification} />
                  </div>
                  <div className="stars-row"><Stars rating={Number(w.rating) || 0} /></div>
                  <div className="meta" style={{ marginTop: '0.35rem' }}>
                    {w.is_available ? 'Available now' : 'Currently unavailable'} · {w.activeJobsCount || 0} active · {(w.taskHistory || []).length} completed
                  </div>
                </div>
              </div>
            </div>
            {w.skills && <div className="meta" style={{ marginTop: '0.75rem' }}><strong>Skills:</strong> {w.skills}</div>}
            {w.bio && <p className="meta" style={{ marginTop: '0.35rem' }}>{w.bio}</p>}
            <ErrorNote message={err} />
            <div className="actions">
              <button className="btn-primary" onClick={book} disabled={busy || alreadyBooked}>
                {alreadyBooked ? 'Already booked — in progress' : busy ? 'Booking…' : 'Book this worker'}
              </button>
              <button className="btn-secondary" onClick={toggleSave}>{saved ? '★ Saved' : '☆ Save'}</button>
            </div>
            {alreadyBooked && <p className="meta" style={{ marginTop: '0.35rem' }}>You have an active job with this worker. You can rebook once it&apos;s done.</p>}
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: '0.75rem' }}>Track record</div>
            {(w.taskHistory || []).length === 0 ? (
              <div className="history-empty">{Icons.check}No completed jobs yet</div>
            ) : (
              w.taskHistory.map((h) => (
                <div className="row" key={h.booking_id} style={{ justifyContent: 'space-between', padding: '0.5rem 0' }}>
                  <span className="meta">{h.taskTitle} · {String(h.date).slice(0, 10)}</span>
                  {h.review && <span className="badge badge--star">Reviewed {h.review.rating}★</span>}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
}

// ── Bookings / History / Saved (unchanged behaviour, read from /bookings) ─
function BookingsView({ state, bookings, onReview }) {
  const { loading, error, reload } = state;
  return (
    <>
      <h1>Bookings</h1>
      <p className="subtitle">Track each job from accepted through to completion.</p>
      <ErrorNote message={error} />
      {loading ? <Loading /> : bookings.length === 0 ? (
        <EmptyState icon={Icons.calendar} title="No active bookings" hint="Find a worker and book them — your active jobs will track here." />
      ) : bookings.map((b, i) => <BookingCard key={b.booking_id} b={b} reload={reload} onReview={onReview} expanded={i === 0} />)}
    </>
  );
}

function HistoryView({ state, bookings, onReview, savedIds = [], bookedIds = [], onSavedChange }) {
  const { loading, error, reload } = state;
  return (
    <>
      <h1>History</h1>
      <p className="subtitle">Completed jobs, reviews and one-tap rebooking.</p>
      <ErrorNote message={error} />
      {loading ? <Loading /> : bookings.length === 0 ? (
        <EmptyState icon={Icons.clock} title="No completed jobs yet" hint="Once a job is confirmed complete, it moves here with its review and a one-tap rebook." />
      ) : bookings.map((b) => <BookingCard key={b.booking_id} b={b} reload={reload} onReview={onReview} savedIds={savedIds} bookedIds={bookedIds} onSavedChange={onSavedChange} expanded={false} />)}
    </>
  );
}

function BookingCard({ b, reload, onReview, savedIds, bookedIds = [], onSavedChange, expanded = true }) {
  const { openChat } = useChat();
  const [err, setErr] = useState('');
  const act = async (p) => { setErr(''); try { await p; reload(); } catch (e) { setErr(e.message); } };
  const canChat = !['completed', 'cancelled'].includes(b.status);
  const hasActive = bookedIds.includes(b.worker_id); // an in-flight job with this worker → block rebook
  const canSave = Array.isArray(savedIds); // save toggle only where the parent wires it (History)
  const isSaved = canSave && savedIds.includes(b.worker_id);
  async function toggleSave() {
    setErr('');
    try { await (isSaved ? unsaveWorker(b.worker_id) : saveWorker(b.worker_id)); onSavedChange?.(); } catch (e) { setErr(e.message); }
  }
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">{b.taskTitle}</div>
          <div className="meta">Worker: {b.workerName}{duration(b.startTs, b.endTs) && <> · ⏱ {duration(b.startTs, b.endTs)} on the job</>}</div>
        </div>
        <div className="row">
          {b.agreedPrice != null && <span className="badge badge--done">{rwf(b.agreedPrice)} agreed</span>}
          <StatusBadge status={b.status} /><PaymentBadge payment={b.payment} />
        </div>
      </div>
      <ErrorNote message={err} />
      <div className="actions">
        {b.status === 'pending' && <span className="meta">Waiting for {b.workerName} to accept.</span>}
        {canChat && <button className="btn-secondary btn-icon" onClick={() => openChat(b)}>{Icons.chat} {b.agreedPrice != null ? 'Chat' : 'Chat & agree price'}</button>}
        {b.status === 'completed' && !b.review && <button className="btn-secondary" onClick={() => onReview?.(b)}>Leave a review</button>}
        {b.review && (
          <div className="row">
            <span className="badge badge--star">Reviewed {b.review.rating}★</span>
            {b.review.comment && <span className="meta">“{b.review.comment}”</span>}
            {hasActive
              ? <button className="btn-mini" disabled title="You already have an active job with this worker">Booked</button>
              : <button className="btn-mini" onClick={() => act(rebookWorker(b.worker_id))}>Rebook {b.workerName}</button>}
          </div>
        )}
        {canSave && (
          <button type="button" className={`btn-secondary btn-icon ${isSaved ? 'is-saved' : ''}`} onClick={toggleSave}>
            {Icons.bookmark} {isSaved ? 'Saved' : 'Save worker'}
          </button>
        )}
      </div>
      <BookingStepper b={b} role="requester" reload={reload} openChat={openChat} onReview={onReview} collapsible defaultOpen={expanded} />
    </div>
  );
}

// Popup shown right after Confirm completion — suggest leaving a review.
// Skippable via "Not now"; the review can still be left later from History.
function ReviewModal({ workerName, onSubmit, onClose }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit() {
    setBusy(true); setErr('');
    try { await onSubmit(rating, comment); } catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">How was {workerName}?</div>
        <p className="meta" style={{ marginTop: '0.25rem' }}>Leave a review to help other requesters — or skip it for now.</p>
        <div className="star-pick" style={{ marginTop: '0.9rem' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
              {n <= rating ? '★' : '☆'}
            </button>
          ))}
        </div>
        <textarea className="textarea" rows={3} style={{ marginTop: '0.9rem' }} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment (optional)" />
        <ErrorNote message={err} />
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="btn-ghost" onClick={onClose}>Not now</button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit review'}</button>
        </div>
      </div>
    </div>
  );
}

function SavedView({ state, bookedIds = [], onRebook }) {
  const { data, loading, error, reload } = state;
  const [err, setErr] = useState('');
  const act = async (p, after) => { setErr(''); try { await p; after?.(); } catch (e) { setErr(e.message); } };
  const saved = data || [];
  return (
    <>
      <h1>Saved workers</h1>
      <p className="subtitle">Your preferred workers — rebook any of them in one tap.</p>
      <ErrorNote message={error || err} />
      {loading ? <Loading /> : saved.length === 0 ? (
        <EmptyState icon={Icons.bookmark} title="No saved workers yet" hint="Tap “Save” on a worker in Find workers to keep them here for one-tap rebooking." />
      ) : saved.map((w) => (
        <div className="card" key={w.worker_id}>
          <div className="card-head">
            <div>
              <div className="card-title">{w.name}</div>
              <div className="meta">{w.skills || 'No skills listed yet'}</div>
            </div>
            <div className="row">
              <button className="btn-secondary" onClick={() => act(unsaveWorker(w.worker_id), reload)}>Remove</button>
              {bookedIds.includes(w.worker_id)
                ? <button className="btn-primary" disabled title="You already have an active job with this worker">Booked</button>
                : <button className="btn-primary" onClick={() => act(rebookWorker(w.worker_id), onRebook)}>Rebook</button>}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
