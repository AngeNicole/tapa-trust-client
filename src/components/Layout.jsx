import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Shared shell for signed-in pages: app name, current user + role, log out.
export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const roleLabel =
    user?.role === 'worker' ? 'Worker' : user?.role === 'admin' ? 'Admin' : 'Requester';

  return (
    <div>
      <header className="topbar">
        <Link to="/" className="brand">TaPa Trust</Link>
        {user && (
          <div className="topbar-right">
            <span className="who">
              {user.name} <span className="role-tag">{roleLabel}</span>
            </span>
            <button className="btn-secondary" type="button" onClick={onLogout}>
              Log out
            </button>
          </div>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}
