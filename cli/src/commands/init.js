import { loadConfig, saveConfig, getAgentRelayDir } from '../config.js';
import { getDb } from '../db.js';

export async function initCommand() {
  const dir = getAgentRelayDir();
  const config = loadConfig();
  const db = getDb();

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
  console.log(`\nInitialization complete. Run 'agentrelay scope add <dir>' to begin capturing AI sessions.`);
}
