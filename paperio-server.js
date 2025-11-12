// Paper.io Clone - Server
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

// Game constants
const GAME_WIDTH = 2000;
const GAME_HEIGHT = 2000;
const GRID_SIZE = 10;
const PLAYER_SPEED = 3;
const INITIAL_TERRITORY_SIZE = 10;

// Game state
const players = {};
const territories = {}; // player territories (filled squares)
const trails = {}; // current drawing trails

// Colors for players
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80'
];

let colorIndex = 0;

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  socket.on('joinGame', (data) => {
    const color = COLORS[colorIndex % COLORS.length];
    colorIndex++;
    
    // Find spawn position not on other players' territory
    const spawnPos = findSpawnPosition();
    
    players[socket.id] = {
      id: socket.id,
      name: data.name || 'Player',
      x: spawnPos.x,
      y: spawnPos.y,
      direction: { x: 0, y: 0 },
      color: color,
      score: 0,
      alive: true,
      kills: 0,
      onOwnTerritory: true
    };
    
    // Create initial territory
    territories[socket.id] = [];
    const startX = Math.floor(spawnPos.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(spawnPos.y / GRID_SIZE) * GRID_SIZE;
    
    for (let x = startX; x < startX + INITIAL_TERRITORY_SIZE * GRID_SIZE; x += GRID_SIZE) {
      for (let y = startY; y < startY + INITIAL_TERRITORY_SIZE * GRID_SIZE; y += GRID_SIZE) {
        territories[socket.id].push({ x, y });
      }
    }
    
    trails[socket.id] = [];
    
    socket.emit('gameState', {
      myId: socket.id,
      players,
      territories,
      trails
    });
    
    io.emit('playerJoined', players[socket.id]);
  });
  
  socket.on('move', (data) => {
    const player = players[socket.id];
    if (!player || !player.alive) return;
    
    player.direction = data.direction;
  });
  
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    delete territories[socket.id];
    delete trails[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

function findSpawnPosition() {
  // Try to find a position not on existing territories
  for (let attempts = 0; attempts < 50; attempts++) {
    const x = Math.random() * (GAME_WIDTH - 200) + 100;
    const y = Math.random() * (GAME_HEIGHT - 200) + 100;
    
    let onTerritory = false;
    for (const playerId in territories) {
      if (isOnTerritory(x, y, territories[playerId])) {
        onTerritory = true;
        break;
      }
    }
    
    if (!onTerritory) {
      return { x, y };
    }
  }
  
  // If no free space found, spawn anyway
  return {
    x: Math.random() * (GAME_WIDTH - 200) + 100,
    y: Math.random() * (GAME_HEIGHT - 200) + 100
  };
}

function isOnTerritory(x, y, territory) {
  const gridX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
  const gridY = Math.floor(y / GRID_SIZE) * GRID_SIZE;
  
  return territory.some(t => t.x === gridX && t.y === gridY);
}

function isInsidePolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function floodFill(ownTerritory, trail) {
  if (trail.length < 3) return [];
  
  const filled = [];
  const territorySet = new Set(ownTerritory.map(t => `${t.x},${t.y}`));
  const trailSet = new Set(trail.map(t => `${t.x},${t.y}`));
  
  // Find bounding box of the trail
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const point of trail) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  
  // Check all grid positions within bounding box
  for (let x = minX; x <= maxX; x += GRID_SIZE) {
    for (let y = minY; y <= maxY; y += GRID_SIZE) {
      const key = `${x},${y}`;
      
      // Skip if already territory or part of trail
      if (territorySet.has(key) || trailSet.has(key)) continue;
      
      // Check if this point is inside the polygon formed by trail
      if (isInsidePolygon(x + GRID_SIZE/2, y + GRID_SIZE/2, trail)) {
        filled.push({ x, y });
      }
    }
  }
  
  return filled;
}

// Game loop
setInterval(() => {
  for (const id in players) {
    const player = players[id];
    if (!player.alive) continue;
    
    // Move player
    if (player.direction.x !== 0 || player.direction.y !== 0) {
      player.x += player.direction.x * PLAYER_SPEED;
      player.y += player.direction.y * PLAYER_SPEED;
      
      // Keep in bounds
      player.x = Math.max(0, Math.min(GAME_WIDTH, player.x));
      player.y = Math.max(0, Math.min(GAME_HEIGHT, player.y));
      
      const gridX = Math.floor(player.x / GRID_SIZE) * GRID_SIZE;
      const gridY = Math.floor(player.y / GRID_SIZE) * GRID_SIZE;
      
      // Check if on own territory
      const onOwnTerritory = isOnTerritory(player.x, player.y, territories[id]);
      
      if (onOwnTerritory && !player.onOwnTerritory) {
        // Just returned to territory - complete the trail
        if (trails[id].length > 2) {
          const trail = [...trails[id], { x: gridX, y: gridY }];
          
          // Fill enclosed area
          const newTerritory = floodFill(territories[id], trail);
          territories[id] = [...territories[id], ...trail, ...newTerritory];
          
          // Update score
          player.score = territories[id].length;
          
          trails[id] = [];
        }
        player.onOwnTerritory = true;
      } else if (!onOwnTerritory && player.onOwnTerritory) {
        // Left territory - start trail
        player.onOwnTerritory = false;
        trails[id] = [{ x: gridX, y: gridY }];
      } else if (!onOwnTerritory) {
        // Continue trail
        const lastTrail = trails[id][trails[id].length - 1];
        if (!lastTrail || lastTrail.x !== gridX || lastTrail.y !== gridY) {
          trails[id].push({ x: gridX, y: gridY });
        }
        
        // Check collision with own trail
        for (let i = 0; i < trails[id].length - 1; i++) {
          if (trails[id][i].x === gridX && trails[id][i].y === gridY) {
            killPlayer(id);
            break;
          }
        }
        
        // Check collision with other players' trails or territories
        for (const otherId in players) {
          if (otherId === id) continue;
          
          // Check trail collision
          if (trails[otherId] && trails[otherId].some(t => t.x === gridX && t.y === gridY)) {
            killPlayer(otherId);
            player.kills++;
          }
          
          // Check territory collision while on trail
          if (territories[otherId] && isOnTerritory(player.x, player.y, territories[otherId])) {
            // Allow passing through - no instant death
          }
        }
      }
    }
  }
  
  // Send game state
  io.emit('update', {
    players,
    territories,
    trails
  });
}, 1000 / 60);

function killPlayer(playerId) {
  const player = players[playerId];
  if (!player) return;
  
  player.alive = false;
  trails[playerId] = [];
  
  setTimeout(() => {
    // Respawn
    const spawnPos = findSpawnPosition();
    player.x = spawnPos.x;
    player.y = spawnPos.y;
    player.alive = true;
    player.onOwnTerritory = true;
    
    // Reset to small territory
    territories[playerId] = [];
    const startX = Math.floor(spawnPos.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(spawnPos.y / GRID_SIZE) * GRID_SIZE;
    
    for (let x = startX; x < startX + INITIAL_TERRITORY_SIZE * GRID_SIZE; x += GRID_SIZE) {
      for (let y = startY; y < startY + INITIAL_TERRITORY_SIZE * GRID_SIZE; y += GRID_SIZE) {
        territories[playerId].push({ x, y });
      }
    }
    player.score = territories[playerId].length;
  }, 3000);
}

http.listen(PORT, () => {
  console.log(`Paper.io server running on port ${PORT}`);
});
