import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { registerEnvironmentTools } from "./tools/environments.js";
import { registerRouteTools } from "./tools/routes.js";
import { registerTemplateTools } from "./tools/templates.js";
import { listRunningServers, startServer, stopServer } from "./mockoon/processManager.js";
import { findEnvironmentFile, getDefaultMockoonDir } from "./mockoon/fileManager.js";

const STORAGE_DIR = process.env.MOCKOON_STORAGE_DIR ?? getDefaultMockoonDir();

const server = new McpServer({
  name: "mockoon-mcp-server",
  version: "0.1.0",
});

// Register tool groups
registerEnvironmentTools(server);
registerRouteTools(server);
registerTemplateTools(server);

// Start a mock server
server.registerTool(
  "start_server",
  {
    description: "Start a Mockoon environment as a local mock server",
    inputSchema: {
      environmentId: z.string().uuid().describe("UUID of the environment to start"),
      port: z.number().int().optional().describe("Override port (optional, defaults to environment port)"),
    },
  },
  async ({ environmentId, port }) => {
    const filePath = findEnvironmentFile(STORAGE_DIR, environmentId);
    if (!filePath) {
      return { content: [{ type: "text", text: `Environment '${environmentId}' not found.` }], isError: true };
    }
    const result = startServer(environmentId, filePath, port);
    return { content: [{ type: "text", text: result }] };
  }
);

// Stop a running mock server
server.registerTool(
  "stop_server",
  {
    description: "Stop a running Mockoon mock server",
    inputSchema: { environmentId: z.string().uuid().describe("UUID of the environment to stop") },
  },
  async ({ environmentId }) => {
    const result = stopServer(environmentId);
    return { content: [{ type: "text", text: result }] };
  }
);

// List running mock servers
server.registerTool(
  "list_running_servers",
  { description: "List all Mockoon environments currently running as mock servers" },
  async () => {
    const running = listRunningServers();
    if (running.length === 0) {
      return { content: [{ type: "text", text: "No mock servers currently running." }] };
    }
    return { content: [{ type: "text", text: running.map((id) => `- ${id}`).join("\n") }] };
  }
);

// Connect via stdio transport (compatible with Claude Desktop, Cursor, VS Code, Copilot CLI, etc.)
const transport = new StdioServerTransport();
await server.connect(transport);
