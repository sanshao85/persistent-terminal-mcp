# Persistent Terminal MCP Server

[English](README.en.md)

一个功能强大的 Model Context Protocol (MCP) 服务器，基于 TypeScript 和 [`node-pty`](https://github.com/microsoft/node-pty) 实现持久化终端会话管理。即使客户端断开连接，终端命令也会继续运行，特别适合 Claude、Cursor、Cline 等 AI 助手执行长时间任务。

## ✨ 核心特性

### 🔥 持久化终端会话
- **长期运行**：创建、复用、管理长期运行的 Shell 会话
- **断线续传**：客户端断开后终端继续运行，重连后可继续操作
- **多会话管理**：同时管理多个独立的终端会话
- **自动清理**：超时会话自动清理，避免资源泄漏

### 🧠 智能输出管理
- **循环缓冲区**：可配置大小（默认 10,000 行），自动管理内存
- **多种读取模式**：
  - `full`：完整输出
  - `head`：只读取开头 N 行
  - `tail`：只读取末尾 N 行
  - `head-tail`：同时读取开头和末尾
- **增量读取**：使用 `since` 参数只读取新增内容
- **Token 估算**：自动估算输出的 token 数量，方便 AI 控制上下文

### 🎨 Spinner 动画压缩
- **自动检测**：识别常见的进度动画字符（⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏, ◐◓◑◒ 等）
- **智能节流**：减少 `npm install`、`yarn`、`pnpm` 等命令的噪音输出
- **保留关键信息**：压缩动画的同时保留真实日志
- **灵活配置**：可通过环境变量或参数控制开关

### 🌐 Web 可视化管理界面
- **实时终端**：基于 xterm.js 的终端渲染，支持完整 ANSI 颜色
- **WebSocket 推送**：终端输出实时显示，无需刷新
- **交互操作**：直接在浏览器中发送命令、查看输出
- **多实例支持**：自动端口分配，支持多个 AI 客户端同时使用
- **VS Code 风格**：暗色主题，简洁美观的界面设计

### 🤖 Codex 自动修复 Bug
- **完全自动化**：集成 OpenAI Codex CLI，自动修复代码 Bug
- **文档驱动**：AI 描述保存为 MD 文档，Codex 读取并修复
- **详细报告**：生成完整的修复报告，包含修改前后对比
- **智能等待**：自动检测 Codex 执行完成，默认超时 10 分钟
- **历史记录**：所有 Bug 描述和修复报告永久保存在 docs/ 目录

### 🔌 多种集成方式
- **MCP 协议**：原生支持 Claude Desktop、Claude Code、Cursor、Cline 等客户端
- **REST API**：提供 HTTP 接口，方便非 MCP 场景集成
- **严格兼容**：完全符合 MCP stdio 协议规范，stdout 纯净无污染

### 🛡️ 稳定性保障
- **输出稳定检测**：`wait_for_output` 工具确保获取完整输出
- **交互式应用支持**：完美支持 vim、npm create 等交互式程序
- **ANSI 转义序列**：正确处理终端控制字符
- **错误恢复**：自动重连、异常处理机制

## 🚀 安装方式

### ✅ 快速运行（推荐）
无需安装，直接使用 `npx` 启动：
```bash
npx persistent-terminal-mcp
```

REST 版本同样支持：
```bash
npx persistent-terminal-mcp-rest
```

### 📦 引入到现有项目
```bash
npm install persistent-terminal-mcp
```

安装后即可在代码中引用所有核心类与类型：
```ts
import { PersistentTerminalMcpServer } from 'persistent-terminal-mcp';
```

### 🌐 全局安装（可选）
```bash
npm install --global persistent-terminal-mcp
persistent-terminal-mcp
```

## 🧪 本地开发
适合想要修改源码或深入调试的场景：
```bash
npm install          # 安装依赖
npm run build        # 编译 TypeScript → dist/
npm start            # 通过 stdio 启动 MCP 服务器
```

开发阶段也可直接运行 TypeScript 源码：
```bash
npm run dev          # MCP 服务器 (tsx)
npm run dev:rest     # REST 服务器 (tsx)
```

### 🐞 调试模式
启用调试日志（输出到 stderr，不会干扰 MCP 通信）：
```bash
MCP_DEBUG=true persistent-terminal-mcp
```

### 📚 示例脚本
```bash
npm run example:basic        # 基础操作：创建 → 写入 → 读取 → 终止
npm run example:smart        # 智能读取：head/tail/head-tail 模式演示
npm run example:spinner      # Spinner 压缩功能演示
npm run example:webui        # Web UI 功能演示
npm run test:tools           # 全量验证所有 MCP 工具
npm run test:fixes           # 关键修复的回归测试
```

## ⚙️ MCP 客户端配置

### Claude Desktop (macOS / Linux)
在 MCP 配置文件中添加以下配置：

**配置文件位置**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "command": "npx",
      "args": [
        "-y",
        "persistent-terminal-mcp"
      ],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000",
        "COMPACT_ANIMATIONS": "true",
        "ANIMATION_THROTTLE_MS": "100"
      }
    }
  }
}
```

**小贴士**：`-y` 会自动确认下载提示，便于在非交互环境中运行。若已通过 `npm install --global persistent-terminal-mcp`
安装，可将 `command` 改为 `"persistent-terminal-mcp"` 并移除 `-y`。

### Claude Code (CLI 方式)
使用命令行快速添加 MCP 服务器：

```bash
claude mcp add persistent-terminal \
  --env MAX_BUFFER_SIZE=10000 \
  --env SESSION_TIMEOUT=86400000 \
  --env COMPACT_ANIMATIONS=true \
  --env ANIMATION_THROTTLE_MS=100 \
  -- npx -y persistent-terminal-mcp
```

**提示**：首次使用 `npx` 时需要联网以便下载对应版本的包。

**示例**（全局安装后）：
```bash
claude mcp add persistent-terminal \
  --env MAX_BUFFER_SIZE=10000 \
  --env SESSION_TIMEOUT=86400000 \
  --env COMPACT_ANIMATIONS=true \
  --env ANIMATION_THROTTLE_MS=100 \
  -- persistent-terminal-mcp
```

### Cursor / Cline 配置
配置方式与 Claude Desktop 类似，请参考各客户端的 MCP 配置文档。

### Codex 配置
对于 Codex，在 `.codex/config.toml` 文件中添加以下配置：

```toml
# MCP Server Configuration (TOML Format)
# 用于配置 persistent-terminal MCP 服务器

[mcp_servers.persistent-terminal]
command = "npx"
args = ["-y", "persistent-terminal-mcp"]

[mcp_servers.persistent-terminal.env]
MAX_BUFFER_SIZE = "10000"
SESSION_TIMEOUT = "86400000"
COMPACT_ANIMATIONS = "true"
ANIMATION_THROTTLE_MS = "100"
```

**提示**：首次执行 `npx persistent-terminal-mcp` 需保证可以访问 npm 注册表以下载依赖。

### 环境变量说明
| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MAX_BUFFER_SIZE` | 缓冲区最大行数 | 10000 |
| `SESSION_TIMEOUT` | 会话超时时间（毫秒） | 86400000 (24小时) |
| `COMPACT_ANIMATIONS` | 是否启用 Spinner 压缩 | true |
| `ANIMATION_THROTTLE_MS` | 动画节流时间（毫秒） | 100 |
| `MCP_DEBUG` | 是否启用调试日志 | false |

## 🧱 TypeScript 程序化使用

```ts
import {
  PersistentTerminalMcpServer,
  TerminalManager,
  RestApiServer
} from 'persistent-terminal-mcp';

const manager = new TerminalManager();
const rest = new RestApiServer(manager);
await rest.start(3001);

const mcpServer = new PersistentTerminalMcpServer();
const server = mcpServer.getServer();
await server.connect(/* 自定义 transport */);
```

所有核心类和类型在包的根入口即可获取，详情可参考 `src/index.ts`。

## 🛠️ MCP 工具一览

| 工具 | 作用 | 主要参数 |
|------|------|----------|
| `create_terminal` | 创建持久终端会话 | `shell`, `cwd`, `env`, `cols`, `rows` |
| `create_terminal_basic` | 精简版创建入口 | `shell`, `cwd` |
| `write_terminal` | 向终端写入命令 | `terminalId`, `input`, `appendNewline` |
| `read_terminal` | 读取缓冲输出 | `terminalId`, `mode`, `since`, `stripSpinner` |
| `wait_for_output` | 等待输出稳定 | `terminalId`, `timeout`, `stableTime` |
| `get_terminal_stats` | 查看统计信息 | `terminalId` |
| `list_terminals` | 列出所有活跃终端 | 无 |
| `kill_terminal` | 终止会话 | `terminalId`, `signal` |
| `open_terminal_ui` | 打开 Web 管理界面 | `port`, `autoOpen` |
| `fix_bug_with_codex` 🆕 | 使用 Codex 自动修复 Bug | `description`, `cwd`, `timeout` |

### 工具详细说明

#### `create_terminal` - 创建终端
创建一个新的持久化终端会话。

**参数**：
- `shell` (可选): Shell 类型，如 `/bin/bash`、`/bin/zsh`
- `cwd` (可选): 工作目录
- `env` (可选): 环境变量对象
- `cols` (可选): 终端列数，默认 80
- `rows` (可选): 终端行数，默认 24

**返回**：
- `terminalId`: 终端 ID
- `status`: 状态
- `pid`: 进程 ID
- `shell`: Shell 类型
- `cwd`: 工作目录

#### `write_terminal` - 写入命令
向终端发送命令或输入。

**参数**：
- `terminalId`: 终端 ID
- `input`: 要发送的内容
- `appendNewline` (可选): 是否自动添加换行符，默认 true

**提示**：默认会自动添加换行符执行命令，如需发送原始控制字符（如方向键），请设置 `appendNewline: false`。

#### `read_terminal` - 读取输出
读取终端的缓冲输出，支持多种智能截断模式。

**参数**：
- `terminalId`: 终端 ID
- `mode` (可选): 读取模式
  - `full`: 完整输出（默认）
  - `head`: 只读取开头
  - `tail`: 只读取末尾
  - `head-tail`: 同时读取开头和末尾
- `since` (可选): 从第 N 行开始读取（增量读取）
- `maxLines` (可选): 最大行数，默认 1000
- `headLines` (可选): head 模式的行数，默认 50
- `tailLines` (可选): tail 模式的行数，默认 50
- `stripSpinner` (可选): 是否压缩 Spinner 动画

**返回**：
- `output`: 输出内容
- `totalLines`: 总行数
- `lineRange`: 实际返回的行范围
- `estimatedTokens`: 估算的 token 数量
- `truncated`: 是否被截断
- `spinnerCompacted`: 是否进行了 Spinner 压缩

#### `wait_for_output` - 等待输出稳定
等待终端输出稳定后再读取，确保获取完整输出。

**参数**：
- `terminalId`: 终端 ID
- `timeout` (可选): 最大等待时间（毫秒），默认 5000
- `stableTime` (可选): 稳定时间（毫秒），默认 500

**使用场景**：
- 执行命令后确保获取完整输出
- 等待交互式应用启动完成

#### `fix_bug_with_codex` 🆕 - 自动修复 Bug
使用 OpenAI Codex CLI 自动分析和修复代码中的 Bug。

**参数**：
- `description` (必需): 详细的 Bug 描述，必须包含：
  - 问题症状（具体的错误行为）
  - 期望行为（应该如何工作）
  - 问题位置（文件路径、行号、函数名）
  - 相关代码（有问题的代码片段）
  - 根本原因（为什么会出现这个问题）
  - 修复建议（如何修复）
  - 影响范围（还会影响什么）
  - 相关文件（所有相关的文件路径）
  - 测试用例（如何验证修复是否有效）
  - 上下文信息（有助于理解问题的背景）
- `cwd` (可选): 工作目录，默认为当前目录
- `timeout` (可选): 超时时间（毫秒），默认 600000（10 分钟）

**返回**：
- `terminalId`: 执行 Codex 的终端 ID
- `reportPath`: 修复报告路径
- `reportExists`: 报告是否存在
- `workingDir`: 工作目录
- `executionTime`: 执行时间（秒）
- `timedOut`: 是否超时
- `output`: 终端输出
- `reportPreview`: 报告预览

**工作流程**：
1. AI 提供详细的 Bug 描述
2. 工具将描述保存到 `docs/codex-bug-description-TIMESTAMP.md`
3. Codex 读取文档并分析问题
4. Codex 修复 Bug 并生成报告 `docs/codex-fix-TIMESTAMP.md`
5. AI 读取报告并总结给用户

**重要提示**：
- ⚠️ 此工具具有完全系统访问权限（`danger-full-access`）
- ⚠️ Codex 可以修改任何文件，建议在 Git 仓库中使用
- ✅ 只使用英文描述（避免 UTF-8 编码问题）
- ✅ 描述越详细，修复质量越高

**示例**：
```javascript
fix_bug_with_codex({
  description: `Username validation bug in auth.js file.

PROBLEM:
- File: src/auth/login.ts, line 45
- Code: const usernameRegex = /^[a-zA-Z0-9]{3,20}$/
- Symptom: Username 'user_name' is rejected with 'Invalid username' error
- Expected: Should accept usernames with underscores and hyphens

ROOT CAUSE:
- Regex [a-zA-Z0-9] only allows letters and numbers
- Missing support for underscore and hyphen characters

SUGGESTED FIX:
- Change regex to: /^[a-zA-Z0-9_-]{3,20}$/

VERIFICATION:
- Run: npm test
- Expected: all tests pass`,
  cwd: '/path/to/project',
  timeout: 600000
})
```

**详细文档**：
- [Codex Bug Fix Tool 功能文档](docs/features/CODEX_BUG_FIX_TOOL.md)
- [Codex Bug Fix Tool 测试报告](docs/features/CODEX_BUG_FIX_TEST_REPORT.md)

> **💡 提示**：Codex CLI 需要 OpenAI API 访问权限。如果你在国内或遇到访问问题，可以考虑使用 [Codex CLI 镜像服务](https://www.codex-cli.top)（¥99/月，每日 $90 额度），让 AI 编程更流畅。

#### `open_terminal_ui` - 打开 Web 管理界面
启动一个基于浏览器的可视化终端管理界面。

**参数**：
- `port` (可选): 端口号，默认从 3002 开始自动查找
- `autoOpen` (可选): 是否自动打开浏览器，默认 true

**返回**：
- `url`: Web UI 地址
- `port`: 实际使用的端口
- `mode`: 启动模式（new/existing）
- `autoOpened`: 是否自动打开了浏览器

#### `fix_bug_with_codex` 🆕 - 使用 Codex 自动修复 Bug
调用 OpenAI Codex CLI 自动分析和修复代码中的 bug，并生成详细的修复报告。

**⚠️ 重要提示**：
- 此工具使用 **完全权限模式**（`--sandbox danger-full-access --ask-for-approval never`）
- Codex 可以完全控制代码库，请谨慎使用
- 建议在使用前备份代码或使用版本控制

**参数**：
- `description` (必填): **详细的** bug 描述，必须包含：
  - 问题现象（具体的错误表现）
  - 预期行为（应该如何工作）
  - 问题位置（文件路径、行号）
  - 相关代码片段
  - 根本原因（如果知道）
  - 修复建议（如果有）
  - 影响范围（可能影响的功能）
  - 相关文件（所有相关文件路径）
  - 测试用例（如何验证修复）
  - 上下文信息（背景资料）
- `cwd` (可选): 工作目录，默认当前目录
- `timeout` (可选): 超时时间（毫秒），默认 600000（10分钟）

**返回**：
- `terminalId`: 执行 Codex 的终端 ID
- `reportPath`: 修复报告的路径（`docs/codex-fix-TIMESTAMP.md`）
- `reportExists`: 报告是否成功生成
- `executionTime`: 执行时间
- `output`: Codex 的终端输出

**工作流程**：
1. AI 助手收集详细的 bug 信息
2. 调用此工具，传入详细描述
3. Codex 分析问题并修复代码
4. Codex 在 `docs/` 目录生成详细报告
5. AI 助手读取报告并向用户汇报

**报告内容**：
- 问题描述
- 修改的文件列表
- 每个文件的具体修改（修改前/修改后对比）
- 修改原因说明
- 测试建议
- 注意事项

**使用示例**：
```
用户：登录功能有 bug，用户名验证总是失败

AI 助手：
1. [查看相关文件，理解问题]
2. [调用 fix_bug_with_codex]
   {
     "description": "登录功能用户名验证存在 bug，具体表现：
     1. 问题现象：用户输入 'user_name' 时被拒绝
     2. 预期行为：应该接受包含下划线的用户名
     3. 问题位置：src/auth/login.ts 第 45 行
     4. 相关代码：const usernameRegex = /^[a-zA-Z0-9]{3,20}$/
     5. 根本原因：正则表达式不允许下划线
     ..."
   }
3. [等待 Codex 完成]
4. [读取报告] view("docs/codex-fix-2025-10-18T00-35-12.md")
5. [向用户汇报修复结果]
```

**前置要求**：
- 已安装 Codex CLI：`npm install -g @openai/codex-cli`
- 已配置 Codex 认证
- 项目中存在 `docs/` 目录

**最佳实践**：
- 提供尽可能详细的 bug 描述（描述越详细，修复质量越高）
- 在调用前先查看相关文件，理解问题
- 修复后务必运行测试验证
- 查看生成的报告了解具体修改
- 使用版本控制，便于回滚

## 🌐 Web 管理界面

### 功能特性
- 📊 **终端列表**：查看所有终端的状态、PID、Shell、工作目录等信息
- 🖥️ **实时终端**：使用 xterm.js 渲染终端输出，支持 ANSI 颜色
- ⚡ **实时更新**：WebSocket 推送，终端输出实时显示
- ⌨️ **交互操作**：直接在浏览器中发送命令
- 🎨 **VS Code 风格**：暗色主题，简洁美观
- 🔄 **自动端口**：支持多实例，自动避免端口冲突

### 快速使用
在 Claude 或其他 MCP 客户端中说：
```
请打开终端管理界面
```

或者直接运行测试脚本：
```bash
npm run test:webui
```

详细使用说明见 [Web UI 使用指南](docs/guides/WEB_UI_USAGE.md)。

## 🔌 REST API（可选）

如果需要 HTTP 接口，可启动 REST 版本：
```bash
npx persistent-terminal-mcp-rest
```

服务器默认监听 `3001` 端口（可配置），端点与 MCP 工具一一对应：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/terminals` | POST | 创建终端 |
| `/api/terminals` | GET | 列出所有终端 |
| `/api/terminals/:id` | GET | 获取终端详情 |
| `/api/terminals/:id` | DELETE | 终止终端 |
| `/api/terminals/:id/input` | POST | 发送命令 |
| `/api/terminals/:id/output` | GET | 读取输出 |
| `/api/terminals/:id/stats` | GET | 获取统计信息 |

## 📁 项目结构

```
persistent-terminal-mcp/
├── src/                    # TypeScript 源码
│   ├── index.ts           # MCP 服务器入口
│   ├── mcp-server.ts      # MCP 服务器实现
│   ├── terminal-manager.ts # 终端管理器
│   ├── output-buffer.ts   # 输出缓冲区
│   ├── web-ui-manager.ts  # Web UI 管理器
│   ├── web-ui-server.ts   # Web UI 服务器
│   ├── rest-server.ts     # REST API 服务器
│   ├── types.ts           # 类型定义
│   ├── __tests__/         # 单元测试
│   └── examples/          # 示例脚本
├── dist/                   # 编译后的 JavaScript
├── public/                 # Web UI 静态文件
├── docs/                   # 文档
│   ├── guides/            # 使用指南
│   ├── reference/         # 技术参考
│   ├── clients/           # 客户端配置
│   └── zh/                # 中文文档
├── tests/                  # 测试套件
│   └── integration/       # 集成测试
└── scripts/                # 辅助脚本
```

## 📚 文档导航

### 快速访问
- 📖 [完整文档索引](docs/README.md)
- 🚨 [修复文档索引](docs/reference/fixes/README.md)
- 🧪 [集成测试说明](tests/integration/README.md)
- 🌐 [Web UI 使用指南](docs/guides/WEB_UI_USAGE.md)

### 按分类
- **使用指南**：[使用说明](docs/guides/usage.md) | [故障排查](docs/guides/troubleshooting.md) | [MCP 配置](docs/guides/mcp-config.md)
- **技术参考**：[技术细节](docs/reference/technical-details.md) | [工具总结](docs/reference/tools-summary.md)
- **修复文档**：[Stdio 修复](docs/reference/fixes/STDIO_FIX.md) | [Cursor 修复](docs/reference/fixes/CURSOR_FIX_SUMMARY.md) | [终端修复](docs/reference/fixes/TERMINAL_FIXES.md)
- **客户端配置**：[Claude Desktop/Code](docs/clients/claude-code-setup.md)

## 🔍 重要说明

### Stdio 纯净性
本 MCP 服务器严格遵循 MCP 协议，确保 stdout 只包含 JSON-RPC 消息，所有日志输出到 stderr。这保证了与 Cursor 等严格客户端的完全兼容。详见 [Stdio 修复文档](docs/reference/fixes/STDIO_FIX.md)。

### Cursor 兼容性
完全兼容 Cursor 及其他要求严格 JSON-RPC 通信的 MCP 客户端。快速设置见 [快速修复指南](docs/reference/fixes/QUICK_FIX_GUIDE.md)。

### 终端交互
支持交互式应用（vim、npm create 等），正确处理 ANSI 转义序列。详见 [终端修复文档](docs/reference/fixes/TERMINAL_FIXES.md)。

### 输出稳定性
使用 `wait_for_output` 工具确保命令执行后获取完整输出，避免读取不完整的数据。

## 🧪 测试

### 运行测试
```bash
npm test                     # 运行所有单元测试
npm run test:integration     # 运行所有集成测试
npm run test:all            # 运行所有测试
```

### 集成测试
```bash
npm run test:integration:stdio      # Stdio 纯净性测试
npm run test:integration:cursor     # Cursor 场景测试
npm run test:integration:terminal   # 终端功能测试
```

## 🤝 贡献指南

欢迎提 Issue 或 PR！详细流程与代码规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。

### 贡献方式
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源许可

本项目以 [MIT 许可证](LICENSE) 发布。

## 🙏 致谢

- [node-pty](https://github.com/microsoft/node-pty) - 强大的 PTY 库
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP 协议规范
- [xterm.js](https://xtermjs.org/) - 优秀的终端模拟器

## 📞 支持

- 📖 查看 [文档](docs/README.md)
- 🐛 提交 [Issue](https://github.com/yourusername/node-pty/issues)
- 💬 参与 [讨论](https://github.com/yourusername/node-pty/discussions)

---

**最后更新**: 2025-10-08
**版本**: 1.0.1
