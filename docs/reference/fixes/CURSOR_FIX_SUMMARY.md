# Cursor 兼容性问题修复总结

## 问题现象

在 Cursor AI 编程工具中使用此 MCP 服务器时出现以下问题：

1. **JSON 解析错误**
   ```
   [error] Client error for command Unexpected token 'T', "Terminal c"... is not valid JSON
   ```

2. **Cursor 卡住**
   - 执行几个命令后 Cursor 会冻结
   - 无法继续使用 MCP 工具
   - 需要重启 Cursor 才能恢复

3. **工具调用失败**
   - `create_terminal` 等工具虽然显示成功，但实际上客户端无法正确解析响应

## 根本原因

**MCP 协议要求 stdio 通道的纯净性：**

- **stdout (标准输出)** 必须**只包含 JSON-RPC 消息**
- **stderr (标准错误)** 用于日志和调试信息
- 任何非 JSON 的输出都会导致客户端解析失败

**问题代码：**

我们的代码中使用了 `console.log()` 和 `console.error()` 输出日志，这些日志污染了 stdout 通道：

```typescript
// ❌ 错误的做法
console.log(`Terminal created: ${terminalId}`);
console.error('Error:', error);
```

## 修复方案

### 1. 统一使用 stderr 输出日志

```typescript
// ✅ 正确的做法
if (process.env.MCP_DEBUG === 'true') {
  process.stderr.write(`[MCP-DEBUG] Terminal created: ${terminalId}\n`);
}
```

### 2. 添加调试模式控制

通过 `MCP_DEBUG` 环境变量控制调试日志：

```bash
# 正常模式（无日志）
node dist/index.js

# 调试模式（日志输出到 stderr）
MCP_DEBUG=true node dist/index.js
```

### 3. 修复的文件

| 文件 | 修复内容 |
|------|---------|
| `src/index.ts` | 修改 log 函数、错误处理、异常捕获 |
| `src/mcp-server.ts` | 修改事件处理器、shutdown 方法 |
| `src/terminal-manager.ts` | 修改清理日志、shutdown 日志 |

## 测试验证

### 测试 1: Stdio 纯净性测试

```bash
node test-mcp-stdio.mjs
```

**结果：**
```
✅ 测试通过！stdout 通道纯净，只有 JSON-RPC 消息
收到的 JSON-RPC 消息数量: 2
收到的非 JSON 行数: 0
```

### 测试 2: Cursor 场景模拟

```bash
node test-cursor-scenario.mjs
```

**结果：**
```
✅ 所有测试通过！MCP 服务器工作正常，stdout 通道纯净
通过: 7
失败: 0
非 JSON 输出行数: 0
```

测试覆盖：
- ✅ 初始化连接
- ✅ 列出工具
- ✅ 创建终端
- ✅ 写入命令
- ✅ 读取输出
- ✅ 列出终端
- ✅ 终止终端

## 使用说明

### 在 Cursor 中配置

更新你的 MCP 配置文件（通常是 `mcp-config.toml` 或 Cursor 设置）：

```toml
[mcp_servers.persistent-terminal]
command = "node"
args = ["/path/to/node-pty/dist/index.js"]

[mcp_servers.persistent-terminal.env]
MAX_BUFFER_SIZE = "10000"
SESSION_TIMEOUT = "86400000"
# MCP_DEBUG = "true"  # 需要调试时取消注释
```

### 重新编译

修复后需要重新编译：

```bash
npm run build
```

### 验证修复

1. 重启 Cursor
2. 尝试使用 MCP 工具创建终端
3. 应该不再出现 JSON 解析错误
4. 可以正常执行多个命令而不会卡住

## 技术细节

### MCP 协议要求

根据 [MCP 规范](https://spec.modelcontextprotocol.io/specification/basic/transports/#stdio)：

> When using stdio transport, the server MUST only write JSON-RPC messages to stdout.
> All logging and debugging output MUST be written to stderr.

### 为什么使用 process.stderr.write()？

1. **console.error()** 在某些环境下可能输出到 stdout
2. **process.stderr.write()** 明确保证输出到 stderr
3. 更精确的控制，避免意外的格式化

### 日志格式

统一的日志前缀：

- `[MCP-DEBUG]` - 调试信息（仅在 MCP_DEBUG=true 时）
- `[MCP-ERROR]` - 错误信息（始终输出到 stderr）

## 影响范围

### ✅ 修复后的改进

- **完全兼容 Cursor**：不再出现 JSON 解析错误
- **符合 MCP 规范**：严格遵循 stdio 协议要求
- **保持调试能力**：通过环境变量灵活控制日志
- **向后兼容**：API 没有任何变化

### ✅ 无副作用

- 功能完全相同
- 性能没有影响
- 只是修复了日志输出方式

## 相关文档

- [STDIO_FIX.md](STDIO_FIX.md) - 详细的技术分析和修复说明
- [CHANGELOG.md](CHANGELOG.md) - 版本更新记录
- [README.md](README.md) - 项目说明（已更新）
- [README.zh-CN.md](README.zh-CN.md) - 中文说明（已更新）

## 总结

这次修复解决了 MCP 服务器在 Cursor 中使用时的关键兼容性问题。通过确保 stdout 通道只包含 JSON-RPC 消息，服务器现在可以：

1. ✅ 在 Cursor 中稳定运行
2. ✅ 符合 MCP 协议规范
3. ✅ 支持调试模式
4. ✅ 保持完全向后兼容

**修复已完成，可以在 Cursor 中正常使用了！** 🎉

