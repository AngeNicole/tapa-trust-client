import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getPublicWorkers } from '../../api/client.js';
import { useAsync } from '../../api/hooks.js';
import { useAuth, homePathForRole } from '../../context/AuthContext.jsx';
import { Avatar, Stars, VerifyBadge, Loading, ErrorNote } from '../../components/shared/ui.jsx';
import { PublicShell } from '../../components/PublicShell.jsx';

export default function PublicBrowse() {
  const { user, loading: authLoading } = useAuth();
  const [term, setTerm] = useState('');
  const [skill, setSkill] = useState('');
  const workers = useAsync(() => getPublicWorkers(), []);

  // Signed-in users have their own dashboards; the public browse is the
  // front door for logged-out visitors.
  if (!authLoading && user) return <Navigate to={homePathForRole(user.role)} replace />;

  const all = workers.data || [];
  const trades = [...new Set(all.flatMap((w) => (w.skills || '').split(',').map((s) => s.trim()).filter(Boolean)))].sort();
  const t = term.trim().toLowerCase();
  const list = all.filter((w) => {
    const sk = (w.skills || '').toLowerCase();
    const matchSkill = !skill || sk.includes(skill.toLowerCase());
    const matchTerm = !t || w.name.toLowerCase().includes(t) || sk.includes(t);
    return matchSkill && matchTerm;
  });

  return (
    <PublicShell search={term} onSearch={setTerm}>
      <div className="public-hero">
        <div className="public-hero-title">Find trusted skilled workers in Kigali</div>
        <p className="subtitle">Browse verified plumbers, cleaners, electricians and more — book in a tap. No account needed to look around.</p>
      </div>

      {trades.length > 0 && (
        <div className="row" style={{ margin: '1rem 0' }}>
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
    </PublicShell>
  );
}
