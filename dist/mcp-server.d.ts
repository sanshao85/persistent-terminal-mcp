import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TerminalManager } from './terminal-manager.js';
/**
 * MCP 服务器实现
 * 将终端管理功能暴露为 MCP 工具和资源
 */
export declare class PersistentTerminalMcpServer {
    private server;
    private terminalManager;
    constructor();
    /**
     * 创建终端并返回统一格式的结果
     */
    private createTerminalResponse;
    /**
     * 设置 MCP 工具
     */
    private setupTools;
    /**
     * 设置 MCP 资源
     */
    private setupResources;
    /**
     * 设置 MCP 提示
     */
    private setupPrompts;
    /**
     * 设置事件处理器
     */
    private setupEventHandlers;
    /**
     * 获取 MCP 服务器实例
     */
    getServer(): McpServer;
    /**
     * 获取终端管理器实例
     */
    getTerminalManager(): TerminalManager;
    /**
     * 关闭服务器
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=mcp-server.d.ts.map