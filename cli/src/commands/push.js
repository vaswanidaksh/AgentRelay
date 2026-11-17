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
    return promoteCommand(recordId, options);
  }

  // Find all local accepted shareable records
  const rows = db.prepare('SELECT record_id, version, json FROM records WHERE withdrawn_at IS NULL ORDER BY created_at DESC').all();
  const candidates = [];
  for (const r of rows) {
    try {
      const parsed = JSON.parse(r.json);
      if (parsed.visibility?.shareable && parsed.feedback?.status !== 'rejected') {
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

  console.log(`🚀 Pushing ${candidates.length} context record(s) to your Personal Context Vault...`);
  let successCount = 0;
  for (const c of candidates) {
    try {
      await promoteCommand(c.recordId, options);
      successCount++;
    } catch (e) {
      console.warn(`  - Skipped ${c.recordId}: ${e.message}`);
    }
  }

  console.log(`\n✔ Pushed ${successCount} record(s) to your Personal Context Vault.`);
  console.log(`View them anytime on your dashboard.`);
}
