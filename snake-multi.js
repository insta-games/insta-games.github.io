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
const SNAKE_SPEED = 2;
const BOOST_SPEED = 4;
const SEGMENT_SIZE = 10;
const SEGMENT_SPACING = 8;
const FOOD_SIZE = 6;
const INITIAL_LENGTH = 10;
const FOOD_COUNT = 100; // Reduced from 200
const UPDATE_RATE = 1000 / 60; // 60 FPS
const FIREBASE_UPDATE_RATE = 1000 / 15; // Update Firebase only 15 times per second

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
let firebaseUpdateLoop = null;
let lastFirebaseUpdate = 0;
let mouseX = 0;
let mouseY = 0;
let isBoosting = false;
let boostFrameCounter = 0;
let camera = { x: 0, y: 0, zoom: 1.5 };

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
const boostBtn = document.getElementById('boostBtn');
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
            // Find room with less than 4 players, prioritize rooms with players
            const availableRooms = [];
            for (const [roomCode, room] of Object.entries(rooms)) {
                const playerCount = room.players ? Object.keys(room.players).length : 0;
                if (playerCount > 0 && playerCount < 4) {
                    availableRooms.push({ roomCode, playerCount });
                }
            }
            
            // Sort by player count (join rooms with more players first)
            if (availableRooms.length > 0) {
                availableRooms.sort((a, b) => b.playerCount - a.playerCount);
                joinGame(availableRooms[0].roomCode);
                return;
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
        alert('Invalid room code');
        return;
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
        
        // Immediately add to local players object for instant rendering
        players[myPlayerId] = playerData;
        
        // Initialize camera position
        camera.x = startX;
        camera.y = startY;
        
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
        scoreEl.textContent = '0';
        
        // Draw initial frame before game loop starts
        draw();
        
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
            cleanupInactivePlayers();
            updatePlayersList();
            playerCountEl.textContent = Object.keys(players).length;
        }
    });
    
    // Listen to foods
    onValue(ref(database, `snake-rooms/${currentRoom}/foods`), (snapshot) => {
        if (snapshot.exists()) {
            foods = Object.values(snapshot.val());
            // Ensure minimum food count
            ensureMinimumFood();
        } else {
            foods = [];
            // No food at all, initialize
            initializeFoods();
        }
    });
}

// Clean up inactive players
function cleanupInactivePlayers() {
    const now = Date.now();
    const timeout = 10000; // 10 seconds without update = inactive
    
    for (const playerId in players) {
        const player = players[playerId];
        if (player.lastUpdate && (now - player.lastUpdate) > timeout) {
            // Remove inactive player
            remove(ref(database, `snake-rooms/${currentRoom}/players/${playerId}`))
                .catch(err => console.error('Error removing inactive player:', err));
        }
    }
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

// Ensure minimum food count
function ensureMinimumFood() {
    const minFood = FOOD_COUNT * 0.5; // Keep at least 50% of target food count
    if (foods.length < minFood) {
        const needed = Math.ceil(minFood - foods.length);
        for (let i = 0; i < needed; i++) {
            spawnFood(Math.random() * WORLD_SIZE, Math.random() * WORLD_SIZE);
        }
    }
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
    // Touch movement - only for direction, no boosting
    document.addEventListener('touchmove', (e) => {
        // Only prevent default if game is active (join panel hidden)
        if (joinPanel.style.display === 'none') {
            e.preventDefault();
            const touch = e.touches[0];
            mouseX = touch.clientX;
            mouseY = touch.clientY;
        }
    }, { passive: false });
    
    // Boost button for touch devices
    if (boostBtn) {
        boostBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isBoosting = true;
        }, { passive: false });
        
        boostBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isBoosting = false;
        }, { passive: false });
        
        boostBtn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            isBoosting = false;
        }, { passive: false });
    }
}

// Start game loop
function startGameLoop() {
    gameLoop = requestAnimationFrame(gameLoopFunction);
    firebaseUpdateLoop = setInterval(updateFirebase, FIREBASE_UPDATE_RATE);
}

// Main game loop using requestAnimationFrame
function gameLoopFunction() {
    updateGame();
    draw();
    if (gameLoop !== null) {
        gameLoop = requestAnimationFrame(gameLoopFunction);
    }
}

// Update Firebase separately at lower rate
function updateFirebase() {
    if (!myPlayerId || !players[myPlayerId] || !players[myPlayerId].alive) return;
    
    const mySnake = players[myPlayerId].segments;
    
    update(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`), {
        segments: mySnake,
        angle: players[myPlayerId].angle || 0,
        score: myScore,
        lastUpdate: Date.now()
    }).catch(err => console.error('Firebase update error:', err));
}

// Update game
function updateGame() {
    if (!myPlayerId || !players[myPlayerId] || !players[myPlayerId].alive) {
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
    
    // Check collision with other snakes (not self) - optimized
    for (const playerId in players) {
        if (playerId === myPlayerId || !players[playerId].alive) continue;
        const otherSnake = players[playerId].segments;
        if (otherSnake && otherSnake.length > 0) {
            // Only check first 30 segments for performance
            const checkLength = Math.min(30, otherSnake.length);
            for (let i = 0; i < checkLength; i++) {
                const segment = otherSnake[i];
                const dx = newHead.x - segment.x;
                const dy = newHead.y - segment.y;
                if (dx * dx + dy * dy < SEGMENT_SIZE * SEGMENT_SIZE) {
                    handleDeath();
                    return;
                }
            }
        }
    }
    
    // Add new head
    mySnake.unshift(newHead);
    
    // Check food collisions - optimized
    let ate = false;
    const eatRadius = SEGMENT_SIZE + FOOD_SIZE;
    const eatRadiusSq = eatRadius * eatRadius;
    for (let i = foods.length - 1; i >= 0; i--) {
        const food = foods[i];
        const dx = newHead.x - food.x;
        const dy = newHead.y - food.y;
        if (dx * dx + dy * dy < eatRadiusSq) {
            ate = true;
            // Remove from local array immediately
            foods.splice(i, 1);
            break;
        }
    }
    
    // Remove tail if didn't eat
    if (!ate) {
        mySnake.pop();
        
        // Boost penalty: lose extra segment every 30 frames of boosting
        if (isBoosting) {
            boostFrameCounter++;
            if (boostFrameCounter >= 30 && mySnake.length > INITIAL_LENGTH) {
                mySnake.pop();
                boostFrameCounter = 0;
            }
        } else {
            boostFrameCounter = 0;
        }
    } else {
        boostFrameCounter = 0;
    }
    
    // Update score to reflect snake length
    myScore = Math.max(0, mySnake.length - INITIAL_LENGTH);
    scoreEl.textContent = myScore;
    
    // Maintain segments spacing - optimized
    for (let i = 1; i < mySnake.length; i++) {
        const prev = mySnake[i - 1];
        const curr = mySnake[i];
        const dx = prev.x - curr.x;
        const dy = prev.y - curr.y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq > SEGMENT_SPACING * SEGMENT_SPACING) {
            const dist = Math.sqrt(distSq);
            const ratio = SEGMENT_SPACING / dist;
            curr.x = prev.x - dx * ratio;
            curr.y = prev.y - dy * ratio;
        }
    }
    
    // Store angle locally for Firebase update
    if (players[myPlayerId]) {
        players[myPlayerId].angle = targetAngle;
    }
}

// Handle player death
function handleDeath() {
    // Drop food where snake died (non-blocking)
    const mySnake = players[myPlayerId].segments;
    for (let i = 0; i < mySnake.length; i += 3) {
        spawnFood(mySnake[i].x, mySnake[i].y);
    }
    
    update(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`), {
        alive: false
    }).catch(err => console.error('Death update error:', err));
    
    statusEl.textContent = 'You died! 💀';
    respawnPanel.style.display = 'block';
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
    
    // Update local player immediately
    if (players[myPlayerId]) {
        players[myPlayerId].segments = segments;
        players[myPlayerId].alive = true;
        players[myPlayerId].score = 0;
        players[myPlayerId].angle = 0;
    }
    
    // Initialize camera position
    camera.x = startX;
    camera.y = startY;
    
    await update(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`), {
        segments: segments,
        alive: true,
        score: 0,
        angle: 0,
        lastUpdate: Date.now()
    });
    
    statusEl.textContent = 'Game Active!';
    respawnPanel.style.display = 'none';
    
    // Draw immediately
    draw();
}

// Draw game
function draw() {
    // Clear canvas first (before any transforms)
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Update camera to keep player centered
    if (myPlayerId && players[myPlayerId] && players[myPlayerId].alive && players[myPlayerId].segments[0]) {
        const head = players[myPlayerId].segments[0];
        camera.x = head.x;
        camera.y = head.y;
    }
    
    ctx.save();
    // Apply transforms: translate to center, scale, then offset by camera
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    
    // Draw world boundary
    ctx.strokeStyle = '#2a3f5f';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    
    // Draw grid (only visible portion for performance)
    ctx.strokeStyle = 'rgba(26, 31, 53, 0.3)';
    ctx.lineWidth = 0.5;
    const gridSize = 100;
    const startX = Math.max(0, Math.floor((camera.x - canvasWidth / camera.zoom / 2) / gridSize) * gridSize);
    const endX = Math.min(WORLD_SIZE, Math.ceil((camera.x + canvasWidth / camera.zoom / 2) / gridSize) * gridSize);
    const startY = Math.max(0, Math.floor((camera.y - canvasHeight / camera.zoom / 2) / gridSize) * gridSize);
    const endY = Math.min(WORLD_SIZE, Math.ceil((camera.y + canvasHeight / camera.zoom / 2) / gridSize) * gridSize);
    
    for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
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
        
        // Draw snake outline (for visibility)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = SEGMENT_SIZE + 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(player.segments[0].x, player.segments[0].y);
        for (let i = 1; i < player.segments.length; i++) {
            ctx.lineTo(player.segments[i].x, player.segments[i].y);
        }
        ctx.stroke();
        
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
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    
    if (firebaseUpdateLoop) {
        clearInterval(firebaseUpdateLoop);
        firebaseUpdateLoop = null;
    }
    
    if (myPlayerId && currentRoom) {
        await remove(ref(database, `snake-rooms/${currentRoom}/players/${myPlayerId}`));
    }
    
    myPlayerId = null;
    currentRoom = null;
    players = {};
    foods = [];
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
