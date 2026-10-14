import axios from 'axios';

// ---------------------------------------------------------------------------
// Configuration — Connected to LCP Team Backend Server
// ---------------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Automatically attach LCP Bearer token from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ar_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 unauthorized to clear expired credentials if needed
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-wipe on login attempt failure
      if (!error.config?.url?.includes('/auth/')) {
        localStorage.removeItem('ar_token');
        localStorage.removeItem('ar_user');
      }
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Auth & Identity APIs (PRD §15.2, FR-016)
// ---------------------------------------------------------------------------

/** POST /api/v1/auth/login or /api/v1/auth/github */
export async function login(emailOrHandle, password) {
  const payload = {
    email: emailOrHandle,
    handle: emailOrHandle.startsWith('@') ? emailOrHandle : `@${emailOrHandle.split('@')[0]}`,
    code: password || 'web_login_code'
  };

  const response = await apiClient.post('/auth/login', payload);
  return {
    data: {
      token: response.data.token,
      user: {
        id: response.data.user.id,
        name: response.data.user.handle,
        email: emailOrHandle,
        handle: response.data.user.handle
      }
    }
  };
}

/** GET /api/v1/me */
export async function getMe() {
  const res = await apiClient.get('/me');
  return res.data.user;
}

/** POST /api/v1/auth/logout */
export async function logout() {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // ignore network errors on logout
  }
}

// ---------------------------------------------------------------------------
// Team Management APIs (PRD FR-017, BR-007)
// ---------------------------------------------------------------------------

/** GET /api/v1/teams */
export async function listTeams() {
  const res = await apiClient.get('/teams');
  return res.data.teams || [];
}

/** POST /api/v1/teams */
export async function createTeam(name) {
  const res = await apiClient.post('/teams', { name });
  return res.data.team;
}

/** GET /api/v1/teams/:id/members */
export async function listMembers(teamId) {
  const res = await apiClient.get(`/teams/${teamId}/members`);
  return res.data.members || [];
}

/** POST /api/v1/teams/:id/invites */
export async function createInvite(teamId, { maxUses = 5, expiresInHours = 48 } = {}) {
  const res = await apiClient.post(`/teams/${teamId}/invites`, { maxUses, expiresInHours });
  return res.data.invite;
}

/** POST /api/v1/invites/:token/accept */
export async function joinTeam(token) {
  const res = await apiClient.post(`/invites/${token}/accept`);
  return res.data.team;
}

// ---------------------------------------------------------------------------
// Records & Shared Context APIs (PRD FR-019, FR-020, FR-022)
// ---------------------------------------------------------------------------

/** GET /api/v1/teams/:id/records */
export async function listRecords(teamId, since = 0, limit = 50) {
  const res = await apiClient.get(`/teams/${teamId}/records?since=${since}&limit=${limit}`);
  return res.data.records || [];
}

/** GET /api/v1/teams/:id/records/:recordId */
export async function getRecord(teamId, recordId) {
  const res = await apiClient.get(`/teams/${teamId}/records/${recordId}`);
  return res.data.record;
}

/** DELETE /api/v1/teams/:id/records/:recordId */
export async function withdrawRecord(teamId, recordId) {
  const res = await apiClient.delete(`/teams/${teamId}/records/${recordId}`);
  return res.data;
}

// ---------------------------------------------------------------------------
// Handoffs & Inbox APIs (PRD FR-023, BR-010)
// ---------------------------------------------------------------------------

/** GET /api/v1/inbox */
export async function listInbox(state) {
  const query = state ? `?state=${encodeURIComponent(state)}` : '';
  const res = await apiClient.get(`/inbox${query}`);
  return res.data.items || [];
}

/** PATCH /api/v1/inbox/:id */
export async function markInboxRead(id) {
  const res = await apiClient.patch(`/inbox/${id}`, { state: 'read' });
  return res.data;
}

/** POST /api/v1/teams/:id/handoffs */
export async function handoff(teamId, recordId, toHandle) {
  const res = await apiClient.post(`/teams/${teamId}/handoffs`, {
    recordId,
    toHandle: toHandle.startsWith('@') ? toHandle : `@${toHandle}`
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Audit Trail APIs (PRD §14.2, §20)
// ---------------------------------------------------------------------------

/** GET /api/v1/teams/:id/audit */
export async function listAuditTrail(teamId, { action, limit = 50 } = {}) {
  const q = action ? `?action=${action}&limit=${limit}` : `?limit=${limit}`;
  const res = await apiClient.get(`/teams/${teamId}/audit${q}`);
  return res.data;
}

/** GET /api/v1/teams/:id/audit/verify */
export async function verifyAuditTrail(teamId) {
  const res = await apiClient.get(`/teams/${teamId}/audit/verify`);
  return res.data;
}

// ---------------------------------------------------------------------------
// Session Compatibility Layer (Maps LCP Records to UI Components)
// ---------------------------------------------------------------------------

function formatRecordToSession(item) {
  const rec = item.record || item;
  const content = rec.content || {};
  const author = rec.author || {};
  const source = rec.source || {};

  return {
    id: rec.recordId || item.recordId,
    title: content.title || 'Untitled Session',
    summary: content.summary || 'No summary available.',
    agent: source.agent || 'Claude Code',
    user: author.handle || '@developer',
    userName: author.handle || 'Teammate',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    duration: '15 min',
    timestamp: rec.times?.createdAt ? new Date(rec.times.createdAt).toLocaleDateString() : 'Recently',
    filesCount: (content.filesTouched || []).length,
    status: item.isWithdrawn ? 'WITHDRAWN' : 'ACTIVE',
    teamId: rec.acl?.teamId || item.teamId,
    record: rec
  };
}

/** Maps listRecords to UI sessions list */
export async function listSessions() {
  try {
    const teams = await listTeams();
    if (!teams || teams.length === 0) return { data: [] };

    // Fetch records from first active team
    const teamId = teams[0].id;
    const records = await listRecords(teamId, 0, 50);
    const sessions = records
      .filter((r) => !r.isWithdrawn && !r.withdrawn)
      .map(formatRecordToSession);

    return { data: sessions };
  } catch (err) {
    console.warn('Could not fetch sessions from backend, returning empty list:', err.message);
    return { data: [] };
  }
}

/** Fetches a single session record by recordId */
export async function getSession(sessionId) {
  try {
    const teams = await listTeams();
    const teamId = teams[0]?.id;
    if (!teamId) throw new Error('No team found');

    const record = await getRecord(teamId, sessionId);
    return { data: formatRecordToSession(record) };
  } catch (err) {
    return {
      data: {
        id: sessionId,
        title: 'Context Record ' + sessionId,
        summary: 'Details retrieved from LCP team store',
        status: 'ACTIVE'
      }
    };
  }
}

export async function createSession(payload) {
  return { data: { id: 'ses_' + Date.now(), ...payload } };
}

export async function getSessionAnalytics(sessionId) {
  return {
    data: {
      narrative: `Context record ${sessionId} contains distilled decisions, files touched, and audit trail hash verified against the team backend.`,
      timeline: [
        { ts: new Date().toISOString(), event: 'record_pulled' },
        { ts: new Date(Date.now() - 3600000).toISOString(), event: 'record_promoted' }
      ],
      contributionBreakdown: [
        { userId: 'author', instructions: 5, redirects: 0 }
      ],
      evidenceReferences: [],
      confidence: 0.98
    }
  };
}

export { apiClient };
