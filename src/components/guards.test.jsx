import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Control what useAuth returns per test. vi.hoisted lets the mock factory (which
// is hoisted above imports) read this mutable holder safely.
const h = vi.hoisted(() => ({ auth: { user: null, loading: false } }));
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => h.auth,
  homePathForRole: (role) => (role === 'worker' ? '/worker' : role === 'admin' ? '/admin' : '/requester'),
}));

import ProtectedRoute from './ProtectedRoute.jsx';
import RoleGate from './RoleGate.jsx';

function renderGuarded(ui) {
  return render(
    <MemoryRouter initialEntries={['/guarded']}>
      <Routes>
        <Route path="/guarded" element={ui} />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/requester" element={<div>REQUESTER HOME</div>} />
        <Route path="/worker" element={<div>WORKER HOME</div>} />
      </Routes>
    </MemoryRouter>
  );
}

const SECRET = <div>SECRET CONTENT</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => { h.auth = { user: null, loading: false }; });

  it('shows a loading state while the session is being restored', () => {
    h.auth = { user: null, loading: true };
    renderGuarded(<ProtectedRoute>{SECRET}</ProtectedRoute>);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('SECRET CONTENT')).not.toBeInTheDocument();
  });

  it('redirects an unauthenticated user to /login', () => {
    renderGuarded(<ProtectedRoute>{SECRET}</ProtectedRoute>);
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('renders children for an authenticated user', () => {
    h.auth = { user: { role: 'requester' }, loading: false };
    renderGuarded(<ProtectedRoute>{SECRET}</ProtectedRoute>);
    expect(screen.getByText('SECRET CONTENT')).toBeInTheDocument();
  });
});

describe('RoleGate', () => {
  it('redirects a wrong-role user to their own home area', () => {
    h.auth = { user: { role: 'worker' }, loading: false };
    renderGuarded(<RoleGate roles={['requester']}>{SECRET}</RoleGate>);
    expect(screen.getByText('WORKER HOME')).toBeInTheDocument();
    expect(screen.queryByText('SECRET CONTENT')).not.toBeInTheDocument();
  });

  it('renders children when the role is allowed', () => {
    h.auth = { user: { role: 'admin' }, loading: false };
    renderGuarded(<RoleGate roles={['admin']}>{SECRET}</RoleGate>);
    expect(screen.getByText('SECRET CONTENT')).toBeInTheDocument();
  });
});
