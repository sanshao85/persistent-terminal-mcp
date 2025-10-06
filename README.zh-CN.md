# Persistent Terminal MCP Server

一个基于 TypeScript 的 Model Context Protocol (MCP) 服务器，实现了持久化终端会话管理。借助 [`node-pty`](https://github.com/microsoft/node-pty)，即使客户端断开连接，终端命令也会继续运行，特别适合 Claude、GPT 等 AI 助手执行长时间任务。

## 主要特性
- **持久化 PTY 会话**：创建、复用、终止长期运行的 Shell
- **智能输出缓冲**：支持增量读取、head/tail/head-tail 模式，并估算 token 数量
- **Spinner 动画压缩**：自动检测并节流进度动画（如 npm install 的 spinner），减少噪音并保留真实日志
- **完整会话管理**：获取统计信息、列出活跃终端、发送信号、自动清理
- **MCP 原生支持**：内置工具、资源、提示，可直接在 Claude Desktop / Claude Code 等客户端使用
- **可选 REST API**：提供 Express 版接口，方便非 MCP 场景集成

## 快速开始
```bash
npm install          # 安装依赖
npm run build        # 编译 TypeScript 到 dist/
npm start            # 通过 stdio 启动 MCP 服务器
```

开发阶段可直接运行源代码：
```bash
npm run dev          # MCP 服务器 (tsx)
npm run dev:rest     # REST 服务器 (tsx)
```

### 调试模式
启用调试日志（输出到 stderr，不会干扰 MCP 通信）：
```bash
MCP_DEBUG=true npm start
```

### 示例脚本
```bash
npm run example:basic        # 演示创建 → 写入 → 读取 → 终止
npm run example:smart        # 展示 head/tail/head-tail 智能读取
npm run test:tools           # 全量验证所有 MCP 工具
npm run test:fixes           # 针对关键修复的回归测试
```

## MCP 客户端配置

### Claude Desktop / Claude Code (macOS / Linux)
在 MCP 配置文件中添加以下配置：

**Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Claude Code**: 根据客户端要求在相应位置创建或编辑配置文件

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "command": "node",
      "args": [
        "/absolute/path/to/node-pty/dist/index.js"
      ],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000"
      }
    }
  }
}
```

**重要提示**：请将 `/absolute/path/to/node-pty` 替换为实际的安装目录绝对路径。

### Codex 配置
对于 Codex，在 `.codex/config.toml` 文件中添加以下配置：

```toml
# MCP Server Configuration (TOML Format)
# 用于配置 persistent-terminal MCP 服务器

[mcp_servers.persistent-terminal]
command = "node"
args = ["/absolute/path/to/node-pty/dist/index.js"]

[mcp_servers.persistent-terminal.env]
MAX_BUFFER_SIZE = "10000"
SESSION_TIMEOUT = "86400000"
```

**重要提示**：请将 `/absolute/path/to/node-pty` 替换为实际的安装目录绝对路径。

### 环境变量说明
- `MAX_BUFFER_SIZE`: 缓冲区最大行数（默认：10000）
- `SESSION_TIMEOUT`: 会话超时时间，单位毫秒（默认：86400000 = 24 小时）

## MCP 工具一览
| 工具 | 作用 |
|------|------|
| `create_terminal` | 创建持久终端（支持 `env`、`shell`、`cwd` 等参数） |
| `create_terminal_basic` | 精简版创建入口，适配参数受限的客户端 |
| `write_terminal` | 向终端写入命令；若缺少换行会自动补全 |
| `read_terminal` | 读取缓冲输出，支持智能截断策略 |
| `wait_for_output` | 等待终端输出稳定（执行命令后确保获取完整输出） |
| `get_terminal_stats` | 查看缓冲区大小、行数、token 估算与活动状态 |
| `list_terminals` | 列出所有活跃终端及其元数据 |
| `kill_terminal` | 终止会话并可选择发送自定义信号 |

项目同时暴露了若干 MCP 资源与提示，方便客户端列出会话、查看输出或快速排查问题。

## REST API（可选）
若需 HTTP 接口，可启动 REST 版本：
```bash
npm run start:rest
```
服务器默认监听 `3001` 端口（可配置），端点与 MCP 工具一一对应，例如：
- `POST /api/terminals`
- `POST /api/terminals/:id/input`
- `GET /api/terminals/:id/output`
- `GET /api/terminals/:id/stats`
- `GET /api/terminals`
- `DELETE /api/terminals/:id`

## 项目结构
```
docs/                → 文档索引及多语言资料
  ├── guides/        → 使用指南和教程
  ├── reference/     → 技术参考和修复文档
  │   └── fixes/     → 所有修复文档
  ├── clients/       → 客户端配置说明
  └── zh/            → 中文文档
scripts/             → 本地调试用脚本
src/                 → TypeScript 源码
  ├── __tests__/     → 单元测试
  └── examples/      → 示例脚本
tests/               → 测试套件
  └── integration/   → 集成测试
dist/                → 编译后的 JavaScript 产物
```

### 文档导航
所有文档均在 [`docs/`](docs/README.md) 目录下：

**快速访问：**
- 📖 [文档索引](docs/README.md) – 完整文档地图
- 🚨 [修复索引](docs/reference/fixes/README.md) – 所有修复和解决方案
- 🧪 [集成测试](tests/integration/README.md) – 测试套件

**按分类：**
- **指南**: 使用说明、故障排查、MCP 配置
- **参考**: 技术细节、工具总结、Bug 修复
- **修复**: Stdio 修复、Cursor 修复、终端修复
- **客户端**: Claude Desktop / Claude Code 配置
- **中文**: 中文文档资料

### 重要说明
- **Stdio 纯净性**：本 MCP 服务器严格遵循 MCP 协议，确保 stdout 只包含 JSON-RPC 消息，所有日志输出到 stderr。详见 [docs/reference/fixes/STDIO_FIX.md](docs/reference/fixes/STDIO_FIX.md)。
- **Cursor 兼容性**：完全兼容 Cursor 及其他要求严格 JSON-RPC 通信的 MCP 客户端。快速设置见 [docs/reference/fixes/QUICK_FIX_GUIDE.md](docs/reference/fixes/QUICK_FIX_GUIDE.md)。
- **终端交互**：支持交互式应用（vim、npm create 等），正确处理 ANSI 转义序列。详见 [docs/reference/fixes/TERMINAL_FIXES.md](docs/reference/fixes/TERMINAL_FIXES.md)。
- **输出稳定性**：使用 `wait_for_output` 工具确保命令执行后获取完整输出。

## 贡献指南
欢迎提 Issue 或 PR！详细流程与代码规范见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## 开源许可
本项目以 [MIT 许可证](LICENSE) 发布。
