import { spawn } from 'node-pty';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  TerminalSession,
  TerminalCreateOptions,
  TerminalWriteOptions,
  TerminalReadOptions,
  TerminalReadResult,
  TerminalListResult,
  TerminalManagerConfig,
  TerminalError,
  TerminalStatsResult
} from './types.js';
import { OutputBuffer } from './output-buffer.js';

/**
 * 终端会话管理器
 * 负责创建、管理和维护持久化的终端会话
 */
export class TerminalManager extends EventEmitter {
  private sessions = new Map<string, TerminalSession>();
  private ptyProcesses = new Map<string, any>();
  private outputBuffers = new Map<string, OutputBuffer>();
  private config: Required<TerminalManagerConfig>;

  constructor(config: TerminalManagerConfig = {}) {
    super();
    
    this.config = {
      maxBufferSize: config.maxBufferSize || 10000,
      sessionTimeout: config.sessionTimeout || 24 * 60 * 60 * 1000, // 24 hours
      defaultShell: config.defaultShell || (process.platform === 'win32' ? 'powershell.exe' : '/bin/bash'),
      defaultCols: config.defaultCols || 80,
      defaultRows: config.defaultRows || 24
    };

    // 定期清理超时的会话
    setInterval(() => this.cleanupTimeoutSessions(), 60000); // 每分钟检查一次
  }

  /**
   * 创建新的终端会话
   */
  async createTerminal(options: TerminalCreateOptions = {}): Promise<string> {
    const terminalId = uuidv4();
    
    const {
      shell = this.config.defaultShell,
      cwd = process.cwd(),
      env = { ...process.env } as Record<string, string>,
      cols = this.config.defaultCols,
      rows = this.config.defaultRows
    } = options;

    try {
      // 创建 PTY 进程
      const ptyProcess = spawn(shell, [], {
        name: 'xterm-color',
        cols,
        rows,
        cwd,
        env
      });

      // 创建会话记录
      const session: TerminalSession = {
        id: terminalId,
        pid: ptyProcess.pid,
        shell,
        cwd,
        env,
        created: new Date(),
        lastActivity: new Date(),
        status: 'active'
      };

      // 创建输出缓冲器
      const outputBuffer = new OutputBuffer(terminalId, this.config.maxBufferSize);

      // 监听 PTY 输出
      ptyProcess.onData((data: string) => {
        session.lastActivity = new Date();
        outputBuffer.append(data);
        this.emit('terminalOutput', terminalId, data);
      });

      // 监听 PTY 退出
      ptyProcess.onExit((e: { exitCode: number; signal?: number }) => {
        session.status = 'terminated';
        session.lastActivity = new Date();
        this.emit('terminalExit', terminalId, e.exitCode, e.signal);

        // 清理资源
        setTimeout(() => {
          this.cleanupSession(terminalId);
        }, 5000); // 5秒后清理
      });

      // 存储会话信息
      this.sessions.set(terminalId, session);
      this.ptyProcesses.set(terminalId, ptyProcess);
      this.outputBuffers.set(terminalId, outputBuffer);

      this.emit('terminalCreated', terminalId, session);
      
      return terminalId;
    } catch (error) {
      const terminalError: TerminalError = new Error(`Failed to create terminal: ${error}`) as TerminalError;
      terminalError.code = 'CREATE_FAILED';
      terminalError.terminalId = terminalId;
      throw terminalError;
    }
  }

  /**
   * 向终端写入数据
   */
  async writeToTerminal(options: TerminalWriteOptions): Promise<void> {
    const { terminalId, input } = options;

    const ptyProcess = this.ptyProcesses.get(terminalId);
    const session = this.sessions.get(terminalId);

    if (!ptyProcess || !session) {
      const error: TerminalError = new Error(`Terminal ${terminalId} not found`) as TerminalError;
      error.code = 'TERMINAL_NOT_FOUND';
      error.terminalId = terminalId;
      throw error;
    }

    if (session.status !== 'active') {
      const error: TerminalError = new Error(`Terminal ${terminalId} is not active`) as TerminalError;
      error.code = 'TERMINAL_INACTIVE';
      error.terminalId = terminalId;
      throw error;
    }

    try {
      // 如果输入不以换行符结尾，自动添加换行符以执行命令
      // 这样用户可以直接发送 "ls" 而不需要手动添加 "\n"
      const inputToWrite = input.endsWith('\n') || input.endsWith('\r') ? input : input + '\n';
      ptyProcess.write(inputToWrite);
      session.lastActivity = new Date();
      this.emit('terminalInput', terminalId, inputToWrite);
    } catch (error) {
      const terminalError: TerminalError = new Error(`Failed to write to terminal: ${error}`) as TerminalError;
      terminalError.code = 'WRITE_FAILED';
      terminalError.terminalId = terminalId;
      throw terminalError;
    }
  }

  /**
   * 从终端读取输出
   */
  async readFromTerminal(options: TerminalReadOptions): Promise<TerminalReadResult> {
    const { terminalId, since = 0, maxLines = 1000, mode, headLines, tailLines } = options;

    const outputBuffer = this.outputBuffers.get(terminalId);
    const session = this.sessions.get(terminalId);

    if (!outputBuffer || !session) {
      const error: TerminalError = new Error(`Terminal ${terminalId} not found`) as TerminalError;
      error.code = 'TERMINAL_NOT_FOUND';
      error.terminalId = terminalId;
      throw error;
    }

    try {
      // 如果指定了智能读取模式，使用新的 readSmart 方法
      if (mode && mode !== 'full') {
        const smartOptions: any = {
          since,
          mode,
          maxLines
        };
        if (headLines !== undefined) smartOptions.headLines = headLines;
        if (tailLines !== undefined) smartOptions.tailLines = tailLines;

        const result = outputBuffer.readSmart(smartOptions);

        let output = '';
        if (mode === 'head-tail' && result.truncated) {
          const headOutput = result.entries.slice(0, headLines || 50).map(e => e.content).join('\n');
          const tailOutput = result.entries.slice(-(tailLines || 50)).map(e => e.content).join('\n');
          output = headOutput + '\n\n... [省略 ' + result.stats.linesOmitted + ' 行] ...\n\n' + tailOutput;
        } else {
          output = result.entries.map(entry => entry.content).join('\n');
          if (result.truncated) {
            if (mode === 'head') {
              output += '\n\n... [省略后续 ' + result.stats.linesOmitted + ' 行] ...';
            } else if (mode === 'tail') {
              output = '... [省略前面 ' + result.stats.linesOmitted + ' 行] ...\n\n' + output;
            }
          }
        }

        return {
          output,
          totalLines: result.totalLines,
          hasMore: result.hasMore,
          since: result.entries.length > 0 ? result.entries[result.entries.length - 1]!.lineNumber + 1 : since,
          truncated: result.truncated,
          stats: result.stats
        };
      }

      // 使用原有的读取方法
      const result = outputBuffer.read({ since, maxLines });
      const output = result.entries.map(entry => entry.content).join('\n');

      return {
        output,
        totalLines: result.totalLines,
        hasMore: result.hasMore,
        since: result.entries.length > 0 ? result.entries[result.entries.length - 1]!.lineNumber + 1 : since
      };
    } catch (error) {
      const terminalError: TerminalError = new Error(`Failed to read from terminal: ${error}`) as TerminalError;
      terminalError.code = 'READ_FAILED';
      terminalError.terminalId = terminalId;
      throw terminalError;
    }
  }

  /**
   * 获取终端统计信息
   */
  async getTerminalStats(terminalId: string): Promise<TerminalStatsResult> {
    const outputBuffer = this.outputBuffers.get(terminalId);
    const session = this.sessions.get(terminalId);

    if (!outputBuffer || !session) {
      const error: TerminalError = new Error(`Terminal ${terminalId} not found`) as TerminalError;
      error.code = 'TERMINAL_NOT_FOUND';
      error.terminalId = terminalId;
      throw error;
    }

    const stats = outputBuffer.getStats();
    const allEntries = outputBuffer.read({ since: 0 });
    const totalText = allEntries.entries.map(e => e.content).join('\n');
    const totalBytes = Buffer.byteLength(totalText, 'utf8');
    const estimatedTokens = Math.ceil(totalText.length / 4);

    return {
      terminalId,
      totalLines: stats.totalLines,
      totalBytes,
      estimatedTokens,
      bufferSize: stats.bufferedLines,
      oldestLine: stats.oldestLine,
      newestLine: stats.newestLine,
      isActive: session.status === 'active'
    };
  }

  /**
   * 列出所有终端会话
   */
  async listTerminals(): Promise<TerminalListResult> {
    const terminals = Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      pid: session.pid,
      shell: session.shell,
      cwd: session.cwd,
      created: session.created.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      status: session.status
    }));

    return { terminals };
  }

  /**
   * 终止终端会话
   */
  async killTerminal(terminalId: string, signal = 'SIGTERM'): Promise<void> {
    const ptyProcess = this.ptyProcesses.get(terminalId);
    const session = this.sessions.get(terminalId);

    if (!ptyProcess || !session) {
      const error: TerminalError = new Error(`Terminal ${terminalId} not found`) as TerminalError;
      error.code = 'TERMINAL_NOT_FOUND';
      error.terminalId = terminalId;
      throw error;
    }

    try {
      ptyProcess.kill(signal);
      session.status = 'terminated';
      session.lastActivity = new Date();
      this.emit('terminalKilled', terminalId, signal);

      // 清理资源：从 Map 中删除已终止的终端
      this.ptyProcesses.delete(terminalId);
      this.outputBuffers.delete(terminalId);
      this.sessions.delete(terminalId);
    } catch (error) {
      const terminalError: TerminalError = new Error(`Failed to kill terminal: ${error}`) as TerminalError;
      terminalError.code = 'KILL_FAILED';
      terminalError.terminalId = terminalId;
      throw terminalError;
    }
  }

  /**
   * 获取终端会话信息
   */
  getTerminalInfo(terminalId: string): TerminalSession | undefined {
    return this.sessions.get(terminalId);
  }

  /**
   * 检查终端是否存在且活跃
   */
  isTerminalActive(terminalId: string): boolean {
    const session = this.sessions.get(terminalId);
    return session?.status === 'active';
  }

  /**
   * 调整终端大小
   */
  async resizeTerminal(terminalId: string, cols: number, rows: number): Promise<void> {
    const ptyProcess = this.ptyProcesses.get(terminalId);
    const session = this.sessions.get(terminalId);

    if (!ptyProcess || !session) {
      const error: TerminalError = new Error(`Terminal ${terminalId} not found`) as TerminalError;
      error.code = 'TERMINAL_NOT_FOUND';
      error.terminalId = terminalId;
      throw error;
    }

    try {
      ptyProcess.resize(cols, rows);
      session.lastActivity = new Date();
      this.emit('terminalResized', terminalId, cols, rows);
    } catch (error) {
      const terminalError: TerminalError = new Error(`Failed to resize terminal: ${error}`) as TerminalError;
      terminalError.code = 'RESIZE_FAILED';
      terminalError.terminalId = terminalId;
      throw terminalError;
    }
  }

  /**
   * 清理指定会话
   */
  private cleanupSession(terminalId: string): void {
    const ptyProcess = this.ptyProcesses.get(terminalId);
    const outputBuffer = this.outputBuffers.get(terminalId);

    if (ptyProcess) {
      try {
        ptyProcess.kill();
      } catch (error) {
        // 忽略清理时的错误
      }
      this.ptyProcesses.delete(terminalId);
    }

    if (outputBuffer) {
      outputBuffer.clear();
      this.outputBuffers.delete(terminalId);
    }

    this.sessions.delete(terminalId);
    this.emit('terminalCleaned', terminalId);
  }

  /**
   * 清理超时的会话
   */
  private cleanupTimeoutSessions(): void {
    const now = new Date();
    const timeoutThreshold = this.config.sessionTimeout;

    for (const [terminalId, session] of this.sessions.entries()) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();

      if (session.status === 'terminated' || timeSinceLastActivity > timeoutThreshold) {
        console.log(`Cleaning up timeout session: ${terminalId}`);
        this.cleanupSession(terminalId);
      }
    }
  }

  /**
   * 获取管理器统计信息
   */
  getStats() {
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.status === 'active').length;
    const totalSessions = this.sessions.size;
    const totalBufferSize = Array.from(this.outputBuffers.values())
      .reduce((total, buffer) => total + buffer.getStats().bufferedLines, 0);

    return {
      activeSessions,
      totalSessions,
      totalBufferSize,
      config: this.config
    };
  }

  /**
   * 关闭管理器，清理所有资源
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down terminal manager...');

    // 终止所有活跃的终端
    const activeTerminals = Array.from(this.sessions.keys());
    for (const terminalId of activeTerminals) {
      try {
        await this.killTerminal(terminalId, 'SIGTERM');
      } catch (error) {
        console.error(`Error killing terminal ${terminalId}:`, error);
      }
    }

    // 等待一段时间让进程正常退出
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 强制清理所有会话
    for (const terminalId of activeTerminals) {
      this.cleanupSession(terminalId);
    }

    this.emit('shutdown');
    console.log('Terminal manager shutdown complete');
  }
}
