import express from 'express';
import { getDb } from '../db/connection.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AgentRelay LCP Team Server',
    version: '1.0.0',
    endpoints: {
      health: '/healthz',
      metrics: '/metrics',
      api: '/api/v1'
    },
    timestamp: new Date().toISOString()
  });
});

router.get('/healthz', (req, res) => {
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    res.json({
      status: 'ok',
      service: 'lcp-server',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed'
    });
  }
});

router.get('/metrics', (req, res) => {
  res.json({
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;
