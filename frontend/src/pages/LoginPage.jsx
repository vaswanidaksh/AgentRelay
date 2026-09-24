import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login('daksh@agentrelay.dev', 'password');
      navigate('/workspace');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          AgentRelay
        </h1>
        <p className="text-gray-400 mb-8 text-sm">
          Sign in to your workspace
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm
                       bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                       text-white transition-colors duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed
                       cursor-pointer shadow-lg shadow-indigo-500/25"
          >
            {loading ? 'Signing in…' : 'Sign in with Mock Account'}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-500 text-center">
          Phase 0 — mock authentication only
        </p>
      </div>
    </div>
  );
}
