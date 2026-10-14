import { loadConfig, loadAuth } from '../config.js';

export async function handoffCommand(recordId, handle, options = {}) {
  const config = loadConfig();
  const auth = loadAuth();

  if (!auth || !auth.token) {
    console.error('Error: Authentication required to hand off records. Run "agentrelay login" first.');
    process.exit(1);
  }

  if (!recordId || !handle) {
    console.error('Usage: agentrelay handoff <recordId> <@handle>');
    process.exit(1);
  }

  // Resolve target team
  let teamId = options.team;
  if (!teamId) {
    const teamsRes = await fetch(`${config.serverUrl}/api/v1/teams`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    const teamsData = await teamsRes.json();
    if (!teamsRes.ok || !teamsData.teams || teamsData.teams.length === 0) {
      console.error('Error: You are not in any team. Create or join a team first.');
      process.exit(1);
    }
    teamId = teamsData.teams[0].id;
  }

  const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
  console.log(`Handing off record ${recordId} to ${normalizedHandle} in team ${teamId}...`);

  const response = await fetch(`${config.serverUrl}/api/v1/teams/${teamId}/handoffs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`
    },
    body: JSON.stringify({
      to: normalizedHandle,
      recordId
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    console.error(`Handoff failed (${response.status}):`, resData.error?.message || response.statusText);
    process.exit(1);
  }

  console.log(`✔ Successfully handed off record ${recordId} to ${normalizedHandle}!`);
}
