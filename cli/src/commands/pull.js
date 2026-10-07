import { loadConfig, loadAuth } from '../config.js';
import { getDb } from '../db.js';
import { validateContextRecord } from '../core/schema.js';

export async function pullCommand(options) {
  const db = getDb();
  const config = loadConfig();
  const auth = loadAuth();

  if (!auth || !auth.token) {
    console.error('Error: Authentication required to pull team records. Run "agentrelay login" first.');
    process.exit(1);
  }

  // Get user's teams
  const teamsRes = await fetch(`${config.serverUrl}/api/v1/teams`, {
    headers: { 'Authorization': `Bearer ${auth.token}` }
  });
  const teamsData = await teamsRes.json();
  if (!teamsRes.ok || !teamsData.teams || teamsData.teams.length === 0) {
    console.log('You are not currently in any team.');
    return;
  }

  let totalPulled = 0;

  for (const team of teamsData.teams) {
    const cursorRow = db.prepare('SELECT cursor FROM team_cursor WHERE team_id = ?').get(team.id);
    const currentCursor = cursorRow ? cursorRow.cursor : 0;

    const pullUrl = `${config.serverUrl}/api/v1/teams/${team.id}/records?since=${currentCursor}&limit=50`;
    const res = await fetch(pullUrl, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn(`Warning: Failed to pull records for team ${team.name}:`, data.error?.message);
      continue;
    }

    if (!data.records || data.records.length === 0) {
      continue;
    }

    let maxSeq = currentCursor;

    const insertStmt = db.prepare(`
      INSERT INTO records (
        record_id, version, schema_version, json, origin, author_id, project_tag,
        shareable, feedback_status, sensitivity, created_at
      ) VALUES (?, ?, ?, ?, 'team', ?, ?, ?, ?, ?, ?)
      ON CONFLICT(record_id, version) DO UPDATE SET
        json = excluded.json,
        origin = 'team'
    `);

    for (const item of data.records) {
      if (item.seq && item.seq > maxSeq) {
        maxSeq = item.seq;
      }

      if (item.withdrawn) {
        // Handle withdrawn tombstone
        db.prepare('DELETE FROM records WHERE record_id = ?').run(item.recordId);
        continue;
      }

      try {
        const record = item.json ? JSON.parse(item.json) : item;
        validateContextRecord(record);

        record.origin = 'team';

        insertStmt.run(
          record.recordId,
          record.version,
          record.schemaVersion,
          JSON.stringify(record),
          record.author?.userId || 'team_member',
          record.acl?.projectTag || 'shared',
          1,
          'accepted',
          record.sensitivity?.label || 'none',
          record.times?.createdAt || new Date().toISOString()
        );

        // Index in FTS5 table
        try {
          db.prepare(`
            INSERT OR REPLACE INTO records_fts (record_id, title, summary, decisions, tags, project_tag)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            record.recordId,
            record.content.title,
            record.content.summary,
            JSON.stringify(record.content.decisions),
            (record.content.tags || []).join(' '),
            record.acl.projectTag
          );
        } catch {
          // ignore FTS fallback
        }

        totalPulled += 1;
      } catch (err) {
        console.warn(`Warning: Pulled invalid record (${item.recordId}):`, err.message);
      }
    }

    // Update cursor
    db.prepare(`
      INSERT INTO team_cursor (team_id, cursor) VALUES (?, ?)
      ON CONFLICT(team_id) DO UPDATE SET cursor = excluded.cursor
    `).run(team.id, maxSeq);
  }

  console.log(`✔ Incremental pull complete. Fetched ${totalPulled} record(s) from team store.`);
}
