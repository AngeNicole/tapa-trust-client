import { useAuth } from '../../context/AuthContext.jsx';

export default function WorkerDashboard() {
  const { user } = useAuth();
  return (
    <div className="page">
      <h1>Worker dashboard</h1>
      <p>Welcome, {user.name}.</p>
      <p className="note">
        From here you will build your profile and skills, accept tasks, record check-in and
        check-out, and view your earnings. Those features arrive in the next steps.
      </p>
    </div>
  );
}
