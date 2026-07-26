import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, homePathForRole } from '../../context/AuthContext.jsx';
import { resumeAfterAuth } from '../../api/pendingBooking.js';
import PasswordInput from '../../components/PasswordInput.jsx';
import AuthLayout from '../../components/AuthLayout.jsx';
import { useT } from '../../i18n/index.jsx';

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
  const t = useT();
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
  const [agreed, setAgreed] = useState(false);

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
    if (!agreed) return t('auth.agreeError');
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
      // New workers go straight into guided ID verification before the dashboard.
      const dest = resumePath || (user.role === 'worker' ? '/worker/onboarding' : homePathForRole(user.role));
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={t('auth.registerTitle')}
      subtitle={bookingFlow
        ? 'Create a requester account to finish booking the worker you selected.'
        : t('auth.registerSub')}
      altText={t('auth.haveAccount')}
      altTo="/login"
      altLabel={t('auth.logIn')}
    >
      <form className="form" onSubmit={onSubmit}>
        {!bookingFlow && (
          <label>
            {t('auth.iAmA')}
            <div className="role-picker">
              <button
                type="button"
                className={`role-option ${form.role === 'requester' ? 'role-option--active' : ''}`}
                onClick={() => update('role', 'requester')}
              >
                {t('auth.requester')}
                <span className="role-hint">{t('auth.requesterHint')}</span>
              </button>
              <button
                type="button"
                className={`role-option ${form.role === 'worker' ? 'role-option--active' : ''}`}
                onClick={() => update('role', 'worker')}
              >
                {t('auth.worker')}
                <span className="role-hint">{t('auth.workerHint')}</span>
              </button>
            </div>
          </label>
        )}

        <label>
          {t('auth.fullName')}
          <input value={form.name} onChange={(e) => update('name', e.target.value)} />
        </label>

        <label>
          {t('auth.email')}
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </label>

        <label>
          {t('auth.phoneOpt')}
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </label>

        <label>
          {t('auth.locationOpt')}
          <input
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder="e.g. Kimironko"
          />
        </label>

        <label>
          {t('auth.password')}
          <PasswordInput
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            autoComplete="new-password"
          />
          <span className="role-hint">{t('auth.passwordHint')}</span>
        </label>

        <label style={{ flexDirection: 'row', alignItems: 'flex-start', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ width: 'auto', marginTop: '0.2rem', flex: '0 0 auto' }}
          />
          <span className="role-hint" style={{ margin: 0 }}>
            {t('auth.agreePre')}
            <Link to="/terms" target="_blank" rel="noopener noreferrer">{t('auth.termsLink')}</Link>
            {t('auth.agreeAnd')}
            <Link to="/privacy" target="_blank" rel="noopener noreferrer">{t('auth.privacyLink')}</Link>
          </span>
        </label>

        {error && <div className="form-error">{error}</div>}

        <button className="btn-primary" type="submit" disabled={submitting || !agreed}>
          {submitting ? t('auth.creating') : t('auth.createAccount')}
        </button>
      </form>
    </AuthLayout>
  );
}
