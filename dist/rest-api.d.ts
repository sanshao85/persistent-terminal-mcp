import express from 'express';
import { TerminalManager } from './terminal-manager.js';
/**
 * REST API 服务器
 * 提供 HTTP 接口来管理终端会话
 */
export declare class RestApiServer {
    private app;
    private terminalManager;
    private server;
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
     * 启动服务器
     */
    start(port?: number): Promise<void>;
    /**
     * 停止服务器
     */
    stop(): Promise<void>;
    /**
     * 获取 Express 应用实例
     */
    getApp(): express.Application;
}
//# sourceMappingURL=rest-api.d.ts.map