document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const p1ScoreEl = document.getElementById('p1Score');
    const p2ScoreEl = document.getElementById('p2Score');
    const resetBtn = document.getElementById('resetBtn');
    
    const WIDTH = 800;
    const HEIGHT = 600;
    const TANK_SIZE = 30;
    const BULLET_SIZE = 8;
    const BULLET_SPEED = 10;
    const TANK_SPEED = 3;
    const FIRE_COOLDOWN = 30;
    const WIN_SCORE = 5;
    
    let gameState = 'playing'; // playing, gameover
    
    // Player 1 (Cyan)
    const player1 = {
        x: 50,
        y: 100,
        width: TANK_SIZE,
        height: TANK_SIZE,
        angle: 0,
        color: '#06b6d4',
        speed: TANK_SPEED,
        keys: { up: false, down: false, left: false, right: false, fire: false },
        bullets: [],
        cooldown: 0,
        kills: 0,
        health: 3
    };
    
    // Player 2 (Blue)
    const player2 = {
        x: WIDTH - 80,
        y: HEIGHT - 100,
        width: TANK_SIZE,
        height: TANK_SIZE,
        angle: Math.PI,
        color: '#3b82f6',
        speed: TANK_SPEED,
        keys: { up: false, down: false, left: false, right: false, fire: false },
        bullets: [],
        cooldown: 0,
        kills: 0,
        health: 3
    };
    
    // Walls
    const walls = [
        { x: 200, y: 100, width: 100, height: 20 },
        { x: 500, y: 100, width: 100, height: 20 },
        { x: 350, y: 200, width: 20, height: 100 },
        { x: 450, y: 200, width: 20, height: 100 },
        { x: 200, y: 480, width: 100, height: 20 },
        { x: 500, y: 480, width: 100, height: 20 },
        { x: 100, y: 300, width: 150, height: 20 },
        { x: 550, y: 300, width: 150, height: 20 }
    ];
    
    // Power-ups
    let powerups = [];
    let powerupTimer = 0;
    const POWERUP_INTERVAL = 300;
    
    function createPowerup() {
        const types = ['health', 'rapid'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let x, y, valid;
        do {
            x = Math.random() * (WIDTH - 40) + 20;
            y = Math.random() * (HEIGHT - 40) + 20;
            valid = true;
            
            // Check collision with walls
            for (const wall of walls) {
                if (x < wall.x + wall.width && x + 20 > wall.x &&
                    y < wall.y + wall.height && y + 20 > wall.y) {
                    valid = false;
                    break;
                }
            }
        } while (!valid);
        
        powerups.push({ x, y, width: 25, height: 25, type });
    }
    
    function checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    function updatePlayer(player, opponent) {
        if (gameState !== 'playing') return;
        
        // Tank-style rotation
        const rotationSpeed = 0.05;
        if (player.keys.left) {
            player.angle -= rotationSpeed;
        }
        if (player.keys.right) {
            player.angle += rotationSpeed;
        }
        
        // Tank-style forward/backward movement
        let moveDirection = 0;
        if (player.keys.up) moveDirection = 1;
        if (player.keys.down) moveDirection = -1;
        
        // Apply movement if there is any
        if (moveDirection !== 0) {
            const dx = Math.cos(player.angle) * moveDirection * player.speed;
            const dy = Math.sin(player.angle) * moveDirection * player.speed;
            
            // Store old position
            const oldX = player.x;
            const oldY = player.y;
            
            // Try moving in both directions
            player.x += dx;
            player.y += dy;
            
            // Check boundaries and wall collisions
            let collisionX = player.x < 0 || player.x + player.width > WIDTH;
            let collisionY = player.y < 0 || player.y + player.height > HEIGHT;
            
            // Check wall collisions
            for (const wall of walls) {
                if (checkCollision({ x: player.x, y: player.y, width: player.width, height: player.height }, wall)) {
                    // Try sliding along wall by reverting only one axis at a time
                    player.x = oldX;
                    if (!checkCollision({ x: player.x, y: player.y, width: player.width, height: player.height }, wall)) {
                        // Can slide horizontally
                        collisionY = true;
                    } else {
                        // Try reverting Y instead
                        player.x = oldX + dx;
                        player.y = oldY;
                        if (!checkCollision({ x: player.x, y: player.y, width: player.width, height: player.height }, wall)) {
                            // Can slide vertically
                            collisionX = true;
                        } else {
                            // Can't slide, revert both
                            player.x = oldX;
                            player.y = oldY;
                            collisionX = true;
                            collisionY = true;
                        }
                    }
                    break;
                }
            }
            
            // Handle boundary collisions
            if (collisionX && (player.x < 0 || player.x + player.width > WIDTH)) {
                player.x = oldX;
            }
            if (collisionY && (player.y < 0 || player.y + player.height > HEIGHT)) {
                player.y = oldY;
            }
        }
        
        // Cooldown
        if (player.cooldown > 0) player.cooldown--;
        
        // Fire bullet
        if (player.keys.fire && player.cooldown === 0) {
            const bulletX = player.x + player.width / 2;
            const bulletY = player.y + player.height / 2;
            player.bullets.push({
                x: bulletX,
                y: bulletY,
                width: BULLET_SIZE,
                height: BULLET_SIZE,
                dx: Math.cos(player.angle) * BULLET_SPEED,
                dy: Math.sin(player.angle) * BULLET_SPEED
            });
            player.cooldown = FIRE_COOLDOWN;
        }
        
        // Update bullets
        for (let i = player.bullets.length - 1; i >= 0; i--) {
            const bullet = player.bullets[i];
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;
            
            // Remove if out of bounds
            if (bullet.x < 0 || bullet.x > WIDTH || bullet.y < 0 || bullet.y > HEIGHT) {
                player.bullets.splice(i, 1);
                continue;
            }
            
            // Check wall collision
            let hitWall = false;
            for (const wall of walls) {
                if (checkCollision(bullet, wall)) {
                    player.bullets.splice(i, 1);
                    hitWall = true;
                    break;
                }
            }
            if (hitWall) continue;
            
            // Check hit opponent
            if (checkCollision(bullet, opponent)) {
                player.bullets.splice(i, 1);
                opponent.health--;
                
                if (opponent.health <= 0) {
                    player.kills++;
                    respawnPlayer(opponent);
                    
                    if (player.kills >= WIN_SCORE) {
                        gameState = 'gameover';
                        const winner = player === player1 ? 'Player 1 (Cyan)' : 'Player 2 (Blue)';
                        statusEl.textContent = `🏆 ${winner} Wins!`;
                        statusEl.style.color = player.color;
                    }
                }
            }
        }
        
        // Check powerup collection
        for (let i = powerups.length - 1; i >= 0; i--) {
            if (checkCollision(player, powerups[i])) {
                const powerup = powerups[i];
                if (powerup.type === 'health') {
                    player.health = Math.min(player.health + 1, 3);
                } else if (powerup.type === 'rapid') {
                    player.rapidFire = 90; // 3 seconds
                }
                powerups.splice(i, 1);
            }
        }
        
        // Rapid fire effect
        if (player.rapidFire) {
            player.rapidFire--;
            if (player.rapidFire === 0) {
                // Reset
            }
        }
    }
    
    function respawnPlayer(player) {
        if (player === player1) {
            player.x = 50;
            player.y = 100;
        } else {
            player.x = WIDTH - 80;
            player.y = HEIGHT - 100;
        }
        player.health = 3;
        player.bullets = [];
    }
    
    function update() {
        updatePlayer(player1, player2);
        updatePlayer(player2, player1);
        
        // Update powerups
        powerupTimer++;
        if (powerupTimer >= POWERUP_INTERVAL && powerups.length < 2) {
            createPowerup();
            powerupTimer = 0;
        }
        
        // Update scores
        p1ScoreEl.textContent = `Player 1: ${player1.kills}`;
        p2ScoreEl.textContent = `Player 2: ${player2.kills}`;
    }
    
    function drawTank(player) {
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        ctx.rotate(player.angle);
        
        // Tank body
        ctx.fillStyle = player.color;
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        
        // Tank turret
        ctx.fillStyle = player.color;
        ctx.fillRect(0, -8, 20, 16);
        
        // Tank tracks
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-player.width / 2, -player.height / 2 - 5, player.width, 5);
        ctx.fillRect(-player.width / 2, player.height / 2, player.width, 5);
        
        ctx.restore();
        
        // Health bar
        const barWidth = player.width;
        const barHeight = 5;
        const healthPercent = player.health / 3;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(player.x, player.y - 10, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#10b981' : healthPercent > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(player.x, player.y - 10, barWidth * healthPercent, barHeight);
        
        // Rapid fire indicator
        if (player.rapidFire) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = '12px Inter';
            ctx.fillText('⚡', player.x + player.width / 2 - 5, player.y - 15);
        }
    }
    
    function drawBullets(player) {
        ctx.fillStyle = player.color;
        player.bullets.forEach(bullet => {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, BULLET_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Bullet trail
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(bullet.x - bullet.dx * 0.5, bullet.y - bullet.dy * 0.5, BULLET_SIZE / 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }
    
    function drawWalls() {
        ctx.fillStyle = '#374151';
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 2;
        
        walls.forEach(wall => {
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
            ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
        });
    }
    
    function drawPowerups() {
        powerups.forEach(powerup => {
            if (powerup.type === 'health') {
                ctx.fillStyle = '#10b981';
                ctx.fillRect(powerup.x, powerup.y, powerup.width, powerup.height);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px Arial';
                ctx.fillText('❤', powerup.x + 5, powerup.y + 18);
            } else if (powerup.type === 'rapid') {
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(powerup.x, powerup.y, powerup.width, powerup.height);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px Arial';
                ctx.fillText('⚡', powerup.x + 5, powerup.y + 18);
            }
        });
    }
    
    function draw() {
        // Clear canvas with background
        const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        gradient.addColorStop(0, '#1a1f35');
        gradient.addColorStop(1, '#0a0e1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < WIDTH; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, HEIGHT);
            ctx.stroke();
        }
        for (let i = 0; i < HEIGHT; i += 40) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(WIDTH, i);
            ctx.stroke();
        }
        
        drawWalls();
        drawPowerups();
        drawBullets(player1);
        drawBullets(player2);
        drawTank(player1);
        drawTank(player2);
    }
    
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    function resetGame() {
        gameState = 'playing';
        statusEl.textContent = 'First to 5 kills wins!';
        statusEl.style.color = '#06b6d4';
        
        player1.x = 50;
        player1.y = 100;
        player1.kills = 0;
        player1.health = 3;
        player1.bullets = [];
        player1.angle = 0;
        
        player2.x = WIDTH - 80;
        player2.y = HEIGHT - 100;
        player2.kills = 0;
        player2.health = 3;
        player2.bullets = [];
        player2.angle = Math.PI;
        
        powerups = [];
        powerupTimer = 0;
    }
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        // Player 1 controls
        if (e.key === 'w' || e.key === 'W') player1.keys.up = true;
        if (e.key === 's' || e.key === 'S') player1.keys.down = true;
        if (e.key === 'a' || e.key === 'A') player1.keys.left = true;
        if (e.key === 'd' || e.key === 'D') player1.keys.right = true;
        if (e.key === ' ') {
            e.preventDefault();
            player1.keys.fire = true;
        }
        
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
        if (e.key === 'Enter') {
            e.preventDefault();
            player2.keys.fire = true;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        // Player 1 controls
        if (e.key === 'w' || e.key === 'W') player1.keys.up = false;
        if (e.key === 's' || e.key === 'S') player1.keys.down = false;
        if (e.key === 'a' || e.key === 'A') player1.keys.left = false;
        if (e.key === 'd' || e.key === 'D') player1.keys.right = false;
        if (e.key === ' ') player1.keys.fire = false;
        
        // Player 2 controls
        if (e.key === 'ArrowUp') player2.keys.up = false;
        if (e.key === 'ArrowDown') player2.keys.down = false;
        if (e.key === 'ArrowLeft') player2.keys.left = false;
        if (e.key === 'ArrowRight') player2.keys.right = false;
        if (e.key === 'Enter') player2.keys.fire = false;
    });
    
    resetBtn.addEventListener('click', resetGame);
    
    // Touch controls for mobile
    function setupTouchControls() {
        const leftJoystick = document.querySelector('.joystick-container.left');
        const rightJoystick = document.querySelector('.joystick-container.right');
        const leftFire = document.querySelector('.fire-button.left');
        const rightFire = document.querySelector('.fire-button.right');
        const knob1 = document.getElementById('knob1');
        const knob2 = document.getElementById('knob2');
        
        if (!leftJoystick || !rightJoystick) return;
        
        let touch1 = null;
        let touch2 = null;
        
        function handleJoystick(element, knob, player, touch) {
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const deltaX = touch.clientX - centerX;
            const deltaY = touch.clientY - centerY;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = rect.width / 2 - 30;
            
            const clampedDistance = Math.min(distance, maxDistance);
            const angle = Math.atan2(deltaY, deltaX);
            
            const knobX = Math.cos(angle) * clampedDistance;
            const knobY = Math.sin(angle) * clampedDistance;
            
            knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
            
            // Update player controls based on joystick position
            const threshold = 20;
            
            // Forward/backward based on Y
            if (deltaY < -threshold) {
                player.keys.up = true;
                player.keys.down = false;
            } else if (deltaY > threshold) {
                player.keys.down = true;
                player.keys.up = false;
            } else {
                player.keys.up = false;
                player.keys.down = false;
            }
            
            // Left/right rotation based on X
            if (deltaX < -threshold) {
                player.keys.left = true;
                player.keys.right = false;
            } else if (deltaX > threshold) {
                player.keys.right = true;
                player.keys.left = false;
            } else {
                player.keys.left = false;
                player.keys.right = false;
            }
        }
        
        function resetJoystick(knob, player) {
            knob.style.transform = 'translate(-50%, -50%)';
            player.keys.up = false;
            player.keys.down = false;
            player.keys.left = false;
            player.keys.right = false;
        }
        
        // Player 1 joystick
        leftJoystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touch1 = e.touches[0];
            handleJoystick(leftJoystick, knob1, player1, touch1);
        });
        
        leftJoystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (touch1) {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === touch1.identifier) {
                        touch1 = e.touches[i];
                        handleJoystick(leftJoystick, knob1, player1, touch1);
                        break;
                    }
                }
            }
        });
        
        leftJoystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            touch1 = null;
            resetJoystick(knob1, player1);
        });
        
        // Player 2 joystick
        rightJoystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touch2 = e.touches[0];
            handleJoystick(rightJoystick, knob2, player2, touch2);
        });
        
        rightJoystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (touch2) {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === touch2.identifier) {
                        touch2 = e.touches[i];
                        handleJoystick(rightJoystick, knob2, player2, touch2);
                        break;
                    }
                }
            }
        });
        
        rightJoystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            touch2 = null;
            resetJoystick(knob2, player2);
        });
        
        // Fire buttons
        leftFire.addEventListener('touchstart', (e) => {
            e.preventDefault();
            player1.keys.fire = true;
        });
        
        leftFire.addEventListener('touchend', (e) => {
            e.preventDefault();
            player1.keys.fire = false;
        });
        
        rightFire.addEventListener('touchstart', (e) => {
            e.preventDefault();
            player2.keys.fire = true;
        });
        
        rightFire.addEventListener('touchend', (e) => {
            e.preventDefault();
            player2.keys.fire = false;
        });
    }
    
    // Initialize touch controls
    setupTouchControls();
    
    // Start game loop
    gameLoop();
});
