import { ValidationError, SemanticError } from './errors.js';

export const CURRENT_SCHEMA_VERSION = 'agentrelay.record/0.1';
export const LEGACY_SCHEMA_VERSION = 'lcp.record/0.1';

/**
 * Validates a context record against the AgentRelay specification (PRD §13).
 * @param {any} record
 */
export function validateContextRecord(record) {
  if (!record || typeof record !== 'object') {
    throw new ValidationError('Record must be a non-null object.');
  }

  // Required top-level fields
  const requiredTop = [
    'recordId', 'version', 'schemaVersion', 'author',
    'origin', 'source', 'times', 'content',
    'sensitivity', 'visibility', 'acl', 'feedback', 'provenance'
  ];

  for (const field of requiredTop) {
    if (record[field] === undefined || record[field] === null) {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }

  if (typeof record.recordId !== 'string' || record.recordId.trim() === '') {
    throw new ValidationError('recordId must be a non-empty string.');
  }

  if (typeof record.version !== 'number' || record.version < 1) {
    throw new ValidationError('version must be an integer >= 1.');
  }

  if (record.schemaVersion !== CURRENT_SCHEMA_VERSION && record.schemaVersion !== LEGACY_SCHEMA_VERSION) {
    throw new ValidationError(`Unsupported schemaVersion: ${record.schemaVersion}. Expected ${CURRENT_SCHEMA_VERSION}`);
  }

  // Author validation
  if (!record.author.userId || !record.author.handle) {
    throw new ValidationError('author must contain userId and handle.');
  }

  // Content validation
  const { content } = record;
  if (!content || typeof content !== 'object') {
    throw new ValidationError('content must be an object.');
  }

  if (!content.title || typeof content.title !== 'string' || content.title.length > 120) {
    throw new ValidationError('content.title is required and must be <= 120 characters.');
  }

  if (!content.summary || typeof content.summary !== 'string' || content.summary.length > 1200) {
    throw new ValidationError('content.summary is required and must be <= 1200 characters.');
  }

  if (!Array.isArray(content.decisions) || content.decisions.length === 0) {
    throw new SemanticError('content.decisions must be a non-empty array.');
  }

  for (const [index, d] of content.decisions.entries()) {
    if (!d.text || typeof d.text !== 'string') {
      throw new SemanticError(`Decision at index ${index} must have a non-empty text string.`);
    }
    if (!Array.isArray(d.evidence) || d.evidence.length === 0) {
      throw new SemanticError(`Decision at index ${index} must cite at least one evidence event ID.`);
    }
  }

  if (!Array.isArray(content.filesTouched)) {
    throw new ValidationError('content.filesTouched must be an array.');
  }

  // Sensitivity validation
  if (!['none', 'review', 'restricted'].includes(record.sensitivity.label)) {
    throw new ValidationError('sensitivity.label must be one of: none, review, restricted.');
  }

  // Visibility validation
  if (typeof record.visibility.shareable !== 'boolean') {
    throw new ValidationError('visibility.shareable must be a boolean.');
  }

  return true;
}
