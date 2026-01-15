// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, onValue, update, remove, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Game Constants
const WORLD_SIZE = 2000;
const GRID_SIZE = 10;
const PLAYER_SPEED = 3;
const BOOST_SPEED = 5;
const INITIAL_TERRITORY_SIZE = 15; // 15x15 grid cells
const UPDATE_RATE = 1000 / 60;
const FIREBASE_UPDATE_RATE = 1000 / 15;

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
let mouseX = 0;
let mouseY = 0;
let isBoosting = false;
let camera = { x: 0, y: 0, zoom: 1.2 };
let isPaused = false;

// Player state
let myPosition = { x: 0, y: 0 };
let myTrail = [];
let myTerritory = new Set();
let myColor = '';

// Colors for different players
const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

// DOM Elements
let joinPanel, gamePanel, nameInput, roomInput, joinBtn, quickPlayBtn;
let leaveBtn, boostBtn, respawnBtn, respawnPanel;
let roomCodeEl, statusEl, scoreEl, playerCountEl, playersListEl, pauseScreen;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    joinPanel = document.getElementById('joinPanel');
    gamePanel = document.getElementById('gamePanel');
    nameInput = document.getElementById('nameInput');
    roomInput = document.getElementById('roomInput');
    joinBtn = document.getElementById('joinBtn');
    quickPlayBtn = document.getElementById('quickPlayBtn');
    leaveBtn = document.getElementById('leaveBtn');
    boostBtn = document.getElementById('boostBtn');
    respawnBtn = document.getElementById('respawnBtn');
    respawnPanel = document.getElementById('respawnPanel');
    roomCodeEl = document.getElementById('roomCode');
    statusEl = document.getElementById('status');
    scoreEl = document.getElementById('score');
    playerCountEl = document.getElementById('playerCount');
    playersListEl = document.getElementById('playersList');
    pauseScreen = document.getElementById('pauseScreen');
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
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
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pauseGame();
        } else {
            unpauseGame();
        }
    });

    window.addEventListener('blur', () => {
        pauseGame();
    });

    window.addEventListener('focus', () => {
        unpauseGame();
    });
    
    setupMouseControls();
    setupTouchControls();
});

function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    mouseX = canvasWidth / 2;
    mouseY = canvasHeight / 2;
}

function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
}

function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

async function findOrCreateRoom() {
    const name = nameInput.value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    try {
        const roomsSnapshot = await get(ref(database, 'paper-rooms'));
        if (roomsSnapshot.exists()) {
            const rooms = roomsSnapshot.val();
            const availableRooms = [];
            for (const [roomCode, room] of Object.entries(rooms)) {
                const playerCount = room.players ? Object.keys(room.players).length : 0;
                if (playerCount > 0 && playerCount < 6) {
                    availableRooms.push({ roomCode, playerCount });
                }
            }
            
            if (availableRooms.length > 0) {
                availableRooms.sort((a, b) => b.playerCount - a.playerCount);
                joinGame(availableRooms[0].roomCode);
                return;
            }
        }
        const newRoomCode = generateRoomCode();
        joinGame(newRoomCode);
    } catch (error) {
        console.error('Error finding room:', error);
        alert('Error connecting to game. Please try again.');
    }
}

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
    myColor = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
    
    // Create initial territory position
    const startX = Math.floor(Math.random() * (WORLD_SIZE / GRID_SIZE - INITIAL_TERRITORY_SIZE * 2)) + INITIAL_TERRITORY_SIZE;
    const startY = Math.floor(Math.random() * (WORLD_SIZE / GRID_SIZE - INITIAL_TERRITORY_SIZE * 2)) + INITIAL_TERRITORY_SIZE;
    
    myPosition = { x: startX * GRID_SIZE, y: startY * GRID_SIZE };
    myTerritory = new Set();
    myTrail = [];
    
    // Initialize territory
    for (let x = -INITIAL_TERRITORY_SIZE / 2; x < INITIAL_TERRITORY_SIZE / 2; x++) {
        for (let y = -INITIAL_TERRITORY_SIZE / 2; y < INITIAL_TERRITORY_SIZE / 2; y++) {
            const gridX = startX + x;
            const gridY = startY + y;
            myTerritory.add(`${gridX},${gridY}`);
        }
    }
    
    const playerData = {
        name: name,
        score: 0,
        alive: true,
        color: myColor,
        position: myPosition,
        trail: [],
        territory: Array.from(myTerritory),
        angle: 0,
        lastUpdate: Date.now(),
        visible: true
    };
    
    try {
        await set(ref(database, `paper-rooms/${currentRoom}/players/${myPlayerId}`), playerData);
        
        players[myPlayerId] = playerData;
        camera.x = myPosition.x;
        camera.y = myPosition.y;
        
        setupGameListeners();
        
        document.body.classList.add('game-active');
        joinPanel.style.display = 'none';
        gamePanel.style.display = 'block';
        roomCodeEl.textContent = currentRoom;
        statusEl.textContent = 'Game Active!';
        scoreEl.textContent = '0';
        
        calculateScore();
        draw();
        startGameLoop();
        
    } catch (error) {
        console.error('Error joining game:', error);
        alert('Error joining game. Please try again.');
    }
}

function setupGameListeners() {
    onValue(ref(database, `paper-rooms/${currentRoom}/players`), (snapshot) => {
        if (snapshot.exists()) {
            players = snapshot.val();
            cleanupInactivePlayers();
            updatePlayersList();
            playerCountEl.textContent = Object.keys(players).length;
        }
    });
}

function cleanupInactivePlayers() {
    const now = Date.now();
    const timeout = 10000;
    for (const playerId in players) {
        const player = players[playerId];
        if (player.lastUpdate && (now - player.lastUpdate) > timeout) {
            remove(ref(database, `paper-rooms/${currentRoom}/players/${playerId}`));
        }
    }
}

function updatePlayersList() {
    playersListEl.innerHTML = '<h3 style="color: #06b6d4; text-align: center; margin: 0 0 10px 0;">Leaderboard</h3>';
    
    const sortedPlayers = Object.entries(players)
        .sort(([, a], [, b]) => b.score - a.score);
    
    sortedPlayers.forEach(([id, player]) => {
        const div = document.createElement('div');
        div.className = 'player-item';
        div.innerHTML = `
            <span class="player-name" style="color: ${player.color}">${player.name} ${id === myPlayerId ? '(You)' : ''}</span>
            <span class="player-score">${player.score}% ${!player.alive ? '💀' : ''}</span>
        `;
        playersListEl.appendChild(div);
    });
}

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

function setupTouchControls() {
    document.addEventListener('touchmove', (e) => {
        if (joinPanel.style.display === 'none') {
            e.preventDefault();
            const touch = e.touches[0];
            mouseX = touch.clientX;
            mouseY = touch.clientY;
        }
    }, { passive: false });
    
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

function pauseGame() {
    if (!myPlayerId || !players[myPlayerId] || !players[myPlayerId].alive) return;
    
    isPaused = true;
    pauseScreen.style.display = 'block';
    
    if (myPlayerId && currentRoom) {
        update(ref(database, `paper-rooms/${currentRoom}/players/${myPlayerId}`), {
            visible: false
        }).catch(err => console.error('Pause update error:', err));
    }
}

function unpauseGame() {
    isPaused = false;
    pauseScreen.style.display = 'none';
    
    if (myPlayerId && currentRoom && players[myPlayerId]) {
        update(ref(database, `paper-rooms/${currentRoom}/players/${myPlayerId}`), {
            visible: true
        }).catch(err => console.error('Unpause update error:', err));
    }
}

function startGameLoop() {
    gameLoop = requestAnimationFrame(gameLoopFunction);
    firebaseUpdateLoop = setInterval(updateFirebase, FIREBASE_UPDATE_RATE);
}

function gameLoopFunction() {
    updateGame();
    draw();
    if (gameLoop !== null) {
        gameLoop = requestAnimationFrame(gameLoopFunction);
    }
}

function updateFirebase() {
    if (!myPlayerId || !players[myPlayerId] || !players[myPlayerId].alive) return;
    
    update(ref(database, `paper-rooms/${currentRoom}/players/${myPlayerId}`), {
        position: myPosition,
        trail: myTrail,
        territory: Array.from(myTerritory),
        angle: players[myPlayerId].angle || 0,
        score: myScore,
        lastUpdate: Date.now()
    }).catch(err => console.error('Firebase update error:', err));
}

function updateGame() {
    if (!myPlayerId || !players[myPlayerId] || !players[myPlayerId].alive || isPaused) {
        return;
    }
    
    // Calculate angle to mouse
    const dx = mouseX - canvasWidth / 2;
    const dy = mouseY - canvasHeight / 2;
    const targetAngle = Math.atan2(dy, dx);
    
    // Move speed
    const speed = isBoosting ? BOOST_SPEED : PLAYER_SPEED;
    
    // Calculate new position
    const newX = myPosition.x + Math.cos(targetAngle) * speed;
    const newY = myPosition.y + Math.sin(targetAngle) * speed;
    
    // Wrap around world boundaries
    myPosition.x = (newX + WORLD_SIZE) % WORLD_SIZE;
    myPosition.y = (newY + WORLD_SIZE) % WORLD_SIZE;
    
    // Convert to grid coordinates
    const gridX = Math.floor(myPosition.x / GRID_SIZE);
    const gridY = Math.floor(myPosition.y / GRID_SIZE);
    const gridKey = `${gridX},${gridY}`;
    
    // Check if on own territory
    const onOwnTerritory = myTerritory.has(gridKey);
    
    if (onOwnTerritory && myTrail.length > 0) {
        // Returned to territory - capture trail area
        captureTrailArea();
        myTrail = [];
        
        // Update local player immediately
        if (players[myPlayerId]) {
            players[myPlayerId].trail = [];
            players[myPlayerId].territory = Array.from(myTerritory);
        }
    } else if (!onOwnTerritory) {
        // Outside territory - add to trail
        if (myTrail.length === 0 || myTrail[myTrail.length - 1] !== gridKey) {
            myTrail.push(gridKey);
        }
        
        // Check collision with own trail
        if (myTrail.length > 1 && myTrail.slice(0, -1).includes(gridKey)) {
            handleDeath();
            return;
        }
        
        // Check collision with other players' trails and territories
        for (const playerId in players) {
            if (playerId === myPlayerId) continue;
            const player = players[playerId];
            if (!player.alive || player.visible === false) continue;
            
            // Check trail collision
            if (player.trail && player.trail.includes(gridKey)) {
                handleDeath();
                return;
            }
        }
    }
    
    // Check if other players hit our trail
    for (const playerId in players) {
        if (playerId === myPlayerId) continue;
        const player = players[playerId];
        if (!player.alive || !player.position) continue;
        
        const pGridX = Math.floor(player.position.x / GRID_SIZE);
        const pGridY = Math.floor(player.position.y / GRID_SIZE);
        const pGridKey = `${pGridX},${pGridY}`;
        
        if (myTrail.includes(pGridKey)) {
            // They hit our trail - they die, not us
            console.log('Player', playerId, 'hit our trail');
        }
    }
    
    // Update camera
    camera.x = myPosition.x;
    camera.y = myPosition.y;
    
    // Calculate score
    calculateScore();
    
    if (players[myPlayerId]) {
        players[myPlayerId].angle = targetAngle;
    }
}

function captureTrailArea() {
    if (myTrail.length < 3) {
        // Even small trails add their cells to territory
        myTrail.forEach(key => myTerritory.add(key));
        return;
    }
    
    // Add all trail cells to territory first
    myTrail.forEach(key => myTerritory.add(key));
    
    // Find bounding box
    const trailCoords = myTrail.map(k => {
        const parts = k.split(',');
        return { x: parseInt(parts[0]), y: parseInt(parts[1]) };
    });
    
    const minX = Math.min(...trailCoords.map(c => c.x));
    const maxX = Math.max(...trailCoords.map(c => c.x));
    const minY = Math.min(...trailCoords.map(c => c.y));
    const maxY = Math.max(...trailCoords.map(c => c.y));
    
    // Create a set for faster lookup
    const trailSet = new Set(myTrail);
    const territorySet = new Set(Array.from(myTerritory));
    
    // Simple flood fill from edges to find enclosed areas
    const toFill = [];
    
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const key = `${x},${y}`;
            if (!territorySet.has(key)) {
                // Check if this point is surrounded
                let surrounded = true;
                
                // Check in 4 directions - if we hit boundary before hitting non-territory, not enclosed
                const directions = [
                    [1, 0], [-1, 0], [0, 1], [0, -1]
                ];
                
                for (const [dx, dy] of directions) {
                    let checkX = x + dx;
                    let checkY = y + dy;
                    let hitTerritory = false;
                    
                    while (checkX >= minX - 5 && checkX <= maxX + 5 && 
                           checkY >= minY - 5 && checkY <= maxY + 5) {
                        const checkKey = `${checkX},${checkY}`;
                        if (territorySet.has(checkKey) || trailSet.has(checkKey)) {
                            hitTerritory = true;
                            break;
                        }
                        checkX += dx;
                        checkY += dy;
                    }
                    
                    if (!hitTerritory) {
                        surrounded = false;
                        break;
                    }
                }
                
                if (surrounded) {
                    toFill.push(key);
                }
            }
        }
    }
    
    // Add all enclosed cells to territory
    toFill.forEach(key => myTerritory.add(key));
}

function isInsideTrail(x, y, trailSet) {
    // Simple ray casting algorithm
    let inside = false;
    const testKey = `${x},${y}`;
    
    // Check if already in territory
    if (myTerritory.has(testKey)) return true;
    
    // Cast ray to the left and count intersections
    let intersections = 0;
    for (let testX = x - 1; testX >= 0; testX--) {
        const key = `${testX},${y}`;
        if (trailSet.has(key) || myTerritory.has(key)) {
            intersections++;
        }
    }
    
    return intersections % 2 === 1;
}

function calculateScore() {
    const totalCells = (WORLD_SIZE / GRID_SIZE) * (WORLD_SIZE / GRID_SIZE);
    myScore = Math.round((myTerritory.size / totalCells) * 10000) / 100;
    scoreEl.textContent = myScore.toFixed(1);
}

function handleDeath() {
    update(ref(database, `paper-rooms/${currentRoom}/players/${myPlayerId}`), {
        alive: false
    }).catch(err => console.error('Death update error:', err));
    
    statusEl.textContent = 'You died! 💀';
    respawnPanel.style.display = 'block';
}

async function respawnPlayer() {
    if (!myPlayerId || !currentRoom) return;
    
    const startX = Math.floor(Math.random() * (WORLD_SIZE / GRID_SIZE - INITIAL_TERRITORY_SIZE * 2)) + INITIAL_TERRITORY_SIZE;
    const startY = Math.floor(Math.random() * (WORLD_SIZE / GRID_SIZE - INITIAL_TERRITORY_SIZE * 2)) + INITIAL_TERRITORY_SIZE;
    
    myPosition = { x: startX * GRID_SIZE, y: startY * GRID_SIZE };
    myTerritory = new Set();
    myTrail = [];
    
    for (let x = -INITIAL_TERRITORY_SIZE / 2; x < INITIAL_TERRITORY_SIZE / 2; x++) {
        for (let y = -INITIAL_TERRITORY_SIZE / 2; y < INITIAL_TERRITORY_SIZE / 2; y++) {
            const gridX = startX + x;
            const gridY = startY + y;
            myTerritory.add(`${gridX},${gridY}`);
        }
    }
    
    myScore = 0;
    scoreEl.textContent = '0';
    
    if (players[myPlayerId]) {
        players[myPlayerId].position = myPosition;
        players[myPlayerId].alive = true;
        players[myPlayerId].score = 0;
        players[myPlayerId].angle = 0;
        players[myPlayerId].trail = [];
        players[myPlayerId].territory = Array.from(myTerritory);
        players[myPlayerId].visible = true;
    }
    
    camera.x = myPosition.x;
    camera.y = myPosition.y;
    
    await update(ref(database, `paper-rooms/${currentRoom}/players/${myPlayerId}`), {
        position: myPosition,
        alive: true,
        score: 0,
        angle: 0,
        trail: [],
        territory: Array.from(myTerritory),
        name: myPlayerName,
        color: myColor,
        visible: true,
        lastUpdate: Date.now()
    });
    
    statusEl.textContent = 'Game Active!';
    respawnPanel.style.display = 'none';
    calculateScore();
    draw();
}

function draw() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const startX = Math.floor((camera.x - canvasWidth / camera.zoom / 2) / GRID_SIZE / 10) * GRID_SIZE * 10;
    const endX = Math.ceil((camera.x + canvasWidth / camera.zoom / 2) / GRID_SIZE / 10) * GRID_SIZE * 10;
    const startY = Math.floor((camera.y - canvasHeight / camera.zoom / 2) / GRID_SIZE / 10) * GRID_SIZE * 10;
    const endY = Math.ceil((camera.y + canvasHeight / camera.zoom / 2) / GRID_SIZE / 10) * GRID_SIZE * 10;
    
    for (let x = startX; x <= endX; x += GRID_SIZE * 10) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    for (let y = startY; y <= endY; y += GRID_SIZE * 10) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
    
    // Draw all players
    for (const playerId in players) {
        const player = players[playerId];
        if (!player.alive || player.visible === false) continue;
        
        // Draw territory with smooth borders
        if (player.territory) {
            ctx.fillStyle = player.color + '40';
            ctx.strokeStyle = player.color + '60';
            ctx.lineWidth = 2;
            
            // Group adjacent cells and draw as larger rectangles
            const drawn = new Set();
            player.territory.forEach(key => {
                if (drawn.has(key)) return;
                
                const [x, y] = key.split(',').map(Number);
                
                // Find continuous horizontal run
                let width = 1;
                while (player.territory.includes(`${x + width},${y}`)) {
                    drawn.add(`${x + width},${y}`);
                    width++;
                }
                
                // Draw rounded rectangle
                const px = x * GRID_SIZE;
                const py = y * GRID_SIZE;
                const w = width * GRID_SIZE;
                const h = GRID_SIZE;
                
                ctx.beginPath();
                ctx.roundRect(px, py, w, h, 2);
                ctx.fill();
                
                drawn.add(key);
            });
        }
        
        // Draw trail as smooth line
        if (player.trail && player.trail.length > 0) {
            ctx.strokeStyle = player.color + 'CC';
            ctx.fillStyle = player.color + '80';
            ctx.lineWidth = GRID_SIZE * 1.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            if (player.trail.length === 1) {
                const [x, y] = player.trail[0].split(',').map(Number);
                ctx.beginPath();
                ctx.arc(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE * 0.75, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                const [startX, startY] = player.trail[0].split(',').map(Number);
                ctx.moveTo(startX * GRID_SIZE + GRID_SIZE / 2, startY * GRID_SIZE + GRID_SIZE / 2);
                
                for (let i = 1; i < player.trail.length; i++) {
                    const [x, y] = player.trail[i].split(',').map(Number);
                    ctx.lineTo(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE + GRID_SIZE / 2);
                }
                ctx.stroke();
            }
        }
        
        // Draw player as smooth circle
        if (player.position) {
            // Player circle
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(player.position.x, player.position.y, GRID_SIZE * 1.2, 0, Math.PI * 2);
            ctx.fill();
            
            // White border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw name with shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(player.name, player.position.x, player.position.y - 20);
            ctx.shadowBlur = 0;
        }
    }
    
    ctx.restore();
}

async function leaveGame() {
    isPaused = false;
    pauseScreen.style.display = 'none';
    
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    
    if (firebaseUpdateLoop) {
        clearInterval(firebaseUpdateLoop);
        firebaseUpdateLoop = null;
    }
    
    if (myPlayerId && currentRoom) {
        await remove(ref(database, `paper-rooms/${currentRoom}/players/${myPlayerId}`));
    }
    
    myPlayerId = null;
    currentRoom = null;
    players = {};
    myTerritory = new Set();
    myTrail = [];
    
    document.body.classList.remove('game-active');
    gamePanel.style.display = 'none';
    joinPanel.style.display = 'block';
}

window.addEventListener('beforeunload', () => {
    if (myPlayerId && currentRoom) {
        remove(ref(database, `paper-rooms/${currentRoom}/players/${myPlayerId}`));
    }
});
