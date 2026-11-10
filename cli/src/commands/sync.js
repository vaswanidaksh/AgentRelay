import { pullCommand } from './pull.js';
import { syncGlobalContextFiles } from '../core/contextExporter.js';
import { loadAuth } from '../config.js';

export async function syncCommand(options) {
  const auth = loadAuth();
  console.log('🔄 Synchronizing AgentRelay team context, code files, and chat history...');

  if (auth && auth.token) {
    // 1. Pull latest from team server
    await pullCommand(options);
  } else {
    console.log('ℹ Not authenticated with team server. Syncing local store records into context files...');
  }

  // 2. Format and export all context packs & master index
  const res = syncGlobalContextFiles(null, { writeCwd: true });
  console.log(`\n✔ Global Context Sync Complete:`);
  console.log(`  - Total records synced: ${res.count}`);
  console.log(`  - Referenced code files: ${res.filesTouchedCount}`);
  if (res.indexFile) {
    console.log(`  - Global Catalog: ${res.indexFile}`);
  }
  if (res.localProjectFile) {
    console.log(`  - Workspace Context: ${res.localProjectFile}`);
  }
  console.log(`\n💡 AI coding agents in this terminal can now read past decisions and code context from CONTEXT.md.`);
}
