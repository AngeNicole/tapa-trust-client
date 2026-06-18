import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDemoStore, updateMyProfile, acceptBooking, checkIn, checkOut } from '../../demo/store.js';
import { StatusBadge, PaymentBadge } from '../../demo/ui.jsx';

// --- tiny inline icons -----------------------------------------------------
const I = {
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  ),
  dollar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" /><path d="m8 12 3 3 5-6" />
    </svg>
  ),
};

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
}

function NavItem({ icon, label, active, soon, count, onClick }) {
  return (
    <button
      type="button"
      className={`nav-item ${active ? 'nav-item--active' : ''} ${soon ? 'nav-item--soon' : ''}`}
      onClick={soon ? undefined : onClick}
      disabled={soon}
    >
      {icon}
      <span>{label}</span>
      {soon && <span className="nav-pill">Soon</span>}
      {!soon && count > 0 && <span className="nav-count">{count}</span>}
    </button>
  );
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const store = useDemoStore();
  const [tab, setTab] = useState('profile');

  return (
    <div className="dash">
      <aside className="dash-side">
        <NavItem icon={I.user} label="Profile" active={tab === 'profile'} onClick={() => setTab('profile')} />
        <NavItem
          icon={I.calendar}
          label="My bookings"
          active={tab === 'bookings'}
          count={store.bookings.length}
          onClick={() => setTab('bookings')}
        />
        <NavItem icon={I.dollar} label="Earnings" soon />
      </aside>

      <section className="dash-main">
        <div className="dash-main-inner">
          {tab === 'profile' && <ProfileView user={user} me={store.myProfile} bookings={store.bookings} />}
          {tab === 'bookings' && <BookingsView bookings={store.bookings} />}
        </div>
      </section>
    </div>
  );
}

function ProfileView({ user, me, bookings }) {
  const initialSkills = (me.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  const [skills, setSkills] = useState(initialSkills);
  const [draft, setDraft] = useState('');
  const [bio, setBio] = useState(me.bio || '');
  const [saved, setSaved] = useState(false);

  function addSkill() {
    const s = draft.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setDraft('');
  }
  function removeSkill(s) {
    setSkills(skills.filter((x) => x !== s));
  }
  function reset() {
    setSkills(initialSkills);
    setBio(me.bio || '');
    setDraft('');
  }
  function save(e) {
    e.preventDefault();
    updateMyProfile({ skills: skills.join(', '), bio });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const completed = bookings.filter((b) => b.status === 'completed');

  return (
    <>
      <h1>Your profile</h1>
      <p className="subtitle">This is what requesters see when they consider you for a task.</p>

      {/* header card */}
      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div className="row" style={{ alignItems: 'center', gap: '1rem', flexWrap: 'nowrap' }}>
          <div className="avatar">{initials(user.name)}</div>
          <div>
            <div className="row" style={{ gap: '0.6rem' }}>
              <span className="card-title">{user.name}</span>
              <span className="badge badge--primary">{me.tier}</span>
            </div>
            <span className="pin">{I.pin}{user.location || 'Location not set'}</span>
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

      {/* edit details */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '0.75rem' }}>Edit details</div>
        <form onSubmit={save}>
          <label className="field-label">Skills</label>
          <div className="row" style={{ marginBottom: '0.6rem' }}>
            {skills.length === 0 && <span className="meta">No skills added yet.</span>}
            {skills.map((s) => (
              <span className="chip" key={s}>
                {s}
                <button type="button" onClick={() => removeSkill(s)} aria-label={`Remove ${s}`}>×</button>
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
          <textarea
            className="textarea"
            rows={3}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <p className="meta" style={{ marginTop: '0.35rem' }}>Up to 500 characters.</p>

          <div className="divider" />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            {saved && <span className="badge badge--done">Saved</span>}
            <button type="button" className="btn-ghost" onClick={reset}>Cancel</button>
            <button type="submit" className="btn-primary">Save changes</button>
          </div>
        </form>
      </div>

      {/* task history */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '0.75rem' }}>Task history</div>
        {completed.length === 0 ? (
          <div className="history-empty">{I.check}No completed tasks yet</div>
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
        <div className="empty" style={{ marginTop: '0.75rem' }}>
          No jobs yet. When a requester selects you for a task, it shows up here.
        </div>
      )}

      {bookings.map((b) => (
        <div className="card" key={b.booking_id}>
          <div className="card-head">
            <div>
              <div className="card-title">{b.taskTitle}</div>
              <div className="meta">Requested by {b.requesterName}</div>
            </div>
            <div className="row">
              <StatusBadge status={b.status} />
              <PaymentBadge payment={b.payment} />
            </div>
          </div>
          <div className="actions">
            {b.status === 'pending' && (
              <button className="btn-primary" onClick={() => acceptBooking(b.booking_id)}>Accept job</button>
            )}
            {b.status === 'accepted' && !b.checkedIn && (
              <button className="btn-primary" onClick={() => checkIn(b.booking_id)}>Check in</button>
            )}
            {b.checkedIn && !b.startConfirmed && (
              <span className="meta">Checked in — waiting for requester to confirm start.</span>
            )}
            {b.startConfirmed && !b.checkedOut && (
              <button className="btn-primary" onClick={() => checkOut(b.booking_id)}>Check out</button>
            )}
            {b.checkedOut && !b.endConfirmed && (
              <span className="meta">Checked out — waiting for requester to confirm completion.</span>
            )}
            {b.status === 'completed' && (
              <span className="meta">Job complete. {b.review ? `Reviewed ${b.review.rating}★.` : 'Awaiting review.'}</span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
