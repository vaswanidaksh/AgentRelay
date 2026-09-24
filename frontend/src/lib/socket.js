// ---------------------------------------------------------------------------
// lib/socket.js — Mock WebSocket client for local development
// ---------------------------------------------------------------------------
// Exposes the same API surface as a real socket.io-client instance:
//   socket.on(eventName, callback)
//   socket.off(eventName, callback)
//   socket.emit(eventName, payload)
//   socket.connect()
//   socket.disconnect()
//
// In production, replace the internals of this file with:
//   import { io } from 'socket.io-client';
//   const socket = io(SOCKET_URL);
//   export default socket;
//
// No calling code elsewhere needs to change.
// ---------------------------------------------------------------------------

const USE_MOCK_SOCKET = true;

// ---------------------------------------------------------------------------
// Mock event payloads
// ---------------------------------------------------------------------------

function makePresenceUpdate() {
  return {
    userId: 'usr_driver01',
    status: 'online',
    sessionId: 'ses_mock01',
    lastSeen: new Date().toISOString(),
  };
}

function makeDriverChanged() {
  return {
    sessionId: 'ses_mock01',
    previousDriverId: 'usr_driver01',
    newDriverId: 'usr_driver02',
    changedAt: new Date().toISOString(),
  };
}

function makeRedirectQueued() {
  return {
    id: 'rdr_' + crypto.randomUUID().slice(0, 8),
    sessionId: 'ses_mock01',
    requestedBy: 'usr_requester01',
    content: 'Please pivot to fixing the failing test suite.',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

function makeRedirectResolved() {
  return {
    id: 'rdr_resolved01',
    sessionId: 'ses_mock01',
    resolvedBy: 'usr_driver01',
    status: 'approved',
    resolvedAt: new Date().toISOString(),
  };
}

function makeDiffProposed() {
  return {
    sessionId: 'ses_mock01',
    instructionId: 'ins_' + crypto.randomUUID().slice(0, 8),
    files: [
      {
        path: 'src/features/auth/LoginForm.jsx',
        changeType: 'modified',
        diffContent: '+ // auth flow updated',
      },
    ],
    proposedAt: new Date().toISOString(),
  };
}

function makeSessionCompleted() {
  return {
    sessionId: 'ses_mock01',
    status: 'COMPLETED',
    completedAt: new Date().toISOString(),
  };
}

const MOCK_EVENT_FACTORIES = {
  presence_update: makePresenceUpdate,
  driver_changed: makeDriverChanged,
  redirect_queued: makeRedirectQueued,
  redirect_resolved: makeRedirectResolved,
  diff_proposed: makeDiffProposed,
  session_completed: makeSessionCompleted,
};

// ---------------------------------------------------------------------------
// Mock socket implementation
// ---------------------------------------------------------------------------

class MockSocket {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    this._connected = false;
    this._timers = [];
  }

  /**
   * Register a listener for an event.
   * @param {string} eventName
   * @param {Function} callback
   */
  on(eventName, callback) {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    this._listeners.get(eventName).add(callback);
    return this;
  }

  /**
   * Remove a listener for an event.
   * @param {string} eventName
   * @param {Function} callback
   */
  off(eventName, callback) {
    const set = this._listeners.get(eventName);
    if (set) set.delete(callback);
    return this;
  }

  /**
   * Emit an event (for testing / simulating server pushes).
   * @param {string} eventName
   * @param {*} payload
   */
  emit(eventName, payload) {
    // In mock mode this is a no-op toward the server.
    // We log it so developers can see what the client is sending.
    console.debug(`[MockSocket] emit →`, eventName, payload);
    return this;
  }

  /** Start the mock socket — begins firing simulated events. */
  connect() {
    if (this._connected) return this;
    this._connected = true;
    console.debug('[MockSocket] connected (mock)');

    // Fire each mock event once after a staggered delay so the UI can react
    let delay = 2000;
    for (const [eventName, factory] of Object.entries(MOCK_EVENT_FACTORIES)) {
      const timer = setTimeout(() => {
        if (!this._connected) return;
        const payload = factory();
        const cbs = this._listeners.get(eventName);
        if (cbs) {
          cbs.forEach((cb) => cb(payload));
        }
        console.debug(`[MockSocket] ← ${eventName}`, payload);
      }, delay);
      this._timers.push(timer);
      delay += 3000; // stagger events 3 s apart
    }
    return this;
  }

  /** Disconnect the mock socket. */
  disconnect() {
    this._connected = false;
    this._timers.forEach(clearTimeout);
    this._timers = [];
    console.debug('[MockSocket] disconnected (mock)');
    return this;
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
// When USE_MOCK_SOCKET is false, swap in the real socket.io-client:
//
//   import { io } from 'socket.io-client';
//   const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000');
//   export default socket;
//

let socket;

if (USE_MOCK_SOCKET) {
  socket = new MockSocket();
} else {
  // Real implementation — uncomment and replace when backend is available:
  // import { io } from 'socket.io-client';
  // socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000');
  throw new Error(
    'Real socket.io-client not configured yet. Set USE_MOCK_SOCKET = true or provide a socket.io server URL.',
  );
}

export default socket;
