import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getPublicWorker, getPublicWorkerHistory, bookWorker } from '../../api/client.js';
import { useAsync } from '../../api/hooks.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { setPendingBooking } from '../../api/pendingBooking.js';
import { Loading, ErrorNote } from '../../components/shared/ui.jsx';
import { PublicShell } from '../../components/PublicShell.jsx';
import { ReviewsModal } from '../../components/ReviewsModal.jsx';
import { Icons } from '../../components/shared/icons.jsx';

function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'U';
}
function stars(rating) {
  const full = Math.round(Number(rating) || 0);
  return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
}
function splitList(s) {
  return (s || '').split(/[\n;,]+/).map((x) => x.trim()).filter(Boolean);
}

export default function PublicWorkerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: w, loading, error } = useAsync(() => getPublicWorker(id), [id]);
  const history = useAsync(() => getPublicWorkerHistory(id), [id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showReviews, setShowReviews] = useState(false);

  async function book() {
    setErr('');
    if (!user) {
      setPendingBooking(id);
      navigate('/register', { state: { book: Number(id) } });
      return;
    }
    if (user.role !== 'requester') {
      setErr('Only requesters can book. Log in with a requester account to book this worker.');
      return;
    }
    setBusy(true);
    try { await bookWorker(id); navigate('/requester'); } catch (e) { setErr(e.message); setBusy(false); }
  }

  const jobs = history.data || [];
  const reviews = jobs.filter((h) => h.rating != null).map((h, i) => ({ id: h.booking_id ?? `${id}-${i}`, taskTitle: h.taskTitle, date: String(h.date).slice(0, 10), rating: h.rating, comment: h.comment }));
  const certs = w ? splitList(w.certifications) : [];

  return (
    <PublicShell>
      <div className="pp-wrap">
      <Link to="/" className="pp-back">← Back to workers</Link>
      {loading ? <Loading /> : error ? <ErrorNote message={error} /> : w.verification !== 'verified' ? (
        <div className="pp-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div className="pp-h" style={{ justifyContent: 'center' }}>{Icons.shield} Not available yet</div>
          <p className="pp-text" style={{ marginTop: '0.5rem' }}>This worker&apos;s profile appears once an admin has verified their identity. Please check back soon.</p>
          <Link to="/" className="pp-book" style={{ display: 'inline-flex', width: 'auto', marginTop: '1rem', textDecoration: 'none' }}>Browse verified workers</Link>
        </div>
      ) : (
        <div className="pp-grid">
          {/* left identity card */}
          <aside className="pp-side">
            <div className="pp-card pp-id">
              <div className="pp-photo">
                {w.photo ? <img src={w.photo} alt={w.name} /> : initials(w.name)}
              </div>
              <div className="pp-id-body">
                <div className="pp-name">{w.name}</div>
                <div className="pp-rating">
                  <span className="pp-stars">{stars(w.rating)}</span>
                  {reviews.length > 0
                    ? <button type="button" className="pp-reviews-link" onClick={() => setShowReviews(true)}>{(Number(w.rating) || 0).toFixed(1)} · {reviews.length} review{reviews.length === 1 ? '' : 's'}</button>
                    : <span className="pp-mono">{(Number(w.rating) || 0).toFixed(1)} · no reviews yet</span>}
                </div>
                <div className="pp-badges">
                  {w.verification === 'verified'
                    ? <span className="pp-pill-green">{Icons.checkCircle} Verified</span>
                    : <span className="pp-pill-muted">{w.verification === 'pending' ? 'Verification pending' : 'Unverified'}</span>}
                </div>

                <hr className="pp-div" />

                <div className="pp-stat"><span>Jobs completed</span><strong>{w.completedJobs || 0}</strong></div>

                <button className="pp-book" onClick={book} disabled={busy}>
                  {busy ? 'Booking…' : 'Book this Worker'}
                </button>
                {!user && <p className="pp-note">You'll be asked to sign in to book</p>}
                <ErrorNote message={err} />
              </div>
            </div>
          </aside>

          {/* right detail cards */}
          <div className="pp-main" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {w.bio && (
              <section className="pp-card">
                <div className="pp-h">About</div>
                <p className="pp-text">{w.bio}</p>
              </section>
            )}

            {w.skills && (
              <section className="pp-card">
                <div className="pp-h">Skills</div>
                <div className="pp-skills">
                  {splitList(w.skills).map((s) => <span className="pp-skill" key={s}>{s}</span>)}
                </div>
              </section>
            )}

            {w.education && (
              <section className="pp-card">
                <div className="pp-h">{Icons.graduation} Education</div>
                <p className="pp-text">{w.education}</p>
              </section>
            )}

            {certs.length > 0 && (
              <section className="pp-card">
                <div className="pp-h">{Icons.certificate} Certifications</div>
                {certs.map((c) => <div className="pp-cert" key={c}>{Icons.checkCircle} {c}</div>)}
              </section>
            )}

            <section className="pp-card">
              <div className="pp-h">Recent Jobs</div>
              {history.loading ? <span className="pp-mono">Loading…</span> : jobs.length === 0 ? (
                <p className="pp-text">No completed jobs yet.</p>
              ) : (
                jobs.map((h, i) => (
                  <div className="pp-job" key={i}>
                    <div>
                      <div className="pp-job-title">{h.taskTitle}</div>
                      <div className="pp-job-meta">{String(h.date).slice(0, 10)}{h.comment ? ` · ${h.comment}` : ''}</div>
                    </div>
                    {h.rating != null && <div className="pp-job-stars">{'★'.repeat(h.rating)}</div>}
                  </div>
                ))
              )}
            </section>
          </div>
        </div>
      )}
      </div>
      {showReviews && <ReviewsModal reviews={reviews} workerName={w?.name} avg={w?.rating} count={reviews.length} onClose={() => setShowReviews(false)} />}
    </PublicShell>
  );
}
