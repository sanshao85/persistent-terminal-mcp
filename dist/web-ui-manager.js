import { WebUIServer } from './web-ui-server.js';
import { exec } from 'child_process';
import { createServer } from 'net';
/**
 * Web UI 管理器
 * 负责管理 Web 服务器的生命周期、端口分配和浏览器打开
 */
export class WebUIManager {
    server = null;
    currentPort = null;
    /**
     * 启动 Web UI
     */
    async start(options) {
        // 如果已经启动，返回现有信息
        if (this.server && this.currentPort) {
            return {
                url: `http://localhost:${this.currentPort}`,
                port: this.currentPort,
                mode: 'existing',
                autoOpened: false
            };
        }
        // 查找可用端口
        const port = await this.findAvailablePort(options.port || 3002);
        // 启动 Web 服务器
        this.server = new WebUIServer(options.terminalManager);
        await this.server.start(port);
        this.currentPort = port;
        const url = `http://localhost:${port}`;
        // 自动打开浏览器
        let autoOpened = false;
        if (options.autoOpen !== false) {
            try {
                await this.openBrowser(url);
                autoOpened = true;
            }
            catch (error) {
                // 打开失败不影响功能，只记录日志
                if (process.env.MCP_DEBUG === 'true') {
                    process.stderr.write(`[MCP-DEBUG] Failed to open browser: ${error}\n`);
                }
            }
        }
        return {
            url,
            port,
            mode: 'new',
            autoOpened
        };
    }
    /**
     * 停止 Web UI
     */
    async stop() {
        if (this.server) {
            await this.server.stop();
            this.server = null;
            this.currentPort = null;
        }
    }
    /**
     * 查找可用端口
     */
    async findAvailablePort(startPort) {
        for (let port = startPort; port < startPort + 100; port++) {
            const available = await this.isPortAvailable(port);
            if (available) {
                return port;
            }
        }
        throw new Error(`No available ports found in range ${startPort}-${startPort + 99}`);
    }
    /**
     * 检查端口是否可用
     */
    async isPortAvailable(port) {
        return new Promise((resolve) => {
            const server = createServer();
            server.once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(false);
                }
                else {
                    resolve(false);
                }
            });
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            server.listen(port, '127.0.0.1');
        });
    }
    /**
     * 打开浏览器
     */
    async openBrowser(url) {
        const commands = {
            darwin: `open "${url}"`,
            win32: `start "" "${url}"`,
            linux: `xdg-open "${url}"`
        };
        const command = commands[process.platform];
        if (!command) {
            throw new Error(`Unsupported platform: ${process.platform}`);
        }
        return new Promise((resolve, reject) => {
            exec(command, (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * 获取当前状态
     */
    getStatus() {
        return {
            running: this.server !== null,
            port: this.currentPort,
            url: this.currentPort ? `http://localhost:${this.currentPort}` : null
        };
    }
}
//# sourceMappingURL=web-ui-manager.js.map