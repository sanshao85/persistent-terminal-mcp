#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PersistentTerminalMcpServer } from './mcp-server.js';
import { isMainModule } from './utils/module-helpers.js';
import { isConptySuppressed } from './utils/error-flags.js';
/**
 * 日志输出函数 - 只在调试模式下输出到 stderr
 * MCP 使用 stdio 进行 JSON-RPC 通信，所以日志必须输出到 stderr
 */
function log(message) {
    if (process.env.MCP_DEBUG === 'true') {
        // 使用 stderr 避免污染 stdio JSON-RPC 通道
        process.stderr.write(`[MCP-DEBUG] ${message}\n`);
    }
}
/**
 * 持久化终端 MCP 服务器主入口
 */
async function main() {
    log('Starting Persistent Terminal MCP Server...');
    // 创建 MCP 服务器实例
    const mcpServer = new PersistentTerminalMcpServer();
    const server = mcpServer.getServer();
    // 创建 stdio 传输层
    const transport = new StdioServerTransport();
    // 连接服务器和传输层
    await server.connect(transport);
    log('Persistent Terminal MCP Server started successfully');
    log('Server capabilities:');
    log('- create_terminal: Create new persistent terminal sessions');
    log('- write_terminal: Send input to terminal sessions');
    log('- read_terminal: Read output from terminal sessions');
    log('- list_terminals: List all active terminal sessions');
    log('- kill_terminal: Terminate terminal sessions');
    log('');
    log('Resources available:');
    log('- terminal://list: List of all terminals');
    log('- terminal://output/{terminalId}: Terminal output');
    log('- terminal://stats: Manager statistics');
    log('');
    log('Prompts available:');
    log('- terminal-usage-guide: Usage guide');
    log('- terminal-troubleshooting: Troubleshooting guide');
    // 处理优雅关闭
    const shutdown = async () => {
        log('Received shutdown signal, cleaning up...');
        try {
            await mcpServer.shutdown();
            await transport.close();
            process.exit(0);
        }
        catch (error) {
            // 错误信息输出到 stderr，避免污染 stdio
            process.stderr.write(`[MCP-ERROR] Error during shutdown: ${error}\n`);
            process.exit(1);
        }
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGHUP', shutdown);
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
        if (isConptySuppressed(error)) {
            return;
        }
        process.stderr.write(`[MCP-ERROR] Uncaught exception: ${error}\n`);
        shutdown();
    });
    process.on('unhandledRejection', (reason, promise) => {
        if (isConptySuppressed(reason)) {
            return;
        }
        process.stderr.write(`[MCP-ERROR] Unhandled rejection at: ${promise}, reason: ${reason}\n`);
        shutdown();
    });
}
// 启动服务器
if (isMainModule(import.meta.url)) {
    main().catch((error) => {
        process.stderr.write(`[MCP-ERROR] Failed to start server: ${error}\n`);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map