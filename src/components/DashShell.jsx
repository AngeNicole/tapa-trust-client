// Reusable sidebar dashboard shell used by the worker and requester portals.
export function DashShell({ items, active, onSelect, children }) {
  return (
    <div className="dash">
      <aside className="dash-side">
        {items.map((it) => (
          <NavItem
            key={it.key}
            icon={it.icon}
            label={it.label}
            count={it.count}
            soon={it.soon}
            active={active === it.key}
            onClick={() => onSelect(it.key)}
          />
        ))}
      </aside>
      <section className="dash-main">
        <div className="dash-main-inner">{children}</div>
      </section>
    </div>
  );
}

function NavItem({ icon, label, active, soon, count, onClick }) {
  return (
    <button
      type="button"
      className={`nav-item ${active ? 'nav-item--active' : ''} ${soon ? 'nav-item--soon' : ''}`}
      onClick={soon ? undefined : onClick}
      disabled={soon}
    >
      {icon}
      <span>{label}</span>
      {soon && <span className="nav-pill">Soon</span>}
      {!soon && count > 0 && <span className="nav-count">{count}</span>}
    </button>
  );
}
