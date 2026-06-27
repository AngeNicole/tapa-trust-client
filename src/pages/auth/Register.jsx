import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, homePathForRole } from '../../context/AuthContext.jsx';
import { resumeAfterAuth } from '../../api/pendingBooking.js';
import PasswordInput from '../../components/PasswordInput.jsx';

// A strong password: at least 8 characters with an uppercase letter, a
// lowercase letter, a number, and a special character.
function isStrongPassword(pw) {
  return (
    pw.length >= 8 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Coming from a "Book" click while logged out → requester-only, no picker.
  const bookingFlow = location.state?.book != null;
  const initialRole = bookingFlow ? 'requester' : location.state?.role || 'requester';

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: initialRole,
    location: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    if (!form.name.trim()) return 'Please enter your name.';
    if (!form.email.trim()) return 'Please enter your email.';
    if (!isStrongPassword(form.password)) {
      return 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';
    }
    if (!['requester', 'worker'].includes(form.role)) return 'Please choose a role.';
    return '';
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      const user = await register(form);
      const resumePath = await resumeAfterAuth(user);
      navigate(resumePath || homePathForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Create your account</h1>
      {bookingFlow && (
        <p className="subtitle">Create a requester account to finish booking the worker you selected.</p>
      )}

      <form className="form" onSubmit={onSubmit}>
        {!bookingFlow && (
          <label>
            I am a
            <div className="role-picker">
              <button
                type="button"
                className={`role-option ${form.role === 'requester' ? 'role-option--active' : ''}`}
                onClick={() => update('role', 'requester')}
              >
                Requester
                <span className="role-hint">I need to hire skilled help</span>
              </button>
              <button
                type="button"
                className={`role-option ${form.role === 'worker' ? 'role-option--active' : ''}`}
                onClick={() => update('role', 'worker')}
              >
                Worker
                <span className="role-hint">I offer skilled services</span>
              </button>
            </div>
          </label>
        )}

        <label>
          Full name
          <input value={form.name} onChange={(e) => update('name', e.target.value)} />
        </label>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </label>

        <label>
          Phone (optional)
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </label>

        <label>
          Location (optional)
          <input
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder="e.g. Kimironko"
          />
        </label>

        <label>
          Password
          <PasswordInput
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            autoComplete="new-password"
          />
          <span className="role-hint">
            At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a
            special character.
          </span>
        </label>

        {error && <div className="form-error">{error}</div>}

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="note">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
