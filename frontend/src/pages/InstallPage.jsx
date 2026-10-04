import { useState } from 'react';
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
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-cyan-100 selection:text-cyan-900">
      <Navbar />

      <main className="pt-32 pb-24 max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-8 mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 uppercase tracking-wider mb-2">
            <span>Documentation</span>
            <span>›</span>
            <span>Installation</span>
          </div>
          <h1 className="text-4xl font-semibold text-gray-900 tracking-tight">
            Install AgentRelay CLI
          </h1>
          <p className="mt-3 text-base text-gray-600 leading-relaxed">
            Get the AgentRelay background daemon running on macOS or Linux to automatically index and sync your team's AI coding sessions.
          </p>
        </div>

        {/* Horizontal TOC Bar */}
        <div className="sticky top-20 z-20 bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-full px-4 py-2 mb-10 flex items-center justify-between text-xs font-medium text-gray-600 shadow-xs">
          <a href="#req" className="hover:text-cyan-600 transition-colors">1. Requirements</a>
          <a href="#install" className="hover:text-cyan-600 transition-colors">2. Install</a>
          <a href="#verify" className="hover:text-cyan-600 transition-colors">3. Verify</a>
          <a href="#commands" className="hover:text-cyan-600 transition-colors">4. CLI Commands</a>
        </div>

        {/* Section 1: Requirements */}
        <section id="req" className="mb-12 space-y-3">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">1. Requirements</h2>
          <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
            <li>macOS 12.0+ (Apple Silicon or Intel) or Linux (x86_64 / arm64)</li>
            <li>Node.js 18+ or Python 3.10+ (optional, native binaries pre-compiled)</li>
            <li>One or more AI coding agents installed (Claude Code, Cursor, Windsurf, Aider, etc.)</li>
          </ul>
        </section>

        {/* Section 2: Quick Install */}
        <section id="install" className="mb-12 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">2. One-line Installation</h2>
          <p className="text-sm text-gray-600">Run the official install script in your terminal:</p>

          <div className="relative rounded-2xl bg-gray-950 p-4 border border-gray-800 font-mono text-xs text-gray-100 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800 mb-3 text-gray-400">
              <span className="text-cyan-400 font-semibold">Terminal</span>
              <button
                onClick={() => copyToClipboard('curl -fsSL https://agentrelay.dev/install.sh | sh', 1)}
                className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors font-sans text-xs"
              >
                {copiedIndex === 1 ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
            <pre className="text-cyan-300 overflow-x-auto">
              <code>curl -fsSL https://agentrelay.dev/install.sh | sh</code>
            </pre>
          </div>
        </section>

        {/* Section 3: Verification */}
        <section id="verify" className="mb-12 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">3. Verify Daemon Status</h2>
          <p className="text-sm text-gray-600">Once installed, verify that the background watcher is active:</p>

          <div className="relative rounded-2xl bg-gray-950 p-4 border border-gray-800 font-mono text-xs text-gray-100 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800 mb-3 text-gray-400">
              <span className="text-cyan-400 font-semibold">Terminal</span>
              <button
                onClick={() => copyToClipboard('agentrelay status', 2)}
                className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors font-sans text-xs"
              >
                {copiedIndex === 2 ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
            <pre className="text-emerald-400">
              <code>{`$ agentrelay status
✔ Daemon PID: 84920 (Active)
✔ Watching local session drives for Claude, Cursor, Windsurf
✔ Connected to team drive: Acme Corp Engineering`}</code>
            </pre>
          </div>
        </section>

        {/* Section 4: Command Reference */}
        <section id="commands" className="mb-12 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">4. CLI Command Reference</h2>

          <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
            <div className="p-4 bg-gray-50 grid sm:grid-cols-12 gap-3 items-center text-xs">
              <span className="sm:col-span-5 font-mono font-semibold text-cyan-700">agentrelay start</span>
              <span className="sm:col-span-7 text-gray-600">Starts the local background daemon</span>
            </div>

            <div className="p-4 bg-white grid sm:grid-cols-12 gap-3 items-center text-xs">
              <span className="sm:col-span-5 font-mono font-semibold text-cyan-700">agentrelay sync</span>
              <span className="sm:col-span-7 text-gray-600">Forces an immediate sync of unpushed agent sessions</span>
            </div>

            <div className="p-4 bg-gray-50 grid sm:grid-cols-12 gap-3 items-center text-xs">
              <span className="sm:col-span-5 font-mono font-semibold text-cyan-700">agentrelay list</span>
              <span className="sm:col-span-7 text-gray-600">Lists all recently indexed sessions on your machine</span>
            </div>

            <div className="p-4 bg-white grid sm:grid-cols-12 gap-3 items-center text-xs">
              <span className="sm:col-span-5 font-mono font-semibold text-cyan-700">agentrelay link [team-id]</span>
              <span className="sm:col-span-7 text-gray-600">Links your local daemon to a team drive workspace</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
