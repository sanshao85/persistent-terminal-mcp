#!/usr/bin/env node

import { TerminalManager } from '../terminal-manager.js';
import { isMainModule } from '../utils/module-helpers.js';

/**
 * 智能读取功能演示
 * 展示如何处理长输出的终端命令
 */
async function smartReadingDemo() {
  console.log('=== Smart Reading Demo ===\n');

  const terminalManager = new TerminalManager({
    maxBufferSize: 1000,
    sessionTimeout: 60000
  });

  try {
    // 1. 创建终端会话
    console.log('1. Creating terminal session...');
    const terminalId = await terminalManager.createTerminal({
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
      cwd: process.cwd()
    });
    console.log(`   Terminal created: ${terminalId}\n`);

    // 2. 执行一个会产生大量输出的命令
    console.log('2. Running command that produces lots of output...');
    const longCommand = process.platform === 'win32' 
      ? 'Get-ChildItem -Recurse | Select-Object -First 200' 
      : 'find . -type f -name "*.ts" -o -name "*.js" -o -name "*.json" | head -100';
    
    await terminalManager.writeToTerminal({
      terminalId,
      input: longCommand + '\n'
    });

    // 等待命令执行
    console.log('   Waiting for command to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. 获取终端统计信息
    console.log('3. Getting terminal statistics...');
    const stats = await terminalManager.getTerminalStats(terminalId);
    console.log(`   Total Lines: ${stats.totalLines}`);
    console.log(`   Total Bytes: ${stats.totalBytes}`);
    console.log(`   Estimated Tokens: ${stats.estimatedTokens}`);
    console.log(`   Buffer Size: ${stats.bufferSize} lines\n`);

    // 4. 演示不同的读取模式
    console.log('4. Demonstrating different reading modes...\n');

    // 4a. 完整读取（如果输出不太长）
    if (stats.totalLines <= 50) {
      console.log('4a. Full output (small output):');
      const fullResult = await terminalManager.readFromTerminal({
        terminalId,
        mode: 'full'
      });
      console.log('--- Full Output ---');
      console.log(fullResult.output);
      console.log('--- End Full Output ---\n');
    } else {
      console.log('4a. Output is too long for full display, skipping...\n');
    }

    // 4b. 只显示开头
    console.log('4b. Head mode (first 10 lines):');
    const headResult = await terminalManager.readFromTerminal({
      terminalId,
      mode: 'head',
      headLines: 10
    });
    console.log('--- Head Output ---');
    console.log(headResult.output);
    console.log('--- End Head Output ---');
    if (headResult.stats) {
      console.log(`Stats: ${headResult.stats.linesShown} shown, ${headResult.stats.linesOmitted} omitted\n`);
    }

    // 4c. 只显示结尾
    console.log('4c. Tail mode (last 10 lines):');
    const tailResult = await terminalManager.readFromTerminal({
      terminalId,
      mode: 'tail',
      tailLines: 10
    });
    console.log('--- Tail Output ---');
    console.log(tailResult.output);
    console.log('--- End Tail Output ---');
    if (tailResult.stats) {
      console.log(`Stats: ${tailResult.stats.linesShown} shown, ${tailResult.stats.linesOmitted} omitted\n`);
    }

    // 4d. 头尾模式（最有用的模式）
    console.log('4d. Head-Tail mode (first 5 + last 5 lines):');
    const headTailResult = await terminalManager.readFromTerminal({
      terminalId,
      mode: 'head-tail',
      headLines: 5,
      tailLines: 5
    });
    console.log('--- Head-Tail Output ---');
    console.log(headTailResult.output);
    console.log('--- End Head-Tail Output ---');
    if (headTailResult.stats) {
      console.log(`Stats: ${headTailResult.stats.linesShown} shown, ${headTailResult.stats.linesOmitted} omitted\n`);
    }

    // 5. 演示实际使用场景
    console.log('5. Real-world scenario: Running npm install...');
    await terminalManager.writeToTerminal({
      terminalId,
      input: 'echo "Simulating npm install..."\n'
    });

    // 模拟长时间运行的命令
    for (let i = 1; i <= 20; i++) {
      await terminalManager.writeToTerminal({
        terminalId,
        input: `echo "Installing package ${i}/20..."\n`
      });
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await terminalManager.writeToTerminal({
      terminalId,
      input: 'echo "Installation complete!"\n'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 获取最新的统计信息
    const finalStats = await terminalManager.getTerminalStats(terminalId);
    console.log(`   Final stats: ${finalStats.totalLines} lines, ${finalStats.estimatedTokens} tokens\n`);

    // 使用智能读取获取安装过程的摘要
    console.log('6. Getting installation summary with head-tail mode:');
    const summaryResult = await terminalManager.readFromTerminal({
      terminalId,
      mode: 'head-tail',
      headLines: 10,
      tailLines: 5
    });
    console.log('--- Installation Summary ---');
    console.log(summaryResult.output);
    console.log('--- End Summary ---\n');

    // 7. 清理
    console.log('7. Cleaning up...');
    await terminalManager.killTerminal(terminalId);
    console.log('   Terminal terminated\n');

    console.log('=== Smart Reading Demo completed! ===');
    console.log('\nKey takeaways:');
    console.log('- Use get_terminal_stats to check output size before reading');
    console.log('- Use mode="head-tail" for long outputs to get context');
    console.log('- Adjust headLines and tailLines based on your needs');
    console.log('- The system automatically adds truncation indicators');

  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    console.log('\nShutting down terminal manager...');
    await terminalManager.shutdown();
    console.log('Demo cleanup complete');
  }
}

// 运行演示
if (isMainModule(import.meta.url)) {
  smartReadingDemo().catch(console.error);
}
