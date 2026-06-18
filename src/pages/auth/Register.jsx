import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homePathForRole } from '../../context/AuthContext.jsx';

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

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'requester',
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
      navigate(homePathForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Create your account</h1>

      <form className="form" onSubmit={onSubmit}>
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
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
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
