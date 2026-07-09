import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { getPublicWorkers } from '../../api/client.js';
import { useAsync } from '../../api/hooks.js';
import { useAuth, homePathForRole } from '../../context/AuthContext.jsx';
import { Avatar, TierBadge, Loading, ErrorNote } from '../../components/shared/ui.jsx';
import { PublicShell } from '../../components/PublicShell.jsx';
import { Icons } from '../../components/shared/icons.jsx';

function stars(r) {
  const f = Math.round(Number(r) || 0);
  return '★'.repeat(f) + '☆'.repeat(Math.max(0, 5 - f));
}

export default function PublicWorkers() {
  const { user, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const [term, setTerm] = useState(params.get('q') || '');
  const [skill, setSkill] = useState(params.get('skill') || '');
  const [sort, setSort] = useState('rating');
  const workers = useAsync(() => getPublicWorkers(), []);

  if (!authLoading && user) return <Navigate to={homePathForRole(user.role)} replace />;

  // Only real, admin-verified workers surface publicly — no pending/unverified profiles.
  const all = (workers.data || []).filter((w) => w.verification === 'verified');
  const trades = [...new Set(all.flatMap((w) => (w.skills || '').split(',').map((s) => s.trim()).filter(Boolean)))].sort();
  const t = term.trim().toLowerCase();
  const list = all
    .filter((w) => {
      const sk = (w.skills || '').toLowerCase();
      return (!skill || sk.includes(skill.toLowerCase())) && (!t || w.name.toLowerCase().includes(t) || sk.includes(t));
    })
    .sort((a, b) => {
      if (sort === 'jobs') return (b.completedJobs || 0) - (a.completedJobs || 0);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    });

  return (
    <PublicShell landing>
      <div className="browse-head">
        <h1 className="browse-title">Browse workers</h1>
        <p className="browse-sub">{all.length} verified worker{all.length === 1 ? '' : 's'} available across Kigali.</p>
      </div>

      <div className="filters">
        <label className="search">
          {Icons.search}
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search by name or skill…" aria-label="Search" />
        </label>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="rating">Top rated</option>
          <option value="jobs">Most jobs done</option>
          <option value="name">Name (A–Z)</option>
        </select>
      </div>

      {trades.length > 0 && (
        <div className="browse-chips">
          <button type="button" className={skill === '' ? 'chip' : 'chip-opt'} onClick={() => setSkill('')}>All trades</button>
          {trades.map((tr) => (
            <button type="button" key={tr} className={skill === tr ? 'chip' : 'chip-opt'} onClick={() => setSkill(skill === tr ? '' : tr)}>{tr}</button>
          ))}
        </div>
      )}

      {workers.loading ? <Loading /> : workers.error ? <ErrorNote message={workers.error} /> : list.length === 0 ? (
        <div className="empty" style={{ marginBottom: '4rem' }}>No available workers{skill ? ` for “${skill}”` : ''}{t ? ` matching “${term}”` : ''} right now.</div>
      ) : (
        <div className="wgrid">
          {list.map((w) => {
            const sk = (w.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
            return (
              <Link key={w.worker_id} to={`/workers/${w.worker_id}`} className="wcard">
                <div className="wcard-top">
                  <Avatar name={w.name} photo={w.photo} className="avatar" style={{ width: 56, height: 56, borderRadius: 16, fontSize: '1.1rem' }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="wcard-name">{w.name} <TierBadge tier={w.tier} /></div>
                    <div className="wcard-rating"><span className="stars">{stars(w.rating)}</span> {(Number(w.rating) || 0).toFixed(1)} · {w.completedJobs || 0} jobs</div>
                  </div>
                </div>
                <div className="wcard-skills">
                  {sk.slice(0, 4).map((s) => <span className="wcard-skill" key={s}>{s}</span>)}
                  {sk.length > 4 && <span className="wcard-skill">+{sk.length - 4}</span>}
                  {sk.length === 0 && <span className="wcard-skill">Skilled worker</span>}
                </div>
                <div className="wcard-foot">View profile <span className="arrow" aria-hidden="true">→</span></div>
              </Link>
            );
          })}
        </div>
      )}
    </PublicShell>
  );
}
