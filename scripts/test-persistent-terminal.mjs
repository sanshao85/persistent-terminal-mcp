import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    cwd: '/Users/admin/Desktop/node-pty'
  });

  const client = new Client({
    name: 'debug-client',
    version: '1.0.0'
  }, {
    capabilities: {
      roots: {},
      sampling: {}
    }
  });

  await client.connect(transport);

  const { tools } = await client.listTools();
  console.log('Tools:', tools.map(t => t.name));

  const cwd = '/Users/admin/Desktop/node-pty/test';
  const createResult = await client.callTool({
    name: 'create_terminal',
    arguments: {
      cwd,
      shell: '/bin/zsh'
    }
  });
  console.log('Create Result:', createResult);

  const terminalId = createResult.content?.[0]?.text?.match(/Terminal ID: ([\w-]+)/)?.[1];
  console.log('Terminal ID extracted:', terminalId);

  if (!terminalId) {
    throw new Error('Failed to parse terminal ID');
  }

  await client.callTool({
    name: 'write_terminal',
    arguments: {
      terminalId,
      input: 'pwd'
    }
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  const readPwd = await client.callTool({
    name: 'read_terminal',
    arguments: {
      terminalId
    }
  });
  console.log('Read Pwd:', readPwd.content?.[0]?.text);

  await client.callTool({
    name: 'write_terminal',
    arguments: {
      terminalId,
      input: 'ls'
    }
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  const readLs = await client.callTool({
    name: 'read_terminal',
    arguments: {
      terminalId,
      mode: 'tail',
      tailLines: 20
    }
  });
  console.log('Read Ls:', readLs.content?.[0]?.text);

  const stats = await client.callTool({
    name: 'get_terminal_stats',
    arguments: {
      terminalId
    }
  });
  console.log('Stats:', stats.content?.[0]?.text);

  await client.callTool({
    name: 'kill_terminal',
    arguments: {
      terminalId
    }
  });

  const listAfter = await client.callTool({
    name: 'list_terminals',
    arguments: {}
  });
  console.log('List after kill:', listAfter.content?.[0]?.text);

  await client.close();
  await transport.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
