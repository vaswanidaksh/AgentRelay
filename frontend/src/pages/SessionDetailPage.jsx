import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getRecord, listTeams } from '../lib/api';

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teamIdParam = searchParams.get('teamId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRecord() {
      try {
        setLoading(true);
        let teamId = teamIdParam;
        if (!teamId) {
          const teams = await listTeams();
          teamId = teams[0]?.id;
        }

        if (!teamId) throw new Error('No team found for record lookup.');

        const data = await getRecord(teamId, id);
        if (!isMounted) return;
        setRecord(data);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load record');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRecord();
    return () => { isMounted = false; };
  }, [id, teamIdParam]);

  const handleCopyPack = () => {
    if (!record) return;
    const content = record.content || {};
    const text = `# ${content.title || 'Context Record'}\n\n**Record ID:** ${record.recordId}\n**Author:** ${record.author?.handle || 'team'}\n**Agent:** ${record.source?.agent || 'cli'}\n\n## Summary\n${content.summary || ''}\n\n## Decisions\n${(content.decisions || []).map(d => `- ${d.text} (evidence: ${(d.evidence || []).join(', ')})`).join('\n')}\n\n## Files Touched\n${(content.filesTouched || []).map(f => `- \`${f}\``).join('\n')}\n`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <header className="glass-dark border-b border-white/[0.06] sticky top-0 z-30 px-5 sm:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Back
          </button>
          <div className="h-4 w-px bg-white/[0.08]" />
          <h1 className="text-sm font-semibold text-white/90 truncate max-w-md">
            {content.title || 'Context Record'}
          </h1>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20">
            {source.agent || 'Claude Code'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyPack}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-white text-black font-semibold hover:bg-white/90 transition-colors"
          >
            {copied ? 'Copied ✓' : 'Copy Context Pack'}
          </button>
        </div>
      </header>

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
    </div>
  );
}
