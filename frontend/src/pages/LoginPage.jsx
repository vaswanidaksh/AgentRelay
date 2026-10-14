import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { joinTeam } from '../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('utkarsh@agentrelay.dev');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGitHub = async (targetIdentity) => {
    setLoading(true);
    setError('');
    try {
      // Default to @utkarsh (Polaris Engineering admin with seeded records)
      const identity = typeof targetIdentity === 'string' ? targetIdentity : 'utkarsh@agentrelay.dev';
      await login(identity, 'demo_oauth_code');

      if (inviteCode && inviteCode.trim()) {
        try {
          await joinTeam(inviteCode.trim());
        } catch {
          // ignore invite error
        }
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err?.response?.data?.error?.message || err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, 'demo_code');

      if (inviteCode && inviteCode.trim()) {
        try {
          await joinTeam(inviteCode.trim());
        } catch {
          // ignore
        }
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err?.response?.data?.error?.message || err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-5 font-sans">
      {/* Background */}
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-60" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-xl group-hover:border-white/20 transition-colors">
              🔗
            </div>
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-white tracking-tight">Sign in to AgentRelay</h1>
          <p className="mt-1 text-xs text-white/40 font-light">Local Context Protocol Team Server</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111111] p-7 space-y-4 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-rose-950/40 border border-rose-500/20 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* GitHub Continue */}
          <button
            onClick={() => handleGitHub('utkarsh@agentrelay.dev')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            {loading ? 'Connecting…' : 'Continue with GitHub'}
          </button>

          {/* Quick Demo Switcher Pills */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-[10px] text-white/30 uppercase font-mono">1-Click:</span>
            <button
              type="button"
              onClick={() => handleGitHub('utkarsh@agentrelay.dev')}
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] text-emerald-400"
            >
              @utkarsh (Admin)
            </button>
            <button
              type="button"
              onClick={() => handleGitHub('daksh@agentrelay.dev')}
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] text-cyan-400"
            >
              @daksh (Member)
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-[11px] text-white/25 font-medium">or custom email / handle</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          {/* Email + invite form */}
          <form onSubmit={handleForm} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
                Work Email or @handle
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-white/30 text-sm text-white/80 placeholder-white/20 outline-hidden transition-all font-sans"
                placeholder="you@company.com or @handle"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
                Team Invite Token (Optional)
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-white/30 text-sm text-white/70 font-mono placeholder-white/20 outline-hidden transition-all"
                placeholder="polaris_secret_invite_2026"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.12] text-sm font-semibold text-white/80 hover:bg-white/[0.15] hover:text-white transition-all disabled:opacity-50 mt-1 cursor-pointer"
            >
              {loading ? 'Signing in…' : 'Sign in to Workspace'}
            </button>
          </form>

          <p className="text-center text-[11px] text-white/20 pt-1">
            Connected to LCP Backend (<span className="text-emerald-400 font-mono">http://localhost:4000</span>)
          </p>
        </div>
      </div>
    </div>
  );
}
