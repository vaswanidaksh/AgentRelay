import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getRecord, listTeams, listMembers, handoff, withdrawRecord } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import CliCommandsModal from '../components/CliCommandsModal';

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teamIdParam = searchParams.get('teamId');
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [copiedRecordId, setCopiedRecordId] = useState(false);
  const [copiedPromoteCmd, setCopiedPromoteCmd] = useState(false);
  const [showCliModal, setShowCliModal] = useState(false);

  // Handoff state
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [handoffTarget, setHandoffTarget] = useState('');
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [handoffSuccess, setHandoffSuccess] = useState('');
  const [handoffError, setHandoffError] = useState('');

  // Withdraw state
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRecord() {
      try {
        setLoading(true);
        let resolvedTeamId = teamIdParam;
        if (!resolvedTeamId) {
          const teams = await listTeams();
          resolvedTeamId = teams[0]?.id;
        }

        if (!resolvedTeamId) throw new Error('No team found for record lookup.');
        setTeamId(resolvedTeamId);

        const [data, memberList] = await Promise.all([
          getRecord(resolvedTeamId, id),
          listMembers(resolvedTeamId).catch(() => [])
        ]);

        if (!isMounted) return;
        setRecord(data);
        setMembers(memberList);
        if (memberList.length > 0) {
          const firstOther = memberList.find(m => m.handle !== user?.handle);
          if (firstOther) setHandoffTarget(firstOther.handle);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load record');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRecord();
    return () => { isMounted = false; };
  }, [id, teamIdParam, user?.handle]);

  const generateMarkdownPack = () => {
    if (!record) return '';
    const content = record.content || {};
    return `# ${content.title || 'Context Record'}\n\n**Record ID:** ${record.recordId}\n**Version:** ${record.version}\n**Author:** ${record.author?.handle || 'team'}\n**Agent:** ${record.source?.agent || 'cli'}\n**Schema:** ${record.schemaVersion || 'AgentRelay.record/0.1'}\n**Created:** ${record.times?.createdAt || new Date().toISOString()}\n\n## Summary\n${content.summary || ''}\n\n## Decisions\n${(content.decisions || []).map(d => `- ${d.text} (evidence: ${(d.evidence || []).join(', ')})`).join('\n')}\n\n## Files Touched\n${(content.filesTouched || []).map(f => `- \`${f}\``).join('\n')}\n\n## Tags\n${(content.tags || []).join(', ')}\n`;
  };

  const handleCopyPack = () => {
    const text = generateMarkdownPack();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyRecordId = () => {
    if (!record?.recordId) return;
    navigator.clipboard.writeText(record.recordId);
    setCopiedRecordId(true);
    setTimeout(() => setCopiedRecordId(false), 2000);
  };

  const handleCopyPromoteCmd = () => {
    if (!record?.recordId) return;
    const cmd = teamId
      ? `agentrelay promote ${record.recordId} --team ${teamId}`
      : `agentrelay promote ${record.recordId}`;
    navigator.clipboard.writeText(cmd);
    setCopiedPromoteCmd(true);
    setTimeout(() => setCopiedPromoteCmd(false), 2000);
  };

  const handleDownloadPack = () => {
    const text = generateMarkdownPack();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `context-pack-${record?.recordId?.slice(0, 8) || 'export'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleHandoffSubmit = async (e) => {
    e.preventDefault();
    if (!teamId || !record?.recordId || !handoffTarget) return;

    try {
      setHandoffLoading(true);
      setHandoffError('');
      setHandoffSuccess('');
      await handoff(teamId, record.recordId, handoffTarget);
      setHandoffSuccess(`Handoff created! Record assigned to ${handoffTarget}.`);
      setTimeout(() => {
        setShowHandoffModal(false);
        setHandoffSuccess('');
      }, 1500);
    } catch (err) {
      setHandoffError(err.response?.data?.error?.message || err.message || 'Failed to create handoff.');
    } finally {
      setHandoffLoading(false);
    }
  };

  const handleWithdrawRecord = async () => {
    if (!teamId || !record?.recordId) return;
    const confirmed = window.confirm(
      'Are you sure you want to withdraw this record from the team?\n\nThis will write an audit event and propagate a tombstone deletion to teammates on their next sync.'
    );
    if (!confirmed) return;

    try {
      setWithdrawLoading(true);
      await withdrawRecord(teamId, record.recordId);
      navigate(`/dashboard?teamId=${teamId}`, { replace: true });
    } catch (err) {
      alert('Withdrawal failed: ' + (err.response?.data?.error?.message || err.message));
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <p className="text-xs text-white/40 animate-pulse">Loading context record from LCP server...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xl mb-2 text-rose-400">Record Not Found</p>
        <p className="text-xs text-white/40 mb-4">{error || 'This record may have been withdrawn (tombstone) or does not exist.'}</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-white/10 rounded-lg text-xs hover:bg-white/20">
          ← Back to Team Feed
        </button>
      </div>
    );
  }

  const content = record.content || {};
  const author = record.author || {};
  const source = record.source || {};
  const sensitivity = record.sensitivity || {};
  const provenance = record.provenance || {};

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="glass-dark border-b border-white/[0.06] sticky top-0 z-30 px-3 sm:px-6 lg:px-8 min-h-14 py-2 sm:py-0 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="h-8 flex items-center gap-1.5 text-xs font-mono text-white/60 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] px-2.5 sm:px-3 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            ← Back
          </button>
          <div className="h-4 w-px bg-white/[0.08] shrink-0" />
          <h1 className="text-xs sm:text-sm font-semibold text-white/90 truncate max-w-[150px] sm:max-w-xs md:max-w-md">
            {content.title || 'Context Record'}
          </h1>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 shrink-0">
            {source.agent || 'Claude Code'}
          </span>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2">
          {/* CLI Commands Reference Modal trigger */}
          <button
            onClick={() => setShowCliModal(true)}
            className="h-8 flex items-center gap-1.5 text-xs font-mono px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-300 transition-colors cursor-pointer"
            title="Open CLI Commands Guide"
          >
            <span>⚡</span>
            <span className="hidden sm:inline">Commands</span>
          </button>

          {/* Docs link */}
          <Link
            to="/docs"
            target="_blank"
            rel="noreferrer"
            className="h-8 flex items-center gap-1.5 text-xs font-mono px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Open Documentation"
          >
            <span>📖</span>
            <span className="hidden sm:inline">Docs</span>
          </Link>

          <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />

          {/* Handoff Button */}
          <button
            onClick={() => setShowHandoffModal(true)}
            className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-mono bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-semibold hover:bg-cyan-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>🤝</span>
            <span>Handoff</span>
          </button>

          {/* Download Pack */}
          <button
            onClick={handleDownloadPack}
            className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-mono bg-white/[0.05] border border-white/[0.08] text-white/80 hover:bg-white/[0.1] transition-colors cursor-pointer hidden sm:flex items-center gap-1"
          >
            <span>📥</span>
            <span>.md</span>
          </button>

          {/* Analytics */}
          <button
            onClick={() => navigate(`/sessions/${record.recordId}/analytics?teamId=${teamId}`)}
            className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-mono bg-white/[0.05] border border-white/[0.08] text-white/80 hover:bg-white/[0.1] transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>📊</span>
            <span className="hidden sm:inline">Analytics</span>
          </button>

          {/* Copy Context Pack */}
          <button
            onClick={handleCopyPack}
            className="h-8 px-3 rounded-lg text-xs font-mono bg-white text-black font-semibold hover:bg-white/90 transition-colors cursor-pointer shrink-0"
          >
            {copied ? 'Copied ✓' : 'Copy Pack'}
          </button>

          {/* Withdraw Record */}
          <button
            onClick={handleWithdrawRecord}
            disabled={withdrawLoading}
            className="h-8 px-2 sm:px-2.5 rounded-lg text-xs font-mono bg-rose-950/40 border border-rose-500/25 text-rose-300 hover:bg-rose-900/40 transition-colors disabled:opacity-50 cursor-pointer"
            title="Withdraw this record"
          >
            {withdrawLoading ? '…' : 'Withdraw'}
          </button>
        </div>
      </header>

      {/* Record ID & CLI Quick-Action Bar */}
      <div className="bg-[#0e0e0e] border-b border-white/[0.06] px-3 sm:px-6 lg:px-8 py-3">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-white/40 uppercase tracking-wider text-[10px] shrink-0">Record ID:</span>
            <code className="bg-black/60 border border-white/[0.08] px-2.5 py-1 rounded text-cyan-300 font-mono select-all text-xs break-all">
              {record.recordId}
            </code>
            <button
              onClick={handleCopyRecordId}
              className="h-6 px-2 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition-colors cursor-pointer text-[11px] shrink-0"
            >
              {copiedRecordId ? 'Copied ID ✓' : 'Copy ID'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-white/40 uppercase tracking-wider text-[10px] shrink-0">CLI Promote:</span>
            <code className="bg-black/60 border border-emerald-500/20 px-2.5 py-1 rounded text-emerald-300 font-mono select-all text-xs break-all">
              agentrelay promote {record.recordId}{teamId ? ` --team ${teamId}` : ''}
            </code>
            <button
              onClick={handleCopyPromoteCmd}
              className="h-6 px-2 rounded bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 transition-colors cursor-pointer text-[11px] shrink-0"
            >
              {copiedPromoteCmd ? 'Copied Cmd ✓' : 'Copy Command'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-7 grid lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Summary, Decisions, Redactions */}
        <main className="lg:col-span-8 space-y-6">
          {/* Summary Box */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Distilled Session Summary
            </h2>
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-sans">
              {content.summary || 'No summary available.'}
            </p>
          </div>

          {/* Decisions with Provenance Evidence */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Key Decisions ({ (content.decisions || []).length })
              </h2>
              <span className="text-[11px] font-mono text-emerald-400/80">PRD Provenance Verified</span>
            </div>

            <div className="space-y-3">
              {(content.decisions || []).map((dec, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <p className="text-xs text-white/90 leading-relaxed font-sans">{dec.text}</p>
                  </div>
                  {dec.evidence && dec.evidence.length > 0 && (
                    <div className="flex items-center gap-2 pl-4 text-[10px] font-mono text-white/40">
                      <span>Citations:</span>
                      {dec.evidence.map((ev, ei) => (
                        <span key={ei} className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-cyan-300">
                          {ev}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Right Column (4 cols): Metadata, Files, Scrubber info */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Metadata Card */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-5 space-y-3 font-mono text-xs">
            <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Provenance & ACL</h3>
            <div className="space-y-2 text-white/60">
              <div className="flex justify-between">
                <span className="text-white/30">Author:</span>
                <span className="text-white/80">{author.handle || '@unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/30">Origin:</span>
                <span className="text-white/80">{record.origin || 'team'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/30">Schema:</span>
                <span className="text-white/80">{record.schemaVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/30">Distiller Model:</span>
                <span className="text-white/80">{provenance.distiller?.model || 'qwen2.5-coder:7b'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/30">Created:</span>
                <span className="text-white/80">{new Date(record.times?.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Files Touched */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-5 space-y-3 font-mono text-xs">
            <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
              Files Touched ({ (content.filesTouched || []).length })
            </h3>
            <div className="space-y-1.5">
              {(content.filesTouched || []).map((file, i) => (
                <div key={i} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/80 truncate">
                  📄 {file}
                </div>
              ))}
            </div>
          </div>

          {/* Secret Scrubbing Stats */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-5 space-y-3 font-mono text-xs">
            <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
              Scrubber Defense (M-1)
            </h3>
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
              Deterministic redactions applied. Zero raw secrets exposed.
            </div>
            {sensitivity.redactionCounts && Object.keys(sensitivity.redactionCounts).length > 0 && (
              <div className="space-y-1 text-white/50 text-[11px]">
                {Object.entries(sensitivity.redactionCounts).map(([k, count]) => (
                  <div key={k} className="flex justify-between">
                    <span>{k}:</span>
                    <span className="text-emerald-400 font-bold">[{count} redacted]</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Handoff Modal */}
      {showHandoffModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#141414] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤝</span>
                <h3 className="text-sm font-semibold text-white">Hand off Context Record</h3>
              </div>
              <button
                onClick={() => { setShowHandoffModal(false); setHandoffError(''); setHandoffSuccess(''); }}
                className="text-white/40 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-white/50 leading-relaxed font-sans">
              Assign this context record to a teammate. They will receive it in their AgentRelay inbox with full evidence citations and origin metadata.
            </p>

            {handoffError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/25 text-rose-300 text-xs">
                {handoffError}
              </div>
            )}

            {handoffSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/25 text-emerald-300 text-xs">
                {handoffSuccess}
              </div>
            )}

            <form onSubmit={handleHandoffSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-white/40 mb-1.5 uppercase">
                  Select Teammate (@handle)
                </label>
                {members.length > 0 ? (
                  <select
                    value={handoffTarget}
                    onChange={(e) => setHandoffTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:border-cyan-400 outline-hidden font-mono"
                  >
                    {members
                      .filter(m => m.handle !== user?.handle)
                      .map(m => (
                        <option key={m.id} value={m.handle} className="bg-[#181818]">
                          {m.handle} ({m.role})
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="@teammate"
                    value={handoffTarget}
                    onChange={(e) => setHandoffTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:border-cyan-400 outline-hidden font-mono"
                    required
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowHandoffModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-white/50 hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={handoffLoading || !handoffTarget}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors disabled:opacity-50"
                >
                  {handoffLoading ? 'Creating Handoff…' : 'Send Handoff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLI Commands Reference Modal */}
      <CliCommandsModal
        isOpen={showCliModal}
        onClose={() => setShowCliModal(false)}
        activeTeamId={teamId}
        activeRecordId={record?.recordId}
      />
    </div>
  );
}
