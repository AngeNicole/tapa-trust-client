import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminDashboard() {
  const { user } = useAuth();
  return (
    <div className="page">
      <h1>Admin</h1>
      <p>Welcome, {user.name}.</p>
      <p className="note">
        Oversight only. Listing users and managing skill categories arrive in a later step. Admin
        never posts, accepts, or pays for tasks.
      </p>
    </div>
  );
}
