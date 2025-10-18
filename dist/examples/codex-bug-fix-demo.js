#!/usr/bin/env node
import { PersistentTerminalMcpServer } from '../mcp-server.js';
/**
 * Codex Bug Fix 功能演示
 *
 * 这个示例展示如何使用 fix_bug_with_codex 工具来自动修复代码中的 bug
 */
async function demonstrateCodexBugFix() {
    console.log('=== Codex Bug Fix Demo ===\n');
    const mcpServer = new PersistentTerminalMcpServer();
    const terminalManager = mcpServer.getTerminalManager();
    try {
        console.log('📝 示例场景：修复一个用户名验证的 bug\n');
        // 模拟一个详细的 bug 描述
        const bugDescription = `登录功能用户名验证存在 bug，需要修复：

1. 问题现象：
   - 用户输入包含下划线的用户名（如 'user_name'）时被拒绝
   - 用户输入包含连字符的用户名（如 'user-name'）时被拒绝
   - 错误提示：'Invalid username'

2. 预期行为：
   - 应该接受 3-20 个字符的用户名
   - 允许字母、数字、下划线、连字符
   - 不允许特殊字符（如 @, #, $ 等）

3. 问题位置：
   - 文件：src/auth/login.ts
   - 行号：第 45 行
   - 代码：const usernameRegex = /^[a-zA-Z0-9]{3,20}$/

4. 根本原因：
   - 正则表达式 [a-zA-Z0-9] 只允许字母和数字
   - 缺少下划线 _ 和连字符 - 的支持

5. 修复建议：
   - 修改正则为：/^[a-zA-Z0-9_-]{3,20}$/
   - 同时更新 src/auth/validation.ts 中的错误提示
   - 添加测试用例验证下划线和连字符

6. 影响范围：
   - 可能影响现有用户名验证逻辑
   - 需要检查数据库中是否有不符合新规则的用户名

7. 相关文件：
   - src/auth/login.ts（主要修改）
   - src/auth/validation.ts（错误提示）
   - tests/auth/login.test.ts（添加测试）

8. 测试用例：
   - 'user_name' 应该通过 ✅
   - 'user-name' 应该通过 ✅
   - 'user@name' 应该失败 ❌
   - 'ab' 应该失败（太短）❌
   - '${'a'.repeat(21)}' 应该失败（太长）❌

9. 上下文信息：
   - 这是一个 TypeScript 项目
   - 使用 Jest 进行测试
   - 用户名验证是注册和登录流程的关键部分`;
        console.log('📋 Bug 描述已准备好\n');
        console.log('描述长度:', bugDescription.length, '字符\n');
        console.log('⚠️  注意：这个示例需要：');
        console.log('1. 已安装 Codex CLI (npm install -g @openai/codex-cli)');
        console.log('2. 已配置 Codex 认证');
        console.log('3. 当前目录存在 docs/ 文件夹\n');
        console.log('🚀 如果要实际执行，请取消下面代码的注释\n');
        /*
        // 实际调用 Codex 修复 bug
        console.log('正在调用 Codex 修复 bug...\n');
        
        const result = await mcpServer.fixBugWithCodex({
          description: bugDescription,
          cwd: process.cwd(),
          timeout: 600000 // 10分钟
        });
    
        console.log('✅ Codex 执行完成！\n');
        console.log('结果：');
        console.log(result.content[0].text);
    
        if (result.structuredContent?.reportExists) {
          console.log('\n📄 报告已生成，路径：', result.structuredContent.reportPath);
          console.log('请使用以下命令查看报告：');
          console.log(`cat ${result.structuredContent.reportPath}`);
        }
        */
        console.log('💡 提示：在实际使用中，AI 助手会：');
        console.log('1. 收集详细的 bug 信息');
        console.log('2. 调用 fix_bug_with_codex 工具');
        console.log('3. 等待 Codex 完成修复');
        console.log('4. 读取生成的报告');
        console.log('5. 向用户汇报修复结果\n');
        console.log('📚 工作流程示例：');
        console.log('');
        console.log('用户: "登录功能有 bug，用户名验证总是失败"');
        console.log('');
        console.log('AI: [收集信息]');
        console.log('    - 查看相关文件');
        console.log('    - 理解问题');
        console.log('    - 准备详细描述');
        console.log('');
        console.log('AI: [调用工具]');
        console.log('    fix_bug_with_codex({');
        console.log('      description: "详细的 bug 描述..."');
        console.log('    })');
        console.log('');
        console.log('AI: [等待完成]');
        console.log('    Codex 正在分析和修复...');
        console.log('');
        console.log('AI: [读取报告]');
        console.log('    view("docs/codex-fix-2025-10-18T00-35-12.md")');
        console.log('');
        console.log('AI: [向用户汇报]');
        console.log('    "✅ Codex 已经修复了问题！');
        console.log('     主要修改：');
        console.log('     1. 修复了正则表达式');
        console.log('     2. 更新了错误提示');
        console.log('     3. 添加了测试用例');
        console.log('     ');
        console.log('     建议运行 npm test 验证修复效果。"');
        console.log('');
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
    finally {
        // 清理
        await terminalManager.shutdown();
    }
}
// 运行演示
demonstrateCodexBugFix().catch(console.error);
//# sourceMappingURL=codex-bug-fix-demo.js.map