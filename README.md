[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<br/>

### mockoon-mcp-server

An MCP server that lets AI assistants control [Mockoon](https://mockoon.com/) mock APIs through natural language.

[Report Bug](https://github.com/Albenzoo/mockoon-mcp-server/issues) · [Request Feature](https://github.com/Albenzoo/mockoon-mcp-server/issues)

---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Features](#features)
- [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Configuration](#configuration)
  - [VS Code / GitHub Copilot](#vs-code--github-copilot)
  - [Claude Desktop](#claude-desktop)
  - [Cursor](#cursor)
  - [Custom storage directory](#custom-storage-directory)
- [Available Tools](#available-tools)
- [How It Works](#how-it-works)
  - [Enabling Environment File Watcher in Mockoon Desktop](#enabling-environment-file-watcher-in-mockoon-desktop)
- [License](#license)

---

## Features

- Create and delete environments and routes
- Update response bodies and status codes
- Manage databuckets (data templates)
- Start and stop mock servers via `mockoon-cli`

[(back to top 🔝)](#mockoon-mcp-server)

---

## Built With

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [MCP SDK](https://modelcontextprotocol.io/)
- [Mockoon](https://mockoon.com/)
- [Zod](https://zod.dev/)

[(back to top 🔝)](#mockoon-mcp-server)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Mockoon Desktop](https://mockoon.com/download/) installed
- (Optional) [`@mockoon/cli`](https://mockoon.com/cli/) for `start_server` / `stop_server`

```bash
npm install -g @mockoon/cli
```

### Installation

1. Clone the repo
```bash
git clone https://github.com/Albenzoo/mockoon-mcp-server.git
cd mockoon-mcp-server
```

2. Install dependencies and build
```bash
npm install
npm run build
```

[(back to top 🔝)](#mockoon-mcp-server)

---

## Configuration

Build the project first (`npm run build`), then configure your AI client using one of the examples below.

### VS Code / GitHub Copilot

Create `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "mockoon": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"]
    }
  }
}
```

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "mockoon": {
      "command": "node",
      "args": ["/absolute/path/to/mockoon-mcp-server/dist/index.js"]
    }
  }
}
```

### Cursor

Edit `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "mockoon": {
      "command": "node",
      "args": ["/absolute/path/to/mockoon-mcp-server/dist/index.js"]
    }
  }
}
```

### Custom storage directory

By default environments are read from:
- **Windows**: `%APPDATA%\mockoon\storage`
- **macOS/Linux**: `~/.config/mockoon/storage`

Override with the `MOCKOON_STORAGE_DIR` environment variable:

```json
"env": { "MOCKOON_STORAGE_DIR": "/custom/path" }
```

[(back to top 🔝)](#mockoon-mcp-server)

---

## Available Tools

| Tool                   | Description                        |
| ---------------------- | ---------------------------------- |
| `list_environments`    | List all environments              |
| `create_environment`   | Create a new environment           |
| `delete_environment`   | Delete an environment              |
| `list_routes`          | List routes in an environment      |
| `create_route`         | Create a new HTTP route            |
| `update_route_body`    | Update response body / status code |
| `delete_route`         | Delete a route                     |
| `list_templates`       | List databuckets                   |
| `create_template`      | Create a databucket                |
| `update_template`      | Update a databucket                |
| `delete_template`      | Delete a databucket                |
| `start_server`         | Start a mock server                |
| `stop_server`          | Stop a mock server                 |
| `list_running_servers` | List running mock servers          |

[(back to top 🔝)](#mockoon-mcp-server)

---

## How It Works

The server communicates via **stdio** (JSON-RPC 2.0). It reads and writes Mockoon's environment JSON files directly — no REST API involved. Changes are reflected in Mockoon Desktop instantly if **Environment file watcher** is set to **Auto**.

### Enabling Environment File Watcher in Mockoon Desktop

Go to **Application → Settings** (or click the gear icon ⚙️) and enable the **"Environment file watcher"** toggle.

Once active, Mockoon watches the environment JSON files on disk and automatically reloads them whenever an external change is detected (e.g. a modification made by this MCP server). Two options are available:

| Option       | Behavior                                                         |
| ------------ | ---------------------------------------------------------------- |
| **Disabled** | Mockoon ignores external changes — UI won't update automatically |
| **Prompt**   | Mockoon asks the user whether to reload the environment          |
| **Auto**     | Mockoon detects changes and reloads the environment silently     |

[(back to top 🔝)](#mockoon-mcp-server)

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

[(back to top 🔝)](#mockoon-mcp-server)
