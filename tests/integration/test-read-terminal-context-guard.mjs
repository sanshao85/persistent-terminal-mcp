#!/usr/bin/env node

/**
 * Integration test for read_terminal context-guard behavior.
 * Verifies maxChars truncation and ANSI cleanup metadata in MCP response.
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

server.stderr.on('data', () => {
  // keep quiet for this test
});

async function main() {
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

    const terminalId = terminalIdMatch[1];

    await call('tools/call', {
      name: 'write_terminal',
      arguments: {
        terminalId,
        input: 'yes CONTEXT_GUARD_TEST | head -n 4000'
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 1800));

    const readResult = await call('tools/call', {
      name: 'read_terminal',
      arguments: {
        terminalId,
        mode: 'full',
        raw: true,
        cleanAnsi: true,
        maxChars: 3000
      }
    });

    const text = readResult?.content?.[0]?.text || '';

    if (!text.includes('行已折叠')) {
      throw new Error('Expected repeated-line compaction marker not found');
    }

    if (!text.includes('ANSI Cleanup: Enabled')) {
      throw new Error('Expected ANSI cleanup metadata not found');
    }

    if (!text.includes('Original Chars:')) {
      throw new Error('Expected original character count metadata not found');
    }

    await call('tools/call', {
      name: 'kill_terminal',
      arguments: { terminalId }
    });

    console.log('✅ read_terminal context-guard integration test passed');
  } finally {
    try {
      server.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
}

main().catch((error) => {
  console.error('❌ read_terminal context-guard integration test failed:', error.message);
  try {
    server.kill('SIGKILL');
  } catch {
    // ignore
  }
  process.exit(1);
});
