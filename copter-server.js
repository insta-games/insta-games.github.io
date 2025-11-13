const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// Game constants
const GAME_WIDTH = 5000;
const GAME_HEIGHT = 5000;
const PLAYER_SIZE = 40;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 15;
const BULLET_DAMAGE = 20;
const MAX_HEALTH = 100;
const RESPAWN_TIME = 3000;
const BASE_FIRE_RATE = 300; // ms between shots

// Game state
let players = {};
let bullets = [];
let bulletId = 0;
let tanks = {};
let tankId = 0;

// Tank constants
const MAX_TANKS = 20;
const TANK_SIZE = 35;
const TANK_SPEED = 2;
const TANK_HEALTH = 60;
const TANK_XP_REWARD = 5; // Half of player kill (10)

// Upgrade system
const UPGRADES = {
  FIRE_RATE: { cost: 1, maxLevel: 5, bonus: 50 }, // -50ms per level
  BULLET_DAMAGE: { cost: 1, maxLevel: 5, bonus: 10 }, // +10 damage per level
  MAX_HEALTH: { cost: 2, maxLevel: 5, bonus: 20 }, // +20 health per level
  MOVE_SPEED: { cost: 2, maxLevel: 5, bonus: 1 }, // +1 speed per level
  BULLET_SIZE: { cost: 1, maxLevel: 3, bonus: 2 }, // +2px per level
};

// Helper functions
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function checkCollision(bullet, player) {
  return distance(bullet.x, bullet.y, player.x, player.y) < PLAYER_SIZE / 2;
}

function calculateLevel(xp) {
  return Math.floor(xp / 10) + 1;
}

function getUpgradeBonus(player, upgradeType) {
  return (player.upgrades[upgradeType] || 0) * UPGRADES[upgradeType].bonus;
}

function spawnTank() {
  const id = `tank_${tankId++}`;
  tanks[id] = {
    id,
    x: Math.random() * (GAME_WIDTH - 200) + 100,
    y: Math.random() * (GAME_HEIGHT - 200) + 100,
    health: TANK_HEALTH,
    angle: Math.random() * Math.PI * 2,
    moveTimer: 0,
    moveDirection: Math.random() * Math.PI * 2,
  };
  return tanks[id];
}

// Initialize tanks
function initializeTanks() {
  for (let i = 0; i < MAX_TANKS; i++) {
    spawnTank();
  }
}

// Update tanks AI
function updateTanks() {
  for (let id in tanks) {
    const tank = tanks[id];
    
    // Simple AI: change direction every 2-4 seconds
    tank.moveTimer++;
    if (tank.moveTimer > 60 + Math.random() * 60) { // 1-2 seconds at 60 FPS
      tank.moveDirection = Math.random() * Math.PI * 2;
      tank.moveTimer = 0;
    }
    
    // Move in current direction
    const newX = tank.x + Math.cos(tank.moveDirection) * TANK_SPEED;
    const newY = tank.y + Math.sin(tank.moveDirection) * TANK_SPEED;
    
    // Keep within bounds
    if (newX > 50 && newX < GAME_WIDTH - 50) {
      tank.x = newX;
    } else {
      tank.moveDirection = Math.PI - tank.moveDirection;
    }
    
    if (newY > 50 && newY < GAME_HEIGHT - 50) {
      tank.y = newY;
    } else {
      tank.moveDirection = -tank.moveDirection;
    }
    
    // Face movement direction
    tank.angle = tank.moveDirection;
  }
}

// Game loop
let tickCount = 0;
setInterval(() => {
  tickCount++;
  
  // Update tanks AI only every 3rd frame (reduce CPU usage)
  if (tickCount % 3 === 0) {
    updateTanks();
  }
  
  // Update bullets
  bullets = bullets.filter(bullet => {
    bullet.x += Math.cos(bullet.angle) * BULLET_SPEED;
    bullet.y += Math.sin(bullet.angle) * BULLET_SPEED;
    bullet.distance += BULLET_SPEED;

    // Remove if out of bounds or max distance
    if (bullet.x < 0 || bullet.x > GAME_WIDTH || 
        bullet.y < 0 || bullet.y > GAME_HEIGHT || 
        bullet.distance > 800) {
      return false;
    }

    // Check collision with tanks
    for (let tankId in tanks) {
      const tank = tanks[tankId];
      if (distance(bullet.x, bullet.y, tank.x, tank.y) < TANK_SIZE / 2) {
        const damage = BULLET_DAMAGE + getUpgradeBonus(players[bullet.playerId], 'BULLET_DAMAGE');
        tank.health -= damage;
        
        // Tank destroyed
        if (tank.health <= 0) {
          delete tanks[tankId];
          
          // Award XP to shooter
          if (players[bullet.playerId]) {
            players[bullet.playerId].xp += TANK_XP_REWARD;
            players[bullet.playerId].score += 50;
          }
          
          // Respawn a new tank after delay
          setTimeout(() => {
            if (Object.keys(tanks).length < MAX_TANKS) {
              spawnTank();
            }
          }, 5000);
        }
        
        return false; // Remove bullet
      }
    }

    // Check collision with players
    for (let playerId in players) {
      const player = players[playerId];
      if (player.id !== bullet.playerId && player.alive && checkCollision(bullet, player)) {
        const damage = BULLET_DAMAGE + getUpgradeBonus(players[bullet.playerId], 'BULLET_DAMAGE');
        player.health -= damage;

        // Player died
        if (player.health <= 0) {
          player.alive = false;
          player.deaths++;
          
          // Award kill to shooter
          if (players[bullet.playerId]) {
            players[bullet.playerId].kills++;
            players[bullet.playerId].xp += 10;
            players[bullet.playerId].score += 100;
          }

          io.emit('playerKilled', {
            victim: player.id,
            killer: bullet.playerId,
            victimName: player.name,
            killerName: players[bullet.playerId]?.name
          });

          // Respawn after delay
          setTimeout(() => {
            if (players[player.id]) {
              player.alive = true;
              player.health = MAX_HEALTH + getUpgradeBonus(player, 'MAX_HEALTH');
              player.x = Math.random() * (GAME_WIDTH - 200) + 100;
              player.y = Math.random() * (GAME_HEIGHT - 200) + 100;
              io.emit('playerRespawned', player.id);
            }
          }, RESPAWN_TIME);
        }

        return false; // Remove bullet
      }
    }

    return true;
  });

  // Broadcast game state only 30 times per second (every other frame)
  if (tickCount % 2 === 0) {
    io.emit('gameState', {
      players: players,
      bullets: bullets,
      tanks: tanks
    });
  }

}, 1000 / 60); // 60 FPS physics, 30 FPS broadcasts

// Socket.io handlers
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('joinGame', (data) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F06292', '#AED581'];
    
    players[socket.id] = {
      id: socket.id,
      name: data.name || `Player${Object.keys(players).length + 1}`,
      x: Math.random() * (GAME_WIDTH - 200) + 100,
      y: Math.random() * (GAME_HEIGHT - 200) + 100,
      angle: 0,
      health: MAX_HEALTH,
      maxHealth: MAX_HEALTH,
      alive: true,
      kills: 0,
      deaths: 0,
      score: 0,
      xp: 0,
      level: 1,
      color: colors[Object.keys(players).length % colors.length],
      lastShot: 0,
      upgrades: {}
    };

    socket.emit('joined', { 
      id: socket.id, 
      gameWorld: { width: GAME_WIDTH, height: GAME_HEIGHT }
    });
    
    io.emit('playerJoined', players[socket.id]);
    console.log(`${players[socket.id].name} joined`);
  });

  socket.on('playerMove', (data) => {
    if (players[socket.id] && players[socket.id].alive) {
      const player = players[socket.id];
      const speed = PLAYER_SPEED + getUpgradeBonus(player, 'MOVE_SPEED');
      
      // Update position
      player.x = Math.max(0, Math.min(GAME_WIDTH, data.x));
      player.y = Math.max(0, Math.min(GAME_HEIGHT, data.y));
      player.angle = data.angle;
    }
  });

  socket.on('shoot', (data) => {
    const player = players[socket.id];
    if (!player || !player.alive) return;

    const now = Date.now();
    const fireRate = BASE_FIRE_RATE - getUpgradeBonus(player, 'FIRE_RATE');
    
    if (now - player.lastShot < fireRate) return;
    
    player.lastShot = now;
    
    bullets.push({
      id: bulletId++,
      playerId: socket.id,
      x: player.x + Math.cos(data.angle) * 20,
      y: player.y + Math.sin(data.angle) * 20,
      angle: data.angle,
      distance: 0,
      size: 5 + getUpgradeBonus(player, 'BULLET_SIZE')
    });
  });

  socket.on('upgrade', (upgradeType) => {
    const player = players[socket.id];
    if (!player) return;

    const upgrade = UPGRADES[upgradeType];
    if (!upgrade) return;

    const currentLevel = player.upgrades[upgradeType] || 0;
    if (currentLevel >= upgrade.maxLevel) return;

    const cost = upgrade.cost;
    const availablePoints = Math.floor(player.xp / 10);
    const spentPoints = Object.values(player.upgrades).reduce((sum, level) => sum + level, 0);

    if (availablePoints >= spentPoints + cost) {
      player.upgrades[upgradeType] = currentLevel + 1;
      player.level = calculateLevel(player.xp);
      
      // Apply upgrade
      if (upgradeType === 'MAX_HEALTH') {
        player.maxHealth = MAX_HEALTH + getUpgradeBonus(player, 'MAX_HEALTH');
        player.health = Math.min(player.health + upgrade.bonus, player.maxHealth);
      }

      socket.emit('upgradeSuccess', { upgradeType, level: player.upgrades[upgradeType] });
    }
  });

  socket.on('disconnect', () => {
    if (players[socket.id]) {
      const name = players[socket.id].name;
      delete players[socket.id];
      io.emit('playerLeft', { id: socket.id, name: name });
      console.log(`${name} left`);
    }
  });
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    game: 'Copter Battle Arena',
    players: Object.keys(players).length,
    playersAlive: Object.values(players).filter(p => p.alive).length
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚁 Copter Battle Arena server running on port ${PORT}`);
  // Initialize tanks
  initializeTanks();
  console.log(`Spawned ${MAX_TANKS} AI tanks`);
});
