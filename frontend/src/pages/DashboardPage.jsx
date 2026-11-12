import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TiltCard from '../components/TiltCard';
import CliCommandsModal from '../components/CliCommandsModal';
import JoinWorkspaceModal from '../components/JoinWorkspaceModal';
import CreateTeamModal from '../components/CreateTeamModal';
import {
  listTeams,
  listRecords,
  listMembers,
  createInvite,
  deleteTeam,
  listInbox,
  markInboxRead,
  listAuditTrail,
  verifyAuditTrail,
} from '../lib/api';

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

  // New Modals State
  const [showCliModal, setShowCliModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [copiedRecordId, setCopiedRecordId] = useState(null);
  const [copiedPromoteCmd, setCopiedPromoteCmd] = useState(null);
  const [copiedTeamId, setCopiedTeamId] = useState(false);

  const [search, setSearch] = useState('');
  const [person, setPerson] = useState('all');
  const [agent, setAgent] = useState('all');

  // Inbox state
  const [inboxItems, setInboxItems] = useState([]);
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [inboxFilter, setInboxFilter] = useState('all');

  // Audit state
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditVerifyResult, setAuditVerifyResult] = useState(null);
  const [auditError, setAuditError] = useState(null);

  const fetchInbox = async () => {
    try {
      const items = await listInbox();
      setInboxItems(items);
    } catch (e) {
      console.warn('Failed to fetch inbox:', e.message);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markInboxRead(id);
      setInboxItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, state: 'read' } : item))
      );
    } catch (e) {
      console.error('Failed to mark read:', e.message);
    }
  };

  const handleOpenAudit = async () => {
    if (!activeTeam) return;
    setShowAuditModal(true);
    setAuditLoading(true);
    setAuditError(null);
    setAuditVerifyResult(null);
    try {
      const data = await listAuditTrail(activeTeam.id);
      setAuditEvents(data.events || []);
    } catch (e) {
      setAuditError(
        e.response?.data?.error?.message ||
          e.message ||
          'Failed to load audit trail (admin privileges required).'
      );
    } finally {
      setAuditLoading(false);
    }
  };

  const handleVerifyAuditChain = async () => {
    if (!activeTeam) return;
    try {
      setAuditLoading(true);
      const res = await verifyAuditTrail(activeTeam.id);
      setAuditVerifyResult(res);
    } catch (e) {
      setAuditError('Verification failed: ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setAuditLoading(false);
    }
  };

  const pendingInboxCount = inboxItems.filter((i) => i.state === 'pending').length;

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
          const savedTeamId = localStorage.getItem('ar_active_team_id');
          const matched = teamList.find((t) => t.id === savedTeamId);
          const chosen = matched || teamList[0];
          setActiveTeam(chosen);
          localStorage.setItem('ar_active_team_id', chosen.id);
        } else {
          setActiveTeam(null);
          localStorage.removeItem('ar_active_team_id');
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

  const handleJoinSuccess = async (joinedTeam) => {
    try {
      const updatedTeams = await listTeams();
      setTeams(updatedTeams);
      if (joinedTeam) {
        const match = updatedTeams.find((t) => t.id === joinedTeam.id);
        const target = match || joinedTeam;
        setActiveTeam(target);
        localStorage.setItem('ar_active_team_id', target.id);
      } else if (updatedTeams.length > 0) {
        setActiveTeam(updatedTeams[0]);
        localStorage.setItem('ar_active_team_id', updatedTeams[0].id);
      }
    } catch (err) {
      console.error('Failed to reload teams:', err);
    }
  };

  const handleCreateTeamSuccess = async (newTeam) => {
    try {
      const updatedTeams = await listTeams();
      setTeams(updatedTeams);
      if (newTeam) {
        const match = updatedTeams.find((t) => t.id === newTeam.id);
        const target = match || newTeam;
        setActiveTeam(target);
        localStorage.setItem('ar_active_team_id', target.id);
      }
    } catch (err) {
      console.error('Failed to reload teams:', err);
    }
  };

  const handleDeleteTeam = async (teamToDelete) => {
    const targetTeam = teamToDelete || activeTeam;
    if (!targetTeam) return;

    const confirmMsg = `Are you sure you want to permanently delete workspace "${targetTeam.name}" (${targetTeam.id})?\n\nAll records, invites, and members in this workspace will be permanently deleted.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteTeam(targetTeam.id);
      const updatedTeams = teams.filter((t) => t.id !== targetTeam.id);
      setTeams(updatedTeams);

      if (activeTeam?.id === targetTeam.id) {
        if (updatedTeams.length > 0) {
          setActiveTeam(updatedTeams[0]);
          localStorage.setItem('ar_active_team_id', updatedTeams[0].id);
        } else {
          setActiveTeam(null);
          localStorage.removeItem('ar_active_team_id');
          setRecords([]);
          setMembers([]);
        }
      }
    } catch (err) {
      alert(
        'Failed to delete workspace: ' +
          (err.response?.data?.error?.message || err.message || 'Access denied or server error')
      );
    }
  };

  const handleCopyRecordId = (e, recId) => {
    e.stopPropagation();
    navigator.clipboard.writeText(recId);
    setCopiedRecordId(recId);
    setTimeout(() => setCopiedRecordId(null), 2000);
  };

  const handleCopyPromoteCmd = (e, recId) => {
    e.stopPropagation();
    const cmd = `agentrelay promote ${recId} --team ${activeTeam?.id || '<teamId>'}`;
    navigator.clipboard.writeText(cmd);
    setCopiedPromoteCmd(recId);
    setTimeout(() => setCopiedPromoteCmd(null), 2000);
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
      <header className="glass-dark border-b border-white/[0.06] sticky top-0 z-30 px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Left: Brand + Active Workspace */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-sm group-hover:border-white/20 transition-colors">
              🔗
            </div>
            <span className="font-semibold text-sm text-white/85 group-hover:text-white transition-colors hidden sm:inline">
              AgentRelay
            </span>
          </Link>

          <div className="h-4 w-px bg-white/[0.08] shrink-0" />

          {/* Mode Switcher: Personal Vault vs Team Workspace */}
          <div className="flex items-center bg-[#111111] p-0.5 rounded-lg border border-white/[0.1] text-xs h-8 shrink-0">
            <button
              onClick={() => {
                setViewMode('vault');
                localStorage.setItem('ar_view_mode', 'vault');
                fetchMyRecords();
              }}
              className={`h-7 px-2.5 rounded-md text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'vault'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-white/50 hover:text-white'
              }`}
              title="Personal Context Vault — all records you authored"
            >
              <span>📁</span>
              <span className="hidden sm:inline">My Vault</span>
              <span className="text-[10px] font-mono opacity-60">({myRecords.length})</span>
            </button>
            <button
              onClick={() => {
                setViewMode('team');
                localStorage.setItem('ar_view_mode', 'team');
              }}
              className={`h-7 px-2.5 rounded-md text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'team'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-white/50 hover:text-white'
              }`}
              title="Team Workspaces Feed"
            >
              <span>👥</span>
              <span className="hidden sm:inline">Team Feed</span>
            </button>
          </div>

          <div className="h-4 w-px bg-white/[0.08] hidden sm:block shrink-0" />

          {/* Workspace Switcher Pill */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="relative flex items-center">
              <span className="absolute left-2.5 pointer-events-none text-xs text-white/40">🏢</span>
              <select
                value={activeTeam?.id || ''}
                onChange={(e) => {
                  const selected = teams.find((t) => t.id === e.target.value);
                  if (selected) {
                    setActiveTeam(selected);
                    localStorage.setItem('ar_active_team_id', selected.id);
                  }
                }}
                className="bg-[#141414] hover:bg-[#181818] border border-white/[0.10] hover:border-white/20 rounded-lg pl-7 pr-8 py-1.5 text-xs font-medium text-white/90 focus:outline-hidden cursor-pointer transition-all max-w-[130px] sm:max-w-[190px] truncate"
              >
                {teams.length === 0 ? (
                  <option value="">No workspaces</option>
                ) : (
                  teams.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#1A1A1A]">
                      {t.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Quick Workspace Add / Join */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => setShowJoinModal(true)}
                className="h-8 px-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono font-medium transition-colors flex items-center gap-1 cursor-pointer"
                title="Join a team workspace using an invite token"
              >
                <span>🔗</span>
                <span>Join</span>
              </button>
              <button
                onClick={() => setShowCreateTeamModal(true)}
                className="h-8 px-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] text-white/70 hover:text-white text-xs font-mono font-medium transition-colors flex items-center gap-1 cursor-pointer"
                title="Create a new isolated team workspace"
              >
                <span>+</span>
                <span>New</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Actions, System Status & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* CLI Commands Reference */}
          <button
            onClick={() => setShowCliModal(true)}
            className="h-8 px-2.5 sm:px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-300 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Open CLI Commands Reference & Cheat Sheet"
          >
            <span>⚡</span>
            <span className="hidden md:inline">Commands</span>
          </button>

          {/* Full Documentation Link */}
          <Link
            to="/docs"
            target="_blank"
            rel="noreferrer"
            className="h-8 px-2.5 sm:px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/70 hover:text-white text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
            title="Open Full Documentation"
          >
            <span>📖</span>
            <span className="hidden md:inline">Docs</span>
            <span className="text-[10px] text-white/30 hidden md:inline">↗</span>
          </Link>

          {/* Inbox Button */}
          <button
            onClick={() => {
              setShowInboxModal(true);
              fetchInbox();
            }}
            className="h-8 px-2.5 sm:px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/70 hover:text-white text-xs font-mono transition-colors relative flex items-center gap-1.5 cursor-pointer"
            title="Team Handoff Inbox"
          >
            <span>📥</span>
            <span className="hidden lg:inline">Inbox</span>
            {pendingInboxCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-400 text-black text-[10px] font-bold">
                {pendingInboxCount}
              </span>
            )}
          </button>

          {/* Audit Trail Button */}
          <button
            onClick={handleOpenAudit}
            className="h-8 px-2.5 sm:px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/70 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Security Audit Trail"
          >
            <span>🛡️</span>
            <span className="hidden lg:inline">Audit</span>
          </button>

          {/* Server Connection Status (Desktop) */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-white/40 pl-2.5 pr-1 border-l border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LCP Cloud
          </div>

          <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />

          {/* User Profile / Logout */}
          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="text-[12px] font-mono text-white/40 hover:text-rose-400 transition-colors cursor-pointer px-1.5 py-1 hidden sm:inline"
              title="Sign out of AgentRelay"
            >
              Sign out
            </button>

            <div
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-white/[0.05] to-white/[0.12] border border-white/[0.12] flex items-center justify-center text-xs font-semibold text-white/90 shadow-inner shrink-0"
              title={user?.handle || user?.name || 'User'}
            >
              {user?.name?.[0] || user?.handle?.[1]?.toUpperCase() || 'U'}
            </div>
          </div>

          {/* Mobile Sidebar / Drawer Toggle */}
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="md:hidden p-2 text-white/60 hover:text-white transition-colors cursor-pointer ml-1"
            aria-label="Toggle Filters & Navigation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              {showMobileSidebar ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
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
          {/* Workspaces Management */}
          <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Workspaces ({teams.length})
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                  title="Join workspace with invite token"
                >
                  Join
                </button>
                <button
                  onClick={() => setShowCreateTeamModal(true)}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-white/70 hover:bg-white/[0.1] transition-colors cursor-pointer"
                  title="Create new workspace"
                >
                  + New
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className={`group/ws flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-all ${
                    activeTeam?.id === t.id
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveTeam(t);
                      localStorage.setItem('ar_active_team_id', t.id);
                    }}
                    className="flex-1 text-left text-xs truncate flex items-center justify-between cursor-pointer mr-1"
                  >
                    <span className="truncate">{t.name}</span>
                    {activeTeam?.id === t.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-1" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTeam(t);
                    }}
                    className="opacity-0 group-hover/ws:opacity-100 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 px-1 py-0.5 rounded text-[11px] transition-all cursor-pointer"
                    title={`Delete workspace "${t.name}"`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

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

          {/* CLI Reference Widget */}
          <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Terminal Help
            </p>
            <button
              onClick={() => setShowCliModal(true)}
              className="w-full py-2 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>⚡</span>
              <span>CLI Cheat Sheet</span>
            </button>
          </div>
        </aside>

        {/* Main feed */}
        <main className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Mobile Filter & Workspace Bar (Visible on mobile/tablet only) */}
          <div className="md:hidden flex items-center justify-between p-3 rounded-xl bg-[#111111] border border-white/[0.08] text-xs font-mono">
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="text-white/40 shrink-0">Team:</span>
              <span className="text-white font-medium truncate">{activeTeam?.name || 'Workspace'}</span>
              {agent !== 'all' && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] shrink-0">
                  {agent}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/90 text-xs font-sans font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <span>⚙️</span>
              <span>Filters & Teams</span>
            </button>
          </div>

          {/* Header row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-semibold text-white/90 tracking-tight">
                  {viewMode === 'vault' ? 'My Context Records' : (activeTeam ? activeTeam.name : 'Team Context Feed')}
                </h1>
                {viewMode === 'vault' ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Personal Vault • {myRecords.length} record(s)
                  </span>
                ) : (
                  activeTeam && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeTeam.id);
                        setCopiedTeamId(true);
                        setTimeout(() => setCopiedTeamId(false), 2000);
                      }}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.10] text-cyan-300 border border-white/[0.08] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Click to copy Team ID"
                    >
                      <span>ID: {activeTeam.id}</span>
                      <span className="text-[10px] text-white/40">{copiedTeamId ? '✓' : '📋'}</span>
                    </button>
                  )
                )}
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                {viewMode === 'vault'
                  ? 'Your permanent session history, decisions, and distilled cards (persists across all teams)'
                  : 'Promoted AI session records live on LCP backend'}
              </p>
            </div>

            {/* Search & Workspace Action Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-56 md:w-64">
                <span className="absolute left-3 top-2 pointer-events-none text-white/30 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder={viewMode === 'vault' ? "Search your context records…" : "Search team records…"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-white/20 text-xs text-white/85 placeholder-white/30 outline-hidden transition-all font-sans"
                />
              </div>

              {viewMode === 'team' && activeTeam && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleCreateInvite}
                    className="h-8 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-300 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Generate and copy invite token for teammate"
                  >
                    <span>✉️</span>
                    <span className="hidden sm:inline">Invite</span>
                  </button>

                  <button
                    onClick={() => handleDeleteTeam(activeTeam)}
                    className="h-8 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    title={`Delete workspace "${activeTeam.name}"`}
                  >
                    <span>🗑️</span>
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Promote / Workspace helper banner */}
          {viewMode === 'vault' ? (
            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-emerald-400 font-bold shrink-0">🔒</span>
                <span className="text-white/80 font-sans">
                  <strong>Personal Context Vault:</strong> Your previous context records stay preserved here even if team workspaces change or expire.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <code className="text-[11px] text-emerald-300 bg-black/60 px-2.5 py-1.5 rounded-md border border-emerald-500/20 select-all">
                  agentrelay daemon
                </code>
                <button
                  onClick={() => setShowCliModal(true)}
                  className="h-7 px-2.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white text-xs font-sans transition-colors cursor-pointer"
                >
                  CLI Guide
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#111111] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-emerald-400 font-bold shrink-0">⚡</span>
                <span className="text-white/70 font-sans truncate">
                  Promote local record to <strong className="text-white font-mono">{activeTeam?.name || 'this team'}</strong>:
                </span>
              </div>
              <div className="flex items-center gap-2 max-w-full overflow-hidden">
                <code className="text-[11px] text-emerald-400 bg-black/60 px-2.5 py-1.5 rounded-md border border-white/[0.06] select-all break-all overflow-x-auto">
                  agentrelay promote &lt;recordId&gt; --team {activeTeam?.id || '&lt;teamId&gt;'}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`agentrelay promote <recordId> --team ${activeTeam?.id || '<teamId>'}`);
                    setCopiedPromoteCmd('global');
                    setTimeout(() => setCopiedPromoteCmd(null), 2000);
                  }}
                  className="h-7 px-2.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/75 hover:text-white text-xs font-sans transition-colors shrink-0 cursor-pointer"
                >
                  {copiedPromoteCmd === 'global' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Cards or Empty State */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <p className="text-xs text-white/40 animate-pulse">Loading context records from LCP server...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-white/[0.08] rounded-2xl bg-[#0E0E0E] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-2xl mx-auto">
                📁
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">No context records in this workspace yet</h3>
                <p className="text-xs text-white/40 mt-1 max-w-md mx-auto">
                  Add code context from your terminal, or join another team workspace using an invite token.
                </p>
              </div>

              <div className="w-full max-w-lg p-3 rounded-xl bg-black/60 border border-white/[0.08] font-mono text-xs text-left space-y-1 text-emerald-400">
                <div className="text-white/40 text-[10px]"># 1. Scope project & capture session</div>
                <div>agentrelay scope add ~/your-repo</div>
                <div className="text-white/40 text-[10px] pt-1"># 2. Promote record into this team workspace</div>
                <div>agentrelay promote &lt;recordId&gt; --team {activeTeam?.id || '&lt;teamId&gt;'}</div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔗</span>
                  <span>Join Team with Token</span>
                </button>
                <button
                  onClick={() => setShowCreateTeamModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>+</span>
                  <span>Create New Team</span>
                </button>
                <button
                  onClick={() => setShowCliModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-mono bg-white text-black hover:bg-white/90 transition-colors flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <span>⚡</span>
                  <span>CLI Commands Reference</span>
                </button>
              </div>
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

                    {/* Record ID & Terminal promote actions */}
                    <div className="my-2.5 p-2 rounded-lg bg-black/50 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white/30 text-[10px] uppercase tracking-wider shrink-0">Record ID:</span>
                        <code className="text-cyan-300 font-semibold select-all text-[11px] truncate max-w-[200px] sm:max-w-none">{s.id}</code>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={(e) => handleCopyRecordId(e, s.id)}
                          className="h-6 px-2 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                          title="Copy Record ID"
                        >
                          <span>{copiedRecordId === s.id ? '✓' : '📋'}</span>
                          <span>{copiedRecordId === s.id ? 'Copied' : 'Copy ID'}</span>
                        </button>
                        <button
                          onClick={(e) => handleCopyPromoteCmd(e, s.id)}
                          className="h-6 px-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] border border-emerald-500/20 transition-colors cursor-pointer flex items-center gap-1"
                          title="Copy promote command for terminal"
                        >
                          <span>{copiedPromoteCmd === s.id ? '✓' : '⚡'}</span>
                          <span>{copiedPromoteCmd === s.id ? 'Cmd Copied' : 'Promote Cmd'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Share to workspace button (available in vault mode) */}
                    {viewMode === 'vault' && teams.length > 0 && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="my-2.5 p-2 rounded-lg bg-black/40 border border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-[11px] text-white/50 font-sans">
                          Share this personal record to team workspace:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={targetShareTeam[s.id] || activeTeam?.id || teams[0].id}
                            onChange={(e) => setTargetShareTeam(prev => ({ ...prev, [s.id]: e.target.value }))}
                            className="bg-[#111111] border border-white/[0.12] rounded px-2 py-1 text-[11px] text-white/80 font-mono focus:outline-hidden cursor-pointer"
                          >
                            {teams.map(t => (
                              <option key={t.id} value={t.id} className="bg-[#1A1A1A]">
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={(e) => handleShareToTeam(e, s.id, targetShareTeam[s.id] || activeTeam?.id || teams[0].id)}
                            disabled={sharingStatus[s.id] === 'sharing'}
                            className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-medium transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {sharingStatus[s.id] === 'sharing' ? 'Sharing…' : sharingStatus[s.id] === 'done' ? '✓ Shared' : 'Share →'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-white/30 pt-2 border-t border-white/[0.04]">
                      <span>📁 {s.filesCount} file(s) touched</span>
                      <span>💡 {s.decisionsCount} decision(s)</span>
                      <span>🏷️ {s.projectTag}</span>
                      {viewMode === 'vault' ? (
                        <span className="sm:ml-auto text-[10px] text-emerald-400/80 font-mono">
                          Vault Preserved
                        </span>
                      ) : (
                        <span className="sm:ml-auto text-[10px] text-emerald-400/80">LCP Record Verified</span>
                      )}
                    </div>
                  </div>
                </TiltCard>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── Inbox Modal ──────────────────────────────────────────────────────── */}
      {showInboxModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-white/[0.1] bg-[#121212] p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📥</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">Context Handoff Inbox</h3>
                  <p className="text-[11px] font-mono text-white/40">PRD FR-023 Handoff & Inbox Engine</p>
                </div>
              </div>
              <button
                onClick={() => setShowInboxModal(false)}
                className="text-white/40 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2">
              {['all', 'pending', 'read'].map((f) => (
                <button
                  key={f}
                  onClick={() => setInboxFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all cursor-pointer ${
                    inboxFilter === f
                      ? 'bg-white/[0.12] text-white font-semibold'
                      : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                  }`}
                >
                  {f} {f === 'pending' && pendingInboxCount > 0 ? `(${pendingInboxCount})` : ''}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {inboxItems
                .filter((item) => (inboxFilter === 'all' ? true : item.state === inboxFilter))
                .length === 0 ? (
                <div className="py-12 text-center text-xs text-white/30 space-y-2">
                  <p className="text-2xl opacity-40">📭</p>
                  <p>No handoff items in this category.</p>
                  <p className="text-[11px] text-white/20">
                    When a teammate runs <code className="text-cyan-400">agentrelay handoff &lt;recordId&gt; @{user?.handle?.replace('@', '') || 'you'}</code>, it will appear here.
                  </p>
                </div>
              ) : (
                inboxItems
                  .filter((item) => (inboxFilter === 'all' ? true : item.state === inboxFilter))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-cyan-400 font-semibold">{item.fromHandle}</span>
                          <span className="text-white/30">→ you in</span>
                          <span className="text-white/60 bg-white/[0.05] px-1.5 py-0.5 rounded text-[10px]">
                            {item.teamName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                              item.state === 'pending'
                                ? 'bg-amber-950/40 text-amber-300 border border-amber-500/20'
                                : 'bg-white/[0.04] text-white/40'
                            }`}
                          >
                            {item.state}
                          </span>
                          <span className="text-[10px] font-mono text-white/30">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-white/90">
                          {item.record?.title || 'Shared Context Record'}
                        </h4>
                        {item.record?.summary && (
                          <p className="text-[11px] text-white/50 line-clamp-2 mt-0.5">
                            {item.record.summary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.04]">
                        {item.state === 'pending' && (
                          <button
                            onClick={() => handleMarkRead(item.id)}
                            className="px-2.5 py-1 rounded text-[11px] font-mono text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowInboxModal(false);
                            navigate(`/sessions/${item.recordId}?teamId=${item.teamId}`);
                          }}
                          className="px-3 py-1 rounded text-[11px] font-mono font-semibold bg-white text-black hover:bg-white/90 transition-colors cursor-pointer"
                        >
                          View Context →
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Trail Modal ─────────────────────────────────────────────────── */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-white/[0.1] bg-[#121212] p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🛡️</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">Tamper-Evident Audit Trail</h3>
                  <p className="text-[11px] font-mono text-white/40">SHA-256 Hash Chain Integrity (PRD §14.2, §20)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleVerifyAuditChain}
                  disabled={auditLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {auditLoading ? 'Verifying…' : 'Verify SHA-256 Chain'}
                </button>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="text-white/40 hover:text-white text-sm cursor-pointer ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Verification Result Banner */}
            {auditVerifyResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-mono ${
                  auditVerifyResult.valid
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}
              >
                {auditVerifyResult.valid ? (
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>✔</span> Cryptographic Audit Trail Intact
                    </div>
                    <div className="text-[11px] text-white/50 mt-1">
                      Verified {auditVerifyResult.checked} chained event(s). Head hash:{' '}
                      <code className="text-emerald-400 select-all">{auditVerifyResult.headHash?.slice(0, 24)}…</code>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-bold">❌ Integrity Compromised</div>
                    <div className="text-[11px] mt-1">
                      Reason: {auditVerifyResult.brokenAt?.reason} at sequence #{auditVerifyResult.brokenAt?.seq} (ID: {auditVerifyResult.brokenAt?.id})
                    </div>
                  </div>
                )}
              </div>
            )}

            {auditError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/25 text-rose-300 text-xs">
                {auditError}
              </div>
            )}

            {/* Event Log Table */}
            <div className="flex-1 overflow-y-auto overflow-x-auto pr-1">
              {auditEvents.length === 0 ? (
                <div className="py-12 text-center text-xs text-white/30">
                  {auditLoading ? 'Loading audit trail…' : 'No audit events recorded for this team.'}
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-[10px] uppercase text-white/30">
                      <th className="py-2 px-2">Seq</th>
                      <th className="py-2 px-2">Action</th>
                      <th className="py-2 px-2">Actor</th>
                      <th className="py-2 px-2">Record ID</th>
                      <th className="py-2 px-2">Time</th>
                      <th className="py-2 px-2">Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {auditEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-white/[0.02]">
                        <td className="py-2 px-2 text-white/30">#{ev.seq}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              ev.action.includes('promote')
                                ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/20'
                                : ev.action.includes('handoff')
                                ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-500/20'
                                : ev.action.includes('withdraw')
                                ? 'bg-rose-950/50 text-rose-300 border border-rose-500/20'
                                : 'bg-white/[0.05] text-white/60'
                            }`}
                          >
                            {ev.action}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-white/80">{ev.actorHandle || ev.actorId?.slice(0, 8)}</td>
                        <td className="py-2 px-2 text-white/40 truncate max-w-[120px]">{ev.recordId || '—'}</td>
                        <td className="py-2 px-2 text-white/30 text-[10px]">{new Date(ev.ts).toLocaleTimeString()}</td>
                        <td className="py-2 px-2 text-white/20 text-[10px] truncate max-w-[80px]" title={ev.hash}>
                          {ev.hash ? ev.hash.slice(0, 8) + '…' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Drawer (Slide-over on < md screens) */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-xs flex">
          <div className="w-full max-w-xs bg-[#111111] border-r border-white/[0.1] h-full flex flex-col p-5 overflow-y-auto space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="text-base">🏢</span>
                <h3 className="text-sm font-semibold text-white">Workspaces & Filters</h3>
              </div>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Workspaces */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  Workspaces ({teams.length})
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setShowMobileSidebar(false);
                      setShowJoinModal(true);
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => {
                      setShowMobileSidebar(false);
                      setShowCreateTeamModal(true);
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"
                  >
                    + New
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-all ${
                      activeTeam?.id === t.id
                        ? 'bg-white/[0.08] text-white font-medium'
                        : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setActiveTeam(t);
                        localStorage.setItem('ar_active_team_id', t.id);
                        setShowMobileSidebar(false);
                      }}
                      className="flex-1 text-left text-xs truncate flex items-center justify-between cursor-pointer mr-1"
                    >
                      <span className="truncate">{t.name}</span>
                      {activeTeam?.id === t.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-1" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTeam(t);
                      }}
                      className="text-white/30 hover:text-rose-400 p-0.5 rounded text-[11px]"
                      title={`Delete workspace "${t.name}"`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Members */}
            <div className="space-y-3 pt-3 border-t border-white/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Team Members ({members.length})
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setPerson('all');
                    setShowMobileSidebar(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    person === 'all'
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                  }`}
                >
                  All Teammates
                </button>
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setPerson(m.handle);
                      setShowMobileSidebar(false);
                    }}
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

            {/* Agent Adapters */}
            <div className="space-y-3 pt-3 border-t border-white/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Agent Adapters</p>
              <div className="space-y-1">
                {[
                  { key: 'all', label: 'All agents' },
                  { key: 'claude', label: 'Claude Code' },
                  { key: 'cursor', label: 'Cursor' },
                  { key: 'codex', label: 'Codex' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setAgent(key);
                      setShowMobileSidebar(false);
                    }}
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

            {/* CLI Reference & Actions */}
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              <button
                onClick={() => {
                  setShowMobileSidebar(false);
                  setShowCliModal(true);
                }}
                className="w-full py-2 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>⚡</span>
                <span>CLI Cheat Sheet</span>
              </button>

              <button
                onClick={() => {
                  setShowMobileSidebar(false);
                  logout();
                }}
                className="w-full py-2 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowMobileSidebar(false)} />
        </div>
      )}

      {/* CLI Commands Reference Modal */}
      <CliCommandsModal
        isOpen={showCliModal}
        onClose={() => setShowCliModal(false)}
        activeTeamId={activeTeam?.id}
      />

      {/* Join Workspace Modal */}
      <JoinWorkspaceModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoined={handleJoinSuccess}
      />

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        onCreated={handleCreateTeamSuccess}
      />
    </div>
  );
}
