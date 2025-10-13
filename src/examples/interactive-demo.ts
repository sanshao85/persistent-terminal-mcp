#!/usr/bin/env node

import { TerminalManager } from '../terminal-manager.js';
import * as readline from 'readline';
import { isMainModule } from '../utils/module-helpers.js';

/**
 * 交互式演示
 * 允许用户通过命令行界面与终端会话交互
 */
class InteractiveDemo {
  private terminalManager: TerminalManager;
  private rl: readline.Interface;
  private currentTerminalId: string | null = null;
  private isRunning = true;

  constructor() {
    this.terminalManager = new TerminalManager();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // 监听终端输出
    this.terminalManager.on('terminalOutput', (terminalId, data) => {
      if (terminalId === this.currentTerminalId) {
        console.log('\n--- Terminal Output ---');
        console.log(data.replace(/\n$/, ''));
        console.log('--- End Output ---');
        this.showPrompt();
      }
    });
  }

  async start() {
    console.log('=== Interactive Terminal Demo ===');
    console.log('Commands:');
    console.log('  create [shell] [cwd]  - Create new terminal');
    console.log('  list                  - List all terminals');
    console.log('  select <id>           - Select terminal to interact with');
    console.log('  send <input>          - Send input to selected terminal');
    console.log('  read [since] [lines]  - Read terminal output');
    console.log('  kill <id>             - Kill terminal');
    console.log('  stats                 - Show manager statistics');
    console.log('  help                  - Show this help');
    console.log('  exit                  - Exit demo');
    console.log();

    this.showPrompt();
    this.rl.on('line', this.handleCommand.bind(this));
    this.rl.on('close', this.cleanup.bind(this));
  }

  private showPrompt() {
    const terminalInfo = this.currentTerminalId 
      ? ` [${this.currentTerminalId.substring(0, 8)}...]`
      : '';
    this.rl.setPrompt(`demo${terminalInfo}> `);
    this.rl.prompt();
  }

  private async handleCommand(line: string) {
    const args = line.trim().split(' ');
    const command = args[0]?.toLowerCase() || '';

    try {
      switch (command) {
        case 'create':
          await this.createTerminal(args[1], args[2]);
          break;
        case 'list':
          await this.listTerminals();
          break;
        case 'select':
          await this.selectTerminal(args[1] || '');
          break;
        case 'send':
          await this.sendInput(args.slice(1).join(' '));
          break;
        case 'read':
          await this.readOutput(
            args[1] ? parseInt(args[1]) : undefined,
            args[2] ? parseInt(args[2]) : undefined
          );
          break;
        case 'kill':
          await this.killTerminal(args[1] || '');
          break;
        case 'stats':
          await this.showStats();
          break;
        case 'help':
          this.showHelp();
          break;
        case 'exit':
          await this.cleanup();
          return;
        case '':
          break;
        default:
          console.log(`Unknown command: ${command}. Type 'help' for available commands.`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
    }

    if (this.isRunning) {
      this.showPrompt();
    }
  }

  private async createTerminal(shell?: string, cwd?: string) {
    console.log('Creating terminal...');
    const terminalId = await this.terminalManager.createTerminal({
      shell: shell || undefined,
      cwd: cwd || undefined
    });
    
    const session = this.terminalManager.getTerminalInfo(terminalId);
    console.log(`Terminal created: ${terminalId}`);
    console.log(`PID: ${session?.pid}, Shell: ${session?.shell}`);
    
    if (!this.currentTerminalId) {
      this.currentTerminalId = terminalId;
      console.log('Automatically selected as current terminal');
    }
  }

  private async listTerminals() {
    const result = await this.terminalManager.listTerminals();
    
    if (result.terminals.length === 0) {
      console.log('No terminals found');
      return;
    }

    console.log(`Found ${result.terminals.length} terminal(s):`);
    result.terminals.forEach(terminal => {
      const current = terminal.id === this.currentTerminalId ? ' (current)' : '';
      console.log(`  ${terminal.id.substring(0, 8)}... - ${terminal.status} - PID: ${terminal.pid}${current}`);
    });
  }

  private async selectTerminal(terminalId: string) {
    if (!terminalId) {
      console.log('Please provide a terminal ID');
      return;
    }

    // 支持短 ID 匹配
    const result = await this.terminalManager.listTerminals();
    const terminal = result.terminals.find(t => 
      t.id === terminalId || t.id.startsWith(terminalId)
    );

    if (!terminal) {
      console.log('Terminal not found');
      return;
    }

    this.currentTerminalId = terminal.id;
    console.log(`Selected terminal: ${terminal.id}`);
  }

  private async sendInput(input: string) {
    if (!this.currentTerminalId) {
      console.log('No terminal selected. Use "select <id>" first.');
      return;
    }

    if (!input) {
      console.log('Please provide input to send');
      return;
    }

    // 如果输入不以换行符结尾，添加一个
    if (!input.endsWith('\n')) {
      input += '\n';
    }

    await this.terminalManager.writeToTerminal({
      terminalId: this.currentTerminalId,
      input
    });
    
    console.log('Input sent');
  }

  private async readOutput(since?: number, maxLines?: number) {
    if (!this.currentTerminalId) {
      console.log('No terminal selected. Use "select <id>" first.');
      return;
    }

    const result = await this.terminalManager.readFromTerminal({
      terminalId: this.currentTerminalId,
      since: since || undefined,
      maxLines: maxLines || undefined
    });

    console.log('--- Terminal Output ---');
    console.log(result.output);
    console.log('--- End Output ---');
    console.log(`Total lines: ${result.totalLines}, Has more: ${result.hasMore}`);
  }

  private async killTerminal(terminalId: string) {
    if (!terminalId) {
      console.log('Please provide a terminal ID');
      return;
    }

    // 支持短 ID 匹配
    const result = await this.terminalManager.listTerminals();
    const terminal = result.terminals.find(t => 
      t.id === terminalId || t.id.startsWith(terminalId)
    );

    if (!terminal) {
      console.log('Terminal not found');
      return;
    }

    await this.terminalManager.killTerminal(terminal.id);
    console.log(`Terminal ${terminal.id} killed`);

    if (this.currentTerminalId === terminal.id) {
      this.currentTerminalId = null;
      console.log('Current terminal cleared');
    }
  }

  private async showStats() {
    const stats = this.terminalManager.getStats();
    console.log('Manager Statistics:');
    console.log(JSON.stringify(stats, null, 2));
  }

  private showHelp() {
    console.log('Available commands:');
    console.log('  create [shell] [cwd]  - Create new terminal');
    console.log('  list                  - List all terminals');
    console.log('  select <id>           - Select terminal to interact with');
    console.log('  send <input>          - Send input to selected terminal');
    console.log('  read [since] [lines]  - Read terminal output');
    console.log('  kill <id>             - Kill terminal');
    console.log('  stats                 - Show manager statistics');
    console.log('  help                  - Show this help');
    console.log('  exit                  - Exit demo');
    console.log();
    console.log('Tips:');
    console.log('- You can use partial terminal IDs (first 8 characters)');
    console.log('- Terminal output is automatically displayed when available');
    console.log('- Use Ctrl+C to exit');
  }

  private async cleanup() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log('\nShutting down...');
    
    this.rl.close();
    await this.terminalManager.shutdown();
    
    console.log('Demo ended');
    process.exit(0);
  }
}

// 运行交互式演示
if (isMainModule(import.meta.url)) {
  const demo = new InteractiveDemo();
  demo.start().catch(console.error);
  
  // 处理 Ctrl+C
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down...');
    process.exit(0);
  });
}
