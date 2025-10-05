import { EventEmitter } from 'events';
/**
 * 终端输出缓冲器
 * 负责缓存终端输出，支持历史查询和实时流式读取
 */
export class OutputBuffer extends EventEmitter {
    buffer = [];
    maxSize;
    currentLineNumber = 0;
    terminalId;
    constructor(terminalId, maxSize = 10000) {
        super();
        this.terminalId = terminalId;
        this.maxSize = maxSize;
    }
    /**
     * 添加新的输出内容
     */
    append(content) {
        if (!content)
            return;
        const lines = content.split('\n');
        const entries = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // 最后一行如果为空且不是唯一行，则跳过
            if (i === lines.length - 1 && line === '' && lines.length > 1) {
                continue;
            }
            const entry = {
                timestamp: new Date(),
                content: line || '',
                lineNumber: this.currentLineNumber++
            };
            entries.push(entry);
            this.buffer.push(entry);
        }
        // 如果缓冲区超过最大大小，删除最旧的条目
        while (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }
        // 发出新内容事件
        this.emit('data', entries);
    }
    /**
     * 读取缓冲区内容
     */
    read(options = {}) {
        const { since = 0, maxLines = 1000 } = options;
        // 找到起始位置
        let startIndex = 0;
        if (since > 0) {
            startIndex = this.buffer.findIndex(entry => entry.lineNumber >= since);
            if (startIndex === -1) {
                // 如果没找到，说明请求的行号太新，返回空结果
                return {
                    entries: [],
                    totalLines: this.currentLineNumber,
                    hasMore: false
                };
            }
        }
        // 获取指定范围的条目
        const endIndex = Math.min(startIndex + maxLines, this.buffer.length);
        const entries = this.buffer.slice(startIndex, endIndex);
        return {
            entries,
            totalLines: this.currentLineNumber,
            hasMore: endIndex < this.buffer.length
        };
    }
    /**
     * 智能读取：支持头尾模式
     */
    readSmart(options = {}) {
        const { since = 0, mode = 'full', headLines = 50, tailLines = 50, maxLines = 1000 } = options;
        let allEntries = this.buffer.filter(entry => entry.lineNumber > since);
        let resultEntries = [];
        let truncated = false;
        let linesOmitted = 0;
        // 计算总字节数和估算 token 数
        const totalText = allEntries.map(e => e.content).join('\n');
        const totalBytes = Buffer.byteLength(totalText, 'utf8');
        const estimatedTokens = Math.ceil(totalText.length / 4); // 粗略估算：4字符≈1token
        switch (mode) {
            case 'head':
                if (allEntries.length > headLines) {
                    resultEntries = allEntries.slice(0, headLines);
                    truncated = true;
                    linesOmitted = allEntries.length - headLines;
                }
                else {
                    resultEntries = allEntries;
                }
                break;
            case 'tail':
                if (allEntries.length > tailLines) {
                    resultEntries = allEntries.slice(-tailLines);
                    truncated = true;
                    linesOmitted = allEntries.length - tailLines;
                }
                else {
                    resultEntries = allEntries;
                }
                break;
            case 'head-tail':
                if (allEntries.length > headLines + tailLines) {
                    const head = allEntries.slice(0, headLines);
                    const tail = allEntries.slice(-tailLines);
                    resultEntries = [...head, ...tail];
                    truncated = true;
                    linesOmitted = allEntries.length - headLines - tailLines;
                }
                else {
                    resultEntries = allEntries;
                }
                break;
            case 'full':
            default:
                if (maxLines && allEntries.length > maxLines) {
                    resultEntries = allEntries.slice(-maxLines);
                    truncated = true;
                    linesOmitted = allEntries.length - maxLines;
                }
                else {
                    resultEntries = allEntries;
                }
                break;
        }
        return {
            entries: resultEntries,
            totalLines: this.currentLineNumber,
            hasMore: since > 0 && this.buffer.length > 0 && this.buffer[0].lineNumber > since,
            truncated,
            stats: {
                totalBytes,
                estimatedTokens,
                linesShown: resultEntries.length,
                linesOmitted
            }
        };
    }
    /**
     * 获取最新的输出内容
     */
    getLatest(maxLines = 100) {
        const startIndex = Math.max(0, this.buffer.length - maxLines);
        return this.buffer.slice(startIndex);
    }
    /**
     * 获取所有输出内容的文本形式
     */
    getAllText() {
        return this.buffer.map(entry => entry.content).join('\n');
    }
    /**
     * 获取指定范围的文本内容
     */
    getText(since = 0, maxLines = 1000) {
        const result = this.read({ since, maxLines });
        return result.entries.map(entry => entry.content).join('\n');
    }
    /**
     * 清空缓冲区
     */
    clear() {
        this.buffer = [];
        this.currentLineNumber = 0;
        this.emit('clear');
    }
    /**
     * 获取缓冲区统计信息
     */
    getStats() {
        return {
            terminalId: this.terminalId,
            totalLines: this.currentLineNumber,
            bufferedLines: this.buffer.length,
            maxSize: this.maxSize,
            oldestLine: this.buffer.length > 0 ? this.buffer[0].lineNumber : 0,
            newestLine: this.buffer.length > 0 ? this.buffer[this.buffer.length - 1].lineNumber : 0
        };
    }
    /**
     * 设置最大缓冲区大小
     */
    setMaxSize(maxSize) {
        this.maxSize = maxSize;
        // 如果当前缓冲区超过新的最大大小，删除最旧的条目
        while (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }
    }
    /**
     * 获取当前行号
     */
    getCurrentLineNumber() {
        return this.currentLineNumber;
    }
    /**
     * 检查是否有指定行号之后的新内容
     */
    hasNewContent(since) {
        return this.currentLineNumber > since;
    }
}
//# sourceMappingURL=output-buffer.js.map