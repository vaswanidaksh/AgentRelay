import readline from 'readline';
import { getDb } from '../db.js';
import { formatRecordToMarkdown } from '../core/contextExporter.js';

export const MCP_SERVER_INFO = {
  name: 'agentrelay-mcp',
  version: '1.0.0',
};

export const MCP_TOOLS = [
  {
    name: 'search_context',
    description: 'Search distilled team context records, past architectural decisions, and touched code files using keywords or query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query or keywords (e.g., "auth middleware", "database schema", "JWT")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return (default 5, max 20)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'show_record',
    description: 'Retrieve full context pack and decisions for a specific record ID or prefix.',
    inputSchema: {
      type: 'object',
      properties: {
        recordId: {
          type: 'string',
          description: 'Full or prefix record ID (e.g., "rec-101" or first 8 chars of UUID)',
        },
      },
      required: ['recordId'],
    },
  },
];

/**
 * Executes a search over the local SQLite store (FTS5 / LIKE)
 * @param {string} query Search terms
 * @param {number} limit Max records
 * @returns {Array} List of matching record content
 */
export function executeSearch(query, limit = 5) {
  const db = getDb();
  const max = Math.min(Math.max(1, limit || 5), 20);
  let rows = [];

  if (!query || query.trim() === '') {
    rows = db.prepare('SELECT * FROM records ORDER BY created_at DESC LIMIT ?').all(max);
  } else {
    try {
      const ftsMatches = db.prepare(`
        SELECT record_id FROM records_fts WHERE records_fts MATCH ? LIMIT ?
      `).all(query, max);

      if (ftsMatches.length > 0) {
        const ids = ftsMatches.map(m => m.record_id);
        const placeholders = ids.map(() => '?').join(',');
        rows = db.prepare(`SELECT * FROM records WHERE record_id IN (${placeholders}) ORDER BY created_at DESC`).all(...ids);
      }
    } catch {
      // Fallback SQL LIKE search
      const likePattern = `%${query}%`;
      rows = db.prepare(`
        SELECT * FROM records
        WHERE json LIKE ? OR project_tag LIKE ?
        ORDER BY created_at DESC LIMIT ?
      `).all(likePattern, likePattern, max);
    }
  }

  return rows.map(r => {
    try {
      return JSON.parse(r.json);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Retrieves a single context record by ID or prefix
 * @param {string} recordId
 * @returns {object|null}
 */
export function executeShow(recordId) {
  if (!recordId) return null;
  const db = getDb();

  // Try exact match first
  let row = db.prepare('SELECT * FROM records WHERE record_id = ? ORDER BY version DESC LIMIT 1').get(recordId);
  if (!row) {
    // Try prefix match
    row = db.prepare('SELECT * FROM records WHERE record_id LIKE ? ORDER BY version DESC LIMIT 1').get(`${recordId}%`);
  }

  if (!row) return null;

  try {
    const record = JSON.parse(row.json);
    const events = db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY seq ASC')
      .all(record.source?.sessionId || '');
    return { record, events };
  } catch {
    return null;
  }
}

/**
 * Dispatches an MCP JSON-RPC 2.0 request and returns the response object
 * @param {object} req
 * @returns {object|null} JSON-RPC response or null if notification
 */
export async function handleMcpRequest(req) {
  if (!req || typeof req !== 'object') {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid Request' },
    };
  }

  const { id, method, params } = req;

  // Handle notifications (no response needed)
  if (id === undefined || id === null) {
    if (method === 'notifications/initialized') {
      return null;
    }
    return null;
  }

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: MCP_SERVER_INFO,
        },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS,
        },
      };

    case 'tools/call': {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'search_context') {
        const query = args.query || '';
        const limit = args.limit || 5;
        const matches = executeSearch(query, limit);

        if (matches.length === 0) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `No past context records found matching query: "${query}".`,
                },
              ],
            },
          };
        }

        const summaryText = matches.map((r, i) => {
          const files = (r.content?.filesTouched || []).join(', ') || 'None';
          const decisions = (r.content?.decisions || []).map(d => `  - ${d.text}`).join('\n');
          return `### [${i + 1}] ${r.content?.title || 'Untitled Session'} (ID: \`${r.recordId}\`)
- **Author:** ${r.author?.handle || '@team'} | **Project:** \`${r.acl?.projectTag || 'global'}\` | **Origin:** ${r.origin}
- **Summary:** ${r.content?.summary || 'No summary'}
- **Files Touched:** ${files}
- **Decisions:**
${decisions || '  - None recorded'}`;
        }).join('\n\n---\n\n');

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `Found ${matches.length} matching context record(s):\n\n${summaryText}`,
              },
            ],
          },
        };
      }

      if (toolName === 'show_record') {
        const recordId = args.recordId;
        const result = executeShow(recordId);

        if (!result) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Record not found: "${recordId}".`,
                },
              ],
            },
          };
        }

        const markdown = formatRecordToMarkdown(result.record, result.events);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: markdown,
              },
            ],
          },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Unknown tool: ${toolName}`,
        },
      };
    }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
  }
}

/**
 * Starts the stdio JSON-RPC MCP server
 */
export function startMcpServer() {
  process.stderr.write(`[agentrelay-mcp] Starting Model Context Protocol server (stdio)\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const parsed = JSON.parse(trimmed);
      const res = await handleMcpRequest(parsed);
      if (res) {
        process.stdout.write(`${JSON.stringify(res)}\n`);
      }
    } catch (err) {
      const errRes = {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: `Parse error: ${err.message}` },
      };
      process.stdout.write(`${JSON.stringify(errRes)}\n`);
    }
  });

  rl.on('close', () => {
    process.stderr.write(`[agentrelay-mcp] Connection closed.\n`);
    process.exit(0);
  });
}
