import express from 'express';
import authRoutes from './auth.js';
import teamRoutes from './teams.js';
import recordRoutes from './records.js';
import inboxRoutes from './inbox.js';
import systemRoutes from './system.js';

const router = express.Router();

router.use('/', systemRoutes);
router.use('/api/v1', authRoutes);
router.use('/api/v1', teamRoutes);
router.use('/api/v1', recordRoutes);
router.use('/api/v1', inboxRoutes);

export default router;
