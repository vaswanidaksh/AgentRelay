/**
 * Deterministic Secret Scrubber (PRD FR-007, FR-008, M-1)
 * Replaces planted/detected secrets with typed placeholders [REDACTED:<type>]
 * and returns aggregate counts without leaking values.
 */

export const SCRUBBER_VERSION = '0.1.0';

export const PATTERNS = [
  {
    type: 'private_key',
    regex: /-----BEGIN\s+[A-Z ]*PRIVATE\s+KEY-----[\s\S]*?-----END\s+[A-Z ]*PRIVATE\s+KEY-----/g,
  },
  {
    type: 'aws_key',
    regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    type: 'github_token',
    regex: /\b(ghp_[a-zA-Z0-9]{20,255}|github_pat_[a-zA-Z0-9_]{30,}|gho_[a-zA-Z0-9]{20,255}|ghu_[a-zA-Z0-9]{20,255}|ghs_[a-zA-Z0-9]{20,255})\b/g,
  },
  {
    type: 'ai_api_key',
    regex: /\b(sk-ant-[a-zA-Z0-9_-]{20,}|sk-[a-zA-Z0-9_-]{20,})\b/g,
  },
  {
    type: 'db_connection',
    regex: /\b(postgres|postgresql|mysql|mongodb|mongodb\+srv|redis):\/\/[^\s"'>]+/gi,
  },
  {
    type: 'bearer_token',
    regex: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,
  },
  {
    type: 'env_secret',
    regex: /(?:^|\n)\s*(?:[A-Z0-9_]*(?:KEY|SECRET|PASSWORD|TOKEN|AUTH|PRIVATE)[A-Z0-9_]*)\s*=\s*(["']?[^\r\n"']+["']?)/gi,
  },
  {
    type: 'email',
    regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
  }
];

/**
 * Scrubs a string of known secret patterns and returns the scrubbed text + counts.
 * @param {string} input - Raw text string
 * @returns {{ text: string, redactionCounts: Record<string, number> }}
 */
export function scrubText(input) {
  if (typeof input !== 'string' || !input) {
    return { text: input || '', redactionCounts: {} };
  }

  let scrubbed = input;
  const counts = {};

  for (const { type, regex } of PATTERNS) {
    regex.lastIndex = 0;
    const matches = scrubbed.match(regex);
    if (matches && matches.length > 0) {
      counts[type] = (counts[type] || 0) + matches.length;
      scrubbed = scrubbed.replace(regex, `[REDACTED:${type}]`);
    }
  }

  return {
    text: scrubbed,
    redactionCounts: counts,
  };
}

/**
 * Recursively scrubs all string fields in a record object or array.
 * @param {any} data
 * @returns {{ data: any, redactionCounts: Record<string, number> }}
 */
export function scrubObject(data) {
  const aggregateCounts = {};

  function mergeCounts(counts) {
    for (const [key, val] of Object.entries(counts)) {
      aggregateCounts[key] = (aggregateCounts[key] || 0) + val;
    }
  }

  function walk(node) {
    if (typeof node === 'string') {
      const { text, redactionCounts } = scrubText(node);
      mergeCounts(redactionCounts);
      return text;
    }
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (node && typeof node === 'object') {
      const copy = {};
      for (const [k, v] of Object.entries(node)) {
        copy[k] = walk(v);
      }
      return copy;
    }
    return node;
  }

  const cleaned = walk(data);
  return {
    data: cleaned,
    redactionCounts: aggregateCounts,
  };
}
