#!/usr/bin/env tsx
/**
 * Test script for Web UI feature
 *
 * This script tests the open_terminal_ui tool by:
 * 1. Creating a terminal manager
 * 2. Creating some test terminals
 * 3. Starting the Web UI
 * 4. Keeping the server running for manual testing
 */
import { TerminalManager } from '../terminal-manager.js';
import { WebUIManager } from '../web-ui-manager.js';
const defaultShell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
async function main() {
    console.log('🧪 Testing Web UI Feature...\n');
    // Create terminal manager
    console.log('1️⃣  Creating terminal manager...');
    const terminalManager = new TerminalManager({
        maxBufferSize: 10000,
        sessionTimeout: 86400000
    });
    console.log('✅ Terminal manager created\n');
    // Create some test terminals
    console.log('2️⃣  Creating test terminals...');
    const terminal1 = await terminalManager.createTerminal({
        shell: defaultShell,
        cwd: process.cwd()
    });
    console.log(`✅ Terminal 1 created: ${terminal1}`);
    const terminal2 = await terminalManager.createTerminal({
        shell: defaultShell,
        cwd: process.cwd()
    });
    console.log(`✅ Terminal 2 created: ${terminal2}`);
    // Send some commands to make them interesting
    await terminalManager.writeToTerminal({
        terminalId: terminal1,
        input: 'echo "Hello from Terminal 1"'
    });
    await terminalManager.writeToTerminal({
        terminalId: terminal2,
        input: 'echo "Hello from Terminal 2"'
    });
    // Wait a bit for output
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('\n3️⃣  Starting Web UI...');
    // Create and start Web UI
    const webUiManager = new WebUIManager();
    try {
        const result = await webUiManager.start({
            port: 3002,
            autoOpen: true,
            terminalManager
        });
        console.log('✅ Web UI started successfully!\n');
        console.log('📊 Details:');
        console.log(`   URL: ${result.url}`);
        console.log(`   Port: ${result.port}`);
        console.log(`   Mode: ${result.mode}`);
        console.log(`   Browser opened: ${result.autoOpened ? 'Yes' : 'No'}\n`);
        console.log('🌐 Web UI is now running!');
        console.log('   Open your browser to: ' + result.url);
        console.log('\n📝 You can:');
        console.log('   - View the terminal list');
        console.log('   - Click on a terminal to see its output');
        console.log('   - Create new terminals');
        console.log('   - Send commands to terminals');
        console.log('   - Kill terminals');
        console.log('\n⏸️  Press Ctrl+C to stop the server\n');
        // Keep the process running
        process.on('SIGINT', async () => {
            console.log('\n\n🛑 Shutting down...');
            await webUiManager.stop();
            await terminalManager.shutdown();
            console.log('✅ Cleanup complete');
            process.exit(0);
        });
        // Keep alive
        await new Promise(() => { });
    }
    catch (error) {
        console.error('❌ Error starting Web UI:', error);
        await terminalManager.shutdown();
        process.exit(1);
    }
}
main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=test-web-ui.js.map