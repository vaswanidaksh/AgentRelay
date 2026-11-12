import { loadConfig, loadAuth } from '../config.js';
import { getDb } from '../db.js';
import { promoteCommand } from './promote.js';

export async function pushCommand(recordId, options = {}) {
  const db = getDb();
  const auth = loadAuth();

  if (!auth || !auth.token) {
    console.error('Error: Authentication required. Run "agentrelay login" first.');
    process.exit(1);
  }

  if (recordId) {
    const row = db.prepare('SELECT record_id, version, json FROM records WHERE record_id = ? ORDER BY version DESC LIMIT 1').get(recordId);
    if (row) {
      try {
        const parsed = JSON.parse(row.json);
        if (!parsed.visibility?.shareable) {
          parsed.visibility = parsed.visibility || {};
          parsed.visibility.shareable = true;
          db.prepare('UPDATE records SET shareable = 1, json = ? WHERE record_id = ? AND version = ?')
            .run(JSON.stringify(parsed), parsed.recordId, parsed.version);
        }
      } catch {
        // ignore
      }
    }
    return promoteCommand(recordId, options);
  }

  // Find all local records that are not rejected
  const rows = db.prepare('SELECT record_id, version, json FROM records ORDER BY created_at DESC').all();
  const candidates = [];
  for (const r of rows) {
    try {
      const parsed = JSON.parse(r.json);
      if (parsed.feedback?.status !== 'rejected') {
        if (!parsed.visibility?.shareable) {
          parsed.visibility = parsed.visibility || {};
          parsed.visibility.shareable = true;
          db.prepare('UPDATE records SET shareable = 1, json = ? WHERE record_id = ? AND version = ?')
            .run(JSON.stringify(parsed), parsed.recordId, parsed.version);
        }
        candidates.push(parsed);
      }
    } catch {
      // ignore
    }
  }

  if (candidates.length === 0) {
    console.log('No shareable context records found in local store to push.');
    console.log('Tip: Distill sessions with "agentrelay daemon" or review records with "agentrelay review".');
    return;
  }

  const config = loadConfig();
  let targetTeamId = options.team;
  if (!targetTeamId) {
    const teamsRes = await fetch(`${config.serverUrl}/api/v1/teams`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    });
    if (teamsRes.status === 401) {
      console.error('Error: Session expired or invalid token (401). Please run "agentrelay login" to refresh your credentials.');
      process.exit(1);
    }
    const teamsData = await teamsRes.json().catch(() => ({}));
    if (teamsData.teams && teamsData.teams.length > 0) {
      targetTeamId = teamsData.teams[0].id;
    }
  }

  console.log(`🚀 Pushing ${candidates.length} context record(s) to your Personal Context Vault...`);
  let successCount = 0;
  for (const c of candidates) {
    try {
      await promoteCommand(c.recordId, { ...options, team: targetTeamId });
      successCount++;
    } catch (e) {
      console.warn(`  - Skipped ${c.recordId}: ${e.message}`);
    }
  }

  console.log(`\n✔ Pushed ${successCount} record(s) to your Personal Context Vault.`);
  console.log(`View them anytime on your dashboard.`);
}
