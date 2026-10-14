import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ERROR_MESSAGES = {
  github_denied: 'You declined GitHub authorisation. Please try again.',
  invalid_state: 'Security check failed (CSRF). Please try signing in again.',
  missing_code: 'GitHub did not return an authorisation code. Please try again.',
  github_token_failed: 'GitHub token exchange failed. Check your OAuth credentials and try again.',
  github_profile_failed: 'Could not retrieve your GitHub profile. Please try again.',
};

/**
 * AuthCallbackPage
 *
 * The backend redirects here after a successful GitHub OAuth flow:
 *   /auth/callback?token=lcp_pat_...&user=<json>
 *
 * This page stores the credentials via AuthContext then navigates to /dashboard.
 * On error it shows a friendly message and a back button.
 */
export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const userRaw = searchParams.get('user');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setErrorMsg(ERROR_MESSAGES[errorParam] || 'Authentication failed. Please try again.');
      return;
    }

    if (!token || !userRaw) {
      setErrorMsg('Missing authentication data. Please try signing in again.');
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userRaw));
      loginWithToken(token, user);
      navigate('/dashboard', { replace: true });
    } catch {
      setErrorMsg('Failed to parse authentication response. Please try signing in again.');
    }
  }, [searchParams, loginWithToken, navigate]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="text-4xl">⚠️</div>
          <p className="text-white/60 text-sm leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="px-6 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.12] text-sm font-semibold text-white/75 hover:bg-white/[0.15] transition-all"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-5">
      <div className="text-center space-y-4">
        {/* Spinner */}
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin mx-auto" />
        <p className="text-white/40 text-sm">Completing GitHub sign in…</p>
      </div>
    </div>
  );
}
