import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../core/errors.js';

export function errorHandler(err, req, res, next) {
  const requestId = req.headers['x-request-id'] || `req_${uuidv4().slice(0, 8)}`;
  
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
