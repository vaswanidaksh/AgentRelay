import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function WorkspacePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="grid gap-4">
          <Link
            to="/sessions"
            className="block p-6 rounded-xl bg-gray-900 border border-gray-800 hover:border-indigo-500/50 transition-colors"
          >
            <h2 className="font-semibold text-lg">Sessions</h2>
            <p className="text-sm text-gray-400 mt-1">View and manage collaboration sessions</p>
          </Link>
          <Link
            to="/sessions/new"
            className="block p-6 rounded-xl bg-gray-900 border border-gray-800 hover:border-emerald-500/50 transition-colors"
          >
            <h2 className="font-semibold text-lg">New Session</h2>
            <p className="text-sm text-gray-400 mt-1">Create a new agent collaboration session</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
