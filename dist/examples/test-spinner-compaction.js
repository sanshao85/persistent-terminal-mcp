#!/usr/bin/env tsx
/**
 * 测试 Spinner 压缩功能
 *
 * 这个脚本演示了如何使用 spinner 压缩功能来处理进度动画
 */
import { TerminalManager } from '../terminal-manager.js';
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function testSpinnerCompaction() {
    console.log('='.repeat(80));
    console.log('测试 Spinner 压缩功能');
    console.log('='.repeat(80));
    console.log();
    // 测试 1: 启用压缩（默认）
    console.log('测试 1: 启用 Spinner 压缩（默认设置）');
    console.log('-'.repeat(80));
    const manager1 = new TerminalManager({
        maxBufferSize: 1000,
        compactAnimations: true,
        animationThrottleMs: 100
    });
    try {
        const terminalId1 = await manager1.createTerminal();
        console.log(`✓ 创建终端: ${terminalId1}`);
        // 模拟一个会产生 spinner 的命令
        console.log('执行命令: echo "开始"; for i in {1..20}; do echo -ne "\\r⠋ 处理中 $i"; sleep 0.05; done; echo -e "\\r✓ 完成!"');
        await manager1.writeToTerminal({
            terminalId: terminalId1,
            input: 'echo "开始"; for i in {1..20}; do echo -ne "\\r⠋ 处理中 $i"; sleep 0.05; done; echo -e "\\r✓ 完成!"'
        });
        // 等待命令执行
        await sleep(2000);
        // 读取输出
        const result1 = await manager1.readFromTerminal({ terminalId: terminalId1 });
        console.log('\n输出行数:', result1.totalLines);
        console.log('输出内容:');
        console.log(result1.output);
        console.log();
        await manager1.killTerminal(terminalId1);
    }
    finally {
        await manager1.shutdown();
    }
    console.log();
    // 测试 2: 禁用压缩
    console.log('测试 2: 禁用 Spinner 压缩');
    console.log('-'.repeat(80));
    const manager2 = new TerminalManager({
        maxBufferSize: 1000,
        compactAnimations: false
    });
    try {
        const terminalId2 = await manager2.createTerminal();
        console.log(`✓ 创建终端: ${terminalId2}`);
        // 执行相同的命令
        console.log('执行命令: echo "开始"; for i in {1..20}; do echo -ne "\\r⠋ 处理中 $i"; sleep 0.05; done; echo -e "\\r✓ 完成!"');
        await manager2.writeToTerminal({
            terminalId: terminalId2,
            input: 'echo "开始"; for i in {1..20}; do echo -ne "\\r⠋ 处理中 $i"; sleep 0.05; done; echo -e "\\r✓ 完成!"'
        });
        // 等待命令执行
        await sleep(2000);
        // 读取输出
        const result2 = await manager2.readFromTerminal({ terminalId: terminalId2 });
        console.log('\n输出行数:', result2.totalLines);
        console.log('输出内容:');
        console.log(result2.output);
        console.log();
        await manager2.killTerminal(terminalId2);
    }
    finally {
        await manager2.shutdown();
    }
    console.log();
    // 测试 3: 模拟 npm install 风格的输出
    console.log('测试 3: 模拟 npm install 风格的输出（启用压缩）');
    console.log('-'.repeat(80));
    const manager3 = new TerminalManager({
        maxBufferSize: 1000,
        compactAnimations: true,
        animationThrottleMs: 100
    });
    try {
        const terminalId3 = await manager3.createTerminal();
        console.log(`✓ 创建终端: ${terminalId3}`);
        // 模拟 npm install 的输出模式
        const command = `
cat << 'EOF'
npm install
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

⠋ Building project
⠙ Building project
⠹ Building project
⠸ Building project
⠼ Building project
✓ Build complete

All done!
EOF
`.trim();
        await manager3.writeToTerminal({
            terminalId: terminalId3,
            input: command
        });
        // 等待命令执行
        await sleep(1000);
        // 读取输出
        const result3 = await manager3.readFromTerminal({ terminalId: terminalId3 });
        console.log('\n输出行数:', result3.totalLines);
        console.log('输出内容:');
        console.log(result3.output);
        console.log();
        // 获取统计信息
        const stats3 = await manager3.getTerminalStats(terminalId3);
        console.log('统计信息:');
        console.log(`  总行数: ${stats3.totalLines}`);
        console.log(`  总字节数: ${stats3.totalBytes}`);
        console.log(`  估计 Token 数: ${stats3.estimatedTokens}`);
        console.log(`  缓冲区大小: ${stats3.bufferSize} 行`);
        console.log();
        await manager3.killTerminal(terminalId3);
    }
    finally {
        await manager3.shutdown();
    }
    console.log('='.repeat(80));
    console.log('测试完成！');
    console.log('='.repeat(80));
    console.log();
    console.log('总结:');
    console.log('- 启用 spinner 压缩后，重复的动画帧会被合并');
    console.log('- 真实的日志内容会被保留');
    console.log('- 可以通过环境变量 COMPACT_ANIMATIONS=false 来禁用此功能');
    console.log('- 可以通过环境变量 ANIMATION_THROTTLE_MS 来调整节流时间（默认 100ms）');
    console.log();
}
// 运行测试
testSpinnerCompaction().catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
});
//# sourceMappingURL=test-spinner-compaction.js.map