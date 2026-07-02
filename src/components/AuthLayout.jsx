import { Link } from 'react-router-dom';
import { Icons } from './shared/icons.jsx';

// Split-screen auth chrome: a branded showcase panel beside the form card.
// Purely presentational — pages keep their own form logic.
export default function AuthLayout({ title, subtitle, children, altText, altTo, altLabel }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <Link to="/" className="auth-brand"><span className="shell-logo">{Icons.spark}</span> TaPa Trust</Link>
        <div className="auth-aside-body">
          <h2 className="auth-aside-h">Trusted skilled workers, on demand.</h2>
          <p className="auth-aside-p">Join the marketplace where every worker is verified and every job is tracked from booking to done.</p>
          <ul className="auth-points">
            <li><span className="pt-ic">{Icons.checkCircle}</span> Verified, admin-reviewed workers</li>
            <li><span className="pt-ic">{Icons.checkCircle}</span> Every job tracked to completion</li>
            <li><span className="pt-ic">{Icons.checkCircle}</span> No account needed to browse</li>
          </ul>
          <div className="auth-quote">
            <p>“Booked a plumber in minutes — the whole job stayed transparent from start to finish.”</p>
            <div className="qwho">Aline U. · Requester in Kigali</div>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <Link to="/" className="auth-brand auth-brand-mobile"><span className="shell-logo">{Icons.spark}</span> TaPa Trust</Link>
          <div className="auth-top">
            <h1 className="auth-h1">{title}</h1>
            {subtitle && <p className="auth-sub">{subtitle}</p>}
          </div>
          {children}
          <p className="auth-alt">{altText} <Link to={altTo}>{altLabel}</Link></p>
        </div>
      </main>
    </div>
  );
}
