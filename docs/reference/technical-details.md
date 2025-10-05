# 技术实现细节补充文档

## 给 AI 开发者的额外说明

这份文档提供了一些关键的技术实现细节和最佳实践，帮助你更好地实现持久终端管理系统。

---

## 1. node-pty 使用示例

### 创建终端

```typescript
import * as pty from 'node-pty';

const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-color',
  cols: 80,
  rows: 24,
  cwd: workingDirectory,
  env: environmentVariables
});

// 监听输出
ptyProcess.onData((data) => {
  // 将数据添加到缓冲区
  outputBuffer.append(data);
});

// 监听退出
ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(`Process exited with code ${exitCode}`);
});
```

### 写入数据

```typescript
// 自动添加换行符
function writeToTerminal(input: string) {
  const inputToWrite = input.endsWith('\n') || input.endsWith('\r') 
    ? input 
    : input + '\n';
  ptyProcess.write(inputToWrite);
}
```

### 终止进程

```typescript
function killTerminal(signal: string = 'SIGTERM') {
  ptyProcess.kill(signal);
  // 清理资源
  ptyProcesses.delete(terminalId);
  outputBuffers.delete(terminalId);
  sessions.delete(terminalId);
}
```

---

## 2. 循环缓冲区实现

### 基本结构

```typescript
interface OutputEntry {
  lineNumber: number;
  timestamp: Date;
  content: string;
}

class OutputBuffer {
  private buffer: OutputEntry[] = [];
  private maxSize: number;
  private currentLine: number = 0;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  append(data: string): void {
    const lines = data.split('\n');
    for (const line of lines) {
      if (line.length === 0) continue;
      
      this.buffer.push({
        lineNumber: this.currentLine++,
        timestamp: new Date(),
        content: line
      });

      // 循环缓冲：超过最大大小时删除最旧的
      if (this.buffer.length > this.maxSize) {
        this.buffer.shift();
      }
    }
  }

  read(since: number = 0): OutputEntry[] {
    return this.buffer.filter(entry => entry.lineNumber >= since);
  }

  getStats() {
    const totalBytes = this.buffer.reduce((sum, entry) => 
      sum + entry.content.length, 0);
    
    return {
      totalLines: this.buffer.length,
      totalBytes,
      estimatedTokens: Math.ceil(totalBytes / 4),
      oldestLine: this.buffer[0]?.lineNumber || 0,
      newestLine: this.buffer[this.buffer.length - 1]?.lineNumber || 0
    };
  }
}
```

---

## 3. 智能截断实现

```typescript
interface SmartReadOptions {
  since?: number;
  mode?: 'full' | 'head' | 'tail' | 'head-tail';
  headLines?: number;
  tailLines?: number;
  maxLines?: number;
}

function smartRead(options: SmartReadOptions) {
  const {
    since = 0,
    mode = 'full',
    headLines = 50,
    tailLines = 50,
    maxLines = 1000
  } = options;

  // 获取原始数据
  let entries = this.buffer.filter(e => e.lineNumber >= since);
  
  // 限制最大行数
  if (entries.length > maxLines) {
    entries = entries.slice(-maxLines);
  }

  let result: OutputEntry[];
  let truncated = false;
  let linesOmitted = 0;

  switch (mode) {
    case 'head':
      if (entries.length > headLines) {
        result = entries.slice(0, headLines);
        truncated = true;
        linesOmitted = entries.length - headLines;
      } else {
        result = entries;
      }
      break;

    case 'tail':
      if (entries.length > tailLines) {
        result = entries.slice(-tailLines);
        truncated = true;
        linesOmitted = entries.length - tailLines;
      } else {
        result = entries;
      }
      break;

    case 'head-tail':
      if (entries.length > headLines + tailLines) {
        const head = entries.slice(0, headLines);
        const tail = entries.slice(-tailLines);
        result = [...head, ...tail];
        truncated = true;
        linesOmitted = entries.length - headLines - tailLines;
      } else {
        result = entries;
      }
      break;

    default: // full
      result = entries;
  }

  // 格式化输出
  let output = result.map(e => e.content).join('\n');
  
  // 如果截断了，添加提示
  if (truncated && mode === 'head-tail') {
    const head = result.slice(0, headLines).map(e => e.content).join('\n');
    const tail = result.slice(-tailLines).map(e => e.content).join('\n');
    output = `${head}\n\n... [省略 ${linesOmitted} 行] ...\n\n${tail}`;
  }

  return {
    output,
    totalLines: entries.length,
    nextReadFrom: entries[entries.length - 1]?.lineNumber + 1 || since,
    hasMore: false,
    truncated,
    stats: {
      totalBytes: output.length,
      estimatedTokens: Math.ceil(output.length / 4),
      linesShown: result.length,
      linesOmitted
    }
  };
}
```

---

## 4. Express 路由实现

### 路由文件结构

```typescript
// src/routes/terminals.ts
import { Router } from 'express';
import * as terminalController from '../controllers/terminalController';

const router = Router();

router.post('/terminals', terminalController.createTerminal);
router.post('/terminals/:terminalId/input', terminalController.writeInput);
router.get('/terminals/:terminalId/output', terminalController.readOutput);
router.get('/terminals/:terminalId/stats', terminalController.getStats);
router.get('/terminals', terminalController.listTerminals);
router.delete('/terminals/:terminalId', terminalController.killTerminal);

export default router;
```

### 控制器实现

```typescript
// src/controllers/terminalController.ts
import { Request, Response } from 'express';
import { terminalManager } from '../services/terminalManager';

export async function createTerminal(req: Request, res: Response) {
  try {
    const { shell, cwd, env, cols, rows } = req.body;
    
    const terminal = await terminalManager.createTerminal({
      shell,
      cwd,
      env,
      cols,
      rows
    });

    res.json({
      success: true,
      data: terminal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: error.message
      }
    });
  }
}

export async function writeInput(req: Request, res: Response) {
  try {
    const { terminalId } = req.params;
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Input is required'
        }
      });
    }

    await terminalManager.writeToTerminal(terminalId, input);

    res.json({
      success: true,
      message: 'Input sent successfully'
    });
  } catch (error) {
    if (error.code === 'TERMINAL_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'WRITE_FAILED',
        message: error.message
      }
    });
  }
}

export async function readOutput(req: Request, res: Response) {
  try {
    const { terminalId } = req.params;
    const {
      since,
      mode,
      headLines,
      tailLines,
      maxLines
    } = req.query;

    const result = await terminalManager.readFromTerminal(terminalId, {
      since: since ? parseInt(since as string) : undefined,
      mode: mode as any,
      headLines: headLines ? parseInt(headLines as string) : undefined,
      tailLines: tailLines ? parseInt(tailLines as string) : undefined,
      maxLines: maxLines ? parseInt(maxLines as string) : undefined
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.code === 'TERMINAL_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'READ_FAILED',
        message: error.message
      }
    });
  }
}
```

---

## 5. 错误处理中间件

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}
```

---

## 6. 日志中间件

```typescript
// src/middleware/logger.ts
import { Request, Response, NextFunction } from 'express';

export function logger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });

  next();
}
```

---

## 7. 会话超时清理

```typescript
// src/services/terminalManager.ts
class TerminalManager {
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 每 5 分钟检查一次超时会话
    this.cleanupInterval = setInterval(() => {
      this.cleanupTimeoutSessions();
    }, 5 * 60 * 1000);
  }

  private cleanupTimeoutSessions(): void {
    const now = Date.now();
    const timeout = parseInt(process.env.SESSION_TIMEOUT || '86400000');

    for (const [id, session] of this.sessions.entries()) {
      const inactive = now - session.lastActivity.getTime();
      
      if (inactive > timeout && session.status === 'active') {
        console.log(`Cleaning up timeout session: ${id}`);
        this.killTerminal(id).catch(err => {
          console.error(`Failed to cleanup session ${id}:`, err);
        });
      }
    }
  }

  async shutdown(): Promise<void> {
    // 清理定时器
    clearInterval(this.cleanupInterval);

    // 终止所有活跃终端
    const activeTerminals = Array.from(this.sessions.keys());
    await Promise.all(
      activeTerminals.map(id => this.killTerminal(id))
    );
  }
}
```

---

## 8. 服务器配置

```typescript
// src/server.ts
import express from 'express';
import cors from 'cors';
import terminalRoutes from './routes/terminals';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';

export function createServer() {
  const app = express();

  // 中间件
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
  }));
  app.use(express.json());
  app.use(logger);

  // 健康检查
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      }
    });
  });

  // 路由
  app.use('/api', terminalRoutes);

  // 错误处理
  app.use(errorHandler);

  return app;
}
```

```typescript
// src/index.ts
import dotenv from 'dotenv';
import { createServer } from './server';
import { terminalManager } from './services/terminalManager';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

const app = createServer();

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/api/health`);
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
  });

  await terminalManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
  });

  await terminalManager.shutdown();
  process.exit(0);
});
```

---

## 9. TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 10. package.json 示例

```json
{
  "name": "persistent-terminal-api",
  "version": "1.0.0",
  "description": "Persistent terminal management API",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "node-pty": "^1.0.0",
    "uuid": "^9.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "@types/cors": "^2.8.13",
    "typescript": "^5.0.0",
    "tsx": "^3.12.0",
    "jest": "^29.5.0",
    "@types/jest": "^29.5.0",
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.12",
    "eslint": "^8.40.0",
    "prettier": "^2.8.8"
  }
}
```

---

## 11. 测试示例

```typescript
// tests/terminals.test.ts
import request from 'supertest';
import { createServer } from '../src/server';

describe('Terminal API', () => {
  let app: any;
  let terminalId: string;

  beforeAll(() => {
    app = createServer();
  });

  test('POST /api/terminals - Create terminal', async () => {
    const response = await request(app)
      .post('/api/terminals')
      .send({ cwd: process.cwd() })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('terminalId');
    
    terminalId = response.body.data.terminalId;
  });

  test('POST /api/terminals/:id/input - Send command', async () => {
    const response = await request(app)
      .post(`/api/terminals/${terminalId}/input`)
      .send({ input: 'pwd' })
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  test('GET /api/terminals/:id/output - Read output', async () => {
    // Wait for command to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await request(app)
      .get(`/api/terminals/${terminalId}/output`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('output');
    expect(response.body.data.output).toContain(process.cwd());
  });

  test('DELETE /api/terminals/:id - Kill terminal', async () => {
    const response = await request(app)
      .delete(`/api/terminals/${terminalId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

---

## 12. 关键注意事项

### ⚠️ 必须实现的功能

1. **自动换行符**：用户发送 `"pwd"` 时自动添加 `\n`
2. **完全清理**：kill 终端时删除所有 Map 中的数据
3. **错误处理**：所有 API 都要捕获异常并返回友好错误
4. **参数验证**：验证所有输入参数的有效性

### 💡 性能优化建议

1. 使用流式处理大量输出
2. 实现输出缓存，避免重复读取
3. 限制并发终端数量
4. 定期清理超时会话

### 🔒 安全建议

1. 验证工作目录路径，防止路径遍历
2. 限制命令长度，防止 DoS 攻击
3. 实现请求频率限制
4. 考虑添加 API Key 认证

---

**这份文档提供了所有关键的技术实现细节。请结合主提示词文档一起使用。**

