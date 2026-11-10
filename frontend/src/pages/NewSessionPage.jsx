import { Link, useNavigate } from 'react-router-dom';

export default function NewSessionPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
      {/* Topbar */}
      <header className="glass-dark border-b border-white/[0.06] sticky top-0 z-30 px-5 sm:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            ← Back to Feed
          </button>
          <div className="h-4 w-px bg-white/[0.08]" />
          <span className="text-xs font-mono text-white/60">Local Session Guide</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-10 space-y-8">
        <div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/20">
            PRD §8.1 Local-First Architecture
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-3">
            Capturing an AI Coding Session
          </h1>
          <p className="text-sm text-white/50 leading-relaxed mt-1">
            AgentRelay is local-first. You do not create sessions through the browser; instead, the local CLI watcher automatically intercepts transcripts from your opted-in project folders.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 font-mono text-xs">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#111111] space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-[11px] font-bold flex items-center justify-center">1</span>
              <h3 className="font-semibold text-white">Scope Your Project Folder</h3>
            </div>
            <p className="text-white/50 font-sans text-xs">
              Tell AgentRelay which directories are allowed. Folders outside your scope are never read or touched.
            </p>
            <pre className="p-3 rounded-xl bg-black/60 border border-white/[0.06] text-emerald-400 overflow-x-auto select-all">
              agentrelay scope add ~/your-repo-folder
            </pre>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#111111] space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-[11px] font-bold flex items-center justify-center">2</span>
              <h3 className="font-semibold text-white">Work With Your AI Coding Agent</h3>
            </div>
            <p className="text-white/50 font-sans text-xs">
              Run Claude Code, Cursor, Windsurf, or Aider as you normally do. The AgentRelay background watcher detects appended lines and redacts planted secrets deterministically.
            </p>
            <pre className="p-3 rounded-xl bg-black/60 border border-white/[0.06] text-white/80 overflow-x-auto">
              claude # or cursor / windsurf / aider
            </pre>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#111111] space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-[11px] font-bold flex items-center justify-center">3</span>
              <h3 className="font-semibold text-white">Review and Distill</h3>
            </div>
            <p className="text-white/50 font-sans text-xs">
              When the session ends, the local model distills it into an evidence-linked context record. Review the candidate record:
            </p>
            <pre className="p-3 rounded-xl bg-black/60 border border-white/[0.06] text-cyan-300 overflow-x-auto select-all">
              agentrelay review
            </pre>
          </div>

          {/* Step 4 */}
          <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#111111] space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-[11px] font-bold flex items-center justify-center">4</span>
              <h3 className="font-semibold text-white">Promote to Team Feed</h3>
            </div>
            <p className="text-white/50 font-sans text-xs">
              Mark the reviewed record shareable and promote it to this dashboard:
            </p>
            <pre className="p-3 rounded-xl bg-black/60 border border-white/[0.06] text-emerald-400 overflow-x-auto select-all">
              agentrelay share &lt;recordId&gt;{'\n'}agentrelay promote &lt;recordId&gt; --team &lt;teamId&gt;
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <Link
            to="/install"
            className="text-xs text-white/50 hover:text-white underline underline-offset-4"
          >
            Need help installing the CLI? View Install Docs →
          </Link>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-white text-black hover:bg-white/90 transition-colors cursor-pointer"
          >
            Back to Team Feed
          </button>
        </div>
      </main>
    </div>
  );
}
