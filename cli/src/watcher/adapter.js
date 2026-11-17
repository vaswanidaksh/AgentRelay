import { scrubText } from '../core/scrubber.js';

export const ADAPTER_VERSION = '0.1.0';

/**
 * Normalizes transcript content line/object into a scrubbed event schema.
 * @param {any} rawLine
 * @param {string} sessionId
 * @param {number} seq
 * @returns {object} Normalized event
 */
export function normalizeLineToEvent(rawLine, sessionId, seq) {
  let kind = 'unknown';
  let rawText = '';
  let timestamp = new Date().toISOString();

  if (typeof rawLine === 'string') {
    try {
      const parsed = JSON.parse(rawLine);
      return normalizeParsedObject(parsed, sessionId, seq);
    } catch {
      rawText = rawLine;
    }
  } else if (typeof rawLine === 'object' && rawLine !== null) {
    return normalizeParsedObject(rawLine, sessionId, seq);
  }

  const { text: text_scrubbed, redactionCounts } = scrubText(rawText);

  return {
    id: `${sessionId}_e_${seq}`,
    session_id: sessionId,
    seq,
    ts: timestamp,
    kind,
    text_scrubbed,
    redaction_counts: JSON.stringify(redactionCounts),
  };
}

/**
 * Detects the AI coding agent from file path or content structure.
 * @param {string} filePath
 * @returns {string} Agent name (e.g. 'claude-code', 'cursor', 'windsurf', 'aider', 'copilot', 'agentrelay-generic')
 */
export function detectAgentType(filePath) {
  if (!filePath) return 'agentrelay-generic';
  const lower = filePath.toLowerCase();
  if (lower.includes('.claude') || lower.includes('claude')) return 'claude-code';
  if (lower.includes('.cursor') || lower.includes('cursor')) return 'cursor';
  if (lower.includes('.windsurf') || lower.includes('windsurf')) return 'windsurf';
  if (lower.includes('aider')) return 'aider';
  if (lower.includes('copilot')) return 'copilot';
  if (lower.includes('codex')) return 'codex';
  return 'agentrelay-generic';
}


function extractTextFromContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === 'string') return item;
      if (item.type === 'text' || item.type === 'input_text' || item.type === 'output_text') return item.text || '';
      if (item.type === 'tool_use' || item.type === 'custom_tool_call') return `[Tool: ${item.name || 'tool'} (${JSON.stringify(item.input || item.arguments || {})})]`;
      if (item.type === 'tool_result' || item.type === 'custom_tool_call_output') return `[Tool Result: ${typeof item.content === 'string' ? item.content : JSON.stringify(item.output || item.content || '')}]`;
      return typeof item === 'object' && item.text ? item.text : JSON.stringify(item);
    }).filter(Boolean).join('\n');
  }
  if (content && typeof content === 'object') {
    return content.text || content.message || JSON.stringify(content);
  }
  return String(content || '');
}

function normalizeParsedObject(parsed, sessionId, seq) {
  let kind = 'unknown';
  let rawText = '';
  let timestamp = parsed.timestamp || parsed.ts || parsed.created_at || new Date().toISOString();

  // Handle Codex/OpenAI payload wrappers
  let item = parsed;
  if (parsed.payload && typeof parsed.payload === 'object') {
    item = parsed.payload;
  }

  const role = item.role || item.type || parsed.type || '';
  const itemType = item.type || (item.item && item.item.type) || '';

  // Standard Agent / Claude Code / OpenAI / Codex / Custom format mapping
  if (role === 'user' || itemType === 'UserMessage' || parsed.type === 'user') {
    kind = 'user';
    rawText = extractTextFromContent(item.content || (item.item && item.item.content));
  } else if (role === 'assistant' || itemType === 'AgentMessage' || parsed.type === 'assistant') {
    kind = 'assistant';
    rawText = extractTextFromContent(item.content || (item.item && item.item.content));
  } else if (role === 'tool_use' || role === 'tool_call' || role === 'custom_tool_call' || itemType === 'CommandExecution') {
    kind = 'tool_call';
    rawText = `Tool call [${item.name || item.call_id || 'tool'}]: ${JSON.stringify(item.input || item.arguments || item.args || {})}`;
  } else if (role === 'tool_result' || role === 'tool_response' || role === 'custom_tool_call_output') {
    kind = 'tool_result';
    rawText = `Tool result: ${typeof item.output === 'string' ? item.output : JSON.stringify(item.output || item.result || item.content || '')}`;
  } else if (role === 'reasoning') {
    kind = 'reasoning';
    rawText = extractTextFromContent(item.content || item.summary || '');
  } else if (role === 'error' || item.error) {
    kind = 'error';
    rawText = `Error: ${item.error || item.message || JSON.stringify(item)}`;
  } else {
    rawText = extractTextFromContent(item.text || item.content || item.message || item);
  }

  const { text: text_scrubbed, redactionCounts } = scrubText(rawText);

  return {
    id: `${sessionId}_e_${seq}`,
    session_id: sessionId,
    seq,
    ts: timestamp,
    kind,
    text_scrubbed,
    redaction_counts: JSON.stringify(redactionCounts),
  };
}
