import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  useDemoStore,
  updateMyProfile,
  acceptBooking,
  checkIn,
  checkOut,
} from '../../demo/store.js';
import { StatusBadge, PaymentBadge, TierBadge, Stars } from '../../demo/ui.jsx';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const store = useDemoStore();
  const me = store.myProfile;

  const [skills, setSkills] = useState(me.skills);
  const [bio, setBio] = useState(me.bio);
  const [saved, setSaved] = useState(false);

  function saveProfile(e) {
    e.preventDefault();
    updateMyProfile({ skills, bio });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const jobs = store.bookings;

  return (
    <div className="wide">
      <h1>Worker dashboard</h1>
      <p className="subtitle">Welcome, {user.name}. Build your profile and handle your jobs.</p>

      <h2 className="section-title">Your profile</h2>
      <div className="card">
        <div className="card-head">
          <div className="card-title">{user.name}</div>
          <div className="row">
            <Stars rating={me.rating} />
            <TierBadge tier={me.tier} />
          </div>
        </div>
        <form className="form" onSubmit={saveProfile} style={{ marginTop: '0.75rem' }}>
          <label>
            Skills
            <input value={skills} onChange={(e) => setSkills(e.target.value)} />
            <span className="role-hint">Comma-separated, e.g. Plumbing, Electrical</span>
          </label>
          <label>
            Bio
            <input value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
          <div className="row">
            <button className="btn-primary" type="submit">Save profile</button>
            {saved && <span className="badge badge--done">Saved</span>}
          </div>
        </form>
      </div>

      <h2 className="section-title">Your jobs</h2>
      {jobs.length === 0 && (
        <div className="empty">
          No jobs yet. When a requester selects you for a task, it shows up here to accept.
        </div>
      )}

      {jobs.map((b) => (
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
              <button className="btn-primary" onClick={() => acceptBooking(b.booking_id)}>
                Accept job
              </button>
            )}

            {b.status === 'accepted' && !b.checkedIn && (
              <button className="btn-primary" onClick={() => checkIn(b.booking_id)}>
                Check in
              </button>
            )}

            {b.checkedIn && !b.startConfirmed && (
              <span className="meta">Checked in — waiting for requester to confirm start.</span>
            )}

            {b.startConfirmed && !b.checkedOut && (
              <button className="btn-primary" onClick={() => checkOut(b.booking_id)}>
                Check out
              </button>
            )}

            {b.checkedOut && !b.endConfirmed && (
              <span className="meta">
                Checked out — waiting for requester to confirm completion.
              </span>
            )}

            {b.status === 'completed' && (
              <span className="meta">
                Job complete. {b.review ? `Reviewed ${b.review.rating}★.` : 'Awaiting review.'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
