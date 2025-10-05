#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PersistentTerminalMcpServer } from './mcp-server.js';

/**
 * 持久化终端 MCP 服务器主入口
 */
async function main() {
  console.error('Starting Persistent Terminal MCP Server...');

  // 创建 MCP 服务器实例
  const mcpServer = new PersistentTerminalMcpServer();
  const server = mcpServer.getServer();

  // 创建 stdio 传输层
  const transport = new StdioServerTransport();

  // 连接服务器和传输层
  await server.connect(transport);

  console.error('Persistent Terminal MCP Server started successfully');
  console.error('Server capabilities:');
  console.error('- create_terminal: Create new persistent terminal sessions');
  console.error('- write_terminal: Send input to terminal sessions');
  console.error('- read_terminal: Read output from terminal sessions');
  console.error('- list_terminals: List all active terminal sessions');
  console.error('- kill_terminal: Terminate terminal sessions');
  console.error('');
  console.error('Resources available:');
  console.error('- terminal://list: List of all terminals');
  console.error('- terminal://output/{terminalId}: Terminal output');
  console.error('- terminal://stats: Manager statistics');
  console.error('');
  console.error('Prompts available:');
  console.error('- terminal-usage-guide: Usage guide');
  console.error('- terminal-troubleshooting: Troubleshooting guide');

  // 处理优雅关闭
  const shutdown = async () => {
    console.error('Received shutdown signal, cleaning up...');
    try {
      await mcpServer.shutdown();
      await transport.close();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGHUP', shutdown);

  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    shutdown();
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    shutdown();
  });
}

// 启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
