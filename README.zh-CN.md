# Persistent Terminal MCP Server

一个基于 TypeScript 的 Model Context Protocol (MCP) 服务器，实现了持久化终端会话管理。借助 [`node-pty`](https://github.com/microsoft/node-pty)，即使客户端断开连接，终端命令也会继续运行，特别适合 Claude、GPT 等 AI 助手执行长时间任务。

## 主要特性
- **持久化 PTY 会话**：创建、复用、终止长期运行的 Shell
- **智能输出缓冲**：支持增量读取、head/tail/head-tail 模式，并估算 token 数量
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

### 示例脚本
```bash
npm run example:basic        # 演示创建 → 写入 → 读取 → 终止
npm run example:smart        # 展示 head/tail/head-tail 智能读取
npm run test:tools           # 全量验证所有 MCP 工具
npm run test:fixes           # 针对关键修复的回归测试
```

## MCP 工具一览
| 工具 | 作用 |
|------|------|
| `create_terminal` | 创建持久终端（支持 `env`、`shell`、`cwd` 等参数） |
| `create_terminal_basic` | 精简版创建入口，适配参数受限的客户端 |
| `write_terminal` | 向终端写入命令；若缺少换行会自动补全 |
| `read_terminal` | 读取缓冲输出，支持智能截断策略 |
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
scripts/             → 本地调试用脚本
src/                 → TypeScript 源码（MCP、REST、示例）
dist/                → 编译后的 JavaScript 产物
```

### 文档导航
所有使用说明、排错指南、技术细节及中文版教程均收录在 [`docs/`](docs/README.md)。主要入口：
- `docs/guides/usage.md` – AI 使用指南
- `docs/guides/troubleshooting.md` – 常见故障排查
- `docs/clients/claude-code-setup.md` – Claude Desktop / Claude Code 配置说明
- `docs/reference/technical-details.md` – 技术架构与实现细节
- `docs/zh/` – 中文快速开始、提示词合集、测试反馈

## 贡献指南
欢迎提 Issue 或 PR！详细流程与代码规范见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## 开源许可
本项目以 [MIT 许可证](LICENSE) 发布。
