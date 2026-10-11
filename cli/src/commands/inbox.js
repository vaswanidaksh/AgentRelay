import { loadConfig, loadAuth } from '../config.js';

export async function inboxCommand(options = {}) {
  const config = loadConfig();
  const auth = loadAuth();

  if (!auth || !auth.token) {
    console.error('Error: Authentication required to view inbox. Run "agentrelay login" first.');
    process.exit(1);
  }

  // Handle marking an inbox item as read
  if (options.read) {
    const patchRes = await fetch(`${config.serverUrl}/api/v1/inbox/${options.read}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify({ state: 'read' })
    });
    const patchData = await patchRes.json();
    if (!patchRes.ok) {
      console.error(`Failed to update inbox item (${patchRes.status}):`, patchData.error?.message);
      process.exit(1);
    }
    console.log(`✔ Marked inbox item ${options.read} as read.`);
    return;
  }

  // Fetch inbox items
  let url = `${config.serverUrl}/api/v1/inbox`;
  if (options.state) {
    url += `?state=${encodeURIComponent(options.state)}`;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${auth.token}` }
  });

  const data = await response.json();
  if (!response.ok) {
    console.error(`Failed to fetch inbox (${response.status}):`, data.error?.message);
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data.inbox || data.inbox.length === 0) {
    console.log('Your inbox is empty.');
    return;
  }

  console.log(`\n📬 Incoming Context Handoffs (${data.inbox.length}):\n`);
  for (const item of data.inbox) {
    const badge = item.state === 'pending' ? '● [UNREAD]' : '○ [READ]';
    console.log(`  ${badge} ${item.fromHandle} in "${item.teamName}"`);
    console.log(`    Item ID:   ${item.id}`);
    console.log(`    Record ID: ${item.recordId}`);
    if (item.record) {
      console.log(`    Title:     ${item.record.title}`);
      if (item.record.summary) {
        console.log(`    Summary:   ${item.record.summary.slice(0, 100)}...`);
      }
    }
    console.log(`    Received:  ${item.createdAt}`);
    console.log('');
  }
}
