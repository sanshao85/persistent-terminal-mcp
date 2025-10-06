# 集成测试

本目录包含 MCP 服务器的集成测试脚本。

## 测试脚本

### 1. test-mcp-stdio.mjs
**Stdio 通道纯净性测试**

验证 MCP 服务器的 stdout 只包含 JSON-RPC 消息，没有日志污染。

**运行：**
```bash
node tests/integration/test-mcp-stdio.mjs
```

**测试内容：**
- ✅ 启动 MCP 服务器
- ✅ 发送初始化请求
- ✅ 发送 tools/list 请求
- ✅ 验证所有响应都是有效的 JSON-RPC
- ✅ 验证没有非 JSON 输出

**预期结果：**
```
✅ 测试通过！stdout 通道纯净，只有 JSON-RPC 消息
收到的 JSON-RPC 消息数量: 2
收到的非 JSON 行数: 0
```

---

### 2. test-cursor-scenario.mjs
**Cursor 使用场景测试**

模拟 Cursor 实际使用 MCP 服务器的完整场景。

**运行：**
```bash
node tests/integration/test-cursor-scenario.mjs
```

**测试内容：**
1. ✅ 初始化连接
2. ✅ 列出可用工具
3. ✅ 创建终端
4. ✅ 写入命令
5. ✅ 读取输出
6. ✅ 列出所有终端
7. ✅ 终止终端

**预期结果：**
```
✅ 所有测试通过！MCP 服务器工作正常，stdout 通道纯净
通过: 7
失败: 0
非 JSON 输出行数: 0
```

---

### 3. test-terminal-fixes.mjs
**终端修复验证测试**

验证终端交互问题的修复是否有效。

**运行：**
```bash
node tests/integration/test-terminal-fixes.mjs
```

**测试内容：**
1. ✅ 基本命令执行
   - 验证命令能正确执行
   - 验证输出包含命令回显
   - 验证输出包含执行结果

2. ✅ 多个命令执行
   - 验证连续执行多个命令
   - 验证所有输出都被捕获

3. ✅ 原始输入
   - 验证 `appendNewline: false` 功能
   - 验证手动发送换行符

4. ✅ 输出实时读取
   - 验证输出能实时更新
   - 验证多次读取能获取最新内容

5. ✅ 终端环境配置
   - 验证 TERM 环境变量正确设置
   - 验证支持 ANSI 转义序列

**预期结果：**
```
✅ 所有测试通过！
通过: 6
失败: 0
```

---

## 运行所有测试

### 快速运行
```bash
# 在项目根目录
npm run build
node tests/integration/test-mcp-stdio.mjs
node tests/integration/test-cursor-scenario.mjs
node tests/integration/test-terminal-fixes.mjs
```

### 使用脚本
创建一个运行所有测试的脚本：

```bash
#!/bin/bash
# run-all-integration-tests.sh

echo "运行集成测试..."
echo ""

echo "1. Stdio 纯净性测试"
node tests/integration/test-mcp-stdio.mjs
if [ $? -ne 0 ]; then
  echo "❌ Stdio 测试失败"
  exit 1
fi
echo ""

echo "2. Cursor 场景测试"
node tests/integration/test-cursor-scenario.mjs
if [ $? -ne 0 ]; then
  echo "❌ Cursor 场景测试失败"
  exit 1
fi
echo ""

echo "3. 终端修复测试"
node tests/integration/test-terminal-fixes.mjs
if [ $? -ne 0 ]; then
  echo "❌ 终端修复测试失败"
  exit 1
fi
echo ""

echo "✅ 所有集成测试通过！"
```

---

## 测试环境要求

### 系统要求
- Node.js 16+
- macOS / Linux / Windows

### 依赖
```bash
npm install
npm run build
```

### 环境变量
测试默认使用以下配置：
- `MCP_DEBUG=false` - 关闭调试日志
- 其他环境变量使用默认值

---

## 故障排查

### 测试失败？

**1. 确保已编译**
```bash
npm run build
```

**2. 检查依赖**
```bash
npm install
```

**3. 查看详细日志**
```bash
MCP_DEBUG=true node tests/integration/test-xxx.mjs
```

**4. 单独运行失败的测试**
```bash
node tests/integration/test-xxx.mjs
```

### 常见问题

**Q: 测试超时？**
A: 检查是否有其他进程占用端口或资源

**Q: JSON 解析错误？**
A: 确保已应用 Stdio 修复，重新编译

**Q: 终端命令不执行？**
A: 确保已应用终端修复，检查 PTY 配置

---

## 添加新测试

### 测试模板

```javascript
#!/usr/bin/env node

import { TerminalManager } from '../../dist/terminal-manager.js';

console.log('测试名称');
console.log('='.repeat(80));

const manager = new TerminalManager();
let testsPassed = 0;
let testsFailed = 0;

async function testSomething() {
  try {
    // 测试逻辑
    console.log('✅ 测试通过');
    testsPassed++;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    testsFailed++;
  }
}

async function runTests() {
  await testSomething();
  
  console.log('\n测试结果:');
  console.log(`通过: ${testsPassed}`);
  console.log(`失败: ${testsFailed}`);
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
```

---

## 持续集成

这些测试可以集成到 CI/CD 流程中：

```yaml
# .github/workflows/test.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: node tests/integration/test-mcp-stdio.mjs
      - run: node tests/integration/test-cursor-scenario.mjs
      - run: node tests/integration/test-terminal-fixes.mjs
```

---

## 相关文档

- [../../docs/reference/fixes/](../../docs/reference/fixes/) - 修复文档
- [../../CHANGELOG.md](../../CHANGELOG.md) - 更新日志
- [../../README.md](../../README.md) - 项目说明

---

**最后更新：** 2025-10-06

