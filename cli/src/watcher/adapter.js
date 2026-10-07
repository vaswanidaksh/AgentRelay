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
    id: `e_${seq}`,
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
  return 'agentrelay-generic';
}


function extractTextFromContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === 'string') return item;
      if (item.type === 'text') return item.text || '';
      if (item.type === 'tool_use') return `[Tool: ${item.name} (${JSON.stringify(item.input || {})})]`;
      if (item.type === 'tool_result') return `[Tool Result: ${typeof item.content === 'string' ? item.content : JSON.stringify(item.content || '')}]`;
      return JSON.stringify(item);
    }).join('\n');
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

  // Standard Agent / Claude Code / OpenAI / Custom format mapping
  if (parsed.type === 'user' || parsed.role === 'user') {
    kind = 'user';
    rawText = extractTextFromContent(parsed.content);
  } else if (parsed.type === 'assistant' || parsed.role === 'assistant') {
    kind = 'assistant';
    rawText = extractTextFromContent(parsed.content);
  } else if (parsed.type === 'tool_use' || parsed.type === 'tool_call' || parsed.tool_name) {
    kind = 'tool_call';
    rawText = `Tool call [${parsed.name || parsed.tool_name || 'tool'}]: ${JSON.stringify(parsed.input || parsed.args || {})}`;
  } else if (parsed.type === 'tool_result' || parsed.type === 'tool_response') {
    kind = 'tool_result';
    rawText = `Tool result: ${typeof parsed.output === 'string' ? parsed.output : JSON.stringify(parsed.output || parsed.result || parsed.content || '')}`;
  } else if (parsed.type === 'error' || parsed.error) {
    kind = 'error';
    rawText = `Error: ${parsed.error || parsed.message || JSON.stringify(parsed)}`;
  } else {
    rawText = extractTextFromContent(parsed.text || parsed.content || parsed);
  }

  const { text: text_scrubbed, redactionCounts } = scrubText(rawText);

  return {
    id: `e_${seq}`,
    session_id: sessionId,
    seq,
    ts: timestamp,
    kind,
    text_scrubbed,
    redaction_counts: JSON.stringify(redactionCounts),
  };
}
