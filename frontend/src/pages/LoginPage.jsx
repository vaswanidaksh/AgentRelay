import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('daksh@agentrelay.dev');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGitHub = async () => {
    setLoading(true);
    setError('');
    try {
      await login('github@agentrelay.dev', 'mock');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, 'mock');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-5">
      {/* Background */}
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-60" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-xl group-hover:border-white/20 transition-colors">
              🔗
            </div>
          </Link>
          <h1 className="mt-5 text-xl font-semibold text-metallic tracking-tight">Sign in to AgentRelay</h1>
          <p className="mt-1.5 text-xs text-white/28 font-light">Sync your team's AI coding sessions.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111111] p-7 space-y-4 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.10] text-xs text-white/55">
              {error}
            </div>
          )}

          {/* GitHub */}
          <button
            onClick={handleGitHub}
            disabled={loading}
            className="btn-shimmer w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Continue with GitHub
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-[11px] text-white/20 font-medium">or</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          {/* Email + invite form */}
          <form onSubmit={handleForm} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1.5">
                Work email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-white/22 text-sm text-white/75 placeholder-white/18 outline-hidden transition-all font-sans"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1.5">
                Invite code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-white/22 text-sm text-white/55 font-mono placeholder-white/18 outline-hidden transition-all"
                placeholder="AR-INVITE-XXXX"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-shimmer w-full py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.12] text-sm font-semibold text-white/75 hover:bg-white/[0.12] hover:text-white/90 transition-all disabled:opacity-50 mt-1"
            >
              {loading ? 'Signing in…' : 'Continue with invite'}
            </button>
          </form>

          <p className="text-center text-[11px] text-white/18 pt-1">
            By signing in you agree to our{' '}
            <a href="#" className="underline hover:text-white/35 transition-colors">Terms</a>
            {' & '}
            <a href="#" className="underline hover:text-white/35 transition-colors">Privacy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
