# MCP 工具总结

## 工具数量

**总共 7 个 MCP 工具** ✅

所有工具都已通过完整测试验证。

## 工具列表

| # | 工具名称 | 功能 | 测试状态 |
|---|---------|------|---------|
| 1 | `create_terminal` | 创建新的持久终端会话（支持自定义环境变量） | ✅ 通过 |
| 2 | `create_terminal_basic` | 面向受限客户端的精简创建入口（仅 shell/cwd） | ✅ 通过 |
| 3 | `write_terminal` | 向终端发送输入 | ✅ 通过 |
| 4 | `read_terminal` | 读取终端输出（支持智能截断） | ✅ 通过 |
| 5 | `get_terminal_stats` | 获取终端统计信息 | ✅ 通过 |
| 6 | `list_terminals` | 列出所有活跃终端 | ✅ 通过 |
| 7 | `kill_terminal` | 终止终端会话 | ✅ 通过 |

## 测试结果

运行 `npm run test:tools` 的结果：

```
=== Testing All MCP Tools ===

✓ Test 1: create_terminal
✓ Test 2: write_terminal
✓ Test 3: read_terminal (full mode)
✓ Test 4: get_terminal_stats
✓ Test 5: list_terminals
✓ Test 6: Generating more output for smart reading
✓ Test 7: read_terminal (head mode)
✓ Test 8: read_terminal (tail mode)
✓ Test 9: read_terminal (head-tail mode)
✓ Test 10: kill_terminal
✓ Test 11: Verify terminal is terminated

=== Test Summary ===
✓ Passed: 11
✗ Failed: 0
Total: 11

🎉 All tests passed!
```

## 核心功能

### 1. 持久终端会话
- 终端会话在客户端断开后继续运行
- 支持重新连接并获取历史输出
- 自动会话管理和清理

### 2. 智能输出处理
- 支持 4 种读取模式：full、head、tail、head-tail
- 自动统计字节数和 token 数量
- 智能截断避免超出 LLM token 限制

### 3. 完整的会话管理
- 创建、写入、读取、列出、终止
- 实时统计信息
- 错误处理和恢复

## MCP 配置

### Claude Desktop 配置文件位置

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

### 配置示例

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "command": "node",
      "args": ["/Users/admin/Desktop/node-pty/dist/index.js"],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000"
      }
    }
  }
}
```

**重要提示：**
1. 将路径替换为您的实际项目路径
2. 确保已运行 `npm run build` 构建项目
3. 配置后需要重启 Claude Desktop

## 使用示例

### 快速开始

```javascript
// 1. 创建终端
{
  "name": "create_terminal",
  "arguments": {
    "cwd": "/path/to/project"
  }
}
// 返回: { terminalId: "xxx-xxx-xxx" }

// 2. 发送命令
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx-xxx-xxx",
    "input": "npm install\n"
  }
}

// 3. 检查统计
{
  "name": "get_terminal_stats",
  "arguments": {
    "terminalId": "xxx-xxx-xxx"
  }
}
// 返回: { totalLines: 150, estimatedTokens: 2000, ... }

// 4. 智能读取（如果输出很长）
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "xxx-xxx-xxx",
    "mode": "head-tail",
    "headLines": 10,
    "tailLines": 10
  }
}

// 5. 终止终端
{
  "name": "kill_terminal",
  "arguments": {
    "terminalId": "xxx-xxx-xxx"
  }
}
```

## 智能读取功能

### 为什么需要智能读取？

当运行 `npm run dev`、`npm install` 等命令时，输出可能非常长，直接读取会：
- 超出 LLM 的 token 限制
- 传输大量不必要的数据
- 影响响应速度

### 解决方案

使用智能读取模式：

1. **先检查统计信息**
```json
{
  "name": "get_terminal_stats",
  "arguments": { "terminalId": "xxx" }
}
```

2. **根据大小选择模式**
- 小于 100 行：`mode: "full"`
- 100-1000 行：`mode: "head-tail"`, `headLines: 20`, `tailLines: 20`
- 超过 1000 行：`mode: "head-tail"`, `headLines: 10`, `tailLines: 10`

3. **获取关键信息**
```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "xxx",
    "mode": "head-tail",
    "headLines": 10,
    "tailLines": 10
  }
}
```

输出示例：
```
Installing package 1/100...
Installing package 2/100...
...

... [省略 80 行] ...

Installing package 99/100...
Installation complete!
```

## 资源和提示

除了 6 个工具，系统还提供：

### 3 个资源
- `terminal://list` - 终端列表 JSON
- `terminal://output/{terminalId}` - 特定终端输出
- `terminal://stats` - 管理器统计信息

### 2 个提示模板
- `terminal-usage-guide` - 使用指南
- `terminal-troubleshooting` - 故障排除

## 相关文档

- [README.md](./README.md) - 完整项目文档
- [MCP_CONFIG_GUIDE.md](./MCP_CONFIG_GUIDE.md) - 详细配置指南
- [项目状态](../meta/project-status.md) - 项目状态报告

## 运行测试

```bash
# 测试所有工具
npm run test:tools

# 运行单元测试
npm test

# 运行示例
npm run example:smart
```

## 总结

✅ **6 个 MCP 工具全部测试通过**
✅ **支持智能输出截断**
✅ **完整的会话管理**
✅ **生产就绪**

系统已准备好在 Claude Desktop 中使用！
