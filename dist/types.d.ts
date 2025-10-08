/**
 * 终端会话相关的类型定义
 */
export interface TerminalSession {
    id: string;
    pid: number;
    shell: string;
    cwd: string;
    env: Record<string, string>;
    created: Date;
    lastActivity: Date;
    status: 'active' | 'inactive' | 'terminated';
    pendingCommand?: CommandRuntimeInfo | null;
    lastCommand?: CommandRuntimeInfo | null;
    lastPromptLine?: string | null;
    lastPromptAt?: Date | null;
    hasPrompt?: boolean;
}
export interface CommandRuntimeInfo {
    command: string;
    startedAt: Date;
    completedAt?: Date | null;
}
export interface TerminalCreateOptions {
    shell?: string | undefined;
    cwd?: string | undefined;
    env?: Record<string, string> | undefined;
    cols?: number | undefined;
    rows?: number | undefined;
}
export interface TerminalWriteOptions {
    terminalId: string;
    input: string;
    appendNewline?: boolean;
}
export interface TerminalReadOptions {
    terminalId: string;
    since?: number | undefined;
    maxLines?: number | undefined;
    mode?: 'full' | 'head-tail' | 'head' | 'tail' | undefined;
    headLines?: number | undefined;
    tailLines?: number | undefined;
    stripSpinner?: boolean | undefined;
}
export interface TerminalReadResult {
    output: string;
    totalLines: number;
    hasMore: boolean;
    since: number;
    cursor?: number;
    truncated?: boolean;
    stats?: {
        totalBytes: number;
        estimatedTokens: number;
        linesShown: number;
        linesOmitted: number;
    };
    status?: TerminalReadStatus;
}
export interface TerminalReadStatus {
    isRunning: boolean;
    hasPrompt: boolean;
    pendingCommand: CommandSummary | null;
    lastCommand: CommandSummary | null;
    promptLine: string | null;
    lastActivity: string;
}
export interface CommandSummary {
    command: string;
    startedAt: string;
    completedAt?: string | null;
}
export interface TerminalListResult {
    terminals: Array<{
        id: string;
        pid: number;
        shell: string;
        cwd: string;
        created: string;
        lastActivity: string;
        status: string;
    }>;
}
export interface OutputBufferEntry {
    timestamp: Date;
    content: string;
    lineNumber: number;
    sequence: number;
}
export interface BufferReadOptions {
    since?: number | undefined;
    maxLines?: number | undefined;
}
export interface BufferReadResult {
    entries: OutputBufferEntry[];
    totalLines: number;
    hasMore: boolean;
    nextCursor: number;
}
export interface TerminalManagerConfig {
    maxBufferSize?: number;
    sessionTimeout?: number;
    defaultShell?: string;
    defaultCols?: number;
    defaultRows?: number;
    compactAnimations?: boolean;
    animationThrottleMs?: number;
}
export interface TerminalError extends Error {
    code: string;
    terminalId?: string;
}
export interface CreateTerminalInput {
    shell?: string | undefined;
    cwd?: string | undefined;
    env?: Record<string, string> | undefined;
}
export interface CreateTerminalResult {
    terminalId: string;
    status: string;
    pid: number;
    shell: string;
    cwd: string;
}
export interface WriteTerminalInput {
    terminalId: string;
    input: string;
    appendNewline?: boolean;
}
export interface WriteTerminalResult {
    success: boolean;
    message?: string;
}
export interface ReadTerminalInput {
    terminalId: string;
    since?: number;
    maxLines?: number;
    mode?: 'full' | 'head-tail' | 'head' | 'tail';
    headLines?: number;
    tailLines?: number;
    stripSpinner?: boolean;
}
export interface TerminalStatsInput {
    terminalId: string;
}
export interface TerminalStatsResult {
    terminalId: string;
    totalLines: number;
    totalBytes: number;
    estimatedTokens: number;
    bufferSize: number;
    oldestLine: number;
    newestLine: number;
    isActive: boolean;
}
export interface ListTerminalsResult {
    terminals: Array<{
        id: string;
        pid: number;
        shell: string;
        cwd: string;
        created: string;
        lastActivity: string;
        status: string;
    }>;
}
export interface KillTerminalInput {
    terminalId: string;
    signal?: string;
}
export interface KillTerminalResult {
    success: boolean;
    message?: string;
}
export interface WebUIStartOptions {
    port?: number;
    autoOpen?: boolean;
    terminalManager: any;
}
export interface WebUIStartResult {
    url: string;
    port: number;
    mode: 'new' | 'existing';
    autoOpened: boolean;
}
//# sourceMappingURL=types.d.ts.map