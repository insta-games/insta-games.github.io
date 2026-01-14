// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, onValue, update, remove, push, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

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
const WORLD_SIZE = 3000;
const SNAKE_SPEED = 3;
const BOOST_SPEED = 6;
const SEGMENT_SIZE = 10;
const SEGMENT_SPACING = 8;
const FOOD_SIZE = 6;
const INITIAL_LENGTH = 10;
const FOOD_COUNT = 200;
const UPDATE_RATE = 1000 / 60; // 60 FPS

// Game State
let canvas, ctx;
let canvasWidth, canvasHeight;
let myPlayerId = null;
let myPlayerName = '';
let currentRoom = null;
let players = {};
let foods = [];
let myScore = 0;
let gameLoop = null;
let mouseX = 0;
let mouseY = 0;
let isBoosting = false;
let camera = { x: 0, y: 0 };

// Colors for different players
const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

// DOM Elements
const joinPanel = document.getElementById('joinPanel');
const gamePanel = document.getElementById('gamePanel');
const nameInput = document.getElementById('nameInput');
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const quickPlayBtn = document.getElementById('quickPlayBtn');
const leaveBtn = document.getElementById('leaveBtn');
const respawnBtn = document.getElementById('respawnBtn');
const respawnPanel = document.getElementById('respawnPanel');
const roomCodeEl = document.getElementById('roomCode');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const playerCountEl = document.getElementById('playerCount');
const playersListEl = document.getElementById('playersList');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas to fullscreen
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    joinBtn.addEventListener('click', () => joinGame(roomInput.value.toUpperCase()));
    quickPlayBtn.addEventListener('click', () => findOrCreateRoom());
    leaveBtn.addEventListener('click', leaveGame);
    respawnBtn.addEventListener('click', respawnPlayer);
    
    setupMouseControls();
    setupTouchControls();
});

// Resize canvas to fullscreen
function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    mouseX = canvasWidth / 2;
    mouseY = canvasHeight / 2;
}

// Generate unique player ID
function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
}

// Generate room code
function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Find available room or create new one
async function findOrCreateRoom() {
    const name = nameInput.value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    try {
        const roomsSnapshot = await get(ref(database, 'snake-rooms'));
        if (roomsSnapshot.exists()) {
            const rooms = roomsSnapshot.val();
            // Find room with less than 4 players
            for (const [roomCode, room] of Object.entries(rooms)) {
                const playerCount = room.players ? Object.keys(room.players).length : 0;
                if (playerCount < 4) {
                    joinGame(roomCode);
                    return;
                }
            }
        }
        // No available room, create new one
        const newRoomCode = generateRoomCode();
        joinGame(newRoomCode);
    } catch (error) {
        console.error('Error finding room:', error);
        alert('Error connecting to game. Please try again.');
    }
}

// Join game room
async function joinGame(roomCode) {
    const name = nameInput.value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    if (!roomCode) {
        roomCode = generateRoomCode();
    }
    
    myPlayerId = generatePlayerId();
    myPlayerName = name;
    currentRoom = roomCode;
    
    // Create initial snake at random position
    const startX = Math.random() * (WORLD_SIZE - 400) + 200;
    const startY = Math.random() * (WORLD_SIZE - 400) + 200;
    
    const segments = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
        segments.push({ x: startX - i * SEGMENT_SPACING, y: startY });
    }
    
    const playerData = {
        name: name,
        score: 0,
        alive: true,
        color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
        segments: segments,
        angle: 0,
        lastUpdate: Date.now()
    };
    
    try {
        // Add player to room
        await set(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`), playerData);
        
        // Initialize foods if needed
        const foodSnapshot = await get(ref(database, `snake-rooms/${currentRoom}/foods`));
        if (!foodSnapshot.exists()) {
            await initializeFoods();
        }
        
        // Setup listeners
        setupGameListeners();
        
        // Show game panel
        joinPanel.style.display = 'none';
        gamePanel.style.display = 'block';
        roomCodeEl.textContent = currentRoom;
        statusEl.textContent = 'Game Active!';
        
        // Start game loop
        startGameLoop();
        
    } catch (error) {
        console.error('Error joining game:', error);
        alert('Error joining game. Please try again.');
    }
}

// Setup Firebase listeners
function setupGameListeners() {
    // Listen to players
    onValue(ref(database, `snake-rooms/${currentRoom}/players`), (snapshot) => {
        if (snapshot.exists()) {
            players = snapshot.val();
            updatePlayersList();
            playerCountEl.textContent = Object.keys(players).length;
        }
    });
    
    // Listen to foods
    onValue(ref(database, `snake-rooms/${currentRoom}/foods`), (snapshot) => {
        if (snapshot.exists()) {
            foods = Object.values(snapshot.val());
        }
    });
}

// Initialize foods
async function initializeFoods() {
    const foodData = {};
    for (let i = 0; i < FOOD_COUNT; i++) {
        const foodId = 'food_' + i;
        foodData[foodId] = {
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]
        };
    }
    await set(ref(database, `snake-rooms/${currentRoom}/foods`), foodData);
}

// Spawn food at position
async function spawnFood(x, y) {
    const foodId = 'food_' + Date.now() + '_' + Math.random();
    await set(ref(database, `snake-rooms/${currentRoom}/foods/${foodId}`), {
        x: x,
        y: y,
        color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]
    });
}

// Update players list
function updatePlayersList() {
    playersListEl.innerHTML = '<h3 style="color: #06b6d4; text-align: center;">Leaderboard</h3>';
    
    const sortedPlayers = Object.entries(players)
        .sort(([, a], [, b]) => b.score - a.score);
    
    sortedPlayers.forEach(([id, player]) => {
        const div = document.createElement('div');
        div.className = 'player-item';
        div.innerHTML = `
            <span class="player-name" style="color: ${player.color}">${player.name} ${id === myPlayerId ? '(You)' : ''}</span>
            <span class="player-score">${player.score} pts ${!player.alive ? '💀' : ''}</span>
        `;
        playersListEl.appendChild(div);
    });
}

// Setup mouse controls
function setupMouseControls() {
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    document.addEventListener('mousedown', () => {
        isBoosting = true;
    });
    
    document.addEventListener('mouseup', () => {
        isBoosting = false;
    });
}

// Setup touch controls
function setupTouchControls() {
    document.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        mouseX = touch.clientX;
        mouseY = touch.clientY;
    }, { passive: false });
    
    document.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isBoosting = true;
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
        e.preventDefault();
        isBoosting = false;
    }, { passive: false });
}

// Start game loop
function startGameLoop() {
    gameLoop = setInterval(updateGame, UPDATE_RATE);
}

// Update game
async function updateGame() {
    if (!myPlayerId || !players[myPlayerId] || !players[myPlayerId].alive) {
        draw();
        return;
    }
    
    const mySnake = players[myPlayerId].segments;
    const head = mySnake[0];
    
    // Calculate angle to mouse (relative to center of screen)
    const dx = mouseX - canvasWidth / 2;
    const dy = mouseY - canvasHeight / 2;
    const targetAngle = Math.atan2(dy, dx);
    
    // Move speed
    const speed = isBoosting ? BOOST_SPEED : SNAKE_SPEED;
    
    // Calculate new head position
    const newHead = {
        x: head.x + Math.cos(targetAngle) * speed,
        y: head.y + Math.sin(targetAngle) * speed
    };
    
    // Wrap around world boundaries
    if (newHead.x < 0) newHead.x = WORLD_SIZE;
    if (newHead.x > WORLD_SIZE) newHead.x = 0;
    if (newHead.y < 0) newHead.y = WORLD_SIZE;
    if (newHead.y > WORLD_SIZE) newHead.y = 0;
    
    // Check collision with other snakes (not self)
    for (const playerId in players) {
        if (playerId === myPlayerId || !players[playerId].alive) continue;
        const otherSnake = players[playerId].segments;
        if (otherSnake) {
            for (let i = 0; i < otherSnake.length; i++) {
                const segment = otherSnake[i];
                const dist = Math.hypot(newHead.x - segment.x, newHead.y - segment.y);
                if (dist < SEGMENT_SIZE) {
                    await handleDeath();
                    return;
                }
            }
        }
    }
    
    // Add new head
    mySnake.unshift(newHead);
    
    // Check food collisions
    let ate = false;
    for (let i = foods.length - 1; i >= 0; i--) {
        const food = foods[i];
        const dist = Math.hypot(newHead.x - food.x, newHead.y - food.y);
        if (dist < SEGMENT_SIZE + FOOD_SIZE) {
            myScore += 1;
            scoreEl.textContent = myScore;
            ate = true;
            // Remove food from database
            const foodKeys = Object.keys((await get(ref(database, `snake-rooms/${currentRoom}/foods`))).val() || {});
            if (foodKeys[i]) {
                await remove(ref(database, `snake-rooms/${currentRoom}/foods/${foodKeys[i]}`));
            }
            // Spawn new food
            await spawnFood(Math.random() * WORLD_SIZE, Math.random() * WORLD_SIZE);
            break;
        }
    }
    
    // Remove tail if didn't eat (or remove multiple if boosting)
    if (!ate) {
        if (isBoosting && mySnake.length > INITIAL_LENGTH) {
            mySnake.pop();
            mySnake.pop(); // Lose length when boosting
        } else {
            mySnake.pop();
        }
    }
    
    // Maintain segments spacing
    for (let i = 1; i < mySnake.length; i++) {
        const prev = mySnake[i - 1];
        const curr = mySnake[i];
        const dx = prev.x - curr.x;
        const dy = prev.y - curr.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > SEGMENT_SPACING) {
            const angle = Math.atan2(dy, dx);
            curr.x = prev.x - Math.cos(angle) * SEGMENT_SPACING;
            curr.y = prev.y - Math.sin(angle) * SEGMENT_SPACING;
        }
    }
    
    // Update Firebase
    await update(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`), {
        segments: mySnake,
        angle: targetAngle,
        score: myScore,
        lastUpdate: Date.now()
    });
    
    draw();
}

// Handle player death
async function handleDeath() {
    // Drop food where snake died
    const mySnake = players[myPlayerId].segments;
    for (let i = 0; i < mySnake.length; i += 3) {
        await spawnFood(mySnake[i].x, mySnake[i].y);
    }
    
    await update(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`), {
        alive: false
    });
    statusEl.textContent = 'You died! 💀';
    respawnPanel.style.display = 'block';
    draw();
}

// Respawn player
async function respawnPlayer() {
    if (!myPlayerId || !currentRoom) return;
    
    // Create new snake at random position
    const startX = Math.random() * (WORLD_SIZE - 400) + 200;
    const startY = Math.random() * (WORLD_SIZE - 400) + 200;
    
    const segments = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
        segments.push({ x: startX - i * SEGMENT_SPACING, y: startY });
    }
    
    myScore = 0;
    scoreEl.textContent = '0';
    
    await update(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`), {
        segments: segments,
        alive: true,
        score: 0,
        angle: 0,
        lastUpdate: Date.now()
    });
    
    statusEl.textContent = 'Game Active!';
    respawnPanel.style.display = 'none';
}

// Draw game
function draw() {
    // Clear canvas
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Update camera to keep player centered
    if (myPlayerId && players[myPlayerId] && players[myPlayerId].alive && players[myPlayerId].segments[0]) {
        const head = players[myPlayerId].segments[0];
        camera.x = head.x - canvasWidth / 2;
        camera.y = head.y - canvasHeight / 2;
    }
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Draw world boundary
    ctx.strokeStyle = '#1a1f35';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    
    // Draw grid
    ctx.strokeStyle = '#1a1f35';
    ctx.lineWidth = 1;
    const gridSize = 100;
    for (let x = 0; x <= WORLD_SIZE; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_SIZE);
        ctx.stroke();
    }
    for (let y = 0; y <= WORLD_SIZE; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_SIZE, y);
        ctx.stroke();
    }
    
    // Draw food
    foods.forEach(food => {
        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc(food.x, food.y, FOOD_SIZE, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw snakes
    for (const playerId in players) {
        const player = players[playerId];
        if (!player.segments || !player.alive) continue;
        
        // Draw snake body
        ctx.strokeStyle = player.color;
        ctx.fillStyle = player.color;
        ctx.lineWidth = SEGMENT_SIZE;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(player.segments[0].x, player.segments[0].y);
        for (let i = 1; i < player.segments.length; i++) {
            ctx.lineTo(player.segments[i].x, player.segments[i].y);
        }
        ctx.stroke();
        
        // Draw head
        const head = player.segments[0];
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(head.x, head.y, SEGMENT_SIZE / 2 + 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eyes
        const angle = player.angle || 0;
        ctx.fillStyle = '#fff';
        const eyeOffset = 4;
        const eyeSize = 2;
        ctx.beginPath();
        ctx.arc(
            head.x + Math.cos(angle + 0.3) * eyeOffset,
            head.y + Math.sin(angle + 0.3) * eyeOffset,
            eyeSize, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
            head.x + Math.cos(angle - 0.3) * eyeOffset,
            head.y + Math.sin(angle - 0.3) * eyeOffset,
            eyeSize, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw player name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(player.name, head.x, head.y - 20);
        ctx.fillText(player.name, head.x, head.y - 20);
    }
    
    ctx.restore();
    
    // Draw minimap
    drawMinimap();
}

// Draw minimap
function drawMinimap() {
    const minimapSize = Math.min(150, canvasWidth * 0.2, canvasHeight * 0.2);
    const minimapX = canvasWidth - minimapSize - 20;
    const minimapY = canvasHeight - minimapSize - 80;
    const scale = minimapSize / WORLD_SIZE;
    
    // Background
    ctx.fillStyle = 'rgba(10, 14, 26, 0.7)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Draw players
    for (const playerId in players) {
        const player = players[playerId];
        if (!player.segments || !player.alive) continue;
        
        const head = player.segments[0];
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(
            minimapX + head.x * scale,
            minimapY + head.y * scale,
            3,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

// Leave game
async function leaveGame() {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    
    if (myPlayerId && currentRoom) {
        await remove(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`));
    }
    
    myPlayerId = null;
    currentRoom = null;
    players = {};
    food = null;
    myScore = 0;
    
    gamePanel.style.display = 'none';
    joinPanel.style.display = 'block';
    
    scoreEl.textContent = '0';
    playerCountEl.textContent = '0';
    playersListEl.innerHTML = '';
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (myPlayerId && currentRoom) {
        remove(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`));
    }
});
