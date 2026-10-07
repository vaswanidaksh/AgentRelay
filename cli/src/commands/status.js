import { loadConfig, saveConfig, loadAuth } from '../config.js';
import { getDb } from '../db.js';

export function statusCommand() {
  const config = loadConfig();
  const auth = loadAuth();
  const db = getDb();

  const sessionCount = db.prepare('SELECT COUNT(*) as cnt FROM sessions').get().cnt;
  const eventCount = db.prepare('SELECT COUNT(*) as cnt FROM events').get().cnt;
  const recordCount = db.prepare('SELECT COUNT(*) as cnt FROM records').get().cnt;
  const pendingJobs = db.prepare('SELECT COUNT(*) as cnt FROM jobs WHERE state = \'QUEUED\'').get().cnt;

  console.log(`AgentRelay Daemon Status`);
  console.log(`------------------------`);
  console.log(`State:          ${config.paused ? '⏸ PAUSED' : '▶ ACTIVE'}`);
  console.log(`Scoped Folders: ${config.scopes.length} folder(s)`);
  if (config.scopes.length > 0) {
    config.scopes.forEach(s => console.log(`  - ${s}`));
  }
  console.log(`Indexed:        ${sessionCount} sessions | ${eventCount} events | ${recordCount} distilled records`);
  console.log(`Queue Depth:    ${pendingJobs} pending distillation jobs`);
  console.log(`Auth User:      ${auth ? `@${auth.user?.handle || auth.user?.github_id}` : 'Not logged in'}`);
  console.log(`Model Runtime:  ${config.modelRuntimeUrl} (${config.modelName})`);
}

export function pauseCommand() {
  const config = loadConfig();
  config.paused = true;
  saveConfig(config);
  console.log('⏸ AgentRelay capture watcher is now PAUSED. Zero events will be captured.');
}

export function resumeCommand() {
  const config = loadConfig();
  config.paused = false;
  saveConfig(config);
  console.log('▶ AgentRelay capture watcher has RESUMED.');
}
