// Copter Battle Arena - Client-side JavaScript
// Detect if we're on the game server or GitHub Pages
let SERVER_URL;
if (window.location.hostname === '188.166.220.144') {
    // On game server - use same origin
    SERVER_URL = window.location.origin;
} else {
    // On GitHub Pages - connect to game server
    SERVER_URL = 'https://188.166.220.144';
}

console.log('Connecting to:', SERVER_URL);

const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000,
    forceNew: true,
    secure: true,
    rejectUnauthorized: false // Accept self-signed certificates
});

// Connection status
socket.on('connect', () => {
    console.log('✅ Connected to server!', socket.id);
    
    // Update UI to show connected
    const connectingMsg = document.getElementById('connectingMsg');
    const joinBtn = document.getElementById('joinBtn');
    const connectionStatus = document.getElementById('connectionStatus');
    
    if (connectingMsg) {
        connectingMsg.innerHTML = '✅ Connected! Ready to play';
        connectingMsg.style.color = '#4ECDC4';
    }
    if (joinBtn) {
        joinBtn.disabled = false;
        joinBtn.style.opacity = '1';
    }
    if (connectionStatus) {
        connectionStatus.style.background = 'rgba(76,209,196,0.2)';
        connectionStatus.style.border = '2px solid #4ECDC4';
    }
    
    // Hide any connection error messages
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        const existingError = loginScreen.querySelector('.connection-error');
        if (existingError) existingError.remove();
    }
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
    
    const connectingMsg = document.getElementById('connectingMsg');
    const joinBtn = document.getElementById('joinBtn');
    const connectionStatus = document.getElementById('connectionStatus');
    
    if (connectingMsg) {
        connectingMsg.innerHTML = '❌ Connection failed. Retrying...';
        connectingMsg.style.color = '#FF6B6B';
    }
    if (joinBtn) {
        joinBtn.disabled = true;
        joinBtn.style.opacity = '0.5';
    }
    if (connectionStatus) {
        connectionStatus.style.background = 'rgba(255,107,107,0.2)';
        connectionStatus.style.border = '2px solid #FF6B6B';
    }
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    if (reason === 'io server disconnect') {
        // Server kicked us, reconnect manually
        socket.connect();
    }
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas to window
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Game state
let myId = null;
let players = {};
let bullets = [];
let tanks = {};
let gameWorld = { width: 5000, height: 5000 };
let camera = { x: 0, y: 0 };

// Input state
let keys = {};
let mouseX = 0;
let mouseY = 0;
let isShooting = false;
let shootAngle = 0;
let rotationSpeed = 0.08; // Radians per frame for tank controls

// Touch controls
let leftJoystick = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 };
let rightJoystick = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 };

// Join game
function joinGame() {
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim() || `Player${Math.floor(Math.random() * 1000)}`;
    
    console.log('Attempting to join game as:', name);
    console.log('Socket connected:', socket.connected);
    console.log('Socket ID:', socket.id);
    
    if (!socket.connected) {
        alert('Not connected to server. Please wait and try again.');
        return;
    }
    
    socket.emit('joinGame', { name: name });
}

// Socket handlers
socket.on('joined', (data) => {
    myId = data.id;
    gameWorld = data.gameWorld;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    showNotification('🚁 Joined the battle!');
    
    // Start game loop
    requestAnimationFrame(gameLoop);
});

socket.on('playerJoined', (player) => {
    players[player.id] = player;
    if (player.id !== myId) {
        showNotification(`${player.name} joined the battle`);
    }
});

socket.on('playerLeft', (data) => {
    delete players[data.id];
    showNotification(`${data.name} left the game`);
});

socket.on('gameState', (state) => {
    players = state.players;
    bullets = state.bullets;
    tanks = state.tanks || {};
    updateHUD();
});

socket.on('playerKilled', (data) => {
    if (data.victim === myId) {
        showDeathScreen(data.killerName);
    } else if (data.killer === myId) {
        showNotification(`💀 You killed ${data.victimName}! +100`);
    } else {
        showNotification(`💀 ${data.killerName} killed ${data.victimName}`);
    }
});

socket.on('playerRespawned', (playerId) => {
    if (playerId === myId) {
        hideDeathScreen();
        showNotification('🚁 Respawned!');
    }
});

socket.on('upgradeSuccess', (data) => {
    showNotification(`⚡ Upgraded ${data.upgradeType}!`);
    updateUpgradeMenu();
});

// Input handlers
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key.toLowerCase() === 'u') {
        toggleUpgradeMenu();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Touch controls
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (let touch of e.changedTouches) {
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Left half = movement joystick
        if (x < canvas.width / 2) {
            leftJoystick.active = true;
            leftJoystick.startX = x;
            leftJoystick.startY = y;
            leftJoystick.currentX = x;
            leftJoystick.currentY = y;
            leftJoystick.touchId = touch.identifier;
        }
        // Right half = shooting joystick
        else {
            rightJoystick.active = true;
            rightJoystick.startX = x;
            rightJoystick.startY = y;
            rightJoystick.currentX = x;
            rightJoystick.currentY = y;
            rightJoystick.touchId = touch.identifier;
        }
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let touch of e.changedTouches) {
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        if (leftJoystick.active && touch.identifier === leftJoystick.touchId) {
            leftJoystick.currentX = x;
            leftJoystick.currentY = y;
        }
        if (rightJoystick.active && touch.identifier === rightJoystick.touchId) {
            rightJoystick.currentX = x;
            rightJoystick.currentY = y;
        }
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (let touch of e.changedTouches) {
        if (leftJoystick.touchId === touch.identifier) {
            leftJoystick.active = false;
        }
        if (rightJoystick.touchId === touch.identifier) {
            rightJoystick.active = false;
            isShooting = false;
        }
    }
});

// Prevent context menu on right click
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (!myId || !players[myId] || !players[myId].alive) return;
    
    const player = players[myId];
    let moved = false;
    
    // Movement (WASD only)
    const speed = 5; // Will be modified by upgrades on server
    let dx = 0;
    let dy = 0;
    
    // Keyboard movement (WASD)
    if (keys['w']) dy -= speed;
    if (keys['s']) dy += speed;
    if (keys['a']) dx -= speed;
    if (keys['d']) dx += speed;
    
    // Touch movement (left joystick)
    if (leftJoystick.active) {
        const jdx = leftJoystick.currentX - leftJoystick.startX;
        const jdy = leftJoystick.currentY - leftJoystick.startY;
        const distance = Math.sqrt(jdx * jdx + jdy * jdy);
        
        if (distance > 10) { // Dead zone
            const maxDistance = 80;
            const factor = Math.min(distance, maxDistance) / maxDistance;
            dx = (jdx / distance) * speed * factor;
            dy = (jdy / distance) * speed * factor;
        }
    }
    
    if (dx !== 0 || dy !== 0) {
        player.x += dx;
        player.y += dy;
        
        // Keep in bounds
        player.x = Math.max(0, Math.min(gameWorld.width, player.x));
        player.y = Math.max(0, Math.min(gameWorld.height, player.y));
        
        moved = true;
    }
    
    // Shooting direction - Tank Controls (Arrow keys)
    // Left/Right rotate, Up shoots
    let hasShootInput = false;
    
    // Rotate shooting angle with left/right arrows (tank controls)
    if (keys['arrowleft']) {
        shootAngle -= rotationSpeed;
        player.angle = shootAngle;
    }
    if (keys['arrowright']) {
        shootAngle += rotationSpeed;
        player.angle = shootAngle;
    }
    
    // Shoot with up arrow
    if (keys['arrowup']) {
        isShooting = true;
        hasShootInput = true;
    } else if (!rightJoystick.active) {
        isShooting = false;
    }
    
    // Touch shooting (right joystick) - free aim with touch
    if (rightJoystick.active) {
        const jdx = rightJoystick.currentX - rightJoystick.startX;
        const jdy = rightJoystick.currentY - rightJoystick.startY;
        const distance = Math.sqrt(jdx * jdx + jdy * jdy);
        
        if (distance > 20) { // Dead zone for shooting
            shootAngle = Math.atan2(jdy, jdx);
            player.angle = shootAngle;
            hasShootInput = true;
            isShooting = true;
        }
    }
    
    // Initialize shootAngle if not set
    if (shootAngle === 0 && player.angle !== undefined) {
        shootAngle = player.angle;
    }
    
    // Send update to server
    if (moved || player.angle !== undefined) {
        socket.emit('playerMove', {
            x: player.x,
            y: player.y,
            angle: player.angle
        });
    }
    
    // Shooting
    if (isShooting) {
        socket.emit('shoot', { angle: shootAngle });
    }
    
    // Update camera to follow player
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    
    // Keep camera in bounds
    camera.x = Math.max(0, Math.min(gameWorld.width - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(gameWorld.height - canvas.height, camera.y));
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const gridSize = 100;
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;
    
    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - camera.x, 0);
        ctx.lineTo(x - camera.x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - camera.y);
        ctx.lineTo(canvas.width, y - camera.y);
        ctx.stroke();
    }
    
    // Draw bullets
    bullets.forEach(bullet => {
        const screenX = bullet.x - camera.x;
        const screenY = bullet.y - camera.y;
        
        if (screenX < -50 || screenX > canvas.width + 50 || 
            screenY < -50 || screenY > canvas.height + 50) return;
        
        const player = players[bullet.playerId];
        ctx.fillStyle = player ? player.color : '#FFD700';
        ctx.beginPath();
        ctx.arc(screenX, screenY, bullet.size || 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullet trail
        ctx.strokeStyle = player ? player.color + '80' : '#FFD70080';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        const trailX = screenX - Math.cos(bullet.angle) * 10;
        const trailY = screenY - Math.sin(bullet.angle) * 10;
        ctx.lineTo(trailX, trailY);
        ctx.stroke();
    });
    
    // Draw tanks (AI enemies)
    Object.values(tanks).forEach(tank => {
        const screenX = tank.x - camera.x;
        const screenY = tank.y - camera.y;
        
        if (screenX < -100 || screenX > canvas.width + 100 || 
            screenY < -100 || screenY > canvas.height + 100) return;
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(tank.angle);
        
        // Simplified tank body (single draw)
        ctx.fillStyle = '#555555';
        ctx.fillRect(-17.5, -17.5, 35, 35);
        
        // Tank barrel
        ctx.fillStyle = '#333333';
        ctx.fillRect(0, -2, 18, 4);
        
        ctx.restore();
        
        // Tank health bar (simplified)
        const healthPercent = tank.health / 60;
        if (healthPercent < 1) { // Only show if damaged
            const barWidth = 35;
            ctx.fillStyle = '#333333';
            ctx.fillRect(screenX - barWidth/2, screenY - 25, barWidth, 3);
            ctx.fillStyle = healthPercent > 0.5 ? '#4ECDC4' : '#FF4444';
            ctx.fillRect(screenX - barWidth/2, screenY - 25, barWidth * healthPercent, 3);
        }
    });
    
    // Draw touch joysticks
    if (leftJoystick.active) {
        drawJoystick(leftJoystick.startX, leftJoystick.startY, 
                     leftJoystick.currentX, leftJoystick.currentY, 'rgba(76,209,196,0.3)');
    }
    if (rightJoystick.active) {
        drawJoystick(rightJoystick.startX, rightJoystick.startY, 
                     rightJoystick.currentX, rightJoystick.currentY, 'rgba(255,107,107,0.3)');
    }
    
    // Draw players
    Object.values(players).forEach(player => {
        if (!player.alive) return;
        
        const screenX = player.x - camera.x;
        const screenY = player.y - camera.y;
        
        if (screenX < -100 || screenX > canvas.width + 100 || 
            screenY < -100 || screenY > canvas.height + 100) return;
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(player.angle);
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(2, 2, 20, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Main rotor blades (spinning)
        const rotorSpeed = Date.now() * 0.02;
        ctx.save();
        ctx.rotate(rotorSpeed);
        ctx.fillStyle = 'rgba(80, 80, 80, 0.3)';
        ctx.fillRect(-28, -1.5, 56, 3);
        ctx.fillRect(-1.5, -28, 3, 56);
        ctx.restore();
        
        // Tail boom (behind)
        ctx.fillStyle = shadeColor(player.color, -15);
        ctx.fillRect(-32, -2, 24, 4);
        
        // Main body
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Cockpit window (front)
        ctx.fillStyle = 'rgba(150, 180, 220, 0.7)';
        ctx.beginPath();
        ctx.ellipse(5, 0, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Rotor center
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Health bar
        const barWidth = 50;
        const barHeight = 5;
        const healthPercent = player.health / player.maxHealth;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(screenX - barWidth/2, screenY - 30, barWidth, barHeight);
        
        const healthColor = healthPercent > 0.5 ? '#4ECDC4' : healthPercent > 0.25 ? '#FFA07A' : '#FF6B6B';
        ctx.fillStyle = healthColor;
        ctx.fillRect(screenX - barWidth/2, screenY - 30, barWidth * healthPercent, barHeight);
        
        // Player name
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText(player.name, screenX, screenY - 38);
        ctx.fillText(player.name, screenX, screenY - 38);
        
        // Level badge
        if (player.level > 1) {
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.font = 'bold 10px Arial';
            ctx.strokeText(`Lv.${player.level}`, screenX, screenY + 35);
            ctx.fillText(`Lv.${player.level}`, screenX, screenY + 35);
        }
    });
    
    // Draw minimap
    drawMinimap();
}

function drawMinimap() {
    if (!myId || !players[myId]) return;

    const minimapSize = 150;
    const minimapPadding = 10;
    const minimapX = canvas.width - minimapSize - minimapPadding;
    const minimapY = canvas.height - minimapSize - minimapPadding;
    
    // Draw minimap background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Draw minimap border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Map scale using gameWorld dimensions
    const mapScaleX = minimapSize / gameWorld.width;
    const mapScaleY = minimapSize / gameWorld.height;
    
    // Draw all players on minimap
    for (const id in players) {
        const player = players[id];
        
        const minimapPlayerX = minimapX + player.x * mapScaleX;
        const minimapPlayerY = minimapY + player.y * mapScaleY;
        
        // Draw player dot
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(minimapPlayerX, minimapPlayerY, id === myId ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight current player
        if (id === myId) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    // Draw tanks on minimap
    ctx.fillStyle = '#888888';
    for (const id in tanks) {
        const tank = tanks[id];
        const tx = minimapX + tank.x * mapScaleX;
        const ty = minimapY + tank.y * mapScaleY;
        ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
    }
    
    // Draw bullets on minimap
    ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
    for (const id in bullets) {
        const bullet = bullets[id];
        const bx = minimapX + bullet.x * mapScaleX;
        const by = minimapY + bullet.y * mapScaleY;
        ctx.fillRect(bx, by, 1, 1);
    }
}

// Helper function to shade colors
function shadeColor(color, percent) {
    const num = parseInt(color.replace("#",""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
        (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255))
        .toString(16).slice(1);
}

// Draw joystick helper
function drawJoystick(startX, startY, currentX, currentY, color) {
    // Base
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(startX, startY, 60, 0, Math.PI * 2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = color.replace('0.3', '0.6');
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Stick
    ctx.fillStyle = color.replace('0.3', '0.8');
    ctx.beginPath();
    ctx.arc(currentX, currentY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Stick border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// HUD functions
function updateHUD() {
    if (!myId || !players[myId]) return;
    
    const player = players[myId];
    
    document.getElementById('playerName').textContent = player.name;
    document.getElementById('playerLevel').textContent = player.level;
    document.getElementById('playerXP').textContent = player.xp;
    document.getElementById('playerKD').textContent = `${player.kills}/${player.deaths}`;
    
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('healthFill').style.width = healthPercent + '%';
    document.getElementById('healthText').textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;
    
    // Update leaderboard
    const sorted = Object.values(players).sort((a, b) => b.score - a.score).slice(0, 10);
    const leaderboard = document.getElementById('leaderboardList');
    leaderboard.innerHTML = '';
    
    sorted.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'leaderboard-item' + (p.id === myId ? ' me' : '');
        div.innerHTML = `
            <span>${i + 1}. ${p.name}</span>
            <span>${p.kills} kills</span>
        `;
        leaderboard.appendChild(div);
    });
}

function toggleUpgradeMenu() {
    const menu = document.getElementById('upgradeMenu');
    menu.style.display = menu.style.display === 'none' || !menu.style.display ? 'block' : 'none';
    updateUpgradeMenu();
}

function updateUpgradeMenu() {
    if (!myId || !players[myId]) return;
    
    const player = players[myId];
    const availablePoints = Math.floor(player.xp / 50);
    const spentPoints = Object.values(player.upgrades).reduce((sum, level) => sum + level, 0);
    const pointsRemaining = availablePoints - spentPoints;
    
    document.getElementById('availablePoints').textContent = pointsRemaining;
    
    // Update mobile button badge
    const badge = document.getElementById('upgradePointsBadge');
    const mobileBtn = document.getElementById('mobileUpgradeBtn');
    if (pointsRemaining > 0) {
        badge.textContent = pointsRemaining;
        badge.style.display = 'flex';
        // Add pulse animation
        if (!mobileBtn.classList.contains('pulse')) {
            mobileBtn.style.animation = 'pulse 1.5s infinite';
        }
    } else {
        badge.style.display = 'none';
        mobileBtn.style.animation = '';
    }
    
    // Update upgrade buttons
    ['FIRE_RATE', 'BULLET_DAMAGE', 'MAX_HEALTH', 'MOVE_SPEED', 'BULLET_SIZE'].forEach(type => {
        const level = player.upgrades[type] || 0;
        document.getElementById(`upgrade-${type}`).textContent = level;
    });
}

function buyUpgrade(upgradeType) {
    socket.emit('upgrade', upgradeType);
}

// Notifications
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

function showDeathScreen(killerName) {
    const deathScreen = document.getElementById('deathScreen');
    document.getElementById('killerName').textContent = killerName || 'Unknown';
    deathScreen.style.display = 'block';
    
    let timer = 3;
    document.getElementById('respawnTimer').textContent = timer;
    
    const interval = setInterval(() => {
        timer--;
        document.getElementById('respawnTimer').textContent = timer;
        if (timer <= 0) clearInterval(interval);
    }, 1000);
}

function hideDeathScreen() {
    document.getElementById('deathScreen').style.display = 'none';
}

// Handle enter key on name input
document.getElementById('playerName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinGame();
    }
});
