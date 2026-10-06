# AgentRelay — Multiplayer Coding-Agent Workspace (Polaris Project)

**Team Members:** Daksh Vaswani (`PST-25-0032`), Utkarsh Ujiyar Sahoo (`PST-25-0105`)  
**Batch:** 2025–29 | **Track:** Generative AI | **Domain:** Developer Tools / Multiplayer AI Collaboration  
**Timeline:** 10–12 Weeks | **Level:** Intermediate–Advanced  

---

## 1. Executive Summary & Problem Statement

### Problem
Software engineering teams increasingly rely on AI coding assistants, but interactions are isolated to single developers. When teammates attempt to collaborate around an agent session:
- There is no orderly way to steer the agent or suggest redirects without interrupting the person in control.
- Concurrent prompting quickly turns chaotic or causes race conditions.
- Post-session logs are unreadable, chronological raw event dumps that fail to explain how collaboration occurred.

### Solution
**AgentRelay** is a live multiplayer coding-agent workspace where:
1. **Single-Driver Model with TTL Lock:** One participant drives the agent session at any time; locks expire automatically upon inactivity (no complex CRDT required).
2. **Redirect Queue:** Non-drivers queue suggestions/redirects; the active driver decides whether to approve, deny, or ignore.
3. **Diffs-Only Proposal Engine:** The AI agent operates against a fixed synthetic task/repository, proposing diffs rather than executing code.
4. **Context-Preserving Handoffs:** Control can be handed off explicitly with automatic context snapshots passed to the incoming driver.
5. **Evidence-Grounded LLM Analytics:** After completion, an LLM analyzes the append-only event log to generate an auditable narrative report with linked event IDs and contribution breakdowns.

---

## 2. Architecture & Tech Stack

- **Frontend:** React, Tailwind CSS, Axios, Socket.io-client.
- **Backend / Real-Time Server:** Node.js, Express, Socket.io (room presence, event broadcast, in-process state sync).
- **Persistence:** SQLite (`sessions`, `participants`, `driverLocks`, `redirectRequests`, `handoffEvents`, `diffProposals`, `sessionEvents`, `analyticsReports`).
- **Diff Engine:** `diff` / `jsdiff` operating on a fixed synthetic codebase.
- **LLM Orchestration:** LangChain.js or direct provider SDK (Gemini / Claude / OpenAI) for structured diff generation and post-session narrative aggregation.
- **Hosted Model Approach:** No GPU requirement; all GenAI calls are text-in/text-out over HTTPS.

---

## 3. Architecture Decision Records (ADRs)

| ADR ID | Decision | Core Rationale | Trade-offs Accepted |
|---|---|---|---|
| **ADR-001** | Single-driver control, not CRDT | Simultaneous multi-user prompt editing is an open distributed systems challenge. Single-driver + queue is feasible in 10 weeks while solving the core collaboration pain. | Less simultaneous freeform co-editing. |
| **ADR-002** | Claim / TTL lock instead of custom consensus | First-writer-wins with auto-expiration prevents deadlocks if a driver disconnects or idles. | Centralized coordination on single session-server instance. |
| **ADR-003** | Diffs only, no code execution | Eliminates sandboxing infrastructure, container escape vectors, and execution latency. | Code cannot be executed directly in-browser; diffs are previewed and evaluated visually. |
| **ADR-004** | LLM for diff reasoning & narrative, not control | Humans make all control and merge decisions; AI is strictly restricted to reasoning and narrative reporting. | Requires separate validation pipelines for diff quality and narrative groundedness. |
| **ADR-005** | SQLite for MVP persistence | Zero-ops, single-file database suited for demo scale and student deployment. | Must migrate to PostgreSQL for multi-instance horizontal scaling. |

---

## 4. Product Lifecycle & State Machine

- `SESSION_CREATED`: Initial session created, awaiting participants.
- `ACTIVE`: First participant connects, room live.
- `DRIVER_ASSIGNED`: A participant claims the TTL lock.
- `TASK_IN_PROGRESS`: Driver instruction or approved redirect being processed by Agent.
- `HANDOFF_PENDING`: Explicit handoff initiated or lock TTL expiring; awaiting target participant acceptance.
- `COMPLETED`: Session marked complete; triggers post-session narrative generation.
- `SESSION_ABORTED`: Host terminates session.

---

## 5. Database Entities (SQLite)

- `sessions`: Session metadata, task ID, status, lifecycle timestamps.
- `participants`: Session-to-user mappings and roles.
- `driver_locks`: Active/past driver claims, claim timestamps, TTL expiration.
- `redirect_requests`: Queued suggestions from non-drivers with approval status.
- `handoff_events`: Explicit control handoffs with context snapshots.
- `diff_proposals`: Generated diffs, prompt versions, model metadata.
- `session_events`: Append-only audit log tracking every user action and agent event.
- `analytics_reports`: Post-session LLM narrative, timeline, evidence links, contribution stats.

---

## 6. Implementation Roadmap

- **Phase 1 (Weeks 1–2):** Architecture & Data Model (DB schemas, API contracts, base WebSocket presence).
- **Phase 2 (Weeks 3–4):** Session Control Mechanics (Claim/TTL lock, redirect queue, state machine, event audit log).
- **Phase 3 (Weeks 5–6):** Agent Integration & Context Continuity (LLM diff generation, context snapshots).
- **Phase 4 (Week 7):** Diff Rendering & Redirect Feedback Loop (Split/unified diff viewer, redirect folding).
- **Phase 5 (Week 8):** Analytics Narrative Layer (Append-only log aggregation, evidence-backed narrative).
- **Phase 6 (Week 9):** Frontend Dashboard & Collaboration Polish.
- **Phase 7 (Week 10):** Integration, Testing, Security Audit & Deployment.
