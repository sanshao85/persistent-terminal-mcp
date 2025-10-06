import { EventEmitter } from 'events';
import { OutputBufferEntry, BufferReadOptions, BufferReadResult } from './types.js';
/**
 * 终端输出缓冲器
 * 负责缓存终端输出，支持历史查询和实时流式读取
 */
export declare class OutputBuffer extends EventEmitter {
    private buffer;
    private maxSize;
    private currentLineNumber;
    private terminalId;
    private currentLineEntry;
    private sequenceCounter;
    private oldestSequence;
    private latestSequence;
    private compactAnimations;
    private animationThrottleMs;
    private spinnerBuffer;
    private spinnerCount;
    private lastSpinnerFlush;
    private spinnerFlushTimer;
    private static readonly SPINNER_CHARS;
    constructor(terminalId: string, maxSize?: number, options?: {
        compactAnimations?: boolean;
        animationThrottleMs?: number;
    });
    private nextSequence;
    private stampSequence;
    /**
     * 检测字符串是否主要包含 spinner 字符
     */
    private isSpinnerLine;
    /**
     * 刷新 spinner 缓冲区
     */
    private flushSpinnerBuffer;
    /**
     * 清除 spinner 刷新定时器
     */
    private clearSpinnerTimer;
    /**
     * 创建新的缓冲条目
     */
    private createEntry;
    private touchCurrentLine;
    /**
     * 结束当前行，将其标记为完成
     */
    private finalizeCurrentLine;
    /**
     * 修剪缓冲区，确保不超过最大容量
     */
    private trimBuffer;
    private consumeEscapeSequence;
    private handleEscapeSequence;
    /**
     * 添加新的输出内容
     */
    append(content: string): void;
    /**
     * 读取缓冲区内容
     */
    read(options?: BufferReadOptions): BufferReadResult;
    /**
     * 智能读取：支持头尾模式
     */
    readSmart(options?: {
        since?: number;
        mode?: 'full' | 'head-tail' | 'head' | 'tail';
        headLines?: number;
        tailLines?: number;
        maxLines?: number;
    }): {
        entries: OutputBufferEntry[];
        totalLines: number;
        hasMore: boolean;
        truncated: boolean;
        nextCursor: number;
        stats: {
            totalBytes: number;
            estimatedTokens: number;
            linesShown: number;
            linesOmitted: number;
        };
    };
    /**
     * 获取最新的输出内容
     */
    getLatest(maxLines?: number): OutputBufferEntry[];
    /**
     * 获取所有输出内容的文本形式
     */
    getAllText(): string;
    /**
     * 获取指定范围的文本内容
     */
    getText(since?: number, maxLines?: number): string;
    /**
     * 清空缓冲区
     */
    clear(): void;
    /**
     * 获取缓冲区统计信息
     */
    getStats(): {
        terminalId: string;
        totalLines: number;
        bufferedLines: number;
        maxSize: number;
        oldestLine: number;
        newestLine: number;
    };
    /**
     * 设置最大缓冲区大小
     */
    setMaxSize(maxSize: number): void;
    /**
     * 获取当前行号
     */
    getCurrentLineNumber(): number;
    /**
     * 检查是否有指定行号之后的新内容
     */
    hasNewContent(since: number): boolean;
    /**
     * 设置动画压缩选项
     */
    setCompactAnimations(enabled: boolean): void;
    /**
     * 获取动画压缩状态
     */
    getCompactAnimations(): boolean;
}
//# sourceMappingURL=output-buffer.d.ts.map