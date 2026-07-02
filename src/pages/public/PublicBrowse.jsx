import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getPublicWorkers } from '../../api/client.js';
import { useAsync } from '../../api/hooks.js';
import { useAuth, homePathForRole } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Avatar } from '../../components/shared/ui.jsx';
import { PublicShell } from '../../components/PublicShell.jsx';
import { Icons } from '../../components/shared/icons.jsx';

const U = (id, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`;
const HERO_IMG = U('1621905252507-b35492cc74b4', 1200);

const TRADES = [
  { name: 'Plumbing', ic: Icons.wrench, d: 'Leaks, taps, drains and installs', acc: 'acc-blue', img: U('1584622650111-993a426fbf0a') },
  { name: 'Cleaning', ic: Icons.broom, d: 'Homes, offices and deep cleans', acc: 'acc-green', img: U('1581578731548-c64695cc6952') },
  { name: 'Electrical', ic: Icons.lightning, d: 'Wiring, fixtures and safety', acc: 'acc-orange', img: U('1621905251918-48416bd8575a') },
  { name: 'Moving', ic: Icons.truck, d: 'Moves and heavy lifting', acc: 'acc-purple', img: U('1600518464441-9154a4dea21b') },
  { name: 'Furniture Assembly', ic: Icons.hammer, d: 'Flat-pack and fittings', acc: 'acc-red', img: U('1595515106969-1ce29566ff1c') },
  { name: 'Tech Setup', ic: Icons.device, d: 'Wi-Fi, TVs and smart home', acc: 'acc-yellow', img: U('1550751827-4bd374c3f58b') },
];
const STEPS = [
  { t: 'Browse & compare', d: 'Search by trade and compare workers by rating, verification and track record — no account needed.', acc: 'acc-purple' },
  { t: 'Book in a tap', d: 'Open a profile and book. Create a quick requester account only when you confirm.', acc: 'acc-blue' },
  { t: 'Track it to done', d: 'Mutual check-in and check-out, confirm completion, then leave a review.', acc: 'acc-green' },
];
const FEATURES = [
  { ic: Icons.check, t: 'Verified identity', d: 'Workers submit ID verification, reviewed and approved by an admin before they appear.', lg: true, acc: 'acc-green' },
  { ic: Icons.clock, t: 'Recorded time', d: 'Check-in / check-out timestamps settle "how long did it take".', acc: 'acc-blue' },
  { ic: Icons.calendar, t: 'Mutual completion', d: 'A job only completes when both sides confirm.', acc: 'acc-purple' },
  { ic: Icons.wallet, t: 'Payment status', d: 'Track payment pending → confirmed → released (simulated) end to end.', lg: true, acc: 'acc-orange' },
];
const hideBroken = (e) => { e.currentTarget.style.display = 'none'; };
const QUOTES = [
  { q: 'Booked a plumber in minutes, and the check-in / check-out made the whole job completely transparent.', n: 'Aline U.', r: 'Requester · Kigali' },
  { q: 'Verification and reviews meant I knew exactly who I was letting into my home before they arrived.', n: 'Patrick K.', r: 'Requester · Gasabo' },
  { q: 'As a worker, my profile and ratings keep me getting rebooked. It is the trust that wins the next job.', n: 'Jean B.', r: 'Plumber · Kicukiro' },
];

function fmt(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
}

export default function PublicBrowse() {
  const { user, loading: authLoading } = useAuth();
  const notify = useToast();
  const [email, setEmail] = useState('');
  const workers = useAsync(() => getPublicWorkers(), []);

  if (!authLoading && user) return <Navigate to={homePathForRole(user.role)} replace />;

  const all = workers.data || [];
  const jobsDone = all.reduce((n, w) => n + (w.completedJobs || 0), 0);
  const trades = new Set(all.flatMap((w) => (w.skills || '').split(',').map((s) => s.trim()).filter(Boolean)));
  const rated = all.filter((w) => Number(w.rating) > 0);
  const avg = rated.length ? (rated.reduce((s, w) => s + Number(w.rating), 0) / rated.length) : 0;

  const subscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmail('');
    notify("Thanks — we'll keep you posted.");
  };

  return (
    <PublicShell landing>
      {/* hero */}
      <section className="phero">
        <div className="hero-glow" />
        <span className="hero-eyebrow"><span className="dot" /> Available across Kigali</span>
        <h1 className="hero-h1">Find trusted skilled workers, <span className="hero-accent">on demand.</span></h1>
        <p className="hero-sub">Verified plumbers, cleaners, electricians and more — browse, compare and book in a tap. No account needed to look around.</p>
        <div className="hero-ctas">
          <Link to="/workers" className="btn-dark btn-xl">Browse workers <span aria-hidden="true">→</span></Link>
          <Link to="/register" state={{ role: 'worker' }} className="btn-outline btn-xl">Join as a worker</Link>
        </div>
        {all.length > 0 && (
          <div className="hero-proof">
            <div className="avatar-cluster">
              {all.slice(0, 5).map((w) => (
                <Avatar key={w.worker_id} name={w.name} photo={w.photo} className="avatar" style={{ width: 38, height: 38, borderRadius: 999, fontSize: '0.8rem' }} />
              ))}
            </div>
            <span className="meta">{all.length}+ verified workers · {avg.toFixed(1)}★ average</span>
          </div>
        )}

        {/* hero image showcase with floating accent badges */}
        <div className="hero-show">
          <div className="hero-show-img">
            <img src={HERO_IMG} alt="A verified skilled worker on the job in Kigali" loading="eager" onError={hideBroken} />
          </div>
          <div className="hero-badge hero-badge-verified">
            <span className="b-ic acc-green" style={{ background: 'linear-gradient(135deg, var(--a), var(--a2))' }}>{Icons.checkCircle}</span>
            <span>
              <span className="b-t">ID verified</span>
              <span className="b-s">Admin-reviewed</span>
            </span>
          </div>
          <div className="hero-badge hero-badge-rating">
            <span className="b-ic acc-yellow" style={{ background: 'linear-gradient(135deg, var(--a), var(--a2))' }}>{Icons.check}</span>
            <span>
              <span className="b-t">{avg > 0 ? `${avg.toFixed(1)} ★ rating` : 'Rated by clients'}</span>
              <span className="b-s">{jobsDone}+ jobs completed</span>
            </span>
          </div>
        </div>
      </section>

      {/* stats band */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="stats-band">
          <div className="stat-big"><span className="n">{fmt(all.length)}<em>+</em></span><span className="l">Verified workers</span></div>
          <div className="stat-big"><span className="n">{trades.size}<em>+</em></span><span className="l">Trades covered</span></div>
          <div className="stat-big"><span className="n">{fmt(jobsDone)}<em>+</em></span><span className="l">Jobs completed</span></div>
          <div className="stat-big"><span className="n">{avg.toFixed(1)}<em>★</em></span><span className="l">Average rating</span></div>
        </div>
      </section>

      {/* popular trades */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-center">
          <div className="section-eyebrow">Popular trades</div>
          <div className="section-head">Whatever needs doing, someone can do it</div>
          <p className="section-sub">Pick a trade to jump straight into matching workers.</p>
        </div>
        <div className="trades-grid">
          {TRADES.map((tr) => (
            <Link to={`/workers?skill=${encodeURIComponent(tr.name)}`} className={`trade-card ${tr.acc}`} key={tr.name}>
              <span className="trade-media">
                <img src={tr.img} alt={tr.name} loading="lazy" onError={hideBroken} />
                <span className="trade-ic">{tr.ic}</span>
              </span>
              <span className="trade-body">
                <span className="trade-t">{tr.name}</span>
                <span className="trade-d">{tr.d}</span>
                <span className="trade-go">Browse {tr.name} <span aria-hidden="true">→</span></span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="section" id="how" style={{ paddingTop: 0 }}>
        <div className="section-center">
          <div className="section-eyebrow">How it works</div>
          <div className="section-head">From search to done, in three steps</div>
          <p className="section-sub">Browsing is open to everyone — you only sign up when you book.</p>
        </div>
        <div className="how">
          {STEPS.map((s, i) => (
            <div className={`step-card ${s.acc}`} key={s.t}>
              <div className="step-num">{i + 1}</div>
              <div className="card-title">{s.t}</div>
              <div className="meta">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* why */}
      <section className="section" id="why" style={{ paddingTop: 0 }}>
        <div className="section-center">
          <div className="section-eyebrow">The trust loop</div>
          <div className="section-head">Accountable from start to finish</div>
          <p className="section-sub">Identity, time, completion and payment — every step verified.</p>
        </div>
        <div className="bento">
          {FEATURES.map((f) => (
            <div className={`bento-card ${f.acc}${f.lg ? ' bento-lg' : ''}`} key={f.t}>
              <div className="feature-ic">{f.ic}</div>
              <div className="card-title">{f.t}</div>
              <div className="meta">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* testimonials */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-center">
          <div className="section-eyebrow">What they say</div>
          <div className="section-head">Trusted by people across Kigali</div>
        </div>
        <div className="tgrid">
          {QUOTES.map((c) => (
            <div className="tcard" key={c.n}>
              <span className="tquote-ic">{Icons.quote}</span>
              <p className="tquote">“{c.q}”</p>
              <div className="twho">
                <Avatar name={c.n} className="avatar" style={{ width: 40, height: 40, borderRadius: 999, fontSize: '0.85rem' }} />
                <span>
                  <span className="tname" style={{ display: 'block' }}>{c.n}</span>
                  <span className="trole" style={{ display: 'block' }}>{c.r}</span>
                </span>
                <span className="tstars" style={{ marginLeft: 'auto' }}>★★★★★</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="cta-band">
          <h2 className="cta-h">Ready to get it fixed?</h2>
          <p className="cta-sub">Browse verified workers and book in minutes — no account needed to start looking.</p>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/workers" className="btn-white">Browse workers</Link>
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
            <form className="footer-news" onSubmit={subscribe}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" aria-label="Email for updates" />
              <button type="submit">Notify me</button>
            </form>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <Link to="/workers">Browse workers</Link>
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
