import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getPublicWorkers } from '../../api/client.js';
import { useAsync } from '../../api/hooks.js';
import { useAuth, homePathForRole } from '../../context/AuthContext.jsx';
import { Avatar, Stars, VerifyBadge, Loading, ErrorNote } from '../../components/shared/ui.jsx';
import { PublicShell } from '../../components/PublicShell.jsx';
import { Icons } from '../../components/shared/icons.jsx';

const STEPS = [
  { t: 'Browse & compare', d: 'Search by trade and compare workers by rating, verification and track record — no account needed.' },
  { t: 'Book in a tap', d: 'Open a profile and book. Create a quick requester account only when you confirm.' },
  { t: 'Track it to done', d: 'Mutual check-in and check-out, confirm completion, then leave a review.' },
];
const FEATURES = [
  { ic: Icons.check, t: 'Verified identity', d: 'Workers submit ID verification, reviewed and approved by an admin.' },
  { ic: Icons.clock, t: 'Recorded time', d: 'Check-in / check-out timestamps settle "how long did it take".' },
  { ic: Icons.calendar, t: 'Mutual completion', d: 'Both sides confirm — a job only completes when the requester agrees.' },
  { ic: Icons.wallet, t: 'Payment status', d: 'Track payment pending → confirmed → released (simulated).' },
];

export default function PublicBrowse() {
  const { user, loading: authLoading } = useAuth();
  const [term, setTerm] = useState('');
  const [skill, setSkill] = useState('');
  const workers = useAsync(() => getPublicWorkers(), []);
  const workersRef = useRef(null);

  if (!authLoading && user) return <Navigate to={homePathForRole(user.role)} replace />;

  const all = workers.data || [];
  const trades = [...new Set(all.flatMap((w) => (w.skills || '').split(',').map((s) => s.trim()).filter(Boolean)))].sort();
  const t = term.trim().toLowerCase();
  const list = all.filter((w) => {
    const sk = (w.skills || '').toLowerCase();
    return (!skill || sk.includes(skill.toLowerCase())) && (!t || w.name.toLowerCase().includes(t) || sk.includes(t));
  });
  const scrollToWorkers = () => workersRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <PublicShell search={term} onSearch={setTerm}>
      {/* hero */}
      <section className="landing-hero">
        <span className="hero-eyebrow">Trusted services · Kigali</span>
        <h1 className="hero-h1">Hire trusted skilled workers, <span className="hero-accent">fast.</span></h1>
        <p className="hero-sub">Plumbers, cleaners, electricians and more — verified, reviewed, and bookable in a tap. Browse freely; sign up only when you book.</p>
        <div className="hero-ctas">
          <button type="button" className="btn-dark" onClick={scrollToWorkers}>Browse workers <span aria-hidden="true">→</span></button>
          <Link to="/register" state={{ role: 'worker' }} className="btn-outline">Join as a worker</Link>
        </div>
        {all.length > 0 && (
          <div className="hero-proof">
            <div className="avatar-cluster">
              {all.slice(0, 5).map((w) => (
                <Avatar key={w.worker_id} name={w.name} photo={w.photo} className="avatar" style={{ width: 40, height: 40, borderRadius: 999, fontSize: '0.85rem' }} />
              ))}
            </div>
            <span className="meta">Trusted by {all.length}+ workers across Kigali</span>
          </div>
        )}
        <div className="stat-strip">
          <div><div className="stat-num">{all.length}</div><div className="meta">available now</div></div>
          <div><div className="stat-num">{trades.length}</div><div className="meta">trades</div></div>
          <div><div className="stat-num">{all.reduce((n, w) => n + (w.completedJobs || 0), 0)}</div><div className="meta">jobs done</div></div>
        </div>
      </section>

      {/* how it works */}
      <section className="section-block">
        <div className="section-center">
          <div className="section-head">How it works</div>
          <p className="section-sub">From browsing to a finished job, in three steps.</p>
        </div>
        <div className="how">
          {STEPS.map((s, i) => (
            <div className="step-card" key={s.t}>
              <div className="step-num">{i + 1}</div>
              <div className="card-title">{s.t}</div>
              <div className="meta">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* available workers (functional grid) */}
      <section className="section-block" ref={workersRef}>
        <div className="section-head">Available workers</div>
        <p className="section-sub">Verified and reviewed — book any of them in a tap.</p>

        {trades.length > 0 && (
          <div className="row" style={{ marginBottom: '1rem' }}>
            <button type="button" className={skill === '' ? 'chip' : 'chip-opt'} onClick={() => setSkill('')}>All trades</button>
            {trades.map((tr) => (
              <button type="button" key={tr} className={skill === tr ? 'chip' : 'chip-opt'} onClick={() => setSkill(skill === tr ? '' : tr)}>{tr}</button>
            ))}
          </div>
        )}

        {workers.loading ? <Loading /> : workers.error ? <ErrorNote message={workers.error} /> : list.length === 0 ? (
          <div className="empty">No available workers{skill ? ` for “${skill}”` : ''}{t ? ` matching “${term}”` : ''} right now.</div>
        ) : (
          <div className="grid3">
            {list.map((w) => (
              <Link key={w.worker_id} to={`/workers/${w.worker_id}`} className="worker-tile">
                <div className="row" style={{ gap: '0.6rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                  <Avatar name={w.name} photo={w.photo} className="avatar" style={{ width: 48, height: 48, borderRadius: 14, fontSize: '1rem' }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="card-title">{w.name}</div>
                    <div className="meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.skills || 'No skills listed yet'}</div>
                  </div>
                </div>
                <div className="row" style={{ marginTop: '0.7rem' }}>
                  <Stars rating={Number(w.rating) || 0} />
                  <VerifyBadge status={w.verification} />
                </div>
                <div className="row" style={{ marginTop: '0.5rem' }}>
                  <span className="meta">{w.completedJobs || 0} jobs done</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* why TaPa Trust */}
      <section className="section-block">
        <div className="section-center">
          <div className="section-head">Why TaPa Trust</div>
          <p className="section-sub">A closed trust loop — identity, time, completion and payment, all accountable.</p>
        </div>
        <div className="features">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.t}>
              <div className="feature-ic">{f.ic}</div>
              <div className="card-title">{f.t}</div>
              <div className="meta">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="public-footer">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>© 2026 TaPa Trust · Kigali, Rwanda</span>
          <span className="row" style={{ gap: '1rem' }}>
            <button type="button" className="public-link" onClick={scrollToWorkers}>Browse</button>
            <Link to="/register" state={{ role: 'worker' }} className="public-link">Join as a worker</Link>
            <Link to="/login" className="public-link">Log in</Link>
          </span>
        </div>
      </footer>
    </PublicShell>
  );
}
