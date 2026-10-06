import express from 'express';
import cors from 'cors';
import { initializeSchema, closeDb } from './db/index.js';
import { config } from './config.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

// Initialize SQLite schema on startup
initializeSchema();

export const app = express();

app.use(cors({
  origin: config.clientOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));

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
