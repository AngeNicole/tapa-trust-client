import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth, homePathForRole } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleGate from './components/RoleGate.jsx';
import Layout from './components/Layout.jsx';

// Each page is its own chunk so the first paint downloads only what it needs
// (fast initial load / Speed Index). But we then PREFETCH every chunk in the
// background once the app is up (see the effect below), so navigation is
// instant — the whole app ends up loaded, just not blocking the first paint.
const loaders = {
  publicBrowse: () => import('./pages/public/PublicBrowse.jsx'),
  publicWorkers: () => import('./pages/public/PublicWorkers.jsx'),
  publicWorkerProfile: () => import('./pages/public/PublicWorkerProfile.jsx'),
  login: () => import('./pages/auth/Login.jsx'),
  register: () => import('./pages/auth/Register.jsx'),
  requester: () => import('./pages/requester/RequesterDashboard.jsx'),
  worker: () => import('./pages/worker/WorkerDashboard.jsx'),
  onboarding: () => import('./pages/worker/WorkerOnboarding.jsx'),
  admin: () => import('./pages/admin/AdminDashboard.jsx'),
};
const PublicBrowse = lazy(loaders.publicBrowse);
const PublicWorkers = lazy(loaders.publicWorkers);
const PublicWorkerProfile = lazy(loaders.publicWorkerProfile);
const Login = lazy(loaders.login);
const Register = lazy(loaders.register);
const RequesterDashboard = lazy(loaders.requester);
const WorkerDashboard = lazy(loaders.worker);
const WorkerOnboarding = lazy(loaders.onboarding);
const AdminDashboard = lazy(loaders.admin);

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
  // Warm every route chunk in the background once the first paint is done, so
  // navigating between areas is instant (no per-page loading flash).
  useEffect(() => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
    const id = idle(() => { Object.values(loaders).forEach((fn) => fn()); });
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, []);

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
