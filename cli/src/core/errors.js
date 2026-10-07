export class AgentRelayError extends Error {
  constructor(message, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AgentRelayError';
    this.code = code;
  }
}

export class ValidationError extends AgentRelayError {
  constructor(message) {
    super(message, 'RECORD_INVALID');
    this.name = 'ValidationError';
  }
}

export class SemanticError extends AgentRelayError {
  constructor(message) {
    super(message, 'SEMANTIC_FAILURE');
    this.name = 'SemanticError';
  }
}

export class ScrubberError extends AgentRelayError {
  constructor(message) {
    super(message, 'SCRUBBER_ERROR');
    this.name = 'ScrubberError';
  }
}
