import { WebUIStartOptions, WebUIStartResult } from './types.js';
/**
 * Web UI 管理器
 * 负责管理 Web 服务器的生命周期、端口分配和浏览器打开
 */
export declare class WebUIManager {
    private server;
    private currentPort;
    /**
     * 启动 Web UI
     */
    start(options: WebUIStartOptions): Promise<WebUIStartResult>;
    /**
     * 停止 Web UI
     */
    stop(): Promise<void>;
    /**
     * 查找可用端口
     */
    private findAvailablePort;
    /**
     * 检查端口是否可用
     */
    private isPortAvailable;
    /**
     * 打开浏览器
     */
    private openBrowser;
    /**
     * 获取当前状态
     */
    getStatus(): {
        running: boolean;
        port: number | null;
        url: string | null;
    };
}
//# sourceMappingURL=web-ui-manager.d.ts.map