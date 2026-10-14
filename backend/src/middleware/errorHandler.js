import { v4 as uuidv4 } from 'uuid';
import { AppError, PayloadTooLargeError, ValidationError } from '../core/errors.js';

export function errorHandler(err, req, res, next) {
  const requestId = req.headers['x-request-id'] || `req_${uuidv4().slice(0, 8)}`;

  // Translate body-parser errors into PRD-format errors (PRD §15.3)
  if (err?.type === 'entity.too.large') {
    err = new PayloadTooLargeError(undefined, { limitBytes: err.limit });
  } else if (err?.type === 'entity.parse.failed') {
    err = new ValidationError('Request body is not valid JSON.');
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.details ? { details: err.details } : {})
      }
    });
  }

  // Generic unhandled internal error
  console.error(`[Unhandled Error] [${requestId}]`, err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected server error occurred.',
      requestId
    }
  });
}
