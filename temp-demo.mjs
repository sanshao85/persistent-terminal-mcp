import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    cwd: process.cwd(),
    env: {
      ...process.env,
      MCP_DEBUG: 'true'
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
  console.log('可用工具:', tools.map(tool => tool.name));

  const { result: created } = await client.callTool('create_terminal', {
    shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
    cwd: process.cwd()
  });
  console.log('创建终端结果:', created);

  const terminalId = created.structuredContent.terminalId;

  await client.callTool('write_terminal', {
    terminalId,
    input: 'echo "Hello from MCP"\n'
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { result: readResult } = await client.callTool('read_terminal', {
    terminalId,
    mode: 'full'
  });
  console.log('终端输出:\n', readResult.content[0].text);

  await client.callTool('kill_terminal', { terminalId });
  console.log('终端已终止');

  await client.close();
  await transport.close();
}

main().catch((error) => {
  console.error('测试失败:', error);
  process.exit(1);
});
