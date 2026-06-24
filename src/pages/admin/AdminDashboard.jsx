import { useState } from 'react';
import { getAdminUsers, getCategories, createCategory } from '../../api/client.js';
import { useAsync } from '../../api/hooks.js';
import { Loading, ErrorNote } from '../../demo/ui.jsx';
import { DashShell } from '../../components/DashShell.jsx';
import { Icons } from '../../demo/icons.jsx';

export default function AdminDashboard() {
  const [tab, setTab] = useState('users');
  const users = useAsync(() => getAdminUsers(), []);
  const categories = useAsync(() => getCategories(), []);

  const items = [
    { key: 'users', label: 'Users', icon: Icons.user, count: users.data?.length || 0 },
    { key: 'categories', label: 'Categories', icon: Icons.briefcase, count: categories.data?.length || 0 },
  ];

  return (
    <DashShell items={items} active={tab} onSelect={setTab}>
      {tab === 'users' && <UsersView state={users} />}
      {tab === 'categories' && <CategoriesView state={categories} />}
    </DashShell>
  );
}

function UsersView({ state }) {
  const roleBadge = (r) => ({ admin: 'badge--primary', worker: 'badge--info', requester: 'badge--neutral' }[r] || 'badge--neutral');
  return (
    <>
      <h1>Users</h1>
      <p className="subtitle">Oversight only — admins never post, accept, or pay.</p>
      {state.loading ? <Loading /> : state.error ? <ErrorNote message={state.error} /> : (
        <div className="card" style={{ marginTop: '0.75rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Location</th><th>Joined</th></tr></thead>
              <tbody>
                {(state.data || []).map((u) => (
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
    </>
  );
}

function CategoriesView({ state }) {
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
      state.reload();
    } catch (e2) { setErr(e2.message); }
  }

  return (
    <>
      <h1>Skill categories</h1>
      <p className="subtitle">The service categories requesters can post tasks under.</p>
      <div className="card" style={{ marginTop: '0.75rem' }}>
        {state.loading ? <span className="meta">Loading…</span> : (
          <div className="row">
            {(state.data || []).map((c) => <span className="badge badge--neutral" key={c.category_id}>{c.name}</span>)}
          </div>
        )}
        <div className="divider" />
        <form className="row" onSubmit={addCategory} style={{ width: '100%' }}>
          <input className="input" style={{ flex: 1, minWidth: '160px' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
          <input className="input" style={{ flex: 1, minWidth: '160px' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
          <button className="btn-primary" type="submit">Add</button>
        </form>
        <ErrorNote message={err} />
      </div>
    </>
  );
}
