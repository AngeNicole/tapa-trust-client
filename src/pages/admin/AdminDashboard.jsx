import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAdminUsers, getCategories, createCategory } from '../../api/client.js';
import { useAsync } from '../../api/hooks.js';
import { Loading, ErrorNote } from '../../demo/ui.jsx';

export default function AdminDashboard() {
  const { user } = useAuth();
  const users = useAsync(() => getAdminUsers(), []);
  const categories = useAsync(() => getCategories(), []);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');

  async function addCategory(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) return;
    try {
      await createCategory({ name: name.trim(), description: description.trim() });
      setName(''); setDescription('');
      categories.reload();
    } catch (e2) { setErr(e2.message); }
  }

  const roleBadge = (r) => ({ admin: 'badge--primary', worker: 'badge--info', requester: 'badge--neutral' }[r] || 'badge--neutral');

  return (
    <div className="wide">
      <h1>Admin</h1>
      <p className="subtitle">Welcome, {user.name}. Oversight only — admins never post, accept, or pay.</p>

      <h2 className="section-title">Skill categories</h2>
      <div className="card">
        {categories.loading ? <span className="meta">Loading…</span> : (
          <div className="row">
            {(categories.data || []).map((c) => <span className="badge badge--neutral" key={c.category_id}>{c.name}</span>)}
          </div>
        )}
        <ErrorNote message={categories.error} />
        <div className="divider" />
        <form className="row" onSubmit={addCategory} style={{ width: '100%' }}>
          <input className="input" style={{ flex: 1, minWidth: '160px' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
          <input className="input" style={{ flex: 1, minWidth: '160px' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
          <button className="btn-primary" type="submit">Add category</button>
        </form>
        <ErrorNote message={err} />
      </div>

      <h2 className="section-title">Users</h2>
      {users.loading ? <Loading /> : users.error ? <ErrorNote message={users.error} /> : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Location</th><th>Joined</th></tr></thead>
              <tbody>
                {(users.data || []).map((u) => (
                  <tr key={u.user_id}>
                    <td>{u.user_id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${roleBadge(u.role)}`}>{u.role}</span></td>
                    <td>{u.location || '—'}</td>
                    <td>{String(u.created_at).slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
