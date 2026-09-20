document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const p1ScoreEl = document.getElementById('p1Score');
    const p2ScoreEl = document.getElementById('p2Score');
    const resetBtn = document.getElementById('resetBtn');
    
    const WIDTH = 800;
    const HEIGHT = 600;
    const PADDLE_WIDTH = 15;
    const PADDLE_HEIGHT = 100;
    const BALL_SIZE = 15;
    const WIN_SCORE = 7;
    
    let gameState = 'playing'; // playing, scored, gameover
    let scoreTimer = 0;
    
    // Players
    const player1 = {
        x: 30,
        y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        speed: 0,
        maxSpeed: 7,
        color: '#06b6d4',
        score: 0,
        keys: { up: false, down: false },
        powerup: null,
        powerupTimer: 0
    };
    
    const player2 = {
        x: WIDTH - 30 - PADDLE_WIDTH,
        y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        speed: 0,
        maxSpeed: 7,
        color: '#3b82f6',
        score: 0,
        keys: { up: false, down: false },
        powerup: null,
        powerupTimer: 0
    };
    
    // Ball
    const ball = {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        size: BALL_SIZE,
        vx: 5,
        vy: 3,
        speed: 5,
        color: '#fbbf24'
    };
    
    // Obstacles
    let obstacles = [];
    let obstacleTimer = 0;
    const OBSTACLE_INTERVAL = 300;
    
    // Power-ups
    let powerups = [];
    let powerupTimer = 0;
    const POWERUP_INTERVAL = 400;
    
    function createObstacle() {
        const height = 40 + Math.random() * 60;
        const y = Math.random() * (HEIGHT - height);
        obstacles.push({
            x: WIDTH / 2 - 10,
            y: y,
            width: 20,
            height: height
        });
    }
    
    function createPowerup() {
        const types = ['big', 'fast', 'slow'];
        const type = types[Math.floor(Math.random() * types.length)];
        powerups.push({
            x: WIDTH / 4 + Math.random() * (WIDTH / 2),
            y: HEIGHT / 4 + Math.random() * (HEIGHT / 2),
            size: 25,
            type: type
        });
    }
    
    function resetBall() {
        ball.x = WIDTH / 2;
        ball.y = HEIGHT / 2;
        const angle = (Math.random() - 0.5) * Math.PI / 3;
        const direction = ball.vx > 0 ? 1 : -1;
        ball.vx = Math.cos(angle) * ball.speed * direction;
        ball.vy = Math.sin(angle) * ball.speed;
    }
    
    function updatePaddle(player) {
        if (player.keys.up) player.speed = -player.maxSpeed;
        else if (player.keys.down) player.speed = player.maxSpeed;
        else player.speed = 0;
        
        player.y += player.speed;
        player.y = Math.max(0, Math.min(HEIGHT - player.height, player.y));
        
        // Update powerup
        if (player.powerupTimer > 0) {
            player.powerupTimer--;
            if (player.powerupTimer === 0) {
                player.powerup = null;
                player.height = PADDLE_HEIGHT;
                player.maxSpeed = 7;
            }
        }
    }
    
    function checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    function update() {
        if (gameState === 'scored') {
            scoreTimer--;
            if (scoreTimer <= 0) {
                if (player1.score >= WIN_SCORE || player2.score >= WIN_SCORE) {
                    gameState = 'gameover';
                    const winner = player1.score >= WIN_SCORE ? 'Player 1 (Cyan)' : 'Player 2 (Blue)';
                    statusEl.textContent = `🏆 ${winner} Wins!`;
                    statusEl.style.color = player1.score >= WIN_SCORE ? '#06b6d4' : '#3b82f6';
                } else {
                    gameState = 'playing';
                    statusEl.textContent = 'Play!';
                    resetBall();
                }
            }
            return;
        }
        
        if (gameState !== 'playing') return;
        
        updatePaddle(player1);
        updatePaddle(player2);
        
        // Move ball
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Wall collision
        if (ball.y - ball.size / 2 < 0 || ball.y + ball.size / 2 > HEIGHT) {
            ball.vy = -ball.vy;
            ball.y = ball.y < HEIGHT / 2 ? ball.size / 2 : HEIGHT - ball.size / 2;
        }
        
        // Paddle collision
        const ballRect = { x: ball.x - ball.size / 2, y: ball.y - ball.size / 2, width: ball.size, height: ball.size };
        
        if (checkCollision(ballRect, player1)) {
            ball.vx = Math.abs(ball.vx);
            ball.x = player1.x + player1.width + ball.size / 2;
            const hitPos = (ball.y - player1.y) / player1.height - 0.5;
            ball.vy = hitPos * 10;
        }
        
        if (checkCollision(ballRect, player2)) {
            ball.vx = -Math.abs(ball.vx);
            ball.x = player2.x - ball.size / 2;
            const hitPos = (ball.y - player2.y) / player2.height - 0.5;
            ball.vy = hitPos * 10;
        }
        
        // Obstacle collision
        for (const obs of obstacles) {
            if (checkCollision(ballRect, obs)) {
                // Determine which side of the obstacle was hit
                const ballCenterX = ball.x;
                const obsCenterX = obs.x + obs.width / 2;
                
                // Reverse direction and push ball out of obstacle
                if (ballCenterX < obsCenterX) {
                    ball.vx = -Math.abs(ball.vx);
                    ball.x = obs.x - ball.size / 2;
                } else {
                    ball.vx = Math.abs(ball.vx);
                    ball.x = obs.x + obs.width + ball.size / 2;
                }
            }
        }
        
        // Power-up collision
        for (let i = powerups.length - 1; i >= 0; i--) {
            const powerup = powerups[i];
            const powerupRect = { x: powerup.x - powerup.size / 2, y: powerup.y - powerup.size / 2, 
                                 width: powerup.size, height: powerup.size };
            
            if (checkCollision(ballRect, powerupRect)) {
                powerups.splice(i, 1);
                // Apply to paddle that hit it last
                const targetPlayer = ball.vx > 0 ? player1 : player2;
                targetPlayer.powerup = powerup.type;
                targetPlayer.powerupTimer = 300;
                
                if (powerup.type === 'big') {
                    targetPlayer.height = PADDLE_HEIGHT * 1.5;
                } else if (powerup.type === 'fast') {
                    targetPlayer.maxSpeed = 10;
                } else if (powerup.type === 'slow') {
                    const otherPlayer = targetPlayer === player1 ? player2 : player1;
                    otherPlayer.maxSpeed = 4;
                    otherPlayer.powerupTimer = 300;
                }
            }
        }
        
        // Spawn obstacles
        obstacleTimer++;
        if (obstacleTimer >= OBSTACLE_INTERVAL) {
            createObstacle();
            obstacleTimer = 0;
        }
        
        // Spawn powerups
        powerupTimer++;
        if (powerupTimer >= POWERUP_INTERVAL && powerups.length < 2) {
            createPowerup();
            powerupTimer = 0;
        }
        
        // Score
        if (ball.x < 0) {
            player2.score++;
            p2ScoreEl.textContent = player2.score;
            gameState = 'scored';
            scoreTimer = 60;
            statusEl.textContent = 'Player 2 scores!';
            statusEl.style.color = '#3b82f6';
            obstacles = [];
            powerups = [];
        } else if (ball.x > WIDTH) {
            player1.score++;
            p1ScoreEl.textContent = player1.score;
            gameState = 'scored';
            scoreTimer = 60;
            statusEl.textContent = 'Player 1 scores!';
            statusEl.style.color = '#06b6d4';
            obstacles = [];
            powerups = [];
        }
    }
    
    function draw() {
        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        gradient.addColorStop(0, '#1a1f35');
        gradient.addColorStop(1, '#0a0e1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        // Center line
        ctx.setLineDash([20, 15]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(WIDTH / 2, 0);
        ctx.lineTo(WIDTH / 2, HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Paddles
        ctx.fillStyle = player1.color;
        ctx.fillRect(player1.x, player1.y, player1.width, player1.height);
        if (player1.powerup) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            ctx.strokeRect(player1.x - 2, player1.y - 2, player1.width + 4, player1.height + 4);
        }
        
        ctx.fillStyle = player2.color;
        ctx.fillRect(player2.x, player2.y, player2.width, player2.height);
        if (player2.powerup) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            ctx.strokeRect(player2.x - 2, player2.y - 2, player2.width + 4, player2.height + 4);
        }
        
        // Ball
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Ball trail
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(ball.x - ball.vx * 2, ball.y - ball.vy * 2, ball.size / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Obstacles
        ctx.fillStyle = '#ef4444';
        obstacles.forEach(obs => {
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.strokeStyle = '#fca5a5';
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        });
        
        // Power-ups
        powerups.forEach(powerup => {
            ctx.fillStyle = powerup.type === 'big' ? '#10b981' : 
                           powerup.type === 'fast' ? '#f59e0b' : '#a855f7';
            ctx.beginPath();
            ctx.arc(powerup.x, powerup.y, powerup.size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(powerup.type === 'big' ? '↕' : powerup.type === 'fast' ? '⚡' : '❄', 
                        powerup.x, powerup.y + 5);
        });
    }
    
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    function resetGame() {
        player1.score = 0;
        player2.score = 0;
        player1.y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
        player2.y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
        player1.height = PADDLE_HEIGHT;
        player2.height = PADDLE_HEIGHT;
        player1.maxSpeed = 7;
        player2.maxSpeed = 7;
        player1.powerup = null;
        player2.powerup = null;
        p1ScoreEl.textContent = '0';
        p2ScoreEl.textContent = '0';
        obstacles = [];
        powerups = [];
        gameState = 'playing';
        statusEl.textContent = 'First to 7 wins!';
        statusEl.style.color = '#06b6d4';
        resetBall();
    }
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'w' || e.key === 'W') player1.keys.up = true;
        if (e.key === 's' || e.key === 'S') player1.keys.down = true;
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            player2.keys.up = true;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            player2.keys.down = true;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === 'w' || e.key === 'W') player1.keys.up = false;
        if (e.key === 's' || e.key === 'S') player1.keys.down = false;
        if (e.key === 'ArrowUp') player2.keys.up = false;
        if (e.key === 'ArrowDown') player2.keys.down = false;
    });
    
    // Touch controls
    let touchActive = {
        p1Up: false,
        p1Down: false,
        p2Up: false,
        p2Down: false
    };
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouch(e.touches);
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        handleTouch(e.touches);
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        // Reset all touch states when no touches remain
        if (e.touches.length === 0) {
            touchActive.p1Up = false;
            touchActive.p1Down = false;
            touchActive.p2Up = false;
            touchActive.p2Down = false;
            player1.keys.up = false;
            player1.keys.down = false;
            player2.keys.up = false;
            player2.keys.down = false;
        } else {
            handleTouch(e.touches);
        }
    });
    
    function handleTouch(touches) {
        // Reset touch states
        touchActive.p1Up = false;
        touchActive.p1Down = false;
        touchActive.p2Up = false;
        touchActive.p2Down = false;
        
        for (let touch of touches) {
            const rect = canvas.getBoundingClientRect();
            const x = (touch.clientX - rect.left) * (WIDTH / rect.width);
            const y = (touch.clientY - rect.top) * (HEIGHT / rect.height);
            
            // Left side controls (Player 1)
            if (x < WIDTH / 4) {
                if (y < HEIGHT / 2) {
                    touchActive.p1Up = true;
                } else {
                    touchActive.p1Down = true;
                }
            }
            // Right side controls (Player 2)
            else if (x > WIDTH * 3 / 4) {
                if (y < HEIGHT / 2) {
                    touchActive.p2Up = true;
                } else {
                    touchActive.p2Down = true;
                }
            }
        }
        
        // Apply touch states to player keys
        player1.keys.up = touchActive.p1Up;
        player1.keys.down = touchActive.p1Down;
        player2.keys.up = touchActive.p2Up;
        player2.keys.down = touchActive.p2Down;
    }
    
    resetBtn.addEventListener('click', resetGame);
    
    // Start
    resetGame();
    gameLoop();
});
