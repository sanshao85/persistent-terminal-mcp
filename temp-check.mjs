import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    cwd: process.cwd(),
    env: {
      ...process.env,
      MAX_BUFFER_SIZE: '10000',
      SESSION_TIMEOUT: '86400000',
      COMPACT_ANIMATIONS: 'true',
      ANIMATION_THROTTLE_MS: '100'
    }
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

  const { tools } = await client.listTools();
  console.log('工具列表:', tools.map(tool => tool.name));

  await client.close();
  await transport.close();
}

main().catch((error) => {
  console.error('连接失败:', error);
  process.exit(1);
});
