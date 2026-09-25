import { Link } from 'react-router-dom';

export default function SessionsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <Link
            to="/sessions/new"
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            + New Session
          </Link>
        </div>
        <p className="text-gray-400 text-sm">Session list will be populated in a future phase.</p>
      </div>
    </div>
  );
}
