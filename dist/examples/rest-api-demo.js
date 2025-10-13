#!/usr/bin/env node
/**
 * REST API 使用示例
 * 演示如何通过 HTTP 接口管理终端会话
 */
import { isMainModule } from '../utils/module-helpers.js';
async function restApiDemo() {
    console.log('=== REST API Demo ===\n');
    const baseUrl = 'http://localhost:3001';
    try {
        // 1. 检查服务器健康状态
        console.log('1. Checking server health...');
        const healthResponse = await fetch(`${baseUrl}/health`);
        const healthData = await healthResponse.json();
        console.log('   Server status:', healthData.status);
        console.log('   Stats:', JSON.stringify(healthData.stats, null, 2));
        console.log();
        // 2. 创建新终端
        console.log('2. Creating a new terminal...');
        const createResponse = await fetch(`${baseUrl}/terminals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
                cwd: process.cwd()
            })
        });
        if (!createResponse.ok) {
            throw new Error(`Failed to create terminal: ${createResponse.statusText}`);
        }
        const terminalInfo = await createResponse.json();
        console.log('   Terminal created:');
        console.log('   ID:', terminalInfo.terminalId);
        console.log('   PID:', terminalInfo.pid);
        console.log('   Shell:', terminalInfo.shell);
        console.log();
        const terminalId = terminalInfo.terminalId;
        // 3. 发送命令到终端
        console.log('3. Sending command to terminal...');
        const inputResponse = await fetch(`${baseUrl}/terminals/${terminalId}/input`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: 'echo "Hello from REST API!"\n'
            })
        });
        if (!inputResponse.ok) {
            throw new Error(`Failed to send input: ${inputResponse.statusText}`);
        }
        const inputResult = await inputResponse.json();
        console.log('   Input sent:', inputResult.success);
        console.log();
        // 等待命令执行
        await new Promise(resolve => setTimeout(resolve, 1000));
        // 4. 读取终端输出
        console.log('4. Reading terminal output...');
        const outputResponse = await fetch(`${baseUrl}/terminals/${terminalId}/output`);
        if (!outputResponse.ok) {
            throw new Error(`Failed to read output: ${outputResponse.statusText}`);
        }
        const output = await outputResponse.json();
        console.log('   Output:');
        console.log('   ' + output.output.split('\n').join('\n   '));
        console.log('   Total lines:', output.totalLines);
        console.log();
        // 5. 发送另一个命令
        console.log('5. Sending directory listing command...');
        const listCommand = process.platform === 'win32' ? 'dir\n' : 'ls -la\n';
        await fetch(`${baseUrl}/terminals/${terminalId}/input`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: listCommand
            })
        });
        // 等待命令执行
        await new Promise(resolve => setTimeout(resolve, 1500));
        // 6. 读取新输出（增量读取）
        console.log('6. Reading new output (incremental)...');
        const newOutputResponse = await fetch(`${baseUrl}/terminals/${terminalId}/output?since=${output.since}`);
        const newOutput = await newOutputResponse.json();
        console.log('   New output:');
        console.log('   ' + newOutput.output.split('\n').join('\n   '));
        console.log();
        // 7. 列出所有终端
        console.log('7. Listing all terminals...');
        const listResponse = await fetch(`${baseUrl}/terminals`);
        const terminals = await listResponse.json();
        console.log(`   Found ${terminals.terminals.length} terminal(s):`);
        terminals.terminals.forEach((terminal) => {
            console.log(`   - ${terminal.id} (${terminal.status})`);
        });
        console.log();
        // 8. 获取特定终端信息
        console.log('8. Getting specific terminal info...');
        const infoResponse = await fetch(`${baseUrl}/terminals/${terminalId}`);
        const specificInfo = await infoResponse.json();
        console.log('   Terminal info:', JSON.stringify(specificInfo, null, 2));
        console.log();
        // 9. 调整终端大小
        console.log('9. Resizing terminal...');
        const resizeResponse = await fetch(`${baseUrl}/terminals/${terminalId}/resize`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cols: 120,
                rows: 30
            })
        });
        if (resizeResponse.ok) {
            const resizeResult = await resizeResponse.json();
            console.log('   Resize result:', resizeResult.message);
        }
        console.log();
        // 10. 获取管理器统计信息
        console.log('10. Getting manager statistics...');
        const statsResponse = await fetch(`${baseUrl}/stats`);
        const stats = await statsResponse.json();
        console.log('    Stats:', JSON.stringify(stats, null, 2));
        console.log();
        // 11. 终止终端
        console.log('11. Terminating terminal...');
        const deleteResponse = await fetch(`${baseUrl}/terminals/${terminalId}`, {
            method: 'DELETE'
        });
        if (deleteResponse.ok) {
            const deleteResult = await deleteResponse.json();
            console.log('    Termination result:', deleteResult.message);
        }
        console.log();
        // 12. 验证终端已终止
        console.log('12. Verifying terminal termination...');
        const finalListResponse = await fetch(`${baseUrl}/terminals`);
        const finalTerminals = await finalListResponse.json();
        const activeCount = finalTerminals.terminals.filter((t) => t.status === 'active').length;
        console.log(`    Active terminals remaining: ${activeCount}`);
        console.log();
        console.log('=== REST API Demo completed successfully! ===');
    }
    catch (error) {
        console.error('Error in REST API demo:', error);
        console.log('\nMake sure the REST API server is running:');
        console.log('npm run dev:rest');
        console.log('or');
        console.log('node dist/rest-server.js');
    }
}
// 运行演示
if (isMainModule(import.meta.url)) {
    restApiDemo().catch(console.error);
}
//# sourceMappingURL=rest-api-demo.js.map