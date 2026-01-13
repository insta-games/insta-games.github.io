document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const scoreEl = document.getElementById('score');
    const highscoreEl = document.getElementById('highscore');
    
    const WIDTH = 800;
    const HEIGHT = 200;
    const GROUND_Y = 150;
    const GRAVITY = 0.6;
    const JUMP_FORCE = -12;
    
    let gameState = 'ready'; // ready, playing, gameover
    let score = 0;
    let highScore = parseInt(localStorage.getItem('dino-highscore')) || 0;
    let gameSpeed = 6;
    let frameCount = 0;
    
    // Dino
    let dino = {
        x: 50,
        y: GROUND_Y,
        width: 44,
        height: 47,
        velocityY: 0,
        isJumping: false,
        isDucking: false,
        frame: 0
    };
    
    // Obstacles
    let obstacles = [];
    let nextObstacleFrame = 0;
    
    // Ground
    let groundX = 0;
    
    // Clouds
    let clouds = [];
    
    // Initialize
    highscoreEl.textContent = highScore;
    
    // Create initial clouds
    for (let i = 0; i < 3; i++) {
        clouds.push({
            x: Math.random() * WIDTH,
            y: Math.random() * 60 + 20,
            width: 46,
            height: 14
        });
    }
    
    class Obstacle {
        constructor(type) {
            this.type = type; // 'cactus-small', 'cactus-large', 'bird'
            this.x = WIDTH;
            
            if (type === 'bird') {
                this.y = GROUND_Y - Math.random() * 40 - 20; // Flying height
                this.width = 46;
                this.height = 40;
                this.frame = 0;
            } else if (type === 'cactus-small') {
                this.y = GROUND_Y;
                this.width = 17;
                this.height = 35;
            } else { // cactus-large
                this.y = GROUND_Y;
                this.width = 25;
                this.height = 50;
            }
        }
        
        update() {
            this.x -= gameSpeed;
            if (this.type === 'bird') {
                this.frame++;
            }
        }
        
        draw() {
            ctx.fillStyle = '#535353';
            
            if (this.type === 'bird') {
                // Draw pterodactyl
                const wingUp = Math.floor(this.frame / 10) % 2 === 0;
                
                // Body
                ctx.fillRect(this.x + 10, this.y + 15, 26, 10);
                
                // Head
                ctx.fillRect(this.x, this.y + 10, 15, 15);
                
                // Beak
                ctx.fillRect(this.x - 5, this.y + 15, 6, 5);
                
                // Wings
                if (wingUp) {
                    ctx.fillRect(this.x + 15, this.y, 20, 8);
                } else {
                    ctx.fillRect(this.x + 15, this.y + 20, 20, 8);
                }
                
                // Tail
                ctx.fillRect(this.x + 36, this.y + 12, 10, 6);
                
            } else if (this.type === 'cactus-small') {
                // Small cactus
                ctx.fillRect(this.x + 5, this.y - this.height, 7, this.height);
                ctx.fillRect(this.x, this.y - this.height + 10, 4, 15);
                ctx.fillRect(this.x + 12, this.y - this.height + 5, 4, 20);
                
            } else {
                // Large cactus
                ctx.fillRect(this.x + 8, this.y - this.height, 9, this.height);
                ctx.fillRect(this.x, this.y - this.height + 15, 6, 20);
                ctx.fillRect(this.x + 17, this.y - this.height + 10, 6, 25);
            }
        }
        
        collidesWith(dino) {
            const dinoBox = {
                x: dino.x + 5,
                y: dino.isDucking ? dino.y - 25 : dino.y - dino.height,
                width: dino.width - 10,
                height: dino.isDucking ? 25 : dino.height
            };
            
            const obstacleBox = {
                x: this.x + 5,
                y: this.y - this.height,
                width: this.width - 10,
                height: this.height
            };
            
            return dinoBox.x < obstacleBox.x + obstacleBox.width &&
                   dinoBox.x + dinoBox.width > obstacleBox.x &&
                   dinoBox.y < obstacleBox.y + obstacleBox.height &&
                   dinoBox.y + dinoBox.height > obstacleBox.y;
        }
    }
    
    function drawDino() {
        ctx.fillStyle = '#535353';
        
        const y = dino.y - (dino.isDucking ? 25 : dino.height);
        const height = dino.isDucking ? 25 : dino.height;
        
        if (dino.isDucking) {
            // Ducking dino
            // Body
            ctx.fillRect(dino.x + 10, y + 10, 30, 15);
            // Head
            ctx.fillRect(dino.x + 5, y, 20, 12);
            // Neck
            ctx.fillRect(dino.x + 10, y + 8, 10, 7);
            // Legs
            const legFrame = Math.floor(frameCount / 6) % 2;
            if (legFrame === 0) {
                ctx.fillRect(dino.x + 15, y + 20, 6, 5);
                ctx.fillRect(dino.x + 30, y + 20, 6, 5);
            } else {
                ctx.fillRect(dino.x + 18, y + 20, 6, 5);
                ctx.fillRect(dino.x + 27, y + 20, 6, 5);
            }
        } else {
            // Standing/Running dino
            // Body
            ctx.fillRect(dino.x + 10, y + 20, 24, 18);
            
            // Head
            ctx.fillRect(dino.x + 5, y, 20, 20);
            
            // Neck
            ctx.fillRect(dino.x + 10, y + 15, 15, 10);
            
            // Eye
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(dino.x + 15, y + 5, 3, 3);
            ctx.fillStyle = '#535353';
            
            // Arms
            ctx.fillRect(dino.x + 28, y + 25, 6, 8);
            
            // Legs (animated when running)
            if (!dino.isJumping) {
                const legFrame = Math.floor(frameCount / 6) % 2;
                if (legFrame === 0) {
                    ctx.fillRect(dino.x + 12, y + 38, 6, 9);
                    ctx.fillRect(dino.x + 22, y + 38, 6, 9);
                } else {
                    ctx.fillRect(dino.x + 10, y + 38, 6, 9);
                    ctx.fillRect(dino.x + 24, y + 38, 6, 9);
                }
            } else {
                ctx.fillRect(dino.x + 12, y + 38, 6, 9);
                ctx.fillRect(dino.x + 22, y + 38, 6, 9);
            }
            
            // Tail
            ctx.fillRect(dino.x + 34, y + 22, 10, 6);
        }
    }
    
    function drawGround() {
        ctx.strokeStyle = '#535353';
        ctx.lineWidth = 2;
        
        // Moving ground line
        for (let i = 0; i < WIDTH + 20; i += 20) {
            const x = (i + groundX) % (WIDTH + 20);
            ctx.beginPath();
            ctx.moveTo(x, GROUND_Y);
            ctx.lineTo(x + 10, GROUND_Y);
            ctx.stroke();
        }
    }
    
    function drawClouds() {
        ctx.fillStyle = '#c5c5c5';
        
        clouds.forEach(cloud => {
            // Simple cloud shape
            ctx.fillRect(cloud.x, cloud.y, 20, 6);
            ctx.fillRect(cloud.x + 8, cloud.y - 4, 20, 6);
            ctx.fillRect(cloud.x + 16, cloud.y, 20, 6);
        });
    }
    
    function spawnObstacle() {
        const rand = Math.random();
        let type;
        
        if (rand < 0.4) {
            type = 'cactus-small';
        } else if (rand < 0.7) {
            type = 'cactus-large';
        } else {
            type = 'bird';
        }
        
        obstacles.push(new Obstacle(type));
        
        // Random spacing between obstacles
        nextObstacleFrame = frameCount + Math.floor(Math.random() * 60) + 60;
    }
    
    function jump() {
        if (!dino.isJumping && !dino.isDucking && gameState === 'playing') {
            dino.velocityY = JUMP_FORCE;
            dino.isJumping = true;
        }
    }
    
    function duck(isDucking) {
        if (gameState === 'playing' && !dino.isJumping) {
            dino.isDucking = isDucking;
        }
    }
    
    function update() {
        if (gameState !== 'playing') return;
        
        frameCount++;
        
        // Update score
        score = Math.floor(frameCount / 10);
        scoreEl.textContent = score;
        
        // Increase difficulty
        if (frameCount % 300 === 0) {
            gameSpeed += 0.5;
        }
        
        // Update dino physics
        if (dino.isJumping) {
            dino.velocityY += GRAVITY;
            dino.y += dino.velocityY;
            
            if (dino.y >= GROUND_Y) {
                dino.y = GROUND_Y;
                dino.velocityY = 0;
                dino.isJumping = false;
            }
        }
        
        // Update ground
        groundX -= gameSpeed;
        if (groundX <= -20) {
            groundX = 0;
        }
        
        // Update clouds
        clouds.forEach(cloud => {
            cloud.x -= gameSpeed * 0.3;
            if (cloud.x < -cloud.width) {
                cloud.x = WIDTH;
                cloud.y = Math.random() * 60 + 20;
            }
        });
        
        // Spawn obstacles
        if (frameCount >= nextObstacleFrame) {
            spawnObstacle();
        }
        
        // Update obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].update();
            
            // Check collision
            if (obstacles[i].collidesWith(dino)) {
                gameOver();
            }
            
            // Remove off-screen obstacles
            if (obstacles[i].x < -50) {
                obstacles.splice(i, 1);
            }
        }
    }
    
    function draw() {
        // Clear canvas
        ctx.fillStyle = gameState === 'gameover' ? '#d1d5db' : '#f7f7f7';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        drawClouds();
        drawGround();
        obstacles.forEach(obstacle => obstacle.draw());
        drawDino();
        
        // Draw game over text
        if (gameState === 'gameover') {
            ctx.fillStyle = '#535353';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', WIDTH / 2, 60);
            ctx.font = '16px Arial';
            ctx.fillText('Press SPACE to restart', WIDTH / 2, 90);
        }
    }
    
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    function startGame() {
        gameState = 'playing';
        score = 0;
        frameCount = 0;
        gameSpeed = 6;
        obstacles = [];
        dino.y = GROUND_Y;
        dino.velocityY = 0;
        dino.isJumping = false;
        dino.isDucking = false;
        groundX = 0;
        nextObstacleFrame = 60;
        
        statusEl.textContent = 'Running...';
        scoreEl.textContent = '0';
    }
    
    function gameOver() {
        gameState = 'gameover';
        statusEl.textContent = 'Game Over!';
        
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('dino-highscore', highScore);
            highscoreEl.textContent = highScore;
            statusEl.textContent = 'Game Over! 🏆 New High Score!';
        }
    }
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            
            if (gameState === 'ready') {
                startGame();
            } else if (gameState === 'gameover') {
                startGame();
            } else {
                jump();
            }
        }
        
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            duck(true);
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            duck(false);
        }
    });
    
    // Touch controls for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        
        if (gameState === 'ready' || gameState === 'gameover') {
            startGame();
        } else {
            jump();
        }
    });
    
    // Start game loop
    gameLoop();
});
