import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function CliCommandsModal({ isOpen, onClose, activeTeamId, recordId }) {
  const [copiedCmd, setCopiedCmd] = useState(null);
  const [filter, setFilter] = useState('');

  if (!isOpen) return null;

  const copyToClipboard = (cmd, id) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const currentTeam = activeTeamId || '<teamId>';
  const currentRecord = recordId || '<recordId>';

  const commandGroups = [
    {
      title: '🚀 Setup & Local Capture',
      commands: [
        {
          id: 'init',
          name: 'Initialize AgentRelay',
          cmd: 'npx agentrelay-cli init',
          desc: 'Creates ~/.agentrelay store and verifies local model runtime',
        },
        {
          id: 'scope_add',
          name: 'Scope Project Folder',
          cmd: 'agentrelay scope add ~/path/to/project',
          desc: 'Opt-in folder for automated AI transcript interception',
        },
        {
          id: 'status',
          name: 'Check Status',
          cmd: 'agentrelay status',
          desc: 'View active daemon status, capture counts, and queue depth',
        },
        {
          id: 'daemon',
          name: 'Start Daemon',
          cmd: 'agentrelay daemon',
          desc: 'Runs background watcher & distiller (scans every 5s)',
        },
      ],
    },
    {
      title: '📤 Add Code & Context to Workspace',
      commands: [
        {
          id: 'promote',
          name: 'Promote Record to Team',
          cmd: `agentrelay promote ${currentRecord} --team ${currentTeam}`,
          desc: 'Upload a reviewed local record to this team workspace',
        },
        {
          id: 'share',
          name: 'Mark Record Shareable',
          cmd: `agentrelay share ${currentRecord}`,
          desc: 'Permits a private record to be promoted to team server',
        },
        {
          id: 'review',
          name: 'Review Candidate Records',
          cmd: 'agentrelay review --accept',
          desc: 'Accept distilled records into your verified local store',
        },
        {
          id: 'pull',
          name: 'Pull Team Records',
          cmd: 'agentrelay pull',
          desc: 'Fetch new team context records into your local store',
        },
        {
          id: 'sync',
          name: 'Master Sync & CONTEXT.md',
          cmd: 'agentrelay sync',
          desc: 'Pull team records and compile CONTEXT.md decision index',
        },
      ],
    },
    {
      title: '👥 Team & Workspace Management',
      commands: [
        {
          id: 'team_join',
          name: 'Join Team with Token',
          cmd: 'agentrelay team join <inviteToken>',
          desc: 'Join a team workspace using an invite token',
        },
        {
          id: 'team_invite',
          name: 'Create Team Invite',
          cmd: `agentrelay team invite ${currentTeam}`,
          desc: 'Generate an expiring single-use team invite token',
        },
        {
          id: 'team_list',
          name: 'List Teams',
          cmd: 'agentrelay team list',
          desc: 'Display all teams and your current role',
        },
        {
          id: 'team_create',
          name: 'Create Team',
          cmd: 'agentrelay team create "Acme Engineering"',
          desc: 'Create a new team workspace',
        },
        {
          id: 'team_remove',
          name: 'Remove Team Workspace',
          cmd: `agentrelay team remove ${currentTeam}`,
          desc: 'Delete a team workspace (requires admin role)',
        },
        {
          id: 'team_leave',
          name: 'Leave Team Workspace',
          cmd: `agentrelay team leave ${currentTeam}`,
          desc: 'Leave a team workspace',
        },
        {
          id: 'handoff',
          name: 'Handoff to Teammate',
          cmd: `agentrelay handoff ${currentRecord} @teammate`,
          desc: 'Route context pack directly to a teammate\'s inbox',
        },
      ],
    },
    {
      title: '🤖 AI Agent Interop (MCP & Offline)',
      commands: [
        {
          id: 'mcp',
          name: 'Start MCP Stdio Server',
          cmd: 'agentrelay mcp',
          desc: 'Native JSON-RPC server for Cursor & Claude Desktop',
        },
        {
          id: 'search',
          name: 'Search Records Offline',
          cmd: 'agentrelay search "auth middleware"',
          desc: 'Full-text FTS5 offline search over past sessions',
        },
        {
          id: 'show',
          name: 'Show Record Details',
          cmd: `agentrelay show ${currentRecord}`,
          desc: 'Inspect decisions, evidence, and touched code files',
        },
        {
          id: 'export',
          name: 'Export Markdown Context Pack',
          cmd: `agentrelay export ${currentRecord}`,
          desc: 'Generate standalone Markdown pack with transcript slice',
        },
      ],
    },
  ];

  const filteredGroups = commandGroups
    .map((g) => ({
      ...g,
      commands: g.commands.filter(
        (c) =>
          !filter ||
          c.name.toLowerCase().includes(filter.toLowerCase()) ||
          c.cmd.toLowerCase().includes(filter.toLowerCase()) ||
          c.desc.toLowerCase().includes(filter.toLowerCase())
      ),
    }))
    .filter((g) => g.commands.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-white/[0.12] bg-[#121212] p-6 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-mono font-bold">
              ⚡
            </span>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                CLI Commands & Quick Reference
              </h2>
              <p className="text-xs text-white/50">
                Execute these in your terminal to interact with AgentRelay & team workspace{' '}
                <code className="text-emerald-400 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">
                  {currentTeam}
                </code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/80 transition-colors flex items-center gap-1.5"
            >
              <span>Full Docs</span>
              <span>↗</span>
            </Link>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white text-base p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Filter commands (e.g. promote, scope, mcp, join)..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-white/20 text-xs text-white placeholder-white/30 outline-hidden font-mono"
            autoFocus
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="absolute right-3 top-2.5 text-xs text-white/40 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Command list */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 font-sans">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-xs text-white/40">
              No commands match &quot;{filter}&quot;
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.title} className="space-y-2.5">
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {group.title}
                </h3>
                <div className="grid gap-2">
                  {group.commands.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white/90">{c.name}</span>
                          <span className="text-[11px] text-white/40">— {c.desc}</span>
                        </div>
                        <code className="block text-xs font-mono text-emerald-400/90 bg-black/60 px-2.5 py-1 rounded-md border border-white/[0.06] select-all truncate">
                          {c.cmd}
                        </code>
                      </div>
                      <button
                        onClick={() => copyToClipboard(c.cmd, c.id)}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-white text-xs font-mono font-medium transition-colors shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {copiedCmd === c.id ? (
                          <>
                            <span className="text-emerald-400">✓</span>
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <span>📋</span>
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-white/[0.08] pt-3 flex items-center justify-between text-xs text-white/40">
          <span>Tip: Replace placeholder arguments with your actual project values</span>
          <Link to="/docs" target="_blank" className="text-emerald-400 hover:underline">
            View Complete Interactive Manual →
          </Link>
        </div>
      </div>
    </div>
  );
}

