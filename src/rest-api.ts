import express, { Request, Response } from 'express';
import cors from 'cors';
import { TerminalManager } from './terminal-manager.js';
import {
  CreateTerminalInput,
  WriteTerminalInput,
  ReadTerminalInput,
  KillTerminalInput
} from './types.js';

/**
 * REST API 服务器
 * 提供 HTTP 接口来管理终端会话
 */
export class RestApiServer {
  private app: express.Application;
  private terminalManager: TerminalManager;
  private server: any;

  constructor(terminalManager: TerminalManager) {
    this.app = express();
    this.terminalManager = terminalManager;
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    // CORS 支持
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // JSON 解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // 请求日志
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });

    // 错误处理
    this.app.use((error: any, req: Request, res: Response, next: any) => {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    });
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 健康检查
    this.app.get('/health', (req: Request, res: Response) => {
      const stats = this.terminalManager.getStats();
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stats
      });
    });

    // 创建终端
    this.app.post('/terminals', async (req: Request, res: Response): Promise<void> => {
      try {
        const input: CreateTerminalInput = req.body;
        const terminalId = await this.terminalManager.createTerminal(input);
        const session = this.terminalManager.getTerminalInfo(terminalId);

        if (!session) {
          res.status(500).json({
            error: 'Failed to retrieve session info'
          });
          return;
        }

        res.status(201).json({
          terminalId,
          status: session.status,
          pid: session.pid,
          shell: session.shell,
          cwd: session.cwd,
          created: session.created.toISOString()
        });
      } catch (error) {
        res.status(400).json({
          error: 'Failed to create terminal',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 列出所有终端
    this.app.get('/terminals', async (req: Request, res: Response) => {
      try {
        const result = await this.terminalManager.listTerminals();
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to list terminals',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 获取特定终端信息
    this.app.get('/terminals/:terminalId', async (req: Request, res: Response): Promise<void> => {
      try {
        const terminalId = req.params.terminalId;
        if (!terminalId) {
          res.status(400).json({ error: 'Terminal ID is required' });
          return;
        }

        const session = this.terminalManager.getTerminalInfo(terminalId);

        if (!session) {
          res.status(404).json({
            error: 'Terminal not found'
          });
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
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get terminal info',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 向终端写入数据
    this.app.post('/terminals/:terminalId/input', async (req: Request, res: Response): Promise<void> => {
      try {
        const terminalId = req.params.terminalId;
        const { input, appendNewline } = req.body as WriteTerminalInput;

        if (!terminalId) {
          res.status(400).json({ error: 'Terminal ID is required' });
          return;
        }

        if (!input) {
          res.status(400).json({
            error: 'Input is required'
          });
          return;
        }

        const writeOptions: any = {
          terminalId,
          input
        };
        if (appendNewline !== undefined) {
          writeOptions.appendNewline = appendNewline;
        }
        await this.terminalManager.writeToTerminal(writeOptions);

        res.json({
          success: true,
          message: 'Input sent successfully'
        });
      } catch (error) {
        res.status(400).json({
          error: 'Failed to write to terminal',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 读取终端输出（增强版）
    this.app.get('/terminals/:terminalId/output', async (req: Request, res: Response) => {
      try {
        const { terminalId } = req.params;
        const since = req.query.since ? parseInt(req.query.since as string) : undefined;
        const maxLines = req.query.maxLines ? parseInt(req.query.maxLines as string) : undefined;
        const mode = req.query.mode as string || undefined;
        const headLines = req.query.headLines ? parseInt(req.query.headLines as string) : undefined;
        const tailLines = req.query.tailLines ? parseInt(req.query.tailLines as string) : undefined;

        const result = await this.terminalManager.readFromTerminal({
          terminalId: terminalId!,
          since: since || undefined,
          maxLines: maxLines || undefined,
          mode: mode as any || undefined,
          headLines: headLines || undefined,
          tailLines: tailLines || undefined
        });

        res.json(result);
      } catch (error) {
        res.status(400).json({
          error: 'Failed to read terminal output',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 获取终端统计信息
    this.app.get('/terminals/:terminalId/stats', async (req: Request, res: Response) => {
      try {
        const { terminalId } = req.params;

        if (!terminalId) {
          res.status(400).json({ error: 'Terminal ID is required' });
          return;
        }

        const result = await this.terminalManager.getTerminalStats(terminalId);
        res.json(result);
      } catch (error) {
        res.status(400).json({
          error: 'Failed to get terminal stats',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 终止终端
    this.app.delete('/terminals/:terminalId', async (req: Request, res: Response) => {
      try {
        const { terminalId } = req.params;
        const signal = req.query.signal as string || 'SIGTERM';

        await this.terminalManager.killTerminal(terminalId!, signal);

        res.json({
          success: true,
          message: 'Terminal terminated successfully'
        });
      } catch (error) {
        res.status(400).json({
          error: 'Failed to terminate terminal',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 调整终端大小
    this.app.put('/terminals/:terminalId/resize', async (req: Request, res: Response): Promise<void> => {
      try {
        const { terminalId } = req.params;
        const { cols, rows } = req.body;

        if (!cols || !rows) {
          res.status(400).json({
            error: 'Both cols and rows are required'
          });
          return;
        }

        await this.terminalManager.resizeTerminal(terminalId!, cols, rows);

        res.json({
          success: true,
          message: 'Terminal resized successfully'
        });
      } catch (error) {
        res.status(400).json({
          error: 'Failed to resize terminal',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 获取管理器统计信息
    this.app.get('/stats', (req: Request, res: Response) => {
      try {
        const stats = this.terminalManager.getStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get stats',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // API 文档
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'Persistent Terminal REST API',
        version: '1.0.0',
        description: 'REST API for managing persistent terminal sessions',
        endpoints: {
          'GET /health': 'Health check and stats',
          'POST /terminals': 'Create a new terminal session',
          'GET /terminals': 'List all terminal sessions',
          'GET /terminals/:id': 'Get terminal session info',
          'POST /terminals/:id/input': 'Send input to terminal',
          'GET /terminals/:id/output': 'Read terminal output',
          'DELETE /terminals/:id': 'Terminate terminal session',
          'PUT /terminals/:id/resize': 'Resize terminal',
          'GET /stats': 'Get manager statistics'
        },
        documentation: 'See README.md for detailed usage instructions'
      });
    });
  }

  /**
   * 启动服务器
   */
  start(port = 3001): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, (error?: any) => {
        if (error) {
          reject(error);
        } else {
          console.log(`REST API server listening on port ${port}`);
          console.log(`API documentation available at http://localhost:${port}/`);
          resolve();
        }
      });
    });
  }

  /**
   * 停止服务器
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('REST API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 获取 Express 应用实例
   */
  getApp(): express.Application {
    return this.app;
  }
}
