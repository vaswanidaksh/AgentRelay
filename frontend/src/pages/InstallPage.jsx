import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function InstallPage() {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#B4BCD0]/30 selection:text-white relative overflow-x-hidden">
      {/* Background layers matching Landing Page */}
      <div className="absolute inset-0 bg-dot-grid pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
      <div className="absolute top-24 left-1/3 w-[500px] h-[500px] rounded-full bg-white/[0.025] blur-3xl animate-orb-1 pointer-events-none" />
      <div className="absolute top-40 right-1/4 w-[420px] h-[420px] rounded-full bg-white/[0.018] blur-3xl animate-orb-2 pointer-events-none" />

      <Navbar />

      <main className="pt-32 pb-24 max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="border-b border-white/[0.08] pb-8 mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-white/50 uppercase tracking-widest mb-3 bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span className="text-white/20">/</span>
            <span>Documentation</span>
            <span className="text-white/20">/</span>
            <span className="text-white/80">Installation</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
            Install AgentRelay CLI
          </h1>
          <p className="text-base sm:text-lg text-white/50 leading-relaxed font-light">
            Get the AgentRelay background daemon running on macOS or Linux to automatically index and sync your team's AI coding sessions.
          </p>
        </div>

        {/* Sticky Horizontal Navigation Bar */}
        <div className="sticky top-20 z-20 bg-[#111111]/90 backdrop-blur-md border border-white/[0.08] rounded-full px-5 py-2.5 mb-10 flex items-center justify-around text-xs font-medium text-white/50 shadow-lg">
          <a href="#req" className="hover:text-white transition-colors">1. Requirements</a>
          <a href="#install" className="hover:text-white transition-colors">2. Quick Install</a>
          <a href="#verify" className="hover:text-white transition-colors">3. Verification</a>
          <a href="#commands" className="hover:text-white transition-colors">4. CLI Reference</a>
        </div>

        {/* Section 1: Requirements */}
        <section id="req" className="mb-12 space-y-4">
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/40" />
            1. System Requirements
          </h2>
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
            <ul className="space-y-3 text-sm text-white/70 font-light">
              <li className="flex items-start gap-2.5">
                <span className="text-white/40 font-mono mt-0.5">•</span>
                <span><strong className="text-white/90 font-medium">OS:</strong> macOS 12.0+ (Apple Silicon or Intel) or Linux (x86_64 / arm64)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-white/40 font-mono mt-0.5">•</span>
                <span><strong className="text-white/90 font-medium">Runtime:</strong> Node.js 18+ or Python 3.10+ (optional, pre-compiled standalone binaries available)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-white/40 font-mono mt-0.5">•</span>
                <span><strong className="text-white/90 font-medium">Supported AI Agents:</strong> Claude Code, Cursor, Windsurf, Aider, GitHub Copilot, Codex, etc.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: Quick Install */}
        <section id="install" className="mb-12 space-y-4">
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/40" />
            2. One-Line Installation
          </h2>
          <p className="text-sm text-white/60 font-light">
            Run the official installation script directly in your terminal:
          </p>

          <div className="relative rounded-2xl bg-[#080808] p-4 border border-white/[0.12] font-mono text-xs text-white/90 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3 text-white/40">
              <span className="flex items-center gap-2 font-sans text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                <span className="ml-2 text-white/60 font-medium">Terminal</span>
              </span>
              <button
                onClick={() => copyToClipboard('curl -fsSL https://agentrelay.dev/install.sh | sh', 1)}
                className="px-3 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-white/80 transition-colors font-sans text-xs font-medium cursor-pointer"
              >
                {copiedIndex === 1 ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
            <pre className="text-emerald-400 overflow-x-auto py-1 font-mono text-sm leading-relaxed">
              <code>curl -fsSL https://agentrelay.dev/install.sh | sh</code>
            </pre>
          </div>
        </section>

        {/* Section 3: Verification */}
        <section id="verify" className="mb-12 space-y-4">
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/40" />
            3. Verify Daemon Status
          </h2>
          <p className="text-sm text-white/60 font-light">
            Once installed, verify that the AgentRelay background daemon is active and watching your workspace:
          </p>

          <div className="relative rounded-2xl bg-[#080808] p-4 border border-white/[0.12] font-mono text-xs text-white/90 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3 text-white/40">
              <span className="font-sans text-xs text-white/60 font-medium">Verification Check</span>
              <button
                onClick={() => copyToClipboard('agentrelay status', 2)}
                className="px-3 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-white/80 transition-colors font-sans text-xs font-medium cursor-pointer"
              >
                {copiedIndex === 2 ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
            <pre className="text-emerald-400/90 leading-relaxed font-mono text-xs overflow-x-auto">
              <code>{`$ agentrelay status
✔ Daemon PID: 84920 (Active)
✔ Watching local session drives for Claude, Cursor, Windsurf
✔ Connected to team drive: Acme Corp Engineering`}</code>
            </pre>
          </div>
        </section>

        {/* Section 4: Command Reference */}
        <section id="commands" className="mb-12 space-y-4">
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/40" />
            4. CLI Command Reference
          </h2>

          <div className="border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06] bg-white/[0.02]">
            <div className="p-4 grid sm:grid-cols-12 gap-3 items-center text-xs">
              <span className="sm:col-span-5 font-mono font-semibold text-white/90 bg-white/[0.06] px-2.5 py-1 rounded border border-white/[0.08] w-fit">
                agentrelay start
              </span>
              <span className="sm:col-span-7 text-white/60">Starts the local background daemon watcher</span>
            </div>

            <div className="p-4 grid sm:grid-cols-12 gap-3 items-center text-xs">
              <span className="sm:col-span-5 font-mono font-semibold text-white/90 bg-white/[0.06] px-2.5 py-1 rounded border border-white/[0.08] w-fit">
                agentrelay sync
              </span>
              <span className="sm:col-span-7 text-white/60">Forces an immediate sync of local agent sessions</span>
            </div>

            <div className="p-4 grid sm:grid-cols-12 gap-3 items-center text-xs">
              <span className="sm:col-span-5 font-mono font-semibold text-white/90 bg-white/[0.06] px-2.5 py-1 rounded border border-white/[0.08] w-fit">
                agentrelay list
              </span>
              <span className="sm:col-span-7 text-white/60">Lists all indexed agent sessions on your machine</span>
            </div>

            <div className="p-4 grid sm:grid-cols-12 gap-3 items-center text-xs">
              <span className="sm:col-span-5 font-mono font-semibold text-white/90 bg-white/[0.06] px-2.5 py-1 rounded border border-white/[0.08] w-fit">
                agentrelay link [team-id]
              </span>
              <span className="sm:col-span-7 text-white/60">Links your local daemon to a team drive workspace</span>
            </div>
          </div>
        </section>

        {/* Back Link */}
        <div className="mt-14 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-5 py-2.5 rounded-full"
          >
            <span>←</span> Back to Home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
