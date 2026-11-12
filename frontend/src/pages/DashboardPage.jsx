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
  listMyRecords,
  shareRecordToTeam,
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

  // View Mode: 'team' (shared workspace feed) vs 'vault' (personal context records)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('ar_view_mode') || 'team');
  const [myRecords, setMyRecords] = useState([]);
  const [myRecordsLoading, setMyRecordsLoading] = useState(false);
  const [targetShareTeam, setTargetShareTeam] = useState({});
  const [sharingStatus, setSharingStatus] = useState({});

  const formatRecord = (r) => {
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
      teamName: r.teamName || r.team_name,
      teamId: r.teamId || r.team_id,
      raw: rec
    };
  };

  const fetchMyRecords = async () => {
    try {
      setMyRecordsLoading(true);
      const raw = await listMyRecords();
      const formatted = raw
        .filter(r => !r.isWithdrawn && !r.withdrawn)
        .map(formatRecord);
      setMyRecords(formatted);
    } catch (e) {
      console.warn('Failed to fetch personal records:', e.message);
    } finally {
      setMyRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRecords();
  }, []);

  const handleShareToTeam = async (e, recordId, targetTeamId) => {
    e.stopPropagation();
    if (!targetTeamId) {
      alert('Please select a team workspace first.');
      return;
    }
    setSharingStatus(prev => ({ ...prev, [recordId]: 'sharing' }));
    try {
      await shareRecordToTeam(targetTeamId, recordId);
      setSharingStatus(prev => ({ ...prev, [recordId]: 'done' }));
      setTimeout(() => {
        setSharingStatus(prev => ({ ...prev, [recordId]: null }));
      }, 3000);
      if (activeTeam?.id === targetTeamId) {
        const teamRecs = await listRecords(targetTeamId);
        setRecords(teamRecs.filter(r => !r.isWithdrawn && !r.withdrawn).map(formatRecord));
      }
    } catch (err) {
      alert('Failed to share record: ' + (err.response?.data?.error?.message || err.message));
      setSharingStatus(prev => ({ ...prev, [recordId]: null }));
    }
  };

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
    } catch {
      // ignore
    }
  };

  const handleMarkInboxRead = async (id) => {
    try {
      await markInboxRead(id);
      setInboxItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, state: 'read' } : item))
      );
    } catch {
      // ignore
    }
  };

  const fetchAudit = async (teamId) => {
    if (!teamId) return;
    setAuditLoading(true);
    setAuditError(null);
    try {
      const data = await listAuditTrail(teamId);
      setAuditEvents(data.events || []);
    } catch (e) {
      setAuditError(e.message);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleVerifyAudit = async () => {
    if (!activeTeam) return;
    try {
      const res = await verifyAuditTrail(activeTeam.id);
      setAuditVerifyResult(res);
    } catch (e) {
      setAuditVerifyResult({ valid: false, error: e.message });
    }
  };

  useEffect(() => {
    fetchInbox();
    const interval = setInterval(fetchInbox, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const data = await listTeams();
      setTeams(data);
      if (data.length > 0) {
        const savedTeamId = localStorage.getItem('ar_active_team_id');
        const found = savedTeamId ? data.find((t) => t.id === savedTeamId) : null;
        setActiveTeam(found || data[0]);
      } else {
        setActiveTeam(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (!activeTeam) return;
    const fetchTeamDetails = async () => {
      try {
        setLoading(true);
        const [memData, recData] = await Promise.all([
          listMembers(activeTeam.id),
          listRecords(activeTeam.id),
        ]);
        setMembers(memData);
        setRecords(
          recData.filter((r) => !r.isWithdrawn && !r.withdrawn).map(formatRecord)
        );
      } catch (err) {
        setError(err.message || 'Failed to load team data');
      } finally {
        setLoading(false);
      }
    };
    fetchTeamDetails();
  }, [activeTeam]);

  const handleCreateInvite = async () => {
    if (!activeTeam) return;
    try {
      const data = await createInvite(activeTeam.id);
      setInviteToken(data.token);
      navigator.clipboard.writeText(data.token);
      alert(`Invite Token copied to clipboard!\n\nToken: ${data.token}`);
    } catch (err) {
      alert(`Failed to create invite: ${err.message}`);
    }
  };

  const handleJoinSuccess = async (joinedTeamId) => {
    await fetchTeams();
    const joined = teams.find((t) => t.id === joinedTeamId);
    if (joined) setActiveTeam(joined);
  };

  const handleCreateTeamSuccess = async (createdTeam) => {
    await fetchTeams();
    setActiveTeam(createdTeam);
  };

  const handleDeleteTeam = async (teamToDelete) => {
    if (!teamToDelete) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete workspace "${teamToDelete.name}"?\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteTeam(teamToDelete.id);
      const remainingTeams = teams.filter((t) => t.id !== teamToDelete.id);
      setTeams(remainingTeams);
      if (activeTeam?.id === teamToDelete.id) {
        const nextActive = remainingTeams.length > 0 ? remainingTeams[0] : null;
        setActiveTeam(nextActive);
        if (nextActive) {
          localStorage.setItem('ar_active_team_id', nextActive.id);
        } else {
          localStorage.removeItem('ar_active_team_id');
        }
      }
    } catch (err) {
      alert(`Failed to delete workspace: ${err.message}`);
    }
  };

  const handleCopyRecordId = (e, recordId) => {
    e.stopPropagation();
    navigator.clipboard.writeText(recordId);
    setCopiedRecordId(recordId);
    setTimeout(() => setCopiedRecordId(null), 2000);
  };

  const handleCopyPromoteCmd = (e, recordId) => {
    e.stopPropagation();
    const teamIdArg = activeTeam ? `--team ${activeTeam.id}` : '--team <teamId>';
    const cmd = `agentrelay promote ${recordId} ${teamIdArg}`;
    navigator.clipboard.writeText(cmd);
    setCopiedPromoteCmd(recordId);
    setTimeout(() => setCopiedPromoteCmd(null), 2000);
  };

  const displayedRecords = viewMode === 'vault' ? myRecords : records;

  const filtered = displayedRecords.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.summary.toLowerCase().includes(search.toLowerCase());
    const matchesPerson = person === 'all' || s.user === person;
    const matchesAgent = agent === 'all' || s.agent.toLowerCase().includes(agent.toLowerCase());
    return matchesSearch && matchesPerson && matchesAgent;
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
            className="h-8 px-2.5 sm:px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/75 hover:text-white text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Read Complete AgentRelay Architecture & Setup Docs"
          >
            <span>📖</span>
            <span className="hidden md:inline">Docs</span>
          </Link>

          {/* Inbox button */}
          <button
            onClick={() => setShowInboxModal(true)}
            className="relative h-8 px-2.5 sm:px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/75 hover:text-white text-xs font-mono font-medium transition-colors hidden lg:flex items-center gap-1.5 cursor-pointer"
            title="Context Handoff Inbox"
          >
            <span>📥</span>
            <span>Inbox</span>
            {inboxItems.filter((i) => i.state === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[10px] text-cyan-300 font-bold">
                {inboxItems.filter((i) => i.state === 'pending').length}
              </span>
            )}
          </button>

          {/* Audit trail button */}
          <button
            onClick={() => {
              if (activeTeam) fetchAudit(activeTeam.id);
              setShowAuditModal(true);
            }}
            className="h-8 px-2.5 sm:px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/75 hover:text-white text-xs font-mono font-medium transition-colors hidden lg:flex items-center gap-1.5 cursor-pointer"
            title="Cryptographic Hash-Chained Audit Trail (PRD FR-026)"
          >
            <span>🛡️</span>
            <span>Audit Trail</span>
          </button>

          <div className="h-4 w-px bg-white/[0.08] hidden xl:block" />

          {/* Cloud Server Live status */}
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px]">LCP Cloud Server</span>
          </div>

          <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />

          {/* User Sign out */}
          <button
            onClick={logout}
            className="hidden sm:flex text-xs font-mono text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
            title="Sign out of AgentRelay"
          >
            Sign out
          </button>

          {/* Mobile Sidebar Hamburger Toggle */}
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="md:hidden w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-sm text-white/80 hover:text-white cursor-pointer"
            aria-label="Open mobile navigation menu"
          >
            ☰
          </button>

          {/* Avatar button */}
          <div
            onClick={logout}
            className="w-7 h-7 rounded-full bg-linear-to-tr from-cyan-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center text-xs font-mono text-cyan-300 cursor-pointer hover:border-rose-500/40 transition-colors"
            title={`${user?.handle || 'User'} (Click to sign out)`}
          >
            {user?.handle?.[1]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-6">
        {/* Desktop Sidebar (hidden on < md) */}
        <aside className="w-60 shrink-0 hidden md:flex flex-col gap-6 font-mono text-xs">
          {/* Main Feed View Switcher */}
          <div>
            <span className="text-white/40 text-[10px] tracking-wider uppercase font-semibold block mb-2 px-1">
              Navigation
            </span>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  setViewMode('vault');
                  localStorage.setItem('ar_view_mode', 'vault');
                  fetchMyRecords();
                }}
                className={`w-full py-2 px-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                  viewMode === 'vault'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-semibold'
                    : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>📁</span>
                  <span>My Context Records</span>
                </div>
                <span className="text-[10px] opacity-60">({myRecords.length})</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('team');
                  localStorage.setItem('ar_view_mode', 'team');
                }}
                className={`w-full py-2 px-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                  viewMode === 'team'
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 font-semibold'
                    : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>👥</span>
                  <span>Team Workspaces</span>
                </div>
                <span className="text-[10px] opacity-60">({teams.length})</span>
              </button>
            </div>
          </div>

          {/* Workspaces List */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-white/40 text-[10px] tracking-wider uppercase font-semibold">
                Workspaces ({teams.length})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  Join
                </button>
                <span className="text-white/20">•</span>
                <button
                  onClick={() => setShowCreateTeamModal(true)}
                  className="text-[10px] text-white/60 hover:text-white cursor-pointer"
                >
                  + New
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
              {teams.length === 0 ? (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-white/40 text-center">
                  No workspaces yet. Create one or join with an invite token.
                </div>
              ) : (
                teams.map((t) => {
                  const isActive = activeTeam?.id === t.id && viewMode === 'team';
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setActiveTeam(t);
                        setViewMode('team');
                        localStorage.setItem('ar_view_mode', 'team');
                        localStorage.setItem('ar_active_team_id', t.id);
                      }}
                      className={`group w-full py-1.5 px-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-medium'
                          : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <span className="truncate flex-1">{t.name}</span>
                      <div className="flex items-center gap-1.5">
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTeam(t);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-white/40 p-0.5 transition-opacity"
                          title="Delete workspace"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Members in Active Team */}
          {activeTeam && (
            <div>
              <span className="text-white/40 text-[10px] tracking-wider uppercase font-semibold block mb-2 px-1">
                Team Members ({members.length})
              </span>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                <button
                  onClick={() => setPerson('all')}
                  className={`w-full py-1.5 px-3 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    person === 'all'
                      ? 'bg-white/[0.08] border-white/20 text-white'
                      : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <span>All Teammates</span>
                </button>
                {members.map((m) => {
                  const isSel = person === m.handle;
                  return (
                    <button
                      key={m.userId}
                      onClick={() => setPerson(isSel ? 'all' : m.handle)}
                      className={`w-full py-1.5 px-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSel
                          ? 'bg-white/[0.08] border-white/20 text-white'
                          : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="truncate">{m.handle}</span>
                      <span className="text-[10px] text-white/30 uppercase">{m.role}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter by Agent Adapter */}
          <div>
            <span className="text-white/40 text-[10px] tracking-wider uppercase font-semibold block mb-2 px-1">
              Agent Adapters
            </span>
            <div className="flex flex-col gap-1">
              {[
                { id: 'all', label: 'All agents' },
                { id: 'claude', label: 'Claude Code' },
                { id: 'cursor', label: 'Cursor' },
                { id: 'codex', label: 'Codex' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setAgent(id)}
                  className={`w-full py-1.5 px-3 rounded-lg border text-left transition-all cursor-pointer ${
                    agent === id
                      ? 'bg-white/[0.08] border-white/20 text-white font-medium'
                      : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:bg-white/[0.06]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* CLI Helper Section */}
          <div className="pt-2 border-t border-white/[0.06]">
            <span className="text-white/40 text-[10px] tracking-wider uppercase font-semibold block mb-2 px-1">
              Terminal Help
            </span>
            <button
              onClick={() => setShowCliModal(true)}
              className="w-full py-2 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>⚡</span>
              <span>CLI Cheat Sheet</span>
            </button>
          </div>
        </aside>

        {/* Center / Feed Area */}
        <main className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Mobile Filter Toggle Bar (visible only on < md) */}
          <div className="md:hidden flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
            <span className="text-white/60 font-mono truncate">
              {viewMode === 'vault' ? '📁 My Vault' : (activeTeam ? `🏢 ${activeTeam.name}` : 'No Workspace')}
            </span>
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
            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">🔒</span>
                <span className="text-white/80 font-sans">
                  <strong>Personal Context Vault:</strong> Your previous context records stay preserved here even if team workspaces change or expire.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-[11px] text-emerald-300 bg-black/60 px-2.5 py-1 rounded-md border border-emerald-500/20 select-all truncate">
                  agentrelay daemon
                </code>
                <button
                  onClick={() => setShowCliModal(true)}
                  className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/70 text-[10px] shrink-0 cursor-pointer"
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
          {(viewMode === 'vault' ? myRecordsLoading : loading) ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <p className="text-xs text-white/40 animate-pulse">Loading context records from LCP server...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-white/[0.08] rounded-2xl bg-[#0E0E0E] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-2xl mx-auto">
                📁
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">
                  {viewMode === 'vault' ? 'No context records in your personal vault yet' : 'No context records in this workspace yet'}
                </h3>
                <p className="text-xs text-white/40 mt-1 max-w-md mx-auto">
                  {viewMode === 'vault'
                    ? 'Run the AgentRelay daemon locally to capture your sessions into your personal vault.'
                    : 'Add code context from your terminal, or join another team workspace using an invite token.'}
                </p>
              </div>

              {/* Terminal Instructions Helper */}
              <div className="p-4 rounded-xl bg-black/60 border border-white/[0.06] text-left font-mono text-xs max-w-lg w-full space-y-2">
                <div className="text-white/40 text-[11px]"># 1. Scope project & capture session</div>
                <div className="text-emerald-400">agentrelay scope add ~/your-repo</div>
                <div className="text-white/40 text-[11px] pt-1"># 2. Promote record into this team workspace</div>
                <div className="text-emerald-400">
                  agentrelay promote &lt;recordId&gt; --team {activeTeam ? activeTeam.id : '&lt;teamId&gt;'}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono font-medium transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>🔗</span>
                  <span>Join Team with Token</span>
                </button>
                <button
                  onClick={() => setShowCreateTeamModal(true)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] text-white/80 hover:text-white text-xs font-mono font-medium transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>+</span>
                  <span>Create New Team</span>
                </button>
                <button
                  onClick={() => setShowCliModal(true)}
                  className="px-4 py-2 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-mono font-medium transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>⚡</span>
                  <span>CLI Commands Reference</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filtered.map((s) => (
                <TiltCard key={s.id}>
                  <div
                    onClick={() => navigate(`/sessions/${s.id}`)}
                    className="p-5 flex flex-col gap-3 group cursor-pointer"
                  >
                    {/* Top Row: User Avatar & Session Title */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <img
                          src={s.avatar}
                          alt={s.userName}
                          className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-white/90 group-hover:text-cyan-400 transition-colors truncate">
                            {s.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                            <span>{s.userName}</span>
                            <span>•</span>
                            <span className="font-mono text-[11px] text-white/30">{s.agent}</span>
                            <span>•</span>
                            <span>{s.timestamp}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Meta Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        {s.sensitivity && s.sensitivity !== 'none' && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider ${
                              s.sensitivity === 'restricted'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {s.sensitivity}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-white/40">
                          {s.duration}
                        </span>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                      {s.summary}
                    </p>

                    {/* Quick Record Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleCopyRecordId(e, s.id)}
                          className="h-6 px-2 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white text-[10px] font-mono border border-white/[0.06] transition-colors cursor-pointer flex items-center gap-1"
                          title="Copy full Record ID to clipboard"
                        >
                          <span>{copiedRecordId === s.id ? '✓' : '📋'}</span>
                          <span>{copiedRecordId === s.id ? 'ID Copied' : `id:${s.id.slice(0, 8)}…`}</span>
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

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 font-mono text-xs">
              {['all', 'pending', 'read'].map((f) => (
                <button
                  key={f}
                  onClick={() => setInboxFilter(f)}
                  className={`px-3 py-1 rounded-lg border capitalize cursor-pointer transition-colors ${
                    inboxFilter === f
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 font-medium'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.06]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Inbox List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px]">
              {inboxItems
                .filter((item) => (inboxFilter === 'all' ? true : item.state === inboxFilter))
                .length === 0 ? (
                <div className="text-center py-12 text-white/30 text-xs font-mono">
                  No {inboxFilter !== 'all' ? inboxFilter : ''} handoffs in your inbox.
                </div>
              ) : (
                inboxItems
                  .filter((item) => (inboxFilter === 'all' ? true : item.state === inboxFilter))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-white/[0.06] bg-[#181818] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-cyan-400">@{item.senderHandle || 'teammate'}</span>
                          <span className="text-white/30">→ you</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] ${
                              item.state === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-white/[0.04] text-white/40 border border-white/[0.06]'
                            }`}
                          >
                            {item.state}
                          </span>
                        </div>
                        <p className="text-white/70 font-sans">{item.message || 'Shared a context record with you.'}</p>
                        <div className="font-mono text-[10px] text-white/30">
                          Record: {item.recordId?.slice(0, 16)}…
                        </div>
                      </div>

                      {item.state === 'pending' && (
                        <button
                          onClick={() => handleMarkInboxRead(item.id)}
                          className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-white/70 text-[11px] font-mono shrink-0 cursor-pointer transition-colors"
                        >
                          Mark Read
                        </button>
                      )}
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
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-white/[0.1] bg-[#121212] p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🛡️</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">Cryptographic Audit Trail</h3>
                  <p className="text-[11px] font-mono text-white/40">SHA-256 Hash Chain Integrity Verification</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAuditModal(false);
                  setAuditVerifyResult(null);
                }}
                className="text-white/40 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Verify Chain Action Bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs text-white/60 font-mono">Verify whole chain across all team mutations</span>
              <button
                onClick={handleVerifyAudit}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-300 text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                Verify Audit Chain
              </button>
            </div>

            {/* Verification result badge */}
            {auditVerifyResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono ${
                  auditVerifyResult.valid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {auditVerifyResult.valid
                  ? `✓ Cryptographic Audit Chain Valid (${auditVerifyResult.verifiedCount || auditEvents.length} events verified, 0 broken links)`
                  : `✗ Chain Tampering Detected: ${auditVerifyResult.error || 'Hash mismatch in audit sequence'}`}
              </div>
            )}

            {/* Event list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[240px]">
              {auditLoading ? (
                <div className="text-center py-12 text-white/30 text-xs font-mono animate-pulse">
                  Loading cryptographic events...
                </div>
              ) : auditError ? (
                <div className="text-center py-12 text-rose-400/80 text-xs font-mono">
                  Failed to load audit events: {auditError}
                </div>
              ) : auditEvents.length === 0 ? (
                <div className="text-center py-12 text-white/30 text-xs font-mono">
                  No audit events recorded for this workspace yet.
                </div>
              ) : (
                auditEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl border border-white/[0.05] bg-[#161616] font-mono text-[11px] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-white/40">
                      <span className="text-emerald-400 font-semibold">{evt.action}</span>
                      <span>{new Date(evt.ts).toLocaleString()}</span>
                    </div>
                    <div className="text-white/60 break-all text-[10px]">
                      hash: <span className="text-cyan-400/80">{evt.eventHash?.slice(0, 32)}…</span>
                    </div>
                    <div className="text-white/30 break-all text-[10px]">
                      prev: {evt.prevHash ? `${evt.prevHash.slice(0, 32)}…` : '00000000000000000000000000000000 (genesis)'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Slide-over Mobile Navigation Drawer ───────────────────────────────── */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="w-72 max-w-[80vw] bg-[#0E0E0E] border-r border-white/[0.08] p-5 flex flex-col gap-5 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="font-semibold text-sm text-white/90">Navigation & Filters</span>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="text-white/40 hover:text-white text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher */}
            <div>
              <span className="text-white/40 text-[10px] tracking-wider uppercase font-semibold block mb-2">
                View Mode
              </span>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => {
                    setViewMode('vault');
                    localStorage.setItem('ar_view_mode', 'vault');
                    fetchMyRecords();
                    setShowMobileSidebar(false);
                  }}
                  className={`w-full py-2 px-3 rounded-lg border text-left text-xs font-mono transition-all cursor-pointer flex items-center justify-between ${
                    viewMode === 'vault'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-semibold'
                      : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:text-white'
                  }`}
                >
                  <span>📁 My Context Records</span>
                  <span className="text-[10px] opacity-60">({myRecords.length})</span>
                </button>
                <button
                  onClick={() => {
                    setViewMode('team');
                    localStorage.setItem('ar_view_mode', 'team');
                    setShowMobileSidebar(false);
                  }}
                  className={`w-full py-2 px-3 rounded-lg border text-left text-xs font-mono transition-all cursor-pointer flex items-center justify-between ${
                    viewMode === 'team'
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 font-semibold'
                      : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:text-white'
                  }`}
                >
                  <span>👥 Team Workspaces</span>
                  <span className="text-[10px] opacity-60">({teams.length})</span>
                </button>
              </div>
            </div>

            {/* Workspaces */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/40 text-[10px] tracking-wider uppercase font-semibold">
                  Workspaces ({teams.length})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setShowMobileSidebar(false);
                      setShowJoinModal(true);
                    }}
                    className="text-[10px] text-cyan-400 cursor-pointer"
                  >
                    Join
                  </button>
                  <span className="text-white/20">•</span>
                  <button
                    onClick={() => {
                      setShowMobileSidebar(false);
                      setShowCreateTeamModal(true);
                    }}
                    className="text-[10px] text-white/60 cursor-pointer"
                  >
                    + New
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTeam(t);
                      setViewMode('team');
                      localStorage.setItem('ar_view_mode', 'team');
                      localStorage.setItem('ar_active_team_id', t.id);
                      setShowMobileSidebar(false);
                    }}
                    className={`w-full py-1.5 px-2.5 rounded-lg border text-left text-xs font-mono truncate transition-all cursor-pointer ${
                      activeTeam?.id === t.id && viewMode === 'team'
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-medium'
                        : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:text-white'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Adapters */}
            <div>
              <span className="text-white/40 text-[10px] tracking-wider uppercase font-semibold block mb-2">
                Agent Adapters
              </span>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'all', label: 'All agents' },
                  { id: 'claude', label: 'Claude Code' },
                  { id: 'cursor', label: 'Cursor' },
                  { id: 'codex', label: 'Codex' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setAgent(id);
                      setShowMobileSidebar(false);
                    }}
                    className={`w-full py-1.5 px-2.5 rounded-lg border text-left text-xs font-mono transition-all cursor-pointer ${
                      agent === id
                        ? 'bg-white/[0.08] border-white/20 text-white font-medium'
                        : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:text-white'
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