import { useState, useEffect } from 'react';

/**
 * TerminalAgentTutorialModal — Explains the parallel developer workflow:
 * Running coding agents (Codex, Claude Code, Cursor, Aider) in Terminal 1
 * while AgentRelay CLI daemon runs in Terminal 2 to capture & distill.
 */
export default function TerminalAgentTutorialModal({ isOpen, onClose, activeTeamId }) {
  const [copiedId, setCopiedId] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [activeTab, setActiveTab] = useState('workflow'); // 'workflow' | 'commands' | 'architecture'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('ar_tutorial_seen', 'true');
    }
    onClose();
  };

  const targetTeam = activeTeamId || '<teamId>';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-3xl my-auto rounded-2xl border border-white/[0.12] bg-[#0E0E0E] shadow-2xl shadow-cyan-950/20 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] bg-[#141414] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-lg shadow-inner">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  How AgentRelay Works
                </h2>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  Interactive Tutorial
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Terminal workflow guide for running AI Coding Agents with AgentRelay
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-white/50 hover:text-white flex items-center justify-center transition-colors text-sm cursor-pointer"
            title="Close tutorial (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 border-b border-white/[0.06] bg-[#111111] flex items-center gap-4 text-xs font-mono shrink-0">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`pb-2.5 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'workflow'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-white/40 hover:text-white/80'
            }`}
          >
            1. Dual-Terminal Workflow
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`pb-2.5 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'commands'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-white/40 hover:text-white/80'
            }`}
          >
            2. Step-by-Step CLI Commands
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`pb-2.5 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'architecture'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-white/40 hover:text-white/80'
            }`}
          >
            3. Privacy & Zero-Trust Architecture
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-white/80 font-sans leading-relaxed">
          {activeTab === 'workflow' && (
            <div className="space-y-5">
              {/* Core concept explanation banner */}
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs font-mono uppercase tracking-wider">
                  <span>⚡ Core Concept: The Two-Terminal Setup</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed font-sans">
                  AgentRelay does not replace your AI assistant. Instead, you run your AI coding tool (<strong>OpenAI Codex, Claude Code, Cursor, Windsurf, or Aider</strong>) in one terminal, while the <strong>AgentRelay Daemon</strong> runs in another terminal to silently capture, scrub, and distill your breakthroughs in real-time.
                </p>
              </div>

              {/* Visual Split Terminal Representation */}
              <div className="space-y-2">
                <div className="text-xs font-mono text-white/40 flex items-center justify-between">
                  <span>TERMINAL DISPLAY SIMULATION</span>
                  <span>TWO PARALLEL PROCESSES</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                  {/* Terminal 1: The Coding Agent */}
                  <div className="rounded-xl border border-white/[0.08] bg-black/80 p-3.5 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                        <span className="text-white/60 ml-1 font-semibold">Terminal 1: Coding Agent</span>
                      </div>
                      <span className="text-amber-400/90 text-[10px]">Active Chat</span>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-white/60">
                      <div className="text-white/30">$ cd ~/Documents/my-project</div>
                      <div className="text-white/90 text-cyan-300">$ codex # or claude / cursor</div>
                      <div className="text-emerald-400">? Describe your task:</div>
                      <div className="text-white/80">&gt; Fix Docker build failure & port leak</div>
                      <div className="text-white/40 text-[10px]">• Editing server.js (+14 -2)</div>
                      <div className="text-white/40 text-[10px]">✔ Build passed and container healthy</div>
                    </div>
                    <div className="pt-2 border-t border-white/[0.04] text-[10px] text-white/40">
                      Your daily agent development continues untouched.
                    </div>
                  </div>

                  {/* Terminal 2: AgentRelay Watcher Daemon */}
                  <div className="rounded-xl border border-cyan-500/30 bg-[#061217] p-3.5 flex flex-col justify-between space-y-3 shadow-lg shadow-cyan-950/30">
                    <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
                        <span className="text-cyan-300 ml-1 font-semibold">Terminal 2: AgentRelay</span>
                      </div>
                      <span className="text-emerald-400 text-[10px] font-bold">DAEMON ACTIVE</span>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-white/70">
                      <div className="text-white/30">$ agentrelay daemon</div>
                      <div className="text-cyan-300">🤖 Watcher & distiller loop running...</div>
                      <div className="text-white/50">• Scoped Folders: 1 (/my-project)</div>
                      <div className="text-emerald-400">✔ Captured 39 scrubbed event(s)</div>
                      <div className="text-cyan-400">✔ Distilled 1 context record (rec_e82a)</div>
                      <div className="text-white/40 text-[10px]">Saved to ~/.agentrelay/store.db</div>
                    </div>
                    <div className="pt-2 border-t border-cyan-500/20 text-[10px] text-cyan-400/80">
                      Intercepts sessions & scrubs secrets deterministically.
                    </div>
                  </div>
                </div>
              </div>

              {/* What happens next */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#141414] space-y-2">
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>🚀</span>
                  <span>How to make cards appear permanently on this Dashboard:</span>
                </h4>
                <p className="text-xs text-white/60">
                  Once your agent solves the bug, promote the record from your terminal using:
                </p>
                <div className="p-2.5 rounded-lg bg-black/60 border border-white/[0.08] font-mono text-xs flex items-center justify-between">
                  <span className="text-emerald-400 select-all">
                    agentrelay promote &lt;recordId&gt; --team {targetTeam}
                  </span>
                  <button
                    onClick={() => handleCopy(`agentrelay promote <recordId> --team ${targetTeam}`, 'proto-cmd')}
                    className="px-2 py-1 rounded bg-white/[0.08] hover:bg-white/[0.15] text-[10px] font-mono text-white transition-colors"
                  >
                    {copiedId === 'proto-cmd' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-white/40">
                  The context card will instantly show up on your team feed, persisted offline and synced across your teammates.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'commands' && (
            <div className="space-y-4">
              <p className="text-xs text-white/60">
                Execute these four commands in your terminal to begin capturing and sharing AI sessions:
              </p>

              {/* Step 1 */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#121212] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-[10px] flex items-center justify-center font-mono">1</span>
                    <span>Initialize Local Environment</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">Run Once</span>
                </div>
                <p className="text-xs text-white/50">
                  Initializes your local SQLite database (~/.agentrelay) and verifies connection to your local Ollama SLM model (qwen2.5-coder:7b).
                </p>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/60 border border-white/[0.06] font-mono text-xs text-emerald-400">
                  <code>agentrelay init</code>
                  <button
                    onClick={() => handleCopy('agentrelay init', 'cmd-1')}
                    className="px-2 py-0.5 rounded bg-white/[0.08] hover:bg-white/[0.15] text-[10px] text-white"
                  >
                    {copiedId === 'cmd-1' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#121212] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-[10px] flex items-center justify-center font-mono">2</span>
                    <span>Login & Scope Your Project Directory</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">Per Project</span>
                </div>
                <p className="text-xs text-white/50">
                  Connect to your team backend and explicitly whitelist your repository folder. Folders outside your scope are strictly never monitored.
                </p>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-black/60 border border-white/[0.06] text-emerald-400">
                    <code>agentrelay login --token your_handle</code>
                    <button
                      onClick={() => handleCopy('agentrelay login --token your_handle', 'cmd-2a')}
                      className="px-2 py-0.5 rounded bg-white/[0.08] hover:bg-white/[0.15] text-[10px] text-white"
                    >
                      {copiedId === 'cmd-2a' ? '✓' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-black/60 border border-white/[0.06] text-emerald-400">
                    <code>agentrelay scope add .</code>
                    <button
                      onClick={() => handleCopy('agentrelay scope add .', 'cmd-2b')}
                      className="px-2 py-0.5 rounded bg-white/[0.08] hover:bg-white/[0.15] text-[10px] text-white"
                    >
                      {copiedId === 'cmd-2b' ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#121212] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-[10px] flex items-center justify-center font-mono">3</span>
                    <span>Start the Background Distiller Daemon</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400">Background Runner</span>
                </div>
                <p className="text-xs text-white/50">
                  Starts the background watcher. Whenever your AI agent creates or changes code, this daemon captures and distills it.
                </p>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/60 border border-white/[0.06] font-mono text-xs text-emerald-400">
                  <code>agentrelay daemon</code>
                  <button
                    onClick={() => handleCopy('agentrelay daemon', 'cmd-3')}
                    className="px-2 py-0.5 rounded bg-white/[0.08] hover:bg-white/[0.15] text-[10px] text-white"
                  >
                    {copiedId === 'cmd-3' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#121212] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-[10px] flex items-center justify-center font-mono">4</span>
                    <span>Promote Distilled Card to Dashboard Feed</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Share with Team</span>
                </div>
                <p className="text-xs text-white/50">
                  Publish your solved problem or architecture breakthrough into this workspace feed.
                </p>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/60 border border-white/[0.06] font-mono text-xs text-emerald-400">
                  <code>agentrelay promote &lt;recordId&gt; --team {targetTeam}</code>
                  <button
                    onClick={() => handleCopy(`agentrelay promote <recordId> --team ${targetTeam}`, 'cmd-4')}
                    className="px-2 py-0.5 rounded bg-white/[0.08] hover:bg-white/[0.15] text-[10px] text-white"
                  >
                    {copiedId === 'cmd-4' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#121212] space-y-3">
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>🔒</span>
                  <span>Client-Side Secret Redaction (Zero-Leak Guarantee)</span>
                </h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  AgentRelay runs a deterministic regex and Shannon entropy scrubber inside your local CLI process <strong>before</strong> any transcript lines touch disk or network.
                </p>
                <ul className="text-xs text-white/50 space-y-1.5 list-disc list-inside font-mono">
                  <li>AWS Access Keys, Secret Tokens & Bearer JWTs are masked with <code className="text-cyan-300">[REDACTED:token]</code></li>
                  <li>OpenAI & Anthropic API keys are wiped automatically</li>
                  <li>Customer emails, IP addresses & private keys are replaced</li>
                  <li>Only cleaned, evidence-linked summaries are promoted to teammates</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-white/[0.08] bg-[#121212] space-y-2">
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>💾</span>
                  <span>Local Offline-First Persistence</span>
                </h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  Your promoted cards are safely cached in your browser&apos;s local storage and SQLite backup store. Even if the network drops, your laptop goes offline, or you reload the page, your cards and session history remain permanently intact.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#141414] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0 cursor-pointer"
            />
            <span>Don&apos;t show this tutorial automatically on launch</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-white text-black hover:bg-white/90 transition-colors cursor-pointer"
            >
              Got it, Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
