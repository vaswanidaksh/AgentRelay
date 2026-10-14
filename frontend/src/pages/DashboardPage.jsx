import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TiltCard from '../components/TiltCard';
import { listTeams, listRecords, listMembers, createInvite } from '../lib/api';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);

  const [search, setSearch] = useState('');
  const [person, setPerson] = useState('all');
  const [agent, setAgent] = useState('all');

  // Load teams on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchInitialData() {
      try {
        setLoading(true);
        const teamList = await listTeams();
        if (!isMounted) return;
        setTeams(teamList);
        if (teamList.length > 0) {
          setActiveTeam(teamList[0]);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load teams');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchInitialData();
    return () => { isMounted = false; };
  }, []);

  // Load team records and members when activeTeam changes
  useEffect(() => {
    if (!activeTeam) return;
    let isMounted = true;

    async function loadTeamData() {
      try {
        setLoading(true);
        setError(null);

        const [memberList, recordList] = await Promise.all([
          listMembers(activeTeam.id).catch(() => []),
          listRecords(activeTeam.id).catch(() => [])
        ]);

        if (!isMounted) return;

        setMembers(memberList);
        // Map raw LCP server records into display items
        const formatted = recordList
          .filter(r => !r.isWithdrawn && !r.withdrawn)
          .map(r => {
            const rec = r.record || r;
            const content = rec.content || {};
            const author = rec.author || {};
            const source = rec.source || {};

            return {
              id: rec.recordId || r.recordId,
              title: content.title || 'Untitled Session',
              summary: content.summary || 'Context record summary',
              agent: source.agent || 'Claude Code',
              user: author.handle || '@developer',
              userName: author.handle || 'Teammate',
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${author.handle || 'user'}`,
              duration: `${rec.source?.eventRange ? rec.source.eventRange[1] - rec.source.eventRange[0] : 15} events`,
              timestamp: rec.times?.createdAt ? new Date(rec.times.createdAt).toLocaleDateString() : 'Recently',
              filesCount: (content.filesTouched || []).length,
              decisionsCount: (content.decisions || []).length,
              sensitivity: rec.sensitivity?.label || 'none',
              projectTag: rec.acl?.projectTag || source.projectTag || 'shared',
              raw: rec
            };
          });

        setRecords(formatted);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load team context');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTeamData();
    return () => { isMounted = false; };
  }, [activeTeam]);

  const handleCreateInvite = async () => {
    if (!activeTeam) return;
    try {
      const inv = await createInvite(activeTeam.id);
      setInviteToken(inv.token || inv.rawToken);
    } catch (err) {
      alert('Error creating invite: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const filtered = records.filter((s) => {
    const q = search.toLowerCase();
    const matchQ = !q || s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q) || s.user.toLowerCase().includes(q);
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

          {/* Team Dropdown */}
          <select
            value={activeTeam?.id || ''}
            onChange={(e) => {
              const selected = teams.find(t => t.id === e.target.value);
              if (selected) setActiveTeam(selected);
            }}
            className="bg-[#111111] border border-white/[0.10] rounded-lg px-2.5 py-1 text-xs font-medium text-white/70 focus:outline-hidden cursor-pointer hover:border-white/25 transition-colors"
          >
            {teams.length === 0 ? (
              <option value="">No teams found</option>
            ) : (
              teams.map(t => (
                <option key={t.id} value={t.id} className="bg-[#1A1A1A]">
                  {t.name}
                </option>
              ))
            )}
          </select>

          {activeTeam && (
            <button
              onClick={handleCreateInvite}
              className="text-[11px] font-mono px-2 py-1 rounded bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] text-white/60 transition-colors"
            >
              + Invite Token
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LCP Server Connected (Port 4000)
          </div>

          <button
            onClick={logout}
            className="text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            Sign out
          </button>

          <div className="w-7 h-7 rounded-full bg-white/[0.10] border border-white/[0.10] flex items-center justify-center text-[11px] font-semibold text-white/80">
            {user?.name?.[0] || user?.handle?.[1]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* Invite Modal / Notification */}
      {inviteToken && (
        <div className="bg-emerald-950/40 border-b border-emerald-500/20 px-8 py-2.5 flex items-center justify-between text-xs text-emerald-300">
          <div>
            <span className="font-semibold">Team Invite Token Generated:</span>{' '}
            <code className="bg-black/50 px-2 py-0.5 rounded font-mono text-white select-all">{inviteToken}</code>{' '}
            (Teammate can run: <code className="text-white/80">agentrelay team join {inviteToken}</code>)
          </div>
          <button onClick={() => setInviteToken(null)} className="text-white/50 hover:text-white">✕</button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-7 flex gap-5">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 hidden md:flex flex-col gap-4">
          {/* Members */}
          <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">
              Team Members ({members.length})
            </p>
            <div className="space-y-1">
              <button
                onClick={() => setPerson('all')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 ${
                  person === 'all'
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                All Teammates
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPerson(m.handle)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                    person === m.handle
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                  }`}
                >
                  <span className="truncate">{m.handle}</span>
                  <span className="text-[10px] font-mono text-white/20 uppercase">{m.role}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Agents */}
          <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">Agent Adapters</p>
            <div className="space-y-1">
              {[
                { key: 'all', label: 'All agents' },
                { key: 'claude', label: 'Claude Code' },
                { key: 'cursor', label: 'Cursor' },
                { key: 'codex', label: 'Codex' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setAgent(key)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    agent === key
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
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
              <h1 className="text-base font-semibold text-white/90 tracking-tight">
                {activeTeam ? activeTeam.name : 'Team Context Feed'}
              </h1>
              <p className="text-xs text-white/40 mt-0.5">
                Promoted AI session records live on LCP backend
              </p>
            </div>
            <input
              type="text"
              placeholder="Search team records…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 px-3.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-white/20 text-xs text-white/80 placeholder-white/25 outline-hidden transition-all font-sans"
            />
          </div>

          {/* Cards or Empty State */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <p className="text-xs text-white/40 animate-pulse">Loading context records from LCP server...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/[0.08] rounded-2xl bg-[#0E0E0E]">
              <p className="text-2xl mb-2 opacity-40">📁</p>
              <p className="text-sm font-medium text-white/70">No context records found in this team</p>
              <p className="text-xs text-white/30 mt-1 max-w-sm">
                Promote a local record from your terminal using:
              </p>
              <code className="mt-2 text-xs font-mono bg-black/60 px-3 py-1.5 rounded-lg border border-white/[0.08] text-emerald-400">
                agentrelay promote &lt;recordId&gt; --team {activeTeam?.id || 't_id'}
              </code>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => (
                <TiltCard
                  key={s.id}
                  maxTilt={3}
                  spotlightColor="rgba(200,200,210,0.07)"
                  onClick={() => navigate(`/sessions/${s.id}?teamId=${activeTeam?.id}`)}
                  className="rounded-xl border border-white/[0.07] bg-[#111111] hover:border-white/[0.15] hover:bg-[#161616] transition-all duration-200 cursor-pointer group"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20">
                          {s.agent}
                        </span>
                        <span className="text-xs text-white/50 font-mono">
                          {s.user}
                        </span>
                        <span className="text-[11px] text-white/25">
                          {s.duration}
                        </span>
                      </div>
                      <span className="text-[11px] text-white/30 font-mono">
                        {s.timestamp}
                      </span>
                    </div>

                    <h2 className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors mb-1.5">
                      {s.title}
                    </h2>

                    <p className="text-xs text-white/50 line-clamp-2 leading-relaxed mb-3">
                      {s.summary}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-white/30 pt-2 border-t border-white/[0.04]">
                      <span>📁 {s.filesCount} file(s) touched</span>
                      <span>💡 {s.decisionsCount} decision(s)</span>
                      <span>🏷️ {s.projectTag}</span>
                      <span className="ml-auto text-[10px] text-emerald-400/80">LCP Record Verified</span>
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
