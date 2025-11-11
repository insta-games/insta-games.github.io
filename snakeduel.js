document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const resetBtn = document.getElementById('resetBtn');
    
    const GRID_SIZE = 20;
    const TILE_COUNT = 30;
    const TILE_SIZE = canvas.width / TILE_COUNT;
    
    let gameState = 'ready'; // ready, playing, gameover
    let winner = null;
    
    // Player 1 (Cyan)
    const player1 = {
        snake: [{ x: 7, y: 15 }],
        direction: { x: 1, y: 0 },
        nextDirection: { x: 1, y: 0 },
        color: '#06b6d4',
        alive: true,
        name: 'Player 1 (Cyan)'
    };
    
    // Player 2 (Blue)
    const player2 = {
        snake: [{ x: 22, y: 15 }],
        direction: { x: -1, y: 0 },
        nextDirection: { x: -1, y: 0 },
        color: '#3b82f6',
        alive: true,
        name: 'Player 2 (Blue)'
    };
    
    // Food
    let food = { x: 15, y: 15 };
    
    function placeFood() {
        let validPosition = false;
        while (!validPosition) {
            food.x = Math.floor(Math.random() * TILE_COUNT);
            food.y = Math.floor(Math.random() * TILE_COUNT);
            
            // Check if food is on any snake
            validPosition = true;
            for (const segment of player1.snake) {
                if (segment.x === food.x && segment.y === food.y) {
                    validPosition = false;
                    break;
                }
            }
            if (validPosition) {
                for (const segment of player2.snake) {
                    if (segment.x === food.x && segment.y === food.y) {
                        validPosition = false;
                        break;
                    }
                }
            }
        }
    }
    
    function updateSnake(player) {
        if (!player.alive) return;
        
        // Update direction
        player.direction = player.nextDirection;
        
        // Calculate new head position
        const head = { ...player.snake[0] };
        head.x += player.direction.x;
        head.y += player.direction.y;
        
        // Check wall collision
        if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
            player.alive = false;
            return;
        }
        
        // Check self collision
        for (const segment of player.snake) {
            if (head.x === segment.x && head.y === segment.y) {
                player.alive = false;
                return;
            }
        }
        
        // Check collision with other player
        const otherPlayer = player === player1 ? player2 : player1;
        for (const segment of otherPlayer.snake) {
            if (head.x === segment.x && head.y === segment.y) {
                player.alive = false;
                return;
            }
        }
        
        // Add new head
        player.snake.unshift(head);
        
        // Check food collision
        if (head.x === food.x && head.y === food.y) {
            placeFood();
        } else {
            // Remove tail if no food eaten
            player.snake.pop();
        }
    }
    
    function update() {
        if (gameState !== 'playing') return;
        
        updateSnake(player1);
        updateSnake(player2);
        
        // Check game over
        if (!player1.alive || !player2.alive) {
            gameState = 'gameover';
            if (!player1.alive && !player2.alive) {
                statusEl.textContent = '🏁 It\'s a Tie!';
                statusEl.style.color = '#f59e0b';
            } else if (!player1.alive) {
                statusEl.textContent = '🏆 Player 2 (Blue) Wins!';
                statusEl.style.color = '#3b82f6';
            } else {
                statusEl.textContent = '🏆 Player 1 (Cyan) Wins!';
                statusEl.style.color = '#06b6d4';
            }
        }
    }
    
    function drawGrid() {
        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a1f35');
        gradient.addColorStop(1, '#0a0e1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= TILE_COUNT; i++) {
            ctx.beginPath();
            ctx.moveTo(i * TILE_SIZE, 0);
            ctx.lineTo(i * TILE_SIZE, canvas.height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i * TILE_SIZE);
            ctx.lineTo(canvas.width, i * TILE_SIZE);
            ctx.stroke();
        }
    }
    
    function drawSnake(player) {
        player.snake.forEach((segment, index) => {
            ctx.fillStyle = player.color;
            if (index === 0) {
                // Head is slightly brighter
                ctx.globalAlpha = 1;
            } else {
                ctx.globalAlpha = 0.8;
            }
            
            ctx.fillRect(
                segment.x * TILE_SIZE + 1,
                segment.y * TILE_SIZE + 1,
                TILE_SIZE - 2,
                TILE_SIZE - 2
            );
            
            // Draw eyes on head
            if (index === 0) {
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 1;
                const eyeSize = TILE_SIZE / 6;
                const eyeOffset = TILE_SIZE / 4;
                
                if (player.direction.y === 0) {
                    // Horizontal
                    ctx.fillRect(segment.x * TILE_SIZE + eyeOffset, segment.y * TILE_SIZE + eyeOffset, eyeSize, eyeSize);
                    ctx.fillRect(segment.x * TILE_SIZE + eyeOffset, segment.y * TILE_SIZE + TILE_SIZE - eyeOffset - eyeSize, eyeSize, eyeSize);
                } else {
                    // Vertical
                    ctx.fillRect(segment.x * TILE_SIZE + eyeOffset, segment.y * TILE_SIZE + eyeOffset, eyeSize, eyeSize);
                    ctx.fillRect(segment.x * TILE_SIZE + TILE_SIZE - eyeOffset - eyeSize, segment.y * TILE_SIZE + eyeOffset, eyeSize, eyeSize);
                }
            }
        });
        ctx.globalAlpha = 1;
    }
    
    function drawFood() {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(
            food.x * TILE_SIZE + TILE_SIZE / 2,
            food.y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Shine effect
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(
            food.x * TILE_SIZE + TILE_SIZE / 2 - 3,
            food.y * TILE_SIZE + TILE_SIZE / 2 - 3,
            TILE_SIZE / 6,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
    
    function draw() {
        drawGrid();
        drawFood();
        drawSnake(player1);
        drawSnake(player2);
        
        // Draw scores
        ctx.fillStyle = player1.color;
        ctx.font = 'bold 16px Inter';
        ctx.fillText(`P1: ${player1.snake.length}`, 10, 25);
        
        ctx.fillStyle = player2.color;
        ctx.fillText(`P2: ${player2.snake.length}`, canvas.width - 70, 25);
    }
    
    let lastUpdate = 0;
    const updateInterval = 100; // ms
    
    function gameLoop(timestamp) {
        if (timestamp - lastUpdate > updateInterval) {
            update();
            draw();
            lastUpdate = timestamp;
        }
        requestAnimationFrame(gameLoop);
    }
    
    function startGame() {
        gameState = 'playing';
        statusEl.textContent = 'Eat food and avoid collisions!';
        statusEl.style.color = '#06b6d4';
        
        player1.snake = [{ x: 7, y: 15 }];
        player1.direction = { x: 1, y: 0 };
        player1.nextDirection = { x: 1, y: 0 };
        player1.alive = true;
        
        player2.snake = [{ x: 22, y: 15 }];
        player2.direction = { x: -1, y: 0 };
        player2.nextDirection = { x: -1, y: 0 };
        player2.alive = true;
        
        placeFood();
    }
    
    function resetGame() {
        gameState = 'ready';
        statusEl.textContent = 'Press SPACE to Start!';
        statusEl.style.color = '#06b6d4';
        
        player1.snake = [{ x: 7, y: 15 }];
        player1.direction = { x: 1, y: 0 };
        player1.nextDirection = { x: 1, y: 0 };
        player1.alive = true;
        
        player2.snake = [{ x: 22, y: 15 }];
        player2.direction = { x: -1, y: 0 };
        player2.nextDirection = { x: -1, y: 0 };
        player2.alive = true;
        
        food = { x: 15, y: 15 };
        draw();
    }
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' && gameState !== 'playing') {
            e.preventDefault();
            startGame();
            return;
        }
        
        // Player 1 controls (WASD)
        if (e.key === 'w' || e.key === 'W') {
            if (player1.direction.y === 0) {
                player1.nextDirection = { x: 0, y: -1 };
            }
        }
        if (e.key === 's' || e.key === 'S') {
            if (player1.direction.y === 0) {
                player1.nextDirection = { x: 0, y: 1 };
            }
        }
        if (e.key === 'a' || e.key === 'A') {
            if (player1.direction.x === 0) {
                player1.nextDirection = { x: -1, y: 0 };
            }
        }
        if (e.key === 'd' || e.key === 'D') {
            if (player1.direction.x === 0) {
                player1.nextDirection = { x: 1, y: 0 };
            }
        }
        
        // Player 2 controls (Arrow keys)
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (player2.direction.y === 0) {
                player2.nextDirection = { x: 0, y: -1 };
            }
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (player2.direction.y === 0) {
                player2.nextDirection = { x: 0, y: 1 };
            }
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (player2.direction.x === 0) {
                player2.nextDirection = { x: -1, y: 0 };
            }
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (player2.direction.x === 0) {
                player2.nextDirection = { x: 1, y: 0 };
            }
        }
    });
    
    resetBtn.addEventListener('click', resetGame);
    
    // Initialize
    resetGame();
    gameLoop(0);
});
