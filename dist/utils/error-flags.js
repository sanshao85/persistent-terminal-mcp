export const CONPTY_SUPPRESS_FLAG = '__mcpConptySuppressed';
export function markConptySuppressed(error) {
    if (error && typeof error === 'object') {
        error[CONPTY_SUPPRESS_FLAG] = true;
    }
}
export function isConptySuppressed(error) {
    if (!error || typeof error !== 'object') {
        return false;
    }
    return Boolean(error[CONPTY_SUPPRESS_FLAG]);
}
export function isWindowsConptyEpipe(error) {
    if (!error || typeof error !== 'object') {
        return false;
    }
    return process.platform === 'win32'
        && error.code === 'EPIPE'
        && error.syscall === 'read'
        && (error.errno === -4047 || error.errno === undefined);
}
//# sourceMappingURL=error-flags.js.map