# 持久终端管理系统 - 项目开发提示词

## 项目概述

请帮我创建一个**持久终端管理系统**，这是一个独立的后端服务，通过 REST API 提供终端会话管理功能。主要用于让 AI 助手（如 Claude、GPT、Codex 等）能够执行长时间运行的命令（如 `npm start`、`npm run dev`）而不会被阻塞。

---

## 核心需求

### 1. 持久终端会话管理

**功能描述：**
- 创建新的终端会话（PTY 进程）
- 每个会话有唯一的 ID
- 会话在后台持续运行，即使客户端断开连接
- 支持指定工作目录、Shell 类型、环境变量

**技术要求：**
- 使用 `node-pty` 库创建伪终端
- 每个终端会话独立运行
- 会话信息包括：ID、PID、Shell、工作目录、创建时间、最后活动时间、状态

---

### 2. 命令执行

**功能描述：**
- 向指定终端会话发送命令
- 命令自动执行（自动添加换行符）
- 支持交互式命令（如 `npm init`）
- 支持长时间运行的命令（如 `npm start`）

**技术要求：**
- 如果用户输入不以 `\n` 结尾，自动添加
- 支持发送特殊字符（如 Ctrl+C: `\x03`）
- 记录每次输入的时间戳

---

### 3. 输出缓冲与读取

**功能描述：**
- 实时捕获终端输出
- 缓冲所有输出历史（可配置最大行数）
- 支持增量读取（只读取新输出）
- 支持智能截断（避免输出过长）

**技术要求：**
- 使用循环缓冲区存储输出
- 每行输出带行号和时间戳
- 支持多种读取模式：
  - `full` - 完整输出
  - `head` - 只显示开头 N 行
  - `tail` - 只显示结尾 N 行
  - `head-tail` - 显示开头 + 结尾，中间省略
- 支持 `since` 参数，从指定行号开始读取

---

### 4. 统计信息

**功能描述：**
- 获取终端会话的统计信息
- 包括总行数、字节数、估算 token 数
- 缓冲区状态信息

**技术要求：**
- 实时计算统计数据
- Token 估算：约 4 字符 = 1 token（英文）
- 提供最旧行号和最新行号

---

### 5. 会话管理

**功能描述：**
- 列出所有活跃的终端会话
- 终止指定的终端会话
- 自动清理超时的会话
- 优雅关闭所有会话

**技术要求：**
- 支持配置会话超时时间（默认 24 小时）
- 终止会话时完全清理资源
- 定期检查并清理超时会话

---

## REST API 设计

### 基础信息

- **协议：** HTTP/HTTPS
- **端口：** 3001（可配置）
- **数据格式：** JSON
- **CORS：** 启用（支持跨域）

---

### API 端点

#### 1. 创建终端会话

```
POST /api/terminals
```

**请求体：**
```json
{
  "shell": "/bin/bash",           // 可选，默认系统默认 shell
  "cwd": "/path/to/directory",    // 可选，默认当前目录
  "env": {                         // 可选，环境变量
    "NODE_ENV": "development"
  },
  "cols": 80,                      // 可选，终端列数
  "rows": 24                       // 可选，终端行数
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "terminalId": "abc-123-def-456",
    "pid": 12345,
    "shell": "/bin/bash",
    "cwd": "/path/to/directory",
    "created": "2025-10-03T12:00:00.000Z",
    "status": "active"
  }
}
```

---

#### 2. 发送命令到终端

```
POST /api/terminals/:terminalId/input
```

**请求体：**
```json
{
  "input": "npm start"  // 不需要手动添加 \n
}
```

**响应：**
```json
{
  "success": true,
  "message": "Input sent successfully"
}
```

---

#### 3. 读取终端输出

```
GET /api/terminals/:terminalId/output
```

**查询参数：**
- `since` - 从第几行开始读取（可选）
- `mode` - 读取模式：full/head/tail/head-tail（可选，默认 full）
- `headLines` - head 模式显示的行数（可选，默认 50）
- `tailLines` - tail 模式显示的行数（可选，默认 50）
- `maxLines` - 最大读取行数（可选，默认 1000）

**示例：**
```
GET /api/terminals/abc-123/output?mode=tail&tailLines=30
GET /api/terminals/abc-123/output?since=100
GET /api/terminals/abc-123/output?mode=head-tail&headLines=20&tailLines=20
```

**响应：**
```json
{
  "success": true,
  "data": {
    "output": "命令输出内容...",
    "totalLines": 150,
    "nextReadFrom": 150,
    "hasMore": false,
    "truncated": false,
    "stats": {
      "totalBytes": 5000,
      "estimatedTokens": 1250,
      "linesShown": 30,
      "linesOmitted": 120
    }
  }
}
```

---

#### 4. 获取终端统计信息

```
GET /api/terminals/:terminalId/stats
```

**响应：**
```json
{
  "success": true,
  "data": {
    "terminalId": "abc-123",
    "totalLines": 500,
    "totalBytes": 15000,
    "estimatedTokens": 3750,
    "bufferSize": 500,
    "oldestLine": 0,
    "newestLine": 499,
    "isActive": true
  }
}
```

---

#### 5. 列出所有终端

```
GET /api/terminals
```

**响应：**
```json
{
  "success": true,
  "data": {
    "terminals": [
      {
        "id": "abc-123",
        "pid": 12345,
        "shell": "/bin/bash",
        "cwd": "/path/to/dir",
        "created": "2025-10-03T12:00:00.000Z",
        "lastActivity": "2025-10-03T12:05:00.000Z",
        "status": "active"
      }
    ],
    "count": 1
  }
}
```

---

#### 6. 终止终端会话

```
DELETE /api/terminals/:terminalId
```

**请求体（可选）：**
```json
{
  "signal": "SIGTERM"  // 可选，默认 SIGTERM
}
```

**响应：**
```json
{
  "success": true,
  "message": "Terminal terminated successfully"
}
```

---

#### 7. 健康检查

```
GET /api/health
```

**响应：**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "activeTerminals": 5,
    "version": "1.0.0"
  }
}
```

---

## 技术栈要求

### 后端框架
- **Node.js** (v18+)
- **Express.js** - Web 框架
- **TypeScript** - 类型安全

### 核心依赖
- **node-pty** - 创建伪终端
- **uuid** - 生成唯一 ID
- **cors** - 跨域支持
- **dotenv** - 环境变量管理

### 开发工具
- **tsx** - TypeScript 执行器
- **nodemon** - 开发时自动重启
- **eslint** - 代码检查
- **prettier** - 代码格式化

---

## 项目结构

```
persistent-terminal-api/
├── src/
│   ├── index.ts                 # 入口文件
│   ├── server.ts                # Express 服务器配置
│   ├── routes/
│   │   └── terminals.ts         # 终端相关路由
│   ├── controllers/
│   │   └── terminalController.ts # 终端控制器
│   ├── services/
│   │   ├── terminalManager.ts   # 终端管理器
│   │   └── outputBuffer.ts      # 输出缓冲器
│   ├── types/
│   │   └── index.ts             # 类型定义
│   ├── middleware/
│   │   ├── errorHandler.ts     # 错误处理中间件
│   │   └── logger.ts            # 日志中间件
│   └── utils/
│       └── helpers.ts           # 工具函数
├── tests/
│   └── terminals.test.ts        # 测试文件
├── .env.example                 # 环境变量示例
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 核心功能实现要点

### 1. 终端管理器 (TerminalManager)

**职责：**
- 创建和管理所有终端会话
- 维护终端会话的 Map
- 处理终端输入输出
- 清理超时会话

**关键方法：**
```typescript
class TerminalManager {
  createTerminal(options): Promise<TerminalSession>
  writeToTerminal(terminalId, input): Promise<void>
  readFromTerminal(terminalId, options): Promise<OutputResult>
  getTerminalStats(terminalId): Promise<StatsResult>
  listTerminals(): Promise<TerminalSession[]>
  killTerminal(terminalId, signal): Promise<void>
  cleanupTimeoutSessions(): void
}
```

---

### 2. 输出缓冲器 (OutputBuffer)

**职责：**
- 存储终端输出
- 实现循环缓冲区
- 支持多种读取模式
- 计算统计信息

**关键方法：**
```typescript
class OutputBuffer {
  append(data: string): void
  read(options): OutputEntry[]
  readSmart(options): SmartReadResult
  getStats(): BufferStats
  clear(): void
}
```

---

### 3. 自动换行符处理

**实现逻辑：**
```typescript
function processInput(input: string): string {
  // 如果输入不以换行符结尾，自动添加
  if (!input.endsWith('\n') && !input.endsWith('\r')) {
    return input + '\n';
  }
  return input;
}
```

---

### 4. 智能输出截断

**实现逻辑：**
```typescript
function smartRead(lines: string[], mode: string, headLines: number, tailLines: number) {
  if (mode === 'head') {
    return lines.slice(0, headLines);
  } else if (mode === 'tail') {
    return lines.slice(-tailLines);
  } else if (mode === 'head-tail') {
    const head = lines.slice(0, headLines);
    const tail = lines.slice(-tailLines);
    return [...head, '... [省略中间部分] ...', ...tail];
  }
  return lines; // full mode
}
```

---

### 5. 会话超时清理

**实现逻辑：**
```typescript
// 每 5 分钟检查一次
setInterval(() => {
  const now = Date.now();
  const timeout = parseInt(process.env.SESSION_TIMEOUT || '86400000');
  
  for (const [id, session] of sessions.entries()) {
    const inactive = now - session.lastActivity.getTime();
    if (inactive > timeout) {
      killTerminal(id);
    }
  }
}, 5 * 60 * 1000);
```

---

## 环境变量配置

创建 `.env` 文件：

```env
# 服务器配置
PORT=3001
HOST=0.0.0.0

# 终端配置
MAX_BUFFER_SIZE=10000
SESSION_TIMEOUT=86400000

# 日志配置
LOG_LEVEL=info

# CORS 配置
CORS_ORIGIN=*
```

---

## 错误处理

### 统一错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "TERMINAL_NOT_FOUND",
    "message": "Terminal abc-123 not found",
    "details": {}
  }
}
```

### 错误代码

- `TERMINAL_NOT_FOUND` - 终端不存在
- `TERMINAL_INACTIVE` - 终端已终止
- `INVALID_INPUT` - 无效的输入参数
- `WRITE_FAILED` - 写入失败
- `READ_FAILED` - 读取失败
- `KILL_FAILED` - 终止失败
- `INTERNAL_ERROR` - 内部错误

---

## 日志记录

### 日志级别
- `error` - 错误信息
- `warn` - 警告信息
- `info` - 一般信息
- `debug` - 调试信息

### 日志内容
- 终端创建/终止
- 命令执行
- 错误发生
- 会话超时清理

---

## 安全考虑

### 1. 输入验证
- 验证所有 API 参数
- 防止路径遍历攻击
- 限制命令长度

### 2. 资源限制
- 限制最大终端数量
- 限制输出缓冲区大小
- 限制请求频率

### 3. 访问控制（可选）
- API Key 认证
- IP 白名单
- 请求签名验证

---

## 测试要求

### 单元测试
- 测试终端创建
- 测试命令执行
- 测试输出读取
- 测试会话清理

### 集成测试
- 测试完整的 API 流程
- 测试并发请求
- 测试错误处理

### 测试工具
- **Jest** - 测试框架
- **Supertest** - API 测试

---

## 性能要求

- 支持至少 50 个并发终端会话
- API 响应时间 < 100ms（不包括命令执行时间）
- 内存使用 < 500MB（50 个会话）
- CPU 使用 < 50%（正常负载）

---

## 文档要求

### README.md 应包含：
1. 项目简介
2. 快速开始
3. API 文档
4. 配置说明
5. 部署指南
6. 常见问题

### API 文档应包含：
1. 所有端点的详细说明
2. 请求/响应示例
3. 错误代码说明
4. 使用场景示例

---

## 部署要求

### 开发环境
```bash
npm install
npm run dev
```

### 生产环境
```bash
npm run build
npm start
```

### Docker 支持（可选）
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

---

## 使用示例

### 示例 1: 启动开发服务器

```bash
# 1. 创建终端
curl -X POST http://localhost:3001/api/terminals \
  -H "Content-Type: application/json" \
  -d '{"cwd": "/path/to/project"}'

# 返回: {"success": true, "data": {"terminalId": "abc-123", ...}}

# 2. 启动开发服务器
curl -X POST http://localhost:3001/api/terminals/abc-123/input \
  -H "Content-Type: application/json" \
  -d '{"input": "npm run dev"}'

# 3. 等待 5 秒

# 4. 读取输出
curl "http://localhost:3001/api/terminals/abc-123/output?mode=tail&tailLines=30"
```

---

### 示例 2: 监控长时间运行的命令

```bash
# 1. 创建终端并启动命令
TERMINAL_ID=$(curl -X POST http://localhost:3001/api/terminals \
  -H "Content-Type: application/json" \
  -d '{"cwd": "/path"}' | jq -r '.data.terminalId')

curl -X POST http://localhost:3001/api/terminals/$TERMINAL_ID/input \
  -H "Content-Type: application/json" \
  -d '{"input": "npm start"}'

# 2. 定期检查输出（每 5 秒）
LAST_LINE=0
while true; do
  OUTPUT=$(curl "http://localhost:3001/api/terminals/$TERMINAL_ID/output?since=$LAST_LINE")
  echo "$OUTPUT"
  LAST_LINE=$(echo "$OUTPUT" | jq -r '.data.nextReadFrom')
  sleep 5
done
```

---

## 额外功能（可选）

### 1. WebSocket 支持
- 实时推送终端输出
- 双向通信

### 2. 终端录制
- 记录终端会话
- 回放功能

### 3. 多用户支持
- 用户认证
- 会话隔离

### 4. 终端共享
- 多个客户端连接同一终端
- 协作功能

---

## 注意事项

1. **自动添加换行符**：确保用户发送 `"pwd"` 时自动添加 `\n` 执行命令
2. **资源清理**：终止终端时必须完全清理所有资源（Map、缓冲区等）
3. **错误处理**：所有 API 都要有完善的错误处理
4. **日志记录**：记录关键操作，便于调试
5. **性能优化**：大量输出时使用智能截断
6. **安全性**：验证所有输入，防止注入攻击

---

## 交付物

1. ✅ 完整的源代码
2. ✅ package.json 和依赖配置
3. ✅ TypeScript 配置
4. ✅ 详细的 README.md
5. ✅ API 文档
6. ✅ 测试代码
7. ✅ .env.example 文件
8. ✅ 部署说明

---

## 成功标准

- ✅ 所有 API 端点正常工作
- ✅ 命令自动执行（不需要手动添加 \n）
- ✅ 终端会话持久化运行
- ✅ 输出缓冲和智能截断正常
- ✅ 资源正确清理
- ✅ 错误处理完善
- ✅ 文档完整清晰
- ✅ 测试覆盖率 > 80%

---

**请严格按照以上要求实现这个项目。如有任何疑问，请随时询问。**

