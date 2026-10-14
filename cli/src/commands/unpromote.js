import { loadConfig, loadAuth } from '../config.js';
import { getDb } from '../db.js';

export async function unpromoteCommand(recordId, options = {}) {
  const db = getDb();
  const config = loadConfig();
  const auth = loadAuth();

  if (!auth || !auth.token) {
    console.error('Error: Authentication required to unpromote records. Run "agentrelay login" first.');
    process.exit(1);
  }

  if (!recordId) {
    console.error('Usage: agentrelay unpromote <recordId> [--team <teamId>]');
    process.exit(1);
  }

  // Find local record
  const row = db.prepare('SELECT * FROM records WHERE record_id = ? ORDER BY version DESC LIMIT 1').get(recordId);
  if (!row) {
    console.error(`Error: Local record not found: ${recordId}`);
    process.exit(1);
  }

  const record = JSON.parse(row.json);

  // Resolve target team
  let teamId = options.team || record.visibility?.teamId || record.acl?.teamId;
  if (!teamId) {
    const teamsRes = await fetch(`${config.serverUrl}/api/v1/teams`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    const teamsData = await teamsRes.json();
    if (!teamsRes.ok || !teamsData.teams || teamsData.teams.length === 0) {
      console.error('Error: You are not in any team.');
      process.exit(1);
    }
    teamId = teamsData.teams[0].id;
  }

  console.log(`Withdrawing record ${recordId} from team ${teamId}...`);

  const response = await fetch(`${config.serverUrl}/api/v1/teams/${teamId}/records/${recordId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${auth.token}`
    }
  });

  const resData = await response.json();
  if (!response.ok) {
    console.error(`Unpromote failed (${response.status}):`, resData.error?.message || response.statusText);
    process.exit(1);
  }

  // Clear promotedAt in local record
  record.visibility.promotedAt = null;
  db.prepare(`
    UPDATE records SET json = ? WHERE record_id = ? AND version = ?
  `).run(JSON.stringify(record), record.recordId, record.version);

  console.log(`✔ Successfully unpromoted record ${recordId} from team ${teamId}`);
  console.log(`  Tombstone will propagate to teammates on next pull.`);
}
