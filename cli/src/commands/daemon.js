import { scanAndCaptureSessionFiles } from '../watcher/watcher.js';
import { processDistillJobs } from '../distiller/distiller.js';
import { loadConfig } from '../config.js';

export async function daemonCommand(options) {
  console.log('🤖 Starting AgentRelay background daemon watcher & distiller loop...');
  const config = loadConfig();
  console.log(`- Scoped Folders: ${config.scopes.length}`);
  console.log(`- Model Runtime: ${config.modelRuntimeUrl}`);
  console.log('Press Ctrl+C to exit.\n');

  const runLoop = async () => {
    try {
      const captureResult = scanAndCaptureSessionFiles();
      if (captureResult.capturedEvents > 0) {
        console.log(`[${new Date().toLocaleTimeString()}] Captured ${captureResult.capturedEvents} new scrubbed session event(s).`);
      }

      const distilledCount = await processDistillJobs();
      if (distilledCount > 0) {
        console.log(`[${new Date().toLocaleTimeString()}] Distilled ${distilledCount} context record(s).`);
      }
    } catch (err) {
      console.error('Daemon loop error:', err.message);
    }
  };

  // Run initial pass
  await runLoop();

  // Schedule loop every 5 seconds
  setInterval(runLoop, 5000);
}
