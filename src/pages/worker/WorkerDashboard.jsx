import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getMyWorkerProfile,
  updateMyWorkerProfile,
  updateMe,
  getCategories,
  setAvailability,
  submitVerification,
  getWorkerHistory,
  getBookings,
  acceptBooking,
  checkinBooking,
  checkoutBooking,
} from '../../api/client.js';
import { useAsync, useBookingAlerts } from '../../api/hooks.js';
import { StatusBadge, PaymentBadge, VerifyBadge, Avatar, Loading, ErrorNote, rwf, monthLabel } from '../../components/shared/ui.jsx';
import { DashShell } from '../../components/DashShell.jsx';
import { Hero } from '../../components/Hero.jsx';
import { StatsRail } from '../../components/StatsRail.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Icons } from '../../components/shared/icons.jsx';
import { BarChart, Donut } from '../../components/shared/Charts.jsx';

function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'U';
}
// Stable, simulated payout amount per booking (no earnings API in Tier-1).
const simAmount = (id) => 8000 + ((Number(id) * 37) % 6) * 3000;

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');
  const notify = useToast();
  const bookings = useAsync(() => getBookings(), [], { intervalMs: 7000 });
  useBookingAlerts(bookings.data, 'worker', notify);
  const count = bookings.data?.length || 0;

  const items = [
    { key: 'profile', label: 'Profile', icon: Icons.user },
    { key: 'bookings', label: 'My bookings', icon: Icons.calendar, count },
    { key: 'earnings', label: 'Earnings', icon: Icons.wallet },
  ];

  return (
    <DashShell
      items={items}
      active={tab}
      onSelect={setTab}
      rightRail={<StatsRail user={user} bookings={bookings.data || []} role="worker" />}
    >
      {tab === 'profile' && (
        <>
          <div style={{ marginBottom: '1.25rem' }}>
            <Hero
              kicker="TaPa Trust"
              title="Get hired and grow your reputation."
              ctaLabel="View my bookings"
              onCta={() => setTab('bookings')}
            />
          </div>
          <ProfileView user={user} />
        </>
      )}
      {tab === 'bookings' && <BookingsView state={bookings} />}
      {tab === 'earnings' && <EarningsView />}
    </DashShell>
  );
}

function ProfileView({ user }) {
  const { data: me, loading, error, reload } = useAsync(() => getMyWorkerProfile(), []);
  if (loading) return <><h1>Your profile</h1><Loading /></>;
  if (error) return <><h1>Your profile</h1><ErrorNote message={error} /></>;
  return <ProfileEditor user={user} me={me} reload={reload} />;
}

function AvailabilityToggle({ me, reload }) {
  const [available, setAvail] = useState(!!me.is_available);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    const next = !available;
    setBusy(true); setAvail(next);
    try { await setAvailability(next); reload(); } catch { setAvail(!next); } finally { setBusy(false); }
  }
  return (
    <button type="button" className="btn-secondary" onClick={toggle} disabled={busy} title="Workers must be available to appear in browse">
      <span className={`activity-dot ${available ? 'activity-dot--completed' : 'activity-dot--pending'}`} style={{ display: 'inline-block', marginRight: 6 }} />
      {available ? 'Available' : 'Unavailable'} — tap to go {available ? 'offline' : 'available'}
    </button>
  );
}

function VerificationCard({ status, reload }) {
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (!fileName) return;
    setBusy(true); setErr('');
    // Simulated: the document is not stored — we send the filename as the marker.
    try { await submitVerification({ document: fileName }); reload(); } catch (e2) { setErr(e2.message); setBusy(false); }
  }
  return (
    <div className="card">
      <div className="card-head" style={{ marginBottom: '0.4rem' }}>
        <div className="card-title">Identity verification</div>
        <VerifyBadge status={status} />
      </div>
      <p className="meta">Simulated verification — upload a mock ID document. No real ID is checked and the file isn't stored; an admin reviews and approves it. You can skip this and finish it later.</p>
      {status === 'verified' && <p className="meta" style={{ marginTop: '0.5rem' }}>You're verified. ✓</p>}
      {status === 'pending' && <p className="meta" style={{ marginTop: '0.5rem' }}>Your document is pending admin review.</p>}
      {status === 'unverified' && (
        <form onSubmit={submit} style={{ marginTop: '0.6rem' }}>
          <div className="row">
            <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              {Icons.upload} Choose document
              <input
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
              />
            </label>
            <span className="meta">{fileName || 'No file selected — Simulated verification'}</span>
            <button className="btn-primary" type="submit" disabled={busy || !fileName}>
              {busy ? 'Submitting…' : 'Submit document'}
            </button>
          </div>
        </form>
      )}
      <ErrorNote message={err} />
    </div>
  );
}

function ProfileEditor({ user, me, reload }) {
  return (
    <>
      <h1>Your profile</h1>
      <p className="subtitle">This is what requesters see when they consider you for a task.</p>

      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div className="card-head" style={{ alignItems: 'center' }}>
          <div className="row" style={{ alignItems: 'center', gap: '1rem', flexWrap: 'nowrap' }}>
            <Avatar name={user.name} photo={me.photo} />
            <div>
              <div className="row" style={{ gap: '0.6rem' }}>
                <span className="card-title">{user.name}</span>
                <span className="badge badge--primary">{me.tier}</span>
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
          <AvailabilityToggle me={me} reload={reload} />
        </div>
      </div>

      <VerificationCard status={me.verification} reload={reload} />
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
  const [bio, setBio] = useState(me.bio || '');
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

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
        <div className="grid2">
          <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07…" /></label>
          <label>Location<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kigali, Gasabo" /></label>
          <label>Profile photo URL<input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://…" /></label>
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

function BookingsView({ state }) {
  const { data, loading, error, reload } = state;
  const [err, setErr] = useState('');
  const [view, setView] = useState('active');
  const act = async (p) => { setErr(''); try { await p; reload(); } catch (e) { setErr(e.message); } };
  const all = data || [];
  const activeJobs = all.filter((b) => b.status !== 'completed');
  const doneJobs = all.filter((b) => b.status === 'completed');
  const bookings = view === 'active' ? activeJobs : doneJobs;

  return (
    <>
      <h1>My bookings</h1>
      <p className="subtitle">Accept jobs and record check-in / check-out.</p>
      <ErrorNote message={error || err} />
      <div className="subtabs">
        <button type="button" className={`subtab ${view === 'active' ? 'subtab--active' : ''}`} onClick={() => setView('active')}>
          Active ({activeJobs.length})
        </button>
        <button type="button" className={`subtab ${view === 'done' ? 'subtab--active' : ''}`} onClick={() => setView('done')}>
          Done ({doneJobs.length})
        </button>
      </div>
      {loading ? <Loading /> : bookings.length === 0 ? (
        <div className="empty" style={{ marginTop: '0.75rem' }}>
          {view === 'active' ? 'No active jobs. New jobs from requesters show up here.' : 'No completed jobs yet.'}
        </div>
      ) : bookings.map((b) => (
        <div className="card" key={b.booking_id}>
          <div className="card-head">
            <div>
              <div className="card-title">{b.taskTitle}</div>
              <div className="meta">Requested by {b.requesterName}</div>
            </div>
            <div className="row"><StatusBadge status={b.status} /><PaymentBadge payment={b.payment} /></div>
          </div>
          <div className="actions">
            {b.status === 'pending' && <button className="btn-primary" onClick={() => act(acceptBooking(b.booking_id))}>Accept job</button>}
            {b.status === 'accepted' && !b.checkedIn && <button className="btn-primary" onClick={() => act(checkinBooking(b.booking_id))}>Check in</button>}
            {b.status === 'accepted' && b.checkedIn && <span className="meta">Checked in — waiting for requester to confirm start.</span>}
            {b.status === 'in_progress' && !b.checkedOut && <button className="btn-primary" onClick={() => act(checkoutBooking(b.booking_id))}>Check out</button>}
            {b.status === 'in_progress' && b.checkedOut && <span className="meta">Checked out — waiting for requester to confirm completion.</span>}
            {b.status === 'completed' && <span className="meta">Job complete. {b.review ? `Reviewed ${b.review.rating}★.` : 'Awaiting review.'}</span>}
          </div>
        </div>
      ))}
    </>
  );
}

function EarningsView() {
  const { data, loading, error } = useAsync(async () => {
    const me = await getMyWorkerProfile();
    const [history, bookings] = await Promise.all([getWorkerHistory(me.worker_id), getBookings()]);
    return { history, bookings };
  }, []);

  if (loading) return <><h1>Earnings</h1><Loading /></>;
  if (error) return <><h1>Earnings</h1><ErrorNote message={error} /></>;

  const released = (data.history || []).map((h) => ({
    id: `INV-${1000 + h.booking_id}`,
    date: String(h.date).slice(0, 10),
    task: h.taskTitle,
    amount: simAmount(h.booking_id),
    status: 'released',
  }));
  const pending = (data.bookings || [])
    .filter((b) => b.status !== 'completed')
    .map((b) => ({
      id: `INV-${1000 + b.booking_id}`,
      date: '—',
      task: b.taskTitle,
      amount: simAmount(b.booking_id),
      status: 'pending',
    }));
  const invoices = [...pending, ...released];

  const relTotal = released.reduce((a, e) => a + e.amount, 0);
  const penTotal = pending.reduce((a, e) => a + e.amount, 0);
  const total = relTotal + penTotal;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = released.filter((e) => e.date.slice(0, 7) === thisMonth).reduce((a, e) => a + e.amount, 0);

  const byMonth = {};
  released.forEach((e) => { const m = e.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + e.amount; });
  const months = Object.keys(byMonth).sort().slice(-6);
  const chartData = months.map((m) => ({ label: monthLabel(m + '-01'), value: byMonth[m] }));

  return (
    <>
      <h1>Earnings</h1>
      <p className="subtitle">Your wallet, payout history and invoices (amounts simulated).</p>

      <div className="wallet" style={{ marginTop: '0.75rem' }}>
        <div className="wallet-label">Available balance</div>
        <div className="wallet-amount">{rwf(relTotal)}</div>
        <div className="wallet-sub">
          <span>Pending&nbsp;·&nbsp;{rwf(penTotal)}</span>
          <span>Total earned&nbsp;·&nbsp;{rwf(total)}</span>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: '0.75rem' }}>
        <div className="card"><div className="stat-num">{rwf(monthTotal)}</div><div className="meta">This month</div></div>
        <div className="card"><div className="stat-num">{released.length}</div><div className="meta">Invoices paid</div></div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>Earnings — last 6 months</div>
          {chartData.length ? <BarChart data={chartData} format={(v) => (v >= 1000 ? Math.round(v / 1000) + 'k' : v)} />
            : <span className="meta">No paid jobs yet.</span>}
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>Released vs pending</div>
          <div className="row" style={{ justifyContent: 'center' }}><Donut released={relTotal} pending={penTotal} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card-head" style={{ marginBottom: '0.5rem' }}>
          <div className="card-title">Invoices</div>
          <button className="btn-secondary" onClick={() => window.print()}>Export</button>
        </div>
        {invoices.length === 0 ? <span className="meta">No invoices yet.</span> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Date</th><th>Task</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.map((e) => (
                  <tr key={e.id}>
                    <td>{e.id}</td><td>{e.date}</td><td>{e.task}</td><td>{rwf(e.amount)}</td>
                    <td><span className={`badge ${e.status === 'released' ? 'badge--done' : 'badge--neutral'}`}>{e.status === 'released' ? 'Paid' : 'Pending'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
