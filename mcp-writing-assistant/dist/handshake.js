#!/usr/bin/env ts-node
/**
 * Simple handshake script: starts the server as a child process (node dist/index.js)
 * sends initialize + tools/list, prints tool names, exits.
 */
import { spawn } from 'child_process';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, 'index.js');
const proc = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });
const rl = readline.createInterface({ input: proc.stdout });
let initialized = false;
let listed = false;
let timeout;
function finish(code) {
    clearTimeout(timeout);
    try {
        proc.kill();
    }
    catch { }
    process.exit(code);
}
timeout = setTimeout(() => {
    console.error('Handshake timeout');
    finish(1);
}, 5000);
// Send initialize after small delay to allow server to attach transport
setTimeout(() => {
    const init = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'handshake-script', version: '1.0.0' }
        }
    };
    proc.stdin.write(JSON.stringify(init) + '\n');
}, 200);
rl.on('line', (line) => {
    line = line.trim();
    if (!line)
        return;
    try {
        const msg = JSON.parse(line);
        if (msg.id === 1 && msg.result && !initialized) {
            initialized = true;
            // Request tool list
            const listReq = { jsonrpc: '2.0', id: 2, method: 'tools/list' };
            proc.stdin.write(JSON.stringify(listReq) + '\n');
        }
        else if (msg.id === 2 && msg.result && !listed) {
            listed = true;
            const tools = (msg.result.tools || []).map((t) => t.name);
            console.log('Tools:', tools.join(', '));
            finish(0);
        }
    }
    catch {
        // Ignore non-JSON line
    }
});
proc.stderr.on('data', () => { });
proc.on('exit', (code) => finish(code ?? 1));
//# sourceMappingURL=handshake.js.map