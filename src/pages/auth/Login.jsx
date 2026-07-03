import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, homePathForRole } from '../../context/AuthContext.jsx';
import { resumeAfterAuth, getPendingBooking } from '../../api/pendingBooking.js';
import PasswordInput from '../../components/PasswordInput.jsx';
import AuthLayout from '../../components/AuthLayout.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(form);
      const resumePath = await resumeAfterAuth(user);
      navigate(resumePath || homePathForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={getPendingBooking() != null
        ? 'Log in as a requester to finish booking the worker you selected.'
        : 'Log in to manage your bookings and jobs.'}
      altText="New here?"
      altTo="/register"
      altLabel="Create an account"
    >
      <form className="form" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </label>

        <label>
          Password
          <PasswordInput
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}
