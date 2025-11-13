// Snake.io Server
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3002;

// Game constants
const GAME_WIDTH = 3000;
const GAME_HEIGHT = 3000;
const INITIAL_SNAKE_LENGTH = 10;
const SEGMENT_SIZE = 10;
const SPEED = 2;
const FOOD_COUNT = 100;
const BOOST_MULTIPLIER = 2;
const FOOD_VALUE = 1;

// Game state
const players = {};
const food = [];

// Generate food
function generateFood() {
    return {
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        value: FOOD_VALUE,
        id: Math.random().toString(36).substr(2, 9)
    };
}

// Initialize food
for (let i = 0; i < FOOD_COUNT; i++) {
    food.push(generateFood());
}

// Create initial snake
function createSnake(x, y, color) {
    const segments = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
        segments.push({
            x: x - i * SEGMENT_SIZE,
            y: y
        });
    }
    return {
        segments,
        direction: { x: 1, y: 0 },
        speed: SPEED,
        color,
        boosting: false,
        score: INITIAL_SNAKE_LENGTH
    };
}

// Player colors
const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
];

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('joinGame', (data) => {
        const spawnX = Math.random() * (GAME_WIDTH - 200) + 100;
        const spawnY = Math.random() * (GAME_HEIGHT - 200) + 100;
        const color = COLORS[Object.keys(players).length % COLORS.length];

        players[socket.id] = {
            id: socket.id,
            name: data.name || 'Snake',
            ...createSnake(spawnX, spawnY, color),
            alive: true
        };

        socket.emit('gameState', {
            myId: socket.id,
            players,
            food
        });

        console.log(`${data.name} joined the game`);
    });

    socket.on('updateDirection', (data) => {
        if (players[socket.id] && players[socket.id].alive) {
            const player = players[socket.id];
            // Prevent 180-degree turns
            const newDir = data.direction;
            const currentDir = player.direction;
            
            if (Math.abs(newDir.x - currentDir.x) !== 2 && 
                Math.abs(newDir.y - currentDir.y) !== 2) {
                player.direction = newDir;
            }
        }
    });

    socket.on('updateBoost', (data) => {
        if (players[socket.id] && players[socket.id].alive) {
            players[socket.id].boosting = data.boosting;
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
    });
});

// Game loop
let tickCount = 0;
setInterval(() => {
    tickCount++;
    
    // Update all snakes
    for (const id in players) {
        const player = players[id];
        if (!player.alive) continue;

        // Calculate speed
        const speed = player.boosting ? SPEED * BOOST_MULTIPLIER : SPEED;

        // Calculate new head position
        const head = player.segments[0];
        const newHead = {
            x: head.x + player.direction.x * speed,
            y: head.y + player.direction.y * speed
        };

        // Wrap around edges
        if (newHead.x < 0) newHead.x = GAME_WIDTH;
        if (newHead.x > GAME_WIDTH) newHead.x = 0;
        if (newHead.y < 0) newHead.y = GAME_HEIGHT;
        if (newHead.y > GAME_HEIGHT) newHead.y = 0;

        // Add new head
        player.segments.unshift(newHead);

        // Check food collision
        let ate = false;
        for (let i = food.length - 1; i >= 0; i--) {
            const f = food[i];
            const dist = Math.hypot(newHead.x - f.x, newHead.y - f.y);
            if (dist < SEGMENT_SIZE) {
                food.splice(i, 1);
                food.push(generateFood());
                ate = true;
                player.score += f.value;
                break;
            }
        }

        // Remove tail if not eating
        if (!ate) {
            // If boosting, shrink faster
            if (player.boosting && player.segments.length > INITIAL_SNAKE_LENGTH) {
                player.segments.pop();
                player.score = Math.max(INITIAL_SNAKE_LENGTH, player.score - 0.5);
            }
            player.segments.pop();
        }

        // Check self collision (skip more segments to allow tight turns)
        const skipSegments = Math.max(10, Math.floor(player.segments.length * 0.1));
        for (let i = skipSegments; i < player.segments.length; i++) {
            const segment = player.segments[i];
            const dist = Math.hypot(newHead.x - segment.x, newHead.y - segment.y);
            if (dist < SEGMENT_SIZE * 0.6) {
                player.alive = false;
                // Drop food where snake died
                for (let j = 0; j < Math.min(player.segments.length, 20); j++) {
                    const seg = player.segments[j * Math.floor(player.segments.length / 20)];
                    food.push({
                        x: seg.x + (Math.random() - 0.5) * 20,
                        y: seg.y + (Math.random() - 0.5) * 20,
                        value: 2,
                        id: Math.random().toString(36).substr(2, 9)
                    });
                }
                break;
            }
        }

        // Check collision with other snakes
        if (player.alive) {
            for (const otherId in players) {
                if (otherId === id) continue;
                const other = players[otherId];
                if (!other.alive) continue;

                // Check collision with other snake's body (skip head to allow crossing)
                for (let i = 3; i < other.segments.length; i++) {
                    const segment = other.segments[i];
                    const dist = Math.hypot(newHead.x - segment.x, newHead.y - segment.y);
                    if (dist < SEGMENT_SIZE * 0.7) {
                        player.alive = false;
                        // Drop food
                        for (let j = 0; j < Math.min(player.segments.length, 20); j++) {
                            const seg = player.segments[j * Math.floor(player.segments.length / 20)];
                            food.push({
                                x: seg.x + (Math.random() - 0.5) * 20,
                                y: seg.y + (Math.random() - 0.5) * 20,
                                value: 2,
                                id: Math.random().toString(36).substr(2, 9)
                            });
                        }
                        break;
                    }
                }
            }
        }
    }

    // Remove dead players after 3 seconds
    for (const id in players) {
        if (!players[id].alive) {
            setTimeout(() => delete players[id], 3000);
        }
    }

    // Send updates to all clients only every 2 ticks (30 FPS instead of 60)
    if (tickCount % 2 === 0) {
        io.emit('gameState', {
            players,
            food
        });
    }

}, 1000 / 60); // 60 FPS physics, 30 FPS broadcasts

http.listen(PORT, () => {
    console.log(`Snake.io server running on port ${PORT}`);
});
