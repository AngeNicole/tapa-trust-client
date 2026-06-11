import { useAuth } from '../../context/AuthContext.jsx';

export default function RequesterDashboard() {
  const { user } = useAuth();
  return (
    <div className="page">
      <h1>Requester dashboard</h1>
      <p>Welcome, {user.name}.</p>
      <p className="note">
        From here you will browse and evaluate workers, post tasks, confirm work, review, and
        rebook. Those features arrive in the next steps.
      </p>
    </div>
  );
}
