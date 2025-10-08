# Web UI 使用指南

## 概述

Web UI 是一个基于浏览器的终端管理界面，提供可视化的方式来管理所有终端会话。

## 启动 Web UI

### 方法 1: 通过 MCP 工具（推荐）

在 Claude Desktop 或其他 MCP 客户端中，使用 `open_terminal_ui` 工具：

```
请打开终端管理界面
```

或者更具体地：

```
使用 open_terminal_ui 工具，端口 3002，自动打开浏览器
```

工具参数：
- `port` (可选): 指定端口号，默认从 3002 开始自动查找
- `autoOpen` (可选): 是否自动打开浏览器，默认 true

### 方法 2: 直接运行测试脚本

```bash
npm run test:webui
```

这会：
1. 创建一个终端管理器
2. 创建 2 个测试终端
3. 启动 Web UI（端口 3002）
4. 自动打开浏览器

### 方法 3: 在代码中使用

```typescript
import { WebUIManager } from './web-ui-manager.js';
import { TerminalManager } from './terminal-manager.js';

const terminalManager = new TerminalManager();
const webUiManager = new WebUIManager();

const result = await webUiManager.start({
  port: 3002,
  autoOpen: true,
  terminalManager
});

console.log(`Web UI 已启动: ${result.url}`);
```

---

## 功能介绍

### 1. 终端列表页面

访问 `http://localhost:3002/` 查看所有终端。

**功能**：
- 📊 **统计信息**: 显示总终端数和活跃终端数
- 📋 **终端卡片**: 每个终端显示：
  - Terminal ID（点击可复制）
  - PID、Shell 类型、工作目录
  - 创建时间、最后活动时间
  - 状态标签（active/inactive/terminated）
- 🔄 **刷新**: 手动刷新终端列表
- ➕ **创建终端**: 创建新的终端会话

**操作**：
- 点击 **Open** 按钮查看终端详情
- 点击 **Kill** 按钮终止终端
- 点击 **+ New Terminal** 创建新终端

### 2. 终端详情页面

访问 `http://localhost:3002/terminal/{terminalId}` 查看特定终端。

**功能**：
- 🖥️ **终端输出**: 使用 xterm.js 渲染，支持 ANSI 颜色
- ⚡ **实时更新**: WebSocket 推送，输出实时显示
- ⌨️ **命令输入**: 在输入框中输入命令并发送
- 📊 **终端信息**: 显示 PID、Shell、工作目录、创建时间
- 🎨 **状态标签**: 实时显示终端状态

**操作**：
- 在输入框中输入命令，按 Enter 或点击 **Send** 发送
- 点击 **Clear** 清空终端显示（不影响实际输出）
- 点击 **Kill Terminal** 终止终端
- 点击 **← Back to List** 返回列表页面

### 3. 创建新终端

点击 **+ New Terminal** 按钮，在弹出的对话框中：

**可选参数**：
- **Shell**: 指定 shell 类型（如 `/bin/bash`、`/bin/zsh`）
- **Working Directory**: 指定工作目录

留空则使用系统默认值。

---

## 实时功能

### WebSocket 实时推送

Web UI 使用 WebSocket 实现实时更新，无需手动刷新：

- ✅ 终端输出实时显示
- ✅ 终端状态变化自动更新
- ✅ 新终端创建自动显示
- ✅ 终端终止自动反映

如果 WebSocket 断开，会自动重连。

---

## 多实例支持

### 端口冲突处理

当多个 AI 客户端（如 Claude + Cursor）同时使用时，Web UI 会自动处理端口冲突：

1. 第一个实例使用端口 3002
2. 第二个实例自动使用端口 3003
3. 以此类推（最多尝试 100 个端口）

每个实例的 Web UI 是独立的，只管理自己的终端。

### 查看当前端口

调用 `open_terminal_ui` 工具时，会返回实际使用的端口：

```
Terminal UI started successfully!

🌐 URL: http://localhost:3003
📡 Port: 3003
📊 Mode: new
```

---

## 常见问题

### Q: 浏览器没有自动打开怎么办？

A: 手动复制返回的 URL 在浏览器中打开。或者在调用工具时设置 `autoOpen: false`。

### Q: 端口被占用怎么办？

A: Web UI 会自动查找下一个可用端口（3002-3101）。如果所有端口都被占用，会返回错误。

### Q: WebSocket 连接失败怎么办？

A: 检查：
1. Web 服务器是否正常运行
2. 浏览器控制台是否有错误
3. 防火墙是否阻止了连接

页面会自动尝试重连。

### Q: 终端输出显示不正常？

A: xterm.js 支持大部分 ANSI 转义序列，但某些特殊应用可能显示异常。这不影响实际终端功能。

### Q: 如何关闭 Web UI？

A: 
- 如果通过测试脚本启动：按 Ctrl+C
- 如果通过 MCP 工具启动：关闭 MCP 服务器时会自动清理

---

## 技术细节

### 架构

```
Browser
  ↓ HTTP
Web UI Server (Express)
  ↓ WebSocket
Terminal Manager
  ↓
PTY Processes
```

### API 端点

- `GET /` - 终端列表页面
- `GET /terminal/:id` - 终端详情页面
- `GET /api/terminals` - 获取所有终端
- `GET /api/terminals/:id` - 获取终端详情
- `POST /api/terminals` - 创建终端
- `GET /api/terminals/:id/output` - 读取终端输出
- `POST /api/terminals/:id/input` - 发送命令
- `DELETE /api/terminals/:id` - 终止终端
- `GET /api/terminals/:id/stats` - 获取统计信息

### WebSocket 消息格式

```json
{
  "type": "output",
  "terminalId": "xxx",
  "data": "terminal output..."
}

{
  "type": "exit",
  "terminalId": "xxx"
}

{
  "type": "terminal_created",
  "terminalId": "xxx"
}
```

---

## 安全性

- Web UI 只监听 `127.0.0.1`（本地访问）
- 不需要认证（因为只能本地访问）
- 如需远程访问，建议使用 SSH 隧道

---

## 性能优化

- 输出节流：避免高频更新导致卡顿
- 按需加载：只加载当前查看的终端输出
- WebSocket 推送：减少轮询开销

---

## 下一步

- 查看 [Web UI 功能文档](../features/WEB_UI_FEATURE.md) 了解技术细节
- 查看 [API 文档](../reference/API.md) 了解 REST API
- 查看 [故障排查指南](TROUBLESHOOTING.md) 解决问题

