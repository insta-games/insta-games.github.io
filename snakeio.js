// Snake.io Client
const socket = io('https://188.166.220.144', {
    path: '/snakeio-socket/',
    secure: true,
    rejectUnauthorized: false
});

let canvas, ctx;

// Game state
let myId = null;
let players = {};
let food = [];
let camera = { x: 0, y: 0 };

// Constants
const SEGMENT_SIZE = 10;
const GRID_SIZE = 50;
const GAME_WIDTH = 3000;
const GAME_HEIGHT = 3000;

// Input
const keys = {};
let currentDirection = { x: 1, y: 0 };
let boosting = false;

// Join game function
function joinGame() {
    console.log('joinGame called!');
    const name = document.getElementById('playerName').value.trim() || 'Snake';
    console.log('Player name:', name);
    socket.emit('joinGame', { name });
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
}

// Make joinGame globally accessible
window.joinGame = joinGame;

// Initialize canvas when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded!');
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    
    // Add button click handler
    const startButton = document.querySelector('.login-box button');
    console.log('Start button:', startButton);
    if (startButton) {
        startButton.addEventListener('click', function() {
            console.log('Button clicked!');
            joinGame();
        });
    }
    
    // Add Enter key handler
    const playerNameInput = document.getElementById('playerName');
    if (playerNameInput) {
        playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinGame();
            }
        });
    }
    
    // Start render loop
    render();
});

// Socket events
socket.on('gameState', (data) => {
    if (data.myId) myId = data.myId;
    players = data.players;
    food = data.food;
});

// Input handling
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    // Update direction
    if ((keys['w'] || keys['arrowup']) && currentDirection.y !== 1) {
        currentDirection = { x: 0, y: -1 };
        socket.emit('updateDirection', { direction: currentDirection });
    }
    if ((keys['s'] || keys['arrowdown']) && currentDirection.y !== -1) {
        currentDirection = { x: 0, y: 1 };
        socket.emit('updateDirection', { direction: currentDirection });
    }
    if ((keys['a'] || keys['arrowleft']) && currentDirection.x !== 1) {
        currentDirection = { x: -1, y: 0 };
        socket.emit('updateDirection', { direction: currentDirection });
    }
    if ((keys['d'] || keys['arrowright']) && currentDirection.x !== -1) {
        currentDirection = { x: 1, y: 0 };
        socket.emit('updateDirection', { direction: currentDirection });
    }
    
    // Boost with space
    if (e.key === ' ' && !boosting) {
        boosting = true;
        socket.emit('updateBoost', { boosting: true });
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    
    if (e.key === ' ') {
        boosting = false;
        socket.emit('updateBoost', { boosting: false });
    }
});

// Render loop
function render() {
    if (!canvas || !ctx) {
        requestAnimationFrame(render);
        return;
    }
    
    // Clear canvas
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update camera to follow player
    if (myId && players[myId] && players[myId].alive) {
        const player = players[myId];
        const head = player.segments[0];
        camera.x = head.x - canvas.width / 2;
        camera.y = head.y - canvas.height / 2;
    }

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw grid
    drawGrid();

    // Draw map boundaries
    drawMapBoundaries();

    // Draw food
    for (const f of food) {
        ctx.fillStyle = f.value > 1 ? '#FFD700' : '#4CAF50';
        ctx.beginPath();
        ctx.arc(f.x, f.y, SEGMENT_SIZE * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw snakes (others first, then player on top)
    const playerOrder = Object.keys(players).sort((a, b) => {
        if (a === myId) return 1;
        if (b === myId) return -1;
        return 0;
    });

    for (const id of playerOrder) {
        const player = players[id];
        if (!player.alive) continue;

        // Draw snake body (sample segments for long snakes to improve performance)
        ctx.strokeStyle = player.color;
        ctx.lineWidth = SEGMENT_SIZE * 1.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        const maxSegmentsToDraw = 100; // Limit segments for performance
        const step = player.segments.length > maxSegmentsToDraw ? 
                     Math.ceil(player.segments.length / maxSegmentsToDraw) : 1;
        
        for (let i = 0; i < player.segments.length; i += step) {
            const seg = player.segments[i];
            if (i === 0) {
                ctx.moveTo(seg.x, seg.y);
            } else {
                ctx.lineTo(seg.x, seg.y);
            }
        }
        // Always include the last segment
        if (player.segments.length > 1) {
            const lastSeg = player.segments[player.segments.length - 1];
            ctx.lineTo(lastSeg.x, lastSeg.y);
        }
        ctx.stroke();

        // Draw head
        const head = player.segments[0];
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(head.x, head.y, SEGMENT_SIZE, 0, Math.PI * 2);
        ctx.fill();

        // Draw eyes
        const angle = Math.atan2(player.direction.y, player.direction.x);
        const eyeOffset = SEGMENT_SIZE * 0.4;
        const eyeDistance = SEGMENT_SIZE * 0.5;
        
        ctx.fillStyle = '#ffffff';
        // Left eye
        ctx.beginPath();
        ctx.arc(
            head.x + Math.cos(angle - 0.5) * eyeDistance,
            head.y + Math.sin(angle - 0.5) * eyeDistance,
            SEGMENT_SIZE * 0.3,
            0, Math.PI * 2
        );
        ctx.fill();
        // Right eye
        ctx.beginPath();
        ctx.arc(
            head.x + Math.cos(angle + 0.5) * eyeDistance,
            head.y + Math.sin(angle + 0.5) * eyeDistance,
            SEGMENT_SIZE * 0.3,
            0, Math.PI * 2
        );
        ctx.fill();

        // Draw pupils
        ctx.fillStyle = '#000000';
        // Left pupil
        ctx.beginPath();
        ctx.arc(
            head.x + Math.cos(angle - 0.5) * eyeDistance + Math.cos(angle) * eyeOffset,
            head.y + Math.sin(angle - 0.5) * eyeDistance + Math.sin(angle) * eyeOffset,
            SEGMENT_SIZE * 0.15,
            0, Math.PI * 2
        );
        ctx.fill();
        // Right pupil
        ctx.beginPath();
        ctx.arc(
            head.x + Math.cos(angle + 0.5) * eyeDistance + Math.cos(angle) * eyeOffset,
            head.y + Math.sin(angle + 0.5) * eyeDistance + Math.sin(angle) * eyeOffset,
            SEGMENT_SIZE * 0.15,
            0, Math.PI * 2
        );
        ctx.fill();

        // Draw name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.name, head.x, head.y - SEGMENT_SIZE * 2);
        
        // Draw score
        ctx.font = '12px Arial';
        ctx.fillText(Math.floor(player.score), head.x, head.y - SEGMENT_SIZE * 2 + 16);
    }

    ctx.restore();

    // Draw UI
    drawUI();
    
    // Draw minimap
    drawMinimap();

    requestAnimationFrame(render);
}

function drawGrid() {
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 1;

    const startX = Math.floor(camera.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(camera.y / GRID_SIZE) * GRID_SIZE;
    const endX = camera.x + canvas.width;
    const endY = camera.y + canvas.height;

    for (let x = startX; x < endX; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, camera.y);
        ctx.lineTo(x, camera.y + canvas.height);
        ctx.stroke();
    }

    for (let y = startY; y < endY; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(camera.x, y);
        ctx.lineTo(camera.x + canvas.width, y);
        ctx.stroke();
    }
}

function drawMapBoundaries() {
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw dark area outside map
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    // Top
    ctx.fillRect(camera.x, camera.y, canvas.width, Math.max(0, -camera.y));
    // Left
    ctx.fillRect(camera.x, camera.y, Math.max(0, -camera.x), canvas.height);
    // Bottom
    const bottomY = GAME_HEIGHT;
    if (camera.y + canvas.height > bottomY) {
        ctx.fillRect(camera.x, bottomY, canvas.width, canvas.height);
    }
    // Right
    const rightX = GAME_WIDTH;
    if (camera.x + canvas.width > rightX) {
        ctx.fillRect(rightX, camera.y, canvas.width, canvas.height);
    }
}

function drawUI() {
    // Score
    if (myId && players[myId]) {
        const player = players[myId];
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 200, 80);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Length: ${player.segments.length}`, 20, 35);
        ctx.fillText(`Score: ${Math.floor(player.score)}`, 20, 60);
        
        if (player.boosting) {
            ctx.fillStyle = '#ff6b6b';
            ctx.fillText('BOOSTING!', 20, 85);
        }
    }

    // Leaderboard
    const sorted = Object.values(players)
        .filter(p => p.alive)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(canvas.width - 210, 10, 200, 30 + sorted.length * 25);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LEADERBOARD', canvas.width - 200, 30);

    ctx.font = '14px Arial';
    ctx.fillStyle = '#ffffff';
    sorted.forEach((player, i) => {
        const color = player.id === myId ? '#00ff00' : '#ffffff';
        ctx.fillStyle = color;
        ctx.fillText(`${i + 1}. ${player.name}`, canvas.width - 200, 55 + i * 25);
        ctx.textAlign = 'right';
        ctx.fillText(Math.floor(player.score), canvas.width - 20, 55 + i * 25);
        ctx.textAlign = 'left';
    });

    // Controls hint
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(10, canvas.height - 60, 250, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText('WASD/Arrows: Move', 20, canvas.height - 35);
    ctx.fillText('SPACE: Boost (lose length)', 20, canvas.height - 15);
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
    
    // Draw map boundary
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    const mapScaleX = minimapSize / GAME_WIDTH;
    const mapScaleY = minimapSize / GAME_HEIGHT;
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Draw all snakes on minimap
    for (const id in players) {
        const player = players[id];
        if (!player.alive || !player.segments.length) continue;
        
        const head = player.segments[0];
        const minimapPlayerX = minimapX + head.x * mapScaleX;
        const minimapPlayerY = minimapY + head.y * mapScaleY;
        
        // Draw snake dot
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
    
    // Draw food clusters (sample every 10th food for better performance)
    ctx.fillStyle = 'rgba(76, 175, 80, 0.6)';
    for (let i = 0; i < food.length; i += 10) {
        const f = food[i];
        const fx = minimapX + f.x * mapScaleX;
        const fy = minimapY + f.y * mapScaleY;
        ctx.fillRect(fx, fy, 1, 1);
    }
}

