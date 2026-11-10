import { loadConfig, loadAuth, getAgentRelayDir } from '../config.js';
import { getDb } from '../db.js';
import { pullCommand } from './pull.js';
import { syncGlobalContextFiles } from '../core/contextExporter.js';

export async function initCommand(options = {}) {
  const dir = getAgentRelayDir();
  const config = loadConfig();
  const auth = loadAuth();
  getDb(); // ensure schema is created

  console.log(`✔ AgentRelay directory: ${dir}`);
  console.log(`✔ Local SQLite store initialized`);

  // Check local model runtime
  let modelStatus = 'Offline (will use edge rule-based distillation)';
  try {
    const res = await fetch(`${config.modelRuntimeUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      modelStatus = `Active (${config.modelRuntimeUrl} - model: ${config.modelName})`;
    }
  } catch {
    // runtime offline
  }

  console.log(`✔ Model runtime: ${modelStatus}`);

  // Auto-pull & context sync if user is logged in
  if (auth && auth.token) {
    console.log(`\n🔄 Authenticated as ${auth.handle || '@user'}. Pulling team context and code files...`);
    try {
      await pullCommand();
    } catch (e) {
      console.warn('Notice: Could not pull team records during init:', e.message);
    }
  } else {
    // Sync any existing local records to context files
    const syncRes = syncGlobalContextFiles(null, { writeCwd: true });
    if (syncRes.count > 0) {
      console.log(`✔ Synced ${syncRes.count} local context record(s) to ${syncRes.indexFile}`);
    }
    console.log(`\nℹ To pull team code files & shared chats into this terminal, run:`);
    console.log(`  agentrelay login && agentrelay pull`);
  }

  console.log(`\nInitialization complete. Run 'agentrelay scope add <dir>' to begin capturing AI sessions.`);
}
