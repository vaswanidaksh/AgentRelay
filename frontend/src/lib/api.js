import axios from 'axios';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const USE_MOCKS = true; // flip to false when the real backend is available

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every outgoing request automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ar_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a random integer between min (inclusive) and max (inclusive). */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Simulates network latency (300–600 ms) then resolves with `data`. */
function mockDelay(data) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ data }), randInt(300, 600));
  });
}

/** Simulates a rejection with an error-shaped response. */
function mockError(status, body) {
  return new Promise((_, reject) => {
    setTimeout(
      () =>
        reject({
          response: { status, data: body },
        }),
      randInt(300, 600),
    );
  });
}

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

function makeUser() {
  return {
    id: 'usr_' + crypto.randomUUID().slice(0, 8),
    name: 'Daksh Vaswani',
    email: 'daksh@agentrelay.dev',
  };
}

function makeSession(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: 'ses_' + crypto.randomUUID().slice(0, 8),
    workspaceId: 'ws_default',
    taskId: 'task_' + crypto.randomUUID().slice(0, 8),
    status: 'ACTIVE',
    createdBy: 'usr_owner01',
    createdAt: now,
    ...overrides,
  };
}

function makeDriver() {
  return {
    driverUserId: 'usr_driver01',
    claimedAt: new Date().toISOString(),
    ttlExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
}

function makeRedirect(sessionId) {
  return {
    id: 'rdr_' + crypto.randomUUID().slice(0, 8),
    sessionId,
    requestedBy: 'usr_requester01',
    content: 'Please focus on the authentication module first.',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

function makeInstruction(_sessionId) {
  return {
    files: [
      {
        path: 'src/features/auth/LoginForm.jsx',
        changeType: 'modified',
        diffContent:
          '- const [email, setEmail] = useState("");\n+ const [email, setEmail] = useState("user@test.com");',
      },
      {
        path: 'src/lib/api.js',
        changeType: 'modified',
        diffContent: '+ // Added retry logic for transient failures',
      },
    ],
    scopeSummary: 'Refactored auth login flow and added API retry logic.',
    assumptions: [
      'Default test user email is acceptable for dev environment.',
    ],
    flaggedAmbiguity: [
      'Retry count not specified — defaulted to 3.',
    ],
  };
}

function makeAnalytics(_sessionId) {
  return {
    narrative:
      'Session completed successfully. Two agents collaborated across 4 instructions. One redirect was approved, leading to an auth-first approach.',
    timeline: [
      { ts: new Date(Date.now() - 600_000).toISOString(), event: 'session_created' },
      { ts: new Date(Date.now() - 480_000).toISOString(), event: 'driver_claimed' },
      { ts: new Date(Date.now() - 300_000).toISOString(), event: 'redirect_approved' },
      { ts: new Date(Date.now() - 60_000).toISOString(), event: 'session_completed' },
    ],
    contributionBreakdown: [
      { userId: 'usr_owner01', instructions: 2, redirects: 1 },
      { userId: 'usr_driver01', instructions: 2, redirects: 0 },
    ],
    evidenceReferences: [
      { fileId: 'file_001', path: 'src/features/auth/LoginForm.jsx' },
    ],
    confidence: 0.92,
  };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------
// Each function has a real-call path (axios) and a mock path.
// To switch from mock → real, set USE_MOCKS = false. Nothing else changes.
// ---------------------------------------------------------------------------

/** POST /auth/login */
export async function login(email, password) {
  if (USE_MOCKS) {
    const user = makeUser();
    return mockDelay({ token: 'mock_jwt_' + crypto.randomUUID().slice(0, 12), user });
  }
  return apiClient.post('/auth/login', { email, password });
}

/** POST /sessions — create a new session */
export async function createSession(payload) {
  if (USE_MOCKS) {
    return mockDelay(makeSession(payload));
  }
  return apiClient.post('/sessions', payload);
}

/** GET /sessions — list all sessions */
export async function listSessions() {
  if (USE_MOCKS) {
    return mockDelay([
      makeSession({ status: 'ACTIVE' }),
      makeSession({ status: 'PAUSED' }),
      makeSession({ status: 'COMPLETED' }),
    ]);
  }
  return apiClient.get('/sessions');
}

/** GET /sessions/:id — single session with driver + redirect queue */
export async function getSession(sessionId) {
  if (USE_MOCKS) {
    const session = makeSession({ id: sessionId, status: 'ACTIVE' });
    return mockDelay({
      ...session,
      driver: makeDriver(),
      redirectQueue: [makeRedirect(sessionId)],
    });
  }
  return apiClient.get(`/sessions/${sessionId}`);
}

/** POST /sessions/:id/join */
export async function joinSession(sessionId) {
  if (USE_MOCKS) {
    return mockDelay({ success: true });
  }
  return apiClient.post(`/sessions/${sessionId}/join`);
}

/** POST /sessions/:id/claim — claim driver seat (may 409) */
export async function claimDriver(sessionId, { simulateConflict = false } = {}) {
  if (USE_MOCKS) {
    if (simulateConflict) {
      return mockError(409, {
        error: {
          code: 'DRIVER_LOCK_CONFLICT',
          message: 'Another user already holds the driver lock.',
          requestId: 'req_' + crypto.randomUUID().slice(0, 8),
        },
      });
    }
    return mockDelay(makeDriver());
  }
  return apiClient.post(`/sessions/${sessionId}/claim`);
}

/** POST /sessions/:id/redirect — request a redirect */
export async function createRedirect(sessionId, content) {
  if (USE_MOCKS) {
    return mockDelay(makeRedirect(sessionId));
  }
  return apiClient.post(`/sessions/${sessionId}/redirect`, { content });
}

/** POST /sessions/:id/redirect/:redirectId/resolve */
export async function resolveRedirect(sessionId, redirectId, decision) {
  if (USE_MOCKS) {
    return mockDelay({ id: redirectId, status: decision }); // "approved" | "denied"
  }
  return apiClient.post(`/sessions/${sessionId}/redirect/${redirectId}/resolve`, {
    decision,
  });
}

/** POST /sessions/:id/handoff */
export async function handoff(sessionId, toUserId, contextSnapshot) {
  if (USE_MOCKS) {
    return mockDelay({
      fromUserId: 'usr_driver01',
      toUserId,
      contextSnapshot: contextSnapshot || 'Working on auth module; tests passing.',
      createdAt: new Date().toISOString(),
    });
  }
  return apiClient.post(`/sessions/${sessionId}/handoff`, {
    toUserId,
    contextSnapshot,
  });
}

/** POST /sessions/:id/instruct */
export async function instruct(sessionId, payload) {
  if (USE_MOCKS) {
    return mockDelay(makeInstruction(sessionId));
  }
  return apiClient.post(`/sessions/${sessionId}/instruct`, payload);
}

/** GET /sessions/:id/diffs */
export async function listDiffs(sessionId) {
  if (USE_MOCKS) {
    return mockDelay([makeInstruction(sessionId), makeInstruction(sessionId)]);
  }
  return apiClient.get(`/sessions/${sessionId}/diffs`);
}

/** POST /sessions/:id/complete */
export async function completeSession(sessionId) {
  if (USE_MOCKS) {
    return mockDelay({ status: 'COMPLETED', completedAt: new Date().toISOString() });
  }
  return apiClient.post(`/sessions/${sessionId}/complete`);
}

/** GET /sessions/:id/analytics */
export async function getSessionAnalytics(sessionId) {
  if (USE_MOCKS) {
    return mockDelay(makeAnalytics(sessionId));
  }
  return apiClient.get(`/sessions/${sessionId}/analytics`);
}

// ---------------------------------------------------------------------------
// Export the raw axios client for edge-case usage
// ---------------------------------------------------------------------------
export { apiClient };
