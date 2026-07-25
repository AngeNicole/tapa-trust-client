import { Link } from 'react-router-dom';
import { Icons } from './shared/icons.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { useT } from '../i18n/index.jsx';

// Public marketing chrome: sticky navbar (logo, section links on the landing,
// language + Log in + Join CTAs). Distinct from the dashboard sidebar shell.
export function PublicShell({ children, landing }) {
  const t = useT();
  return (
    <div className="public-page">
      <header className="public-top">
        <Link to="/" className="brand">
          <span className="shell-logo">{Icons.spark}</span>
          <span className="shell-brand-name">TaPa Trust</span>
        </Link>

        {landing && (
          <nav className="public-nav">
            <Link to="/workers">{t('nav.workers')}</Link>
            <a href="/#how">{t('nav.how')}</a>
            <a href="/#why">{t('nav.why')}</a>
          </nav>
        )}

        <div className="public-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link to="/login" className="public-link">{t('nav.login')}</Link>
          <Link to="/register" state={{ role: 'worker' }} className="btn-dark">{t('nav.joinWorker')}</Link>
        </div>
      </header>
      <main className="public-main">{children}</main>
    </div>
  );
}
