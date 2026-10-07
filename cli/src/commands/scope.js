import path from 'path';
import fs from 'fs';
import { loadConfig, saveConfig } from '../config.js';

export function scopeCommand(action, targetPath) {
  const config = loadConfig();

  if (action === 'list') {
    if (!config.scopes || config.scopes.length === 0) {
      console.log('No folders currently in capture scope.');
      console.log('Use "agentrelay scope add <folder>" to add an opt-in folder.');
      return;
    }
    console.log('Opt-in Scoped Folders:');
    config.scopes.forEach((s, idx) => console.log(`  ${idx + 1}. ${s}`));
    return;
  }

  if (!targetPath) {
    console.error('Error: Please specify a path. Example: agentrelay scope add ~/projects/my-app');
    process.exit(1);
  }

  const resolved = path.resolve(targetPath);

  if (action === 'add') {
    if (!fs.existsSync(resolved)) {
      console.error(`Error: Path does not exist: ${resolved}`);
      process.exit(1);
    }
    if (config.scopes.includes(resolved)) {
      console.log(`Folder is already in scope: ${resolved}`);
      return;
    }
    config.scopes.push(resolved);
    saveConfig(config);
    console.log(`✔ Added to capture scope: ${resolved}`);
  } else if (action === 'remove') {
    const initialLen = config.scopes.length;
    config.scopes = config.scopes.filter(s => s !== resolved && s !== targetPath);
    if (config.scopes.length === initialLen) {
      console.log(`Path not found in scope: ${resolved}`);
      return;
    }
    saveConfig(config);
    console.log(`✔ Removed from capture scope: ${resolved}`);
  } else {
    console.error(`Unknown scope action: ${action}. Use 'add', 'remove', or 'list'.`);
  }
}
