// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, onValue, update, remove, push, get, onDisconnect } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyC8cQdWyNNVVPKNn_B_wlE6q0OmqWJFMbA",
    authDomain: "multiplayer-games-76d23.firebaseapp.com",
    databaseURL: "https://multiplayer-games-76d23-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "multiplayer-games-76d23",
    storageBucket: "multiplayer-games-76d23.firebasestorage.app",
    messagingSenderId: "431065143042",
    appId: "1:431065143042:web:3ed9c9b38a13bce174141b",
    measurementId: "G-1KSV9E8QEM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Game Constants
const WORLD_SIZE = 2000;
const GRID_SIZE = 10; // Size of each grid cell
const PLAYER_SPEED = 3;
const UPDATE_RATE = 1000 / 60; // 60 FPS
const FIREBASE_UPDATE_RATE = 1000 / 20; // Update Firebase 20 times per second

// Game State
let canvas, ctx;
let canvasWidth, canvasHeight;
let myPlayerId = null;
let myPlayerName = '';
let currentRoom = null;
let players = {};
let myScore = 0;
let gameLoop = null;
let firebaseUpdateLoop = null;
let camera = { x: 0, y: 0 };
let isPaused = false;

// Player Direction
let currentDirection = 'right';
let targetDirection = 'right';

// Colors for different players
const PLAYER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#FF8C94', '#A8E6CF', '#FFD3B6', '#FFAAA5'
];

// DOM Elements
let joinPanel, gamePanel, nameInput, roomInput, joinBtn, quickPlayBtn;
let leaveBtn, respawnBtn, respawnPanel;
let roomCodeEl, statusEl, scoreEl, playerCountEl, playersListEl, pauseScreen;
let touchUp, touchDown, touchLeft, touchRight;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    joinPanel = document.getElementById('joinPanel');
    gamePanel = document.getElementById('gamePanel');
    nameInput = document.getElementById('nameInput');
    roomInput = document.getElementById('roomInput');
    joinBtn = document.getElementById('joinBtn');
    quickPlayBtn = document.getElementById('quickPlayBtn');
    leaveBtn = document.getElementById('leaveBtn');
    respawnBtn = document.getElementById('respawnBtn');
    respawnPanel = document.getElementById('respawnPanel');
    roomCodeEl = document.getElementById('roomCode');
    statusEl = document.getElementById('status');
    scoreEl = document.getElementById('score');
    playerCountEl = document.getElementById('playerCount');
    playersListEl = document.getElementById('playersList');
    pauseScreen = document.getElementById('pauseScreen');
    
    // Touch controls
    touchUp = document.getElementById('touchUp');
    touchDown = document.getElementById('touchDown');
    touchLeft = document.getElementById('touchLeft');
    touchRight = document.getElementById('touchRight');
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas to fullscreen
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    joinBtn.addEventListener('click', () => {
        const roomCode = roomInput.value.trim().toUpperCase();
        if (roomCode) {
            joinGame(roomCode);
        } else {
            findOrCreateRoom();
        }
    });
    quickPlayBtn.addEventListener('click', () => findOrCreateRoom());
    leaveBtn.addEventListener('click', leaveGame);
    respawnBtn.addEventListener('click', respawnPlayer);
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    
    // Touch controls
    touchUp.addEventListener('touchstart', (e) => { e.preventDefault(); changeDirection('up'); });
    touchDown.addEventListener('touchstart', (e) => { e.preventDefault(); changeDirection('down'); });
    touchLeft.addEventListener('touchstart', (e) => { e.preventDefault(); changeDirection('left'); });
    touchRight.addEventListener('touchstart', (e) => { e.preventDefault(); changeDirection('right'); });
    
    // Prevent default touch behaviors
    canvas.addEventListener('touchstart', (e) => e.preventDefault());
    canvas.addEventListener('touchmove', (e) => e.preventDefault());
    
    // Visibility change detection
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pauseGame();
        } else {
            resumeGame();
        }
    });
    
    // Focus/blur for desktop
    window.addEventListener('blur', pauseGame);
    window.addEventListener('focus', resumeGame);
});

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
}

function handleKeyDown(e) {
    if (!myPlayerId || !players[myPlayerId] || players[myPlayerId].dead) return;
    
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') {
        e.preventDefault();
        changeDirection('up');
    } else if (key === 'arrowdown' || key === 's') {
        e.preventDefault();
        changeDirection('down');
    } else if (key === 'arrowleft' || key === 'a') {
        e.preventDefault();
        changeDirection('left');
    } else if (key === 'arrowright' || key === 'd') {
        e.preventDefault();
        changeDirection('right');
    }
}

function changeDirection(newDirection) {
    // Prevent 180 degree turns
    if (currentDirection === 'up' && newDirection === 'down') return;
    if (currentDirection === 'down' && newDirection === 'up') return;
    if (currentDirection === 'left' && newDirection === 'right') return;
    if (currentDirection === 'right' && newDirection === 'left') return;
    
    targetDirection = newDirection;
}

async function findOrCreateRoom() {
    const name = nameInput.value.trim() || 'Player';
    myPlayerName = name;
    
    try {
        // Try to find an active room with less than 8 players
        const roomsRef = ref(database, 'paperio-rooms');
        const snapshot = await get(roomsRef);
        
        if (snapshot.exists()) {
            const rooms = snapshot.val();
            for (const [roomCode, roomData] of Object.entries(rooms)) {
                const playerCount = roomData.players ? Object.keys(roomData.players).length : 0;
                if (playerCount < 8 && playerCount > 0) {
                    await joinGame(roomCode);
                    return;
                }
            }
        }
        
        // No suitable room found, create new one
        const roomCode = generateRoomCode();
        await joinGame(roomCode);
    } catch (error) {
        console.error('Error finding room:', error);
        statusEl.textContent = 'Error connecting';
    }
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function joinGame(roomCode) {
    currentRoom = roomCode;
    myPlayerId = push(ref(database)).key;
    
    const player = createPlayer();
    
    try {
        // Set player data
        await set(ref(database, `paperio-rooms/${roomCode}/players/${myPlayerId}`), player);
        
        // Setup disconnect handler
        const playerRef = ref(database, `paperio-rooms/${roomCode}/players/${myPlayerId}`);
        await onDisconnect(playerRef).remove();
        
        // Setup disconnect handler for the room (delete if empty)
        const roomRef = ref(database, `paperio-rooms/${roomCode}`);
        await onDisconnect(roomRef).remove();
        
        // Listen to all players
        onValue(ref(database, `paperio-rooms/${roomCode}/players`), (snapshot) => {
            if (snapshot.exists()) {
                players = snapshot.val();
                updatePlayersList();
            } else {
                players = {};
            }
        });
        
        // Show game panel
        joinPanel.style.display = 'none';
        gamePanel.style.display = 'block';
        roomCodeEl.textContent = roomCode;
        statusEl.textContent = 'Connected';
        
        // Start game loop
        startGame();
    } catch (error) {
        console.error('Error joining game:', error);
        statusEl.textContent = 'Error joining game';
    }
}

function createPlayer() {
    const colorIndex = Object.keys(players).length % PLAYER_COLORS.length;
    const color = PLAYER_COLORS[colorIndex];
    
    // Random spawn position
    const spawnX = Math.floor(Math.random() * (WORLD_SIZE - 200)) + 100;
    const spawnY = Math.floor(Math.random() * (WORLD_SIZE - 200)) + 100;
    
    // Create initial territory (20x20 grid)
    const territory = [];
    for (let i = -10; i < 10; i++) {
        for (let j = -10; j < 10; j++) {
            const gridX = Math.floor(spawnX / GRID_SIZE) + i;
            const gridY = Math.floor(spawnY / GRID_SIZE) + j;
            territory.push(`${gridX},${gridY}`);
        }
    }
    
    return {
        name: myPlayerName,
        x: spawnX,
        y: spawnY,
        direction: 'right',
        color: color,
        territory: territory,
        trail: [],
        dead: false,
        score: 0
    };
}

function startGame() {
    if (gameLoop) clearInterval(gameLoop);
    if (firebaseUpdateLoop) clearInterval(firebaseUpdateLoop);
    
    currentDirection = 'right';
    targetDirection = 'right';
    
    gameLoop = setInterval(updateGame, UPDATE_RATE);
    firebaseUpdateLoop = setInterval(updateFirebase, FIREBASE_UPDATE_RATE);
}

function updateGame() {
    if (isPaused || !myPlayerId || !players[myPlayerId] || players[myPlayerId].dead) return;
    
    const myPlayer = players[myPlayerId];
    
    // Update direction at grid boundaries
    const gridX = Math.round(myPlayer.x / GRID_SIZE);
    const gridY = Math.round(myPlayer.y / GRID_SIZE);
    const snapX = gridX * GRID_SIZE;
    const snapY = gridY * GRID_SIZE;
    
    if (Math.abs(myPlayer.x - snapX) < 1 && Math.abs(myPlayer.y - snapY) < 1) {
        currentDirection = targetDirection;
        myPlayer.x = snapX;
        myPlayer.y = snapY;
    }
    
    // Move player
    if (currentDirection === 'up') myPlayer.y -= PLAYER_SPEED;
    else if (currentDirection === 'down') myPlayer.y += PLAYER_SPEED;
    else if (currentDirection === 'left') myPlayer.x -= PLAYER_SPEED;
    else if (currentDirection === 'right') myPlayer.x += PLAYER_SPEED;
    
    myPlayer.direction = currentDirection;
    
    // Keep player in bounds
    myPlayer.x = Math.max(0, Math.min(WORLD_SIZE, myPlayer.x));
    myPlayer.y = Math.max(0, Math.min(WORLD_SIZE, myPlayer.y));
    
    // Update trail and territory
    const currentGridPos = `${gridX},${gridY}`;
    const inOwnTerritory = myPlayer.territory.includes(currentGridPos);
    
    if (inOwnTerritory) {
        // Returned to territory - capture trail
        if (myPlayer.trail.length > 0) {
            const newTerritory = fillTrail(myPlayer);
            myPlayer.territory = [...new Set([...myPlayer.territory, ...newTerritory])];
            myPlayer.trail = [];
            myPlayer.score = Math.floor((myPlayer.territory.length / ((WORLD_SIZE / GRID_SIZE) ** 2)) * 100);
        }
    } else {
        // Outside territory - add to trail
        if (!myPlayer.trail.includes(currentGridPos)) {
            myPlayer.trail.push(currentGridPos);
        }
        
        // Check collision with own trail
        if (myPlayer.trail.filter(pos => pos === currentGridPos).length > 1) {
            killPlayer(myPlayerId);
            return;
        }
    }
    
    // Check collision with other players
    checkCollisions();
    
    // Update camera
    camera.x = myPlayer.x - canvasWidth / 2;
    camera.y = myPlayer.y - canvasHeight / 2;
    
    // Render
    render();
}

function fillTrail(player) {
    // Simple flood fill algorithm to capture enclosed area
    const territory = new Set(player.territory);
    const trail = new Set(player.trail);
    const newTerritory = [...player.trail];
    
    // Get bounding box
    const allPoints = [...player.territory, ...player.trail];
    const coords = allPoints.map(p => p.split(',').map(Number));
    const minX = Math.min(...coords.map(c => c[0]));
    const maxX = Math.max(...coords.map(c => c[0]));
    const minY = Math.min(...coords.map(c => c[1]));
    const maxY = Math.max(...coords.map(c => c[1]));
    
    // Fill the area enclosed by trail
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const pos = `${x},${y}`;
            if (!territory.has(pos) && !trail.has(pos)) {
                // Check if point is inside the trail boundary
                if (isInsideTrail(x, y, player)) {
                    newTerritory.push(pos);
                }
            }
        }
    }
    
    return newTerritory;
}

function isInsideTrail(x, y, player) {
    // Ray casting algorithm to check if point is inside polygon
    const boundary = [...player.territory, ...player.trail].map(p => {
        const [px, py] = p.split(',').map(Number);
        return { x: px, y: py };
    });
    
    let inside = false;
    for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
        const xi = boundary[i].x, yi = boundary[i].y;
        const xj = boundary[j].x, yj = boundary[j].y;
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

function checkCollisions() {
    if (!myPlayerId || !players[myPlayerId]) return;
    
    const myPlayer = players[myPlayerId];
    const myGridX = Math.round(myPlayer.x / GRID_SIZE);
    const myGridY = Math.round(myPlayer.y / GRID_SIZE);
    const myPos = `${myGridX},${myGridY}`;
    
    for (const [playerId, player] of Object.entries(players)) {
        if (playerId === myPlayerId || player.dead) continue;
        
        // Check if I hit their trail
        if (player.trail.includes(myPos)) {
            killPlayer(myPlayerId);
            return;
        }
        
        // Check if they hit my trail
        const theirGridX = Math.round(player.x / GRID_SIZE);
        const theirGridY = Math.round(player.y / GRID_SIZE);
        const theirPos = `${theirGridX},${theirGridY}`;
        
        if (myPlayer.trail.includes(theirPos)) {
            // They hit my trail - they die (will be handled by their client)
        }
    }
}

function killPlayer(playerId) {
    if (players[playerId]) {
        players[playerId].dead = true;
        players[playerId].trail = [];
        
        if (playerId === myPlayerId) {
            respawnPanel.style.display = 'block';
            document.getElementById('finalScore').textContent = myScore;
        }
    }
}

function updateFirebase() {
    if (!myPlayerId || !players[myPlayerId] || isPaused) return;
    
    const myPlayer = players[myPlayerId];
    update(ref(database, `paperio-rooms/${currentRoom}/players/${myPlayerId}`), {
        x: myPlayer.x,
        y: myPlayer.y,
        direction: myPlayer.direction,
        territory: myPlayer.territory,
        trail: myPlayer.trail,
        dead: myPlayer.dead,
        score: myPlayer.score
    });
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Draw grid
    drawGrid();
    
    // Draw all players
    for (const [playerId, player] of Object.entries(players)) {
        if (player.dead) continue;
        
        // Draw territory
        ctx.fillStyle = player.color + '66'; // Semi-transparent
        for (const pos of player.territory) {
            const [x, y] = pos.split(',').map(Number);
            ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        }
        
        // Draw trail
        ctx.fillStyle = player.color + 'AA';
        for (const pos of player.trail) {
            const [x, y] = pos.split(',').map(Number);
            ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        }
        
        // Draw player
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x - GRID_SIZE / 2, player.y - GRID_SIZE / 2, GRID_SIZE, GRID_SIZE);
        
        // Draw name
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.name, player.x, player.y - 15);
    }
    
    ctx.restore();
    
    // Update score display
    if (players[myPlayerId]) {
        myScore = players[myPlayerId].score;
        scoreEl.textContent = myScore;
    }
}

function drawGrid() {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    
    const startX = Math.floor(camera.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(camera.y / GRID_SIZE) * GRID_SIZE;
    const endX = startX + canvasWidth + GRID_SIZE;
    const endY = startY + canvasHeight + GRID_SIZE;
    
    for (let x = startX; x < endX; x += GRID_SIZE * 5) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    
    for (let y = startY; y < endY; y += GRID_SIZE * 5) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
}

function updatePlayersList() {
    const sortedPlayers = Object.entries(players)
        .filter(([_, p]) => !p.dead)
        .sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
    
    playerCountEl.textContent = sortedPlayers.length;
    
    playersListEl.innerHTML = sortedPlayers
        .map(([id, player]) => {
            const isMe = id === myPlayerId;
            return `
                <div class="player-item" style="border-left: 4px solid ${player.color}">
                    ${isMe ? '👤 ' : ''}${player.name}: ${player.score || 0}%
                </div>
            `;
        })
        .join('');
}

function respawnPlayer() {
    if (!myPlayerId || !currentRoom) return;
    
    const player = createPlayer();
    currentDirection = 'right';
    targetDirection = 'right';
    
    set(ref(database, `paperio-rooms/${currentRoom}/players/${myPlayerId}`), player);
    respawnPanel.style.display = 'none';
}

function leaveGame() {
    if (myPlayerId && currentRoom) {
        remove(ref(database, `paperio-rooms/${currentRoom}/players/${myPlayerId}`));
    }
    
    if (gameLoop) clearInterval(gameLoop);
    if (firebaseUpdateLoop) clearInterval(firebaseUpdateLoop);
    
    gamePanel.style.display = 'none';
    joinPanel.style.display = 'block';
    
    myPlayerId = null;
    currentRoom = null;
    players = {};
    myScore = 0;
}

function pauseGame() {
    isPaused = true;
    pauseScreen.style.display = 'block';
}

function resumeGame() {
    isPaused = false;
    pauseScreen.style.display = 'none';
}
