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
  const [copiedRecordId, setCopiedRecordId] = useState(null);
  const [copiedPromoteCmd, setCopiedPromoteCmd] = useState(null);

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
        setRecords(recordList.filter(r => !r.isWithdrawn && !r.withdrawn).map(formatRecord));
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

  const activeRecords = viewMode === 'vault' ? myRecords : records;
  const filtered = activeRecords.filter((s) => {
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

          {/* Mode Switcher Pill: Personal Vault vs Team Workspace */}
          <div className="flex items-center bg-[#111111] p-0.5 rounded-lg border border-white/[0.1] text-xs">
            <button
              onClick={() => {
                setViewMode('vault');
                localStorage.setItem('ar_view_mode', 'vault');
                fetchMyRecords();
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'vault'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-white/50 hover:text-white'
              }`}
              title="Personal Context Vault — all records you authored"
            >
              <span>📁</span>
              <span>My Vault</span>
              <span className="text-[10px] font-mono opacity-60">({myRecords.length})</span>
            </button>
            <button
              onClick={() => {
                setViewMode('team');
                localStorage.setItem('ar_view_mode', 'team');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
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

          <div className="h-3.5 w-px bg-white/[0.08] hidden sm:block" />

          {/* Team Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={activeTeam?.id || ''}
              onChange={(e) => {
                const selected = teams.find(t => t.id === e.target.value);
                if (selected) {
                  setActiveTeam(selected);
                  localStorage.setItem('ar_active_team_id', selected.id);
                }
              }}
              className="bg-[#111111] border border-white/[0.10] rounded-lg px-2.5 py-1 text-xs font-medium text-white/70 focus:outline-hidden cursor-pointer hover:border-white/25 transition-colors max-w-[160px] truncate"
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

            {/* Join Team Button */}
            <button
              onClick={() => setShowJoinModal(true)}
              className="text-[11px] font-mono px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
              title="Join a team workspace using an invite token"
            >
              <span>🔗</span>
              <span className="hidden sm:inline">Join Team</span>
            </button>

            {/* Create Team Button */}
            <button
              onClick={() => setShowCreateTeamModal(true)}
              className="text-[11px] font-mono px-2 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] text-white/70 transition-colors flex items-center gap-1 cursor-pointer"
              title="Create a new isolated team workspace"
            >
              <span>+</span>
              <span className="hidden sm:inline">New Team</span>
            </button>

            {activeTeam && (
              <button
                onClick={handleCreateInvite}
                className="text-[11px] font-mono px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
                title="Generate invite token for teammate"
              >
                <span>✉️</span>
                <span className="hidden md:inline">Invite Token</span>
              </button>
            )}

            {activeTeam && (
              <button
                onClick={() => handleDeleteTeam(activeTeam)}
                className="text-[11px] font-mono px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                title={`Delete workspace "${activeTeam.name}"`}
              >
                <span>🗑️</span>
                <span className="hidden lg:inline">Delete Workspace</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* CLI Commands Reference Panel Button */}
          <button
            onClick={() => setShowCliModal(true)}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer"
            title="Open CLI Commands Reference & Terminal Cheat Sheet"
          >
            <span>⚡</span>
            <span className="hidden sm:inline">Commands</span>
          </button>

          {/* Full Documentation Link */}
          <Link
            to="/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] text-white/80 transition-colors cursor-pointer"
            title="Open Full AgentRelay Documentation"
          >
            <span>📖</span>
            <span className="hidden sm:inline">Docs</span>
            <span className="text-[10px] text-white/40">↗</span>
          </Link>

          {/* Inbox Button */}
          <button
            onClick={() => { setShowInboxModal(true); fetchInbox(); }}
            className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] text-white/80 transition-colors relative cursor-pointer"
          >
            <span>📥</span>
            <span className="hidden sm:inline">Inbox</span>
            {pendingInboxCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-400 text-black text-[10px] font-bold">
                {pendingInboxCount}
              </span>
            )}
          </button>

          {/* Audit Trail Button */}
          <button
            onClick={handleOpenAudit}
            className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] text-white/80 transition-colors cursor-pointer"
          >
            <span>🛡️</span>
            <span className="hidden md:inline">Audit Trail</span>
          </button>

          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-white/50 pl-2 border-l border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LCP Cloud Server
          </div>

          <button
            onClick={logout}
            className="text-[12px] text-white/40 hover:text-white/70 transition-colors cursor-pointer pl-1"
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
          {/* Main Vault Switcher in Sidebar */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-2 space-y-1">
            <button
              onClick={() => {
                setViewMode('vault');
                localStorage.setItem('ar_view_mode', 'vault');
                fetchMyRecords();
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                viewMode === 'vault'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📁</span>
                <span>My Context Records</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                viewMode === 'vault' ? 'bg-emerald-400 text-black font-bold' : 'bg-white/[0.06] text-white/50'
              }`}>
                {myRecords.length}
              </span>
            </button>

            <button
              onClick={() => {
                setViewMode('team');
                localStorage.setItem('ar_view_mode', 'team');
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                viewMode === 'team'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">👥</span>
                <span>Team Workspaces</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                viewMode === 'team' ? 'bg-cyan-400 text-black font-bold' : 'bg-white/[0.06] text-white/50'
              }`}>
                {teams.length}
              </span>
            </button>
          </div>

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
                    viewMode === 'team' && activeTeam?.id === t.id
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveTeam(t);
                      localStorage.setItem('ar_active_team_id', t.id);
                      setViewMode('team');
                      localStorage.setItem('ar_view_mode', 'team');
                    }}
                    className="flex-1 text-left text-xs truncate flex items-center justify-between cursor-pointer mr-1"
                  >
                    <span className="truncate">{t.name}</span>
                    {viewMode === 'team' && activeTeam?.id === t.id && (
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
        <main className="flex-1 flex flex-col gap-4">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-white/90 tracking-tight">
                  {viewMode === 'vault' ? 'My Context Records' : (activeTeam ? activeTeam.name : 'Team Context Feed')}
                </h1>
                {viewMode === 'vault' ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Personal Vault • {myRecords.length} record(s)
                  </span>
                ) : (
                  activeTeam && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-white/50 border border-white/[0.06]">
                      ID: {activeTeam.id}
                    </span>
                  )
                )}
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                {viewMode === 'vault'
                  ? 'Your permanent session history, decisions, and distilled cards (persists across all teams)'
                  : 'Promoted AI session records live on LCP backend'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={viewMode === 'vault' ? "Search your context records…" : "Search team records…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-60 px-3.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-white/20 text-xs text-white/80 placeholder-white/25 outline-hidden transition-all font-sans"
              />
              {viewMode === 'team' && activeTeam && (
                <button
                  onClick={() => handleDeleteTeam(activeTeam)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  title={`Delete workspace "${activeTeam.name}"`}
                >
                  <span>🗑️</span>
                  <span className="hidden md:inline">Delete Workspace</span>
                </button>
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
            <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#111111] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">⚡</span>
                <span className="text-white/70 font-sans">
                  Promote local record to <strong className="text-white font-mono">{activeTeam?.name || 'this team'}</strong>:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-[11px] text-emerald-400 bg-black/60 px-2.5 py-1 rounded-md border border-white/[0.06] select-all truncate">
                  agentrelay promote &lt;recordId&gt; --team {activeTeam?.id || '&lt;teamId&gt;'}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`agentrelay promote <recordId> --team ${activeTeam?.id || '<teamId>'}`);
                    setCopiedPromoteCmd('global');
                    setTimeout(() => setCopiedPromoteCmd(null), 2000);
                  }}
                  className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/70 text-[10px] shrink-0 cursor-pointer"
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
                    ? 'When you run the AgentRelay background watcher, all distilled coding sessions are automatically backed up here.'
                    : 'Add code context from your terminal, or join another team workspace using an invite token.'}
                </p>
              </div>

              <div className="w-full max-w-lg p-3 rounded-xl bg-black/60 border border-white/[0.08] font-mono text-xs text-left space-y-1 text-emerald-400">
                <div className="text-white/40 text-[10px]"># 1. Scope project & capture session</div>
                <div>agentrelay scope add ~/your-repo</div>
                <div className="text-white/40 text-[10px] pt-1">
                  {viewMode === 'vault' ? '# 2. Distill session with background daemon' : '# 2. Promote record into this team workspace'}
                </div>
                <div>{viewMode === 'vault' ? 'agentrelay daemon' : `agentrelay promote <recordId> --team ${activeTeam?.id || '<teamId>'}`}</div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                {viewMode === 'vault' ? (
                  <button
                    onClick={() => {
                      setViewMode('team');
                      localStorage.setItem('ar_view_mode', 'team');
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>👥</span>
                    <span>Browse Team Workspaces</span>
                  </button>
                ) : (
                  <>
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
                  </>
                )}
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
                  onClick={() => navigate(`/sessions/${s.id}?teamId=${s.teamId || activeTeam?.id || ''}`)}
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
                    <div className="my-2.5 p-2 rounded-lg bg-black/50 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-white/30 text-[10px] uppercase tracking-wider shrink-0">Record ID:</span>
                        <code className="text-cyan-300 font-semibold select-all text-[11px] truncate max-w-[200px] sm:max-w-none">{s.id}</code>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => handleCopyRecordId(e, s.id)}
                          className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white text-[10px] transition-colors cursor-pointer"
                          title="Copy Record ID"
                        >
                          {copiedRecordId === s.id ? '✓ ID Copied' : 'Copy ID'}
                        </button>
                        <button
                          onClick={(e) => handleCopyPromoteCmd(e, s.id)}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] border border-emerald-500/20 transition-colors cursor-pointer"
                          title="Copy promote command for terminal"
                        >
                          {copiedPromoteCmd === s.id ? '✓ Cmd Copied' : 'Copy Promote Cmd'}
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

                    <div className="flex items-center gap-3 text-[11px] font-mono text-white/30 pt-2 border-t border-white/[0.04]">
                      <span>📁 {s.filesCount} file(s) touched</span>
                      <span>💡 {s.decisionsCount} decision(s)</span>
                      <span>🏷️ {s.projectTag}</span>
                      {viewMode === 'vault' ? (
                        <span className="ml-auto text-[10px] text-emerald-400/80 font-mono">
                          Vault Preserved
                        </span>
                      ) : (
                        <span className="ml-auto text-[10px] text-emerald-400/80">LCP Record Verified</span>
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
            <div className="flex-1 overflow-y-auto pr-1">
              {auditEvents.length === 0 ? (
                <div className="py-12 text-center text-xs text-white/30">
                  {auditLoading ? 'Loading audit trail…' : 'No audit events recorded for this team.'}
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono">
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
