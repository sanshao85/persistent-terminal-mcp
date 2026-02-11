#!/usr/bin/env node

/**
 * Integration test for read_terminal raw mode tail/head-tail support.
 * Ensures mode filters are applied after ANSI-cleanup when raw=true.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    MCP_DEBUG: 'false'
  }
});

let stdoutBuffer = '';
let nextId = 1;
const pending = new Map();

function call(method, params = {}) {
  const id = nextId++;
  const request = { jsonrpc: '2.0', id, method, params };

  const promise = new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    server.stdin.write(JSON.stringify(request) + '\n');
  });

  return promise;
}

function parseStdoutChunk(chunk) {
  stdoutBuffer += chunk.toString();
  let idx;
  while ((idx = stdoutBuffer.indexOf('\n')) >= 0) {
    const line = stdoutBuffer.slice(0, idx);
    stdoutBuffer = stdoutBuffer.slice(idx + 1);

    if (!line.trim()) {
      continue;
    }

    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }

    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        reject(new Error(msg.error.message || 'MCP error'));
      } else {
        resolve(msg.result);
      }
    }
  }
}

server.stdout.on('data', parseStdoutChunk);
server.stderr.on('data', () => {});

async function main() {
  let terminalId;
  try {
    await call('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'integration-test', version: '1.0.0' }
    });

    const createResult = await call('tools/call', {
      name: 'create_terminal',
      arguments: {}
    });

    const createText = createResult?.content?.[0]?.text || '';
    const terminalIdMatch = createText.match(/Terminal ID: ([a-f0-9\-]+)/i);
    if (!terminalIdMatch) {
      throw new Error('Failed to parse terminalId from create_terminal response');
    }

    terminalId = terminalIdMatch[1];

    await call('tools/call', {
      name: 'write_terminal',
      arguments: {
        terminalId,
        input: 'for i in $(seq 1 30); do echo RAWTAIL_$i; done'
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const tailResult = await call('tools/call', {
      name: 'read_terminal',
      arguments: {
        terminalId,
        mode: 'tail',
        tailLines: 5,
        raw: true,
        cleanAnsi: true,
        maxChars: 20000
      }
    });

    const tailText = tailResult?.content?.[0]?.text || '';

    if (!tailText.includes('Raw Mode Filter: tail')) {
      throw new Error('Expected raw tail mode metadata not found');
    }

    if (!tailText.includes('RAWTAIL_30')) {
      throw new Error('Expected latest line RAWTAIL_30 not found in tail output');
    }

    if (tailText.includes('RAWTAIL_1')) {
      throw new Error('Tail output still contains very early line RAWTAIL_1');
    }

    const headTailResult = await call('tools/call', {
      name: 'read_terminal',
      arguments: {
        terminalId,
        mode: 'head-tail',
        headLines: 3,
        tailLines: 3,
        raw: true,
        cleanAnsi: true,
        maxChars: 20000
      }
    });

    const headTailText = headTailResult?.content?.[0]?.text || '';

    if (!headTailText.includes('Raw Mode Filter: head-tail')) {
      throw new Error('Expected raw head-tail mode metadata not found');
    }

    if (!headTailText.includes('省略')) {
      throw new Error('Expected omission marker not found for raw head-tail output');
    }

    await call('tools/call', {
      name: 'kill_terminal',
      arguments: { terminalId }
    });

    console.log('✅ read_terminal raw tail/head-tail integration test passed');
  } finally {
    try {
      if (terminalId) {
        await call('tools/call', {
          name: 'kill_terminal',
          arguments: { terminalId }
        });
      }
    } catch {
      // ignore cleanup errors
    }

    try {
      server.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
}

main().catch((error) => {
  console.error('❌ read_terminal raw tail/head-tail integration test failed:', error.message);
  try {
    server.kill('SIGKILL');
  } catch {
    // ignore
  }
  process.exit(1);
});

