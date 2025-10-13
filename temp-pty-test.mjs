import { TerminalManager } from './dist/terminal-manager.js';

const manager = new TerminalManager();
const id = await manager.createTerminal();

await manager.writeToTerminal({ terminalId: id, input: 'echo "windows-test"\n' });

await new Promise(resolve => setTimeout(resolve, 1000));

const result = await manager.readFromTerminal({ terminalId: id });
console.log(JSON.stringify(result, null, 2));

await manager.killTerminal(id);
await manager.shutdown();
