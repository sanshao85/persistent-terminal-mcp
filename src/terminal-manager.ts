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
  TerminalStatsResult,
  TerminalReadStatus,
  CommandRuntimeInfo
} from './types.js';
import { OutputBuffer } from './output-buffer.js';
import { OutputBufferEntry } from './types.js';
import { isWindowsConptyEpipe, markConptySuppressed } from './utils/error-flags.js';

let conptyHandlerRegistered = false;

if (process.platform === 'win32' && !conptyHandlerRegistered) {
  conptyHandlerRegistered = true;
  const handler = (error: any) => {
    if (isWindowsConptyEpipe(error)) {
      markConptySuppressed(error);
      if (process.env.MCP_DEBUG === 'true') {
        process.stderr.write('[MCP-DEBUG] Suppressed Windows ConPTY EPIPE error\n');
      }
      return;
    }

    process.removeListener('uncaughtException', handler);
    process.nextTick(() => {
      throw error;
    });
  };

  process.prependListener('uncaughtException', handler);
}

/**
 * 终端会话管理器
 * 负责创建、管理和维护持久化的终端会话
 */
export class TerminalManager extends EventEmitter {
  private sessions = new Map<string, TerminalSession>();
  private ptyProcesses = new Map<string, any>();
  private outputBuffers = new Map<string, OutputBuffer>();
  private exitPromises = new Map<string, Promise<void>>();
  private exitResolvers = new Map<string, () => void>();
  private config: Required<TerminalManagerConfig>;
  private cleanupTimer: NodeJS.Timeout;
  private readonly isWindows: boolean;

  constructor(config: TerminalManagerConfig = {}) {
    super();

    this.isWindows = process.platform === 'win32';

    this.config = {
      maxBufferSize: config.maxBufferSize || 10000,
      sessionTimeout: config.sessionTimeout || 24 * 60 * 60 * 1000, // 24 hours
      defaultShell: config.defaultShell || (this.isWindows ? 'powershell.exe' : '/bin/bash'),
      defaultCols: config.defaultCols || 80,
      defaultRows: config.defaultRows || 24,
      compactAnimations: config.compactAnimations ?? !this.isWindows,
      animationThrottleMs: config.animationThrottleMs || 100
    };

    // 定期清理超时的会话
    this.cleanupTimer = setInterval(() => this.cleanupTimeoutSessions(), 60000); // 每分钟检查一次
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
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
      const ptyEnv: Record<string, string> = {};
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') {
          ptyEnv[key] = value;
        }
      }

      if (!ptyEnv.TERM) {
        ptyEnv.TERM = 'xterm-256color';
      }

      if (!this.isWindows && !ptyEnv.LANG) {
        ptyEnv.LANG = 'en_US.UTF-8';
      }

      if (!ptyEnv.PAGER && !this.isWindows) {
        ptyEnv.PAGER = 'cat';
      }

      const spawnOptions: Record<string, unknown> = {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: ptyEnv
      };

      if (this.isWindows) {
        const useConpty = process.env.WINDOWS_USE_CONPTY !== 'false';
        spawnOptions.useConpty = useConpty;
      }

      if (!this.isWindows) {
        spawnOptions.encoding = 'utf8';
      }

      const ptyProcess = spawn(shell, this.getDefaultShellArgs(shell), spawnOptions);

      let resolveExit: (() => void) | null = null;
      const exitPromise = new Promise<void>((resolve) => {
        resolveExit = resolve;
      });
      this.exitPromises.set(terminalId, exitPromise);
      if (resolveExit) {
        this.exitResolvers.set(terminalId, resolveExit);
      }

      // 创建会话记录
      const session: TerminalSession = {
        id: terminalId,
        pid: ptyProcess.pid,
        shell,
        cwd,
        env: ptyEnv,
        created: new Date(),
        lastActivity: new Date(),
        status: 'active',
        pendingCommand: null,
        lastCommand: null,
        lastPromptLine: null,
        lastPromptAt: null,
        hasPrompt: false
      };

      // 创建输出缓冲器
      const outputBuffer = new OutputBuffer(terminalId, this.config.maxBufferSize, {
        compactAnimations: this.config.compactAnimations,
        animationThrottleMs: this.config.animationThrottleMs
      });

      // 监听输出缓冲的更新以追踪提示符和命令状态
      outputBuffer.on('data', (entries: OutputBufferEntry[]) => {
        this.processBufferEntries(session, entries);
      });

      // 监听 PTY 输出
      // 使用 setImmediate 确保数据立即被处理，避免缓冲延迟
      ptyProcess.onData((data: string) => {
        setImmediate(() => {
          const now = new Date();
          session.lastActivity = now;
          outputBuffer.append(data);
          this.emit('terminalOutput', terminalId, data);
        });
      });

      // 监听 PTY 退出
      ptyProcess.onExit((e: { exitCode: number; signal?: number }) => {
        session.status = 'terminated';
        session.lastActivity = new Date();
        this.emit('terminalExit', terminalId, e.exitCode, e.signal);

        const resolver = this.exitResolvers.get(terminalId);
        if (resolver) {
          resolver();
          this.exitResolvers.delete(terminalId);
        }

        // 清理资源
        const cleanupTimer = setTimeout(() => {
          this.cleanupSession(terminalId);
        }, 5000); // 5秒后清理
        if (typeof cleanupTimer.unref === 'function') {
          cleanupTimer.unref();
        }
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
    const { terminalId, input, appendNewline } = options;

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
      const autoAppend = appendNewline ?? this.shouldAutoAppendNewline(input);
      const needsNewline =
        autoAppend && !/(?:\r\n|\r|\n)$/.test(input);
      const newlineSequence = this.isWindows ? '\r\n' : '\r';
      const inputWithAutoNewline = needsNewline ? input + newlineSequence : input;
      const inputToWrite = this.normalizeNewlines(inputWithAutoNewline);

      // 写入数据到 PTY
      // node-pty 的 write 方法是同步的，但我们需要确保数据被发送
      const written = ptyProcess.write(inputToWrite);

      // 如果写入失败（返回 false），等待 drain 事件
      if (written === false) {
        await new Promise<void>((resolve) => {
          const onDrain = () => {
            ptyProcess.off('drain', onDrain);
            resolve();
          };
          ptyProcess.on('drain', onDrain);
          // 设置超时，避免永久等待
          setTimeout(() => {
            ptyProcess.off('drain', onDrain);
            resolve();
          }, 5000);
        });
      }

      session.lastActivity = new Date();
      this.emit('terminalInput', terminalId, inputToWrite);

      const executed = /[\n\r]$/.test(inputToWrite);
      this.trackCommand(session, inputToWrite, executed);

      // 给 PTY 一点时间处理输入
      // 这对于交互式应用特别重要
      await new Promise(resolve => setImmediate(resolve));
    } catch (error) {
      const terminalError: TerminalError = new Error(`Failed to write to terminal: ${error}`) as TerminalError;
      terminalError.code = 'WRITE_FAILED';
      terminalError.terminalId = terminalId;
      throw terminalError;
    }
  }

  private normalizeNewlines(value: string): string {
    if (!value) {
      return value;
    }

    if (this.isWindows) {
      return value.replace(/\r?\n/g, '\r\n');
    }

    // Normalize CRLF to CR first, then convert bare LF to CR so Enter behaves like a real TTY
    return value.replace(/\r\n/g, '\r').replace(/\n/g, '\r');
  }

  private getDefaultShellArgs(shell: string): string[] {
    if (!this.isWindows || !shell) {
      return [];
    }

    const lowerShell = shell.toLowerCase();

    if (lowerShell.includes('powershell') || lowerShell.includes('pwsh')) {
      return ['-NoLogo'];
    }

    if (lowerShell.endsWith('cmd') || lowerShell.endsWith('cmd.exe')) {
      return ['/Q'];
    }

    return [];
  }

  private shouldAutoAppendNewline(input: string): boolean {
    if (!input) {
      return false;
    }

    if (input.includes('')) {
      return false;
    }

    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      if ((code < 32 || code === 127) && code !== 9 && code !== 10 && code !== 13) {
        return false;
      }
    }

    return true;
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
      // 给一个很小的延迟，确保 onData 事件中的数据已经被处理
      // 这解决了"读取到旧数据"的问题
      await new Promise(resolve => setImmediate(resolve));
      // 如果指定了智能读取模式，使用新的 readSmart 方法
      const cursorPosition = since ?? 0;

      if (mode && mode !== 'full') {
        const smartOptions: any = {
          since: cursorPosition,
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
          since: result.nextCursor,
          cursor: result.nextCursor,
          truncated: result.truncated,
          stats: result.stats,
          status: this.buildReadStatus(session)
        };
      }

      // 使用原有的读取方法
      const result = outputBuffer.read({ since: cursorPosition, maxLines });
      const output = result.entries.map(entry => entry.content).join('\n');

      return {
        output,
        totalLines: result.totalLines,
        hasMore: result.hasMore,
        since: result.nextCursor,
        cursor: result.nextCursor,
        status: this.buildReadStatus(session)
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
   * 检查终端是否正在运行命令
   * 通过检查最后一次活动时间来判断
   */
  isTerminalBusy(terminalId: string): boolean {
    const session = this.sessions.get(terminalId);
    if (!session) {
      return false;
    }

    if (session.pendingCommand) {
      return true;
    }

    // 如果最后活动时间在 100ms 内，认为终端正在忙碌
    const timeSinceLastActivity = Date.now() - session.lastActivity.getTime();
    return timeSinceLastActivity < 100;
  }

  /**
   * 等待终端输出稳定
   * 用于确保命令执行完成后再读取输出
   */
  async waitForOutputStable(terminalId: string, timeout: number = 5000, stableTime: number = 500): Promise<void> {
    const session = this.sessions.get(terminalId);
    if (!session) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    const startTime = Date.now();
    let lastActivityTime = session.lastActivity.getTime();

    while (Date.now() - startTime < timeout) {
      const currentActivityTime = session.lastActivity.getTime();

      // 如果输出已经稳定（在 stableTime 内没有新输出）
      if (Date.now() - currentActivityTime > stableTime) {
        return;
      }

      // 如果有新的活动，更新时间
      if (currentActivityTime > lastActivityTime) {
        lastActivityTime = currentActivityTime;
      }

      // 等待一小段时间再检查
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 超时也返回，不抛出错误
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
    const exitPromise = this.exitPromises.get(terminalId);

    if (!ptyProcess || !session) {
      const error: TerminalError = new Error(`Terminal ${terminalId} not found`) as TerminalError;
      error.code = 'TERMINAL_NOT_FOUND';
      error.terminalId = terminalId;
      throw error;
    }

    try {
      if (this.isWindows) {
        ptyProcess.kill();
      } else {
        ptyProcess.kill(signal);
      }
      session.status = 'terminated';
      session.lastActivity = new Date();
      this.emit('terminalKilled', terminalId, signal);

      await this.waitForPtyExit(terminalId, ptyProcess, exitPromise);

      const buffer = this.outputBuffers.get(terminalId);
      if (buffer) {
        buffer.removeAllListeners();
      }

      // 清理资源：从 Map 中删除已终止的终端
      this.ptyProcesses.delete(terminalId);
      this.outputBuffers.delete(terminalId);
      this.sessions.delete(terminalId);
      this.exitPromises.delete(terminalId);
      this.exitResolvers.delete(terminalId);
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
      outputBuffer.removeAllListeners();
      outputBuffer.clear();
      this.outputBuffers.delete(terminalId);
    }

    this.sessions.delete(terminalId);
    this.exitPromises.delete(terminalId);
    this.exitResolvers.delete(terminalId);
    this.emit('terminalCleaned', terminalId);
  }

  private async waitForPtyExit(terminalId: string, ptyProcess: any, exitPromise?: Promise<void>) {
    if (!exitPromise) {
      return;
    }

    const waitWithTimeout = async (timeoutMs: number): Promise<boolean> => {
      return await Promise.race([
        exitPromise.then(() => true).catch(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs))
      ]);
    };

    const graceTimeout = this.config.sessionTimeout > 0 ? Math.min(2000, this.config.sessionTimeout) : 2000;
    const exitedInGrace = await waitWithTimeout(graceTimeout);
    if (exitedInGrace) {
      return;
    }

    try {
      if (this.isWindows) {
        ptyProcess.kill();
      } else {
        ptyProcess.kill('SIGKILL');
      }
    } catch {
      // ignore kill escalation errors
    }

    await waitWithTimeout(500);
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
        if (process.env.MCP_DEBUG === 'true') {
          process.stderr.write(`[MCP-DEBUG] Cleaning up timeout session: ${terminalId}\n`);
        }
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
    if (process.env.MCP_DEBUG === 'true') {
      process.stderr.write('[MCP-DEBUG] Shutting down terminal manager...\n');
    }

    // 终止所有活跃的终端
    const activeTerminals = Array.from(this.sessions.keys());
    for (const terminalId of activeTerminals) {
      try {
        await this.killTerminal(terminalId, 'SIGTERM');
      } catch (error) {
        if (process.env.MCP_DEBUG === 'true') {
          process.stderr.write(`[MCP-DEBUG] Error killing terminal ${terminalId}: ${error}\n`);
        }
      }
    }

    // 等待一段时间让进程正常退出
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 强制清理所有会话
    for (const terminalId of activeTerminals) {
      this.cleanupSession(terminalId);
    }

    this.emit('shutdown');
    clearInterval(this.cleanupTimer);
    if (process.env.MCP_DEBUG === 'true') {
      process.stderr.write('[MCP-DEBUG] Terminal manager shutdown complete\n');
    }
  }

  private processBufferEntries(session: TerminalSession, entries: OutputBufferEntry[]): void {
    if (!entries || entries.length === 0) {
      return;
    }

    const seen = new Set<number>();
    let promptDetected = false;

    for (const entry of entries) {
      if (!entry || seen.has(entry.sequence)) {
        continue;
      }
      seen.add(entry.sequence);

      const content = entry.content ?? '';
      if (!content) {
        continue;
      }

        if (this.isPromptLine(content) || this.isInteractivePromptLine(content)) {
          promptDetected = true;
          session.hasPrompt = true;
          session.lastPromptLine = content;
          session.lastPromptAt = entry.timestamp || new Date();

        if (session.pendingCommand) {
          session.pendingCommand.completedAt = new Date();
          session.lastCommand = {
            command: session.pendingCommand.command,
            startedAt: session.pendingCommand.startedAt,
            completedAt: session.pendingCommand.completedAt
          };
          session.pendingCommand = null;
        }
      }
    }

    if (!promptDetected && entries.length > 0 && session.pendingCommand) {
      session.hasPrompt = false;
    }
  }

  private trackCommand(session: TerminalSession, rawInput: string, executed: boolean): void {
    if (!session || !executed) {
      return;
    }

    const commandText = this.extractCommandText(rawInput);
    if (!commandText) {
      return;
    }

    const commandInfo: CommandRuntimeInfo = {
      command: commandText,
      startedAt: new Date(),
      completedAt: null
    };

    session.pendingCommand = commandInfo;
    session.hasPrompt = false;
  }

  private extractCommandText(rawInput: string): string | null {
    if (!rawInput) {
      return null;
    }

    const normalized = rawInput.replace(/\r/g, '\n').split('\n');
    for (let i = normalized.length - 1; i >= 0; i--) {
      const line = normalized[i];
      if (!line) {
        continue;
      }
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      if (this.isMostlyPrintable(trimmed)) {
        return trimmed.slice(0, 500);
      }
    }

    return null;
  }

  private isMostlyPrintable(value: string): boolean {
    if (!value) {
      return false;
    }

    let printable = 0;
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code === 9 || code === 32 || code >= 33) {
        printable++;
      }
    }

    return printable > 0 && printable / value.length >= 0.6;
  }

  private isPromptLine(line: string): boolean {
    if (!line) {
      return false;
    }

    const trimmedEnd = line.trimEnd();
    if (!trimmedEnd) {
      return false;
    }

    const promptSuffixes = ['$', '#', '%', '>', ':'];

    if (this.isWindows) {
      const winPromptPatterns = [
        /^PS [^>]*>$/,
        /^[A-Za-z]:\\[^>]*>$/,
        /^[A-Za-z]:>$/
      ];
      if (winPromptPatterns.some((pattern) => pattern.test(trimmedEnd))) {
        return true;
      }
    }

    // Common case: prompt ends with symbol and space
    for (const suffix of promptSuffixes) {
      if (line.endsWith(`${suffix} `)) {
        const prefix = trimmedEnd.slice(0, -1).trim();
        if (prefix.length > 0) {
          return true;
        }
      }
    }

    // Prompts without trailing space
    const lastChar = trimmedEnd.charAt(trimmedEnd.length - 1);
    if (promptSuffixes.includes(lastChar)) {
      const prefix = trimmedEnd.slice(0, -1).trim();
      if (prefix.length > 0 && /[a-zA-Z0-9_@~\/\\\-\]\)\.\s:]$/.test(prefix)) {
        return true;
      }
    }

    return false;
  }

  private isInteractivePromptLine(line: string): boolean {
    if (!line) {
      return false;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      return false;
    }

    const interactiveKeywords = ['select', 'choose', 'pick', 'enter', 'provide', 'answer', 'input', 'type'];

    const lower = trimmed.toLowerCase();
    if (interactiveKeywords.some((keyword) => lower.startsWith(keyword))) {
      if (/[?:]$/.test(trimmed)) {
        return true;
      }
    }

    if (/[?:]$/.test(trimmed) && trimmed.length <= 80) {
      return true;
    }

    return false;
  }

  private buildReadStatus(session: TerminalSession): TerminalReadStatus {
    const pending = session.pendingCommand
      ? {
          command: session.pendingCommand.command,
          startedAt: session.pendingCommand.startedAt.toISOString(),
          completedAt: session.pendingCommand.completedAt ? session.pendingCommand.completedAt.toISOString() : null
        }
      : null;

    const lastCommand = session.lastCommand
      ? {
          command: session.lastCommand.command,
          startedAt: session.lastCommand.startedAt.toISOString(),
          completedAt: session.lastCommand.completedAt ? session.lastCommand.completedAt.toISOString() : null
        }
      : null;

    return {
      isRunning: Boolean(session.pendingCommand),
      hasPrompt: Boolean(session.hasPrompt),
      pendingCommand: pending,
      lastCommand,
      promptLine: session.lastPromptLine ?? null,
      lastActivity: session.lastActivity.toISOString()
    };
  }
}

