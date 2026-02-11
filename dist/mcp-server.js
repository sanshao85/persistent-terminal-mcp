import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TerminalManager } from './terminal-manager.js';
import { WebUIManager } from './web-ui-manager.js';
import { promises as fs } from 'fs';
import * as path from 'path';
/**
 * MCP 服务器实现
 * 将终端管理功能暴露为 MCP 工具和资源
 */
export class PersistentTerminalMcpServer {
    server;
    terminalManager;
    webUiManager;
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
        // 创建 Web UI 管理器
        this.webUiManager = new WebUIManager();
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
     * 使用 Codex 修复 Bug
     */
    async fixBugWithCodex(params) {
        const workingDir = params.cwd || process.cwd();
        const timeoutMs = params.timeout || 600000; // 默认 10 分钟
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFileName = `codex-fix-${timestamp}.md`;
        const reportPath = `docs/${reportFileName}`;
        try {
            // 构建我们的固定后缀提示词（纯英文，避免 UTF-8 编码问题）
            const ourSuffix = `

---
REQUIREMENTS AFTER FIX:

1. Create a detailed fix report in docs/ directory: ${reportPath}

2. The report MUST use the following Markdown format:

# Bug Fix Report

## Problem Description
${params.description}

## Fix Time
${new Date().toISOString()}

## Modified Files
List all modified files with their full paths

## Detailed Changes
For each file, provide detailed explanation:

### File: filename
**Changes**: Brief description

**Before**:
\`\`\`language
original code
\`\`\`

**After**:
\`\`\`language
new code
\`\`\`

**Reason**: Why this change was made

## Testing Recommendations
1. Unit test commands
2. Manual testing steps
3. Expected results

## Notes
Important notes about these changes

## Summary
Summarize this fix in 1-2 sentences

---
Report generated: ${new Date().toISOString()}
Fix tool: OpenAI Codex
`;
            // 组合最终提示词：AI 的描述 + 我们的后缀
            const finalPrompt = params.description + ourSuffix;
            // 将问题描述写入 MD 文档，避免 shell 转义问题
            const promptFileName = `codex-bug-description-${timestamp}.md`;
            const promptFile = path.join(workingDir, 'docs', promptFileName);
            // 确保 docs 目录存在
            await fs.mkdir(path.join(workingDir, 'docs'), { recursive: true });
            // 写入问题描述文档
            await fs.writeFile(promptFile, finalPrompt, 'utf-8');
            // 创建专用终端
            const terminalId = await this.terminalManager.createTerminal({
                cwd: workingDir,
                shell: '/bin/bash'
            });
            // 构建 Codex 命令 - 使用非交互模式 exec，从 MD 文档读取问题描述
            // 使用 --dangerously-bypass-approvals-and-sandbox 实现完全自动化
            const codexCmd = `codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check "$(cat docs/${promptFileName})"`;
            // 执行命令
            await this.terminalManager.writeToTerminal({
                terminalId,
                input: codexCmd
            });
            // 智能等待完成
            const startTime = Date.now();
            let lastOutputLength = 0;
            let stableCount = 0;
            const stableThreshold = 3; // 连续3次输出不变则认为完成
            while (Date.now() - startTime < timeoutMs) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // 每5秒检查
                // 只读取最后 50 行来检查状态，避免读取过多数据
                const result = await this.terminalManager.readFromTerminal({
                    terminalId,
                    mode: 'tail',
                    tailLines: 50
                });
                // 检查输出是否稳定
                if (result.output.length === lastOutputLength) {
                    stableCount++;
                    if (stableCount >= stableThreshold) {
                        break; // 输出稳定，认为完成
                    }
                }
                else {
                    stableCount = 0;
                    lastOutputLength = result.output.length;
                }
                // 检查是否有明确的完成标志
                if (result.output.includes('Task completed') ||
                    result.output.includes('修复完成') ||
                    result.output.includes('Fix completed')) {
                    break;
                }
            }
            const executionTime = Date.now() - startTime;
            // 读取最终输出（只读取最后 50 行，避免上下文过长）
            const finalResult = await this.terminalManager.readFromTerminal({
                terminalId,
                mode: 'tail',
                tailLines: 50
            });
            // 检查报告是否生成
            const fullReportPath = path.join(workingDir, reportPath);
            let reportExists = false;
            let reportContent = '';
            try {
                reportContent = await fs.readFile(fullReportPath, 'utf-8');
                reportExists = true;
            }
            catch (error) {
                // 报告不存在
            }
            // 构建返回消息
            let resultMessage = `🤖 Codex Bug Fix Execution Completed\n\n`;
            resultMessage += `📊 Execution Details:\n`;
            resultMessage += `- Terminal ID: ${terminalId}\n`;
            resultMessage += `- Working Directory: ${workingDir}\n`;
            resultMessage += `- Execution Time: ${(executionTime / 1000).toFixed(2)} seconds\n`;
            resultMessage += `- Timeout: ${timeoutMs / 1000} seconds\n\n`;
            if (reportExists) {
                resultMessage += `✅ Fix Report Generated Successfully!\n\n`;
                resultMessage += `📄 Report Location: ${reportPath}\n\n`;
                resultMessage += `🔔 IMPORTANT - NEXT STEPS FOR YOU (AI Assistant):\n`;
                resultMessage += `1. Read the report using: view("${reportPath}")\n`;
                resultMessage += `2. Analyze the changes Codex made\n`;
                resultMessage += `3. Summarize the fix to the user in simple terms\n`;
                resultMessage += `4. Provide the testing recommendations from the report\n`;
                resultMessage += `5. Ask the user if they want to review the changes\n\n`;
                resultMessage += `📋 Report Preview (first 500 chars):\n`;
                resultMessage += `${'='.repeat(60)}\n`;
                resultMessage += reportContent.substring(0, 500);
                if (reportContent.length > 500) {
                    resultMessage += `\n... (truncated, read full report for details)\n`;
                }
                resultMessage += `\n${'='.repeat(60)}\n`;
            }
            else {
                resultMessage += `⚠️ Warning: Fix Report Not Found!\n\n`;
                resultMessage += `Expected location: ${reportPath}\n\n`;
                resultMessage += `Possible reasons:\n`;
                resultMessage += `1. Codex encountered an error\n`;
                resultMessage += `2. The fix was too simple and Codex didn't generate a report\n`;
                resultMessage += `3. Codex is still running (check terminal output)\n\n`;
                resultMessage += `📋 Please check the Codex output below for details.\n`;
            }
            resultMessage += `\n${'='.repeat(60)}\n`;
            resultMessage += `📺 Codex Terminal Output:\n`;
            resultMessage += `${'='.repeat(60)}\n`;
            resultMessage += finalResult.output;
            resultMessage += `\n${'='.repeat(60)}\n`;
            // 添加问题描述文档的信息
            resultMessage += `\n📝 Bug Description Document: docs/${promptFileName}\n`;
            resultMessage += `(This document contains the problem description you provided)\n`;
            return {
                content: [
                    {
                        type: 'text',
                        text: resultMessage
                    }
                ],
                structuredContent: {
                    terminalId,
                    reportPath: reportExists ? reportPath : null,
                    reportExists,
                    workingDir,
                    executionTime,
                    timedOut: executionTime >= timeoutMs,
                    output: finalResult.output,
                    reportPreview: reportExists ? reportContent.substring(0, 500) : null
                }
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error executing Codex bug fix: ${error instanceof Error ? error.message : String(error)}`
                    }
                ],
                isError: true
            };
        }
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
        this.server.tool('write_terminal', 'Write input to a terminal session. For Codex/LLM chat: send message text first, then force Enter with sendEnter=true when the app appears to wait for submission.', {
            terminalId: z.string().describe('Terminal session ID'),
            input: z.string().describe('Input to send to the terminal. For chat text, send the full sentence/paragraph here.'),
            appendNewline: z.boolean().optional().describe('Whether to append newline automatically. Default true for normal text. Keep false only for raw key/control sequences.'),
            sendEnter: z.boolean().optional().describe('Force one Enter key (CR). Recommended for Enter-only actions (input="") or when Codex/TUI appears to be waiting for submit.')
        }, {
            title: 'Write to Terminal',
            readOnlyHint: false
        }, async ({ terminalId, input, appendNewline, sendEnter }) => {
            try {
                const writeOptions = {
                    terminalId,
                    input
                };
                if (appendNewline !== undefined) {
                    writeOptions.appendNewline = appendNewline;
                }
                if (sendEnter !== undefined) {
                    writeOptions.sendEnter = sendEnter;
                }
                await this.terminalManager.writeToTerminal(writeOptions);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Input sent to terminal ${terminalId} successfully.${sendEnter ? ' (Enter forced)' : ''}`
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
        this.server.tool('read_terminal', 'Read output from a terminal session. For Codex/TUI conversation, use mode="tail" + raw=true + cleanAnsi=true. If tail seems incomplete, retry with mode="head-tail" in raw mode.', {
            terminalId: z.string().describe('Terminal session ID'),
            since: z.number().optional().describe('Line number to start reading from (default: 0)'),
            maxLines: z.number().optional().describe('Maximum number of lines to read (default: 1000)'),
            mode: z.enum(['full', 'head', 'tail', 'head-tail']).optional().describe('Reading mode: full, head, tail, head-tail. For recent chat turns, prefer tail. For screen-refresh TUI recovery, use head-tail.'),
            headLines: z.number().optional().describe('Number of lines to show from the beginning when using head or head-tail mode (default: 50)'),
            tailLines: z.number().optional().describe('Number of lines from the end in tail/head-tail mode. For chat checks, 10-30 is a good starting range.'),
            stripSpinner: z.boolean().optional().describe('Whether to strip spinner/animation frames (uses global setting if not specified)'),
            raw: z.boolean().optional().describe('Read raw PTY stream. Strongly recommended for Codex/vim-like TUIs to avoid missing lines caused by cursor redraw.'),
            cleanAnsi: z.boolean().optional().describe('When raw=true, sanitize ANSI/control sequences into readable text. Default: true'),
            maxChars: z.number().optional().describe('Maximum characters returned in this tool response (default: 12000, hard cap for context safety)')
        }, {
            title: 'Read Terminal Output',
            readOnlyHint: true
        }, async ({ terminalId, since, maxLines, mode, headLines, tailLines, stripSpinner, raw, cleanAnsi, maxChars }) => {
            try {
                const useRawRead = raw === true;
                const readOptions = {
                    terminalId,
                    since: since || undefined,
                    maxLines: maxLines || undefined,
                    mode: mode || undefined,
                    headLines: headLines || undefined,
                    tailLines: tailLines || undefined,
                    stripSpinner: stripSpinner,
                    raw: useRawRead
                };
                const result = await this.terminalManager.readFromTerminal({
                    ...readOptions
                });
                const originalOutput = result.output ?? '';
                const cleanedOutput = useRawRead && cleanAnsi !== false
                    ? this.sanitizeRawTerminalOutput(originalOutput)
                    : originalOutput;
                const rawModeOptions = {};
                if (mode !== undefined) {
                    rawModeOptions.mode = mode;
                }
                if (headLines !== undefined) {
                    rawModeOptions.headLines = headLines;
                }
                if (tailLines !== undefined) {
                    rawModeOptions.tailLines = tailLines;
                }
                const modeAdjusted = useRawRead
                    ? this.applyModeToRawText(cleanedOutput, rawModeOptions)
                    : {
                        output: cleanedOutput,
                        mode: mode || 'full',
                        modeApplied: false,
                        linesOmitted: 0
                    };
                const charLimit = this.resolveReadMaxChars(maxChars);
                const truncation = this.truncateForContext(modeAdjusted.output, charLimit);
                const finalOutput = truncation.output;
                let outputText = `Terminal Output (${terminalId}):\n\n${finalOutput}\n\n--- End of Output ---\n`;
                outputText += `Total Lines: ${result.totalLines}\n`;
                outputText += `Has More: ${result.hasMore}\n`;
                outputText += `Next Read Cursor: ${result.cursor ?? result.since}`;
                outputText += `\nReturned Chars: ${finalOutput.length}`;
                outputText += `\nOriginal Chars: ${originalOutput.length}`;
                if (result.truncated) {
                    outputText += `\nTruncated: Yes`;
                }
                if (useRawRead) {
                    outputText += `\nRaw Replay: Enabled (TUI-safe)`;
                    outputText += `\nANSI Cleanup: ${cleanAnsi === false ? 'Disabled' : 'Enabled'}`;
                    if (modeAdjusted.modeApplied) {
                        outputText += `\nRaw Mode Filter: ${modeAdjusted.mode}`;
                        if (modeAdjusted.linesOmitted > 0) {
                            outputText += `\nRaw Lines Omitted: ${modeAdjusted.linesOmitted}`;
                        }
                    }
                }
                if (truncation.truncated) {
                    outputText += `\nContext Guard: Truncated to ${charLimit} chars (omitted ${truncation.omittedChars} chars)`;
                    outputText += `\nHint: Use since=${result.cursor ?? result.since} for incremental reads, or switch mode="tail" with tailLines.`;
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
        // 打开终端管理 UI 工具
        this.server.tool('open_terminal_ui', 'Open a web-based terminal management UI in the browser. This provides a visual interface to manage all terminal sessions.', {
            port: z.number().optional().describe('Port for the web server (default: auto-detect from 3002)'),
            autoOpen: z.boolean().optional().describe('Automatically open browser (default: true)')
        }, {
            title: 'Open Terminal UI',
            readOnlyHint: true
        }, async ({ port, autoOpen }) => {
            try {
                const startOptions = {
                    autoOpen: autoOpen !== false,
                    terminalManager: this.terminalManager
                };
                if (port !== undefined) {
                    startOptions.port = port;
                }
                const result = await this.webUiManager.start(startOptions);
                const lines = [
                    'Terminal UI started successfully!',
                    '',
                    `🌐 URL: ${result.url}`,
                    `📡 Port: ${result.port}`,
                    `📊 Mode: ${result.mode}`,
                    '',
                    result.autoOpened
                        ? '✓ Browser opened automatically'
                        : '→ Please open the URL in your browser manually'
                ];
                return {
                    content: [
                        {
                            type: 'text',
                            text: lines.join('\n')
                        }
                    ]
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error starting terminal UI: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ],
                    isError: true
                };
            }
        });
        // Codex Bug Fix Tool
        this.server.tool('fix_bug_with_codex', `Use OpenAI Codex CLI to automatically fix bugs with FULL SYSTEM ACCESS.

WARNING CRITICAL: This tool gives Codex COMPLETE control over the codebase!
- Sandbox: danger-full-access (no restrictions)
- Approval: never (fully automated)

YOUR RESPONSIBILITY (AI Assistant):
You MUST provide a DETAILED and COMPREHENSIVE bug description to Codex.
The quality of the fix depends entirely on how well you describe the problem!

IMPORTANT NOTES:
1. ONLY use ENGLISH in the description (no Chinese, no emoji)
2. UTF-8 encoding issues may occur with non-ASCII characters
3. Keep the description clear, structured, and detailed
4. Use plain text formatting (avoid special characters)

GOOD DESCRIPTION EXAMPLE (DO THIS):
"Username validation bug in auth.js file.

PROBLEM:
- File: src/auth/login.ts, line 45
- Code: const usernameRegex = /^[a-zA-Z0-9]{3,20}$/
- Symptom: Username 'user_name' is rejected with 'Invalid username' error
- Expected: Should accept usernames with underscores and hyphens

ROOT CAUSE:
- Regex [a-zA-Z0-9] only allows letters and numbers
- Missing support for underscore and hyphen characters

SUGGESTED FIX:
- Change regex to: /^[a-zA-Z0-9_-]{3,20}$/
- This will allow underscores and hyphens in usernames

IMPACT:
- Affects login() and register() functions
- May impact existing user validation logic

RELATED FILES:
- src/auth/login.ts (main fix)
- src/auth/validation.ts (may need update)
- tests/auth/login.test.ts (for verification)

TEST CASES:
- 'user_name' should pass
- 'user-name' should pass
- 'user@name' should fail

VERIFICATION:
- Run: npm test
- Expected: all tests pass"

BAD DESCRIPTION EXAMPLE (DON'T DO THIS):
"Login has a bug, please fix it"
"Username validation is wrong"
"Fix the regex in auth.js"

WHAT TO INCLUDE IN YOUR DESCRIPTION:
1. Problem symptoms - specific error behavior
2. Expected behavior - how it should work
3. Problem location - file path, line number, function name
4. Related code - the problematic code snippet
5. Root cause - why this problem occurs (if known)
6. Fix suggestions - how to fix it (if you have ideas)
7. Impact scope - what else might be affected
8. Related files - all relevant file paths
9. Test cases - how to verify the fix works
10. Context information - background that helps understand the problem

HOW THIS TOOL WORKS:
1. Your bug description will be saved to: docs/codex-bug-description-TIMESTAMP.md
2. Codex will read this document and analyze the problem
3. Codex will fix the bug in the codebase
4. Codex will generate a fix report in: docs/codex-fix-TIMESTAMP.md
5. Both documents will be preserved in docs/ for reference

WORKFLOW AFTER CALLING THIS TOOL:
1. Wait for Codex to complete (up to 10 minutes)
2. YOU MUST read the fix report: docs/codex-fix-TIMESTAMP.md
3. YOU MUST summarize the changes to the user
4. YOU MUST provide testing recommendations
5. Optionally, review the bug description document to see what was sent to Codex

WHAT CODEX WILL DO:
1. Read your bug description from docs/codex-bug-description-TIMESTAMP.md
2. Analyze the problem based on your description
3. Fix the bug in the codebase
4. Generate a comprehensive fix report in docs/codex-fix-TIMESTAMP.md
5. The report includes: problem, changes, files modified, testing guide

TIMEOUT:
Default: 10 minutes (600000ms)
Adjust if the fix is complex or involves many files

TIP:
Before calling this tool, gather as much information as possible:
- Read error messages
- Check relevant files
- Understand the expected behavior
- Review recent changes that might have caused the bug`, {
            description: z.string().describe(`DETAILED bug description for Codex.

MUST INCLUDE:
- Problem symptoms (what's broken)
- Expected behavior (what should happen)
- Problem location (file paths, line numbers)
- Related code snippets
- Root cause (if known)
- Fix suggestions (if any)
- Impact scope (what else might be affected)
- Related files (all relevant file paths)
- Test cases (how to verify the fix)
- Context (background information)

The more detailed, the better the fix!`),
            cwd: z.string().optional().describe('Working directory (default: current directory)'),
            timeout: z.number().optional().describe('Timeout in milliseconds (default: 600000 = 10 minutes)')
        }, {
            title: 'Fix Bug with Codex (Full Access)',
            readOnlyHint: false
        }, async ({ description, cwd, timeout }) => {
            const params = { description };
            if (cwd)
                params.cwd = cwd;
            if (timeout)
                params.timeout = timeout;
            return await this.fixBugWithCodex(params);
        });
    }
    resolveReadMaxChars(maxChars) {
        const envLimit = parseInt(process.env.READ_TERMINAL_MAX_CHARS || '12000', 10);
        const safeEnvLimit = Number.isFinite(envLimit) && envLimit > 0 ? envLimit : 12000;
        if (!maxChars || maxChars <= 0) {
            return safeEnvLimit;
        }
        // Hard upper bound to avoid flooding model context
        return Math.min(maxChars, 50000);
    }
    applyModeToRawText(output, options) {
        const mode = options.mode || 'full';
        if (mode === 'full' || !output) {
            return {
                output,
                mode,
                modeApplied: false,
                linesOmitted: 0
            };
        }
        const lines = output.split('\n');
        const total = lines.length;
        const safeHead = Number.isFinite(options.headLines) && (options.headLines || 0) > 0
            ? Math.floor(options.headLines)
            : 50;
        const safeTail = Number.isFinite(options.tailLines) && (options.tailLines || 0) > 0
            ? Math.floor(options.tailLines)
            : 50;
        if (mode === 'head') {
            const shown = lines.slice(0, safeHead);
            const linesOmitted = Math.max(0, total - shown.length);
            return {
                output: linesOmitted > 0
                    ? `${shown.join('\n')}\n\n... [省略后续 ${linesOmitted} 行] ...`
                    : shown.join('\n'),
                mode,
                modeApplied: true,
                linesOmitted
            };
        }
        if (mode === 'tail') {
            const shown = lines.slice(-safeTail);
            const linesOmitted = Math.max(0, total - shown.length);
            return {
                output: linesOmitted > 0
                    ? `... [省略前面 ${linesOmitted} 行] ...\n\n${shown.join('\n')}`
                    : shown.join('\n'),
                mode,
                modeApplied: true,
                linesOmitted
            };
        }
        const head = lines.slice(0, safeHead);
        const tail = lines.slice(-safeTail);
        const linesOmitted = Math.max(0, total - head.length - tail.length);
        if (linesOmitted <= 0) {
            return {
                output: lines.join('\n'),
                mode,
                modeApplied: true,
                linesOmitted: 0
            };
        }
        return {
            output: `${head.join('\n')}\n\n... [省略 ${linesOmitted} 行] ...\n\n${tail.join('\n')}`,
            mode,
            modeApplied: true,
            linesOmitted
        };
    }
    truncateForContext(output, maxChars) {
        if (!output || output.length <= maxChars) {
            return {
                output,
                truncated: false,
                omittedChars: 0
            };
        }
        const headLength = Math.max(200, Math.floor(maxChars * 0.55));
        const tailLength = Math.max(200, maxChars - headLength - 64);
        const start = output.slice(0, headLength);
        const end = output.slice(-tailLength);
        const omittedChars = Math.max(0, output.length - headLength - tailLength);
        return {
            output: `${start}\n\n... [省略 ${omittedChars} 字符] ...\n\n${end}`,
            truncated: true,
            omittedChars
        };
    }
    sanitizeRawTerminalOutput(raw) {
        if (!raw) {
            return raw;
        }
        const lines = [];
        let currentLine = '';
        for (let i = 0; i < raw.length; i++) {
            const char = raw[i];
            if (char === '\u001b') {
                i = this.skipAnsiSequence(raw, i);
                continue;
            }
            if (char === '\r') {
                const nextChar = raw[i + 1];
                if (nextChar === '\n') {
                    // Keep current line content for CRLF; newline handler will flush it.
                    continue;
                }
                currentLine = '';
                continue;
            }
            if (char === '\n') {
                lines.push(currentLine);
                currentLine = '';
                continue;
            }
            if (char === '\b') {
                currentLine = currentLine.slice(0, -1);
                continue;
            }
            const code = char.charCodeAt(0);
            if (code < 32 && code !== 9) {
                continue;
            }
            currentLine += char;
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        const compacted = [];
        let previous = '';
        let repeatCount = 0;
        const flushRepeatSummary = () => {
            if (repeatCount > 2) {
                compacted.push(`... [重复 ${repeatCount - 2} 行已折叠] ...`);
            }
        };
        for (const rawLine of lines) {
            const line = rawLine.replace(/[\t ]+$/g, '');
            if (line === previous) {
                repeatCount++;
                if (repeatCount <= 2) {
                    compacted.push(line);
                }
                continue;
            }
            flushRepeatSummary();
            previous = line;
            repeatCount = 1;
            compacted.push(line);
        }
        flushRepeatSummary();
        const collapsedBlanks = [];
        let blankCount = 0;
        for (const line of compacted) {
            if (line.trim().length === 0) {
                blankCount++;
                if (blankCount <= 2) {
                    collapsedBlanks.push('');
                }
                continue;
            }
            blankCount = 0;
            collapsedBlanks.push(line);
        }
        return collapsedBlanks.join('\n').trim();
    }
    skipAnsiSequence(input, startIndex) {
        let index = startIndex + 1;
        if (index >= input.length) {
            return startIndex;
        }
        const next = input[index];
        if (next === '[') {
            index++;
            while (index < input.length) {
                const ch = input[index];
                if (ch >= '@' && ch <= '~') {
                    return index;
                }
                index++;
            }
            return input.length - 1;
        }
        if (next === ']') {
            index++;
            while (index < input.length) {
                const ch = input[index];
                if (ch === '\u0007') {
                    return index;
                }
                if (ch === '\u001b' && input[index + 1] === '\\') {
                    return index + 1;
                }
                index++;
            }
            return input.length - 1;
        }
        return index;
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
- appendNewline defaults to true for normal text; empty input also sends Enter by default
- For explicit Enter-only actions (common in Codex chat), prefer input: "" with sendEnter: true

Codex/LLM chat send pattern (important):
1) Send text turn with write_terminal (input = your message)
2) If output status remains Running or app appears waiting for submit, send Enter explicitly:
   - write_terminal with input: "", sendEnter: true
3) Then call wait_for_output and read_terminal

### 3. read_terminal
Reads output from a terminal session.
- Parameters: terminalId (required), since (optional), maxLines (optional)
- Returns buffered output, supports pagination
- For Codex/vim-like TUI apps, prefer mode: "tail", tailLines: 120, raw: true, cleanAnsi: true, maxChars: 8000
- Avoid mode: "full" + raw: true unless full raw replay is truly needed

If user asks "last 10 lines" in Codex/TUI:
- First try: mode: "tail", tailLines: 10, raw: true, cleanAnsi: true
- If content looks incomplete due to redraw/refresh:
  - Retry with mode: "head-tail", headLines: 30, tailLines: 30, raw: true, cleanAnsi: true
  - Optionally increase maxChars (e.g. 20000) for longer assistant replies
- Verify by checking metadata: Raw Mode Filter should match requested mode

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

## Recommended workflow for Codex conversation:

1. write_terminal with message text
2. wait_for_output (timeout 10000-25000, stableTime 2000-5000)
3. read_terminal with tail+raw+cleanAnsi
4. If answer seems truncated, retry read_terminal with head-tail+raw+cleanAnsi
5. If still waiting/running unexpectedly, send Enter via write_terminal(input: "", sendEnter: true)

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
- For Codex/TUI sessions, retry read_terminal with: mode="tail", raw=true, cleanAnsi=true
- If "last 10 lines" still looks incomplete, switch to mode="head-tail" with raw=true

### Command Not Executing
- Ensure you're sending the complete command with newline (\\n)
- Check if the terminal is waiting for input
- Verify the command syntax for the shell being used
- For chat-like prompts waiting on Enter, send: write_terminal(input="", sendEnter=true)

### Interactive Commands
- For interactive commands (vim, nano, etc.), you may need to:
  - Send specific key sequences
  - Use appropriate escape sequences
  - Consider the terminal's current state
- Codex chat also behaves like an interactive TUI; treat message submission as Enter-sensitive

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
        // Codex/TUI 使用最佳实践提示
        this.server.prompt('codex-tui-best-practices', 'Best practices for reading Codex/TUI output and sending Enter correctly', {
            terminalId: z.string().optional().describe('Optional terminal ID for concrete command examples')
        }, async ({ terminalId }) => {
            const sampleId = terminalId || '<terminal-id>';
            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `# Codex / TUI Best Practices

Use this checklist when interacting with Codex-like full-screen terminal apps.

## 1) Sending chat input safely

- Send message text with write_terminal first
- If the app still appears to be waiting, send Enter explicitly:
  - write_terminal(terminalId="${sampleId}", input="", sendEnter=true)

## 2) Reading the latest conversation

Preferred call for recent output:
- read_terminal(terminalId="${sampleId}", mode="tail", tailLines=10~30, raw=true, cleanAnsi=true, maxChars=8000~20000)

If "last 10 lines" looks incomplete (common with ANSI redraw):
- retry with read_terminal(mode="head-tail", headLines=30, tailLines=30, raw=true, cleanAnsi=true)

## 3) Verify the read mode actually applied

Check metadata in response:
- Raw Mode Filter: should match requested mode (tail/head-tail)
- Raw Lines Omitted: indicates lines skipped outside requested window

## 4) Stable turn-by-turn loop

1. write_terminal(message)
2. wait_for_output(timeout=10000~25000, stableTime=2000~5000)
3. read_terminal(tail + raw + cleanAnsi)
4. If no final answer yet, send Enter with input="", sendEnter=true and repeat

This avoids missing replies and prevents context bloat from full raw dumps.`
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
        // 关闭 Web UI
        await this.webUiManager.stop();
        await this.terminalManager.shutdown();
        if (process.env.MCP_DEBUG === 'true') {
            process.stderr.write('[MCP-DEBUG] MCP server shutdown complete\n');
        }
    }
}
//# sourceMappingURL=mcp-server.js.map