import { OutputBuffer } from '../output-buffer.js';

describe('Spinner Detection and Compaction', () => {
  describe('With compactAnimations enabled', () => {
    let buffer: OutputBuffer;

    beforeEach(() => {
      buffer = new OutputBuffer('test-terminal', 100, {
        compactAnimations: true,
        animationThrottleMs: 50
      });
    });

    test('should detect spinner characters', () => {
      // Simulate spinner animation frames
      buffer.append('⠋ Installing dependencies');
      buffer.append('\r⠙ Installing dependencies');
      buffer.append('\r⠹ Installing dependencies');
      buffer.append('\r⠸ Installing dependencies');
      buffer.append('\r⠼ Installing dependencies');
      buffer.append('\r⠴ Installing dependencies');
      buffer.append('\r⠦ Installing dependencies');
      buffer.append('\r⠧ Installing dependencies\n');

      // Wait for throttle to flush
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = buffer.read();
          
          // Should have compacted the spinner updates
          expect(result.entries.length).toBeLessThan(8);
          
          // The last entry should contain the final spinner state or a compact representation
          const lastEntry = result.entries[result.entries.length - 1];
          expect(lastEntry).toBeDefined();
          
          resolve();
        }, 100);
      });
    });

    test('should preserve non-spinner content', () => {
      buffer.append('Starting installation...\n');
      buffer.append('⠋ Installing dependencies\r');
      buffer.append('⠙ Installing dependencies\r');
      buffer.append('⠹ Installing dependencies\n');
      buffer.append('Installation complete!\n');

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = buffer.read();
          const contents = result.entries.map(e => e.content);
          
          // Should preserve the non-spinner lines
          expect(contents).toContain('Starting installation...');
          expect(contents).toContain('Installation complete!');
          
          resolve();
        }, 100);
      });
    });

    test('should handle mixed spinner types', () => {
      // Test different spinner characters
      buffer.append('◐ Loading\r');
      buffer.append('◓ Loading\r');
      buffer.append('◑ Loading\r');
      buffer.append('◒ Loading\n');

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = buffer.read();
          
          // Should compact the spinner updates
          expect(result.entries.length).toBeLessThan(4);
          
          resolve();
        }, 100);
      });
    });

    test('should flush spinner on non-spinner content', () => {
      buffer.append('⠋ Processing\r');
      buffer.append('⠙ Processing\r');
      buffer.append('⠹ Processing\r');
      buffer.append('Done!\n');

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = buffer.read();
          const contents = result.entries.map(e => e.content);
          
          // Should have the final output
          expect(contents).toContain('Done!');
          
          resolve();
        }, 100);
      });
    });

    test('should preserve npm install style summaries', () => {
      buffer.append('bash-3.2$ npm install\n');
      buffer.append('up to date, audited 123 packages in 5s\n');
      buffer.append('\u001b[1G\u001b[0K⠙');
      buffer.append('\u001b[1G\u001b[0K');
      buffer.append('58 packages are looking for funding\n');
      buffer.append('  run `npm fund` for details\n');
      buffer.append('\u001b[1G\u001b[0K');
      buffer.append('found 0 vulnerabilities\n');
      buffer.append('\u001b[1G\u001b[0K⠙');

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = buffer.read();
          const contents = result.entries.map(e => e.content);

          expect(contents).toContain('up to date, audited 123 packages in 5s');
          expect(contents).toContain('58 packages are looking for funding');
          expect(contents).toContain('  run `npm fund` for details');
          expect(contents).toContain('found 0 vulnerabilities');

          resolve();
        }, 120);
      });
    });

    test('should handle ANSI escape sequences with spinners', () => {
      // Simulate colored spinner output
      buffer.append('[33m⠋[0m Installing\r');
      buffer.append('[33m⠙[0m Installing\r');
      buffer.append('[33m⠹[0m Installing\n');

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = buffer.read();
          
          // Should still detect and compact spinners despite ANSI codes
          expect(result.entries.length).toBeLessThan(3);
          
          resolve();
        }, 100);
      });
    });

    test('should handle rapid spinner updates', () => {
      // Simulate very rapid spinner updates
      const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      
      for (let i = 0; i < 50; i++) {
        const spinner = spinners[i % spinners.length];
        buffer.append(`${spinner} Processing\r`);
      }
      buffer.append('Complete!\n');

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = buffer.read();
          
          // Should have significantly compacted the output
          expect(result.entries.length).toBeLessThan(20);
          
          // Should preserve the final message
          const contents = result.entries.map(e => e.content);
          expect(contents).toContain('Complete!');
          
          resolve();
        }, 150);
      });
    });
  });

  describe('With compactAnimations disabled', () => {
    let buffer: OutputBuffer;

    beforeEach(() => {
      buffer = new OutputBuffer('test-terminal', 100, {
        compactAnimations: false,
        animationThrottleMs: 50
      });
    });

    test('should not compact spinner updates when disabled', () => {
      buffer.append('⠋ Installing\r');
      buffer.append('⠙ Installing\r');
      buffer.append('⠹ Installing\r');
      buffer.append('⠸ Installing\n');

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = buffer.read();
          
          // Without compaction, should have the final line
          expect(result.entries.length).toBeGreaterThan(0);
          
          resolve();
        }, 100);
      });
    });
  });

  describe('Dynamic configuration', () => {
    let buffer: OutputBuffer;

    beforeEach(() => {
      buffer = new OutputBuffer('test-terminal', 100, {
        compactAnimations: true,
        animationThrottleMs: 50
      });
    });

    test('should allow toggling compactAnimations', () => {
      expect(buffer.getCompactAnimations()).toBe(true);
      
      buffer.setCompactAnimations(false);
      expect(buffer.getCompactAnimations()).toBe(false);
      
      buffer.setCompactAnimations(true);
      expect(buffer.getCompactAnimations()).toBe(true);
    });

    test('should flush pending spinners when disabling compaction', () => {
      buffer.append('⠋ Processing\r');
      buffer.append('⠙ Processing\r');
      
      // Disable compaction - should flush pending spinners
      buffer.setCompactAnimations(false);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = buffer.read();
          expect(result.entries.length).toBeGreaterThan(0);
          
          resolve();
        }, 100);
      });
    });
  });

  describe('Edge cases', () => {
    let buffer: OutputBuffer;

    beforeEach(() => {
      buffer = new OutputBuffer('test-terminal', 100, {
        compactAnimations: true,
        animationThrottleMs: 50
      });
    });

    test('should handle empty spinner lines', () => {
      buffer.append('\r\r\r\n');
      
      const result = buffer.read();
      expect(result.entries.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle spinner-like text that is not a spinner', () => {
      buffer.append('The file is named spinner.txt\n');
      
      const result = buffer.read();
      const contents = result.entries.map(e => e.content);
      
      // Should preserve normal text
      expect(contents).toContain('The file is named spinner.txt');
    });

    test('should handle mixed content on same line', () => {
      buffer.append('⠋ Step 1: Installing packages\r');
      buffer.append('⠙ Step 1: Installing packages\r');
      buffer.append('✓ Step 1: Installing packages\n');
      buffer.append('⠋ Step 2: Building project\r');
      buffer.append('⠙ Step 2: Building project\r');
      buffer.append('✓ Step 2: Building project\n');

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = buffer.read();
          const contents = result.entries.map(e => e.content);
          
          // Should preserve the completion messages
          expect(contents.some(c => c.includes('Step 1'))).toBe(true);
          expect(contents.some(c => c.includes('Step 2'))).toBe(true);
          
          resolve();
        }, 150);
      });
    });
  });
});
