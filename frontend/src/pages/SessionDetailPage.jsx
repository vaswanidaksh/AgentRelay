import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [copiedCodeIndex, setCopiedCodeIndex] = useState(null);
  const [activeFile, setActiveFile] = useState(null);

  // Mock session data
  const session = {
    id: id || 'sess-101',
    title: 'fix-auth-bug',
    agent: 'Claude Code',
    agentBadge: '🟣 Claude Code',
    agentBadgeBg: 'bg-purple-100 text-purple-700',
    user: 'Alice Vance',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    date: 'Oct 2, 2026',
    duration: '14 min',
    projectPath: '/Users/alice/projects/agentrelay-app',
    messageCount: 5,
    files: [
      { name: 'auth/middleware.ts', changes: '+18, -4', content: 'export function validateJWT(token: string) {\n  if (!token) throw new AuthError("Missing token");\n  return jwt.verify(token, process.env.JWT_SECRET!);\n}' },
      { name: 'auth/jwt.ts', changes: '+6, -1', content: 'export const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";' },
      { name: 'tests/auth.test.ts', changes: '+42, -0', content: 'describe("JWT Middleware", () => {\n  it("should validate valid tokens", () => { ... });\n});' }
    ],
    transcript: [
      {
        sender: 'human',
        text: 'Fix the JWT validation bug in the auth middleware where expired tokens throw an unhandled 500 error instead of a 401 Unauthorized response.'
      },
      {
        sender: 'ai',
        text: "I'll inspect `auth/middleware.ts` and wrap the JWT verification inside a try/catch block to catch `TokenExpiredError` specifically and throw a structured `401 Unauthorized` HTTP exception.",
        code: `// auth/middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}`
      },
      {
        sender: 'human',
        text: 'Looks great! Can you also add unit tests to verify both valid and expired token cases?'
      },
      {
        sender: 'ai',
        text: "Sure! I've created `tests/auth.test.ts` with 3 test cases using Jest & Supertest testing valid tokens, expired signatures, and missing auth headers.",
        code: `// tests/auth.test.ts
import request from 'supertest';
import app from '../src/app';

describe('Auth Middleware', () => {
  it('returns 401 on expired JWT', async () => {
    const expiredToken = generateExpiredToken();
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', \`Bearer \${expiredToken}\`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });
});`
      }
    ]
  };

  const handleCopyCode = (codeText, index) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-cyan-100 selection:text-cyan-900">
      {/* Session Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 sm:px-6 h-16 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <span>←</span>
            <span>Back to Sessions</span>
          </button>

          <div className="h-4 w-px bg-gray-200" />

          <h1 className="text-base font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span>{session.title}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${session.agentBadgeBg}`}>
              {session.agentBadge}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <img src={session.userAvatar} alt={session.user} className="w-5 h-5 rounded-full object-cover" />
            <span className="font-medium text-gray-800">{session.user}</span>
          </div>
          <span>•</span>
          <span>{session.date}</span>
          <span>•</span>
          <span className="font-mono">{session.duration}</span>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-12 gap-6">
        {/* Transcript Area (70%) */}
        <main className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Execution Transcript
              </h2>
              <span className="text-xs text-gray-400 font-mono">
                {session.transcript.length} messages logged
              </span>
            </div>

            {session.transcript.map((msg, idx) => (
              <div key={idx} className="space-y-3">
                {msg.sender === 'human' ? (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60 flex items-start gap-3">
                    <span className="text-lg">👤</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-700 mb-1">{session.user}</div>
                      <p className="text-sm text-gray-900 leading-relaxed font-sans">{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-5 rounded-xl border border-purple-100 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🤖</span>
                      <span className="text-xs font-semibold text-purple-900">{session.agent}</span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed font-sans">{msg.text}</p>

                    {msg.code && (
                      <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-gray-950 font-mono text-xs text-gray-100">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 text-gray-400">
                          <span>Code snippet</span>
                          <button
                            onClick={() => handleCopyCode(msg.code, idx)}
                            className="px-2.5 py-1 rounded text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                          >
                            {copiedCodeIndex === idx ? 'Copied ✓' : 'Copy code'}
                          </button>
                        </div>
                        <pre className="p-4 overflow-x-auto text-cyan-300 leading-relaxed">
                          <code>{msg.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>

        {/* Right Sidebar (30%) */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Changed Files */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Files Changed ({session.files.length})
            </h3>
            <div className="space-y-2">
              {session.files.map((file, i) => (
                <div
                  key={i}
                  onClick={() => setActiveFile(activeFile === file.name ? null : file.name)}
                  className={`p-3 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                    activeFile === file.name
                      ? 'border-cyan-500 bg-cyan-50/50'
                      : 'border-gray-100 bg-gray-50/50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium text-gray-900">
                    <span className="flex items-center gap-1.5">
                      <span>📄</span> {file.name}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold">{file.changes}</span>
                  </div>
                  {activeFile === file.name && (
                    <div className="mt-2 pt-2 border-t border-gray-200/60 text-gray-700 font-mono text-[11px] bg-gray-900 text-cyan-300 p-2.5 rounded-lg overflow-x-auto">
                      <pre>{file.content}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Session Metadata Panel */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3 font-sans text-xs">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Metadata
            </h3>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Agent Type</span>
              <span className="font-semibold text-gray-900">{session.agent}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Project Workspace</span>
              <span className="font-mono text-gray-700 text-[11px]">{session.projectPath}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Session Duration</span>
              <span className="font-semibold text-gray-900">{session.duration}</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-gray-500">Status</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase">
                Synced & Backed Up
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
