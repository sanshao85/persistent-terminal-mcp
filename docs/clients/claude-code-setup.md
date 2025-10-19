# Claude Code MCP 配置指南

> 💡 **Windows 用户**：命令行添加 MCP 时可能遇到 `-y` 参数解析问题。
> 请参考 `docs/clients/claude-code-windows.md` 获取专属的项目级与全局
> 配置教程。

## 📋 概述

Claude Code 支持两种方式配置 MCP 服务器：
1. **CLI 命令方式**（官方推荐，但不够灵活）
2. **直接编辑配置文件**（更灵活，推荐）

---

## 方法 1: 使用 CLI 命令（简单但不灵活）

### 基本命令

```bash
claude mcp add <server-name> <command> [args...]
```
### 示例：添加 Sequential Thinking

```bash
claude mcp add sequential-thinking npx -y @modelcontextprotocol/server-sequential-thinking
```
### 示例：添加 Playwright

```bash
claude mcp add playwright npx '@playwright/mcp@latest'
```
### 缺点

- ❌ 输入错误需要重新开始
- ❌ 无法一次性看到所有配置
- ❌ 难以复制粘贴复杂配置
- ❌ 修改配置需要重新输入所有参数

---

## 方法 2: 直接编辑配置文件（推荐）⭐

### 配置文件位置

#### Linux / WSL
```bash
~/.claude.json
# 或
/home/your-username/.claude.json
```

#### macOS
```bash
~/.claude.json
# 或
/Users/your-username/.claude.json
```

#### Windows
```bash
%USERPROFILE%\.claude.json
# 或
C:\Users\your-username\.claude.json
```

### 查找配置文件

```bash
# Linux/Mac/WSL
ls -la ~/.claude.json

# 或者搜索
find ~ -name ".claude.json" 2>/dev/null
```

---

## 配置文件结构

### 完整结构示例

```json
{
  "numStartups": 34,
  "autoUpdaterStatus": "enabled",
  "theme": "dark",
  "hasCompletedOnboarding": true,
  "projects": {
    "/path/to/your/project": {
      "allowedTools": [],
      "history": [],
      "mcpServers": {},
      "exampleFiles": []
    }
  },
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "command-to-run",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

### 重要说明

- `mcpServers` 对象包含所有 MCP 服务器配置
- 每个服务器有唯一的名称作为 key
- `type` 通常是 `"stdio"`
- `command` 是启动命令（如 `node`, `npx`, `python` 等）
- `args` 是命令参数数组
- `env` 是环境变量（可选）

---

## 添加 persistent-terminal MCP

### 配置示例

在 `~/.claude.json` 的 `mcpServers` 对象中添加：

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/admin/Desktop/node-pty/dist/index.js"
      ],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000"
      }
    }
  }
}
```

### 完整配置文件示例

```json
{
  "numStartups": 1,
  "autoUpdaterStatus": "enabled",
  "theme": "dark",
  "hasCompletedOnboarding": true,
  "mcpServers": {
    "persistent-terminal": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/admin/Desktop/node-pty/dist/index.js"
      ],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000"
      }
    }
  }
}
```

---

## 配置步骤

### 步骤 1: 构建项目

```bash
cd /Users/admin/Desktop/node-pty
npm run build
```

确保 `dist/index.js` 文件存在。

### 步骤 2: 找到配置文件

```bash
# Linux/Mac/WSL
nano ~/.claude.json

# 或使用你喜欢的编辑器
code ~/.claude.json
vim ~/.claude.json
```

### 步骤 3: 添加配置

在 `mcpServers` 对象中添加 persistent-terminal 配置：

```json
"persistent-terminal": {
  "type": "stdio",
  "command": "node",
  "args": [
    "/Users/admin/Desktop/node-pty/dist/index.js"
  ],
  "env": {
    "MAX_BUFFER_SIZE": "10000",
    "SESSION_TIMEOUT": "86400000"
  }
}
```

**注意：**
- 确保路径是绝对路径
- 使用你实际的项目路径
- JSON 格式要正确（注意逗号）

### 步骤 4: 保存并重启 Claude Code

```bash
# 退出 Claude Code
# 然后重新启动
claude
```

### 步骤 5: 验证配置

在 Claude Code 中运行：

```bash
/mcp
```

应该看到：

```
✔  Found 1 MCP server

• persistent-terminal: connected
```

---

## 多个 MCP 服务器配置示例

### 同时配置多个 MCP

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/admin/Desktop/node-pty/dist/index.js"
      ],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000"
      }
    },
    "sequential-thinking": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking"
      ]
    },
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ]
    }
  }
}
```

---

## 常见问题排查

### 问题 1: MCP 服务器未连接

**症状：**
```
✗ persistent-terminal: disconnected
```

**解决方案：**

1. **检查路径是否正确**
   ```bash
   ls -la /Users/admin/Desktop/node-pty/dist/index.js
   ```

2. **检查文件是否可执行**
   ```bash
   node /Users/admin/Desktop/node-pty/dist/index.js
   ```

3. **查看详细错误信息**
   ```bash
   claude --mcp-debug
   ```

4. **检查 JSON 格式**
   - 使用 JSON 验证器检查语法
   - 确保所有逗号、引号正确

### 问题 2: 找不到配置文件

**解决方案：**

```bash
# 创建配置文件
touch ~/.claude.json

# 添加基本结构
echo '{
  "mcpServers": {}
}' > ~/.claude.json
```

### 问题 3: 配置不生效

**解决方案：**

1. **完全退出 Claude Code**
   ```bash
   # 确保所有 Claude Code 进程都已关闭
   ps aux | grep claude
   ```

2. **重新启动**
   ```bash
   claude
   ```

3. **验证配置**
   ```bash
   /mcp
   ```

### 问题 4: 权限问题

**症状：**
```
Error: EACCES: permission denied
```

**解决方案：**

```bash
# 给配置文件正确的权限
chmod 600 ~/.claude.json

# 确保 MCP 服务器文件可执行
chmod +x /Users/admin/Desktop/node-pty/dist/index.js
```

---

## 使用 persistent-terminal MCP

### 验证工具可用

在 Claude Code 中：

```
请列出所有可用的 MCP 工具
```

应该看到 6 个工具：
- create_terminal
- write_terminal
- read_terminal
- get_terminal_stats
- list_terminals
- kill_terminal

### 测试基本功能

```
请使用 persistent-terminal 创建一个终端会话，然后执行 ls -la 命令
```

Claude Code 应该能够：
1. 调用 create_terminal 创建终端
2. 调用 write_terminal 发送命令
3. 调用 read_terminal 读取输出

---

## 项目级别配置 vs 全局配置

### 全局配置（推荐）

在 `~/.claude.json` 的顶层 `mcpServers` 中配置：

```json
{
  "mcpServers": {
    "persistent-terminal": { ... }
  }
}
```

**优点：**
- 所有项目都可以使用
- 只需配置一次

### 项目级别配置

在 `~/.claude.json` 的 `projects` 中配置：

```json
{
  "projects": {
    "/path/to/specific/project": {
      "mcpServers": {
        "persistent-terminal": { ... }
      }
    }
  }
}
```

**优点：**
- 可以为不同项目使用不同配置
- 更细粒度的控制

---

## 环境变量说明

### MAX_BUFFER_SIZE

- **含义：** 输出缓冲区最大行数
- **默认值：** 10000
- **建议值：** 10000 - 50000
- **说明：** 更大的值可以存储更多历史输出，但会占用更多内存

### SESSION_TIMEOUT

- **含义：** 会话超时时间（毫秒）
- **默认值：** 86400000（24 小时）
- **建议值：** 
  - 短期任务：3600000（1 小时）
  - 长期任务：86400000（24 小时）
  - 永久保持：0（不超时，不推荐）

---

## 完整配置模板

### 最小配置

**macOS / Linux：**

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "persistent-terminal-mcp"
      ]
    }
  }
}
```

**Windows：**

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "type": "stdio",
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "persistent-terminal-mcp"
      ]
    }
  }
}
```

> **提示**：若已全局安装 `persistent-terminal-mcp`，可将 `command`
>（或在 Windows 中将 `args`）修改为直接调用可执行文件，并删除 `-y` 参数。

### 完整配置

**macOS / Linux：**

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "persistent-terminal-mcp"
      ],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000"
      }
    }
  }
}
```

**Windows：**

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "type": "stdio",
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "persistent-terminal-mcp"
      ],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000"
      }
    }
  }
}
```

---

## 调试技巧

### 启用调试模式

```bash
claude --mcp-debug
```

### 查看 MCP 日志

```bash
# 在 Claude Code 中
/mcp

# 查看详细状态
/mcp status
```

### 测试 MCP 服务器

```bash
# 直接运行 MCP 服务器测试
npx -y persistent-terminal-mcp
```

如果服务器正常，应该等待输入（这是正常的，因为它是 stdio 模式）。

---

## 总结

### 推荐配置流程

1. ✅ 构建项目：`npm run build`
2. ✅ 找到配置文件：`~/.claude.json`
3. ✅ 添加配置（使用绝对路径）
4. ✅ 保存文件
5. ✅ 重启 Claude Code
6. ✅ 验证：`/mcp`
7. ✅ 测试工具

### 优势

- ✅ 完全可见的配置
- ✅ 易于备份和分享
- ✅ 支持版本控制
- ✅ 快速修改
- ✅ 支持复杂配置

### 注意事项

- ⚠️ 使用绝对路径
- ⚠️ 确保 JSON 格式正确
- ⚠️ 重启 Claude Code 后生效
- ⚠️ 检查文件权限

---

**配置完成后，你就可以在 Claude Code 中使用 persistent-terminal MCP 来执行长时间运行的命令了！** 🎉
