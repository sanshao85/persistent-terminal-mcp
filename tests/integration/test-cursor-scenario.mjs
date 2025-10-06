#!/usr/bin/env node

/**
 * 模拟 Cursor 使用 MCP 服务器的场景
 * 测试创建终端、写入命令、读取输出等操作
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('='.repeat(80));
console.log('模拟 Cursor 使用场景测试');
console.log('='.repeat(80));
console.log();

const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
console.log(`启动服务器: node ${serverPath}`);
console.log();

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    MCP_DEBUG: 'false'
  }
});

let requestId = 0;
let responses = new Map();
let nonJsonLines = [];
let testsPassed = 0;
let testsFailed = 0;

// 发送 JSON-RPC 请求
function sendRequest(method, params = {}) {
  requestId++;
  const request = {
    jsonrpc: '2.0',
    id: requestId,
    method,
    params
  };
  
  console.log(`\n→ 发送请求 #${requestId}: ${method}`);
  server.stdin.write(JSON.stringify(request) + '\n');
  
  return new Promise((resolve) => {
    responses.set(requestId, resolve);
  });
}

// 监听 stdout
server.stdout.on('data', (data) => {
  const text = data.toString();
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const parsed = JSON.parse(line);
        
        if (parsed.id && responses.has(parsed.id)) {
          const resolve = responses.get(parsed.id);
          responses.delete(parsed.id);
          resolve(parsed);
        }
      } catch (e) {
        nonJsonLines.push(line);
        console.error('✗ 非 JSON 输出:', line);
      }
    }
  }
});

// 监听 stderr
server.stderr.on('data', (data) => {
  const text = data.toString();
  if (text.trim()) {
    console.log('[STDERR]', text.trim());
  }
});

// 运行测试场景
async function runTests() {
  try {
    // 等待服务器启动
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 1. 初始化
    console.log('\n' + '='.repeat(80));
    console.log('测试 1: 初始化连接');
    console.log('='.repeat(80));
    const initResponse = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'cursor-test',
        version: '1.0.0'
      }
    });
    
    if (initResponse.result) {
      console.log('✓ 初始化成功');
      testsPassed++;
    } else {
      console.error('✗ 初始化失败');
      testsFailed++;
    }
    
    // 2. 列出工具
    console.log('\n' + '='.repeat(80));
    console.log('测试 2: 列出可用工具');
    console.log('='.repeat(80));
    const toolsResponse = await sendRequest('tools/list');
    
    if (toolsResponse.result && toolsResponse.result.tools) {
      console.log(`✓ 获取到 ${toolsResponse.result.tools.length} 个工具`);
      toolsResponse.result.tools.forEach(tool => {
        console.log(`  - ${tool.name}`);
      });
      testsPassed++;
    } else {
      console.error('✗ 获取工具列表失败');
      testsFailed++;
    }
    
    // 3. 创建终端
    console.log('\n' + '='.repeat(80));
    console.log('测试 3: 创建终端');
    console.log('='.repeat(80));
    const createResponse = await sendRequest('tools/call', {
      name: 'create_terminal_basic',
      arguments: {
        cwd: process.cwd()
      }
    });
    
    let terminalId = null;
    if (createResponse.result && createResponse.result.content) {
      const content = createResponse.result.content[0];
      console.log('✓ 终端创建成功');
      console.log('  响应:', content.text.substring(0, 200));
      
      // 从 structuredContent 中提取 terminalId
      if (createResponse.result.structuredContent && createResponse.result.structuredContent.terminalId) {
        terminalId = createResponse.result.structuredContent.terminalId;
        console.log(`  Terminal ID: ${terminalId}`);
      }
      testsPassed++;
    } else {
      console.error('✗ 创建终端失败');
      testsFailed++;
    }
    
    if (terminalId) {
      // 4. 写入命令
      console.log('\n' + '='.repeat(80));
      console.log('测试 4: 写入命令');
      console.log('='.repeat(80));
      const writeResponse = await sendRequest('tools/call', {
        name: 'write_terminal',
        arguments: {
          terminalId: terminalId,
          input: 'echo "Hello from MCP test"'
        }
      });
      
      if (writeResponse.result) {
        console.log('✓ 命令写入成功');
        testsPassed++;
      } else {
        console.error('✗ 命令写入失败');
        testsFailed++;
      }
      
      // 等待命令执行
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 5. 读取输出
      console.log('\n' + '='.repeat(80));
      console.log('测试 5: 读取输出');
      console.log('='.repeat(80));
      const readResponse = await sendRequest('tools/call', {
        name: 'read_terminal',
        arguments: {
          terminalId: terminalId
        }
      });
      
      if (readResponse.result && readResponse.result.content) {
        const content = readResponse.result.content[0];
        console.log('✓ 读取输出成功');
        console.log('  输出预览:', content.text.substring(0, 300));
        testsPassed++;
      } else {
        console.error('✗ 读取输出失败');
        testsFailed++;
      }
      
      // 6. 列出终端
      console.log('\n' + '='.repeat(80));
      console.log('测试 6: 列出所有终端');
      console.log('='.repeat(80));
      const listResponse = await sendRequest('tools/call', {
        name: 'list_terminals',
        arguments: {}
      });
      
      if (listResponse.result) {
        console.log('✓ 列出终端成功');
        testsPassed++;
      } else {
        console.error('✗ 列出终端失败');
        testsFailed++;
      }
      
      // 7. 终止终端
      console.log('\n' + '='.repeat(80));
      console.log('测试 7: 终止终端');
      console.log('='.repeat(80));
      const killResponse = await sendRequest('tools/call', {
        name: 'kill_terminal',
        arguments: {
          terminalId: terminalId
        }
      });
      
      if (killResponse.result) {
        console.log('✓ 终止终端成功');
        testsPassed++;
      } else {
        console.error('✗ 终止终端失败');
        testsFailed++;
      }
    }
    
    // 显示测试结果
    console.log('\n' + '='.repeat(80));
    console.log('测试结果汇总');
    console.log('='.repeat(80));
    console.log(`通过: ${testsPassed}`);
    console.log(`失败: ${testsFailed}`);
    console.log(`非 JSON 输出行数: ${nonJsonLines.length}`);
    console.log();
    
    if (testsFailed > 0 || nonJsonLines.length > 0) {
      console.error('❌ 测试失败！');
      if (nonJsonLines.length > 0) {
        console.error('\n发现非 JSON 输出:');
        nonJsonLines.forEach((line, i) => {
          console.error(`  ${i + 1}. ${line}`);
        });
      }
      process.exit(1);
    } else {
      console.log('✅ 所有测试通过！MCP 服务器工作正常，stdout 通道纯净');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  } finally {
    server.kill('SIGTERM');
  }
}

// 启动测试
runTests();

// 处理服务器退出
server.on('exit', (code, signal) => {
  console.log(`\n服务器已退出 (code: ${code}, signal: ${signal})`);
});

// 处理错误
server.on('error', (error) => {
  console.error('服务器错误:', error);
  process.exit(1);
});

