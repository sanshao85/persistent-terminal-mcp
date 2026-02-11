# Persistent Terminal MCP Server

[简体中文](README.md)

Persistent Terminal MCP Server is a TypeScript implementation of a Model Context
Protocol (MCP) server that keeps terminal sessions alive for AI assistants and
automation flows. It is built on top of [`node-pty`](https://github.com/microsoft/node-pty)
so commands continue running even when the requesting client disconnects.

## Highlights
- **Persistent PTY sessions** – create, reuse, and terminate long-running shells
- **Smart output buffering** – incremental reads plus head, tail, or head-tail
  views with token estimates for large logs
- **Spinner animation compaction** – automatically detects and throttles progress
  animations (like npm install spinners) to reduce noise and preserve real logs
- **Full session management** – statistics, listing, kill signals, and automatic
  cleanup for inactive sessions
- **MCP-ready** – ships with tools, resources, and prompts compatible with
  Claude Desktop, Claude Code, and other MCP clients
- **REST API option** – optional Express server mirrors the MCP functionality
  for non-MCP integrations

## Installation

### One-off run (recommended for MCP clients)
Use `npx` to launch the server without a global install:
```bash
npx persistent-terminal-mcp
```

The REST flavor is available the same way:
```bash
npx persistent-terminal-mcp-rest
```

### Project dependency
Add the package to an existing project (CLI + TypeScript APIs):
```bash
npm install persistent-terminal-mcp
```

Now you can reference both the CLI binaries in `node_modules/.bin/` and the
TypeScript exports:
```ts
import { PersistentTerminalMcpServer } from 'persistent-terminal-mcp';
```

### Global install (optional)
```bash
npm install --global persistent-terminal-mcp
persistent-terminal-mcp
```

## Local Development
Clone the repo if you want to work on the source:
```bash
npm install          # install dependencies
npm run build        # compile TypeScript → dist/
npm start            # launch the MCP server over stdio
```

During development you can run the TypeScript sources directly:
```bash
npm run dev          # MCP server (tsx)
npm run dev:rest     # REST server (tsx)
```

### Debugging Mode
To enable debug logging (output to stderr, won't interfere with MCP communication):
```bash
MCP_DEBUG=true persistent-terminal-mcp
```

### Example Scripts
```bash
npm run example:basic        # basic lifecycle (create → write → read → kill)
npm run example:smart        # demonstrates head/tail/head-tail reading
npm run test:tools           # exercises every MCP tool end-to-end
npm run test:fixes           # regression tests for recent bug fixes
```

## MCP Client Configuration

### Claude Desktop

#### macOS / Linux

**Configuration file location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the following configuration to your MCP settings file:

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "command": "npx",
      "args": ["-y", "persistent-terminal-mcp"],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000",
        "COMPACT_ANIMATIONS": "true",
        "ANIMATION_THROTTLE_MS": "100"
      }
    }
  }
}
```

**Note**:
- The `-y` flag automatically confirms npx download prompts
- If globally installed (`npm install -g persistent-terminal-mcp`), change `command` to `"persistent-terminal-mcp"` and remove `-y` from `args`

#### Windows

**Configuration file location**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "persistent-terminal-mcp"],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000",
        "COMPACT_ANIMATIONS": "true",
        "ANIMATION_THROTTLE_MS": "100"
      }
    }
  }
}
```

**Note**:
- Windows requires `cmd /c` to invoke `npx`
- If globally installed, change `args` to `["/c", "persistent-terminal-mcp"]`

---

### Claude Code

#### macOS / Linux

Use the command line to quickly add the MCP server:

```bash
claude mcp add persistent-terminal \
  --env MAX_BUFFER_SIZE=10000 \
  --env SESSION_TIMEOUT=86400000 \
  --env COMPACT_ANIMATIONS=true \
  --env ANIMATION_THROTTLE_MS=100 \
  -- npx -y persistent-terminal-mcp
```

**Or** edit the configuration file `~/.claude.json`:

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "command": "npx",
      "args": ["-y", "persistent-terminal-mcp"],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000",
        "COMPACT_ANIMATIONS": "true",
        "ANIMATION_THROTTLE_MS": "100"
      }
    }
  }
}
```

#### Windows

> # ⚠️ **Important for Windows users**
>
> ## **Claude Code** has argument parsing issues with `claude mcp add` command on Windows
>
> ### **🚫 Command-line configuration is NOT recommended**
>
> Please refer to the dedicated setup guide:
> ### 📖 [Windows persistent-terminal MCP setup](docs/clients/claude-code-windows.md)
>
> This guide provides two recommended approaches:
> - ✅ **Project-level configuration** (recommended): Create a `.mcp.json` file in your project root
> - ✅ **Global configuration**: Use a Python script to modify `~/.claude.json`

---

### Cursor / Cline

Configuration is similar to Claude Desktop. Please refer to the MCP configuration documentation for each client.

### Codex

#### macOS / Linux

Add the following to .codex/config.toml:

```toml
# MCP Server Configuration (TOML Format)
# For configuring persistent-terminal MCP server

[mcp_servers.persistent-terminal]
command = "npx"
args = ["-y", "persistent-terminal-mcp@1.0.9"]
enabled = true
startup_timeout_sec = 30
tool_timeout_sec = 60

[mcp_servers.persistent-terminal.env]
MAX_BUFFER_SIZE = "10000"
SESSION_TIMEOUT = "86400000"
COMPACT_ANIMATIONS = "true"
ANIMATION_THROTTLE_MS = "100"
READ_TERMINAL_MAX_CHARS = "12000"
```

#### Windows

Add the following to .codex/config.toml:

```toml
# MCP Server Configuration (TOML Format)
# For configuring persistent-terminal MCP server

[mcp_servers.persistent-terminal]
command = "cmd"
args = ["/c", "npx", "-y", "persistent-terminal-mcp@1.0.9"]
enabled = true
startup_timeout_sec = 30
tool_timeout_sec = 60

[mcp_servers.persistent-terminal.env]
MAX_BUFFER_SIZE = "10000"
SESSION_TIMEOUT = "86400000"
COMPACT_ANIMATIONS = "true"
ANIMATION_THROTTLE_MS = "100"
READ_TERMINAL_MAX_CHARS = "12000"
```

**Notes**:
- `persistent-terminal-mcp` is a **STDIO** MCP server (not HTTP/SSE).
- Windows must invoke `npx` via `cmd /c`.
- If you see “initialize response / connection closed”, it is usually startup timeout or old package version. Confirm `@1.0.9` and increase `startup_timeout_sec` if needed.

---

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `MAX_BUFFER_SIZE` | Maximum number of lines to keep in buffer | 10000 |
| `SESSION_TIMEOUT` | Session timeout in milliseconds | 86400000 (24 hours) |
| `COMPACT_ANIMATIONS` | Enable spinner animation compaction | true |
| `ANIMATION_THROTTLE_MS` | Animation throttle time in milliseconds | 100 |
| `READ_TERMINAL_MAX_CHARS` | Max characters returned by one read_terminal call | 12000 |
| `MCP_DEBUG` | Enable debug logging | false |

## Programmatic Usage (TypeScript)

```ts
import {
  PersistentTerminalMcpServer,
  TerminalManager,
  RestApiServer
} from 'persistent-terminal-mcp';

const manager = new TerminalManager();
const rest = new RestApiServer(manager);

await rest.start(3001);

const mcpServer = new PersistentTerminalMcpServer();
const server = mcpServer.getServer();
await server.connect(/* transport of your choice */);
```

All core classes and type definitions are available directly from the root
module. Refer to [`src/index.ts`](src/index.ts) for the complete export list.

## MCP Tools
| Tool | Purpose |
|------|---------|
| `create_terminal` | Create a persistent terminal session (supports `env`, `shell`, and `cwd`) |
| `create_terminal_basic` | Convenience alias for clients that can only send simple strings |
| `write_terminal` | Send input to a terminal; newline is added automatically if needed (`sendEnter` supported) |
| `read_terminal` | Retrieve buffered output with smart truncation options |
| `wait_for_output` | Wait for terminal output to stabilize (useful after running commands) |
| `get_terminal_stats` | Inspect buffer size, line counts, estimated tokens, and activity |
| `list_terminals` | Enumerate active sessions and their metadata |
| `kill_terminal` | Terminate a session with an optional signal |

Additional MCP resources and prompts are exposed for listing sessions, viewing
output, and surfacing troubleshooting tips inside compatible clients.

### Recommended Tool Usage (Claude / Codex TUI)
- Use `write_terminal` with plain text and rely on default newline behavior.
- For explicit Enter-only actions (e.g. continue a prompt), call:
  - `input: ""`, `sendEnter: true`
- For Codex/vim-like full-screen apps, prefer `read_terminal` with:
  - `mode: "tail"`, `tailLines: 120`, `raw: true`, `cleanAnsi: true`, `maxChars: 8000`
- Avoid `mode: "full" + raw: true` unless you really need the whole raw stream.
- Note: starting from `1.0.8`, mode filters (`head`/`tail`/`head-tail`) are also applied when `raw=true`.
- If a user asks for the "last 10 lines", use `tail + raw + cleanAnsi`; if incomplete, retry with `head-tail + raw + cleanAnsi`.
- For Codex chat turns that appear stuck waiting for submit, send Enter explicitly with `input: ""`, `sendEnter: true`.

## REST API (Optional)
If you prefer HTTP, start the REST variant:
```bash
npx persistent-terminal-mcp-rest
```
The server listens on port `3001` (configurable) and mirrors the MCP toolset.
Endpoints include `/api/terminals`, `/api/terminals/:id/input`, `/api/terminals/:id/output`,
`/api/terminals/:id/stats`, `/api/terminals`, and `/api/terminals/:id`.

## Project Layout
```
docs/                → Consolidated documentation index
  ├── guides/        → Usage guides and tutorials
  ├── reference/     → Technical references and fixes
  │   └── fixes/     → All fix documentation
  ├── clients/       → Client-specific setup
  └── zh/            → Chinese documentation
scripts/             → Helper scripts for local debugging
src/                 → TypeScript source code
  ├── __tests__/     → Unit tests
  └── examples/      → Example scripts
tests/               → Test suites
  └── integration/   → Integration tests
dist/                → Compiled JavaScript output
```

### Documentation Map
All documentation is organized under [`docs/`](docs/README.md):

**Quick Access:**
- 📖 [Documentation Index](docs/README.md) – Complete documentation map
- 🚨 [Fixes Index](docs/reference/fixes/README.md) – All fixes and solutions
- 🧪 [Integration Tests](tests/integration/README.md) – Test suite

**By Category:**
- **Guides**: Usage, troubleshooting, MCP configuration
- **Reference**: Technical details, tools summary, bug fixes
- **Fixes**: Stdio fix, Cursor fix, terminal fixes
- **Clients**: Claude Desktop / Claude Code setup
- **中文**: Chinese-language documentation

### Important Notes
- **Stdio Purity**: This MCP server follows the MCP protocol strictly by ensuring stdout only contains JSON-RPC messages. All logging goes to stderr. See [docs/reference/fixes/STDIO_FIX.md](docs/reference/fixes/STDIO_FIX.md) for details.
- **Cursor Compatibility**: Fully compatible with Cursor and other strict MCP clients that require clean JSON-RPC communication. See [docs/reference/fixes/QUICK_FIX_GUIDE.md](docs/reference/fixes/QUICK_FIX_GUIDE.md) for quick setup.
- **Terminal Interaction**: Supports interactive applications (vim, npm create, etc.) with proper ANSI escape sequence handling. See [docs/reference/fixes/TERMINAL_FIXES.md](docs/reference/fixes/TERMINAL_FIXES.md) for details.
- **Output Stability**: Use `wait_for_output` tool to ensure complete output capture after running commands.

## Contributing
Contributions are welcome! Please open an issue or pull request if you
encounter bugs or have ideas for new capabilities. The
[`CONTRIBUTING.md`](CONTRIBUTING.md) file outlines the recommended workflow and
coding standards.

## License
This project is released under the [MIT License](LICENSE).
