# Spinner 压缩功能快速入门

## 问题场景

当你运行 `npm create vite@latest` 或 `npm install` 时，终端会输出大量的 spinner 动画：

```
⠋ Installing dependencies
⠙ Installing dependencies
⠹ Installing dependencies
⠸ Installing dependencies
⠼ Installing dependencies
⠴ Installing dependencies
⠦ Installing dependencies
⠧ Installing dependencies
⠇ Installing dependencies
⠏ Installing dependencies
```

这些动画帧会占据大量的输出缓冲区，导致：
- 真实的日志信息被淹没
- 缓冲区快速填满
- AI 模型消耗大量无用的 token
- 难以找到关键信息

## 解决方案

Persistent Terminal 自动检测并压缩这些 spinner 动画，只保留最后的状态或压缩表示。

## 快速开始

### 1. 默认配置（推荐）

默认情况下，spinner 压缩已启用，无需任何配置：

```typescript
import { TerminalManager } from 'persistent-terminal-mcp';

const manager = new TerminalManager();
const terminalId = await manager.createTerminal();

// 运行会产生 spinner 的命令
await manager.writeToTerminal({
  terminalId,
  input: 'npm install'
});

// 等待完成
await sleep(5000);

// 读取输出 - spinner 已被压缩
const result = await manager.readFromTerminal({ terminalId });
console.log(result.output);
```

### 2. 自定义配置

如果需要调整压缩行为：

```typescript
const manager = new TerminalManager({
  compactAnimations: true,      // 启用压缩（默认）
  animationThrottleMs: 100      // 节流时间 100ms（默认）
});
```

### 3. 环境变量配置

在 `mcp-config.toml` 中配置：

```toml
[mcp_servers.persistent-terminal.env]
COMPACT_ANIMATIONS = "true"
ANIMATION_THROTTLE_MS = "100"
```

### 4. 禁用压缩

如果你需要看到完整的动画输出：

```typescript
// 方式 1: 创建时禁用
const manager = new TerminalManager({
  compactAnimations: false
});

// 方式 2: 运行时禁用
const outputBuffer = manager.getOutputBuffer(terminalId);
outputBuffer.setCompactAnimations(false);

// 方式 3: 环境变量
// COMPACT_ANIMATIONS=false
```

## 效果对比

### 未压缩（原始输出）

```
⠋ Installing dependencies
⠙ Installing dependencies
⠹ Installing dependencies
⠸ Installing dependencies
⠼ Installing dependencies
⠴ Installing dependencies
⠦ Installing dependencies
⠧ Installing dependencies
⠇ Installing dependencies
⠏ Installing dependencies
✓ Dependencies installed
```

**行数**: 11 行  
**Token 估算**: ~50 tokens

### 已压缩（优化输出）

```
⠏ Installing dependencies
✓ Dependencies installed
```

或者：

```
[spinner ×10]
✓ Dependencies installed
```

**行数**: 2 行  
**Token 估算**: ~10 tokens  
**节省**: 80% 的行数和 token

## 常见场景

### npm/yarn/pnpm 安装

```bash
npm install
yarn install
pnpm install
```

✅ 自动压缩 spinner  
✅ 保留安装日志  
✅ 保留错误信息

### 构建工具

```bash
npm run build
vite build
webpack
```

✅ 压缩构建进度  
✅ 保留构建输出  
✅ 保留警告和错误

### 长时间运行的任务

```bash
npm create vite@latest
npx create-react-app my-app
```

✅ 压缩初始化动画  
✅ 保留用户交互提示  
✅ 保留最终结果

## 验证效果

运行测试脚本查看效果：

```bash
# 运行演示
npm run example:spinner

# 运行测试
npm run test:spinner
```

## 调优建议

### 场景 1: 快速命令

对于执行时间 < 1 秒的命令，可以禁用压缩：

```typescript
outputBuffer.setCompactAnimations(false);
await runQuickCommand();
outputBuffer.setCompactAnimations(true);
```

### 场景 2: 长时间任务

对于执行时间 > 1 分钟的任务，可以增加节流时间：

```typescript
const manager = new TerminalManager({
  compactAnimations: true,
  animationThrottleMs: 200  // 增加到 200ms
});
```

### 场景 3: 调试模式

调试时可能需要看到完整输出：

```typescript
if (process.env.DEBUG) {
  manager = new TerminalManager({
    compactAnimations: false
  });
}
```

## 故障排除

### 问题: 重要信息被压缩了

**原因**: 某些日志包含 spinner 字符但不是动画

**解决**:
```typescript
// 临时禁用压缩
outputBuffer.setCompactAnimations(false);
```

### 问题: 压缩效果不明显

**原因**: 节流时间太短

**解决**:
```typescript
const manager = new TerminalManager({
  animationThrottleMs: 200  // 增加节流时间
});
```

### 问题: 动画看起来卡顿

**原因**: 节流时间太长

**解决**:
```typescript
const manager = new TerminalManager({
  animationThrottleMs: 50  // 减少节流时间
});
```

## 下一步

- 阅读[完整文档](spinner-compaction.md)了解更多细节
- 查看[测试用例](../../src/__tests__/spinner-detection.test.ts)了解实现
- 运行[演示脚本](../../src/examples/test-spinner-compaction.ts)查看效果

## 相关链接

- [Spinner Compaction 完整指南](spinner-compaction.md)
- [OutputBuffer API 文档](../reference/output-buffer.md)
- [TerminalManager API 文档](../reference/terminal-manager.md)

