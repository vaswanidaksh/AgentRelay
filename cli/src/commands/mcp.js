import { startMcpServer } from '../mcp/server.js';

export function mcpCommand(options) {
  startMcpServer(options);
}
