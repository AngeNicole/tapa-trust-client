import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Icons } from './shared/icons.jsx';
import { NotificationsBell } from './NotificationsBell.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'U';
}

// Unified modern shell: brand + grouped sidebar on the left, and a top bar
// (search + icons + user) over the content. The content spans the full width —
// per-role analytics live in a dedicated Dashboard menu, not a right rail.
export function DashShell({ items, active, onSelect, children, headerExtra }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Track which menus have been opened so their count badge clears after a view.
  const [opened, setOpened] = useState(() => new Set([active]));
  useEffect(() => {
    setOpened((s) => (s.has(active) ? s : new Set(s).add(active)));
  }, [active]);

  function select(key) {
    setOpened((s) => new Set(s).add(key));
    onSelect(key);
  }

  function onLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <aside className="shell-side">
        <div className="shell-brand">
          <span className="shell-logo">{Icons.spark}</span>
          <span className="shell-brand-name">TaPa Trust</span>
        </div>

        <div className="side-label">Menu</div>
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            className={`nav-item ${active === it.key ? 'nav-item--active' : ''} ${it.soon ? 'nav-item--soon' : ''}`}
            onClick={it.soon ? undefined : () => select(it.key)}
            disabled={it.soon}
          >
            {it.icon}
            <span>{it.label}</span>
            {it.soon && <span className="nav-pill">Soon</span>}
            {!it.soon && it.count > 0 && !opened.has(it.key) && <span className="nav-count">{it.count}</span>}
          </button>
        ))}

        <div className="side-bottom">
          <div className="side-label">Account</div>
          <button type="button" className="nav-logout" onClick={onLogout}>
            {Icons.logout}
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="shell-body">
        <header className="shell-top">
          <label className="search">
            {Icons.search}
            <input type="text" placeholder="Search…" aria-label="Search" />
          </label>
          {headerExtra}
          <ThemeToggle />
          <NotificationsBell />
          <span className="top-divider" />
          <div className="top-user">
            <span className="avatar-sm">{initials(user?.name)}</span>
            <span className="meta" style={{ color: 'var(--color-text-strong-950)', fontWeight: 600 }}>{user?.name}</span>
          </div>
        </header>

        <div className="shell-content">
          <div className="shell-main">{children}</div>
        </div>
      </div>
    </>
  );
}
