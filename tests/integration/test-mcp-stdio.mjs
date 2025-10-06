#!/usr/bin/env node

/**
 * 测试 MCP 服务器的 stdio 通道是否纯净
 * 验证没有非 JSON-RPC 的输出污染 stdout
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('='.repeat(80));
console.log('测试 MCP 服务器 stdio 通道纯净性');
console.log('='.repeat(80));
console.log();

// 启动 MCP 服务器 - 从项目根目录的 dist 文件夹
const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
console.log(`启动服务器: node ${serverPath}`);
console.log();

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    MCP_DEBUG: 'false' // 关闭调试模式
  }
});

let stdoutData = '';
let stderrData = '';
let jsonRpcMessages = [];
let nonJsonLines = [];

// 监听 stdout（应该只有 JSON-RPC 消息）
server.stdout.on('data', (data) => {
  const text = data.toString();
  stdoutData += text;
  
  // 尝试解析每一行
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.trim()) {
      try {
        const parsed = JSON.parse(line);
        jsonRpcMessages.push(parsed);
        console.log('✓ 收到有效的 JSON-RPC 消息:', JSON.stringify(parsed).substring(0, 100) + '...');
      } catch (e) {
        nonJsonLines.push(line);
        console.error('✗ 收到非 JSON 输出:', line);
      }
    }
  }
});

// 监听 stderr（调试信息应该在这里）
server.stderr.on('data', (data) => {
  const text = data.toString();
  stderrData += text;
  console.log('[STDERR]', text.trim());
});

// 发送初始化请求
setTimeout(() => {
  console.log('\n发送初始化请求...');
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };
  
  server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 1000);

// 2秒后发送 list tools 请求
setTimeout(() => {
  console.log('\n发送 tools/list 请求...');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 2000);

// 3秒后关闭服务器并检查结果
setTimeout(() => {
  console.log('\n关闭服务器...');
  server.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('\n' + '='.repeat(80));
    console.log('测试结果');
    console.log('='.repeat(80));
    console.log();
    console.log(`收到的 JSON-RPC 消息数量: ${jsonRpcMessages.length}`);
    console.log(`收到的非 JSON 行数: ${nonJsonLines.length}`);
    console.log();
    
    if (nonJsonLines.length > 0) {
      console.error('❌ 测试失败！发现非 JSON 输出污染 stdout:');
      nonJsonLines.forEach((line, i) => {
        console.error(`  ${i + 1}. ${line}`);
      });
      process.exit(1);
    } else {
      console.log('✅ 测试通过！stdout 通道纯净，只有 JSON-RPC 消息');
      console.log();
      console.log('stderr 输出（调试信息）:');
      console.log(stderrData || '(无)');
      process.exit(0);
    }
  }, 500);
}, 3000);

// 处理服务器退出
server.on('exit', (code, signal) => {
  console.log(`\n服务器已退出 (code: ${code}, signal: ${signal})`);
});

// 处理错误
server.on('error', (error) => {
  console.error('服务器错误:', error);
  process.exit(1);
});

