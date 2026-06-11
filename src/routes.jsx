import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth, homePathForRole } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleGate from './components/RoleGate.jsx';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import RequesterDashboard from './pages/requester/RequesterDashboard.jsx';
import WorkerDashboard from './pages/worker/WorkerDashboard.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

function NotFound() {
  return (
    <div className="page">
      <h1>Page not found</h1>
      <Link to="/">Back to home</Link>
    </div>
  );
}

// Keeps signed-in users out of the auth pages by sending them to their area.
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page">Loading...</div>;
  if (user) return <Navigate to={homePathForRole(user.role)} replace />;
  return children;
}

// One protected, role-gated, laid-out area.
function area(roles, Page) {
  return (
    <ProtectedRoute>
      <RoleGate roles={roles}>
        <Layout>
          <Page />
        </Layout>
      </RoleGate>
    </ProtectedRoute>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      <Route path="/requester" element={area(['requester'], RequesterDashboard)} />
      <Route path="/worker" element={area(['worker'], WorkerDashboard)} />
      <Route path="/admin" element={area(['admin'], AdminDashboard)} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
