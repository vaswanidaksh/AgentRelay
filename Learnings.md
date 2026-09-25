# Learnings.md — AgentRelay Phase 0 Frontend Setup

A reference for anyone new to this codebase. Each entry explains **what** a tool/pattern is,
**why** it was chosen for AgentRelay specifically, and **where** to see it in action.

---

## 1. Vite

**What it is:**
Vite is a modern frontend build tool that uses native ES modules during development and
Rollup for production builds. Unlike older bundlers (Webpack, Parcel), Vite starts the dev
server almost instantly because it skips a full-bundle step — modules are served on-demand
via the browser's native `import` mechanism.

**Why AgentRelay uses it:**
AgentRelay is a real-time collaboration platform where fast iteration matters. Developers will
frequently modify UI components while testing WebSocket events, mock APIs, and multi-agent
session flows. Vite's sub-second hot module replacement (HMR) means changes appear in the
browser instantly without losing React component state — critical when debugging a live
session with mock socket events firing on timers.

**Where it's used:**
- Config: [`frontend/vite.config.js`](frontend/vite.config.js) — the Vite configuration with
  React and Tailwind plugins.
- Scripts: `cd frontend && npm run dev` starts the development server; `npm run build` produces
  the production bundle.

---

## 2. React Router — Protected Routes Pattern

**What it is:**
`react-router-dom` provides client-side routing for single-page React apps. A *protected
route* is a wrapper component that checks whether the user is authenticated before rendering
the child route — if not, it redirects to the login page.

**Why AgentRelay uses it:**
AgentRelay has distinct authenticated surfaces (workspace, sessions, session detail, analytics)
and a public login page. The protected route pattern centralizes auth-gating logic in one
place rather than repeating `if (!user) redirect(...)` in every page component. It also
preserves the user's intended destination via `location.state.from`, so after login they
land where they originally wanted to go.

**Where it's used:**
- Guard component: [`frontend/src/components/ProtectedRoute.jsx`](frontend/src/components/ProtectedRoute.jsx)
  — checks `useAuth().isAuthenticated` and renders `<Navigate to="/login">` on failure.
- Route wiring: [`frontend/src/App.jsx`](frontend/src/App.jsx) — every route except `/login`
  is wrapped in `<ProtectedRoute>`.

```jsx
// frontend/src/App.jsx (simplified)
<Route
  path="/workspace"
  element={
    <ProtectedRoute>
      <WorkspacePage />
    </ProtectedRoute>
  }
/>
```

---

## 3. Tailwind CSS v4 Setup

**What it is:**
Tailwind CSS is a utility-first CSS framework. Version 4 introduces a Vite-native plugin
(`@tailwindcss/vite`) that replaces the older PostCSS-based pipeline. Instead of a
`tailwind.config.js` file, v4 uses a CSS-first configuration model with `@import "tailwindcss"`.

**Why AgentRelay uses it:**
AgentRelay's UI will evolve rapidly across multiple phases. Tailwind's utility classes let
developers build polished, consistent UIs without writing custom CSS files for every component.
The v4 Vite plugin integrates natively with Vite's pipeline — no separate PostCSS config
needed — keeping the tool chain minimal and fast.

**Where it's used:**
- Vite plugin registration: [`frontend/vite.config.js`](frontend/vite.config.js) —
  `tailwindcss()` in the plugins array.
- CSS entry point: [`frontend/src/index.css`](frontend/src/index.css) — `@import "tailwindcss";`
- Example usage: [`frontend/src/pages/LoginPage.jsx`](frontend/src/pages/LoginPage.jsx) — the
  sign-in button uses classes like `bg-indigo-600`, `hover:bg-indigo-500`, `rounded-xl`,
  `shadow-lg`.

```jsx
// frontend/src/pages/LoginPage.jsx (button snippet)
<button className="w-full py-3 px-4 rounded-xl font-semibold text-sm
                   bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                   text-white transition-colors duration-150
                   shadow-lg shadow-indigo-500/25">
  Sign in with Mock Account
</button>
```

---

## 4. Axios Instance Abstraction

**What it is:**
Axios is an HTTP client library. An *axios instance* (`axios.create(...)`) is a pre-configured
client with a fixed `baseURL`, default headers, and interceptors — so every API call
automatically includes the auth token without the caller needing to manage it.

**Why AgentRelay uses it:**
AgentRelay's frontend will talk to 13+ backend endpoints. Rather than passing the auth token
and base URL to every fetch call manually, the axios instance in `lib/api.js` attaches the
JWT from `localStorage` via a request interceptor. When the backend goes live, only the
`baseURL` (via `VITE_API_BASE_URL` env var) needs to change — no per-call edits.

**Where it's used:**
- Instance creation + interceptor: [`frontend/src/lib/api.js`](frontend/src/lib/api.js),
  lines 8–22.

```js
// frontend/src/lib/api.js
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ar_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## 5. Mock-Layer Swap Pattern

**What it is:**
Each API function in `lib/api.js` checks a `USE_MOCKS` flag. When `true`, the function
returns a `Promise` that resolves after a simulated delay (300–600 ms) with realistic mock
data. When `false`, it delegates to the real axios instance. The function *signature and
return shape are identical* in both paths.

**Why AgentRelay uses it:**
The backend is being developed in parallel. Frontend engineers need to build, test, and demo
the full user journey (login → create session → claim driver → issue instructions → view
analytics) *before* any backend endpoint exists. By wrapping each function, the switch from
mock to real is a single-line change (`USE_MOCKS = false`) — or, in the future, an
environment variable — without touching any component or context code.

**Where it's used:**
- Every exported function in [`frontend/src/lib/api.js`](frontend/src/lib/api.js) follows
  this pattern.

```js
// frontend/src/lib/api.js — example: login()
export async function login(email, password) {
  if (USE_MOCKS) {
    return mockDelay({ token: 'mock_jwt_...', user: makeUser() });
  }
  return apiClient.post('/auth/login', { email, password });
}
```

The same approach is used in [`frontend/src/lib/socket.js`](frontend/src/lib/socket.js) for
the WebSocket layer: a `MockSocket` class provides `.on()`, `.off()`, `.emit()`, `.connect()`,
`.disconnect()` that match the real `socket.io-client` API. Swapping to the real client means
replacing the class instance, not any calling code.

---

## 6. React Context API

**What it is:**
React's Context API provides a way to share state across a component tree without prop
drilling. A *context provider* wraps the tree and exposes values; any descendant component
can consume them via `useContext()`.

**Why AgentRelay uses it:**
AgentRelay has two pieces of cross-cutting state:
1. **Auth state** (who is logged in, their token) — needed by the ProtectedRoute guard, the
   workspace page, API interceptors, and eventually every component that shows user info.
2. **Session state** (active session, driver, redirect queue, diffs) — needed by the session
   detail page, control panel, diff viewer, and analytics page.

Using Context avoids prop-drilling these through 4+ levels of nesting and keeps the data
flow predictable (one source of truth per domain).

**Where it's used:**
- Auth: [`frontend/src/context/AuthContext.jsx`](frontend/src/context/AuthContext.jsx) —
  exposes `user`, `token`, `login()`, `logout()`, `isAuthenticated`.
- Session: [`frontend/src/context/SessionContext.jsx`](frontend/src/context/SessionContext.jsx)
  — exposes `session`, `driver`, `redirectQueue`, `diffs`, and placeholder setters.
- Provider wiring: [`frontend/src/App.jsx`](frontend/src/App.jsx) — `<AuthProvider>` and
  `<SessionProvider>` wrap all routes.

```jsx
// frontend/src/App.jsx
<AuthProvider>
  <SessionProvider>
    <Routes>...</Routes>
  </SessionProvider>
</AuthProvider>
```

---

## 7. Socket.io-client's Event-Driven Model

**What it is:**
Socket.io-client connects to a Socket.io server and provides a pub/sub interface:
`.on(event, callback)` to listen for server-pushed events, `.emit(event, payload)` to send
events to the server. This is fundamentally different from HTTP's request/response model —
the server can push data to the client at any time without the client polling.

**Why AgentRelay uses it:**
AgentRelay is a *real-time multiplayer* platform. When one agent claims the driver seat,
other participants must see the change instantly — not after a manual refresh. Six event
types drive the real-time experience:
- `presence_update` — who's online in a session
- `driver_changed` — driver seat handoff
- `redirect_queued` / `redirect_resolved` — redirect request lifecycle
- `diff_proposed` — new code changes from an agent
- `session_completed` — session end

The mock socket layer in `lib/socket.js` simulates these events firing on staggered timers
so the frontend can be built and tested with realistic data flow before the backend exists.

**Where it's used:**
- Mock implementation: [`frontend/src/lib/socket.js`](frontend/src/lib/socket.js) —
  `MockSocket` class fires each event with a 3-second stagger after `.connect()` is called.
- Future real implementation replaces the mock with:
  ```js
  import { io } from 'socket.io-client';
  const socket = io('http://localhost:4000');
  export default socket;
  ```

---

## 8. Feature-Sliced Folder Structure

**What it is:**
Organizing `src/` by *feature domain* (auth, workspace, sessions, control, diffs, analytics)
rather than by *file type* (all components in one folder, all hooks in another). Each feature
directory can contain its own components, hooks, utils, and tests.

**Why AgentRelay uses it:**
AgentRelay has six distinct feature domains that will grow independently across phases. A
feature-sliced structure means a developer working on the "redirect" flow only needs to
look in `features/control/` — they won't accidentally break analytics code. It also maps
cleanly to the backend's domain model (sessions, diffs, analytics are separate API groups).

**Where it's used:**
- Directory layout under [`frontend/src/features/`](frontend/src/features/):
  ```
  features/
    auth/        — login, registration, token management
    workspace/   — workspace overview, project selection
    sessions/    — session list, session creation
    control/     — driver controls, redirects, handoffs
    diffs/       — code diff viewer, instruction history
    analytics/   — session analytics dashboard
  ```
  Each directory has an `index.js` placeholder that will be replaced with real exports.

---

## 9. localStorage Token Persistence

**What it is:**
Storing the JWT and user object in `localStorage` so that authentication survives page
refreshes. The `AuthContext` initializes its state from `localStorage` on mount.

**Why AgentRelay uses it:**
During development with mock auth, developers frequently refresh the page while testing
different routes. Without persistence, every refresh sends them back to login. The
`AuthContext` reads `ar_token` and `ar_user` from `localStorage` on initialization, so a
logged-in state persists across refreshes.

**Where it's used:**
- Read on init: [`frontend/src/context/AuthContext.jsx`](frontend/src/context/AuthContext.jsx)
  — `useState` initializers read from `localStorage`.
- Write on login: same file, `login()` calls `localStorage.setItem(...)`.
- Clear on logout: same file, `logout()` calls `localStorage.removeItem(...)`.

---

## 10. Simulated Network Delay in Mocks

**What it is:**
Each mock API function wraps its return value in a `setTimeout` with a random 300–600 ms
delay before resolving the Promise.

**Why AgentRelay uses it:**
Without delay, mock API calls resolve synchronously (in the same tick), which means loading
spinners, skeleton screens, and error states never render. By adding realistic latency,
developers can:
- Verify that loading indicators appear and disappear correctly.
- Test race conditions (e.g., what if a user clicks "claim driver" twice rapidly?).
- Build UIs that feel natural rather than artificially instant.

**Where it's used:**
- Helper function: [`frontend/src/lib/api.js`](frontend/src/lib/api.js) — `mockDelay(data)`
  and `mockError(status, body)`.

```js
function mockDelay(data) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ data }), randInt(300, 600));
  });
}
```

---

## 11. Monorepo-Style Folder Separation

**What it is:**
Organizing a single git repository with clearly separated top-level directories for each
major component of the system — `frontend/`, `backend/`, `docs/`, `tests/`,
`infrastructure/`, `scripts/`, and `.github/workflows/`. Each directory has its own
`package.json`, dependencies, and build tooling, even though they share a single repo and
git history.

**Why AgentRelay uses it:**
AgentRelay is built by a two-person team where frontend and backend are owned by different
people. Without folder separation, both developers' tooling collides:
- Vite's `node_modules/` and the backend's `node_modules/` would merge, creating version
  conflicts between frontend-only packages (React, Tailwind) and backend-only packages
  (Express, Prisma, etc.).
- A single `package.json` would force both sides to coordinate on every dependency change,
  leading to unnecessary merge conflicts.
- Build outputs (`dist/` for Vite vs. compiled backend code) would mix at the root.

By giving each side its own directory, dependencies are completely isolated. Running
`cd frontend && npm install` installs only frontend packages; `cd backend && npm install`
installs only backend packages. CI/CD workflows can target each directory independently, and
merge conflicts between frontend and backend work are virtually eliminated.

**Where it's used:**
- Repo root structure:
  ```
  AgentRelay/
  ├── frontend/          ← Vite + React + Tailwind app (this phase)
  ├── backend/           ← API server (separate owner, .gitkeep placeholder)
  ├── docs/              ← Project documentation
  ├── tests/             ← Integration / e2e tests
  ├── infrastructure/    ← Deployment configs
  ├── scripts/           ← CI and utility scripts
  └── .github/workflows/ ← GitHub Actions pipelines
  ```
- Frontend-specific files (`package.json`, `vite.config.js`, `src/`, etc.) all live inside
  `frontend/`, keeping the repo root clean for project-wide files (`README.md`,
  `CONTRIBUTING.md`, `LICENSE`, `.gitignore`).
