# AgentRelay 📡

> **A local-first CLI that turns AI coding-agent sessions into private, searchable, shareable context records.**  
> *Polaris Project — OJT Semester 3 | Generative AI & Systems Engineering Track*

---

## 🌟 Overview

When engineers work with AI coding assistants (Claude Code, Cursor, Windsurf, Aider), high-value architectural decisions, trade-off evaluations, and debugging insights vanish when the terminal session ends.

**AgentRelay** solves this problem with zero cloud privacy compromise:
1. **Local-First Capture:** Non-invasive watcher tails local agent session transcripts with $< 10\text{s}$ latency.
2. **Opt-in Scoping:** Default scope is empty. You choose exactly which project folders to observe.
3. **Deterministic Secret Scrubber:** Automatically scrubs AWS keys, GitHub tokens, AI API keys, DB connection strings, and private keys using pattern and Shannon entropy checks *before* data is stored or promoted.
4. **Local LLM Distillation:** Synthesizes structured context records (summary, decisions with evidence IDs, files touched, tags) using a local model runtime (e.g. Ollama with `qwen2.5-coder:7b`).
5. **Second-Pass Sensitivity Check:** Classifies prose credentials and internal hostnames, elevating sensitivity to `review` so secrets never leak.
6. **Markdown Context Packs & CONTEXT.md:** Generates self-contained Markdown context packs and maintains a repository-level `CONTEXT.md` decision index for downstream coding agents.
7. **Model Context Protocol (MCP) Server:** Exposes a stdio JSON-RPC MCP server (`search_context`, `show_record`) so coding assistants can query past context records natively.
8. **Team Server & Dashboard:** Lightweight Context Protocol (LCP) REST server featuring GitHub OAuth, multi-tenant RBAC, SHA-256 tamper-evident hash-chained audit trails, sequence cursor replication, and teammate `@handle` handoffs.

---

## 🏗️ Architecture

```
   Local Terminal                                     Team Server (LCP)
 ┌────────────────────────┐                         ┌───────────────────────┐
 │ Coding Agent Session   │                         │ Express REST API      │
 │ (Claude Code / Cursor) │                         │ /api/v1/*             │
 └──────────┬─────────────┘                         └───────────▲───────────┘
            │ Opt-in folder                                     │
            ▼                                                   │
 ┌────────────────────────┐       POST /records (Scrubbed)      │
 │  AgentRelay CLI Watcher├─────────────────────────────────────┤
 │  - Normalizer          │                                     │
 │  - Deterministic Scrub │       GET /records?since=<cursor>   │
 │  - Local Distiller     │◄────────────────────────────────────┤
 │  - SQLite + FTS5 Store │                                     │
 └──────────┬─────────────┘                         ┌───────────┴───────────┐
            │                                       │ Tamper-Evident SHA-256│
            ├─► agentrelay sync (CONTEXT.md)        │ Audit Trail Chain     │
            ├─► agentrelay mcp  (MCP Stdio Server)  └───────────▲───────────┘
            ▼                                                   │
 ┌────────────────────────┐                         ┌───────────┴───────────┐
 │ Next Coding Agent      │                         │ Companion Dashboard   │
 │ (Cursor, Claude Code)  │                         │ (React/Vite/Tailwind) │
 └────────────────────────┘                         └───────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v20+ (recommended: v22+)
- **Ollama** (optional, for local LLM distillation): `ollama run qwen2.5-coder:7b`

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/utkarshsahoo017/AgentRelay.git
cd AgentRelay

# Install dependencies across all workspaces
npm install --prefix cli
npm install --prefix backend
npm install --prefix frontend

# Link CLI globally (or run via node cli/bin/agentrelay.js)
cd cli && npm link && cd ..
```

### 3. Initialize AgentRelay
In any terminal:
```bash
# Initialize local SQLite store and verify model runtime
agentrelay init

# Add a project folder to opt-in capture scope
agentrelay scope add /path/to/my-project

# Check background status
agentrelay status
```

---

## 💻 CLI Command Reference

| Command | Description |
|---|---|
| `agentrelay init` | Initialize local SQLite store (`~/.agentrelay/db.sqlite`) and verify runtime |
| `agentrelay scope <add\|remove\|list> [path]` | Manage opt-in capture folders |
| `agentrelay status` | View background daemon state, queue depth, and capture counts |
| `agentrelay pause` / `resume` | Temporarily pause or resume transcript capture |
| `agentrelay review [--accept\|--reject]` | Review candidate distilled records and write to feedback log |
| `agentrelay search [query] [--json]` | Search local records offline using SQLite FTS5 |
| `agentrelay show <recordId> [--json]` | Display formatted record summary and evidence |
| `agentrelay share <recordId>` | Mark record as shareable with your team (private by default) |
| `agentrelay unshare <recordId>` | Revert record back to private |
| `agentrelay login` | Authenticate with the team server via GitHub OAuth |
| `agentrelay team <create\|list\|invite\|join>` | Manage team workspaces and invitations |
| `agentrelay promote <recordId>` | Upload shareable record to the team server (re-scrubbed on ingest) |
| `agentrelay pull` | Incremental sequence fetch of team records into local replica |
| `agentrelay sync` | 1-command pull & export of Markdown context packs and `CONTEXT.md` |
| `agentrelay handoff <recordId> <@handle>` | Route a context record to a teammate's inbox |
| `agentrelay inbox [--state pending\|read]` | View and acknowledge received context handoffs |
| `agentrelay unpromote <recordId>` | Withdraw a record and propagate tombstone |
| `agentrelay export <recordId>` | Export standalone Markdown context pack with evidence slice |
| `agentrelay mcp` | Start Model Context Protocol (MCP) server over stdio for coding agents |
| `agentrelay daemon` | Run the watcher and distiller background worker loop |

---

## 🤖 AI Agent Integration

### Option A: Automatic `CONTEXT.md` Sync
Run `agentrelay sync` in your project root. AgentRelay fetches all team records and compiles:
- `~/.agentrelay/context/CONTEXT.md` (Global catalog of team decisions and touched code)
- `./.agentrelay/CONTEXT.md` (Project-specific decision index)
Coding agents (Claude Code, Cursor, Windsurf, Aider) will automatically detect and reference this context.

### Option B: Model Context Protocol (MCP)
Add AgentRelay to your Claude Desktop or Cursor MCP configuration (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "agentrelay": {
      "command": "agentrelay",
      "args": ["mcp"]
    }
  }
}
```
Exposes two read-only tools:
- `search_context`: Query past decisions, bug investigations, and architectural context.
- `show_record`: Inspect full evidence-linked context packs.

---

## 🖥️ Web Companion Dashboard

Run the companion web dashboard and backend server:
```bash
# Start backend server (port 4000)
npm run dev --prefix backend

# Start frontend dashboard (port 5173)
npm run dev --prefix frontend
```
Visit `http://localhost:5173` to:
- Browse team context records and file impact maps
- Handoff records to teammates via `@handle`
- Review direct Handoff Inbox
- Inspect the **Tamper-Evident SHA-256 Audit Trail** and verify cryptographic chain integrity with 1 click
- Download self-contained `.md` context packs

---

## 🧪 Testing & Verification

Run the comprehensive test suites:
```bash
# Backend unit & integration tests (41 tests, RBAC, tenant isolation, audit chain)
npm test --prefix backend

# CLI unit tests (9 tests, scrubber, schema, sensitivity, MCP JSON-RPC, context exporter)
npm test --prefix cli

# CLI end-to-end smoke test (15-step pipeline)
node cli/test/e2e-smoke.js

# Scrubber benchmark (100% recall on planted secrets corpus)
node eval/benchmark_scrubber.js

# Frontend production build
npm run build --prefix frontend
```

---

## 📄 License & Attribution

Created as part of the **Polaris Project (OJT Semester 3)**.  
Built by **Utkarsh Ujiyar Sahoo** & **Daksh Vaswani**.
