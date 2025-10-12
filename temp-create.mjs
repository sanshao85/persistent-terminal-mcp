import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    cwd: process.cwd()
  });

  const client = new Client({
    name: 'debug-client',
    version: '1.0.0'
  }, {
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
      logging: {}
    }
  });

  await client.connect(transport);

  const { result } = await client.callTool('create_terminal', {}
  );

  console.log('terminal created', result.structuredContent);

  await client.close();
  await transport.close();
}

main().catch(err => {
  console.error('失败:', err);
  process.exit(1);
});
