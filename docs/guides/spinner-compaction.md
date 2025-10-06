# Spinner 动画压缩功能

## 概述

在运行 `npm create vite@latest`、`yarn install` 等命令时，终端会输出大量的 spinner 动画帧（如 ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏），这些动画帧会占据大量的输出缓冲区，导致真实的日志信息被淹没。

Persistent Terminal MCP Server 提供了 **Spinner 动画压缩** 功能，可以自动识别并节流这些动画帧，让真实日志优先呈现。

## 功能特性

- ✅ 自动识别常见的 spinner 字符（Braille、圆圈、方块等）
- ✅ 节流动画更新，减少缓冲区占用
- ✅ 保留真实日志内容
- ✅ 支持 ANSI 转义序列
- ✅ 可配置的节流时间
- ✅ 可通过环境变量或参数控制开关

## 支持的 Spinner 类型

系统能够识别以下常见的 spinner 字符：

- **Braille spinners**: ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏
- **Circle spinners**: ◐ ◓ ◑ ◒
- **Quarter circle**: ◴ ◷ ◶ ◵
- **Box spinners**: ◰ ◳ ◲ ◱
- **Block spinners**: ▖ ▘ ▝ ▗
- **Classic ASCII**: | / - \
- **Dot spinners**: ● ○ ◉ ◎

## 配置方式

### 1. 环境变量配置

在 `mcp-config.toml` 或启动脚本中设置环境变量：

```toml
[mcp_servers.persistent-terminal.env]
# 启用/禁用动画压缩（默认: true）
COMPACT_ANIMATIONS = "true"

# 动画节流时间（毫秒，默认: 100）
ANIMATION_THROTTLE_MS = "100"

# 其他配置
MAX_BUFFER_SIZE = "10000"
SESSION_TIMEOUT = "86400000"
```

### 2. 代码配置

在创建 `TerminalManager` 时配置：

```typescript
import { TerminalManager } from 'persistent-terminal-mcp';

const manager = new TerminalManager({
  maxBufferSize: 10000,
  compactAnimations: true,        // 启用动画压缩
  animationThrottleMs: 100        // 节流时间 100ms
});
```

### 3. 运行时配置

通过 `OutputBuffer` 实例动态调整：

```typescript
const outputBuffer = manager.getOutputBuffer(terminalId);

// 启用压缩
outputBuffer.setCompactAnimations(true);

// 禁用压缩
outputBuffer.setCompactAnimations(false);

// 检查当前状态
const isEnabled = outputBuffer.getCompactAnimations();
```

## 工作原理

### 检测机制

1. **字符识别**: 系统维护一个 spinner 字符集，包含常见的动画字符
2. **行分析**: 当接收到新行时，分析其中 spinner 字符的占比
3. **阈值判断**: 如果可见字符中超过 30% 是 spinner 字符，则认为是动画行

### 节流机制

1. **缓冲累积**: 检测到 spinner 行后，不立即输出，而是累积计数
2. **定时刷新**: 每隔 `animationThrottleMs` 毫秒刷新一次
3. **强制刷新**: 遇到非 spinner 内容时立即刷新
4. **压缩表示**: 多个 spinner 更新会被压缩为 `[spinner ×N]` 或最后一帧

### 示例流程

**原始输出**（未压缩）:
```
⠋ Installing dependencies
⠙ Installing dependencies
⠹ Installing dependencies
⠸ Installing dependencies
⠼ Installing dependencies
⠴ Installing dependencies
⠦ Installing dependencies
⠧ Installing dependencies
✓ Dependencies installed
```

**压缩后输出**:
```
⠧ Installing dependencies
✓ Dependencies installed
```

或者：
```
[spinner ×8]
✓ Dependencies installed
```

## 使用示例

### 示例 1: 运行 npm 命令

```typescript
import { TerminalManager } from 'persistent-terminal-mcp';

const manager = new TerminalManager({
  compactAnimations: true,
  animationThrottleMs: 100
});

const terminalId = await manager.createTerminal();

// 运行 npm install
await manager.writeToTerminal({
  terminalId,
  input: 'npm install'
});

// 等待命令完成
await sleep(5000);

// 读取输出 - spinner 动画已被压缩
const result = await manager.readFromTerminal({ terminalId });
console.log(result.output);
```

### 示例 2: 对比压缩效果

```bash
# 运行测试脚本
npm run example:spinner

# 或者直接运行
tsx src/examples/test-spinner-compaction.ts
```

### 示例 3: MCP 工具调用

```json
{
  "tool": "read_terminal",
  "arguments": {
    "terminalId": "xxx-xxx-xxx",
    "stripSpinner": true
  }
}
```

## 性能影响

### 优势

- **减少缓冲区占用**: 大幅减少重复动画帧的存储
- **提高可读性**: 真实日志更容易被发现
- **降低 Token 消耗**: 对于 AI 模型，减少了无用的 token
- **保持实时感**: 仍然保留最后的动画状态

### 开销

- **CPU**: 每次字符处理增加少量字符检测开销（< 1%）
- **内存**: 额外存储 spinner 缓冲区（< 1KB）
- **延迟**: 动画更新延迟 100ms（可配置）

## 最佳实践

### 1. 根据场景选择配置

```typescript
// 开发环境 - 保留完整输出
const devManager = new TerminalManager({
  compactAnimations: false
});

// 生产环境 - 启用压缩
const prodManager = new TerminalManager({
  compactAnimations: true,
  animationThrottleMs: 100
});

// CI/CD 环境 - 更激进的压缩
const ciManager = new TerminalManager({
  compactAnimations: true,
  animationThrottleMs: 200
});
```

### 2. 监控输出质量

```typescript
const stats = await manager.getTerminalStats(terminalId);

if (stats.estimatedTokens > 8000) {
  console.log('⚠️  输出较大，建议启用压缩');
}
```

### 3. 处理特殊情况

```typescript
// 对于需要完整输出的场景，临时禁用压缩
outputBuffer.setCompactAnimations(false);
await runCommand();
outputBuffer.setCompactAnimations(true);
```

## 故障排除

### 问题 1: 真实日志被误判为 spinner

**症状**: 某些包含特殊字符的日志被压缩了

**解决方案**:
```typescript
// 降低 spinner 检测阈值（需要修改源码）
// 或者临时禁用压缩
outputBuffer.setCompactAnimations(false);
```

### 问题 2: 动画更新太慢

**症状**: spinner 看起来卡顿

**解决方案**:
```typescript
// 减少节流时间
const manager = new TerminalManager({
  compactAnimations: true,
  animationThrottleMs: 50  // 从 100ms 减少到 50ms
});
```

### 问题 3: 输出仍然很大

**症状**: 即使启用压缩，输出仍然占用大量空间

**解决方案**:
```typescript
// 结合使用 head-tail 模式
const result = await manager.readFromTerminal({
  terminalId,
  mode: 'head-tail',
  headLines: 50,
  tailLines: 50
});
```

## 测试

运行完整的测试套件：

```bash
# 运行所有测试
npm test

# 只运行 spinner 相关测试
npm test -- spinner-detection.test.ts

# 运行演示脚本
tsx src/examples/test-spinner-compaction.ts
```

## 相关配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `compactAnimations` | boolean | `true` | 是否启用动画压缩 |
| `animationThrottleMs` | number | `100` | 动画节流时间（毫秒） |
| `maxBufferSize` | number | `10000` | 最大缓冲区大小 |

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `COMPACT_ANIMATIONS` | `true` | 启用/禁用动画压缩 |
| `ANIMATION_THROTTLE_MS` | `100` | 动画节流时间 |

## 参考资料

- [OutputBuffer 源码](../../src/output-buffer.ts)
- [TerminalManager 源码](../../src/terminal-manager.ts)
- [测试用例](../../src/__tests__/spinner-detection.test.ts)
- [演示脚本](../../src/examples/test-spinner-compaction.ts)

