#!/usr/bin/env node

import { TerminalManager } from '../terminal-manager.js';
import { isMainModule } from '../utils/module-helpers.js';

/**
 * 基本使用示例
 * 演示如何创建、使用和管理终端会话
 */
async function basicUsageExample() {
  console.log('=== Persistent Terminal Basic Usage Example ===\n');

  // 创建终端管理器
  const terminalManager = new TerminalManager({
    maxBufferSize: 1000,
    sessionTimeout: 60000 // 1 minute for demo
  });

  try {
    // 1. 创建终端会话
    console.log('1. Creating a new terminal session...');
    const terminalId = await terminalManager.createTerminal({
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
      cwd: process.cwd()
    });
    console.log(`   Terminal created with ID: ${terminalId}\n`);

    // 2. 发送简单命令
    console.log('2. Sending a simple command...');
    await terminalManager.writeToTerminal({
      terminalId,
      input: 'echo "Hello from persistent terminal!"\n'
    });

    // 等待命令执行
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. 读取输出
    console.log('3. Reading terminal output...');
    const output1 = await terminalManager.readFromTerminal({ terminalId });
    console.log('   Output:');
    console.log('   ' + output1.output.split('\n').join('\n   '));
    console.log(`   Total lines: ${output1.totalLines}\n`);

    // 4. 发送另一个命令
    console.log('4. Sending another command...');
    const command = process.platform === 'win32' ? 'dir\n' : 'ls -la\n';
    await terminalManager.writeToTerminal({
      terminalId,
      input: command
    });

    // 等待命令执行
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. 读取新输出（从上次读取位置开始）
    console.log('5. Reading new output...');
    const output2 = await terminalManager.readFromTerminal({
      terminalId,
      since: output1.since
    });
    console.log('   New output:');
    console.log('   ' + output2.output.split('\n').join('\n   '));
    console.log(`   Total lines: ${output2.totalLines}\n`);

    // 6. 列出所有终端
    console.log('6. Listing all terminals...');
    const terminals = await terminalManager.listTerminals();
    console.log(`   Found ${terminals.terminals.length} terminal(s):`);
    terminals.terminals.forEach(terminal => {
      console.log(`   - ID: ${terminal.id}`);
      console.log(`     PID: ${terminal.pid}`);
      console.log(`     Shell: ${terminal.shell}`);
      console.log(`     Status: ${terminal.status}`);
      console.log(`     Created: ${terminal.created}`);
    });
    console.log();

    // 7. 获取管理器统计信息
    console.log('7. Getting manager statistics...');
    const stats = terminalManager.getStats();
    console.log('   Stats:', JSON.stringify(stats, null, 2));
    console.log();

    // 8. 演示持久性 - 模拟断开连接
    console.log('8. Simulating disconnection and reconnection...');
    console.log('   (Terminal continues running in background)');
    
    // 发送一个长时间运行的命令
    const longCommand = process.platform === 'win32' 
      ? 'ping -n 5 127.0.0.1\n'  // Windows: ping 5 times
      : 'for i in {1..5}; do echo "Background task $i"; sleep 1; done\n';  // Unix: count with delay
    
    await terminalManager.writeToTerminal({
      terminalId,
      input: longCommand
    });

    console.log('   Command sent, waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 读取在"断开连接"期间产生的输出
    console.log('   Reading output generated during "disconnection":');
    const output3 = await terminalManager.readFromTerminal({
      terminalId,
      since: output2.since
    });
    console.log('   Background output:');
    console.log('   ' + output3.output.split('\n').join('\n   '));
    console.log();

    // 9. 清理 - 终止终端
    console.log('9. Cleaning up - terminating terminal...');
    await terminalManager.killTerminal(terminalId);
    console.log('   Terminal terminated\n');

    // 10. 验证终端已终止
    console.log('10. Verifying terminal termination...');
    const finalTerminals = await terminalManager.listTerminals();
    const activeTerminals = finalTerminals.terminals.filter(t => t.status === 'active');
    console.log(`    Active terminals remaining: ${activeTerminals.length}\n`);

    console.log('=== Example completed successfully! ===');

  } catch (error) {
    console.error('Error in example:', error);
  } finally {
    // 确保清理所有资源
    await terminalManager.shutdown();
  }
}

// 运行示例
if (isMainModule(import.meta.url)) {
  basicUsageExample().catch(console.error);
}
