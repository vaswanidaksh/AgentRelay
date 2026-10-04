import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TiltCard from '../components/TiltCard';

const SESSIONS = [
  {
    id: 'sess-101',
    title: 'fix-auth-bug',
    summary: 'Fixed JWT validation in auth middleware and updated unit tests covering expired tokens',
    agent: 'Claude Code',
    user: 'alice',
    userName: 'Alice Vance',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    duration: '14 min',
    timestamp: '2 min ago',
    filesCount: 3,
  },
  {
    id: 'sess-102',
    title: 'add-user-profile-api',
    summary: 'Implemented profile avatar upload and user settings state management',
    agent: 'Cursor',
    user: 'bob',
    userName: 'Bob Smith',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    duration: '22 min',
    timestamp: '15 min ago',
    filesCount: 5,
  },
  {
    id: 'sess-103',
    title: 'deploy-ci-pipeline',
    summary: 'Set up GitHub Actions workflow for automated testing & Docker container build',
    agent: 'Windsurf',
    user: 'you',
    userName: 'You',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    duration: '8 min',
    timestamp: '1 hour ago',
    filesCount: 2,
  },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [person, setPerson] = useState('all');
  const [agent, setAgent] = useState('all');

  const filtered = SESSIONS.filter((s) => {
    const q = search.toLowerCase();
    const matchQ = !q || s.title.includes(q) || s.summary.includes(q) || s.userName.toLowerCase().includes(q);
    const matchP = person === 'all' || s.user === person;
    const matchA = agent === 'all' || s.agent.toLowerCase().includes(agent);
    return matchQ && matchP && matchA;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
      {/* Topbar */}
      <header className="glass-dark border-b border-white/[0.06] sticky top-0 z-30 px-5 sm:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-sm group-hover:border-white/20 transition-colors">
              🔗
            </div>
            <span className="font-semibold text-sm text-white/75 group-hover:text-white/95 transition-colors">AgentRelay</span>
          </Link>

          <div className="h-3.5 w-px bg-white/[0.08]" />

          <select className="bg-transparent border-none text-xs font-medium text-white/30 focus:outline-hidden cursor-pointer hover:text-white/55 transition-colors">
            <option className="bg-[#1A1A1A]">Acme Corp Engineering</option>
            <option className="bg-[#1A1A1A]">Personal Workspace</option>
            <option className="bg-[#1A1A1A]">+ Create Team Drive</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/30">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
            daemon active
          </div>

          <button
            onClick={logout}
            className="text-[12px] text-white/25 hover:text-white/55 transition-colors"
          >
            Sign out
          </button>

          <div className="w-7 h-7 rounded-full bg-white/[0.10] border border-white/[0.10] flex items-center justify-center text-[11px] font-semibold text-white/60">
            {user?.name?.[0] || 'D'}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-7 flex gap-5">

        {/* Sidebar */}
        <aside className="w-52 shrink-0 hidden md:flex flex-col gap-4">
          {/* People */}
          <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 mb-3">Teammates</p>
            <div className="space-y-0.5">
              {[
                { key: 'all', label: 'All', dot: 'bg-white/30' },
                { key: 'alice', label: 'Alice Vance', dot: 'bg-white/60' },
                { key: 'bob', label: 'Bob Smith', dot: 'bg-white/30' },
                { key: 'you', label: 'You', dot: 'bg-white/20' },
              ].map(({ key, label, dot }) => (
                <button
                  key={key}
                  onClick={() => setPerson(key)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all duration-150 flex items-center gap-2 ${
                    person === key
                      ? 'bg-white/[0.08] text-white/80 font-medium'
                      : 'text-white/28 hover:bg-white/[0.04] hover:text-white/55'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Agents */}
          <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 mb-3">Agents</p>
            <div className="space-y-0.5">
              {[
                { key: 'all', label: 'All agents' },
                { key: 'claude', label: 'Claude Code' },
                { key: 'cursor', label: 'Cursor' },
                { key: 'windsurf', label: 'Windsurf' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setAgent(key)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono transition-all duration-150 ${
                    agent === key
                      ? 'bg-white/[0.08] text-white/75 font-medium'
                      : 'text-white/28 hover:bg-white/[0.04] hover:text-white/55'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main feed */}
        <main className="flex-1 flex flex-col gap-4">
          {/* Header row */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-base font-semibold text-white/80 tracking-tight">Sessions</h1>
              <p className="text-xs text-white/25 mt-0.5">Live-synced via local daemon</p>
            </div>
            <input
              type="text"
              placeholder="Search sessions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 px-3.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-white/20 text-xs text-white/60 placeholder-white/18 outline-hidden transition-all font-sans"
            />
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <p className="text-3xl mb-3 opacity-30">◉</p>
              <p className="text-sm font-medium text-white/35">No sessions found</p>
              <p className="text-xs text-white/20 mt-1">Install the AgentRelay daemon to start capturing sessions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => (
                <TiltCard
                  key={s.id}
                  maxTilt={3}
                  spotlightColor="rgba(200,200,210,0.07)"
                  onClick={() => navigate(`/sessions/${s.id}`)}
                  className="rounded-xl border border-white/[0.07] bg-[#111111] hover:border-white/[0.13] hover:bg-[#161616] transition-all duration-200 cursor-pointer group"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono text-white/40 bg-white/[0.05] border border-white/[0.07]">
                          {s.agent}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-white/22">
                          <img
                            src={s.avatar}
                            alt={s.userName}
                            className="w-3.5 h-3.5 rounded-full object-cover opacity-60"
                          />
                          {s.userName}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-white/18">{s.timestamp}</span>
                    </div>

                    <p className="font-semibold text-sm text-white/72 group-hover:text-white/90 transition-colors">
                      {s.title}
                    </p>
                    <p className="text-xs text-white/28 mt-1.5 leading-relaxed">{s.summary}</p>

                    <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                      <div className="flex items-center gap-4 text-[11px] font-mono text-white/20">
                        <span>{s.filesCount} files</span>
                        <span>{s.duration}</span>
                      </div>
                      <span className="text-[11px] font-medium text-white/30 group-hover:text-white/55 transition-colors flex items-center gap-1">
                        View transcript <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
                      </span>
                    </div>
                  </div>
                </TiltCard>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
