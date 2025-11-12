// Copter Battle - Client-side JavaScript

// Check if we're on HTTPS (GitHub Pages) and show warning
if (window.location.protocol === 'https:') {
    const warning = document.getElementById('httpsWarning');
    if (warning) {
        warning.style.display = 'block';
    }
    // Try to connect anyway, but it might be blocked by browser
}

// Use window.location.protocol to auto-detect if we're on HTTP or HTTPS
const SERVER_URL = 'http://188.166.220.144:3000';
const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
});

// Handle connection errors
socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    if (window.location.protocol === 'https:') {
        showNotification('❌ Cannot connect: Mixed content blocked. Please use the HTTP version button above!');
    } else {
        showNotification('❌ Cannot connect to game server. Please try again.');
    }
});

socket.on('connect', () => {
    console.log('Connected to game server!');
    const warning = document.getElementById('httpsWarning');
    if (warning) {
        warning.style.display = 'none';
    }
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let myId = null;
let players = {};
let obstacles = [];
let isFlying = false;

// Join game
function joinGame() {
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim() || `Player${Math.floor(Math.random() * 1000)}`;
    
    socket.emit('joinGame', { name: name });
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
}

// Socket event handlers
socket.on('joined', (data) => {
    myId = data.id;
    players = data.players;
    obstacles = data.obstacles;
    showNotification('🚁 You joined the battle!');
});

socket.on('playerJoined', (player) => {
    players[player.id] = player;
    if (player.id !== myId) {
        showNotification(`🚁 ${player.name} joined the battle`);
    }
    updateStats();
});

socket.on('playerLeft', (data) => {
    delete players[data.id];
    showNotification(`👋 ${data.name} left the game`);
    updateStats();
});

socket.on('playerDied', (data) => {
    if (players[data.id]) {
        players[data.id].alive = false;
    }
    if (data.id === myId) {
        showNotification('💥 You crashed! Watch the others battle...');
    } else {
        showNotification(`💥 ${data.name} crashed!`);
    }
    updateStats();
});

socket.on('gameState', (state) => {
    players = state.players;
    obstacles = state.obstacles;
    render();
    updateStats();
});

socket.on('gameWinner', (data) => {
    showWinner(data.name);
    if (data.id === myId) {
        showNotification('🏆 YOU WON! You are the last copter flying!');
    }
});

// Controls
function startFlying() {
    if (players[myId] && players[myId].alive) {
        socket.emit('flap');
    }
}

// Mouse/touch controls
canvas.addEventListener('mousedown', startFlying);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startFlying();
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        startFlying();
    }
});

// Prevent spacebar from scrolling
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
    }
});

// Render game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw clouds
    drawClouds();
    
    // Draw obstacles
    obstacles.forEach(obstacle => {
        // Top obstacle
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(obstacle.x, 0, 80, obstacle.topHeight);
        
        // Bottom obstacle
        ctx.fillRect(obstacle.x, obstacle.bottomY, 80, canvas.height - obstacle.bottomY);
        
        // Obstacle border
        ctx.strokeStyle = '#1A252F';
        ctx.lineWidth = 3;
        ctx.strokeRect(obstacle.x, 0, 80, obstacle.topHeight);
        ctx.strokeRect(obstacle.x, obstacle.bottomY, 80, canvas.height - obstacle.bottomY);
        
        // Gap highlight
        ctx.fillStyle = 'rgba(76, 209, 55, 0.2)';
        ctx.fillRect(obstacle.x, obstacle.topHeight, 80, obstacle.bottomY - obstacle.topHeight);
    });
    
    // Draw players
    Object.values(players).forEach(player => {
        if (!player.alive) {
            // Draw ghost/dead copter
            ctx.globalAlpha = 0.3;
        }
        
        // Copter body
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, 30, 20);
        
        // Copter cockpit
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(player.x + 5, player.y + 5, 10, 10);
        
        // Rotor
        const rotorY = player.y - 5;
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(player.x - 10, rotorY);
        ctx.lineTo(player.x + 40, rotorY);
        ctx.stroke();
        
        // Tail
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x + 30, player.y + 8, 10, 4);
        
        // Player name
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText(player.name, player.x + 15, player.y - 8);
        ctx.fillText(player.name, player.x + 15, player.y - 8);
        
        // Score
        ctx.font = 'bold 10px Arial';
        ctx.strokeText(`⭐${player.score}`, player.x + 15, player.y + 45);
        ctx.fillText(`⭐${player.score}`, player.x + 15, player.y + 45);
        
        ctx.globalAlpha = 1;
    });
}

// Draw decorative clouds
let cloudOffset = 0;
function drawClouds() {
    cloudOffset += 0.2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    
    for (let i = 0; i < 5; i++) {
        const x = ((i * 200 + cloudOffset) % (canvas.width + 100)) - 50;
        const y = 50 + i * 30;
        
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
        ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Update stats display
function updateStats() {
    if (!myId || !players[myId]) return;
    
    document.getElementById('yourScore').textContent = players[myId].score;
    document.getElementById('totalPlayers').textContent = Object.keys(players).length;
    
    const alivePlayers = Object.values(players).filter(p => p.alive).length;
    document.getElementById('playersAlive').textContent = alivePlayers;
    
    // Update players list
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    // Sort by score
    const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
    
    sortedPlayers.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item' + (!player.alive ? ' player-dead' : '');
        
        playerDiv.innerHTML = `
            <span class="player-name">
                <span class="player-color" style="background-color: ${player.color}"></span>
                ${player.name} ${player.id === myId ? '(You)' : ''}
                ${!player.alive ? '💀' : '🚁'}
            </span>
            <span class="player-score">⭐ ${player.score}</span>
        `;
        
        playersList.appendChild(playerDiv);
    });
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Show winner banner
function showWinner(name) {
    const banner = document.createElement('div');
    banner.className = 'winner-banner';
    banner.innerHTML = `
        🏆<br>
        ${name}<br>
        WINS!
    `;
    document.body.appendChild(banner);
    
    setTimeout(() => {
        banner.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => banner.remove(), 300);
    }, 5000);
}

// Handle enter key on name input
document.getElementById('playerName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinGame();
    }
});

// Start rendering loop
setInterval(() => {
    if (Object.keys(players).length > 0) {
        render();
    }
}, 1000 / 60);
