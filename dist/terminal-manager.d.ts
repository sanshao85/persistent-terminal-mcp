import { EventEmitter } from 'events';
import { TerminalSession, TerminalCreateOptions, TerminalWriteOptions, TerminalReadOptions, TerminalReadResult, TerminalListResult, TerminalManagerConfig, TerminalStatsResult } from './types.js';
/**
 * 终端会话管理器
 * 负责创建、管理和维护持久化的终端会话
 */
export declare class TerminalManager extends EventEmitter {
    private sessions;
    private ptyProcesses;
    private outputBuffers;
    private exitPromises;
    private exitResolvers;
    private config;
    private cleanupTimer;
    private readonly isWindows;
    constructor(config?: TerminalManagerConfig);
    /**
     * 创建新的终端会话
     */
    createTerminal(options?: TerminalCreateOptions): Promise<string>;
    /**
     * 向终端写入数据
     */
    writeToTerminal(options: TerminalWriteOptions): Promise<void>;
    private normalizeNewlines;
    private getDefaultShellArgs;
    private shouldAutoAppendNewline;
    /**
     * 从终端读取输出
     */
    readFromTerminal(options: TerminalReadOptions): Promise<TerminalReadResult>;
    /**
     * 获取终端统计信息
     */
    getTerminalStats(terminalId: string): Promise<TerminalStatsResult>;
    /**
     * 检查终端是否正在运行命令
     * 通过检查最后一次活动时间来判断
     */
    isTerminalBusy(terminalId: string): boolean;
    /**
     * 等待终端输出稳定
     * 用于确保命令执行完成后再读取输出
     */
    waitForOutputStable(terminalId: string, timeout?: number, stableTime?: number): Promise<void>;
    /**
     * 列出所有终端会话
     */
    listTerminals(): Promise<TerminalListResult>;
    /**
     * 终止终端会话
     */
    killTerminal(terminalId: string, signal?: string): Promise<void>;
    /**
     * 获取终端会话信息
     */
    getTerminalInfo(terminalId: string): TerminalSession | undefined;
    /**
     * 检查终端是否存在且活跃
     */
    isTerminalActive(terminalId: string): boolean;
    /**
     * 调整终端大小
     */
    resizeTerminal(terminalId: string, cols: number, rows: number): Promise<void>;
    /**
     * 清理指定会话
     */
    private cleanupSession;
    private waitForPtyExit;
    /**
     * 清理超时的会话
     */
    private cleanupTimeoutSessions;
    /**
     * 获取管理器统计信息
     */
    getStats(): {
        activeSessions: number;
        totalSessions: number;
        totalBufferSize: number;
        config: Required<TerminalManagerConfig>;
    };
    /**
     * 关闭管理器，清理所有资源
     */
    shutdown(): Promise<void>;
    private processBufferEntries;
    private trackCommand;
    private extractCommandText;
    private isMostlyPrintable;
    private isPromptLine;
    private buildReadStatus;
}
//# sourceMappingURL=terminal-manager.d.ts.map