import { TerminalManager } from '../terminal-manager.js';
import { OutputBuffer } from '../output-buffer.js';

describe('TerminalManager', () => {
  let terminalManager: TerminalManager;

  beforeEach(() => {
    terminalManager = new TerminalManager({
      maxBufferSize: 100,
      sessionTimeout: 5000 // 5 seconds for testing
    });
  });

  afterEach(async () => {
    await terminalManager.shutdown();
  });

  describe('Terminal Creation', () => {
    test('should create a new terminal session', async () => {
      const terminalId = await terminalManager.createTerminal();
      
      expect(terminalId).toBeDefined();
      expect(typeof terminalId).toBe('string');
      
      const session = terminalManager.getTerminalInfo(terminalId);
      expect(session).toBeDefined();
      expect(session?.status).toBe('active');
      expect(session?.pid).toBeGreaterThan(0);
    });

    test('should create terminal with custom options', async () => {
      const options = {
        cwd: process.cwd(),
        env: { TEST_VAR: 'test_value' }
      };

      const terminalId = await terminalManager.createTerminal(options);
      const session = terminalManager.getTerminalInfo(terminalId);
      
      expect(session?.cwd).toBe(options.cwd);
      expect(session?.env.TEST_VAR).toBe('test_value');
    });
  });

  describe('Terminal Operations', () => {
    let terminalId: string;

    beforeEach(async () => {
      terminalId = await terminalManager.createTerminal();
    });

    test('should write to terminal', async () => {
      await expect(
        terminalManager.writeToTerminal({
          terminalId,
          input: 'echo test\n'
        })
      ).resolves.not.toThrow();
    });

    test('should support raw input without auto newline', async () => {
      const fakeId = 'fake-terminal';
      const fakeWrite = jest.fn();
      const fakeSession = {
        id: fakeId,
        pid: 12345,
        shell: '/bin/bash',
        cwd: process.cwd(),
        env: {} as Record<string, string>,
        created: new Date(),
        lastActivity: new Date(),
        status: 'active' as const
      };

      (terminalManager as any).ptyProcesses.set(fakeId, { write: fakeWrite });
      (terminalManager as any).sessions.set(fakeId, fakeSession);

      await terminalManager.writeToTerminal({
        terminalId: fakeId,
        input: '',
        appendNewline: false
      });

      expect(fakeWrite).toHaveBeenCalledWith('');

      (terminalManager as any).ptyProcesses.delete(fakeId);
      (terminalManager as any).sessions.delete(fakeId);
    });

    test('should avoid auto newline for control characters by default', async () => {
      const fakeId = 'control-terminal';
      const fakeWrite = jest.fn();
      const fakeSession = {
        id: fakeId,
        pid: 12346,
        shell: '/bin/bash',
        cwd: process.cwd(),
        env: {} as Record<string, string>,
        created: new Date(),
        lastActivity: new Date(),
        status: 'active' as const
      };

      (terminalManager as any).ptyProcesses.set(fakeId, { write: fakeWrite });
      (terminalManager as any).sessions.set(fakeId, fakeSession);

      await terminalManager.writeToTerminal({
        terminalId: fakeId,
        input: ''
      });

      expect(fakeWrite).toHaveBeenCalledWith('');

      (terminalManager as any).ptyProcesses.delete(fakeId);
      (terminalManager as any).sessions.delete(fakeId);
    });

    test('should auto append newline for printable text by default', async () => {
      const fakeId = 'printable-terminal';
      const fakeWrite = jest.fn();
      const fakeSession = {
        id: fakeId,
        pid: 12347,
        shell: '/bin/bash',
        cwd: process.cwd(),
        env: {} as Record<string, string>,
        created: new Date(),
        lastActivity: new Date(),
        status: 'active' as const
      };

      (terminalManager as any).ptyProcesses.set(fakeId, { write: fakeWrite });
      (terminalManager as any).sessions.set(fakeId, fakeSession);

      await terminalManager.writeToTerminal({
        terminalId: fakeId,
        input: 'npm --version'
      });

      expect(fakeWrite).toHaveBeenCalledWith('npm --version\r');

      (terminalManager as any).ptyProcesses.delete(fakeId);
      (terminalManager as any).sessions.delete(fakeId);
    });

    test('should send carriage return when only newline requested', async () => {
      const fakeId = 'enter-terminal';
      const fakeWrite = jest.fn();
      const fakeSession = {
        id: fakeId,
        pid: 22347,
        shell: '/bin/bash',
        cwd: process.cwd(),
        env: {} as Record<string, string>,
        created: new Date(),
        lastActivity: new Date(),
        status: 'active' as const
      };

      (terminalManager as any).ptyProcesses.set(fakeId, { write: fakeWrite });
      (terminalManager as any).sessions.set(fakeId, fakeSession);

      await terminalManager.writeToTerminal({
        terminalId: fakeId,
        input: '',
        appendNewline: true
      });

      expect(fakeWrite).toHaveBeenCalledWith('\r');

      (terminalManager as any).ptyProcesses.delete(fakeId);
      (terminalManager as any).sessions.delete(fakeId);
    });

    test('should normalize explicit newline input to carriage return', async () => {
      const fakeId = 'normalize-terminal';
      const fakeWrite = jest.fn();
      const fakeSession = {
        id: fakeId,
        pid: 22348,
        shell: '/bin/bash',
        cwd: process.cwd(),
        env: {} as Record<string, string>,
        created: new Date(),
        lastActivity: new Date(),
        status: 'active' as const
      };

      (terminalManager as any).ptyProcesses.set(fakeId, { write: fakeWrite });
      (terminalManager as any).sessions.set(fakeId, fakeSession);

      await terminalManager.writeToTerminal({
        terminalId: fakeId,
        input: '\n',
        appendNewline: false
      });

      expect(fakeWrite).toHaveBeenCalledWith('\r');

      (terminalManager as any).ptyProcesses.delete(fakeId);
      (terminalManager as any).sessions.delete(fakeId);
    });

    test('should generate cursor position reply for terminal query', () => {
      const manager = terminalManager as any;
      const replies = manager.collectTerminalReplies('query-terminal', `prefix\u001b[6n`);

      expect(replies).toEqual(['\u001b[1;1R']);
      expect(manager.terminalQueryRemainders.has('query-terminal')).toBe(false);
    });

    test('should handle split terminal query chunks across events', () => {
      const manager = terminalManager as any;
      const terminalId = 'split-query-terminal';

      const firstReplies = manager.collectTerminalReplies(terminalId, '\u001b[');
      expect(firstReplies).toEqual([]);
      expect(manager.terminalQueryRemainders.get(terminalId)).toBe('\u001b[');

      const secondReplies = manager.collectTerminalReplies(terminalId, '6n');
      expect(secondReplies).toEqual(['\u001b[1;1R']);
      expect(manager.terminalQueryRemainders.has(terminalId)).toBe(false);
    });

    test('should read from terminal', async () => {
      // Send a command
      await terminalManager.writeToTerminal({
        terminalId,
        input: 'echo "test output"\n'
      });

      // Wait a bit for command to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      const result = await terminalManager.readFromTerminal({ terminalId });
      
      expect(result).toBeDefined();
      expect(typeof result.output).toBe('string');
      expect(typeof result.totalLines).toBe('number');
      expect(typeof result.hasMore).toBe('boolean');
      expect(typeof result.cursor).toBe('number');
      expect(result.status).toBeDefined();
      expect(typeof result.status?.isRunning).toBe('boolean');
    });

    test('should preserve raw terminal chunks for replay', async () => {
      await terminalManager.writeToTerminal({
        terminalId,
        input: "echo 'RAW-REPLAY-TEST'"
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      const parsed = await terminalManager.readFromTerminal({ terminalId, since: 0 });
      const raw = await terminalManager.readFromTerminal({ terminalId, since: 0, raw: true });

      expect(parsed.output).toContain('RAW-REPLAY-TEST');
      expect(raw.output).toContain('echo \'RAW-REPLAY-TEST\'');
      expect(raw.output).toContain('RAW-REPLAY-TEST');
      expect(raw.output.length).toBeGreaterThanOrEqual(parsed.output.length);
    });

    test('should list terminals', async () => {
      const result = await terminalManager.listTerminals();
      
      expect(result.terminals).toBeDefined();
      expect(Array.isArray(result.terminals)).toBe(true);
      expect(result.terminals.length).toBeGreaterThan(0);
      
      const terminal = result.terminals.find(t => t.id === terminalId);
      expect(terminal).toBeDefined();
      expect(terminal?.status).toBe('active');
    });

    test('should kill terminal', async () => {
      await terminalManager.killTerminal(terminalId);
      
      // Wait a bit for termination
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const session = terminalManager.getTerminalInfo(terminalId);
      expect(session).toBeUndefined();
      expect(terminalManager.isTerminalActive(terminalId)).toBe(false);
    });

    test('should handle non-existent terminal', async () => {
      const fakeId = 'non-existent-id';
      
      await expect(
        terminalManager.writeToTerminal({
          terminalId: fakeId,
          input: 'test'
        })
      ).rejects.toThrow();

      await expect(
        terminalManager.readFromTerminal({ terminalId: fakeId })
      ).rejects.toThrow();

      await expect(
        terminalManager.killTerminal(fakeId)
      ).rejects.toThrow();
    });
  });

  describe('Manager Statistics', () => {
    test('should return manager stats', () => {
      const stats = terminalManager.getStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.activeSessions).toBe('number');
      expect(typeof stats.totalSessions).toBe('number');
      expect(typeof stats.totalBufferSize).toBe('number');
      expect(stats.config).toBeDefined();
    });
  });
});

describe('OutputBuffer', () => {
  let buffer: OutputBuffer;

  beforeEach(() => {
    buffer = new OutputBuffer('test-terminal', 10); // Small buffer for testing
  });

  test('should append and read content', () => {
    buffer.append('line 1\nline 2\nline 3');
    
    const result = buffer.read();
    expect(result.entries.length).toBe(3);
    expect(result.entries[0].content).toBe('line 1');
    expect(result.entries[1].content).toBe('line 2');
    expect(result.entries[2].content).toBe('line 3');
    expect(result.nextCursor).toBeGreaterThan(0);
  });

  test('should handle buffer overflow', () => {
    // Add more lines than buffer size
    for (let i = 0; i < 15; i++) {
      buffer.append(`line ${i}\n`);
    }
    
    const result = buffer.read();
    expect(result.entries.length).toBeLessThanOrEqual(10);
    
    // Should contain the most recent lines
    const lastEntry = result.entries[result.entries.length - 1];
    expect(lastEntry.content).toBe('line 14');
  });

  test('should support incremental reading', () => {
    buffer.append('line 1\nline 2');
    const result1 = buffer.read();
    
    buffer.append('\nline 3\nline 4\n');
    const result2 = buffer.read({ since: result1.nextCursor });
    
    expect(result2.entries.length).toBe(2);
    expect(result2.entries[0].content).toBe('line 3');
    expect(result2.entries[1].content).toBe('line 4');
  });

  test('should get latest content', () => {
    for (let i = 0; i < 15; i++) {
      buffer.append(`line ${i}\n`);
    }
    
    const latest = buffer.getLatest(3);
    expect(latest.length).toBe(3);
    expect(latest[2].content).toBe('line 14');
  });

  test('should clear buffer', () => {
    buffer.append('test content');
    buffer.clear();
    
    const result = buffer.read();
    expect(result.entries.length).toBe(0);
    expect(result.totalLines).toBe(0);
  });

  test('should provide buffer statistics', () => {
    buffer.append('line 1\nline 2\nline 3');
    
    const stats = buffer.getStats();
    expect(stats.terminalId).toBe('test-terminal');
    expect(stats.totalLines).toBe(3);
    expect(stats.bufferedLines).toBe(3);
    expect(stats.maxSize).toBe(10);
  });

  test('should treat carriage returns as line rewrites', () => {
    buffer.append('⠋ Installing dependencies');
    buffer.append('\r⠙ Installing dependencies');
    buffer.append('\r⠹ Installing dependencies\nDone!\n');

    const result = buffer.read();
    expect(result.entries.map(entry => entry.content)).toEqual([
      '⠹ Installing dependencies',
      'Done!'
    ]);
  });

  test('should collapse consecutive blank lines', () => {
    buffer.append('\n\n\n');

    const result = buffer.read();
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].content).toBe('');
  });

  test('should strip ansi color sequences', () => {
    buffer.append('[33mHello[0m World\n');

    const result = buffer.read();
    expect(result.entries.map(entry => entry.content)).toEqual(['Hello World']);
  });

  test('should handle cursor movement escape sequences', () => {
    buffer.append('[1G[0K⠋ Step 1');
    buffer.append('\r');
    buffer.append('[1G[0K⠙ Step 2\n');

    const result = buffer.read();
    expect(result.entries.map(entry => entry.content)).toEqual(['⠙ Step 2']);
  });

  test('should expose updated lines when using cursor-based reads', () => {
    buffer.append('bash-3.2$ ');
    const first = buffer.read();

    buffer.append('npm install\r\n');
    const second = buffer.read({ since: first.nextCursor });

    const lines = second.entries.map(entry => entry.content);
    expect(lines).toContain('bash-3.2$ npm install');
  });
});
