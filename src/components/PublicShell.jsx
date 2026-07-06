import { Link } from 'react-router-dom';
import { Icons } from './shared/icons.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

// Public marketing chrome: sticky navbar (logo, section links on the landing,
// Log in + Join CTAs). Distinct from the dashboard sidebar shell.
export function PublicShell({ children, landing }) {
  return (
    <div className="public-page">
      <header className="public-top">
        <Link to="/" className="brand">
          <span className="shell-logo">{Icons.spark}</span>
          <span className="shell-brand-name">TaPa Trust</span>
        </Link>

        {landing && (
          <nav className="public-nav">
            <Link to="/workers">Workers</Link>
            <a href="/#how">How it works</a>
            <a href="/#why">Why us</a>
          </nav>
        )}

        <div className="public-actions">
          <ThemeToggle />
          <Link to="/login" className="public-link">Log in</Link>
          <Link to="/register" state={{ role: 'worker' }} className="btn-dark">Join as a worker</Link>
        </div>
      </header>
      <main className="public-main">{children}</main>
    </div>
  );
}
