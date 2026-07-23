import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getMyWorkerProfile,
  getMyEarnings,
  updateMyWorkerProfile,
  updateMe,
  getCategories,
  setAvailability,
  submitVerification,
  getWorkerHistory,
  getBookings,
} from '../../api/client.js';
import { useAsync, useBookingAlerts } from '../../api/hooks.js';
import { StatusBadge, PaymentBadge, VerifyBadge, TierBadge, Avatar, Loading, ErrorNote, EmptyState, rwf, duration } from '../../components/shared/ui.jsx';
import { DashShell } from '../../components/DashShell.jsx';
import { WelcomeGetStarted } from '../../components/WelcomeGetStarted.jsx';
import { BookingStepper } from '../../components/BookingStepper.jsx';
import { useChat } from '../../context/ChatContext.jsx';
import { Settings } from '../../components/Settings.jsx';
import { MessagesView } from '../../components/MessagesView.jsx';
import { Analytics, KpiGrid, bookingActivity } from '../../components/shared/Analytics.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Icons } from '../../components/shared/icons.jsx';
import { BarChart } from '../../components/shared/Charts.jsx';
import { fileToDataUrl } from '../../utils/files.js';

function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'U';
}

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Released earnings across the current week (Mon–Sun), one bar per day. Days
// with no completed job stay empty, and upcoming days of the week show blank
// bars — so the chart always reads as a full 7-day week, never one lonely bar.
function weekEarnings(bookings) {
  const amountOf = (b) => Number(b.agreedPrice) || 0;
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday = start of week
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({ key: dayKey(d), label: `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`, value: 0 });
  }
  bookings
    .filter((b) => b.status === 'completed' && amountOf(b) > 0 && b.endTs)
    .forEach((b) => {
      const slot = days.find((x) => x.key === dayKey(new Date(b.endTs)));
      if (slot) slot.value += amountOf(b);
    });
  return days.map(({ label, value }) => ({ label, value }));
}

const earnFmt = (v) => (v >= 1000 ? Math.round(v / 1000) + 'k' : v);

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const notify = useToast();
  const bookings = useAsync(() => getBookings(), [], { intervalMs: 7000 });
  useBookingAlerts(bookings.data, 'worker', notify);
  const meState = useAsync(() => getMyWorkerProfile(), []); // for the always-visible availability toggle
  const all = bookings.data || [];
  const activeCount = all.filter((b) => !['completed', 'cancelled'].includes(b.status)).length;
  const doneCount = all.filter((b) => b.status === 'completed').length;

  const items = [
    { key: 'overview', label: 'Dashboard', icon: Icons.grid || Icons.spark },
    { key: 'bookings', label: 'My bookings', icon: Icons.calendar, count: activeCount },
    { key: 'history', label: 'History', icon: Icons.clock, count: doneCount },
    { key: 'messages', label: 'Messages', icon: Icons.chat },
    { key: 'earnings', label: 'Earnings', icon: Icons.wallet },
    { key: 'profile', label: 'Settings', icon: Icons.settings },
  ];

  // First-run welcome / get-started — shown once (remembered in localStorage).
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem('tapa_welcome_worker'); } catch { return false; }
  });
  const dismissWelcome = () => {
    try { localStorage.setItem('tapa_welcome_worker', '1'); } catch { /* ignore */ }
    setShowWelcome(false);
  };
  const go = (t) => { dismissWelcome(); setTab(t); };

  return (
    <DashShell items={items} active={tab} onSelect={go}
      headerExtra={meState.data ? <AvailabilityToggle me={meState.data} reload={meState.reload} /> : null}>
      {showWelcome ? (
        <WelcomeGetStarted
          name={user?.name}
          subtitle="Get verified, go available, and take bookings you get paid for — all in one place."
          features={[
            { icon: Icons.idCard, title: 'Get verified', desc: 'Complete verification to become Admin-Certified.' },
            { icon: Icons.lightning, title: 'Go available', desc: 'Toggle availability so requesters can find and book you.' },
            { icon: Icons.calendar, title: 'Take bookings', desc: 'Accept jobs, check in and out, and see them to completion.' },
            { icon: Icons.wallet, title: 'Track earnings', desc: 'View your income and ratings, and export a PDF summary.' },
          ]}
          actions={[
            { icon: Icons.idCard, title: 'Finish setup', desc: 'Complete verification so you appear in Browse and can take jobs.', cta: 'Get started', onClick: () => go('overview') },
            { icon: Icons.calendar, title: 'My bookings', desc: "See and manage the jobs you've been booked for.", cta: 'View bookings', onClick: () => go('bookings') },
          ]}
          onSkip={() => go('overview')}
        />
      ) : (
      <>
      {tab === 'overview' && <OverviewView user={user} bookings={bookings.data || []} />}
      {tab === 'profile' && <Settings profileTab={<ProfileView user={user} embedded />} />}
      {tab === 'bookings' && <BookingsView state={bookings} only="active" />}
      {tab === 'history' && <BookingsView state={bookings} only="done" />}
      {tab === 'messages' && <MessagesView bookings={bookings.data} loading={bookings.loading} />}
      {tab === 'earnings' && <EarningsView />}
      </>
      )}
    </DashShell>
  );
}

function OverviewView({ user, bookings }) {
  const amountOf = (b) => Number(b.agreedPrice) || 0;
  const active = bookings.filter((b) => !['completed', 'cancelled'].includes(b.status)).length;
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const earned = bookings.filter((b) => b.status === 'completed').reduce((a, b) => a + amountOf(b), 0);
  const pending = bookings.filter((b) => !['completed', 'cancelled'].includes(b.status) && amountOf(b) > 0).length;
  const first = (user?.name || '').split(/\s+/)[0] || 'there';

  return (
    <Analytics
      title={`Good day, ${first}`}
      subtitle="Your activity at a glance — keep jobs moving to build trust."
      kpis={[
        { icon: Icons.calendar, value: active, label: 'Active jobs' },
        { icon: Icons.checkCircle, value: completed, label: 'Completed' },
        { icon: Icons.wallet, value: rwf(earned), label: 'Total earned' },
        { icon: Icons.clock, value: pending, label: 'Pending payouts' },
      ]}
      chart={{ title: 'Earnings this week', note: 'Mon–Sun', data: weekEarnings(bookings), format: earnFmt }}
      activity={bookingActivity(bookings, 'worker')}
    />
  );
}

function ProfileView({ user, embedded }) {
  const { data: me, loading, error, reload } = useAsync(() => getMyWorkerProfile(), []);
  if (loading) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  return <ProfileEditor user={user} me={me} reload={reload} embedded={embedded} />;
}

function AvailabilityToggle({ me, reload }) {
  const notify = useToast();
  const [available, setAvail] = useState(!!me.is_available);
  const [busy, setBusy] = useState(false);
  // Keep in sync if the profile reloads (or changes from another session).
  useEffect(() => { setAvail(!!me.is_available); }, [me.is_available]);
  async function toggle() {
    const next = !available;
    setBusy(true); setAvail(next);
    // Server may reject going available (e.g. requires skills + bio first) —
    // revert and surface the reason rather than failing silently.
    try { await setAvailability(next); reload(); }
    catch (e) { setAvail(!next); notify(e.message || 'Could not update availability'); }
    finally { setBusy(false); }
  }
  return (
    <button type="button" className="btn-secondary btn-avail" onClick={toggle} disabled={busy}
      title={available ? 'You appear in Browse — tap to go offline' : 'Tap to go available so requesters can find you (needs skills + bio)'}>
      <span className={`activity-dot ${available ? 'activity-dot--completed' : 'activity-dot--pending'}`} style={{ display: 'inline-block', marginRight: 6 }} />
      {available ? 'Available' : 'Unavailable'}
    </button>
  );
}

const TIER_HINT = {
  'Admin-Certified': "You're Admin-Certified — an admin reviewed and approved your identity. You appear in Browse and can be booked.",
  Unverified: 'Finish identity verification and get admin-approved to appear in Browse and take bookings.',
};

function VerificationCard({ status, tier }) {
  return (
    <div className="card">
      <div className="card-head" style={{ marginBottom: '0.4rem' }}>
        <div className="card-title">Identity verification</div>
        <VerifyBadge status={status} />
      </div>
      <div className="row" style={{ alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0 0.5rem' }}>
        <span className="meta">Trust tier:</span><TierBadge tier={tier} />
      </div>
      <p className="meta" style={{ marginBottom: '0.5rem' }}>{TIER_HINT[tier] || TIER_HINT.Unverified}</p>
      <p className="meta">An admin confirms your identity by comparing your uploaded ID with your selfie, and reviews your certificates. You appear in Browse only once approved.</p>
      {status === 'verified' && <p className="meta" style={{ marginTop: '0.5rem' }}>You&apos;re verified and visible in Browse. ✓</p>}
      {status === 'pending' && <p className="meta" style={{ marginTop: '0.5rem' }}>Your submission is pending admin review.</p>}
      {(status === 'unverified' || status === 'rejected') && (
        <div style={{ marginTop: '0.6rem' }}>
          {status === 'rejected' && <p className="meta" style={{ marginBottom: '0.5rem', color: 'var(--color-red-700)' }}>Your verification was rejected — please review the feedback and resubmit.</p>}
          <Link to="/worker/onboarding" className="btn-primary btn-icon" style={{ textDecoration: 'none', display: 'inline-flex' }}>{Icons.checkCircle} Verify with guided steps</Link>
          <p className="meta" style={{ marginTop: '0.5rem' }}>Upload your ID, do a quick face scan, and add your skills, education and certifications.</p>
        </div>
      )}
    </div>
  );
}

function ProfileEditor({ user, me, reload, embedded }) {
  return (
    <>
      {!embedded && <><h1>Your profile</h1><p className="subtitle">This is what requesters see when they consider you for a task.</p></>}

      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div className="card-head" style={{ alignItems: 'center' }}>
          <div className="row" style={{ alignItems: 'center', gap: '1rem', flexWrap: 'nowrap' }}>
            <Avatar name={user.name} photo={me.photo} />
            <div>
              <div className="row" style={{ gap: '0.6rem' }}>
                <span className="card-title">{user.name}</span>
                <TierBadge tier={me.tier} />
                <VerifyBadge status={me.verification} />
              </div>
              <span className="pin">{Icons.pin}{user.location || 'Location not set'}</span>
              <div className="stars-row">
                {me.rating > 0 ? (
                  <span className="badge badge--star">
                    {'★'.repeat(Math.round(me.rating))}{'☆'.repeat(5 - Math.round(me.rating))} {Number(me.rating).toFixed(1)}
                  </span>
                ) : (
                  <span className="meta">☆☆☆☆☆ No rating yet</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <VerificationCard status={me.verification} tier={me.tier} reload={reload} />
      <PersonalDetailsCard user={user} me={me} reload={reload} />
      <SkillsCard me={me} reload={reload} />
      <TaskHistory workerId={me.worker_id} />
    </>
  );
}

function PersonalDetailsCard({ user, me, reload }) {
  const { refreshUser } = useAuth();
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [location, setLocation] = useState(user.location || '');
  const [photo, setPhoto] = useState(me.photo || '');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [bio, setBio] = useState(me.bio || '');
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  async function onPhotoFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr('');
    if (!file.type?.startsWith('image/')) { setErr('Please choose an image (JPG or PNG).'); return; }
    if (file.size > 5 * 1024 * 1024) { setErr('Photo must be 5MB or smaller.'); return; }
    setPhotoBusy(true);
    try { const { dataUrl } = await fileToDataUrl(file, 512); setPhoto(dataUrl); }
    catch (e2) { setErr(e2.message); }
    finally { setPhotoBusy(false); }
  }

  async function save(e) {
    e.preventDefault();
    setErr('');
    try {
      await updateMe({ name, phone, location });
      await updateMyWorkerProfile({ photo, bio });
      await refreshUser();
      reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e2) { setErr(e2.message); }
  }

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: '0.25rem' }}>Personal details</div>
      <p className="meta" style={{ marginBottom: '0.75rem' }}>Your contact info and how you present yourself to requesters.</p>
      <form className="form" onSubmit={save} style={{ maxWidth: '100%' }}>
        <div className="photo-upload">
          <Avatar name={user.name} photo={photo} className="avatar" style={{ width: 64, height: 64, borderRadius: 16, fontSize: '1.2rem' }} />
          <div>
            <div className="row" style={{ gap: '0.5rem' }}>
              <label className={`btn-secondary btn-icon ${photoBusy ? 'is-busy' : ''}`} style={{ cursor: 'pointer' }}>
                {Icons.upload} {photoBusy ? 'Processing…' : photo ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/*" hidden onChange={onPhotoFile} disabled={photoBusy} />
              </label>
              {photo && <button type="button" className="btn-ghost" onClick={() => setPhoto('')}>Remove</button>}
            </div>
            <p className="meta" style={{ marginTop: '0.35rem' }}>JPG or PNG · max 5MB. This is what requesters see. Remember to Save.</p>
          </div>
        </div>
        <div className="grid2">
          <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07…" /></label>
          <label>Location<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kigali, Gasabo" /></label>
        </div>
        <label>Bio
          <textarea className="textarea" rows={3} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell requesters about your work, experience and what you do best." />
        </label>
        <p className="meta">Tip: use your bio for experience, qualifications and certifications.</p>
        <ErrorNote message={err} />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {saved && <span className="badge badge--done">Saved</span>}
          <button type="submit" className="btn-primary">Save details</button>
        </div>
      </form>
    </div>
  );
}

function SkillsCard({ me, reload }) {
  const cats = useAsync(() => getCategories(), []);
  const [skills, setSkills] = useState((me.skills || '').split(',').map((s) => s.trim()).filter(Boolean));
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const categoryNames = (cats.data || []).map((c) => c.name);
  const customs = skills.filter((s) => !categoryNames.includes(s));
  const toggle = (n) => setSkills((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
  const addCustom = () => { const v = draft.trim(); if (v && !skills.includes(v)) setSkills([...skills, v]); setDraft(''); };

  async function save() {
    setErr('');
    try { await updateMyWorkerProfile({ skills: skills.join(', ') }); reload(); setSaved(true); setTimeout(() => setSaved(false), 1500); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: '0.25rem' }}>Skills</div>
      <p className="meta">Pick from the service categories, and add any others.</p>

      <label className="field-label" style={{ marginTop: '0.75rem' }}>Service categories</label>
      <div className="row">
        {cats.loading ? <span className="meta">Loading…</span> : categoryNames.map((n) => (
          <button type="button" key={n} className={skills.includes(n) ? 'chip' : 'chip-opt'} onClick={() => toggle(n)}>
            {skills.includes(n) ? '✓ ' : ''}{n}
          </button>
        ))}
      </div>

      <label className="field-label" style={{ marginTop: '0.9rem' }}>Other skills</label>
      <div className="row">
        {customs.length === 0 && <span className="meta">None added.</span>}
        {customs.map((s) => (
          <span className="chip" key={s}>{s}<button type="button" onClick={() => toggle(s)} aria-label={`Remove ${s}`}>×</button></span>
        ))}
      </div>
      <div className="row" style={{ marginTop: '0.5rem' }}>
        <input className="input" style={{ flex: 1, minWidth: '160px' }} value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} placeholder="Add another skill, e.g. Tiling" />
        <button type="button" className="btn-secondary" onClick={addCustom}>Add</button>
      </div>

      <ErrorNote message={err} />
      <div className="divider" />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {saved && <span className="badge badge--done">Saved</span>}
        <button className="btn-primary" onClick={save}>Save skills</button>
      </div>
    </div>
  );
}

function TaskHistory({ workerId }) {
  const { data, loading } = useAsync(() => getWorkerHistory(workerId), [workerId]);
  const items = data || [];
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: '0.75rem' }}>Task history</div>
      {loading ? (
        <span className="meta">Loading…</span>
      ) : items.length === 0 ? (
        <div className="history-empty">{Icons.check}No completed tasks yet</div>
      ) : (
        items.map((h) => (
          <div className="row" key={h.booking_id} style={{ justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span className="meta">{h.taskTitle} · {String(h.date).slice(0, 10)}</span>
            {h.review && <span className="badge badge--star">Reviewed {h.review.rating}★</span>}
          </div>
        ))
      )}
    </div>
  );
}

function BookingsView({ state, only = 'active' }) {
  const { openChat } = useChat();
  const { data, loading, error, reload } = state;
  const all = data || [];
  const isHistory = only === 'done';
  const bookings = isHistory
    ? all.filter((b) => b.status === 'completed')
    : all.filter((b) => b.status !== 'completed');

  return (
    <>
      <h1>{isHistory ? 'History' : 'My bookings'}</h1>
      <p className="subtitle">{isHistory ? 'Your completed jobs and their reviews.' : 'Accept jobs and record check-in / check-out.'}</p>
      <ErrorNote message={error} />
      {loading ? <Loading /> : bookings.length === 0 ? (
        <EmptyState
          icon={isHistory ? Icons.clock : Icons.calendar}
          title={isHistory ? 'No completed jobs yet' : 'No active jobs'}
          hint={isHistory ? 'Finished jobs and their reviews will appear here.' : 'When a requester books you, the job shows up here to accept and track.'}
        />
      ) : bookings.map((b, i) => (
        <div className="card" key={b.booking_id}>
          <div className="card-head">
            <div>
              <div className="card-title">{b.taskTitle}</div>
              <div className="meta">Requested by {b.requesterName}{duration(b.startTs, b.endTs) && <> · ⏱ {duration(b.startTs, b.endTs)} on the job</>}</div>
            </div>
            <div className="row">
              {b.agreedPrice != null && <span className="badge badge--done">{rwf(b.agreedPrice)} agreed</span>}
              <StatusBadge status={b.status} /><PaymentBadge payment={b.payment} />
            </div>
          </div>
          {b.status !== 'completed' && b.status !== 'cancelled' && (
            <div className="actions">
              <button className="btn-secondary btn-icon" onClick={() => openChat(b)}>{Icons.chat} {b.agreedPrice != null ? 'Chat' : 'Chat & agree price'}</button>
            </div>
          )}
          <BookingStepper b={b} role="worker" reload={reload} openChat={openChat} collapsible defaultOpen={!isHistory && i === 0} />
        </div>
      ))}
    </>
  );
}

function EarningsView() {
  const notify = useToast();
  const { user } = useAuth();
  const { data, loading, error } = useAsync(async () => ({ bookings: await getBookings(), earnings: await getMyEarnings() }), []);

  if (loading) return <><h1>Earnings</h1><Loading /></>;
  if (error) return <><h1>Earnings</h1><ErrorNote message={error} /></>;

  // Real earnings come from the price agreed in chat. A completed booking is a
  // released payout; an in-flight booking with an agreed price is pending.
  const bookings = data.bookings || [];
  const earn = data.earnings || { total: 0, count: 0, avgRating: 0, byCategory: [], records: [] };
  const amountOf = (b) => Number(b.agreedPrice) || 0;
  const released = bookings
    .filter((b) => b.status === 'completed' && amountOf(b) > 0)
    .map((b) => ({ id: `INV-${1000 + b.booking_id}`, date: b.endTs ? String(b.endTs).slice(0, 10) : '—', task: b.taskTitle, amount: amountOf(b), status: 'released' }));
  const pending = bookings
    .filter((b) => b.status !== 'completed' && amountOf(b) > 0)
    .map((b) => ({ id: `INV-${1000 + b.booking_id}`, date: '—', task: b.taskTitle, amount: amountOf(b), status: 'pending' }));
  const invoices = [...pending, ...released];

  // Nothing agreed or earned yet → a clean empty state, not a wall of zeros.
  if (invoices.length === 0) {
    return (
      <>
        <h1>Earnings</h1>
        <p className="subtitle">Your wallet, payouts and invoices.</p>
        <EmptyState
          icon={Icons.wallet}
          title="No earnings yet"
          hint="Agree a price with a requester in chat and complete the job — your payouts and invoices will show up here."
        />
      </>
    );
  }

  const relTotal = released.reduce((a, e) => a + e.amount, 0);
  const penTotal = pending.reduce((a, e) => a + e.amount, 0);
  const total = relTotal + penTotal;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = released.filter((e) => e.date.slice(0, 7) === thisMonth).reduce((a, e) => a + e.amount, 0);

  const chartData = weekEarnings(bookings);
  const maxCat = Math.max(1, ...earn.byCategory.map((c) => c.amount));

  // Printable income statement → the worker's browser "Save as PDF". A real
  // income record informal workers can use for loans/accounts (SDG 8), with no
  // extra dependency.
  function exportIncomeSummary() {
    const win = window.open('', '_blank', 'width=820,height=920');
    if (!win) { notify('Allow pop-ups to export your income summary as a PDF.'); return; }
    const rows = earn.records.map((r) => `<tr><td>${new Date(r.date).toLocaleDateString()}</td><td>${r.taskTitle || ''}</td><td>${r.category}</td><td style="text-align:right">${rwf(r.amount)}</td></tr>`).join('');
    const cats = earn.byCategory.map((c) => `<li>${c.category}: <strong>${rwf(c.amount)}</strong></li>`).join('');
    win.document.write(`<html><head><title>TaPa Trust — Income Summary</title>
      <style>body{font-family:system-ui,Arial,sans-serif;padding:32px;color:#1a1a1a}h1{margin:0 0 2px}small{color:#666}.tot{font-size:24px;font-weight:800;margin:18px 0 6px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{text-align:left;padding:8px;border-bottom:1px solid #eee;font-size:13px}th{color:#666}ul{padding-left:18px;line-height:1.7}.foot{margin-top:24px;color:#888;font-size:12px}</style>
      </head><body>
      <h1>Income summary</h1>
      <small>TaPa Trust &middot; ${user?.name || 'Worker'} &middot; generated ${new Date().toLocaleDateString()}</small>
      <div class="tot">Total earned: ${rwf(earn.total)}</div>
      <p>Jobs completed: <strong>${earn.count}</strong> &middot; Average rating: <strong>${(earn.avgRating || 0).toFixed(1)}★</strong></p>
      <h3>Earnings by category</h3><ul>${cats || '<li>—</li>'}</ul>
      <h3>Payout records</h3>
      <table><thead><tr><th>Date</th><th>Job</th><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">No records yet</td></tr>'}</tbody></table>
      <p class="foot">Simulated payouts for demonstration. Reflects completed, released jobs on TaPa Trust.</p>
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 300);
  }

  return (
    <>
      <h1>Earnings</h1>
      <p className="subtitle">From prices agreed in chat and released on completion (payouts simulated).</p>

      <div className="earn-hero">
        <div className="earn-hero-glow" />
        <div className="earn-hero-label">Available balance</div>
        <div className="earn-hero-amt">{rwf(relTotal)}</div>
        <div className="earn-hero-foot">
          <button className="earn-withdraw" onClick={() => notify('Withdrawal requested — funds arrive shortly (simulated).')}>{Icons.wallet} Withdraw</button>
          <div className="earn-hero-pills">
            <span>Pending · {rwf(penTotal)}</span>
            <span>Total earned · {rwf(total)}</span>
          </div>
        </div>
      </div>

      <KpiGrid kpis={[
        { icon: Icons.calendar, label: 'This month', value: rwf(monthTotal) },
        { icon: Icons.checkCircle, label: 'Jobs paid', value: released.length },
        { icon: Icons.clock, label: 'Pending payouts', value: pending.length },
        { icon: Icons.thumbsUp, label: 'Avg rating', value: `${(earn.avgRating || 0).toFixed(1)}★` },
      ]} />

      <div className="card">
        <div className="card-head" style={{ marginBottom: '0.75rem' }}>
          <div className="card-title">Earnings this week</div>
          <span className="meta">Mon–Sun</span>
        </div>
        <BarChart data={chartData} format={earnFmt} />
      </div>

      {earn.byCategory.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>Earnings by category</div>
          <div className="cat-bars">
            {earn.byCategory.map((c) => (
              <div className="cat-row" key={c.category}>
                <span className="cat-name">{c.category}</span>
                <span className="cat-track"><span className="cat-fill" style={{ width: `${Math.round((c.amount / maxCat) * 100)}%` }} /></span>
                <span className="cat-amt">{rwf(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head" style={{ marginBottom: '0.5rem' }}>
          <div className="card-title">Payouts</div>
          <button className="btn-secondary" onClick={exportIncomeSummary}>Export PDF</button>
        </div>
        <div className="payouts">
          {invoices.map((e) => (
            <div className="payout-row" key={e.id}>
              <span className={`payout-ic ${e.status === 'released' ? 'is-paid' : 'is-pending'}`}>{e.status === 'released' ? Icons.checkCircle : Icons.clock}</span>
              <div className="payout-info">
                <span className="payout-task">{e.task}</span>
                <span className="meta">{e.id}{e.date !== '—' ? ` · ${e.date}` : ''}</span>
              </div>
              <div className="payout-right">
                <span className="payout-amt">{rwf(e.amount)}</span>
                <span className={`badge ${e.status === 'released' ? 'badge--done' : 'badge--neutral'}`}>{e.status === 'released' ? 'Paid' : 'Pending'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
