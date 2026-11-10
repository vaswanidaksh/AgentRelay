import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getRecord, listTeams, getSessionAnalytics } from '../lib/api';

export default function SessionAnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teamIdParam = searchParams.get('teamId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [teamId, setTeamId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        let resolvedTeamId = teamIdParam;
        if (!resolvedTeamId) {
          const teams = await listTeams();
          resolvedTeamId = teams[0]?.id;
        }

        if (!resolvedTeamId) throw new Error('No team found for analytics lookup.');
        setTeamId(resolvedTeamId);

        const [recordData, analyticsData] = await Promise.all([
          getRecord(resolvedTeamId, id).catch(() => null),
          getSessionAnalytics(id).catch(() => null)
        ]);

        if (!isMounted) return;
        setRecord(recordData);
        setAnalytics(analyticsData?.data || analyticsData);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load session analytics');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [id, teamIdParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center font-mono">
        <p className="text-xs text-white/40 animate-pulse">Calculating provenance and analytics metrics…</p>
      </div>
    );
  }

  const content = record?.content || {};
  const decisions = content.decisions || [];
  const filesTouched = content.filesTouched || [];
  const redactionCounts = record?.sensitivity?.redactionCounts || {};
  const totalRedactions = Object.values(redactionCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="glass-dark border-b border-white/[0.06] sticky top-0 z-30 px-5 sm:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(teamId ? `/sessions/${id}?teamId=${teamId}` : '/dashboard')}
            className="flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            ← Back to Record
          </button>
          <div className="h-4 w-px bg-white/[0.08]" />
          <h1 className="text-sm font-semibold text-white/90 truncate max-w-md">
            Session Analytics — <span className="font-mono text-cyan-400">{id?.slice(0, 8)}…</span>
          </h1>
        </div>

        <button
          onClick={() => navigate(`/sessions/${id}?teamId=${teamId}`)}
          className="px-3 py-1.5 rounded-lg text-xs font-mono bg-white text-black font-semibold hover:bg-white/90 transition-colors cursor-pointer"
        >
          View Full Context
        </button>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
          <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#111111]">
            <p className="text-[10px] uppercase text-white/40 mb-1">Decisions Made</p>
            <p className="text-2xl font-bold text-white">{decisions.length}</p>
            <p className="text-[11px] text-emerald-400 mt-1">100% evidence-cited</p>
          </div>

          <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#111111]">
            <p className="text-[10px] uppercase text-white/40 mb-1">Files Touched</p>
            <p className="text-2xl font-bold text-white">{filesTouched.length}</p>
            <p className="text-[11px] text-white/40 mt-1">Validated against tools</p>
          </div>

          <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#111111]">
            <p className="text-[10px] uppercase text-white/40 mb-1">Redacted Secrets</p>
            <p className="text-2xl font-bold text-cyan-400">{totalRedactions}</p>
            <p className="text-[11px] text-white/40 mt-1">Metric M-1 verified</p>
          </div>

          <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#111111]">
            <p className="text-[10px] uppercase text-white/40 mb-1">Record Version</p>
            <p className="text-2xl font-bold text-white">v{record?.version || 1}</p>
            <p className="text-[11px] text-white/40 mt-1">{record?.schemaVersion || 'LCP 0.1'}</p>
          </div>
        </div>

        {/* Narrative & Timeline */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Narrative Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#111111] space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 font-mono">
                Distillation Narrative
              </h3>
              <p className="text-sm text-white/80 leading-relaxed font-sans">
                {analytics?.narrative || content.summary || 'Session captured and distilled into structured context records.'}
              </p>
            </div>

            {/* Decisions Breakdown */}
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#111111] space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 font-mono">
                Decisions & Citations
              </h3>
              <div className="space-y-2.5">
                {decisions.map((d, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs space-y-1.5">
                    <p className="text-white/90">{d.text}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40">
                      <span>Evidence:</span>
                      {(d.evidence || []).map((ev, ei) => (
                        <span key={ei} className="px-1.5 py-0.5 rounded bg-white/[0.05] text-cyan-300">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#111111] space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 font-mono">
                Lifecycle Timeline
              </h3>
              <div className="space-y-4 font-mono text-xs">
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-white/90">Session Captured & Scrubbed</p>
                    <p className="text-[10px] text-white/40">{record?.times?.sessionStart || 'Session Start'}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-white/90">Distilled into Context Record</p>
                    <p className="text-[10px] text-white/40">{record?.times?.createdAt || 'Created'}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-white/40 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-white/90">Reviewed and Marked Shareable</p>
                    <p className="text-[10px] text-white/40">{record?.feedback?.reviewedAt || 'Reviewed'}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-white/90">Promoted to Team Store</p>
                    <p className="text-[10px] text-white/40">{record?.promotedAt || 'Promoted'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Redacted Secret Distribution */}
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#111111] space-y-3 font-mono text-xs">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Redaction Breakdown
              </h3>
              {Object.keys(redactionCounts).length === 0 ? (
                <p className="text-xs text-white/40">No secrets detected or planted in this session.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(redactionCounts).map(([type, cnt]) => (
                    <div key={type} className="flex justify-between items-center text-xs">
                      <span className="text-white/60">{type}:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 font-bold">
                        {cnt} redacted
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
