# Codex Bug Fix Tool

## 概述

`fix_bug_with_codex` 是 persistent-terminal-mcp 项目中集成的一个强大工具，它允许 AI 助手（如 Claude、GPT-4）通过 OpenAI Codex CLI 自动修复代码中的 Bug。

## 核心特性

### 1. 完全自动化
- **沙箱模式**：`danger-full-access`（无任何限制）
- **审批模式**：`never`（完全自动化，无需人工批准）
- **执行模式**：非交互式（`codex exec`）

### 2. 文档驱动
- AI 的 Bug 描述保存到 MD 文档：`docs/codex-bug-description-TIMESTAMP.md`
- Codex 从 MD 文档读取问题描述
- Codex 生成详细修复报告：`docs/codex-fix-TIMESTAMP.md`
- 所有文档永久保存，便于审计和调试

### 3. 智能等待
- 自动检测 Codex 执行完成
- 默认超时：10 分钟（可配置）
- 智能输出稳定性检测

## 工作流程

```
AI 助手（如 Claude）
    ↓
调用 fix_bug_with_codex({ description: "..." })
    ↓
MCP 工具接收并添加报告格式要求
    ↓
写入文件：docs/codex-bug-description-TIMESTAMP.md
    ↓
执行命令：codex exec "$(cat docs/codex-bug-description-TIMESTAMP.md)"
    ↓
Codex 读取 MD 文档
    ↓
Codex 分析并修复 Bug
    ↓
Codex 生成报告：docs/codex-fix-TIMESTAMP.md
    ↓
MCP 工具读取报告并返回
    ↓
AI 助手总结给用户
```

## 工具参数

### `description` (必需)
详细的 Bug 描述，必须包含：

1. **问题症状** - 具体的错误行为
2. **期望行为** - 应该如何工作
3. **问题位置** - 文件路径、行号、函数名
4. **相关代码** - 有问题的代码片段
5. **根本原因** - 为什么会出现这个问题（如果知道）
6. **修复建议** - 如何修复（如果有想法）
7. **影响范围** - 还会影响什么
8. **相关文件** - 所有相关的文件路径
9. **测试用例** - 如何验证修复是否有效
10. **上下文信息** - 有助于理解问题的背景

### `cwd` (可选)
工作目录，默认为当前目录。

### `timeout` (可选)
超时时间（毫秒），默认为 600000（10 分钟）。

## 使用示例

### 示例 1：简单的验证 Bug

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
- Expected: all tests pass`
})
```

### 示例 2：复杂的多文件 Bug

```javascript
fix_bug_with_codex({
  description: `TASK: Fix all bugs in the React/TypeScript/Vite project

BUG LIST DOCUMENT: docs/bug-list.md

INSTRUCTIONS:
1. Read the comprehensive bug list from docs/bug-list.md
2. Fix ALL bugs listed in the document
3. Ensure all tests pass after fixes

PRIORITY ORDER:
1. First: Fix build/test entry blocking issues
2. Second: Fix state management issues
3. Third: Fix component and hook side effects

VERIFICATION:
After fixing, run: npm test -- --run
Expected: All tests should pass`,
  cwd: '/path/to/project',
  timeout: 600000
})
```

## 好的描述 vs 坏的描述

### ✅ 好的描述

```
Username validation bug in auth.js file.

PROBLEM:
- File: src/auth/login.ts, line 45
- Code: const usernameRegex = /^[a-zA-Z0-9]{3,20}$/
- Symptom: Username 'user_name' is rejected
- Expected: Should accept underscores and hyphens

ROOT CAUSE:
- Regex only allows letters and numbers

SUGGESTED FIX:
- Change regex to: /^[a-zA-Z0-9_-]{3,20}$/

TEST CASES:
- 'user_name' should pass
- 'user-name' should pass
- 'user@name' should fail

VERIFICATION:
- Run: npm test
- Expected: all tests pass
```

### ❌ 坏的描述

```
Login has a bug, please fix it
```

```
Username validation is wrong
```

```
Fix the regex in auth.js
```

## 重要注意事项

### 1. 只使用英文
- ❌ 不要使用中文
- ❌ 不要使用 emoji
- ✅ 使用纯英文和 ASCII 字符

**原因**：避免 UTF-8 编码问题和 shell 转义问题。

### 2. 提供详细描述
修复的质量完全取决于描述的质量。描述越详细，修复越准确。

### 3. 等待完成
Codex 可能需要几分钟来分析和修复。不要过早判断失败。

### 4. 读取报告
修复完成后，必须读取 `docs/codex-fix-TIMESTAMP.md` 报告并总结给用户。

## 技术实现

### 为什么使用 MD 文档？

#### 1. 避免 Shell 转义问题
```bash
# ❌ 直接传递会有问题
codex exec "包含特殊字符：$、`、"、'、\n"

# ✅ 使用文档读取
codex exec "$(cat docs/description.md)"
```

#### 2. 支持长文本
- 命令行参数有长度限制（~128KB）
- 文件大小几乎无限制

#### 3. 保留历史记录
```
docs/
  ├── codex-bug-description-2025-10-18T02-26-18-081Z.md  ← AI 的输入
  └── codex-fix-2025-10-18T02-26-18-081Z.md              ← Codex 的输出
```

#### 4. UTF-8 编码安全
文件以 UTF-8 保存，读取时保持编码一致。

### 执行的命令

```bash
codex exec \
  --dangerously-bypass-approvals-and-sandbox \
  --skip-git-repo-check \
  "$(cat docs/codex-bug-description-TIMESTAMP.md)"
```

**参数说明**：
- `codex exec` - 非交互模式
- `--dangerously-bypass-approvals-and-sandbox` - 完全自动化（YOLO 模式）
- `--skip-git-repo-check` - 允许在非 Git 仓库运行
- `"$(cat ...)"` - 从 MD 文档读取内容作为提示词

## 实际测试结果

### 测试 1：修复 11 个 React Bug
- **执行时间**：145 秒（约 2.5 分钟）
- **Token 使用**：276,119 tokens
- **修改文件**：10 个
- **测试结果**：3/3 通过（100%）
- **报告行数**：691 行

### 测试 2：修复 React Refresh 重复插件
- **执行时间**：85 秒（约 1.5 分钟）
- **修改文件**：1 个
- **测试结果**：开发服务器正常启动
- **报告行数**：229 行

## 最佳实践

### 1. 调用前收集信息
- 阅读错误消息
- 检查相关文件
- 理解期望的行为
- 查看最近的更改

### 2. 提供结构化描述
使用清晰的章节：
- PROBLEM
- ROOT CAUSE
- SUGGESTED FIX
- IMPACT
- RELATED FILES
- TEST CASES
- VERIFICATION

### 3. 调用后验证
- 读取修复报告
- 运行测试
- 检查修改的文件
- 向用户总结

### 4. 迭代改进
如果第一次修复不完美：
- 分析问题
- 提供更详细的描述
- 再次调用工具

## 限制和注意事项

### 适合的任务
- ✅ 修复明确的 Bug
- ✅ 实现明确的功能
- ✅ 解决明确的问题
- ✅ 重构代码
- ✅ 优化性能

### 不适合的任务
- ❌ 开放式的"给建议"
- ❌ 主观的"美化"
- ❌ 没有明确标准的"改进"
- ❌ 需要人工判断的决策

### 安全性
- ⚠️ 工具有完全访问权限
- ⚠️ Codex 可以修改任何文件
- ⚠️ 建议在 Git 仓库中使用，便于回滚
- ⚠️ 重要项目建议先在测试分支使用

## 相关文件

- **实现代码**：`src/mcp-server.ts` (第 130-368 行)
- **类型定义**：`src/types.ts`
- **示例代码**：`src/examples/codex-bug-fix-demo.ts`
- **报告模板**：`docs/codex-fix-report-template.md`

## 参考资料

- [OpenAI Codex CLI 文档](https://github.com/openai/codex-cli)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [persistent-terminal-mcp 项目](https://github.com/your-repo/persistent-terminal-mcp)

