import { TerminalManager } from './terminal-manager.js';
/**
 * Web UI 服务器
 * 提供静态文件服务、REST API 和 WebSocket 实时推送
 */
export declare class WebUIServer {
    private app;
    private httpServer;
    private wss;
    private terminalManager;
    private clients;
    constructor(terminalManager: TerminalManager);
    /**
     * 设置中间件
     */
    private setupMiddleware;
    /**
     * 设置路由
     */
    private setupRoutes;
    /**
     * 设置 API 路由
     */
    private setupApiRoutes;
    /**
     * 设置 WebSocket
     */
    private setupWebSocket;
    /**
     * 广播消息给所有客户端
     */
    private broadcast;
    /**
     * 启动服务器
     */
    start(port: number): Promise<void>;
    /**
     * 停止服务器
     */
    stop(): Promise<void>;
}
//# sourceMappingURL=web-ui-server.d.ts.map