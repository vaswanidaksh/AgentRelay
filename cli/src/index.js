import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { scopeCommand } from './commands/scope.js';
import { statusCommand, pauseCommand, resumeCommand } from './commands/status.js';
import { searchCommand } from './commands/search.js';
import { showCommand } from './commands/show.js';
import { reviewCommand } from './commands/review.js';
import { shareCommand, unshareCommand } from './commands/share.js';
import { loginCommand, logoutCommand } from './commands/login.js';
import { teamCommand } from './commands/team.js';
import { promoteCommand } from './commands/promote.js';
import { pullCommand } from './commands/pull.js';
import { retryCommand } from './commands/retry.js';
import { purgeCommand } from './commands/purge.js';
import { exportCommand } from './commands/export.js';
import { daemonCommand } from './commands/daemon.js';

export function createProgram() {
  const program = new Command();

  program
    .name('agentrelay')
    .description('AgentRelay CLI - Local-first AI agent session capture, distillation, and context sharing')
    .version('1.0.0');

  program
    .command('init')
    .description('Initialize local store and verify model runtime')
    .action(initCommand);

  program
    .command('scope <action> [path]')
    .description('Manage opt-in capture folders (add | remove | list)')
    .action((action, pathArg) => scopeCommand(action, pathArg));

  program
    .command('status')
    .description('Show background daemon status, queue depth, and capture stats')
    .action(statusCommand);

  program
    .command('pause')
    .description('Pause session watcher capture')
    .action(pauseCommand);

  program
    .command('resume')
    .description('Resume session watcher capture')
    .action(resumeCommand);

  program
    .command('review')
    .description('Review candidate distilled records (accept / edit / reject)')
    .option('--accept', 'Automatically accept candidate records')
    .option('--reject', 'Automatically reject candidate records')
    .action((options) => reviewCommand(options));

  program
    .command('search [query]')
    .description('Search local context records offline')
    .option('--json', 'Output results in JSON schema')
    .action((query, options) => searchCommand(query, options));

  program
    .command('show <recordId>')
    .description('Display a specific context record')
    .option('--json', 'Output full record in JSON format')
    .action((recordId, options) => showCommand(recordId, options));

  program
    .command('share <recordId>')
    .description('Mark a record as shareable with your team')
    .action(shareCommand);

  program
    .command('unshare <recordId>')
    .description('Remove shareable status from a record')
    .action(unshareCommand);

  program
    .command('login')
    .description('Authenticate with the AgentRelay team server')
    .option('--token <token>', 'GitHub / API access token')
    .action((options) => loginCommand(options));

  program
    .command('logout')
    .description('Clear local authentication token')
    .action(logoutCommand);

  program
    .command('team <action> [arg]')
    .description('Manage team memberships and invites (create | list | invite | join)')
    .action((action, arg, options) => teamCommand(action, arg, options));

  program
    .command('promote <recordId>')
    .description('Upload a shareable record to the team server')
    .option('--team <teamId>', 'Target team ID')
    .action((recordId, options) => promoteCommand(recordId, options));

  program
    .command('pull')
    .description('Fetch team records into local store')
    .action((options) => pullCommand(options));

  program
    .command('retry [sessionId]')
    .description('Re-queue failed distillation jobs')
    .action(retryCommand);

  program
    .command('purge')
    .description('Purge local data')
    .option('--events', 'Purge local event store only')
    .option('--all', 'Purge all local sessions, events, and records')
    .action((options) => purgeCommand(options));

  program
    .command('export <recordId>')
    .description('Export record as a markdown context pack')
    .option('--pack', 'Include evidence slice in export')
    .action((recordId, options) => exportCommand(recordId, options));

  program
    .command('daemon')
    .description('Start the background watcher and distiller loop')
    .action(daemonCommand);

  return program;
}

export function run() {
  const program = createProgram();
  program.parse(process.argv);
}
