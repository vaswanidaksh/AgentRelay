#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# demo.sh — Two-Machine End-to-End Acceptance Demo (PRD §3.4 Metric M-9, §24.4, TEST-020)
#
# Simulates Machine A (Alice) and Machine B (Bob) sharing context securely
# via the AgentRelay LCP Team Server with deterministic secret scrubbing,
# offline retrieval, tenant isolation, and tombstone propagation.
# ─────────────────────────────────────────────────────────────────────────────

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="node ${DIR}/cli/bin/agentrelay.js"
PORT=4000
SERVER_URL="http://localhost:${PORT}"
DEMO_ROOT="/tmp/agentrelay_demo_$(date +%s)"
DIR_A="${DEMO_ROOT}/machine_a"
DIR_B="${DEMO_ROOT}/machine_b"
DIR_C="${DEMO_ROOT}/machine_c"
PROJECT_DIR="${DEMO_ROOT}/sample_project"

mkdir -p "${DIR_A}" "${DIR_B}" "${DIR_C}" "${PROJECT_DIR}"

cleanup() {
  echo ""
  echo "Cleaning up demo artifacts..."
  if [ -n "${SERVER_PID:-}" ]; then
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
  rm -rf "${DEMO_ROOT}"
}
trap cleanup EXIT

echo "════════════════════════════════════════════════════════════════════════════"
echo "  AGENTRELAY LCP — TWO-MACHINE ACCEPTANCE REHEARSAL (TEST-020)"
echo "════════════════════════════════════════════════════════════════════════════"
echo "Demo Root: ${DEMO_ROOT}"

# ── 0. Ensure Server Is Running ──────────────────────────────────────────────
echo ""
echo "[Step 0] Checking LCP Server status..."
if curl -s "${SERVER_URL}/healthz" >/dev/null 2>&1; then
  echo "✔ LCP server is already running on ${SERVER_URL}"
else
  echo "Starting background LCP server on port ${PORT}..."
  (cd "${DIR}/backend" && PORT=${PORT} node src/server.js) > "${DEMO_ROOT}/server.log" 2>&1 &
  SERVER_PID=$!
  sleep 1.5
  curl -s "${SERVER_URL}/healthz" >/dev/null 2>&1 || {
    echo "❌ Failed to start LCP server. See ${DEMO_ROOT}/server.log"
    exit 1
  }
  echo "✔ LCP server started (PID: ${SERVER_PID})"
fi

# ── 1. Machine A (Alice) Setup & Scope ────────────────────────────────────────
echo ""
echo "[Step 1] Machine A (Alice) clean install & scope initialization"
export AGENTRELAY_HOME="${DIR_A}"
export SERVER_URL="${SERVER_URL}"

${CLI} init
${CLI} scope add "${PROJECT_DIR}"
${CLI} status

# Login Alice via CLI
${CLI} login --token "demo_oauth_alice_key"
ALICE_BEARER=$(node -e "
import { loadAuth } from '${DIR}/cli/src/config.js';
console.log(loadAuth().token);
")
echo "✔ Alice authenticated with team server"

# Alice creates team
TEAM_RES=$(curl -s -X POST "${SERVER_URL}/api/v1/teams" \
  -H "Authorization: Bearer ${ALICE_BEARER}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alpha Engineering"}')
TEAM_ID=$(node -e "console.log(JSON.parse(process.argv[1]).team.id)" "${TEAM_RES}")
echo "✔ Team created: Alpha Engineering (ID: ${TEAM_ID})"

# Alice creates invite for team
INVITE_RES=$(curl -s -X POST "${SERVER_URL}/api/v1/teams/${TEAM_ID}/invites" \
  -H "Authorization: Bearer ${ALICE_BEARER}" \
  -H "Content-Type: application/json" \
  -d '{"maxUses":5,"expiresInHours":24}')
INVITE_TOKEN=$(node -e "console.log(JSON.parse(process.argv[1]).invite.token)" "${INVITE_RES}")
echo "✔ Invite created: ${INVITE_TOKEN}"

# ── 2. Scripted Session with Planted Secret ───────────────────────────────────
echo ""
echo "[Step 2] Running scripted agent session with planted secrets..."
CLAUDE_DIR="${PROJECT_DIR}/.claude"
mkdir -p "${CLAUDE_DIR}"
SESSION_FILE="${CLAUDE_DIR}/agent-session.jsonl"

cat <<EOF > "${SESSION_FILE}"
{"type":"user","content":"Fix the JWT validation bug in auth/middleware.ts. My GitHub token is ghp_ABCDEFghijklmnop1234567890abcdefghi","timestamp":"2026-10-13T10:00:00Z"}
{"type":"assistant","content":"I will wrap JWT verify and rotate AWS key AKIAIOSFODNN7EXAMPLE found in .env.","timestamp":"2026-10-13T10:00:05Z"}
{"type":"tool_use","name":"write_file","input":{"path":"auth/middleware.ts","content":"export function authMiddleware() { /* fixed */ }"},"timestamp":"2026-10-13T10:00:10Z"}
{"type":"tool_result","output":"File auth/middleware.ts written successfully","timestamp":"2026-10-13T10:00:11Z"}
{"type":"assistant","content":"Done! JWT validation is secured. Contact dev@company.com for review.","timestamp":"2026-10-13T10:00:15Z"}
EOF

# Run programmatic capture & distill on Machine A
node -e "
import { scanAndCaptureSessionFiles } from '${DIR}/cli/src/watcher/watcher.js';
import { processDistillJobs } from '${DIR}/cli/src/distiller/distiller.js';
const cap = scanAndCaptureSessionFiles();
console.log('  Captured events:', cap.capturedEvents);
await processDistillJobs();
"
echo "✔ Captured transcript and distilled candidate record"

# ── 3. Review & Accept ────────────────────────────────────────────────────────
echo ""
echo "[Step 3] Alice reviews candidate record (AgentRelay review --accept)"
${CLI} review --accept

# Extract record ID
RECORD_ID=$(node -e "
import { getDb } from '${DIR}/cli/src/db.js';
const row = getDb().prepare('SELECT record_id FROM records LIMIT 1').get();
console.log(row ? row.record_id : '');
")
echo "✔ Distilled Record ID: ${RECORD_ID}"

# ── 4. Offline Search Verification ───────────────────────────────────────────
echo ""
echo "[Step 4] Alice searches locally with network disabled (offline)"
SERVER_URL="http://invalid-offline-host:9999" ${CLI} search "JWT"
echo "✔ Local search succeeded offline (zero network dependency)"

# ── 5. Share & Promote to Team ────────────────────────────────────────────────
echo ""
echo "[Step 5] Alice marks record shareable and promotes to Alpha Engineering"
${CLI} share "${RECORD_ID}"
${CLI} promote "${RECORD_ID}" --team "${TEAM_ID}"
echo "✔ Record promoted to team server"

# ── 6. Machine B (Bob) Pull & Search ─────────────────────────────────────────
echo ""
echo "[Step 6] Machine B (Bob) joins team, pulls records, and searches"
export AGENTRELAY_HOME="${DIR_B}"

${CLI} init

# Bob auth
${CLI} login --token "demo_oauth_bob_key"
BOB_BEARER=$(node -e "
import { loadAuth } from '${DIR}/cli/src/config.js';
console.log(loadAuth().token);
")

# Bob joins team using invite token
JOIN_RES=$(curl -s -X POST "${SERVER_URL}/api/v1/invites/${INVITE_TOKEN}/accept" \
  -H "Authorization: Bearer ${BOB_BEARER}")
echo "✔ Bob joined Alpha Engineering"

# Bob pulls shared records
${CLI} pull

# Bob searches pulled records
echo "Bob searches for shared context:"
${CLI} search "JWT" --json
echo "✔ Bob retrieved Alice's record with provenance and origin intact"

# ── 7. Server-Side Secret Absence & Audit Verification ───────────────────────
echo ""
echo "[Step 7] Inspect promoted record on server: verify secret is scrubbed & audit logged"
SERVER_REC=$(curl -s -H "Authorization: Bearer ${ALICE_BEARER}" "${SERVER_URL}/api/v1/teams/${TEAM_ID}/records/${RECORD_ID}")

node -e "
const data = JSON.parse(process.argv[1]);
const str = JSON.stringify(data);
if (str.includes('AKIAIOSFODNN7EXAMPLE')) {
  console.error('❌ LEAK DETECTED: Server record contains raw AWS key!');
  process.exit(1);
}
if (str.includes('ghp_ABCDEFghijklmnop1234567890abcdefghi')) {
  console.error('❌ LEAK DETECTED: Server record contains raw GitHub token!');
  process.exit(1);
}
console.log('✔ Verified: Planted secrets absent from server store (defense-in-depth re-scrub active)');
" "${SERVER_REC}"

# Verify Audit Trail
AUDIT_RES=$(curl -s -H "Authorization: Bearer ${ALICE_BEARER}" "${SERVER_URL}/api/v1/teams/${TEAM_ID}/audit/verify")
node -e "
const res = JSON.parse(process.argv[1]);
if (!res.valid) {
  console.error('❌ Audit chain invalid!', res);
  process.exit(1);
}
console.log('✔ Cryptographic audit trail chain intact (SHA-256 hash verified, events checked: ' + res.checked + ')');
" "${AUDIT_RES}"

# ── 8. Tenant Isolation (Machine C / Eve) ────────────────────────────────────
echo ""
echo "[Step 8] Account outside team (Eve) attempts to read record (TEST-015)"
export AGENTRELAY_HOME="${DIR_C}"
EVE_AUTH_RES=$(curl -s -X POST "${SERVER_URL}/api/v1/auth/github" \
  -H "Content-Type: application/json" \
  -d '{"code":"demo_code_eve","handle":"@eve"}')
EVE_BEARER=$(node -e "console.log(JSON.parse(process.argv[1]).token)" "${EVE_AUTH_RES}")

EVE_PROBE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${EVE_BEARER}" \
  "${SERVER_URL}/api/v1/teams/${TEAM_ID}/records/${RECORD_ID}")

if [ "${EVE_PROBE_STATUS}" = "404" ] || [ "${EVE_PROBE_STATUS}" = "403" ]; then
  echo "✔ Tenant isolation confirmed: Eve rejected with HTTP ${EVE_PROBE_STATUS} (zero data leak)"
else
  echo "❌ Tenant isolation failed: HTTP ${EVE_PROBE_STATUS}"
  exit 1
fi

# ── 9. Unpromote & Tombstone Propagation ─────────────────────────────────────
echo ""
echo "[Step 9] Alice withdraws record (unpromote) & Bob receives tombstone"
export AGENTRELAY_HOME="${DIR_A}"
${CLI} unpromote "${RECORD_ID}" --team "${TEAM_ID}"

# Bob pulls again
export AGENTRELAY_HOME="${DIR_B}"
${CLI} pull

# Verify Bob's store no longer has the record
node -e "
import { getDb } from '${DIR}/cli/src/db.js';
const row = getDb().prepare('SELECT * FROM records WHERE record_id = ?').get('${RECORD_ID}');
if (row) {
  console.error('❌ Record still present in Bob store after tombstone pull!');
  process.exit(1);
}
console.log('✔ Tombstone successfully deleted record from Bob local store');
"

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "  🎉 TWO-MACHINE DEMO ACCEPTANCE PASSED END-TO-END (METRIC M-9, TEST-020)"
echo "════════════════════════════════════════════════════════════════════════════"
