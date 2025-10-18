#!/usr/bin/env node
import { TerminalManager } from './terminal-manager.js';
import { RestApiServer } from './rest-api.js';
/**
 * 独立的 REST API 服务器入口
 */
async function main() {
    console.log('Starting Persistent Terminal REST API Server...');
    // 创建终端管理器
    const terminalManager = new TerminalManager({
        maxBufferSize: parseInt(process.env.MAX_BUFFER_SIZE || '10000'),
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000'), // 24 hours
    });
    // 创建 REST API 服务器
    const restServer = new RestApiServer(terminalManager);
    // 启动服务器
    const port = parseInt(process.env.REST_PORT || '3001');
    try {
        await restServer.start(port);
        console.log('Persistent Terminal REST API Server started successfully');
        console.log(`Server running on http://localhost:${port}`);
        console.log('');
        console.log('Available endpoints:');
        console.log('  GET    /health                    - Health check');
        console.log('  POST   /terminals                 - Create terminal');
        console.log('  GET    /terminals                 - List terminals');
        console.log('  GET    /terminals/:id             - Get terminal info');
        console.log('  POST   /terminals/:id/input       - Send input');
        console.log('  GET    /terminals/:id/output      - Read output (supports mode, headLines, tailLines)');
        console.log('  GET    /terminals/:id/stats       - Get terminal statistics');
        console.log('  DELETE /terminals/:id             - Kill terminal');
        console.log('  PUT    /terminals/:id/resize      - Resize terminal');
        console.log('  GET    /stats                     - Manager stats');
    }
    catch (error) {
        console.error('Failed to start REST API server:', error);
        process.exit(1);
    }
    // 处理优雅关闭
    const shutdown = async () => {
        console.log('Received shutdown signal, cleaning up...');
        try {
            await restServer.stop();
            await terminalManager.shutdown();
            process.exit(0);
        }
        catch (error) {
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
//# sourceMappingURL=rest-server.js.map