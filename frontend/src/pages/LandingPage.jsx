import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TiltCard from '../components/TiltCard';

/* ─── tiny helpers ────────────────────────────────────────── */
const agents = [
  { name: 'Claude Code',   tag: 'Anthropic',    icon: '◈' },
  { name: 'Cursor',        tag: 'IDE',           icon: '⬡' },
  { name: 'Windsurf',      tag: 'Codeium',       icon: '◇' },
  { name: 'Codex',         tag: 'OpenAI',        icon: '⚡' },
  { name: 'GitHub Copilot',tag: 'Extension',     icon: '◎' },
  { name: 'Aider',         tag: 'CLI',           icon: '▷' },
  { name: 'Cline',         tag: 'VSCode',        icon: '◆' },
  { name: 'Continue',      tag: 'Open Source',   icon: '⏩' },
  { name: 'Bolt.new',      tag: 'Browser',       icon: '⚡' },
  { name: 'v0.dev',        tag: 'Vercel',        icon: '▲' },
  { name: 'Devin',         tag: 'Cognition',     icon: '◉' },
  { name: 'Warp AI',       tag: 'Terminal',      icon: '◈' },
  { name: 'Zed AI',        tag: 'High-Perf',     icon: '◼' },
  { name: 'Roo Code',      tag: 'Architect',     icon: '◀' },
  { name: '+ Any Agent',   tag: 'Auto-detected', icon: '✦' },
];

const LOGS = [
  { t: '15:42:01', agent: 'Claude Code', msg: 'Modified auth/jwt.ts — validated 256-bit secret key' },
  { t: '15:42:04', agent: 'Cursor',      msg: 'Wrote tests/profile.test.ts — avatar upload coverage' },
  { t: '15:42:09', agent: 'Windsurf',    msg: 'Pushed .github/workflows/ci.yml — Docker build pipeline' },
  { t: '15:42:14', agent: 'Codex',       msg: 'Indexed 4 diffs to shared team drive (encrypted)' },
];

export default function LandingPage() {
  const [copied, setCopied] = useState(false);
  const [logIdx, setLogIdx] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState([LOGS[0]]);

  /* rotate live log ticker */
  useEffect(() => {
    const id = setInterval(() => {
      setLogIdx((prev) => {
        const next = (prev + 1) % LOGS.length;
        setVisibleLogs((vl) => [...vl.slice(-3), LOGS[next]]);
        return next;
      });
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const copyInstall = () => {
    navigator.clipboard.writeText('curl -fsSL https://agentrelay.dev/install.sh | sh');
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
      <Navbar />

      {/* ════════════════════════════════
          HERO
      ════════════════════════════════ */}
      <section className="relative pt-36 pb-28 md:pt-44 md:pb-36 flex flex-col items-center text-center px-5 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-dot-grid pointer-events-none" />
        <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />

        {/* Ambient orbs — very subtle */}
        <div className="absolute top-24 left-1/3 w-[500px] h-[500px] rounded-full bg-white/[0.025] blur-3xl animate-orb-1 pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[420px] h-[420px] rounded-full bg-white/[0.018] blur-3xl animate-orb-2 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* YC badge */}
          <a
            href="https://www.ycombinator.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-8 rounded-full border border-white/[0.10] bg-white/[0.04] text-xs font-medium text-white/55 hover:text-white/75 hover:border-white/20 transition-all duration-200 group"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/40 animate-ping opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white/70" />
            </span>
            Backed by Y Combinator
            <span className="text-white/30 group-hover:translate-x-0.5 transition-transform">›</span>
          </a>

          {/* Headline */}
          <h1 className="font-semibold tracking-[-0.03em] leading-[1.07] text-5xl sm:text-6xl md:text-7xl text-metallic">
            Everyone's AI coding<br className="hidden sm:inline" /> sessions, in one place.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-white/38 leading-relaxed max-w-xl mx-auto font-light tracking-[0.01em]">
            AgentRelay syncs every session your team runs across{' '}
            <span className="text-white/60 font-normal">Claude Code, Cursor, Windsurf</span>
            {' '}and 12 more agents into one searchable shared drive.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="btn-shimmer w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(255,255,255,0.06)]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                <path d="M8 2v9M4 8l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Install for macOS
            </Link>

            <button
              onClick={copyInstall}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-mono text-white/45 hover:bg-white/[0.06] hover:border-white/[0.14] hover:text-white/65 transition-all duration-200"
            >
              <span className="text-white/30">$</span>
              curl -fsSL agentrelay.dev/install.sh | sh
              <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-white/[0.06] text-white/40 border border-white/[0.08]">
                {copied ? 'Copied ✓' : 'Copy'}
              </span>
            </button>
          </div>
        </div>

        {/* Hero product mockup — dark terminal-style */}
        <div className="relative z-10 mt-16 w-full max-w-4xl mx-auto animate-float-card">
          <TiltCard
            maxTilt={4}
            className="rounded-2xl border border-white/[0.08] bg-[#111111] shadow-[0_40px_100px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]"
          >
            {/* Window chrome */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#161616]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
                <span className="ml-3 font-mono text-[11px] text-white/20 hidden sm:inline">
                  agentrelay/workspace/acme-corp
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/25 animate-pulse" />
                <span className="font-mono text-[11px] text-white/25">socket connected</span>
              </div>
            </div>

            {/* Live log stream bar */}
            <div className="px-5 py-2.5 bg-[#0D0D0D] border-b border-white/[0.05] font-mono text-[11px] text-white/30 flex items-center gap-3 overflow-hidden">
              <span className="text-white/20 shrink-0">STREAM</span>
              <span className="shrink-0 text-white/15">›</span>
              <span className="text-white/40 font-medium shrink-0">{LOGS[logIdx].agent}</span>
              <span className="truncate text-white/25">{LOGS[logIdx].msg}</span>
              <span className="ml-auto shrink-0 text-white/15">{LOGS[logIdx].t}</span>
            </div>

            {/* Dashboard grid */}
            <div className="p-4 sm:p-6 grid md:grid-cols-12 gap-4 bg-[#0E0E0E]">
              {/* Sidebar */}
              <div className="hidden md:block md:col-span-3 space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-[#141414] p-4">
                  <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest mb-3">Team</p>
                  <div className="space-y-1">
                    {['Alice Vance', 'Bob Smith', 'You'].map((name, i) => (
                      <div key={i} className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs ${i === 0 ? 'bg-white/[0.06] text-white/75' : 'text-white/30 hover:bg-white/[0.03]'} transition-colors`}>
                        <span className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${['bg-white/60','bg-white/30','bg-white/20'][i]}`} />
                          {name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#141414] p-4">
                  <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest mb-3">Agents</p>
                  <div className="space-y-1.5 text-xs text-white/28 font-mono">
                    {['Claude Code', 'Cursor', 'Windsurf'].map((a, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span>{a}</span>
                        <span className={`text-[10px] ${['text-white/55','text-white/25','text-white/25'][i]}`}>
                          {['active','idle','synced'][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Session feed */}
              <div className="md:col-span-9 space-y-3">
                {[
                  {
                    title: 'fix-auth-bug',
                    agent: 'Claude Code',
                    user: 'alice',
                    time: '2 min ago',
                    summary: 'Fixed JWT validation middleware & added unit tests covering expired tokens',
                    files: 3,
                  },
                  {
                    title: 'add-user-profile-api',
                    agent: 'Cursor',
                    user: 'bob',
                    time: '15 min ago',
                    summary: 'Implemented avatar upload and settings state management',
                    files: 5,
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="group rounded-xl border border-white/[0.06] bg-[#141414] hover:border-white/[0.12] hover:bg-[#181818] transition-all duration-200 p-4 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-white/[0.06] text-white/45 border border-white/[0.07]">
                          {s.agent}
                        </span>
                        <span className="text-[11px] text-white/25">{s.user}</span>
                      </div>
                      <span className="text-[11px] font-mono text-white/20">{s.time}</span>
                    </div>
                    <p className="font-semibold text-sm text-white/75 group-hover:text-white/90 transition-colors">{s.title}</p>
                    <p className="text-xs text-white/28 mt-1 leading-relaxed">{s.summary}</p>
                    <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-white/20">
                      <span>{s.files} files changed</span>
                      <span className="text-white/35 font-sans font-medium group-hover:text-white/55 transition-colors flex items-center gap-1">
                        View transcript <span>→</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* ════════════════════════════════
          PROBLEM STATEMENT
      ════════════════════════════════ */}
      <section className="py-28 border-t border-white/[0.05] bg-[#0A0A0A]">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <span className="inline-block mb-5 px-3 py-1 rounded-full border border-white/[0.09] text-[11px] font-semibold uppercase tracking-widest text-white/35">
            The problem
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-metallic leading-[1.1]">
            Today's AI agents are blind.<br />
            <span className="text-white/25 font-light">They never see what others did.</span>
          </h2>
          <p className="mt-6 text-base text-white/35 leading-relaxed font-light max-w-xl mx-auto">
            Every time someone starts a new session, the agent starts from zero — losing all the context, code diffs, and insights your teammates already generated.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════
          AGENT GRID
      ════════════════════════════════ */}
      <section id="agents" className="py-28 border-t border-white/[0.05] bg-[#0D0D0D] relative overflow-hidden">
        <div className="absolute inset-0 bg-line-grid pointer-events-none opacity-60" />

        <div className="relative z-10 max-w-5xl mx-auto px-5 text-center">
          <span className="inline-block mb-4 px-3 py-1 rounded-full border border-white/[0.09] text-[11px] font-semibold uppercase tracking-widest text-white/35">
            Compatibility
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] text-metallic">
            Works with every agent your team uses.
          </h2>
          <p className="mt-3 text-sm text-white/30 max-w-sm mx-auto font-light">
            Zero configuration. AgentRelay detects and indexes sessions automatically.
          </p>

          <div className="mt-12 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {agents.map((ag, i) => (
              <TiltCard
                key={i}
                maxTilt={8}
                className="rounded-xl border border-white/[0.07] bg-[#141414] hover:border-white/[0.14] hover:bg-[#1A1A1A] transition-all duration-200 cursor-default"
              >
                <div className="p-4 flex flex-col items-center gap-2 text-center">
                  <span className="text-2xl text-white/25 font-mono">{ag.icon}</span>
                  <span className="text-xs font-semibold text-white/65 leading-tight">{ag.name}</span>
                  <span className="text-[10px] text-white/22 font-mono">{ag.tag}</span>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          FEATURES  (3 split cards)
      ════════════════════════════════ */}
      <section id="features" className="py-28 border-t border-white/[0.05] bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto px-5 space-y-5">

          {/* Feature card 1 — Full-width, tilt */}
          <TiltCard className="rounded-2xl border border-white/[0.07] bg-[#111111] overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-4">Shared Memory</span>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-metallic leading-[1.18]">
                  Context that carries<br />session to session.
                </h3>
                <p className="mt-4 text-sm text-white/35 leading-relaxed font-light">
                  When any teammate or AI picks up a task, AgentRelay automatically injects exact prompt context, file diffs, and execution logs from prior sessions.
                </p>
                <Link to="/install" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors group">
                  Learn more
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-white/[0.05] bg-[#0D0D0D] p-8 font-mono text-[12px] flex flex-col gap-3 justify-center">
                <div className="rounded-lg border border-white/[0.07] bg-[#111111] px-4 py-3">
                  <span className="text-white/25 text-[10px] block mb-1">Prompt</span>
                  <span className="text-white/55">"What did Alice do for the auth bug?"</span>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-[#111111] px-4 py-3 space-y-1.5">
                  <span className="text-white/20 text-[10px] block mb-1.5">AgentRelay pipeline</span>
                  <div className="flex items-center gap-2 text-white/40">
                    <span>✓</span>
                    <span>Retrieved session sess-101 (alice)</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <span>✓</span>
                    <span>Extracted 3 diffs in auth/middleware.ts</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 font-medium">
                    <span>↗</span>
                    <span>Injected into active context window</span>
                  </div>
                </div>
              </div>
            </div>
          </TiltCard>

          {/* Feature cards 2 + 3 — side by side */}
          <div className="grid md:grid-cols-2 gap-5">

            <TiltCard className="rounded-2xl border border-white/[0.07] bg-[#111111]">
              <div className="p-8 md:p-10">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-4 block">Auto-Sync</span>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-metallic leading-[1.2]">
                  Every session backed up the moment it happens.
                </h3>
                <p className="mt-4 text-sm text-white/35 leading-relaxed font-light">
                  A zero-overhead background daemon watches local agent logs and syncs structured session JSON to your team drive.
                </p>
                <div className="mt-6 rounded-xl bg-[#0D0D0D] border border-white/[0.06] px-4 py-3 font-mono text-[11px] text-white/28 space-y-1.5">
                  <div className="text-white/40">~/.agentrelay/acme-corp/</div>
                  <div className="pl-4">├── alice/ → claude-code/ → sessions/</div>
                  <div className="pl-4">└── bob/   → cursor/      → sessions/</div>
                </div>
              </div>
            </TiltCard>

            <TiltCard className="rounded-2xl border border-white/[0.07] bg-[#111111]" id="security">
              <div className="p-8 md:p-10">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-4 block">Privacy</span>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-metallic leading-[1.2]">
                  Private enough for real codebases.
                </h3>
                <p className="mt-4 text-sm text-white/35 leading-relaxed font-light">
                  All transcripts live in an encrypted local cache first. Exclude secrets with <span className="font-mono text-white/45">.relayignore</span>. Readonly team sync only.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  {['Local by default', 'TLS 1.3 in transit', 'Scoped .relayignore', 'Read-only drive'].map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-[11px] text-white/35">
                      <span className="text-white/20">✓</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          BOTTOM CTA
      ════════════════════════════════ */}
      <section className="relative py-32 border-t border-white/[0.05] bg-[#0D0D0D] overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid pointer-events-none" />
        <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto px-5 text-center">
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-metallic leading-[1.1]">
            Built for humans<br />and agents alike.
          </h2>
          <p className="mt-5 text-base text-white/30 font-light">
            Start syncing your team's AI sessions in under 60 seconds.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="btn-shimmer inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors shadow-[0_8px_40px_rgba(255,255,255,0.08)]"
            >
              Get started — it's free
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
