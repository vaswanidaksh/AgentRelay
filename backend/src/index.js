import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Mock in-memory database of sessions
const MOCK_SESSIONS = [
  {
    id: 'sess-101',
    title: 'fix-auth-bug',
    summary: 'Fixed JWT validation in auth middleware and updated unit tests',
    agent: 'Claude Code',
    agentId: 'claude',
    user: 'alice',
    userName: 'Alice Vance',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    duration: '14 min',
    timestamp: '2 min ago',
    filesCount: 3,
    files: ['auth/middleware.ts', 'auth/jwt.ts', 'tests/auth.test.ts'],
    messages: [
      { sender: 'user', content: 'Fix the JWT validation bug in the auth middleware.' },
      { sender: 'agent', content: 'I will inspect the auth middleware and JWT token verification.' },
      { sender: 'agent', content: '```typescript\nexport function validateJWT(token: string) {\n  if (!token) throw new AuthError("Missing token");\n  return jwt.verify(token, process.env.JWT_SECRET!);\n}\n```' },
      { sender: 'user', content: 'Can you also add tests?' },
      { sender: 'agent', content: 'Added unit tests in `tests/auth.test.ts` covering valid, expired, and malformed tokens.' }
    ]
  },
  {
    id: 'sess-102',
    title: 'add-unit-tests',
    summary: 'Added comprehensive test suite for user profile API endpoints',
    agent: 'Cursor',
    agentId: 'cursor',
    user: 'bob',
    userName: 'Bob Smith',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    duration: '22 min',
    timestamp: '15 min ago',
    filesCount: 5,
    files: ['routes/user.js', 'controllers/user.js', 'tests/user.test.js', 'models/user.js', 'package.json'],
    messages: [
      { sender: 'user', content: 'Add unit tests for profile photo update endpoints.' },
      { sender: 'agent', content: 'Writing test cases using Jest & Supertest.' }
    ]
  },
  {
    id: 'sess-103',
    title: 'deploy-ci-pipeline',
    summary: 'Set up GitHub Actions workflow for automated testing & Docker build',
    agent: 'Windsurf',
    agentId: 'windsurf',
    user: 'you',
    userName: 'You',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    duration: '8 min',
    timestamp: '1 hour ago',
    filesCount: 2,
    files: ['.github/workflows/ci.yml', 'Dockerfile'],
    messages: [
      { sender: 'user', content: 'Configure CI to build and test on pull requests.' },
      { sender: 'agent', content: 'Created `.github/workflows/ci.yml` with node matrix build.' }
    ]
  }
];

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'agentrelay-backend', timestamp: new Date().toISOString() });
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
  res.json({ success: true, data: MOCK_SESSIONS });
});

// Get session by ID
app.get('/api/sessions/:id', (req, res) => {
  const session = MOCK_SESSIONS.find(s => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  res.json({ success: true, data: session });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);
  
  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined room ${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 AgentRelay backend listening on port ${PORT}`);
});
