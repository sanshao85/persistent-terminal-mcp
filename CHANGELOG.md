# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

#### 🔴 Critical: Terminal command execution and interaction issues
- **Problem 1: Commands not executing properly**
  - Commands sent to terminal were not being executed
  - No command echo visible in output
  - Terminal line count increased but content was invisible
- **Problem 2: Interactive input handling unstable**
  - Control characters (arrow keys, enter) not working reliably
  - Interface not updating in interactive applications
  - Required multiple key presses for single action
- **Problem 3: Output reading not real-time**
  - Reading stale output instead of latest
  - Required multiple reads to get current state
  - No way to detect if command is still running
- **Solution**:
  - Fixed PTY configuration: Changed from `xterm-color` to `xterm-256color`
  - Added proper environment variables: `TERM`, `LANG`, `PAGER`
  - Improved write logic with drain event handling
  - Added `setImmediate` for immediate data processing
  - Added `waitForOutputStable()` method to detect output completion
  - Added `wait_for_output` MCP tool for waiting until output stabilizes
- **Impact**: Full support for interactive applications (vim, npm create, etc.)
- **Testing**: All 6 tests pass in `test-terminal-fixes.mjs`
- **Documentation**: See [TERMINAL_FIXES.md](TERMINAL_FIXES.md) for detailed analysis

#### 🔴 Critical: Stdio channel pollution causing Cursor compatibility issues
- **Problem**: Console logging was polluting stdout, causing JSON parsing errors in Cursor and other strict MCP clients
  - Error: `Unexpected token 'T', "Terminal c"... is not valid JSON`
  - Cursor would freeze after a few commands
  - MCP protocol requires stdout to contain only JSON-RPC messages
- **Solution**: All logging now uses `process.stderr.write()` instead of `console.log/error`
  - Debug logs controlled by `MCP_DEBUG` environment variable
  - All logs output to stderr, keeping stdout pure for JSON-RPC
- **Impact**: Full compatibility with Cursor and other strict MCP clients
- **Backward Compatible**: Yes - no API changes, only logging behavior
- **Files Modified**:
  - `src/index.ts` - Fixed log function and error handlers
  - `src/mcp-server.ts` - Fixed event handlers and shutdown logging
  - `src/terminal-manager.ts` - Fixed cleanup and shutdown logging
- **Testing**: Added comprehensive stdio purity tests
  - `test-mcp-stdio.mjs` - Validates stdout contains only JSON-RPC
  - `test-cursor-scenario.mjs` - Simulates real Cursor usage scenarios
- **Documentation**: See [STDIO_FIX.md](STDIO_FIX.md) for detailed analysis

### Added
- **Spinner Animation Compaction**: Automatically detects and throttles progress animations
  - Identifies common spinner characters (⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏, ◐◓◑◒, etc.)
  - Reduces noise from `npm install`, `yarn`, `pnpm` and similar commands
  - Configurable via `COMPACT_ANIMATIONS` and `ANIMATION_THROTTLE_MS` environment variables
  - Enabled by default with 100ms throttle
  - Can be toggled per-read via `stripSpinner` parameter
  - See [Spinner Compaction Guide](docs/guides/spinner-compaction.md) for details
- **`wait_for_output` MCP tool**: Wait for terminal output to stabilize before reading
  - Parameters: `terminalId`, `timeout` (default: 5000ms), `stableTime` (default: 500ms)
  - Useful for ensuring complete output capture after running commands
  - Helps with interactive applications and long-running commands
- **`waitForOutputStable()` method**: Programmatic API for waiting for output stability
- **`isTerminalBusy()` method**: Check if terminal is currently processing output
- `create_terminal_basic` MCP tool to support clients that can only send simple
  string arguments
- Open-source collateral: MIT `LICENSE` and `CONTRIBUTING.md`
- Comprehensive test suite for spinner detection (12 new tests)
- Comprehensive test suite for terminal fixes (6 new tests)
- Example script: `npm run example:spinner`
- Test script: `test-terminal-fixes.mjs`
- `MCP_DEBUG` environment variable for controlling debug output

### Changed
- **PTY Configuration**: Changed terminal type from `xterm-color` to `xterm-256color`
- **Environment Variables**: Now sets `TERM`, `LANG`, and `PAGER` for better compatibility
- **Write Logic**: Improved with drain event handling and immediate processing
- **Read Logic**: Added `setImmediate` to ensure latest data is captured
- **Output Capture**: Using `setImmediate` in `onData` handler for immediate processing
- `OutputBuffer` constructor now accepts `compactAnimations` and `animationThrottleMs` options
- `TerminalManagerConfig` extended with animation compaction settings
- `read_terminal` MCP tool now supports optional `stripSpinner` parameter
- Consolidated documentation under [`docs/`](docs/README.md) with clearer
  filenames and an index
- Refreshed `README.md` with quick-start instructions and the expanded tool set
- All logging now uses stderr to comply with MCP stdio protocol requirements

## [1.0.1] - 2025-10-03

### Fixed

#### 🔴 Critical: Commands not executing automatically
- **Problem**: Commands sent to terminal were displayed but not executed
- **Solution**: `write_terminal` now automatically adds newline character if not present
- **Impact**: Users can now send `"pwd"` instead of `"pwd\n"`
- **Backward Compatible**: Yes - existing code with `\n` still works

#### 🟡 Medium: Terminated terminals still in list
- **Problem**: After `kill_terminal`, terminals remained in `list_terminals` with status "terminated"
- **Solution**: Terminals are now completely removed from all internal maps after termination
- **Impact**: Better memory management and cleaner terminal list
- **Backward Compatible**: Yes - no API changes

### Changed

- Updated `write_terminal` tool description to mention automatic newline addition
- Updated parameter descriptions to clarify newline behavior

### Added

- New test script: `npm run test:fixes` to verify bug fixes
- Comprehensive test coverage for command execution and terminal cleanup

### Documentation

- Added `docs/reference/bug-fixes.md` - Detailed technical report of fixes
- Added `docs/reference/test-response.md` - Response to AI testing teams
- Updated `docs/guides/usage.md` - Simplified command sending examples

---

## [1.0.0] - 2025-10-03

### Added

#### Core Features
- **Persistent Terminal Sessions**: Create and manage long-running terminal sessions
- **Output Buffering**: Circular buffer with configurable size (default 10,000 lines)
- **Smart Output Reading**: Multiple modes (full, head, tail, head-tail)
- **Incremental Reading**: Read only new output using `since` parameter
- **Session Management**: Automatic cleanup of timed-out sessions

#### MCP Tools (6 total)
1. `create_terminal` - Create new persistent terminal sessions
2. `write_terminal` - Send input to terminal sessions
3. `read_terminal` - Read output with smart truncation
4. `get_terminal_stats` - Get detailed statistics (lines, bytes, tokens)
5. `list_terminals` - List all active terminal sessions
6. `kill_terminal` - Terminate terminal sessions

#### MCP Resources (3 total)
1. `terminal://list` - List of all terminals
2. `terminal://{id}/output` - Terminal output
3. `terminal://{id}/info` - Terminal information

#### MCP Prompts (2 total)
1. `debug-terminal` - Debug terminal issues
2. `monitor-terminal` - Monitor terminal output

#### REST API
- Alternative HTTP interface for non-MCP clients
- All MCP tools available as REST endpoints
- CORS enabled for web clients

#### Examples
- `basic-usage.ts` - Basic terminal operations
- `rest-api-demo.ts` - REST API usage
- `interactive-demo.ts` - Interactive terminal demo
- `smart-reading-demo.ts` - Smart reading features
- `test-all-tools.ts` - Comprehensive tool testing

#### Documentation
- `README.md` - Project overview and quick start
- `docs/meta/project-status.md` - Project status and roadmap
- `docs/guides/usage.md` - Guide for AI assistants
- `docs/guides/troubleshooting.md` - Troubleshooting guide
- `docs/clients/claude-code-setup.md` - Claude Code configuration
- `docs/guides/mcp-config.md` - MCP configuration guide
- `docs/reference/tools-summary.md` - Quick reference for all tools

#### Configuration
- Environment variables support (`MAX_BUFFER_SIZE`, `SESSION_TIMEOUT`)
- Example configuration files for Claude Desktop and Claude Code
- TOML configuration format support

### Technical Details

#### Architecture
- TypeScript with strict mode
- ES Modules (ESM)
- Event-driven design using EventEmitter
- Zod schema validation
- node-pty for PTY management

#### Testing
- Jest test framework
- Unit tests for core functionality
- Integration tests for MCP tools
- Example scripts for manual testing

#### Build System
- TypeScript compiler (tsc)
- tsx for development
- npm scripts for common tasks

---

## Version History

- **1.0.1** (2025-10-03) - Bug fixes for command execution and terminal cleanup
- **1.0.0** (2025-10-03) - Initial release with full MCP support

---

## Upgrade Guide

### From 1.0.0 to 1.0.1

No breaking changes. Simply update and rebuild:

```bash
git pull
npm run build
```

If using Claude Code or Claude Desktop, restart the application after rebuilding.

### Benefits of Upgrading

1. **Better UX**: No need to manually add `\n` to commands
2. **Memory Efficiency**: Terminated terminals are properly cleaned up
3. **Cleaner API**: Terminal list only shows active terminals

---

## Future Plans

See `docs/meta/project-status.md` for detailed roadmap.

### Planned Features

- [ ] Terminal session persistence across restarts
- [ ] Terminal multiplexing (tmux/screen integration)
- [ ] File upload/download support
- [ ] Terminal recording and playback
- [ ] WebSocket support for real-time updates
- [ ] Terminal sharing between users
- [ ] Custom shell profiles
- [ ] Environment variable management
- [ ] Command history and search

---

## Contributing

Contributions are welcome! Please see `CONTRIBUTING.md` for guidelines.

## License

MIT License - see `LICENSE` file for details.
