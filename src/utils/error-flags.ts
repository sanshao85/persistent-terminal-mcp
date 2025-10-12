export const CONPTY_SUPPRESS_FLAG = '__mcpConptySuppressed';

export function markConptySuppressed(error: any): void {
  if (error && typeof error === 'object') {
    (error as any)[CONPTY_SUPPRESS_FLAG] = true;
  }
}

export function isConptySuppressed(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return Boolean((error as any)[CONPTY_SUPPRESS_FLAG]);
}

export function isWindowsConptyEpipe(error: any): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return process.platform === 'win32'
    && error.code === 'EPIPE'
    && error.syscall === 'read'
    && (error.errno === -4047 || error.errno === undefined);

}

