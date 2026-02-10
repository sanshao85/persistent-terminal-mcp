import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Web UI 服务器
 * 提供静态文件服务、REST API 和 WebSocket 实时推送
 */
export class WebUIServer {
    app;
    httpServer = null;
    wss = null;
    terminalManager;
    clients = new Set();
    constructor(terminalManager) {
        this.terminalManager = terminalManager;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }
    /**
     * 设置中间件
     */
    setupMiddleware() {
        // JSON 解析
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        // 静态文件服务
        const publicPath = path.join(__dirname, '../public');
        this.app.use(express.static(publicPath));
        // 请求日志
        this.app.use((req, res, next) => {
            if (process.env.MCP_DEBUG === 'true') {
                process.stderr.write(`[WEB-UI] ${req.method} ${req.path}\n`);
            }
            next();
        });
    }
    /**
     * 设置路由
     */
    setupRoutes() {
        // 主页
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });
        // 终端详情页
        this.app.get('/terminal/:id', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/terminal.html'));
        });
        // REST API 端点
        this.setupApiRoutes();
    }
    /**
     * 设置 API 路由
     */
    setupApiRoutes() {
        // 获取所有终端
        this.app.get('/api/terminals', async (req, res) => {
            try {
                const result = await this.terminalManager.listTerminals();
                res.json(result);
            }
            catch (error) {
                res.status(500).json({
                    error: 'Failed to list terminals',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        });
        // 获取终端详情
        this.app.get('/api/terminals/:id', async (req, res) => {
            try {
                const { id } = req.params;
                if (!id) {
                    res.status(400).json({ error: 'Terminal ID is required' });
                    return;
                }
                const session = this.terminalManager.getTerminalInfo(id);
                if (!session) {
                    res.status(404).json({ error: 'Terminal not found' });
                    return;
                }
                res.json({
                    id: session.id,
                    pid: session.pid,
                    shell: session.shell,
                    cwd: session.cwd,
                    created: session.created.toISOString(),
                    lastActivity: session.lastActivity.toISOString(),
                    status: session.status
                });
            }
            catch (error) {
                res.status(500).json({
                    error: 'Failed to get terminal info',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        });
        // 创建终端
        this.app.post('/api/terminals', async (req, res) => {
            try {
                const { shell, cwd, env } = req.body;
                const terminalId = await this.terminalManager.createTerminal({
                    shell,
                    cwd,
                    env
                });
                const session = this.terminalManager.getTerminalInfo(terminalId);
                res.status(201).json({
                    terminalId,
                    status: session?.status,
                    pid: session?.pid,
                    shell: session?.shell,
                    cwd: session?.cwd
                });
                // 广播新终端创建事件
                this.broadcast({
                    type: 'terminal_created',
                    terminalId
                });
            }
            catch (error) {
                res.status(400).json({
                    error: 'Failed to create terminal',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        });
        // 读取终端输出
        this.app.get('/api/terminals/:id/output', async (req, res) => {
            try {
                const { id } = req.params;
                if (!id) {
                    res.status(400).json({ error: 'Terminal ID is required' });
                    return;
                }
                const { since, maxLines, mode, raw } = req.query;
                const result = await this.terminalManager.readFromTerminal({
                    terminalId: id,
                    since: since ? parseInt(since) : undefined,
                    maxLines: maxLines ? parseInt(maxLines) : undefined,
                    mode: mode,
                    raw: raw === 'true' || raw === '1'
                });
                res.json(result);
            }
            catch (error) {
                res.status(400).json({
                    error: 'Failed to read terminal output',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        });
        // 写入终端输入
        this.app.post('/api/terminals/:id/input', async (req, res) => {
            try {
                const { id } = req.params;
                if (!id) {
                    res.status(400).json({ error: 'Terminal ID is required' });
                    return;
                }
                const { input, appendNewline } = req.body;
                await this.terminalManager.writeToTerminal({
                    terminalId: id,
                    input,
                    appendNewline
                });
                res.json({ success: true });
            }
            catch (error) {
                res.status(400).json({
                    error: 'Failed to write to terminal',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        });
        // 终止终端
        this.app.delete('/api/terminals/:id', async (req, res) => {
            try {
                const { id } = req.params;
                if (!id) {
                    res.status(400).json({ error: 'Terminal ID is required' });
                    return;
                }
                const { signal } = req.query;
                await this.terminalManager.killTerminal(id, signal);
                res.json({ success: true });
                // 广播终端终止事件
                this.broadcast({
                    type: 'terminal_killed',
                    terminalId: id
                });
            }
            catch (error) {
                res.status(400).json({
                    error: 'Failed to kill terminal',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        });
        // 获取终端统计
        this.app.get('/api/terminals/:id/stats', async (req, res) => {
            try {
                const { id } = req.params;
                if (!id) {
                    res.status(400).json({ error: 'Terminal ID is required' });
                    return;
                }
                const result = await this.terminalManager.getTerminalStats(id);
                res.json(result);
            }
            catch (error) {
                res.status(400).json({
                    error: 'Failed to get terminal stats',
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * 设置 WebSocket
     */
    setupWebSocket() {
        if (!this.httpServer)
            return;
        this.wss = new WebSocketServer({ server: this.httpServer });
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            if (process.env.MCP_DEBUG === 'true') {
                process.stderr.write('[WEB-UI] WebSocket client connected\n');
            }
            ws.on('close', () => {
                this.clients.delete(ws);
                if (process.env.MCP_DEBUG === 'true') {
                    process.stderr.write('[WEB-UI] WebSocket client disconnected\n');
                }
            });
            ws.on('error', (error) => {
                if (process.env.MCP_DEBUG === 'true') {
                    process.stderr.write(`[WEB-UI] WebSocket error: ${error}\n`);
                }
            });
        });
        // 监听终端事件并广播
        this.terminalManager.on('terminalOutput', (terminalId, data) => {
            this.broadcast({
                type: 'output',
                terminalId,
                data
            });
        });
        this.terminalManager.on('terminalExit', (terminalId) => {
            this.broadcast({
                type: 'exit',
                terminalId
            });
        });
    }
    /**
     * 广播消息给所有客户端
     */
    broadcast(message) {
        const payload = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }
    /**
     * 启动服务器
     */
    async start(port) {
        return new Promise((resolve, reject) => {
            this.httpServer = createServer(this.app);
            this.httpServer.listen(port, '127.0.0.1', () => {
                if (process.env.MCP_DEBUG === 'true') {
                    process.stderr.write(`[WEB-UI] Server started on http://localhost:${port}\n`);
                }
                // 启动 WebSocket
                this.setupWebSocket();
                resolve();
            });
            this.httpServer.on('error', (error) => {
                reject(error);
            });
        });
    }
    /**
     * 停止服务器
     */
    async stop() {
        return new Promise((resolve) => {
            // 关闭所有 WebSocket 连接
            this.clients.forEach((client) => {
                client.close();
            });
            this.clients.clear();
            // 关闭 WebSocket 服务器
            if (this.wss) {
                this.wss.close();
                this.wss = null;
            }
            // 关闭 HTTP 服务器
            if (this.httpServer) {
                this.httpServer.close(() => {
                    if (process.env.MCP_DEBUG === 'true') {
                        process.stderr.write('[WEB-UI] Server stopped\n');
                    }
                    resolve();
                });
                this.httpServer = null;
            }
            else {
                resolve();
            }
        });
    }
}
//# sourceMappingURL=web-ui-server.js.map