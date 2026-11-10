# AgentRelay — System Architecture & Technical Specification

> **Project:** Polaris OJT Semester 3 — AgentRelay  
> **Document Version:** 1.0 (Polaris PRD v0.1 Alignment)  
> **Authors:** Daksh Vaswani (`PST-25-0032`), Utkarsh Ujiyar Sahoo (`PST-25-0105`)  
> **Track:** Generative AI & Systems Engineering  

---

## 1. Executive Summary & Architectural Pivot

**AgentRelay** is a local-first developer tool that converts ephemeral AI coding-agent sessions (Claude Code, Cursor, Windsurf, Aider) into private, searchable, shareable architectural context records.

### The Architectural Pivot (PRD §1.3)
An earlier conceptual exploration considered real-time multiplayer session steering with driver locks, TTL claims, and CRDT prompt queues. As documented in PRD §1.3 and ADR-009, this approach was **explicitly abandoned**:
- **Why abandoned:** Live locking and co-prompting introduced severe race conditions, network partition deadlocks, high latency, and forced multi-tenant cloud storage of raw keystrokes and API tokens.
- **The Modern Reality:** AI agents work locally and autonomously. The real engineering bottleneck is the loss of decisions, rationale, and touched code when a session finishes.
- **The Modern System:** A **local-first CLI client** that watches local session transcripts, deterministically scrubs secrets, locally distills structured records via a local LLM, and allows selective, scrubbed promotion to a lightweight team server (**Lightweight Context Protocol / LCP**).

---

## 2. High-Level Architecture

The system consists of three distinct tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Local Developer Machine                         │
│                                                                        │
│  ┌───────────────────────┐          ┌───────────────────────────────┐  │
│  │ AI Agent Transcripts   │          │ Local Model Runtime           │  │
│  │ (.claude, .cursor)    │          │ (Ollama: qwen2.5-coder:7b)    │  │
│  └──────────┬────────────┘          └───────────────▲───────────────┘  │
│             │ (Opt-in Scope)                        │ Distill & Review │
│  ┌──────────▼───────────────────────────────────────┴───────────────┐  │
│  │                    AgentRelay Local CLI (Node.js)                │  │
│  │  - Session Watcher (Offset-tracking, latency <= 10s)             │  │
│  │  - Transcript Normalizer & Agent Adapters                        │  │
│  │  - Deterministic Secret Scrubber (Regex + Shannon Entropy)       │  │
│  │  - Distiller & Second-Pass Sensitivity Classifier (FR-011)        │  │
│  │  - Local SQLite Store + FTS5 Full-Text Search Engine             │  │
│  │  - Markdown Context Pack Exporter (sync & CONTEXT.md)             │  │
│  │  - Model Context Protocol (MCP) Stdio Server (FR-027)            │  │
│  └──────────┬───────────────────────────────────────────────▲───────┘  │
└─────────────┼───────────────────────────────────────────────┼──────────┘
              │ Promote (Scrubbed & Shareable)                 │ Pull / Sync
              ▼                                               │
┌─────────────────────────────────────────────────────────────┴──────────┐
│              AgentRelay LCP Team Server (Node.js / Express)            │
│                                                                        │
│  - GitHub OAuth Device Flow Authentication (/api/v1/auth)              │
│  - Multi-Tenant RBAC Authorization Middleware (Team Isolation)          │
│  - Promotion Ingestion Engine with Mandatory Server-Side Re-Scrubber   │
│  - Cryptographic SHA-256 Tamper-Evident Hash Chain Audit Log           │
│  - Incremental Pull Cursor (Sequence-based, Tombstone propagation)     │
│  - Teammate Context Handoffs & Direct Inbox Engine                     │
│  - SQLite Database with Foreign Key Integrity & WAL Mode               │
└─────────────────────────────────────────────────────────────▲──────────┘
                                                              │ REST API
                                              ┌───────────────┴──────────┐
                                              │ Web Companion Dashboard  │
                                              │ (React / Vite / Tailwind)│
                                              └──────────────────────────┘
```

---

## 3. Core Component Design

### 3.1 Local Client (`agentrelay-cli`)
- **Opt-in Scoping (`FR-002`):** Default capture scope is empty. Directories must be explicitly registered via `agentrelay scope add <path>`. Unscoped paths are never accessed.
- **Transcript Watcher (`FR-004`):** Tracks file byte-offsets and inode identity. Re-reading whole files is avoided, achieving $< 10\text{s}$ event detection.
- **Deterministic Scrubber (`FR-007`, `FR-008`):** Pattern and entropy-based redaction running at capture time:
  - AWS Access Keys (`AKIA...` $\rightarrow$ `[REDACTED:aws_key]`)
  - GitHub PATs (`ghp_...` $\rightarrow$ `[REDACTED:github_token]`)
  - AI API Keys (OpenAI `sk-...`, Anthropic `sk-ant-...` $\rightarrow$ `[REDACTED:ai_api_key]`)
  - Database Connection Strings (`postgres://`, `mongodb://` $\rightarrow$ `[REDACTED:db_connection]`)
  - Private RSA/SSH Keys (`-----BEGIN PRIVATE KEY-----` $\rightarrow$ `[REDACTED:private_key]`)
  - Emits typed placeholders and counts; unscrubbed secrets are never persisted or uploaded.
- **Local Distiller (`FR-009`, `FR-010`):** Communicates with local Ollama runtime (`qwen2.5-coder:7b`) to synthesize:
  - Title ($\le 120$ chars) & Summary ($\le 1200$ chars)
  - Key Decisions with cited evidence event IDs (`[e_1, e_2]`)
  - Code files touched and open questions
- **Second-Pass LLM Sensitivity Classifier (`FR-011`, PRD §16.3):** Classifies chunks for prose credentials, internal hostnames (`*.corp`, `*.internal`), and private IP ranges. **Can raise sensitivity to `'review'`; can NEVER lower it.**
- **Context Exporter (`FR-024`):** Compiles standalone Markdown context packs (`record_<id>.md`) and a master `CONTEXT.md` index of all global code files referenced across the codebase for native consumption by coding agents.
- **Model Context Protocol (MCP) Server (`FR-027`):** Exposes a stdio JSON-RPC 2.0 interface supporting `search_context` and `show_record` tools, enabling IDE agents (Claude Code, Cursor, Zed) to query team records natively.

### 3.2 LCP Backend Server (`/api/v1`)
- **Tenant Isolation (`FR-018`, `BR-007`):** Strict authorization middleware enforces that users can only view or mutate records in teams where they hold active membership. Cross-team requests return `404 Not Found` to prevent team enumeration.
- **Server-Side Re-Scrubber (`FR-019`, `TEST-016`):** Any record promoted to the team server is scrubbed again on ingest. Client tampering cannot bypass secret redaction.
- **Tamper-Evident Audit Chain (`PRD §14.2, §20`):** Every promotion, withdrawal, handoff, and membership change creates an audit row where:
  $$\text{hash}_n = \text{SHA-256}(\text{hash}_{n-1} + \text{action} + \text{actor\_id} + \text{team\_id} + \text{record\_id} + \text{metadata} + \text{ts})$$
  The verification endpoint (`GET /api/v1/teams/:id/audit/verify`) detects any retroactive modification, insertion, or deletion.
- **Incremental Pull & Tombstones (`FR-020`, `FR-022`):** Records use a monotonic `seq` cursor. Withdrawals create tombstone rows (`withdrawn_at IS NOT NULL`), propagating deletions to client replicas while preserving audit history.

---

## 4. Database Schemas

### 4.1 Client Local Store (`~/.agentrelay/db.sqlite`)
| Table | Description | Primary Key |
|---|---|---|
| `sessions` | Session metadata, agent type, adapter version, status | `id` |
| `events` | Normalized, scrubbed transcript events with redaction counts | `id` |
| `capture_offsets` | Byte offsets and inode identifiers for incremental tailing | `source_path_hash` |
| `jobs` | Background distillation and sensitivity pipeline queue | `id` |
| `records` | Distilled context records (versioned JSON documents) | `(record_id, version)` |
| `records_fts` | SQLite FTS5 full-text index for offline search | `rowid` |
| `feedback_log` | Review decisions (`accepted`, `edited`, `rejected`) | `id` |
| `team_cursor` | Monotonic sequence cursor per team for incremental pull | `team_id` |

### 4.2 LCP Server Store (`backend/lcp.db`)
| Table | Description | Key Indexes / Constraints |
|---|---|---|
| `users` | User identity and `@handle` | `github_id UNIQUE` |
| `api_tokens` | SHA-256 hashed API tokens with revocable timestamps | `token_hash UNIQUE` |
| `teams` | Team metadata and creator | `id PK` |
| `memberships` | Team membership and RBAC role (`admin` vs `member`) | `(team_id, user_id) PK` |
| `invites` | Expiring invite tokens with usage limits | `token_hash UNIQUE` |
| `records` | Promoted context records with monotonic `seq` and tombstones | `seq PK`, `(team_id, record_id, version) UNIQUE` |
| `audit_events` | Append-only SHA-256 tamper-evident hash chain | `(team_id, ts) INDEX` |
| `inbox` | Context handoff routing between teammates | `(to_user, read_at) INDEX` |

---

## 5. Architectural Decision Records (ADRs)

| ADR ID | Decision | Rationale | Alternatives Considered & Rejected |
|---|---|---|---|
| **ADR-001** | Local-First CLI with Opt-in Scope | Developer privacy; corporate code transcripts never leave developer machine unless explicitly promoted. | Always-on background cloud streaming (rejected due to PII leaks). |
| **ADR-002** | Deterministic Scrubber + Second-Pass LLM | Defense-in-depth: fast, verifiable regex/entropy scan on client and server, backed by semantic prose checks. | Regex-only (misses prose credentials); LLM-only (too slow and non-deterministic). |
| **ADR-003** | Monotonic Sequence Pull with Tombstones | Simplest robust distributed replication; guarantees clients converge to identical state without two-way merge conflicts. | Full CRDT / operational transform (over-engineered for immutable context records). |
| **ADR-004** | Cryptographic Hash Chaining for Audit Logs | Guarantees compliance and tamper detection for enterprise security audits without distributed ledgers. | Plain database logging (vulnerable to internal tampering or SQL injection updates). |
| **ADR-005** | Model Context Protocol (MCP) Read Wrapper | Standardized interop: allows coding assistants to query team records natively without proprietary IDE plugins. | Custom LSP server or proprietary editor extension. |
| **ADR-006** | SQLite with WAL Mode on Client & Server | Zero-dependency deployment, single-file backups, rapid query performance with FTS5. | Postgres / MySQL (excessive setup friction for local tool and team replica). |

---

## 6. Threat Model & Security Mitigations

| Threat ID | Threat Description | Mitigation Strategy |
|---|---|---|
| **T-01** | Accidental Secret Leakage in Promoted Records | Dual-layer scrubbing: Client-side scrubbing at normalization + mandatory server-side re-scrubbing on `POST /records`. Redaction counts logged; raw values never stored. |
| **T-02** | Cross-Tenant Context Snooping | Strict `requireTeamMember` authorization middleware on every `/teams/:id/*` route. Unauthorized requests return `404` to avoid leaking team existence. |
| **T-03** | Malicious / Forged Historical Audit Log | Append-only audit table with SHA-256 hash chaining. Any modified, inserted, or deleted event breaks hash verification. |
| **T-04** | Prompt Injection via Transcript Output | Transcripts treated strictly as data, never instructions. Distiller runs in isolated JSON-mode without tool-execution privileges. |
| **T-05** | Unauthorized Record Withdrawal | Non-author non-admin users receive `403 Forbidden` when attempting to withdraw records (`DELETE /teams/:id/records/:recordId`). |
| **T-06** | Denial of Service / Payload Flooding | Server enforces strict 512KB body limits (`413 Payload Too Large`), per-token sliding window rate limiters (`429 Too Many Requests`), and bounded query limits. |

---

## 7. Verification & Compliance Matrix

| PRD Section | Requirement | Test Suite & Status |
|---|---|---|
| §8.1 | FR-001 to FR-008 (Capture, Adapters, Scrubber) | `cli/test/cli.test.js`, `eval/benchmark_scrubber.js` (100% recall) |
| §8.1 | FR-009 to FR-011 (Distillation, Sensitivity) | `cli/test/cli.test.js` (FR-011 tested) |
| §8.1 | FR-012 to FR-015 (Search, Show, Review, Share) | `cli/test/e2e-smoke.js` (15 end-to-end tests passing) |
| §8.2 | FR-016 to FR-018 (Auth, Teams, RBAC) | `backend/test/auth.test.js`, `tenant_isolation.test.js` |
| §8.2 | FR-019 to FR-022 (Promote, Pull, Tombstones) | `backend/test/records.test.js` (TEST-013, TEST-014, TEST-016, TEST-018) |
| §8.2 | FR-023 to FR-025 (Handoff, Context Pack, Audit) | `backend/test/handoff.test.js`, `audit_trail.test.js` |
| §8.2 | FR-027 (Model Context Protocol wrapper) | `cli/test/cli.test.js`, `e2e-smoke.js` (JSON-RPC stdio verified) |
