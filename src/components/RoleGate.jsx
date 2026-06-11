import { Navigate } from 'react-router-dom';
import { useAuth, homePathForRole } from '../context/AuthContext.jsx';

// Restricts a route to specific roles. A signed-in user with the wrong role is
// redirected to their own area rather than seeing the page. Assumes it is
// rendered inside a ProtectedRoute (so a user exists).
export default function RoleGate({ roles, children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }
  return children;
}
