#!/usr/bin/env python3
"""
Generates the comprehensive AgentRelay Command & Systems Reference PDF.
Output: AgentRelay_Commands_Guide.pdf
"""

import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and draw total page count and headers."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 755, "AGENTRELAY — CLI & SYSTEMS COMMAND REFERENCE")
            self.setFont("Helvetica", 8)
            self.drawRightString(572, 755, "Polaris Project • Semester 3")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.6)
            self.line(40, 747, 572, 747)

        # Running Footer (all pages)
        self.setFont("Helvetica", 8)
        self.drawString(40, 26, "AgentRelay v1.0.0 — Local-First AI Agent Context Records & LCP Engine")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 26, page_str)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.6)
        self.line(40, 36, 572, 36)

        self.restoreState()


def build_pdf(filename="AgentRelay_Commands_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=46,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        spaceAfter=14,
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6,
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#1E293B'),
    )

    code_block_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0F172A'),
    )

    th_style = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    td_cmd_style = ParagraphStyle(
        'TableCellCmd',
        fontName='Courier-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#4338CA'),
    )

    td_desc_style = ParagraphStyle(
        'TableCellDesc',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
    )

    elements = []

    # Title & Metadata Banner
    elements.append(Paragraph("AgentRelay — CLI & Systems Command Reference", title_style))
    elements.append(Paragraph(
        "<b>Complete developer reference</b> covering global installation, local initialization, opt-in capture scoping, "
        "background watcher daemons, offline search, MCP agent interop, team synchronization, sudo / zsh permission workarounds, "
        "and full data lifecycle management.",
        subtitle_style
    ))

    # Architecture Overview Box
    meta_box = [
        [
            Paragraph("<b>Target OS:</b> macOS (zsh) / Linux", callout_style),
            Paragraph("<b>Version:</b> 1.0.0 (Polaris PRD v0.1)", callout_style),
            Paragraph("<b>Authors:</b> Utkarsh Sahoo & Daksh Vaswani", callout_style),
        ],
        [
            Paragraph("<b>Store:</b> SQLite + FTS5 (~/.agentrelay)", callout_style),
            Paragraph("<b>Local Model:</b> Ollama (qwen2.5-coder:7b)", callout_style),
            Paragraph("<b>Cloud:</b> LCP Express REST Server (/api/v1)", callout_style),
        ]
    ]
    meta_table = Table(meta_box, colWidths=[175, 175, 182])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # Helper function to create standard tables
    def make_table(data, widths=[180, 352]):
        t = Table(data, colWidths=widths)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        return t

    def make_code_box(code_text, bg='#F1F5F9'):
        t = Table([[Paragraph(code_text.replace('\n', '<br/>'), code_block_style)]], colWidths=[532])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(bg)),
            ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        return t

    # SECTION 1: INSTALLATION & GLOBAL SETUP
    elements.append(Paragraph("1. Installation & Global Setup (Including Sudo & Zsh Workarounds)", h1_style))
    elements.append(Paragraph(
        "AgentRelay is a monorepo consisting of a Node.js CLI, an Express LCP backend, and a React dashboard. "
        "On macOS, installing global packages can occasionally encounter <code>EACCES: permission denied</code> "
        "if system directories are protected. Multiple install methods are supported below.",
        body_style
    ))

    install_rows = [
        [Paragraph("Method / Scenario", th_style), Paragraph("Command & Functional Description", th_style)],
        [
            Paragraph("Standard Dependencies", td_cmd_style),
            Paragraph("<code>npm install --prefix cli<br/>npm install --prefix backend<br/>npm install --prefix frontend</code><br/>"
                      "Installs all third-party dependencies across the workspace.", td_desc_style),
        ],
        [
            Paragraph("Standard Global Link<br/><i>(Run inside project)</i>", td_cmd_style),
            Paragraph("<code>cd ~/Desktop/DESKTOP/AgentRelay/cli && npm link && cd ..</code><br/>"
                      "Symlinks the <code>agentrelay</code> binary into your system PATH.", td_desc_style),
        ],
        [
            Paragraph("Global Install via Path", td_cmd_style),
            Paragraph("<code>npm install -g ~/Desktop/DESKTOP/AgentRelay/cli</code><br/>"
                      "Directly installs the CLI globally from any working directory.", td_desc_style),
        ],
        [
            Paragraph("<b>EACCES Fix A: Sudo Global</b><br/><i>(Administrator)</i>", td_cmd_style),
            Paragraph("<code>sudo npm install -g ~/Desktop/DESKTOP/AgentRelay/cli</code><br/>"
                      "Overcomes macOS permission lock on <code>/usr/local/lib/node_modules</code>. Prompts for Mac password once.", td_desc_style),
        ],
        [
            Paragraph("<b>EACCES Fix B: Zsh Alias</b><br/><i>(Zero Sudo — Recommended)</i>", td_cmd_style),
            Paragraph("<code>echo 'alias agentrelay=\"node ~/Desktop/DESKTOP/AgentRelay/cli/bin/agentrelay.js\"' &gt;&gt; ~/.zshrc &amp;&amp; source ~/.zshrc</code><br/>"
                      "Permanent shell alias. Requires zero administrator privileges and works instantly in every terminal.", td_desc_style),
        ],
        [
            Paragraph("<b>EACCES Fix C: Chown Fix</b><br/><i>(Fix npm permissions)</i>", td_cmd_style),
            Paragraph("<code>sudo chown -R $(whoami) /usr/local/lib/node_modules /usr/local/bin</code><br/>"
                      "Permanently restores write ownership to your user account so npm never needs sudo again.", td_desc_style),
        ],
        [
            Paragraph("Installation Verification", td_cmd_style),
            Paragraph("<code>agentrelay --version</code> &nbsp;(Outputs: <code>1.0.0</code>)<br/>"
                      "<code>agentrelay --help</code> &nbsp;(Displays master command catalog)", td_desc_style),
        ],
    ]
    elements.append(make_table(install_rows))
    elements.append(Spacer(1, 10))

    # SECTION 2: INITIALIZATION & SCOPE MANAGEMENT
    elements.append(Paragraph("2. Initialization & Opt-In Scope Management", h1_style))
    elements.append(Paragraph(
        "By architectural design (PRD §8.1 FR-001, FR-002), AgentRelay enforces <b>strict opt-in scoping</b>. "
        "The default scope is completely empty; files and agent transcripts outside explicitly scoped folders are never opened.",
        body_style
    ))

    init_rows = [
        [Paragraph("Command", th_style), Paragraph("Functional Specification & Acceptance Criteria", th_style)],
        [
            Paragraph("agentrelay init", td_cmd_style),
            Paragraph("Creates <code>~/.agentrelay/</code> directory, initializes <code>db.sqlite</code> (WAL mode + FTS5 index), "
                      "generates default <code>config.json</code>, verifies local model runtime (Ollama), and if authenticated, pulls team context records.", td_desc_style),
        ],
        [
            Paragraph("agentrelay status", td_cmd_style),
            Paragraph("Displays active daemon state, list of registered capture folders, total indexed sessions, scrubbed events count, "
                      "distilled records count, distillation job queue depth, and model endpoint status.", td_desc_style),
        ],
        [
            Paragraph("agentrelay scope add &lt;path&gt;", td_cmd_style),
            Paragraph("Registers a folder path for transcript observation. The watcher begins tailing sessions inside <code>.claude/</code>, <code>.cursor/</code>, etc.", td_desc_style),
        ],
        [
            Paragraph("agentrelay scope list", td_cmd_style),
            Paragraph("Lists all directories currently registered for session capture.", td_desc_style),
        ],
        [
            Paragraph("agentrelay scope remove &lt;path&gt;", td_cmd_style),
            Paragraph("Removes a folder from observation. Ceases all transcript capture for that directory immediately.", td_desc_style),
        ],
        [
            Paragraph("agentrelay pause", td_cmd_style),
            Paragraph("Temporarily halts session watcher capture across all scopes (zero capture mode).", td_desc_style),
        ],
        [
            Paragraph("agentrelay resume", td_cmd_style),
            Paragraph("Resumes session watcher capture across all registered scopes.", td_desc_style),
        ],
    ]
    elements.append(make_table(init_rows))
    elements.append(Spacer(1, 10))

    # SECTION 3: DAEMON & CAPTURE PIPELINE
    elements.append(Paragraph("3. Daemon, Background Execution & Distillation Pipeline", h1_style))
    elements.append(Paragraph(
        "The background worker tails transcript files using inode-tracking and byte-offsets (&le; 10s latency), "
        "scrubs planted secrets deterministically, and runs the local distillation pipeline.",
        body_style
    ))

    daemon_rows = [
        [Paragraph("Command / Mode", th_style), Paragraph("Functionality & Shell Workflow", th_style)],
        [
            Paragraph("agentrelay daemon", td_cmd_style),
            Paragraph("Runs the continuous watcher, normalizer, secret scrubber, and distillation queue processor in the foreground.", td_desc_style),
        ],
        [
            Paragraph("<b>Zsh Background Daemon</b><br/><i>(Run in background)</i>", td_cmd_style),
            Paragraph("<code>nohup agentrelay daemon &gt; ~/.agentrelay/daemon.log 2&gt;&amp;1 &amp;</code><br/>"
                      "Runs daemon persistently in the background. Logs are written to <code>~/.agentrelay/daemon.log</code>.", td_desc_style),
        ],
        [
            Paragraph("Check Daemon Status", td_cmd_style),
            Paragraph("<code>ps aux | grep \"agentrelay daemon\"</code><br/>Checks if the background process is running.", td_desc_style),
        ],
        [
            Paragraph("Stop Background Daemon", td_cmd_style),
            Paragraph("<code>kill $(pgrep -f \"agentrelay daemon\")</code><br/>Gracefully terminates the running background worker.", td_desc_style),
        ],
        [
            Paragraph("agentrelay retry [sessionId]", td_cmd_style),
            Paragraph("Re-queues distillation jobs that encountered model timeouts or transient errors.", td_desc_style),
        ],
    ]
    elements.append(make_table(daemon_rows))
    elements.append(Spacer(1, 10))

    # SECTION 4: REVIEW & OFFLINE SEARCH
    elements.append(Paragraph("4. Review, Feedback, Search & Record Sharing", h1_style))
    review_rows = [
        [Paragraph("Command", th_style), Paragraph("Functionality & Options", th_style)],
        [
            Paragraph("agentrelay review", td_cmd_style),
            Paragraph("Interactive CLI review of candidate distilled records. Supports <b>accept</b>, <b>edit</b> (creates new version), and <b>reject</b>.", td_desc_style),
        ],
        [
            Paragraph("agentrelay review --accept", td_cmd_style),
            Paragraph("Batch-accepts all unreviewed candidate records into the verified store.", td_desc_style),
        ],
        [
            Paragraph("agentrelay review --reject", td_cmd_style),
            Paragraph("Batch-rejects all candidate records, removing them from search and promotion.", td_desc_style),
        ],
        [
            Paragraph("agentrelay search [query]", td_cmd_style),
            Paragraph("Performs high-speed offline search over sessions, decisions, tags, and files touched using SQLite FTS5.", td_desc_style),
        ],
        [
            Paragraph("agentrelay search [query] --json", td_cmd_style),
            Paragraph("Outputs matching context records in structured JSON schema.", td_desc_style),
        ],
        [
            Paragraph("agentrelay show &lt;recordId&gt;", td_cmd_style),
            Paragraph("Displays full record summary, decisions citing evidence IDs, and files touched. Supports full UUID or prefix.", td_desc_style),
        ],
        [
            Paragraph("agentrelay show &lt;recordId&gt; --json", td_cmd_style),
            Paragraph("Outputs full record JSON including provenance and sensitivity metadata.", td_desc_style),
        ],
        [
            Paragraph("agentrelay share &lt;recordId&gt;", td_cmd_style),
            Paragraph("Marks a record as shareable with your team. (Records are strictly <b>private by default</b> per PRD FR-015).", td_desc_style),
        ],
        [
            Paragraph("agentrelay unshare &lt;recordId&gt;", td_cmd_style),
            Paragraph("Reverts a record back to private status, preventing promotion.", td_desc_style),
        ],
    ]
    elements.append(make_table(review_rows))
    elements.append(Spacer(1, 10))

    # SECTION 5: GLOBAL CONTEXT SYNC & MCP SERVER
    elements.append(Paragraph("5. Global Context Sync, Markdown Packs & MCP Server (Agent Interop)", h1_style))
    elements.append(Paragraph(
        "AgentRelay bridges human-reviewed team decisions directly to AI coding agents (Claude Code, Cursor, Windsurf, Aider) "
        "via file-based sync and standard Model Context Protocol (MCP) over stdio.",
        body_style
    ))

    sync_rows = [
        [Paragraph("Command", th_style), Paragraph("Functionality & Agent Interoperability", th_style)],
        [
            Paragraph("agentrelay sync", td_cmd_style),
            Paragraph("<b>1-Command Master Synchronization:</b><br/>"
                      "1. Pulls all team context records from the LCP server via sequence cursor.<br/>"
                      "2. Extracts and catalogs all global code files referenced across sessions.<br/>"
                      "3. Exports individual Markdown context packs to <code>~/.agentrelay/context/record_*.md</code>.<br/>"
                      "4. Compiles <code>~/.agentrelay/context/CONTEXT.md</code> and project-level <code>.agentrelay/CONTEXT.md</code>.", td_desc_style),
        ],
        [
            Paragraph("agentrelay export &lt;recordId&gt;", td_cmd_style),
            Paragraph("Exports a single record as a self-contained Markdown context pack (<code>context_pack_*.md</code>).", td_desc_style),
        ],
        [
            Paragraph("agentrelay export &lt;recordId&gt; --pack", td_cmd_style),
            Paragraph("Includes the full raw scrubbed session chat and tool event slice in the Markdown pack.", td_desc_style),
        ],
        [
            Paragraph("agentrelay mcp", td_cmd_style),
            Paragraph("<b>Model Context Protocol (MCP) Stdio JSON-RPC Server (FR-027):</b><br/>"
                      "Exposes read-only tools to IDE coding assistants: <code>search_context</code> (query past decisions and touched code) "
                      "and <code>show_record</code> (retrieve full evidence context pack).", td_desc_style),
        ],
    ]
    elements.append(make_table(sync_rows))
    elements.append(Spacer(1, 6))

    # MCP Config Code Snippet
    elements.append(Paragraph("<b>Claude Desktop / Cursor Configuration (<code>claude_desktop_config.json</code>):</b>", body_style))
    mcp_config = (
        '{\n'
        '  "mcpServers": {\n'
        '    "agentrelay": {\n'
        '      "command": "agentrelay",\n'
        '      "args": ["mcp"]\n'
        '    }\n'
        '  }\n'
        '}'
    )
    elements.append(make_code_box(mcp_config))
    elements.append(Spacer(1, 10))

    # SECTION 6: TEAM COLLABORATION, HANDOFFS & LCP SERVER
    elements.append(Paragraph("6. Team Collaboration, Handoffs & LCP Cloud (PRD §8.2)", h1_style))
    elements.append(Paragraph(
        "Lightweight Context Protocol (LCP) REST server featuring tenant isolation, cryptographic SHA-256 audit chaining, and teammate handoffs.",
        body_style
    ))

    team_rows = [
        [Paragraph("Command", th_style), Paragraph("Functionality & API Endpoints", th_style)],
        [
            Paragraph("agentrelay login", td_cmd_style),
            Paragraph("Authenticates with the LCP team server via GitHub OAuth device flow. Stores revocable API token in <code>~/.agentrelay/auth.json</code> (0o600).", td_desc_style),
        ],
        [
            Paragraph("agentrelay login --token &lt;tok&gt;", td_cmd_style),
            Paragraph("Authenticates directly using an existing LCP / GitHub API access token.", td_desc_style),
        ],
        [
            Paragraph("agentrelay logout", td_cmd_style),
            Paragraph("Clears local credentials from <code>auth.json</code>.", td_desc_style),
        ],
        [
            Paragraph("agentrelay team create &lt;name&gt;", td_cmd_style),
            Paragraph("Creates a new isolated team workspace (sets creator as <code>admin</code>).", td_desc_style),
        ],
        [
            Paragraph("agentrelay team list", td_cmd_style),
            Paragraph("Lists all teams the user belongs to along with member rosters.", td_desc_style),
        ],
        [
            Paragraph("agentrelay team invite", td_cmd_style),
            Paragraph("Generates an expiring, single-use cryptographic team invite token.", td_desc_style),
        ],
        [
            Paragraph("agentrelay team join &lt;token&gt;", td_cmd_style),
            Paragraph("Joins an existing team workspace using an invite token.", td_desc_style),
        ],
        [
            Paragraph("agentrelay promote &lt;recordId&gt;", td_cmd_style),
            Paragraph("Promotes a shareable record to the team server. The server runs a <b>mandatory re-scrubbing pass</b> on ingest and appends an event to the SHA-256 audit chain.", td_desc_style),
        ],
        [
            Paragraph("agentrelay unpromote &lt;recordId&gt;", td_cmd_style),
            Paragraph("Withdraws a record from the team. Creates an immutable tombstone that propagates on pull.", td_desc_style),
        ],
        [
            Paragraph("agentrelay pull", td_cmd_style),
            Paragraph("Fetches new team records and tombstones incrementally using a monotonic sequence cursor.", td_desc_style),
        ],
        [
            Paragraph("agentrelay handoff &lt;recId&gt; &lt;@user&gt;", td_cmd_style),
            Paragraph("Routes a context record directly to a teammate's inbox with notification provenance.", td_desc_style),
        ],
        [
            Paragraph("agentrelay inbox [options]", td_cmd_style),
            Paragraph("Lists received context handoffs. Flags: <code>--state pending|read</code>, <code>--read &lt;id&gt;</code>, <code>--json</code>.", td_desc_style),
        ],
    ]
    elements.append(make_table(team_rows))
    elements.append(Spacer(1, 10))

    # SECTION 7: SERVER & DASHBOARD DEVELOPMENT
    elements.append(Paragraph("7. Backend Server & Web Companion Dashboard", h1_style))
    server_rows = [
        [Paragraph("Target Workspace", th_style), Paragraph("Command & Operational Purpose", th_style)],
        [
            Paragraph("Backend Dev Server", td_cmd_style),
            Paragraph("<code>npm run dev --prefix backend</code><br/>Runs the Express LCP REST server on <b>port 4000</b> with Nodemon live-reloading.", td_desc_style),
        ],
        [
            Paragraph("Backend Production", td_cmd_style),
            Paragraph("<code>npm run start --prefix backend</code><br/>Runs the backend server in production mode.", td_desc_style),
        ],
        [
            Paragraph("Backend Seed", td_cmd_style),
            Paragraph("<code>npm run seed --prefix backend</code><br/>Populates <code>lcp.db</code> with mock teams, users, and context records.", td_desc_style),
        ],
        [
            Paragraph("Frontend Dev Server", td_cmd_style),
            Paragraph("<code>npm run dev --prefix frontend</code><br/>Launches Vite HMR companion dashboard on <b>port 5173</b>.", td_desc_style),
        ],
        [
            Paragraph("Frontend Production Build", td_cmd_style),
            Paragraph("<code>npm run build --prefix frontend</code><br/>Compiles optimized static production assets into <code>frontend/dist/</code>.", td_desc_style),
        ],
        [
            Paragraph("Frontend Preview", td_cmd_style),
            Paragraph("<code>npm run preview --prefix frontend</code><br/>Locally previews the compiled production build.", td_desc_style),
        ],
    ]
    elements.append(make_table(server_rows))
    elements.append(Spacer(1, 10))

    # SECTION 8: TESTING & VERIFICATION
    elements.append(Paragraph("8. Automated Testing, Isolation & Security Benchmarks", h1_style))
    test_rows = [
        [Paragraph("Test Suite / Benchmark", th_style), Paragraph("Command & Coverage", th_style)],
        [
            Paragraph("CLI Unit Test Suite", td_cmd_style),
            Paragraph("<code>npm test --prefix cli</code><br/>9 tests: scrubber, normalizer, adapter, schema validation, FR-011 sensitivity classifier, context exporter, and MCP JSON-RPC protocol.", td_desc_style),
        ],
        [
            Paragraph("Backend Security Suite", td_cmd_style),
            Paragraph("<code>npm test --prefix backend</code><br/>41 tests: multi-tenant isolation, GitHub OAuth, rate limiting, record lifecycle, tombstones, handoff inbox, and SHA-256 tamper-evident audit chain.", td_desc_style),
        ],
        [
            Paragraph("CLI E2E Smoke Pipeline", td_cmd_style),
            Paragraph("<code>node cli/test/e2e-smoke.js</code><br/>15-step headless end-to-end integration test creating a temporary project, capturing, scrubbing, distilling, reviewing, sharing, exporting, syncing, and querying MCP.", td_desc_style),
        ],
        [
            Paragraph("Scrubber Metric M-1 Benchmark", td_cmd_style),
            Paragraph("<code>node eval/benchmark_scrubber.js</code><br/>Evaluates secret redaction recall against 24 planted secrets (AWS keys, GitHub PATs, AI keys, connection strings, private keys). <b>100% recall target achieved.</b>", td_desc_style),
        ],
        [
            Paragraph("<b>All-in-One Verification</b><br/><i>(CI / Defense Command)</i>", td_cmd_style),
            Paragraph("<code>npm test --prefix cli &amp;&amp; npm test --prefix backend &amp;&amp; node cli/test/e2e-smoke.js &amp;&amp; node eval/benchmark_scrubber.js &amp;&amp; npm run build --prefix frontend</code><br/>"
                      "Executes the entire automated test and build pipeline in a single command.", td_desc_style),
        ],
    ]
    elements.append(make_table(test_rows))
    elements.append(Spacer(1, 10))

    # SECTION 9: PURGE, RESET & DELETION / UNINSTALLATION
    elements.append(Paragraph("9. Purge, Reset & Deletion / Uninstallation", h1_style))
    purge_rows = [
        [Paragraph("Target Component", th_style), Paragraph("Command & Deletion Scope", th_style)],
        [
            Paragraph("agentrelay purge --events", td_cmd_style),
            Paragraph("Purges only the raw scrubbed events table from local SQLite (reclaims disk space while preserving distilled records).", td_desc_style),
        ],
        [
            Paragraph("agentrelay purge --all", td_cmd_style),
            Paragraph("Purges all local sessions, events, jobs, records, and byte offsets from the SQLite store.", td_desc_style),
        ],
        [
            Paragraph("Reset Server Database", td_cmd_style),
            Paragraph("<code>rm -f backend/lcp.db backend/lcp.db-wal backend/lcp.db-shm</code><br/>Wipes the backend SQLite database to return the team server to a clean state.", td_desc_style),
        ],
        [
            Paragraph("Delete Local Client Store", td_cmd_style),
            Paragraph("<code>rm -rf ~/.agentrelay</code><br/>Deletes all client configuration, tokens, local SQLite databases, and exported context packs.", td_desc_style),
        ],
        [
            Paragraph("Delete Repository Context", td_cmd_style),
            Paragraph("<code>rm -rf .agentrelay/</code><br/>Removes project-level <code>CONTEXT.md</code> files from current working repository.", td_desc_style),
        ],
        [
            Paragraph("Global Uninstall (npm link)", td_cmd_style),
            Paragraph("<code>cd ~/Desktop/DESKTOP/AgentRelay/cli &amp;&amp; npm unlink -g agentrelay &amp;&amp; cd ..</code><br/>Removes global symlink from <code>/usr/local/bin</code>.", td_desc_style),
        ],
        [
            Paragraph("Global Uninstall (npm -g)", td_cmd_style),
            Paragraph("<code>npm uninstall -g agentrelay-cli</code><br/>Uninstalls globally installed package.", td_desc_style),
        ],
        [
            Paragraph("Remove Zsh Shell Alias", td_cmd_style),
            Paragraph("<code>sed -i '' '/agentrelay/d' ~/.zshrc &amp;&amp; source ~/.zshrc</code><br/>Removes the alias from your zsh configuration file.", td_desc_style),
        ],
    ]
    elements.append(make_table(purge_rows))
    elements.append(Spacer(1, 14))

    # Concluding banner
    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"✔ Successfully generated: {filename}")


if __name__ == '__main__':
    out_file = sys.argv[1] if len(sys.argv) > 1 else "AgentRelay_Commands_Guide.pdf"
    build_pdf(out_file)
