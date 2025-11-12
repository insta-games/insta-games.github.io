// Paper.io Clone - Client
const socket = io('http://188.166.220.144', {
    path: '/paperio-socket/'
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Game state
let myId = null;
let players = {};
let territories = {};
let trails = {};
let camera = { x: 0, y: 0 };

// Constants
const GRID_SIZE = 10;
const GAME_WIDTH = 2000;
const GAME_HEIGHT = 2000;

// Input
const keys = {};
let currentDirection = { x: 0, y: 0 };

// Join game
function joinGame() {
    const name = document.getElementById('playerName').value.trim() || 'Player';
    socket.emit('joinGame', { name });
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
}

// Socket events
socket.on('gameState', (data) => {
    myId = data.myId;
    players = data.players;
    territories = data.territories;
    trails = data.trails;
});

socket.on('playerJoined', (player) => {
    players[player.id] = player;
});

socket.on('playerLeft', (playerId) => {
    delete players[playerId];
    delete territories[playerId];
    delete trails[playerId];
});

socket.on('update', (data) => {
    players = data.players;
    territories = data.territories;
    trails = data.trails;
});

// Input handling
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    updateDirection();
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    updateDirection();
});

function updateDirection() {
    let x = 0;
    let y = 0;

    if (keys['w'] || keys['arrowup']) y = -1;
    if (keys['s'] || keys['arrowdown']) y = 1;
    if (keys['a'] || keys['arrowleft']) x = -1;
    if (keys['d'] || keys['arrowright']) x = 1;

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
        x *= 0.707;
        y *= 0.707;
    }

    currentDirection = { x, y };
    socket.emit('move', { direction: currentDirection });
}

// Render loop
function render() {
    // Clear canvas
    ctx.fillStyle = '#0f1419';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update camera to follow player
    if (myId && players[myId]) {
        const player = players[myId];
        camera.x = player.x - canvas.width / 2;
        camera.y = player.y - canvas.height / 2;
    }

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw grid
    drawGrid();

    // Draw territories
    for (const playerId in territories) {
        const player = players[playerId];
        if (!player) continue;

        ctx.fillStyle = player.color + '40'; // Semi-transparent
        for (const tile of territories[playerId]) {
            ctx.fillRect(tile.x, tile.y, GRID_SIZE, GRID_SIZE);
        }

        // Draw territory border
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 2;
        drawTerritoryBorder(territories[playerId]);
    }

    // Draw trails
    for (const playerId in trails) {
        const player = players[playerId];
        if (!player || !trails[playerId] || trails[playerId].length === 0) continue;

        const trail = trails[playerId];
        
        // Draw trail tiles
        ctx.fillStyle = player.color + 'CC'; // More opaque
        for (const tile of trail) {
            ctx.fillRect(tile.x, tile.y, GRID_SIZE, GRID_SIZE);
        }

        // Draw trail line
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(trail[0].x + GRID_SIZE/2, trail[0].y + GRID_SIZE/2);
        for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(trail[i].x + GRID_SIZE/2, trail[i].y + GRID_SIZE/2);
        }
        ctx.stroke();
    }

    // Draw players
    for (const playerId in players) {
        const player = players[playerId];
        if (!player.alive) continue;

        // Draw player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(player.x + 3, player.y + 3, 12, 0, Math.PI * 2);
        ctx.fill();

        // Draw player
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Draw player border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw player name
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(player.name, player.x, player.y - 20);
        ctx.fillText(player.name, player.x, player.y - 20);

        // Draw direction indicator
        if (player.direction.x !== 0 || player.direction.y !== 0) {
            ctx.strokeStyle = player.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(
                player.x + player.direction.x * 20,
                player.y + player.direction.y * 20
            );
            ctx.stroke();
        }
    }

    ctx.restore();

    // Update UI
    updateUI();

    requestAnimationFrame(render);
}

function drawGrid() {
    ctx.strokeStyle = '#1a2332';
    ctx.lineWidth = 1;

    const startX = Math.floor(camera.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(camera.y / GRID_SIZE) * GRID_SIZE;
    const endX = startX + canvas.width + GRID_SIZE;
    const endY = startY + canvas.height + GRID_SIZE;

    for (let x = startX; x < endX; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }

    for (let y = startY; y < endY; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
}

function drawTerritoryBorder(territory) {
    if (territory.length === 0) return;

    // Find border tiles
    const borderTiles = new Set();
    
    for (const tile of territory) {
        const neighbors = [
            { x: tile.x + GRID_SIZE, y: tile.y },
            { x: tile.x - GRID_SIZE, y: tile.y },
            { x: tile.x, y: tile.y + GRID_SIZE },
            { x: tile.x, y: tile.y - GRID_SIZE }
        ];

        for (const neighbor of neighbors) {
            const hasNeighbor = territory.some(t => 
                t.x === neighbor.x && t.y === neighbor.y
            );
            if (!hasNeighbor) {
                borderTiles.add(`${tile.x},${tile.y}`);
                break;
            }
        }
    }

    // Draw border
    for (const key of borderTiles) {
        const [x, y] = key.split(',').map(Number);
        ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);
    }
}

function updateUI() {
    if (!myId || !players[myId]) return;

    const player = players[myId];
    document.getElementById('scoreDisplay').textContent = player.score;
    document.getElementById('killsDisplay').textContent = player.kills;

    // Show death message
    const deathMsg = document.getElementById('deathMessage');
    if (!player.alive) {
        deathMsg.style.display = 'block';
    } else {
        deathMsg.style.display = 'none';
    }

    // Update leaderboard
    const sortedPlayers = Object.values(players)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = sortedPlayers.map((p, i) => `
        <div class="leaderboard-entry">
            <div class="player-name">
                <div class="player-color" style="background: ${p.color}"></div>
                ${i + 1}. ${p.name}
            </div>
            <div>${p.score}</div>
        </div>
    `).join('');
}

// Start game when Enter is pressed on name input
document.getElementById('playerName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinGame();
    }
});

// Start render loop
render();
