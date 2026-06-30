import { useState } from 'react';
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
  { ic: Icons.check, t: 'Verified identity', d: 'Workers submit ID verification, reviewed and approved by an admin before they appear.', lg: true },
  { ic: Icons.clock, t: 'Recorded time', d: 'Check-in / check-out timestamps settle "how long did it take".' },
  { ic: Icons.calendar, t: 'Mutual completion', d: 'A job only completes when both sides confirm.' },
  { ic: Icons.wallet, t: 'Payment status', d: 'Track payment pending → confirmed → released (simulated) end to end.', lg: true },
];

export default function PublicBrowse() {
  const { user, loading: authLoading } = useAuth();
  const [term, setTerm] = useState('');
  const [skill, setSkill] = useState('');
  const workers = useAsync(() => getPublicWorkers(), []);

  if (!authLoading && user) return <Navigate to={homePathForRole(user.role)} replace />;

  const all = workers.data || [];
  const trades = [...new Set(all.flatMap((w) => (w.skills || '').split(',').map((s) => s.trim()).filter(Boolean)))].sort();
  const t = term.trim().toLowerCase();
  const list = all.filter((w) => {
    const sk = (w.skills || '').toLowerCase();
    return (!skill || sk.includes(skill.toLowerCase())) && (!t || w.name.toLowerCase().includes(t) || sk.includes(t));
  });
  const jobsDone = all.reduce((n, w) => n + (w.completedJobs || 0), 0);

  return (
    <PublicShell landing>
      {/* hero */}
      <section className="phero">
        <div className="hero-glow" />
        <span className="hero-eyebrow"><span className="dot" /> Available across Kigali</span>
        <h1 className="hero-h1">Find trusted skilled workers, <span className="hero-accent">on demand.</span></h1>
        <p className="hero-sub">Verified plumbers, cleaners, electricians and more — browse, compare and book in a tap. No account needed to look around.</p>
        <div className="hero-ctas">
          <a href="#workers" className="btn-dark btn-xl">Browse workers <span aria-hidden="true">→</span></a>
          <Link to="/register" state={{ role: 'worker' }} className="btn-outline btn-xl">Join as a worker</Link>
        </div>
        {all.length > 0 && (
          <div className="hero-proof">
            <div className="avatar-cluster">
              {all.slice(0, 5).map((w) => (
                <Avatar key={w.worker_id} name={w.name} photo={w.photo} className="avatar" style={{ width: 38, height: 38, borderRadius: 999, fontSize: '0.8rem' }} />
              ))}
            </div>
            <span className="meta">{all.length}+ verified workers · {jobsDone} jobs done</span>
          </div>
        )}

        {/* product preview */}
        {all.length > 0 && (
          <div className="preview">
            <div className="preview-frame">
              <div className="preview-bar">
                <span className="preview-dot" /><span className="preview-dot" /><span className="preview-dot" />
                <span className="preview-url">tapatrust.app/workers</span>
              </div>
              <div className="preview-body">
                {all.slice(0, 3).map((w) => (
                  <div className="preview-card" key={w.worker_id}>
                    <div className="row" style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                      <Avatar name={w.name} photo={w.photo} className="avatar" style={{ width: 36, height: 36, borderRadius: 10, fontSize: '0.8rem' }} />
                      <div style={{ minWidth: 0 }}>
                        <div className="card-title" style={{ fontSize: '0.9rem' }}>{w.name}</div>
                        <div className="meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{w.skills || 'Skilled worker'}</div>
                      </div>
                    </div>
                    <div className="row" style={{ marginTop: '0.5rem' }}><Stars rating={Number(w.rating) || 0} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* how it works */}
      <section className="section" id="how">
        <div className="section-center">
          <div className="section-eyebrow">How it works</div>
          <div className="section-head">From search to done, in three steps</div>
          <p className="section-sub">Browsing is open to everyone — you only sign up when you book.</p>
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

      {/* available workers */}
      <section className="section" id="workers">
        <div className="section-center">
          <div className="section-eyebrow">Marketplace</div>
          <div className="section-head">Available workers</div>
          <p className="section-sub">Verified and reviewed — open a profile to book.</p>
        </div>

        <label className="search" style={{ maxWidth: 440, margin: '0 auto 1rem' }}>
          {Icons.search}
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search a skill, e.g. Plumbing" aria-label="Search" />
        </label>

        {trades.length > 0 && (
          <div className="row" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
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

      {/* why */}
      <section className="section" id="why">
        <div className="section-center">
          <div className="section-eyebrow">The trust loop</div>
          <div className="section-head">Accountable from start to finish</div>
          <p className="section-sub">Identity, time, completion and payment — every step verified.</p>
        </div>
        <div className="bento">
          {FEATURES.map((f) => (
            <div className={`bento-card${f.lg ? ' bento-lg' : ''}`} key={f.t}>
              <div className="feature-ic">{f.ic}</div>
              <div className="card-title">{f.t}</div>
              <div className="meta">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="section">
        <div className="cta-band">
          <h2 className="cta-h">Ready to get it fixed?</h2>
          <p className="cta-sub">Browse verified workers and book in minutes — no account needed to start looking.</p>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="#workers" className="btn-white">Browse workers</a>
            <Link to="/register" state={{ role: 'worker' }} className="btn-outline btn-xl" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}>Join as a worker</Link>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="public-footer">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">TaPa Trust</div>
            <p className="meta" style={{ marginTop: '0.5rem', maxWidth: '24ch' }}>Trusted, verified skilled services in Kigali.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#workers">Browse workers</a>
            <a href="#how">How it works</a>
            <a href="#why">Why TaPa Trust</a>
          </div>
          <div className="footer-col">
            <h4>For workers</h4>
            <Link to="/register" state={{ role: 'worker' }}>Join as a worker</Link>
            <Link to="/login">Log in</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <span className="meta" style={{ display: 'block', padding: '0.25rem 0' }}>Kigali, Rwanda</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 TaPa Trust</span>
          <span>Built for the Kigali community</span>
        </div>
      </footer>
    </PublicShell>
  );
}
