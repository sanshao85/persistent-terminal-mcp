// Terminal List Page Logic

let terminals = [];
let ws = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  connectWebSocket();
  loadTerminals();
});

// Setup event listeners
function setupEventListeners() {
  document.getElementById('create-terminal-btn').addEventListener('click', showCreateModal);
  document.getElementById('refresh-btn').addEventListener('click', loadTerminals);
  document.getElementById('cancel-btn').addEventListener('click', hideCreateModal);
  document.getElementById('create-form').addEventListener('submit', handleCreateTerminal);
  
  // Close modal on background click
  document.getElementById('create-modal').addEventListener('click', (e) => {
    if (e.target.id === 'create-modal') {
      hideCreateModal();
    }
  });
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
  switch (message.type) {
    case 'terminal_created':
    case 'terminal_killed':
    case 'exit':
      loadTerminals();
      break;
  }
}

// Load terminals from API
async function loadTerminals() {
  try {
    const response = await fetch('/api/terminals');
    const data = await response.json();
    terminals = data.terminals || [];
    renderTerminals();
    updateStats();
  } catch (error) {
    console.error('Failed to load terminals:', error);
    showError('Failed to load terminals');
  }
}

// Render terminals
function renderTerminals() {
  const listEl = document.getElementById('terminal-list');
  const emptyEl = document.getElementById('empty-state');
  
  if (terminals.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.add('show');
    return;
  }
  
  emptyEl.classList.remove('show');
  
  listEl.innerHTML = terminals.map(terminal => `
    <div class="terminal-card">
      <div class="terminal-card-header">
        <span class="terminal-id" onclick="copyToClipboard('${terminal.id}')" title="Click to copy">
          ${terminal.id.substring(0, 8)}...
        </span>
        <span class="status-badge status-${terminal.status}">
          ${terminal.status}
        </span>
      </div>
      
      <div class="terminal-info">
        <div class="info-row">
          <span class="info-label">PID:</span>
          <span class="info-value">${terminal.pid}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Shell:</span>
          <span class="info-value">${terminal.shell}</span>
        </div>
        <div class="info-row">
          <span class="info-label">CWD:</span>
          <span class="info-value">${truncate(terminal.cwd, 30)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Created:</span>
          <span class="info-value">${formatDate(terminal.created)}</span>
        </div>
      </div>
      
      <div class="terminal-actions">
        <button class="btn btn-primary btn-small" onclick="openTerminal('${terminal.id}')">
          Open
        </button>
        <button class="btn btn-danger btn-small" onclick="killTerminal('${terminal.id}')">
          Kill
        </button>
      </div>
    </div>
  `).join('');
}

// Update stats
function updateStats() {
  const total = terminals.length;
  const active = terminals.filter(t => t.status === 'active').length;
  
  document.getElementById('total-count').textContent = total;
  document.getElementById('active-count').textContent = active;
}

// Show create modal
function showCreateModal() {
  document.getElementById('create-modal').classList.add('show');
}

// Hide create modal
function hideCreateModal() {
  document.getElementById('create-modal').classList.remove('show');
  document.getElementById('create-form').reset();
}

// Handle create terminal
async function handleCreateTerminal(e) {
  e.preventDefault();
  
  const shell = document.getElementById('shell').value.trim();
  const cwd = document.getElementById('cwd').value.trim();
  
  const payload = {};
  if (shell) payload.shell = shell;
  if (cwd) payload.cwd = cwd;
  
  try {
    const response = await fetch('/api/terminals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create terminal');
    }
    
    const data = await response.json();
    hideCreateModal();
    loadTerminals();
    
    // Optionally open the new terminal
    if (confirm('Terminal created! Open it now?')) {
      openTerminal(data.terminalId);
    }
  } catch (error) {
    console.error('Failed to create terminal:', error);
    alert('Failed to create terminal: ' + error.message);
  }
}

// Open terminal
function openTerminal(id) {
  window.location.href = `/terminal/${id}`;
}

// Kill terminal
async function killTerminal(id) {
  if (!confirm('Are you sure you want to kill this terminal?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/terminals/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to kill terminal');
    }
    
    loadTerminals();
  } catch (error) {
    console.error('Failed to kill terminal:', error);
    alert('Failed to kill terminal: ' + error.message);
  }
}

// Utility functions
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Terminal ID copied to clipboard!');
  });
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

function showNotification(message) {
  // Simple notification (you can enhance this)
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4ec9b0;
    color: #000;
    padding: 15px 20px;
    border-radius: 4px;
    font-weight: 500;
    z-index: 10000;
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showError(message) {
  alert(message);
}

