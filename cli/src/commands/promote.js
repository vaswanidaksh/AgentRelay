import { loadConfig, loadAuth } from '../config.js';
import { getDb } from '../db.js';

export async function promoteCommand(recordId, options) {
  const db = getDb();
  const config = loadConfig();
  const auth = loadAuth();

  if (!auth || !auth.token) {
    console.error('Error: Authentication required to promote records. Run "agentrelay login" first.');
    process.exit(1);
  }

  const row = db.prepare('SELECT * FROM records WHERE record_id = ? ORDER BY version DESC LIMIT 1').get(recordId);
  if (!row) {
    console.error(`Error: Local record not found: ${recordId}`);
    process.exit(1);
  }

  const record = JSON.parse(row.json);

  if (!record.visibility.shareable) {
    console.error(`Error: Cannot promote unshareable record ${recordId}. Run "agentrelay share ${recordId}" first.`);
    process.exit(1);
  }

  if (record.feedback.status === 'rejected') {
    console.error(`Error: Cannot promote a rejected record: ${recordId}`);
    process.exit(1);
  }

  // Get user's teams to target
  const teamId = options.team || record.visibility.teamId || record.acl.teamId;
  if (!teamId) {
    // Fetch default team
    const teamsRes = await fetch(`${config.serverUrl}/api/v1/teams`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    });
    const teamsData = await teamsRes.json();
    if (!teamsRes.ok || !teamsData.teams || teamsData.teams.length === 0) {
      console.error('Error: You are not in any team. Create or join a team first via "agentrelay team create <name>".');
      process.exit(1);
    }
    record.visibility.teamId = teamsData.teams[0].id;
    record.acl.teamId = teamsData.teams[0].id;
  } else {
    record.visibility.teamId = teamId;
    record.acl.teamId = teamId;
  }

  const targetTeamId = record.visibility.teamId;

  console.log(`Promoting record ${record.recordId} (v${record.version}) to team ${targetTeamId}...`);

  const response = await fetch(`${config.serverUrl}/api/v1/teams/${targetTeamId}/records/${record.recordId}/versions/${record.version}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify(record),
  });

  const resData = await response.json();
  if (!response.ok) {
    console.error(`Promote failed (${response.status}):`, resData.error?.message || response.statusText);
    process.exit(1);
  }

  const now = new Date().toISOString();
  record.visibility.promotedAt = now;

  db.prepare(`
    UPDATE records SET json = ? WHERE record_id = ? AND version = ?
  `).run(JSON.stringify(record), record.recordId, record.version);

  console.log(`✔ Successfully promoted record ${record.recordId} to team ${targetTeamId}`);
}
