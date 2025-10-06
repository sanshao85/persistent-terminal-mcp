import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TerminalManager } from './terminal-manager.js';
/**
 * MCP 服务器实现
 * 将终端管理功能暴露为 MCP 工具和资源
 */
export class PersistentTerminalMcpServer {
    server;
    terminalManager;
    constructor() {
        // 创建 MCP 服务器
        this.server = new McpServer({
            name: 'persistent-terminal-server',
            version: '1.0.0',
            description: 'MCP server for managing persistent terminal sessions',
            icons: [
                {
                    src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIgNEMyIDIuODk1NDMgMi44OTU0MyAyIDQgMkgyMEMyMS4xMDQ2IDIgMjIgMi44OTU0MyAyMiA0VjIwQzIyIDIxLjEwNDYgMjEuMTA0NiAyMiAyMCAyMkg0QzIuODk1NDMgMjIgMiAyMS4xMDQ2IDIgMjBWNFoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik02IDhMMTAgMTJMNiAxNiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTIgMTZIMTgiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+',
                    sizes: ['24x24'],
                    mimeType: 'image/svg+xml'
                }
            ]
        }, {
            capabilities: {
                tools: {},
                resources: {},
                prompts: {},
                logging: {}
            }
        });
        // 创建终端管理器
        this.terminalManager = new TerminalManager({
            maxBufferSize: parseInt(process.env.MAX_BUFFER_SIZE || '10000'),
            sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000'), // 24 hours
            compactAnimations: process.env.COMPACT_ANIMATIONS !== 'false', // Default true
            animationThrottleMs: parseInt(process.env.ANIMATION_THROTTLE_MS || '100')
        });
        this.setupTools();
        this.setupResources();
        this.setupPrompts();
        this.setupEventHandlers();
    }
    /**
     * 创建终端并返回统一格式的结果
     */
    async createTerminalResponse(options, source = 'default') {
        const terminalId = await this.terminalManager.createTerminal({
            shell: options.shell,
            cwd: options.cwd,
            env: options.env,
            cols: options.cols,
            rows: options.rows
        });
        const session = this.terminalManager.getTerminalInfo(terminalId);
        if (!session) {
            throw new Error('Failed to retrieve session info');
        }
        const result = {
            terminalId,
            status: session.status,
            pid: session.pid,
            shell: session.shell,
            cwd: session.cwd
        };
        const header = source === 'basic'
            ? 'Terminal created successfully via basic workflow!'
            : 'Terminal created successfully!';
        const outputLines = [
            `${header}`,
            '',
            `Terminal ID: ${result.terminalId}`,
            `PID: ${result.pid}`,
            `Shell: ${result.shell}`,
            `Working Directory: ${result.cwd}`,
            `Status: ${result.status}`
        ];
        return {
            content: [
                {
                    type: 'text',
                    text: outputLines.join('\n')
                }
            ],
            structuredContent: {
                terminalId: result.terminalId,
                pid: result.pid,
                shell: result.shell,
                cwd: result.cwd,
                status: result.status
            }
        };
    }
    /**
     * 设置 MCP 工具
     */
    setupTools() {
        // 创建终端工具
        this.server.tool('create_terminal', 'Create a new persistent terminal session', {
            shell: z.string().optional().describe('Shell to use (default: system default)'),
            cwd: z.string().optional().describe('Working directory (default: current directory)'),
            env: z.record(z.string()).optional().describe('Environment variables')
        }, {
            title: 'Create Terminal',
            readOnlyHint: false
        }, async ({ shell, cwd, env }) => {
            try {
                return await this.createTerminalResponse({
                    shell: shell || undefined,
                    cwd: cwd || undefined,
                    env: env || undefined
                }, 'default');
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error creating terminal: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ],
                    isError: true
                };
            }
        });
        // 基础版创建终端工具，适配无法传递复杂对象参数的客户端
        this.server.tool('create_terminal_basic', 'Create a new persistent terminal session (shell and cwd only). Useful for clients that cannot send env objects.', {
            shell: z.string().optional().describe('Shell to use (default: system default)'),
            cwd: z.string().optional().describe('Working directory (default: current directory)')
        }, {
            title: 'Create Terminal (Basic)',
            readOnlyHint: false
        }, async ({ shell, cwd }) => {
            try {
                return await this.createTerminalResponse({
                    shell: shell || undefined,
                    cwd: cwd || undefined
                }, 'basic');
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error creating terminal: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ],
                    isError: true
                };
            }
        });
        // 写入终端工具
        this.server.tool('write_terminal', 'Write input to a terminal session. Commands add a newline by default, but you can disable that for raw control sequences.', {
            terminalId: z.string().describe('Terminal session ID'),
            input: z.string().describe('Input to send to the terminal. Newline will be automatically added if not present to execute the command.'),
            appendNewline: z.boolean().optional().describe('Whether to automatically append a newline (default: true). Set to false for raw control sequences like Ctrl+U or backspace.')
        }, {
            title: 'Write to Terminal',
            readOnlyHint: false
        }, async ({ terminalId, input, appendNewline }) => {
            try {
                const writeOptions = {
                    terminalId,
                    input
                };
                if (appendNewline !== undefined) {
                    writeOptions.appendNewline = appendNewline;
                }
                await this.terminalManager.writeToTerminal(writeOptions);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Input sent to terminal ${terminalId} successfully.`
                        }
                    ]
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error writing to terminal: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ],
                    isError: true
                };
            }
        });
        // 读取终端工具（增强版）
        this.server.tool('read_terminal', 'Read output from a terminal session with smart truncation options', {
            terminalId: z.string().describe('Terminal session ID'),
            since: z.number().optional().describe('Line number to start reading from (default: 0)'),
            maxLines: z.number().optional().describe('Maximum number of lines to read (default: 1000)'),
            mode: z.enum(['full', 'head', 'tail', 'head-tail']).optional().describe('Reading mode: full (default), head (first N lines), tail (last N lines), or head-tail (first + last N lines)'),
            headLines: z.number().optional().describe('Number of lines to show from the beginning when using head or head-tail mode (default: 50)'),
            tailLines: z.number().optional().describe('Number of lines to show from the end when using tail or head-tail mode (default: 50)'),
            stripSpinner: z.boolean().optional().describe('Whether to strip spinner/animation frames (uses global setting if not specified)')
        }, {
            title: 'Read Terminal Output',
            readOnlyHint: true
        }, async ({ terminalId, since, maxLines, mode, headLines, tailLines, stripSpinner }) => {
            try {
                const result = await this.terminalManager.readFromTerminal({
                    terminalId,
                    since: since || undefined,
                    maxLines: maxLines || undefined,
                    mode: mode || undefined,
                    headLines: headLines || undefined,
                    tailLines: tailLines || undefined,
                    stripSpinner: stripSpinner
                });
                let outputText = `Terminal Output (${terminalId}):\n\n${result.output}\n\n--- End of Output ---\n`;
                outputText += `Total Lines: ${result.totalLines}\n`;
                outputText += `Has More: ${result.hasMore}\n`;
                outputText += `Next Read Cursor: ${result.cursor ?? result.since}`;
                if (result.truncated) {
                    outputText += `\nTruncated: Yes`;
                }
                if (result.stats) {
                    outputText += `\n\nStatistics:`;
                    outputText += `\n- Total Bytes: ${result.stats.totalBytes}`;
                    outputText += `\n- Estimated Tokens: ${result.stats.estimatedTokens}`;
                    outputText += `\n- Lines Shown: ${result.stats.linesShown}`;
                    if (result.stats.linesOmitted > 0) {
                        outputText += `\n- Lines Omitted: ${result.stats.linesOmitted}`;
                    }
                }
                if (result.status) {
                    outputText += `\n\nStatus:`;
                    outputText += `\n- Running: ${result.status.isRunning}`;
                    outputText += `\n- Prompt Visible: ${result.status.hasPrompt}`;
                    outputText += `\n- Last Activity: ${result.status.lastActivity}`;
                    if (result.status.promptLine) {
                        outputText += `\n- Prompt: ${result.status.promptLine}`;
                    }
                    if (result.status.pendingCommand) {
                        outputText += `\n- Pending Command: ${result.status.pendingCommand.command} (started ${result.status.pendingCommand.startedAt})`;
                    }
                    if (result.status.lastCommand) {
                        outputText += `\n- Last Command: ${result.status.lastCommand.command}`;
                        if (result.status.lastCommand.completedAt) {
                            outputText += ` (completed ${result.status.lastCommand.completedAt})`;
                        }
                    }
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: outputText
                        }
                    ]
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error reading from terminal: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ],
                    isError: true
                };
            }
        });
        // 列出终端工具
        this.server.tool('list_terminals', 'List all active terminal sessions', {}, {
            title: 'List Terminals',
            readOnlyHint: true
        }, async () => {
            try {
                const result = await this.terminalManager.listTerminals();
                if (result.terminals.length === 0) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'No active terminal sessions found.'
                            }
                        ]
                    };
                }
                const terminalList = result.terminals.map(terminal => `ID: ${terminal.id}\n` +
                    `PID: ${terminal.pid}\n` +
                    `Shell: ${terminal.shell}\n` +
                    `Working Directory: ${terminal.cwd}\n` +
                    `Created: ${terminal.created}\n` +
                    `Last Activity: ${terminal.lastActivity}\n` +
                    `Status: ${terminal.status}\n`).join('\n---\n');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Active Terminal Sessions (${result.terminals.length}):\n\n${terminalList}`
                        }
                    ]
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error listing terminals: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ],
                    isError: true
                };
            }
        });
        // 终止终端工具
        this.server.tool('kill_terminal', 'Terminate a terminal session', {
            terminalId: z.string().describe('Terminal session ID'),
            signal: z.string().optional().describe('Signal to send (default: SIGTERM)')
        }, {
            title: 'Kill Terminal',
            readOnlyHint: false
        }, async ({ terminalId, signal }) => {
            try {
                await this.terminalManager.killTerminal(terminalId, signal);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Terminal ${terminalId} terminated successfully.`
                        }
                    ]
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error terminating terminal: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ],
                    isError: true
                };
            }
        });
        // 获取终端统计信息工具
        this.server.tool('get_terminal_stats', 'Get detailed statistics about a terminal session including size, tokens, etc.', {
            terminalId: z.string().describe('Terminal session ID')
        }, {
            title: 'Get Terminal Statistics',
            readOnlyHint: true
        }, async ({ terminalId }) => {
            try {
                const result = await this.terminalManager.getTerminalStats(terminalId);
                let statsText = `Terminal Statistics (${terminalId}):\n\n`;
                statsText += `Total Lines: ${result.totalLines}\n`;
                statsText += `Total Bytes: ${result.totalBytes}\n`;
                statsText += `Estimated Tokens: ${result.estimatedTokens}\n`;
                statsText += `Buffer Size: ${result.bufferSize} lines\n`;
                statsText += `Oldest Line: ${result.oldestLine}\n`;
                statsText += `Newest Line: ${result.newestLine}\n`;
                statsText += `Status: ${result.isActive ? 'Active' : 'Inactive'}\n`;
                // 添加一些有用的建议
                if (result.estimatedTokens > 8000) {
                    statsText += `\n⚠️  Large output detected! Consider using read_terminal with mode="head-tail" to avoid token limits.`;
                }
                if (result.totalBytes > 1024 * 1024) { // 1MB
                    statsText += `\n⚠️  Output size is ${Math.round(result.totalBytes / 1024 / 1024 * 100) / 100}MB. Consider using truncation options.`;
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: statsText
                        }
                    ]
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error getting terminal stats: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ],
                    isError: true
                };
            }
        });
        // 等待输出稳定工具
        this.server.tool('wait_for_output', 'Wait for terminal output to stabilize. Useful after running commands to ensure all output is captured.', {
            terminalId: z.string().describe('Terminal session ID'),
            timeout: z.number().optional().describe('Maximum time to wait in milliseconds (default: 5000)'),
            stableTime: z.number().optional().describe('Time with no new output to consider stable in milliseconds (default: 500)')
        }, {
            title: 'Wait for Output',
            readOnlyHint: true
        }, async ({ terminalId, timeout, stableTime }) => {
            try {
                await this.terminalManager.waitForOutputStable(terminalId, timeout || 5000, stableTime || 500);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Output for terminal ${terminalId} has stabilized.`
                        }
                    ]
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error waiting for output: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ],
                    isError: true
                };
            }
        });
    }
    /**
     * 设置 MCP 资源
     */
    setupResources() {
        // 终端列表资源
        this.server.resource('terminal-list', 'terminal://list', { description: 'List of all terminal sessions', mimeType: 'application/json' }, async () => {
            try {
                const result = await this.terminalManager.listTerminals();
                return {
                    contents: [
                        {
                            uri: 'terminal://list',
                            mimeType: 'application/json',
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            }
            catch (error) {
                throw new Error(`Failed to get terminal list: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        // 终端输出资源模板
        this.server.resource('terminal-output', new ResourceTemplate('terminal://output/{terminalId}', {
            list: undefined // 不需要列出所有可能的终端输出
        }), { description: 'Terminal output for a specific terminal', mimeType: 'text/plain' }, async (uri, variables) => {
            try {
                const terminalId = variables.terminalId;
                if (!terminalId) {
                    throw new Error('Terminal ID is required');
                }
                const actualTerminalId = Array.isArray(terminalId) ? terminalId[0] : terminalId;
                if (!actualTerminalId) {
                    throw new Error('Terminal ID is required');
                }
                const result = await this.terminalManager.readFromTerminal({ terminalId: actualTerminalId });
                return {
                    contents: [
                        {
                            uri: uri.toString(),
                            mimeType: 'text/plain',
                            text: result.output
                        }
                    ]
                };
            }
            catch (error) {
                throw new Error(`Failed to read terminal output: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        // 管理器统计资源
        this.server.resource('terminal-stats', 'terminal://stats', { description: 'Terminal manager statistics', mimeType: 'application/json' }, async () => {
            try {
                const stats = this.terminalManager.getStats();
                return {
                    contents: [
                        {
                            uri: 'terminal://stats',
                            mimeType: 'application/json',
                            text: JSON.stringify(stats, null, 2)
                        }
                    ]
                };
            }
            catch (error) {
                throw new Error(`Failed to get terminal stats: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * 设置 MCP 提示
     */
    setupPrompts() {
        // 使用指南提示
        this.server.prompt('terminal-usage-guide', 'Guide for using the persistent terminal system', {}, async () => {
            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `# Persistent Terminal System Usage Guide

This MCP server provides persistent terminal session management. Here's how to use it:

## Available Tools:

### 1. create_terminal
Creates a new persistent terminal session.
- Parameters: shell (optional), cwd (optional), env (optional)
- Returns: terminalId, status, pid, shell, cwd

### 2. write_terminal
Sends input to a terminal session.
- Parameters: terminalId (required), input (required)
- Use this to execute commands or send interactive input

### 3. read_terminal
Reads output from a terminal session.
- Parameters: terminalId (required), since (optional), maxLines (optional)
- Returns buffered output, supports pagination

### 4. list_terminals
Lists all active terminal sessions.
- No parameters required
- Returns list of all sessions with their details

### 5. kill_terminal
Terminates a terminal session.
- Parameters: terminalId (required), signal (optional)

## Example Workflow:

1. Create a terminal: create_terminal with desired shell and working directory
2. Send commands: write_terminal with the terminal ID and command
3. Read output: read_terminal to get the command results
4. Continue interaction or create more terminals as needed

## Features:

- Sessions persist even if you disconnect
- Output is buffered and can be retrieved later
- Supports interactive commands and long-running processes
- Multiple concurrent sessions supported

Would you like me to help you create and manage terminal sessions?`
                        }
                    }
                ]
            };
        });
        // 故障排除提示
        this.server.prompt('terminal-troubleshooting', 'Troubleshooting guide for terminal issues', {
            issue: z.string().describe('Description of the issue you are experiencing')
        }, async ({ issue }) => {
            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `# Terminal Troubleshooting Guide

Issue reported: "${issue}"

## Common Issues and Solutions:

### Terminal Not Found
- Check if the terminal ID is correct using list_terminals
- The terminal might have been terminated or timed out
- Create a new terminal if needed

### No Output Received
- The command might still be running
- Try reading with different 'since' parameter
- Check if the terminal is still active

### Command Not Executing
- Ensure you're sending the complete command with newline (\\n)
- Check if the terminal is waiting for input
- Verify the command syntax for the shell being used

### Interactive Commands
- For interactive commands (vim, nano, etc.), you may need to:
  - Send specific key sequences
  - Use appropriate escape sequences
  - Consider the terminal's current state

### Performance Issues
- Large output buffers can slow down reading
- Use maxLines parameter to limit output
- Consider killing and recreating terminals with large buffers

## Debugging Steps:

1. Use list_terminals to check session status
2. Try reading recent output to see current state
3. Send simple commands (like 'echo test') to verify connectivity
4. Check terminal manager stats for resource usage

Would you like specific help with your issue?`
                        }
                    }
                ]
            };
        });
    }
    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        // 监听终端事件并记录日志（仅在调试模式下）
        // 使用 stderr 避免污染 stdio JSON-RPC 通道
        const debug = process.env.MCP_DEBUG === 'true';
        this.terminalManager.on('terminalCreated', (terminalId, session) => {
            if (debug) {
                process.stderr.write(`[MCP-DEBUG] Terminal created: ${terminalId} (PID: ${session.pid})\n`);
            }
        });
        this.terminalManager.on('terminalExit', (terminalId, exitCode, signal) => {
            if (debug) {
                process.stderr.write(`[MCP-DEBUG] Terminal exited: ${terminalId} (code: ${exitCode}, signal: ${signal})\n`);
            }
        });
        this.terminalManager.on('terminalKilled', (terminalId, signal) => {
            if (debug) {
                process.stderr.write(`[MCP-DEBUG] Terminal killed: ${terminalId} (signal: ${signal})\n`);
            }
        });
        this.terminalManager.on('terminalCleaned', (terminalId) => {
            if (debug) {
                process.stderr.write(`[MCP-DEBUG] Terminal cleaned up: ${terminalId}\n`);
            }
        });
    }
    /**
     * 获取 MCP 服务器实例
     */
    getServer() {
        return this.server;
    }
    /**
     * 获取终端管理器实例
     */
    getTerminalManager() {
        return this.terminalManager;
    }
    /**
     * 关闭服务器
     */
    async shutdown() {
        if (process.env.MCP_DEBUG === 'true') {
            process.stderr.write('[MCP-DEBUG] Shutting down MCP server...\n');
        }
        await this.terminalManager.shutdown();
        if (process.env.MCP_DEBUG === 'true') {
            process.stderr.write('[MCP-DEBUG] MCP server shutdown complete\n');
        }
    }
}
//# sourceMappingURL=mcp-server.js.map