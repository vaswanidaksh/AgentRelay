import { getDb, closeDb } from './connection.js';
import { initializeSchema } from './schema.js';
import { createUser, createApiToken } from './queries/users.js';
import { createTeam, createInvite } from './queries/teams.js';
import { upsertPromotedRecord } from './queries/records.js';
import { logAuditEvent } from './queries/audit.js';

export function seed() {
  const db = getDb();
  initializeSchema(db);

  db.exec(`
    DELETE FROM audit_events;
    DELETE FROM records;
    DELETE FROM invites;
    DELETE FROM memberships;
    DELETE FROM teams;
    DELETE FROM api_tokens;
    DELETE FROM users;
  `);

  const utkarsh = createUser({
    id: 'u_utkarsh01',
    githubId: 'gh_10101',
    handle: '@utkarsh'
  });

  const daksh = createUser({
    id: 'u_daksh02',
    githubId: 'gh_20202',
    handle: '@daksh'
  });

  createApiToken({
    id: 'tok_utkarsh_demo',
    userId: utkarsh.id,
    rawToken: 'lcp_pat_utkarsh_demo_token_123'
  });

  createApiToken({
    id: 'tok_daksh_demo',
    userId: daksh.id,
    rawToken: 'lcp_pat_daksh_demo_token_456'
  });

  const team = createTeam({
    id: 't_polaris_eng',
    name: 'Polaris Engineering',
    createdBy: utkarsh.id
  });

  createInvite({
    id: 'inv_polaris_welcome',
    teamId: team.id,
    rawToken: 'polaris_secret_invite_2026',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    maxUses: 10
  });

  const sampleRecord = {
    recordId: "9b1f3c2e-4b6a-48d9-9571-0857ef51a701",
    version: 1,
    schemaVersion: "lcp.record/0.1",
    author: { userId: utkarsh.id, handle: "@utkarsh", deviceId: "mac-m2-01" },
    origin: "local",
    source: {
      agent: "claude-code",
      agentVersion: "1.0.0",
      adapterVersion: "0.1.0",
      sessionId: "s_77",
      eventRange: [1, 214],
      projectTag: "payments-api"
    },
    times: {
      sessionStart: "2026-10-06T09:12:00Z",
      sessionEnd: "2026-10-06T10:03:00Z",
      createdAt: "2026-10-06T10:05:00Z",
      updatedAt: "2026-10-06T10:20:00Z"
    },
    content: {
      title: "Retry policy for webhook delivery",
      summary: "Chose capped exponential backoff over fixed retries to prevent thundering herd under payment gateway degradation.",
      decisions: [
        { text: "Cap retries at 5 with jitter", evidence: ["e_41", "e_58"] }
      ],
      filesTouched: ["src/webhooks/deliver.ts"],
      openQuestions: ["Dead-letter queue sizing"],
      tags: ["webhooks", "retries"]
    },
    sensitivity: {
      label: "none",
      scrubberVersion: "0.1.0",
      redactionCounts: { aws_key: 1 }
    },
    visibility: {
      shareable: true,
      teamId: team.id,
      promotedAt: new Date().toISOString()
    },
    acl: {
      projectTag: "payments-api",
      teamId: team.id
    },
    feedback: {
      status: "accepted",
      reviewedAt: "2026-10-06T10:20:00Z"
    },
    provenance: {
      distiller: { runtime: "local", model: "qwen2.5-coder-7b", promptVersion: "d-0.2" },
      supersedes: null
    }
  };

  upsertPromotedRecord({
    recordId: sampleRecord.recordId,
    version: sampleRecord.version,
    teamId: team.id,
    authorId: utkarsh.id,
    projectTag: sampleRecord.acl.projectTag,
    schemaVersion: sampleRecord.schemaVersion,
    json: sampleRecord,
    sensitivity: sampleRecord.sensitivity.label
  });

  logAuditEvent({
    actorId: utkarsh.id,
    action: 'record_promoted',
    teamId: team.id,
    recordId: sampleRecord.recordId,
    metadata: { version: 1 }
  });

  console.log('[Seed] ✓ LCP database seeded with demo users, team, and sample record');
}

if (process.argv[1]?.endsWith('seed.js')) {
  seed();
  closeDb();
}
