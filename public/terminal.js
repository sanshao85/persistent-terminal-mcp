// Terminal Detail Page Logic

let term = null;
let ws = null;
let terminalId = null;
let currentCursor = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Get terminal ID from URL
  const pathParts = window.location.pathname.split('/');
  terminalId = pathParts[pathParts.length - 1];
  
  if (!terminalId) {
    alert('Invalid terminal ID');
    window.location.href = '/';
    return;
  }
  
  setupTerminal();
  setupEventListeners();
  connectWebSocket();
  loadTerminalInfo();
  loadTerminalOutput();
});

// Setup xterm.js
function setupTerminal() {
  try {
    term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#ffffff40'
      },
      convertEol: true,
      rows: 24,
      cols: 80
    });

    const container = document.getElementById('terminal-container');
    term.open(container);

    // Fit terminal to container (optional, fallback if FitAddon not available)
    if (typeof FitAddon !== 'undefined') {
      try {
        const fitAddon = new FitAddon.FitAddon();
        term.loadAddon(fitAddon);
        fitAddon.fit();

        // Resize on window resize
        window.addEventListener('resize', () => {
          fitAddon.fit();
        });
      } catch (e) {
        console.warn('FitAddon not available:', e);
      }
    }

    console.log('Terminal initialized successfully');
  } catch (error) {
    console.error('Failed to setup terminal:', error);
    alert('Failed to initialize terminal: ' + error.message);
  }
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('send-btn').addEventListener('click', sendCommand);
  document.getElementById('command-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendCommand();
    }
  });
  
  document.getElementById('clear-btn').addEventListener('click', () => {
    term.clear();
  });
  
  document.getElementById('kill-btn').addEventListener('click', killTerminal);
}

// WebSocket connection
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
  };
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleWebSocketMessage(message);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected, reconnecting...');
    setTimeout(connectWebSocket, 2000);
  };
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
  if (message.terminalId !== terminalId) return;
  
  switch (message.type) {
    case 'output':
      term.write(message.data);
      break;
    case 'exit':
      updateStatus('terminated');
      term.write('\r\n\x1b[31m[Terminal Exited]\x1b[0m\r\n');
      break;
  }
}

// Load terminal info
async function loadTerminalInfo() {
  try {
    console.log('Loading terminal info for:', terminalId);
    const response = await fetch(`/api/terminals/${terminalId}`);

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Terminal not found (${response.status})`);
    }

    const data = await response.json();
    console.log('Terminal data:', data);

    document.getElementById('terminal-title').textContent = `Terminal ${data.id.substring(0, 8)}`;
    document.getElementById('detail-pid').textContent = data.pid;
    document.getElementById('detail-shell').textContent = data.shell;
    document.getElementById('detail-cwd').textContent = data.cwd;
    document.getElementById('detail-created').textContent = new Date(data.created).toLocaleString();

    updateStatus(data.status);
    console.log('Terminal info loaded successfully');
  } catch (error) {
    console.error('Failed to load terminal info:', error);
    alert('Failed to load terminal: ' + error.message);
    // Don't redirect immediately, let user see the error
    // window.location.href = '/';
  }
}

// Load terminal output
async function loadTerminalOutput() {
  try {
    console.log('Loading terminal output for:', terminalId);
    const response = await fetch(`/api/terminals/${terminalId}/output?since=${currentCursor}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to load output:', errorText);
      throw new Error('Failed to load output');
    }

    const data = await response.json();
    console.log('Output data:', data);

    if (data.output) {
      term.write(data.output);
      console.log('Wrote output to terminal');
    } else {
      console.log('No output to display');
    }

    currentCursor = data.cursor || data.since || 0;
    console.log('Current cursor:', currentCursor);
  } catch (error) {
    console.error('Failed to load terminal output:', error);
  }
}

// Send command
async function sendCommand() {
  const input = document.getElementById('command-input');
  const command = input.value;
  
  if (!command.trim()) return;
  
  try {
    const response = await fetch(`/api/terminals/${terminalId}/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: command })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send command');
    }
    
    input.value = '';
  } catch (error) {
    console.error('Failed to send command:', error);
    alert('Failed to send command: ' + error.message);
  }
}

// Kill terminal
async function killTerminal() {
  if (!confirm('Are you sure you want to kill this terminal?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/terminals/${terminalId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to kill terminal');
    }
    
    alert('Terminal killed');
    window.location.href = '/';
  } catch (error) {
    console.error('Failed to kill terminal:', error);
    alert('Failed to kill terminal: ' + error.message);
  }
}

// Update status badge
function updateStatus(status) {
  const badge = document.getElementById('terminal-status');
  badge.textContent = status;
  badge.className = 'status-badge status-' + status;
}

