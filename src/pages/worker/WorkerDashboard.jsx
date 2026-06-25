import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getMyWorkerProfile,
  updateMyWorkerProfile,
  setAvailability,
  submitVerification,
  getWorkerHistory,
  getBookings,
  acceptBooking,
  checkinBooking,
  checkoutBooking,
} from '../../api/client.js';
import { useAsync, useBookingAlerts } from '../../api/hooks.js';
import { StatusBadge, PaymentBadge, VerifyBadge, Loading, ErrorNote, rwf, monthLabel } from '../../components/shared/ui.jsx';
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
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await submitVerification({ reference: ref || 'demo-id' }); reload(); } catch (e2) { setErr(e2.message); setBusy(false); }
  }
  return (
    <div className="card">
      <div className="card-head" style={{ marginBottom: '0.4rem' }}>
        <div className="card-title">Identity verification</div>
        <VerifyBadge status={status} />
      </div>
      <p className="meta">Simulated verification — no real ID is checked. An admin reviews and approves it. You can skip this and finish it later.</p>
      {status === 'verified' && <p className="meta" style={{ marginTop: '0.5rem' }}>You're verified. ✓</p>}
      {status === 'pending' && <p className="meta" style={{ marginTop: '0.5rem' }}>Your submission is pending admin review.</p>}
      {status === 'unverified' && (
        <form className="row" onSubmit={submit} style={{ marginTop: '0.6rem', width: '100%' }}>
          <input className="input" style={{ flex: 1, minWidth: '180px' }} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reference / mock document — Simulated verification" />
          <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for verification'}</button>
        </form>
      )}
      <ErrorNote message={err} />
    </div>
  );
}

function ProfileEditor({ user, me, reload }) {
  const initialSkills = (me.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  const [skills, setSkills] = useState(initialSkills);
  const [draft, setDraft] = useState('');
  const [bio, setBio] = useState(me.bio || '');
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const addSkill = () => {
    const s = draft.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setDraft('');
  };
  const reset = () => { setSkills(initialSkills); setBio(me.bio || ''); setDraft(''); };
  async function save(e) {
    e.preventDefault();
    setErr('');
    try {
      await updateMyWorkerProfile({ skills: skills.join(', '), bio });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e2) { setErr(e2.message); }
  }

  return (
    <>
      <h1>Your profile</h1>
      <p className="subtitle">This is what requesters see when they consider you for a task.</p>

      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div className="card-head" style={{ alignItems: 'center' }}>
          <div className="row" style={{ alignItems: 'center', gap: '1rem', flexWrap: 'nowrap' }}>
            <div className="avatar">{initials(user.name)}</div>
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

      <div className="card">
        <div className="card-title" style={{ marginBottom: '0.75rem' }}>Edit details</div>
        <form onSubmit={save}>
          <label className="field-label">Skills</label>
          <div className="row" style={{ marginBottom: '0.6rem' }}>
            {skills.length === 0 && <span className="meta">No skills added yet.</span>}
            {skills.map((s) => (
              <span className="chip" key={s}>
                {s}
                <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}>×</button>
              </span>
            ))}
          </div>
          <div className="row" style={{ marginBottom: '1rem' }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: '160px' }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              placeholder="Add a skill, e.g. Tiling"
            />
            <button type="button" className="btn-secondary" onClick={addSkill}>Add</button>
          </div>

          <label className="field-label">Bio</label>
          <textarea className="textarea" rows={3} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} />
          <p className="meta" style={{ marginTop: '0.35rem' }}>Up to 500 characters.</p>

          <ErrorNote message={err} />
          <div className="divider" />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            {saved && <span className="badge badge--done">Saved</span>}
            <button type="button" className="btn-ghost" onClick={reset}>Cancel</button>
            <button type="submit" className="btn-primary">Save changes</button>
          </div>
        </form>
      </div>

      <TaskHistory workerId={me.worker_id} />
    </>
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
