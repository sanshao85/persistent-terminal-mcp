#!/usr/bin/env node

/**
 * 测试终端修复
 * 验证命令执行、交互式输入和输出读取的问题是否已修复
 */

import { TerminalManager } from '../../dist/terminal-manager.js';

console.log('='.repeat(80));
console.log('测试终端修复');
console.log('='.repeat(80));
console.log();

const manager = new TerminalManager({
  maxBufferSize: 10000,
  sessionTimeout: 86400000,
  compactAnimations: true,
  animationThrottleMs: 100
});

let testsPassed = 0;
let testsFailed = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test1_BasicCommandExecution() {
  console.log('测试 1: 基本命令执行');
  console.log('-'.repeat(80));
  
  try {
    // 1. 创建终端
    const terminalId = await manager.createTerminal({
      cwd: process.cwd(),
      shell: '/bin/bash'
    });
    console.log(`✓ 创建终端: ${terminalId}`);
    
    // 2. 执行简单命令
    await manager.writeToTerminal({
      terminalId,
      input: 'echo "Hello World"'
    });
    console.log('✓ 发送命令: echo "Hello World"');
    
    // 3. 等待输出稳定
    await manager.waitForOutputStable(terminalId, 2000, 300);
    console.log('✓ 等待输出稳定');
    
    // 4. 读取输出
    const output = await manager.readFromTerminal({ terminalId });
    console.log('✓ 读取输出');
    
    // 5. 验证输出
    if (output.output.includes('Hello World')) {
      console.log('✅ 测试通过：输出包含 "Hello World"');
      testsPassed++;
    } else {
      console.error('❌ 测试失败：输出不包含 "Hello World"');
      console.error('实际输出:', output.output);
      testsFailed++;
    }
    
    // 验证命令回显
    if (output.output.includes('echo "Hello World"')) {
      console.log('✅ 测试通过：输出包含命令回显');
      testsPassed++;
    } else {
      console.error('❌ 测试失败：输出不包含命令回显');
      testsFailed++;
    }
    
    // 清理
    await manager.killTerminal(terminalId);
    console.log('✓ 终端已清理');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    testsFailed += 2;
  }
  
  console.log();
}

async function test2_MultipleCommands() {
  console.log('测试 2: 多个命令执行');
  console.log('-'.repeat(80));
  
  try {
    // 1. 创建终端
    const terminalId = await manager.createTerminal({
      cwd: process.cwd(),
      shell: '/bin/bash'
    });
    console.log(`✓ 创建终端: ${terminalId}`);
    
    // 2. 执行第一个命令
    await manager.writeToTerminal({
      terminalId,
      input: 'pwd'
    });
    console.log('✓ 发送命令: pwd');
    
    await manager.waitForOutputStable(terminalId, 2000, 300);
    
    // 3. 执行第二个命令
    await manager.writeToTerminal({
      terminalId,
      input: 'echo "Second command"'
    });
    console.log('✓ 发送命令: echo "Second command"');
    
    await manager.waitForOutputStable(terminalId, 2000, 300);
    
    // 4. 读取输出
    const output = await manager.readFromTerminal({ terminalId });
    console.log('✓ 读取输出');
    
    // 5. 验证输出
    if (output.output.includes('pwd') && output.output.includes('Second command')) {
      console.log('✅ 测试通过：输出包含两个命令');
      testsPassed++;
    } else {
      console.error('❌ 测试失败：输出不完整');
      console.error('实际输出:', output.output);
      testsFailed++;
    }
    
    // 清理
    await manager.killTerminal(terminalId);
    console.log('✓ 终端已清理');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    testsFailed++;
  }
  
  console.log();
}

async function test3_RawInput() {
  console.log('测试 3: 原始输入（不自动添加换行符）');
  console.log('-'.repeat(80));
  
  try {
    // 1. 创建终端
    const terminalId = await manager.createTerminal({
      cwd: process.cwd(),
      shell: '/bin/bash'
    });
    console.log(`✓ 创建终端: ${terminalId}`);
    
    // 2. 发送原始输入（不自动添加换行）
    await manager.writeToTerminal({
      terminalId,
      input: 'echo "test"',
      appendNewline: false
    });
    console.log('✓ 发送原始输入: echo "test" (无换行)');
    
    await sleep(500);
    
    // 3. 手动发送换行符
    await manager.writeToTerminal({
      terminalId,
      input: '\n',
      appendNewline: false
    });
    console.log('✓ 发送换行符');
    
    await manager.waitForOutputStable(terminalId, 2000, 300);
    
    // 4. 读取输出
    const output = await manager.readFromTerminal({ terminalId });
    console.log('✓ 读取输出');
    
    // 5. 验证输出
    if (output.output.includes('test')) {
      console.log('✅ 测试通过：原始输入正常工作');
      testsPassed++;
    } else {
      console.error('❌ 测试失败：原始输入未正常工作');
      console.error('实际输出:', output.output);
      testsFailed++;
    }
    
    // 清理
    await manager.killTerminal(terminalId);
    console.log('✓ 终端已清理');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    testsFailed++;
  }
  
  console.log();
}

async function test4_OutputRealtimeReading() {
  console.log('测试 4: 输出实时读取');
  console.log('-'.repeat(80));
  
  try {
    // 1. 创建终端
    const terminalId = await manager.createTerminal({
      cwd: process.cwd(),
      shell: '/bin/bash'
    });
    console.log(`✓ 创建终端: ${terminalId}`);
    
    // 2. 执行命令
    await manager.writeToTerminal({
      terminalId,
      input: 'echo "Line 1"; sleep 0.5; echo "Line 2"'
    });
    console.log('✓ 发送命令: echo "Line 1"; sleep 0.5; echo "Line 2"');
    
    // 3. 立即读取（应该只看到 Line 1）
    await sleep(200);
    const output1 = await manager.readFromTerminal({ terminalId });
    console.log('✓ 第一次读取完成');
    
    // 4. 等待后再读取（应该看到 Line 2）
    await sleep(800);
    const output2 = await manager.readFromTerminal({ terminalId });
    console.log('✓ 第二次读取完成');
    
    // 5. 验证
    const hasLine1 = output1.output.includes('Line 1');
    const hasLine2 = output2.output.includes('Line 2');
    
    if (hasLine1 && hasLine2) {
      console.log('✅ 测试通过：输出实时更新');
      testsPassed++;
    } else {
      console.error('❌ 测试失败：输出未实时更新');
      console.error('第一次输出:', output1.output);
      console.error('第二次输出:', output2.output);
      testsFailed++;
    }
    
    // 清理
    await manager.killTerminal(terminalId);
    console.log('✓ 终端已清理');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    testsFailed++;
  }
  
  console.log();
}

async function test5_TerminalEnvironment() {
  console.log('测试 5: 终端环境配置');
  console.log('-'.repeat(80));
  
  try {
    // 1. 创建终端
    const terminalId = await manager.createTerminal({
      cwd: process.cwd(),
      shell: '/bin/bash'
    });
    console.log(`✓ 创建终端: ${terminalId}`);
    
    // 2. 检查 TERM 环境变量
    await manager.writeToTerminal({
      terminalId,
      input: 'echo $TERM'
    });
    console.log('✓ 发送命令: echo $TERM');
    
    await manager.waitForOutputStable(terminalId, 2000, 300);
    
    // 3. 读取输出
    const output = await manager.readFromTerminal({ terminalId });
    console.log('✓ 读取输出');
    
    // 4. 验证 TERM 设置
    if (output.output.includes('xterm-256color')) {
      console.log('✅ 测试通过：TERM 环境变量正确设置为 xterm-256color');
      testsPassed++;
    } else {
      console.error('❌ 测试失败：TERM 环境变量未正确设置');
      console.error('实际输出:', output.output);
      testsFailed++;
    }
    
    // 清理
    await manager.killTerminal(terminalId);
    console.log('✓ 终端已清理');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    testsFailed++;
  }
  
  console.log();
}

// 运行所有测试
async function runAllTests() {
  try {
    await test1_BasicCommandExecution();
    await test2_MultipleCommands();
    await test3_RawInput();
    await test4_OutputRealtimeReading();
    await test5_TerminalEnvironment();
    
    // 显示测试结果
    console.log('='.repeat(80));
    console.log('测试结果汇总');
    console.log('='.repeat(80));
    console.log(`通过: ${testsPassed}`);
    console.log(`失败: ${testsFailed}`);
    console.log();
    
    if (testsFailed > 0) {
      console.error('❌ 部分测试失败');
      process.exit(1);
    } else {
      console.log('✅ 所有测试通过！');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  } finally {
    await manager.shutdown();
  }
}

runAllTests();

