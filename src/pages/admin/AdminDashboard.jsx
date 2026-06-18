import { useAuth } from '../../context/AuthContext.jsx';
import { useDemoStore, resetDemo } from '../../demo/store.js';

export default function AdminDashboard() {
  const { user } = useAuth();
  const store = useDemoStore();

  return (
    <div className="wide">
      <h1>Admin</h1>
      <p className="subtitle">Welcome, {user.name}. Oversight only — admins never post, accept, or pay.</p>

      <h2 className="section-title">Skill categories</h2>
      <div className="card">
        <div className="row">
          {store.categories.map((c) => (
            <span className="badge badge--neutral" key={c.category_id}>{c.name}</span>
          ))}
        </div>
      </div>

      <h2 className="section-title">Activity overview</h2>
      <div className="grid2">
        <div className="card"><div className="card-title">{store.workers.length}</div><div className="meta">Workers listed</div></div>
        <div className="card"><div className="card-title">{store.tasks.length}</div><div className="meta">Tasks posted</div></div>
        <div className="card"><div className="card-title">{store.bookings.length}</div><div className="meta">Bookings</div></div>
        <div className="card">
          <div className="card-title">
            {store.bookings.filter((b) => b.status === 'completed').length}
          </div>
          <div className="meta">Completed jobs</div>
        </div>
      </div>

      <h2 className="section-title">Demo controls</h2>
      <div className="card">
        <div className="card-head">
          <div className="meta">Reset all demo tasks, bookings, reviews and saved workers back to the seed.</div>
          <button className="btn-secondary" onClick={resetDemo}>Reset demo data</button>
        </div>
      </div>
    </div>
  );
}
