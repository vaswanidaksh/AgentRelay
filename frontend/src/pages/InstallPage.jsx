import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function InstallPage() {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('quickstart');

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const CopyButton = ({ text, idx }) => (
    <button
      onClick={() => copyToClipboard(text, idx)}
      className="px-3 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-white/80 transition-colors font-sans text-xs font-medium cursor-pointer"
    >
      {copiedIndex === idx ? 'Copied ✓' : 'Copy'}
    </button>
  );

  const CodeBlock = ({ code, idx, label = 'Terminal' }) => (
    <div className="relative rounded-2xl bg-[#080808] p-4 border border-white/[0.12] font-mono text-xs text-white/90 shadow-2xl">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3 text-white/40">
        <span className="flex items-center gap-2 font-sans text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
          <span className="ml-2 text-white/60 font-medium">{label}</span>
        </span>
        <CopyButton text={code} idx={idx} />
      </div>
      <pre className="text-emerald-400 overflow-x-auto py-1 font-mono text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );

  const tabs = [
    { id: 'quickstart', label: '🚀 Quick Start' },
    { id: 'daily',      label: '📋 Daily Workflow' },
    { id: 'agents',     label: '🤖 AI Agents & MCP' },
    { id: 'team',       label: '👥 Team Sharing' },
    { id: 'reference',  label: '📖 CLI Reference' },
  ];

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
            <span className="text-white/80">Documentation</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
            AgentRelay CLI Docs
          </h1>
          <p className="text-base sm:text-lg text-white/50 leading-relaxed font-light">
            Install, configure, and use AgentRelay to capture your AI coding sessions, distill context records, and share knowledge with your team.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="sticky top-20 z-20 bg-[#111111]/90 backdrop-blur-md border border-white/[0.08] rounded-2xl sm:rounded-full px-2 py-1.5 mb-10 flex items-center gap-1 overflow-x-auto justify-start sm:justify-around text-xs font-medium shadow-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white/[0.12] text-white font-semibold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════
            TAB: QUICK START
        ═══════════════════════════════════════════ */}
        {activeTab === 'quickstart' && (
          <div className="space-y-10 animate-fadeIn">

            {/* Prerequisites */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-xs font-bold text-white/60">1</span>
                Prerequisites
              </h2>
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
                <ul className="space-y-3 text-sm text-white/70 font-light">
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400/80 font-mono mt-0.5">✓</span>
                    <span><strong className="text-white/90 font-medium">Node.js v18+</strong> — Required. Check with <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60 font-mono text-xs">node --version</code></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400/80 font-mono mt-0.5">✓</span>
                    <span><strong className="text-white/90 font-medium">OS:</strong> macOS 12+, Linux (x86_64 / arm64), or Windows with WSL2</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-yellow-400/80 font-mono mt-0.5">○</span>
                    <span><strong className="text-white/90 font-medium">Ollama</strong> (Optional) — For local LLM-powered distillation. Without it, AgentRelay uses rule-based extraction.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Step 2: Install */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-xs font-bold text-white/60">2</span>
                Install & Initialize
              </h2>
              <p className="text-sm text-white/60 font-light">
                Run the following command in your terminal to initialize AgentRelay and set up your local store:
              </p>
              <CodeBlock
                code="npx agentrelay-cli init"
                idx="install-1"
                label="Terminal (One-Line Setup)"
              />
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/50 leading-relaxed space-y-1">
                <p>This command will:</p>
                <ul className="ml-4 space-y-0.5 list-disc list-outside">
                  <li>Create the <code className="px-1 rounded bg-white/[0.06] text-white/60 font-mono">~/.agentrelay/</code> configuration directory</li>
                  <li>Initialize the local SQLite database (<code className="px-1 rounded bg-white/[0.06] text-white/60 font-mono">db.sqlite</code>) with WAL mode & FTS5 full-text index</li>
                  <li>Check if a local model runtime (Ollama with <code className="px-1 rounded bg-white/[0.06] text-white/60 font-mono">qwen2.5-coder:7b</code>) is available</li>
                  <li>Generate your default <code className="px-1 rounded bg-white/[0.06] text-white/60 font-mono">config.json</code></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/60 leading-relaxed space-y-2">
                <strong className="text-white/80">Global Install (Optional):</strong>
                <p className="text-white/50">To have the <code className="px-1 rounded bg-white/[0.06] text-white/70 font-mono">agentrelay</code> binary permanently available across all terminal sessions:</p>
              </div>
              <CodeBlock
                code={`npm install -g agentrelay-cli
agentrelay init`}
                idx="install-global"
                label="Global Installation"
              />
            </section>

            {/* Step 3: Add Scope */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-xs font-bold text-white/60">3</span>
                Add a Project to Watch
              </h2>
              <p className="text-sm text-white/60 font-light">
                AgentRelay only captures sessions from folders you explicitly opt in. No folders are watched by default.
              </p>
              <CodeBlock
                code={`# Add a project folder to the capture scope
agentrelay scope add ~/projects/my-app

# Verify it was added
agentrelay scope list`}
                idx="scope-1"
                label="Terminal"
              />
              <div className="p-4 rounded-xl bg-amber-500/[0.05] border border-amber-400/[0.12] text-xs text-amber-300/70 leading-relaxed">
                <strong className="text-amber-300/90">Privacy note:</strong> AgentRelay will only look for AI agent transcript files (.jsonl, .claude, .cursor, etc.) inside scoped folders. Secrets like API keys, tokens, and passwords are automatically redacted before storage.
              </div>
            </section>

            {/* Step 4: Start Daemon */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-xs font-bold text-white/60">4</span>
                Start the Background Daemon
              </h2>
              <p className="text-sm text-white/60 font-light">
                Launch the watcher daemon. It runs in the background, scanning your scoped folders every 5 seconds for new AI agent sessions, scrubbing secrets, and distilling context records.
              </p>
              <CodeBlock
                code="agentrelay daemon"
                idx="daemon-1"
                label="Terminal"
              />
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/50 leading-relaxed">
                <p className="font-medium text-white/70 mb-1">What happens in the background:</p>
                <ol className="ml-4 space-y-0.5 list-decimal list-outside">
                  <li>Scans scoped folders for transcript files (.jsonl, .claude, .cursor, etc.)</li>
                  <li>Reads only new content incrementally (no re-processing)</li>
                  <li>Scrubs secrets (AWS keys, GitHub tokens, DB strings, emails, etc.)</li>
                  <li>Stores events in local SQLite with full-text search indexing</li>
                  <li>Distills sessions into structured context records using local LLM or rule-based fallback</li>
                </ol>
              </div>
            </section>

            {/* Step 5: Verify */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center text-xs font-bold text-emerald-400/80">✓</span>
                Verify Everything Works
              </h2>
              <CodeBlock
                code={`$ agentrelay status

AgentRelay Daemon Status
------------------------
State:          ▶ ACTIVE
Scoped Folders: 1 folder(s)
  - /Users/you/projects/my-app
Indexed:        2 sessions | 47 events | 3 distilled records
Queue Depth:    0 pending distillation jobs
Auth User:      Not logged in
Model Runtime:  http://localhost:11434 (qwen2.5-coder:7b)`}
                idx="verify-1"
                label="Status Check"
              />
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TAB: DAILY WORKFLOW
        ═══════════════════════════════════════════ */}
        {activeTab === 'daily' && (
          <div className="space-y-10 animate-fadeIn">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white tracking-tight">Your Daily Flow</h2>
              <p className="text-sm text-white/60 font-light leading-relaxed">
                Once the daemon is running, AgentRelay works automatically in the background. Here's how you interact with it day to day:
              </p>
            </section>

            {/* Flow Visualization */}
            <div className="space-y-3">
              {[
                {
                  step: '1',
                  title: 'Code with any AI agent',
                  desc: 'Use Claude Code, Cursor, Windsurf, Aider, or any AI coding tool in your scoped project folders. AgentRelay automatically captures and scrubs the session.',
                  cmd: null,
                },
                {
                  step: '2',
                  title: 'Review distilled records',
                  desc: 'Once a session is distilled, review the generated context records. Accept the ones you want to keep.',
                  cmd: 'agentrelay review --accept',
                },
                {
                  step: '3',
                  title: 'Search your knowledge base',
                  desc: 'Search across all captured sessions offline using full-text search. Find past decisions, code patterns, and debugging insights.',
                  cmd: 'agentrelay search "JWT validation"',
                },
                {
                  step: '4',
                  title: 'View a specific record',
                  desc: 'Inspect a record\'s full details — title, summary, key decisions with cited evidence, files touched, and redaction stats.',
                  cmd: 'agentrelay show <recordId>',
                },
                {
                  step: '5',
                  title: 'Export as Markdown',
                  desc: 'Export a record as a self-contained Markdown context pack with decisions, evidence, and the session event transcript.',
                  cmd: 'agentrelay export <recordId>',
                },
                {
                  step: '6',
                  title: 'Pause / Resume capture',
                  desc: "Temporarily pause capture if you're working on sensitive material, then resume when ready.",
                  cmd: 'agentrelay pause   # or: agentrelay resume',
                },
              ].map((item) => (
                <div key={item.step} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] transition-colors">
                  <div className="flex items-start gap-4">
                    <span className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-xs font-bold text-white/60 shrink-0 mt-0.5">
                      {item.step}
                    </span>
                    <div className="space-y-2 flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white/85">{item.title}</h3>
                      <p className="text-xs text-white/45 leading-relaxed">{item.desc}</p>
                      {item.cmd && (
                        <div className="flex items-center gap-2 mt-2">
                          <code className="px-3 py-1.5 rounded-lg bg-[#080808] border border-white/[0.10] text-emerald-400/90 font-mono text-xs truncate">
                            $ {item.cmd}
                          </code>
                          <button
                            onClick={() => copyToClipboard(item.cmd, `daily-${item.step}`)}
                            className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white/50 transition-colors text-[10px] font-medium cursor-pointer shrink-0"
                          >
                            {copiedIndex === `daily-${item.step}` ? '✓' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Retry Failed Jobs */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white tracking-tight">Troubleshooting: Failed Distillation</h2>
              <p className="text-sm text-white/50 font-light">
                If the local LLM was offline during a session capture, distillation may fail. Re-queue failed jobs:
              </p>
              <CodeBlock
                code={`# Re-queue all failed jobs
agentrelay retry

# Re-queue a specific session
agentrelay retry <sessionId>`}
                idx="retry-1"
                label="Terminal"
              />
            </section>

            {/* Purge */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white tracking-tight">Data Cleanup</h2>
              <CodeBlock
                code={`# Purge raw event data only (keeps records)
agentrelay purge --events

# Purge everything (sessions, events, records, jobs)
agentrelay purge --all`}
                idx="purge-1"
                label="Terminal"
              />
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TAB: AI AGENTS & MCP INTEGRATION
        ═══════════════════════════════════════════ */}
        {activeTab === 'agents' && (
          <div className="space-y-10 animate-fadeIn">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white tracking-tight">AI Coding Agent Interoperability</h2>
              <p className="text-sm text-white/60 font-light leading-relaxed">
                AgentRelay bridges human-reviewed team decisions directly to AI coding agents (Claude Code, Cursor, Windsurf, Aider) via file-based sync and standard Model Context Protocol (MCP) over stdio.
              </p>
            </section>

            {/* Method A: CONTEXT.md Sync */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-white/[0.08] text-xs font-mono text-white/80 border border-white/[0.1]">Method A</span>
                <h3 className="text-lg font-semibold text-white tracking-tight">Automatic CONTEXT.md Decision Sync</h3>
              </div>
              <p className="text-sm text-white/50 font-light leading-relaxed">
                Run <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/70 font-mono text-xs">agentrelay sync</code> in your project root. AgentRelay fetches all team records from the server via sequence cursor, catalogs touched code files, and compiles decision memory:
              </p>
              <CodeBlock code="agentrelay sync" idx="sync-1" />
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/50 leading-relaxed space-y-2">
                <p className="font-medium text-white/70">1-Command Master Synchronization performs:</p>
                <ol className="ml-4 space-y-1 list-decimal list-outside">
                  <li>Pulls all team context records from the server using monotonic sequence cursor</li>
                  <li>Extracts and catalogs all global code files referenced across past sessions</li>
                  <li>Exports individual Markdown context packs to <code className="text-emerald-400 font-mono">~/.agentrelay/context/record_*.md</code></li>
                  <li>Compiles <code className="text-emerald-400 font-mono">~/.agentrelay/context/CONTEXT.md</code> and project-level <code className="text-emerald-400 font-mono">.agentrelay/CONTEXT.md</code></li>
                </ol>
                <p className="pt-1 text-white/40">
                  AI tools like <strong>Claude Code</strong>, <strong>Cursor</strong>, and <strong>Aider</strong> automatically index and read files in your project directory, instantly accessing past architecture decisions.
                </p>
              </div>
            </section>

            {/* Method B: Model Context Protocol (MCP) */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-white/[0.08] text-xs font-mono text-white/80 border border-white/[0.1]">Method B</span>
                <h3 className="text-lg font-semibold text-white tracking-tight">Model Context Protocol (MCP) Stdio Server (FR-027)</h3>
              </div>
              <p className="text-sm text-white/50 font-light leading-relaxed">
                AgentRelay implements an official <strong>MCP stdio JSON-RPC server</strong>. This exposes read-only context lookup tools natively to coding assistants in Claude Desktop and Cursor.
              </p>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">Configuration for Claude Desktop or Cursor</h4>
                <p className="text-xs text-white/50">Add this to your <code className="font-mono text-white/70">claude_desktop_config.json</code> or Cursor MCP settings:</p>
                <CodeBlock
                  code={`{
  "mcpServers": {
    "agentrelay": {
      "command": "agentrelay",
      "args": ["mcp"]
    }
  }
}`}
                  idx="mcp-config"
                  label="claude_desktop_config.json"
                />
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3 text-xs">
                <h4 className="font-semibold text-white/80">Native MCP Tools Exposed to AI:</h4>
                <div className="space-y-2 text-white/60">
                  <div className="p-3 rounded-xl bg-[#080808] border border-white/[0.06] font-mono">
                    <span className="text-emerald-400 font-semibold">search_context(query, limit)</span>
                    <p className="text-white/40 text-[11px] font-sans mt-1">Allows the AI to search past decisions, bug investigations, and touched code files using keywords or query.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#080808] border border-white/[0.06] font-mono">
                    <span className="text-emerald-400 font-semibold">show_record(recordId)</span>
                    <p className="text-white/40 text-[11px] font-sans mt-1">Allows the AI to inspect the complete context pack and decisions citing evidence IDs for a specific record ID.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TAB: TEAM SHARING
        ═══════════════════════════════════════════ */}
        {activeTab === 'team' && (
          <div className="space-y-10 animate-fadeIn">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white tracking-tight">Share Context With Your Team</h2>
              <p className="text-sm text-white/60 font-light leading-relaxed">
                By default, all records stay private on your machine. To share with teammates, follow this flow:
              </p>
            </section>

            {/* Step 1: Login */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-xs font-bold text-white/60">1</span>
                Authenticate
              </h2>
              <p className="text-sm text-white/50 font-light">
                Log in with your GitHub token to connect to the AgentRelay team server:
              </p>
              <CodeBlock code="agentrelay login --token <your-github-token>" idx="login-1" />
            </section>

            {/* Step 2: Team */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-xs font-bold text-white/60">2</span>
                Create or Join a Team
              </h2>
              <CodeBlock
                code={`# Create a new team
agentrelay team create "Acme Engineering"

# Or join an existing team using an invite token
agentrelay team join <invite-token>

# List your teams
agentrelay team list

# Invite someone to your team
agentrelay team invite <teamId>`}
                idx="team-1"
              />
            </section>

            {/* Step 3: Share + Promote */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-xs font-bold text-white/60">3</span>
                Mark & Promote Records
              </h2>
              <p className="text-sm text-white/50 font-light">
                Records must first be marked as <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60 font-mono text-xs">shareable</code> before they can be promoted to the team server:
              </p>
              <CodeBlock
                code={`# Mark a record as shareable
agentrelay share <recordId>

# Upload the shareable record to your team
agentrelay promote <recordId>

# (Optional) Withdraw a promoted record
agentrelay unpromote <recordId>`}
                idx="promote-1"
              />
            </section>

            {/* Step 4: Pull */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-xs font-bold text-white/60">4</span>
                Pull Team Records
              </h2>
              <p className="text-sm text-white/50 font-light">
                Fetch context records shared by your teammates into your local store:
              </p>
              <CodeBlock code="agentrelay pull" idx="pull-1" />
            </section>

            {/* Step 5: Handoff */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-xs font-bold text-white/60">5</span>
                Direct Handoffs & Inbox
              </h2>
              <p className="text-sm text-white/50 font-light">
                Send a context record directly to a specific teammate, or check your incoming handoffs:
              </p>
              <CodeBlock
                code={`# Hand off a record to a teammate
agentrelay handoff <recordId> @alice

# Check your inbox for received handoffs
agentrelay inbox

# Filter by state
agentrelay inbox --state pending

# Mark an inbox item as read
agentrelay inbox --read <itemId>`}
                idx="handoff-1"
              />
            </section>

            {/* Logout */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white tracking-tight">Logout</h2>
              <CodeBlock code="agentrelay logout" idx="logout-1" />
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TAB: CLI REFERENCE
        ═══════════════════════════════════════════ */}
        {activeTab === 'reference' && (
          <div className="space-y-8 animate-fadeIn">

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-white tracking-tight">Full CLI Command Reference</h2>
              <p className="text-sm text-white/50 font-light">
                Every available command in the AgentRelay CLI.
              </p>
            </section>

            {/* Grouped command tables */}
            {[
              {
                group: 'Setup & Configuration',
                commands: [
                  { cmd: 'agentrelay init',                        desc: 'Initialize local store (~/.agentrelay/) and verify model runtime' },
                  { cmd: 'agentrelay scope add <path>',            desc: 'Add a project folder to the opt-in capture scope' },
                  { cmd: 'agentrelay scope remove <path>',         desc: 'Remove a folder from the capture scope' },
                  { cmd: 'agentrelay scope list',                  desc: 'List all currently scoped folders' },
                  { cmd: 'agentrelay daemon',                      desc: 'Start the background watcher & distiller loop (runs every 5s)' },
                ],
              },
              {
                group: 'Monitoring & Control',
                commands: [
                  { cmd: 'agentrelay status',                      desc: 'Show daemon state, scoped folders, session/event/record counts, and queue depth' },
                  { cmd: 'agentrelay pause',                       desc: 'Pause all session capture (events stop being recorded)' },
                  { cmd: 'agentrelay resume',                      desc: 'Resume session capture after a pause' },
                ],
              },
              {
                group: 'Records & Search',
                commands: [
                  { cmd: 'agentrelay search [query]',              desc: 'Search local records offline via FTS5 full-text search' },
                  { cmd: 'agentrelay search [query] --json',       desc: 'Output search results in JSON format' },
                  { cmd: 'agentrelay show <recordId>',             desc: 'Display a specific record (summary, decisions, evidence, files)' },
                  { cmd: 'agentrelay show <recordId> --json',      desc: 'Output full record as raw JSON' },
                  { cmd: 'agentrelay review --accept',             desc: 'Accept all candidate (unreviewed) records' },
                  { cmd: 'agentrelay review --reject',             desc: 'Reject all candidate records' },
                  { cmd: 'agentrelay export <recordId>',           desc: 'Export a Markdown context pack with decisions and event transcript' },
                  { cmd: 'agentrelay export <recordId> --pack',    desc: 'Include raw scrubbed session chat and tool events in context pack' },
                ],
              },
              {
                group: 'Global Context Sync & MCP Server (Agent Interop)',
                commands: [
                  { cmd: 'agentrelay sync',                        desc: '1-command master sync: pull team records, catalog files, and compile CONTEXT.md' },
                  { cmd: 'agentrelay mcp',                         desc: 'Start Model Context Protocol (MCP) stdio JSON-RPC server for Claude Desktop / Cursor' },
                ],
              },
              {
                group: 'Sharing & Privacy',
                commands: [
                  { cmd: 'agentrelay share <recordId>',            desc: 'Mark a record as shareable (required before promoting)' },
                  { cmd: 'agentrelay unshare <recordId>',          desc: 'Revert a record back to private' },
                ],
              },
              {
                group: 'Authentication',
                commands: [
                  { cmd: 'agentrelay login --token <token>',       desc: 'Authenticate with the team server using a GitHub/API token' },
                  { cmd: 'agentrelay logout',                      desc: 'Clear local authentication credentials' },
                ],
              },
              {
                group: 'Team Collaboration',
                commands: [
                  { cmd: 'agentrelay team create <name>',          desc: 'Create a new team workspace' },
                  { cmd: 'agentrelay team list',                   desc: 'List your team memberships and roles' },
                  { cmd: 'agentrelay team invite <teamId>',        desc: 'Generate an invite token for a team' },
                  { cmd: 'agentrelay team join <inviteToken>',     desc: 'Join a team using an invite token' },
                  { cmd: 'agentrelay promote <recordId>',          desc: 'Upload a shareable record to the team server' },
                  { cmd: 'agentrelay unpromote <recordId>',        desc: 'Withdraw a promoted record (propagates tombstone)' },
                  { cmd: 'agentrelay pull',                        desc: 'Fetch new team records into your local store' },
                  { cmd: 'agentrelay handoff <id> <@handle>',      desc: 'Send a record directly to a teammate\'s inbox' },
                  { cmd: 'agentrelay inbox',                       desc: 'View received context handoffs' },
                  { cmd: 'agentrelay inbox --state pending',       desc: 'Filter inbox by state (pending, read, archived)' },
                  { cmd: 'agentrelay inbox --read <id>',           desc: 'Mark an inbox item as read' },
                ],
              },
              {
                group: 'Maintenance',
                commands: [
                  { cmd: 'agentrelay retry',                       desc: 'Re-queue all failed distillation jobs' },
                  { cmd: 'agentrelay retry <sessionId>',           desc: 'Re-queue a specific failed session' },
                  { cmd: 'agentrelay purge --events',              desc: 'Purge raw event data only (keeps records)' },
                  { cmd: 'agentrelay purge --all',                 desc: 'Purge all local data (sessions, events, records, jobs)' },
                ],
              },
            ].map(({ group, commands }) => (
              <div key={group} className="space-y-3">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  {group}
                </h3>
                <div className="border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06] bg-white/[0.02]">
                  {commands.map(({ cmd, desc }) => (
                    <div key={cmd} className="p-3.5 grid sm:grid-cols-12 gap-2 items-center text-xs hover:bg-white/[0.02] transition-colors">
                      <span className="sm:col-span-5 font-mono font-semibold text-white/90 bg-white/[0.06] px-2.5 py-1 rounded border border-white/[0.08] w-fit text-[11px]">
                        {cmd}
                      </span>
                      <span className="sm:col-span-7 text-white/55">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

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
