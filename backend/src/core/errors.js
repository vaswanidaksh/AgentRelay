/**
 * Standardized LCP Server Errors (PRD §15.3)
 */

export class AppError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden.') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super('NOT_FOUND', message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict.') {
    super('CONFLICT', message, 409);
  }
}

export class SemanticError extends AppError {
  constructor(message, details = null) {
    super('SEMANTIC_ERROR', message, 422, details);
  }
}
