import { loadConfig, loadAuth } from '../config.js';

export async function teamCommand(action, arg, options) {
  const config = loadConfig();
  const auth = loadAuth();

  if (!auth || !auth.token) {
    console.error('Error: You must be logged in. Run "agentrelay login" first.');
    process.exit(1);
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${auth.token}`,
  };

  try {
    if (action === 'create') {
      const name = arg || 'Acme Engineering';
      const res = await fetch(`${config.serverUrl}/api/v1/teams`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create team');
      console.log(`✔ Created team "${data.team.name}" (ID: ${data.team.id})`);
    } else if (action === 'list') {
      const res = await fetch(`${config.serverUrl}/api/v1/teams`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to list teams');

      if (!data.teams || data.teams.length === 0) {
        console.log('You are not currently a member of any teams.');
        return;
      }
      console.log('Your Teams:');
      data.teams.forEach(t => console.log(`  - ${t.name} (ID: ${t.id}) [Role: ${t.role}]`));
    } else if (action === 'invite') {
      const teamId = arg;
      if (!teamId) {
        console.error('Error: Team ID required. Usage: agentrelay team invite <teamId>');
        process.exit(1);
      }
      const res = await fetch(`${config.serverUrl}/api/v1/teams/${teamId}/invites`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ expiresInHours: 48 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create invite');
      console.log(`✔ Created invite token for team ${teamId}:`);
      console.log(`  Token: ${data.invite.token}`);
      console.log(`  Expires: ${data.invite.expiresAt}`);
    } else if (action === 'join') {
      const inviteToken = arg;
      if (!inviteToken) {
        console.error('Error: Invite token required. Usage: agentrelay team join <inviteToken>');
        process.exit(1);
      }
      const res = await fetch(`${config.serverUrl}/api/v1/invites/${inviteToken}/accept`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to join team');
      console.log(`✔ Joined team "${data.team?.name || 'Team'}" successfully.`);
    } else {
      console.error(`Unknown team action: ${action}. Use 'create', 'invite', 'join', or 'list'.`);
    }
  } catch (err) {
    console.error('Team operation failed:', err.message);
    process.exit(1);
  }
}
