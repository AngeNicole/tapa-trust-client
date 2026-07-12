import { lazy, Suspense } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth, homePathForRole } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleGate from './components/RoleGate.jsx';
import Layout from './components/Layout.jsx';

// Code-split each page into its own chunk so the first visit (the public
// landing) downloads only what it needs, not the whole app (dashboards, admin,
// chat, verification…). Cuts initial JS → faster first paint / Speed Index.
const PublicBrowse = lazy(() => import('./pages/public/PublicBrowse.jsx'));
const PublicWorkers = lazy(() => import('./pages/public/PublicWorkers.jsx'));
const PublicWorkerProfile = lazy(() => import('./pages/public/PublicWorkerProfile.jsx'));
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const RequesterDashboard = lazy(() => import('./pages/requester/RequesterDashboard.jsx'));
const WorkerDashboard = lazy(() => import('./pages/worker/WorkerDashboard.jsx'));
const WorkerOnboarding = lazy(() => import('./pages/worker/WorkerOnboarding.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));

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
    <Suspense fallback={<div className="page">Loading…</div>}>
    <Routes>
      <Route path="/" element={<PublicBrowse />} />
      <Route path="/workers" element={<PublicWorkers />} />
      <Route path="/workers/:id" element={<PublicWorkerProfile />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      <Route path="/requester" element={area(['requester'], RequesterDashboard)} />
      <Route path="/worker" element={area(['worker'], WorkerDashboard)} />
      <Route path="/worker/onboarding" element={<ProtectedRoute><RoleGate roles={['worker']}><WorkerOnboarding /></RoleGate></ProtectedRoute>} />
      <Route path="/admin" element={area(['admin'], AdminDashboard)} />

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
