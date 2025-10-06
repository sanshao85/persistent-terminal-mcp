# MCP Stdio 通道纯净性修复

## 问题描述

在 Cursor 等 MCP 客户端中使用此 MCP 服务器时，会出现以下错误：

```
[error] Client error for command Unexpected token 'T', "Terminal c"... is not valid JSON
```

这个错误会导致：
- Cursor 无法正确解析 MCP 服务器的响应
- 执行几个命令后 Cursor 会卡住
- MCP 工具调用失败

## 根本原因

MCP 协议使用 **stdio (标准输入/输出)** 进行 JSON-RPC 通信。这要求：

1. **stdout (标准输出)** 必须**只包含纯净的 JSON-RPC 消息**
2. 任何日志、调试信息都应该输出到 **stderr (标准错误)**
3. 不能有任何非 JSON 格式的文本污染 stdout

### 问题代码位置

修复前，以下位置存在问题：

1. **src/index.ts**
   - `console.error()` 在某些情况下会输出到 stdout
   - 错误处理中的日志输出

2. **src/mcp-server.ts**
   - `setupEventHandlers()` 中使用 `console.log()` 输出事件日志
   - `shutdown()` 中使用 `console.log()` 输出关闭信息

3. **src/terminal-manager.ts**
   - `cleanupTimeoutSessions()` 中使用 `console.log()`
   - `shutdown()` 中使用 `console.log()` 和 `console.error()`

## 修复方案

### 1. 统一日志输出策略

所有日志输出都改为使用 `process.stderr.write()`，确保不污染 stdout：

```typescript
// 修复前
console.log('Terminal created:', terminalId);
console.error('Error:', error);

// 修复后
if (process.env.MCP_DEBUG === 'true') {
  process.stderr.write(`[MCP-DEBUG] Terminal created: ${terminalId}\n`);
}
process.stderr.write(`[MCP-ERROR] Error: ${error}\n`);
```

### 2. 调试模式控制

通过环境变量 `MCP_DEBUG` 控制调试日志的输出：

```typescript
function log(message: string) {
  if (process.env.MCP_DEBUG === 'true') {
    process.stderr.write(`[MCP-DEBUG] ${message}\n`);
  }
}
```

### 3. 修复的文件

#### src/index.ts
- ✅ 修改 `log()` 函数使用 `process.stderr.write()`
- ✅ 修改错误处理中的日志输出
- ✅ 修改未捕获异常的日志输出

#### src/mcp-server.ts
- ✅ 修改 `setupEventHandlers()` 中的所有日志输出
- ✅ 修改 `shutdown()` 中的日志输出
- ✅ 添加 `MCP_DEBUG` 环境变量检查

#### src/terminal-manager.ts
- ✅ 修改 `cleanupTimeoutSessions()` 中的日志输出
- ✅ 修改 `shutdown()` 中的所有日志输出

## 测试验证

### 测试 1: Stdio 通道纯净性测试

运行 `test-mcp-stdio.mjs` 验证 stdout 只包含 JSON-RPC 消息：

```bash
node test-mcp-stdio.mjs
```

**预期结果：**
```
✅ 测试通过！stdout 通道纯净，只有 JSON-RPC 消息
收到的 JSON-RPC 消息数量: 2
收到的非 JSON 行数: 0
```

### 测试 2: Cursor 使用场景测试

运行 `test-cursor-scenario.mjs` 模拟 Cursor 的实际使用场景：

```bash
node test-cursor-scenario.mjs
```

**预期结果：**
```
✅ 所有测试通过！MCP 服务器工作正常，stdout 通道纯净
通过: 7
失败: 0
非 JSON 输出行数: 0
```

测试覆盖的操作：
1. ✅ 初始化连接
2. ✅ 列出可用工具
3. ✅ 创建终端
4. ✅ 写入命令
5. ✅ 读取输出
6. ✅ 列出所有终端
7. ✅ 终止终端

## 使用说明

### 正常模式（生产环境）

默认情况下，服务器不会输出任何调试日志：

```bash
node dist/index.js
```

### 调试模式

如果需要查看调试日志，设置 `MCP_DEBUG=true`：

```bash
MCP_DEBUG=true node dist/index.js
```

调试日志会输出到 stderr，不会影响 MCP 通信。

### 在 Cursor 中使用

更新 `mcp-config.toml` 或 Cursor 的 MCP 配置：

```toml
[mcp_servers.persistent-terminal]
command = "node"
args = ["/path/to/node-pty/dist/index.js"]

[mcp_servers.persistent-terminal.env]
MAX_BUFFER_SIZE = "10000"
SESSION_TIMEOUT = "86400000"
# MCP_DEBUG = "true"  # 取消注释以启用调试模式
```

## 技术细节

### 为什么使用 process.stderr.write() 而不是 console.error()？

1. **console.error()** 在某些环境下可能会输出到 stdout
2. **process.stderr.write()** 明确保证输出到 stderr
3. 更精确的控制，避免意外的格式化或缓冲问题

### 日志格式

所有日志都使用统一的前缀：

- `[MCP-DEBUG]` - 调试信息（仅在 MCP_DEBUG=true 时输出）
- `[MCP-ERROR]` - 错误信息（始终输出到 stderr）

### MCP 协议要求

根据 MCP (Model Context Protocol) 规范：

> When using stdio transport, the server MUST only write JSON-RPC messages to stdout.
> All logging and debugging output MUST be written to stderr.

参考：https://spec.modelcontextprotocol.io/specification/basic/transports/#stdio

## 影响范围

### 修复后的改进

✅ **兼容性**
- 完全兼容 Cursor 和其他严格的 MCP 客户端
- 符合 MCP 协议规范

✅ **稳定性**
- 不会因为日志输出导致 JSON 解析错误
- 不会卡住客户端

✅ **可调试性**
- 保留了调试日志功能
- 通过环境变量灵活控制

### 向后兼容性

✅ **完全向后兼容**
- API 没有任何变化
- 功能完全相同
- 只是修复了日志输出方式

## 总结

这次修复解决了 MCP 服务器在 Cursor 等客户端中使用时的关键问题。通过确保 stdout 通道的纯净性，服务器现在可以：

1. ✅ 在 Cursor 中正常工作，不会卡住
2. ✅ 符合 MCP 协议规范
3. ✅ 保持良好的调试能力
4. ✅ 提供稳定可靠的服务

## 相关文件

- `src/index.ts` - 主入口文件
- `src/mcp-server.ts` - MCP 服务器实现
- `src/terminal-manager.ts` - 终端管理器
- `test-mcp-stdio.mjs` - Stdio 纯净性测试
- `test-cursor-scenario.mjs` - Cursor 场景测试

