import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initializeSchema, closeDb } from './db/index.js';
import { config } from './config.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createRateLimiter } from './middleware/rateLimit.js';

// Initialize SQLite schema on startup
initializeSchema();

export const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));

// Cookie parser — required for GitHub OAuth CSRF state cookie
app.use(cookieParser());

// Oversized bodies are rejected with 413 before any route logic runs (Threat T-06)
app.use(express.json({ limit: config.maxBodyBytes }));

// Rate limiting (PRD §15.3). Auth token minting gets a stricter budget.
export const authLimiter = createRateLimiter({
  name: 'auth',
  windowMs: config.rateLimitWindowMs,
  max: config.authRateLimitMax
});
export const apiLimiter = createRateLimiter({
  name: 'api',
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax
});
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1', apiLimiter);

// Mount all routes
app.use(routes);

// Global PRD-compliant error handler
app.use(errorHandler);

let server;
import { fileURLToPath } from 'url';

const isDirectRun = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('server.js')
);

if (isDirectRun) {
  server = app.listen(config.port, () => {
    console.log(`[LCP Server] Running on http://localhost:${config.port}`);
  });
}

function gracefulShutdown(signal) {
  console.log(`\n[LCP Server] ${signal} received — shutting down`);
  closeDb();
  if (server) {
    server.close(() => {
      console.log('[LCP Server] HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;
