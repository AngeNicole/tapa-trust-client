import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getHealth } from '../api/client.js';
import { useAuth, homePathForRole } from '../context/AuthContext.jsx';

export default function Landing() {
  const { user, loading } = useAuth();

  // status: 'checking' | 'connected' | 'error'
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState('');

  useEffect(() => {
    getHealth()
      .then((data) => {
        setStatus(data?.status === 'ok' ? 'connected' : 'error');
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message);
      });
  }, []);

  // Signed-in users go straight to their own area.
  if (!loading && user) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return (
    <div className="page">
      <h1>TaPa Trust</h1>
      <p className="subtitle">
        Trust-centered worker profiles and rebooking for informal skilled services in Kigali.
      </p>

      <div className={`health health--${status}`}>
        {status === 'checking' && 'Checking backend...'}
        {status === 'connected' && 'Backend connected'}
        {status === 'error' && `Backend not reachable - ${error}`}
      </div>

      <nav className="portals">
        <Link className="portal-link" to="/login">Log in</Link>
        <Link className="portal-link" to="/register">Create an account</Link>
      </nav>
    </div>
  );
}
