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
      expect(session?.status).toBe('terminated');
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
  });

  test('should handle buffer overflow', () => {
    // Add more lines than buffer size
    for (let i = 0; i < 15; i++) {
      buffer.append(`line ${i}`);
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
    
    buffer.append('line 3\nline 4');
    const result2 = buffer.read({ since: result1.totalLines });
    
    expect(result2.entries.length).toBe(2);
    expect(result2.entries[0].content).toBe('line 3');
    expect(result2.entries[1].content).toBe('line 4');
  });

  test('should get latest content', () => {
    for (let i = 0; i < 15; i++) {
      buffer.append(`line ${i}`);
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
});
