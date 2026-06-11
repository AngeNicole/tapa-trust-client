import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Blocks unauthenticated users, redirecting them to the login page.
// Waits for session restoration before deciding.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
