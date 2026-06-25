import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getPublicWorker, getPublicWorkerHistory, bookWorker } from '../../api/client.js';
import { useAsync } from '../../api/hooks.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { setPendingBooking } from '../../api/pendingBooking.js';
import { Avatar, Stars, VerifyBadge, Loading, ErrorNote } from '../../components/shared/ui.jsx';
import { PublicShell } from '../../components/PublicShell.jsx';
import { Icons } from '../../components/shared/icons.jsx';

export default function PublicWorkerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: w, loading, error } = useAsync(() => getPublicWorker(id), [id]);
  const history = useAsync(() => getPublicWorkerHistory(id), [id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function book() {
    setErr('');
    // Logged-out → remember this worker, send to requester register/login;
    // the booking resumes automatically after auth.
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

  return (
    <PublicShell>
      <Link to="/" className="btn-ghost" style={{ paddingLeft: 0, textDecoration: 'none' }}>← Back to workers</Link>
      {loading ? <Loading /> : error ? <ErrorNote message={error} /> : (
        <>
          <div className="card" style={{ marginTop: '0.5rem' }}>
            <div className="card-head">
              <div className="row" style={{ gap: '0.85rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                <Avatar name={w.name} photo={w.photo} />
                <div>
                  <div className="row" style={{ gap: '0.5rem' }}>
                    <span className="card-title">{w.name}</span>
                    <VerifyBadge status={w.verification} />
                  </div>
                  <div className="stars-row"><Stars rating={Number(w.rating) || 0} /></div>
                  <div className="meta" style={{ marginTop: '0.35rem' }}>{w.completedJobs || 0} completed jobs</div>
                </div>
              </div>
            </div>
            {w.skills && <div className="meta" style={{ marginTop: '0.75rem' }}><strong>Skills:</strong> {w.skills}</div>}
            {w.bio && <p className="meta" style={{ marginTop: '0.35rem' }}>{w.bio}</p>}
            {w.education && <div className="meta" style={{ marginTop: '0.5rem' }}><strong>Education:</strong> {w.education}</div>}
            {w.certifications && <div className="meta" style={{ marginTop: '0.25rem' }}><strong>Certifications:</strong> {w.certifications}</div>}
            <ErrorNote message={err} />
            <div className="actions">
              <button className="btn-primary" onClick={book} disabled={busy}>{busy ? 'Booking…' : 'Book this worker'}</button>
              {!user && <span className="meta">You'll create a quick requester account to confirm.</span>}
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: '0.75rem' }}>Track record</div>
            {history.loading ? <span className="meta">Loading…</span> : jobs.length === 0 ? (
              <div className="history-empty">{Icons.check}No completed jobs yet</div>
            ) : (
              jobs.map((h, i) => (
                <div className="row" key={i} style={{ justifyContent: 'space-between', padding: '0.5rem 0' }}>
                  <span className="meta">{h.taskTitle} · {String(h.date).slice(0, 10)}</span>
                  {h.rating != null && <span className="badge badge--star">Reviewed {h.rating}★</span>}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </PublicShell>
  );
}
