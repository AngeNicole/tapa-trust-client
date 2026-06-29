import { Link } from 'react-router-dom';
import { Icons } from './shared/icons.jsx';

// Light public chrome for logged-out pages: logo, optional search,
// "Join as a worker" and "Log in". Distinct from the dashboard sidebar shell.
export function PublicShell({ children, search, onSearch, tone }) {
  return (
    <div className={`public-page${tone === 'warm' ? ' tone-warm' : ''}`}>
      <header className="public-top">
        <Link to="/" className="brand">
          <span className="shell-logo">{Icons.spark}</span>
          <span className="shell-brand-name">TaPa Trust</span>
        </Link>

        {onSearch && (
          <label className="search" style={{ flex: 1, maxWidth: 460 }}>
            {Icons.search}
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search a skill, e.g. Plumbing" aria-label="Search" />
          </label>
        )}

        <div className="public-actions">
          <Link to="/register" state={{ role: 'worker' }} className="public-link">Join as a worker</Link>
          <Link to="/login" className="btn-primary" style={{ textDecoration: 'none' }}>Log in</Link>
        </div>
      </header>
      <main className="public-main">{children}</main>
    </div>
  );
}
