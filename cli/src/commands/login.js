import readline from 'readline';
import { execSync } from 'child_process';
import { loadConfig, saveAuth, clearAuth, loadAuth } from '../config.js';

function detectGitHandle() {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const userName = execSync('git config --get user.name', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    if (userName && /^[a-zA-Z0-9_-]+$/.test(userName)) {
      return userName;
    }
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\//);
    if (match && match[1]) return match[1];
  } catch {
    // ignore
  }
  return '';
}

function promptInput(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function loginCommand(options = {}) {
  const config = loadConfig();
  let handle = options.handle || process.env.GITHUB_USER || '';
  let githubToken = options.token || process.env.GITHUB_TOKEN || '';

  if (!handle && !githubToken && process.stdin.isTTY) {
    const detected = detectGitHandle();
    const promptMsg = detected
      ? `GitHub username (press Enter for @${detected}): `
      : 'Enter your GitHub username (e.g. vaswanidaksh): ';
    const answer = await promptInput(promptMsg);
    handle = answer || detected;
  }

  const codeToSend = githubToken || handle || 'demo-github-token';
  const payload = { code: codeToSend };
  if (handle) {
    payload.handle = handle.startsWith('@') ? handle : `@${handle}`;
  }

  console.log(`Connecting to AgentRelay server at ${config.serverUrl}...`);

  try {
    const response = await fetch(`${config.serverUrl}/api/v1/auth/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      console.error(`Login failed (${response.status}):`, errJson.error?.message || response.statusText);
      process.exit(1);
    }

    const data = await response.json();
    saveAuth(data);

    const formattedHandle = data.user.handle.startsWith('@') ? data.user.handle : `@${data.user.handle}`;
    console.log(`✔ Successfully logged in as ${formattedHandle} (${data.user.id})`);
    console.log(`✔ Token saved to ~/.agentrelay/auth.json`);
  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
}

export function logoutCommand() {
  const auth = loadAuth();
  if (!auth) {
    console.log('Not currently logged in.');
    return;
  }
  const rawHandle = auth.user?.handle || 'user';
  const formattedHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
  clearAuth();
  console.log(`✔ Logged out ${formattedHandle}. Local token cleared.`);
}
