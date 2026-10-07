import { loadConfig, saveAuth, clearAuth, loadAuth } from '../config.js';

export async function loginCommand(options) {
  const config = loadConfig();
  const githubToken = options.token || process.env.GITHUB_TOKEN || 'demo-github-token';

  console.log(`Connecting to AgentRelay server at ${config.serverUrl}...`);

  try {
    const response = await fetch(`${config.serverUrl}/api/v1/auth/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: githubToken }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      console.error(`Login failed (${response.status}):`, errJson.error?.message || response.statusText);
      process.exit(1);
    }

    const data = await response.json();
    saveAuth(data);

    console.log(`✔ Successfully logged in as @${data.user.handle} (${data.user.id})`);
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
  clearAuth();
  console.log(`✔ Logged out @${auth.user?.handle || 'user'}. Local token cleared.`);
}
