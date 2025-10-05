# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `create_terminal_basic` MCP tool to support clients that can only send simple
  string arguments
- Open-source collateral: MIT `LICENSE` and `CONTRIBUTING.md`

### Changed
- Consolidated documentation under [`docs/`](docs/README.md) with clearer
  filenames and an index
- Refreshed `README.md` with quick-start instructions and the expanded tool set

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
