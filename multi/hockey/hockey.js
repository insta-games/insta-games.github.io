document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const p1ScoreEl = document.getElementById('p1Score');
    const p2ScoreEl = document.getElementById('p2Score');
    const resetBtn = document.getElementById('resetBtn');
    
    const WIDTH = 800;
    const HEIGHT = 600;
    const PADDLE_RADIUS = 30;
    const PUCK_RADIUS = 15;
    const GOAL_WIDTH = 150;
    const WIN_SCORE = 7;
    
    let gameState = 'playing'; // playing, scored, gameover
    let scoreTimer = 0;
    
    // Physics constants
    const FRICTION = 0.998; // Increased from 0.995 for even more slippery puck
    const PADDLE_SPEED = 6;
    const MAX_PUCK_SPEED = 15;
    const BOUNCE_DAMPING = 0.8;
    
    // Player 1 paddle (Cyan - left side)
    const player1 = {
        x: 150,
        y: HEIGHT / 2,
        radius: PADDLE_RADIUS,
        vx: 0,
        vy: 0,
        color: '#06b6d4',
        keys: { up: false, down: false, left: false, right: false },
        score: 0
    };
    
    // Player 2 paddle (Blue - right side)
    const player2 = {
        x: WIDTH - 150,
        y: HEIGHT / 2,
        radius: PADDLE_RADIUS,
        vx: 0,
        vy: 0,
        color: '#3b82f6',
        keys: { up: false, down: false, left: false, right: false },
        score: 0
    };
    
    // Puck
    const puck = {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        radius: PUCK_RADIUS,
        vx: 0,
        vy: 0,
        color: '#fbbf24'
    };
    
    // Goals
    const goals = {
        left: { x: 0, y: (HEIGHT - GOAL_WIDTH) / 2, width: 20, height: GOAL_WIDTH },
        right: { x: WIDTH - 20, y: (HEIGHT - GOAL_WIDTH) / 2, width: 20, height: GOAL_WIDTH }
    };
    
    function resetPuck() {
        puck.x = WIDTH / 2;
        puck.y = HEIGHT / 2;
        // Random initial velocity
        const angle = (Math.random() - 0.5) * Math.PI / 2;
        const speed = 5;
        puck.vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
        puck.vy = Math.sin(angle) * speed;
    }
    
    function updatePaddle(player) {
        if (gameState !== 'playing') return;
        
        // Movement
        let dx = 0;
        let dy = 0;
        
        if (player.keys.up) dy -= 1;
        if (player.keys.down) dy += 1;
        if (player.keys.left) dx -= 1;
        if (player.keys.right) dx += 1;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }
        
        // Update velocity
        player.vx = dx * PADDLE_SPEED;
        player.vy = dy * PADDLE_SPEED;
        
        // Move paddle
        player.x += player.vx;
        player.y += player.vy;
        
        // Keep paddle in bounds
        player.x = Math.max(player.radius, Math.min(WIDTH - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(HEIGHT - player.radius, player.y));
        
        // Keep paddles on their sides
        if (player === player1) {
            player.x = Math.min(player.x, WIDTH / 2 - player.radius);
        } else {
            player.x = Math.max(player.x, WIDTH / 2 + player.radius);
        }
    }
    
    function checkCircleCollision(c1, c2) {
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < c1.radius + c2.radius;
    }
    
    function handlePaddlePuckCollision(paddle, puck) {
        const dx = puck.x - paddle.x;
        const dy = puck.y - paddle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < paddle.radius + puck.radius) {
            // Normalize collision vector
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Relative velocity
            const dvx = puck.vx - paddle.vx;
            const dvy = puck.vy - paddle.vy;
            
            // Relative velocity in collision normal direction
            const dvn = dvx * nx + dvy * ny;
            
            // Do not resolve if velocities are separating
            if (dvn > 0) return;
            
            // Apply impulse
            const impulse = 2 * dvn / 2; // Equal mass
            puck.vx -= impulse * nx;
            puck.vy -= impulse * ny;
            
            // Add paddle velocity for more dynamic gameplay
            puck.vx += paddle.vx * 0.5;
            puck.vy += paddle.vy * 0.5;
            
            // Limit puck speed
            const speed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
            if (speed > MAX_PUCK_SPEED) {
                puck.vx = (puck.vx / speed) * MAX_PUCK_SPEED;
                puck.vy = (puck.vy / speed) * MAX_PUCK_SPEED;
            }
            
            // Separate objects
            const overlap = paddle.radius + puck.radius - distance;
            puck.x += nx * overlap;
            puck.y += ny * overlap;
        }
    }
    
    function updatePuck() {
        if (gameState !== 'playing') return;
        
        // Apply friction
        puck.vx *= FRICTION;
        puck.vy *= FRICTION;
        
        // Move puck
        puck.x += puck.vx;
        puck.y += puck.vy;
        
        // Wall collisions (top and bottom)
        if (puck.y - puck.radius < 0) {
            puck.y = puck.radius;
            puck.vy = -puck.vy * BOUNCE_DAMPING;
        }
        if (puck.y + puck.radius > HEIGHT) {
            puck.y = HEIGHT - puck.radius;
            puck.vy = -puck.vy * BOUNCE_DAMPING;
        }
        
        // Check goal scoring
        if (puck.x - puck.radius < 0) {
            // Check if in goal area
            if (puck.y > goals.left.y && puck.y < goals.left.y + goals.left.height) {
                // Player 2 scores
                player2.score++;
                gameState = 'scored';
                scoreTimer = 60;
                statusEl.textContent = 'Player 2 (Blue) scores! 🎉';
                statusEl.style.color = '#3b82f6';
                
                if (player2.score >= WIN_SCORE) {
                    gameState = 'gameover';
                    statusEl.textContent = '🏆 Player 2 (Blue) Wins!';
                }
            } else {
                puck.x = puck.radius;
                puck.vx = -puck.vx * BOUNCE_DAMPING;
            }
        }
        
        if (puck.x + puck.radius > WIDTH) {
            // Check if in goal area
            if (puck.y > goals.right.y && puck.y < goals.right.y + goals.right.height) {
                // Player 1 scores
                player1.score++;
                gameState = 'scored';
                scoreTimer = 60;
                statusEl.textContent = 'Player 1 (Cyan) scores! 🎉';
                statusEl.style.color = '#06b6d4';
                
                if (player1.score >= WIN_SCORE) {
                    gameState = 'gameover';
                    statusEl.textContent = '🏆 Player 1 (Cyan) Wins!';
                }
            } else {
                puck.x = WIDTH - puck.radius;
                puck.vx = -puck.vx * BOUNCE_DAMPING;
            }
        }
        
        // Paddle collisions
        handlePaddlePuckCollision(player1, puck);
        handlePaddlePuckCollision(player2, puck);
    }
    
    function update() {
        updatePaddle(player1);
        updatePaddle(player2);
        updatePuck();
        
        // Update score display
        p1ScoreEl.textContent = player1.score;
        p2ScoreEl.textContent = player2.score;
        
        // Handle scored state
        if (gameState === 'scored') {
            scoreTimer--;
            if (scoreTimer <= 0) {
                if (player1.score < WIN_SCORE && player2.score < WIN_SCORE) {
                    resetPuck();
                    gameState = 'playing';
                    statusEl.textContent = 'First to 7 goals wins!';
                    statusEl.style.color = '#06b6d4';
                }
            }
        }
    }
    
    function drawTable() {
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        gradient.addColorStop(0, '#1a1f35');
        gradient.addColorStop(1, '#0a0e1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        // Center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(WIDTH / 2, 0);
        ctx.lineTo(WIDTH / 2, HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Center circle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(WIDTH / 2, HEIGHT / 2, 80, 0, Math.PI * 2);
        ctx.stroke();
        
        // Goals
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.fillRect(goals.left.x, goals.left.y, goals.left.width, goals.left.height);
        ctx.fillRect(goals.right.x, goals.right.y, goals.right.width, goals.right.height);
        
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(goals.left.x, goals.left.y, goals.left.width, goals.left.height);
        ctx.strokeRect(goals.right.x, goals.right.y, goals.right.width, goals.right.height);
        
        // Corner circles
        const cornerRadius = 50;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        
        // Top left
        ctx.beginPath();
        ctx.arc(0, 0, cornerRadius, 0, Math.PI / 2);
        ctx.stroke();
        
        // Top right
        ctx.beginPath();
        ctx.arc(WIDTH, 0, cornerRadius, Math.PI / 2, Math.PI);
        ctx.stroke();
        
        // Bottom left
        ctx.beginPath();
        ctx.arc(0, HEIGHT, cornerRadius, -Math.PI / 2, 0);
        ctx.stroke();
        
        // Bottom right
        ctx.beginPath();
        ctx.arc(WIDTH, HEIGHT, cornerRadius, Math.PI, Math.PI * 1.5);
        ctx.stroke();
    }
    
    function drawPaddle(player) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(player.x + 3, player.y + 3, player.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Paddle
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner circle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    function drawPuck() {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(puck.x + 2, puck.y + 2, puck.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Puck
        ctx.fillStyle = puck.color;
        ctx.beginPath();
        ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(puck.x - 3, puck.y - 3, puck.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Motion trail
        if (Math.abs(puck.vx) > 1 || Math.abs(puck.vy) > 1) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = puck.color;
            for (let i = 1; i <= 3; i++) {
                ctx.beginPath();
                ctx.arc(puck.x - puck.vx * i, puck.y - puck.vy * i, puck.radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }
    
    function draw() {
        drawTable();
        drawPuck();
        drawPaddle(player1);
        drawPaddle(player2);
    }
    
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    function resetGame() {
        gameState = 'playing';
        statusEl.textContent = 'First to 7 goals wins!';
        statusEl.style.color = '#06b6d4';
        
        player1.x = 150;
        player1.y = HEIGHT / 2;
        player1.vx = 0;
        player1.vy = 0;
        player1.score = 0;
        
        player2.x = WIDTH - 150;
        player2.y = HEIGHT / 2;
        player2.vx = 0;
        player2.vy = 0;
        player2.score = 0;
        
        resetPuck();
    }
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        // Player 1 controls
        if (e.key === 'w' || e.key === 'W') player1.keys.up = true;
        if (e.key === 's' || e.key === 'S') player1.keys.down = true;
        if (e.key === 'a' || e.key === 'A') player1.keys.left = true;
        if (e.key === 'd' || e.key === 'D') player1.keys.right = true;
        
        // Player 2 controls
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            player2.keys.up = true;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            player2.keys.down = true;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            player2.keys.left = true;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            player2.keys.right = true;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        // Player 1 controls
        if (e.key === 'w' || e.key === 'W') player1.keys.up = false;
        if (e.key === 's' || e.key === 'S') player1.keys.down = false;
        if (e.key === 'a' || e.key === 'A') player1.keys.left = false;
        if (e.key === 'd' || e.key === 'D') player1.keys.right = false;
        
        // Player 2 controls
        if (e.key === 'ArrowUp') player2.keys.up = false;
        if (e.key === 'ArrowDown') player2.keys.down = false;
        if (e.key === 'ArrowLeft') player2.keys.left = false;
        if (e.key === 'ArrowRight') player2.keys.right = false;
    });
    
    resetBtn.addEventListener('click', resetGame);
    
    // Start game
    resetPuck();
    gameLoop();
});
