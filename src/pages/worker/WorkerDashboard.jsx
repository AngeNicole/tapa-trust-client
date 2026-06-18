import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDemoStore, updateMyProfile, acceptBooking, checkIn, checkOut } from '../../demo/store.js';
import { StatusBadge, PaymentBadge, rwf, monthLabel } from '../../demo/ui.jsx';
import { DashShell } from '../../components/DashShell.jsx';
import { Icons } from '../../demo/icons.jsx';
import { BarChart, Donut } from '../../demo/Charts.jsx';

function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'U';
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const store = useDemoStore();
  const [tab, setTab] = useState('profile');

  const items = [
    { key: 'profile', label: 'Profile', icon: Icons.user },
    { key: 'bookings', label: 'My bookings', icon: Icons.calendar, count: store.bookings.length },
    { key: 'earnings', label: 'Earnings', icon: Icons.wallet },
  ];

  return (
    <DashShell items={items} active={tab} onSelect={setTab}>
      {tab === 'profile' && <ProfileView user={user} me={store.myProfile} bookings={store.bookings} />}
      {tab === 'bookings' && <BookingsView bookings={store.bookings} />}
      {tab === 'earnings' && <EarningsView earnings={store.earnings || []} />}
    </DashShell>
  );
}

function ProfileView({ user, me, bookings }) {
  const initialSkills = (me.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  const [skills, setSkills] = useState(initialSkills);
  const [draft, setDraft] = useState('');
  const [bio, setBio] = useState(me.bio || '');
  const [saved, setSaved] = useState(false);

  const addSkill = () => {
    const s = draft.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setDraft('');
  };
  const reset = () => { setSkills(initialSkills); setBio(me.bio || ''); setDraft(''); };
  const save = (e) => {
    e.preventDefault();
    updateMyProfile({ skills: skills.join(', '), bio });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const completed = bookings.filter((b) => b.status === 'completed');

  return (
    <>
      <h1>Your profile</h1>
      <p className="subtitle">This is what requesters see when they consider you for a task.</p>

      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div className="row" style={{ alignItems: 'center', gap: '1rem', flexWrap: 'nowrap' }}>
          <div className="avatar">{initials(user.name)}</div>
          <div>
            <div className="row" style={{ gap: '0.6rem' }}>
              <span className="card-title">{user.name}</span>
              <span className="badge badge--primary">{me.tier}</span>
            </div>
            <span className="pin">{Icons.pin}{user.location || 'Location not set'}</span>
            <div className="stars-row">
              {me.rating > 0 ? (
                <span className="badge badge--star">
                  {'★'.repeat(Math.round(me.rating))}{'☆'.repeat(5 - Math.round(me.rating))} {me.rating.toFixed(1)}
                </span>
              ) : (
                <span className="meta">☆☆☆☆☆ No rating yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

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

          <div className="divider" />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            {saved && <span className="badge badge--done">Saved</span>}
            <button type="button" className="btn-ghost" onClick={reset}>Cancel</button>
            <button type="submit" className="btn-primary">Save changes</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: '0.75rem' }}>Task history</div>
        {completed.length === 0 ? (
          <div className="history-empty">{Icons.check}No completed tasks yet</div>
        ) : (
          completed.map((b) => (
            <div className="row" key={b.booking_id} style={{ justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span className="meta">{b.taskTitle} — {b.requesterName}</span>
              {b.review && <span className="badge badge--star">Reviewed {b.review.rating}★</span>}
            </div>
          ))
        )}
      </div>
    </>
  );
}

function BookingsView({ bookings }) {
  return (
    <>
      <h1>My bookings</h1>
      <p className="subtitle">Accept jobs and record check-in / check-out.</p>
      {bookings.length === 0 && (
        <div className="empty" style={{ marginTop: '0.75rem' }}>No jobs yet. When a requester selects you, it shows up here.</div>
      )}
      {bookings.map((b) => (
        <div className="card" key={b.booking_id}>
          <div className="card-head">
            <div>
              <div className="card-title">{b.taskTitle}</div>
              <div className="meta">Requested by {b.requesterName} · {rwf(b.amount)}</div>
            </div>
            <div className="row"><StatusBadge status={b.status} /><PaymentBadge payment={b.payment} /></div>
          </div>
          <div className="actions">
            {b.status === 'pending' && <button className="btn-primary" onClick={() => acceptBooking(b.booking_id)}>Accept job</button>}
            {b.status === 'accepted' && !b.checkedIn && <button className="btn-primary" onClick={() => checkIn(b.booking_id)}>Check in</button>}
            {b.checkedIn && !b.startConfirmed && <span className="meta">Checked in — waiting for requester to confirm start.</span>}
            {b.startConfirmed && !b.checkedOut && <button className="btn-primary" onClick={() => checkOut(b.booking_id)}>Check out</button>}
            {b.checkedOut && !b.endConfirmed && <span className="meta">Checked out — waiting for requester to confirm completion.</span>}
            {b.status === 'completed' && <span className="meta">Job complete. {b.review ? `Reviewed ${b.review.rating}★.` : 'Awaiting review.'}</span>}
          </div>
        </div>
      ))}
    </>
  );
}

function EarningsView({ earnings }) {
  const released = earnings.filter((e) => e.status === 'released').reduce((a, e) => a + e.amount, 0);
  const pending = earnings.filter((e) => e.status === 'pending').reduce((a, e) => a + e.amount, 0);
  const total = released + pending;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = earnings.filter((e) => e.date.slice(0, 7) === thisMonth).reduce((a, e) => a + e.amount, 0);

  // last 6 months totals for the bar chart
  const byMonth = {};
  earnings.forEach((e) => { const m = e.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + e.amount; });
  const months = Object.keys(byMonth).sort().slice(-6);
  const chartData = months.map((m) => ({ label: monthLabel(m + '-01'), value: byMonth[m] }));

  return (
    <>
      <h1>Earnings</h1>
      <p className="subtitle">Your wallet, payout history and invoices (simulated).</p>

      <div className="wallet" style={{ marginTop: '0.75rem' }}>
        <div className="wallet-label">Available balance</div>
        <div className="wallet-amount">{rwf(released)}</div>
        <div className="wallet-sub">
          <span>Pending&nbsp;·&nbsp;{rwf(pending)}</span>
          <span>Total earned&nbsp;·&nbsp;{rwf(total)}</span>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: '0.75rem' }}>
        <div className="card"><div className="stat-num">{rwf(monthTotal)}</div><div className="meta">This month</div></div>
        <div className="card"><div className="stat-num">{earnings.filter((e) => e.status === 'released').length}</div><div className="meta">Invoices paid</div></div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>Earnings — last 6 months</div>
          <BarChart data={chartData} format={(v) => (v >= 1000 ? Math.round(v / 1000) + 'k' : v)} />
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>Released vs pending</div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Donut released={released} pending={pending} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head" style={{ marginBottom: '0.5rem' }}>
          <div className="card-title">Invoices</div>
          <button className="btn-secondary" onClick={() => window.print()}>Export</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr><th>Invoice</th><th>Date</th><th>Task</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {earnings.map((e) => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td>{e.date}</td>
                  <td>{e.task}</td>
                  <td>{rwf(e.amount)}</td>
                  <td>
                    <span className={`badge ${e.status === 'released' ? 'badge--done' : 'badge--neutral'}`}>
                      {e.status === 'released' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
