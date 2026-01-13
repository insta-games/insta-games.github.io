document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const scoreEl = document.getElementById('score');
    const comboEl = document.getElementById('combo');
    const livesEl = document.getElementById('lives');
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    const WIDTH = 800;
    const HEIGHT = 600;
    const GRAVITY = 0.5;
    
    let gameState = 'ready'; // ready, playing, gameover
    let score = 0;
    let lives = 3;
    let combo = 0;
    let comboTimer = 0;
    let highScore = parseInt(localStorage.getItem('fruitninja-highscore')) || 0;
    
    // Fruits and bombs
    let objects = [];
    let spawnTimer = 0;
    let spawnInterval = 60;
    
    // Trail effect for slicing
    let trail = [];
    const MAX_TRAIL = 15;
    
    // Particles for slice effects
    let particles = [];
    
    // Fruit types
    const fruitTypes = [
        { emoji: '🍎', color: '#ef4444', points: 1 },
        { emoji: '🍊', color: '#f97316', points: 1 },
        { emoji: '🍋', color: '#fbbf24', points: 1 },
        { emoji: '🍉', color: '#10b981', points: 2 },
        { emoji: '🍇', color: '#8b5cf6', points: 1 },
        { emoji: '🍓', color: '#ec4899', points: 1 },
        { emoji: '🍌', color: '#fbbf24', points: 1 },
        { emoji: '🥝', color: '#10b981', points: 1 }
    ];
    
    class GameObject {
        constructor(x, y, vx, vy, type, isBomb = false) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.size = 40;
            this.rotation = 0;
            this.rotationSpeed = (Math.random() - 0.5) * 0.2;
            this.isBomb = isBomb;
            this.sliced = false;
            
            if (isBomb) {
                this.emoji = '💣';
                this.color = '#1a1f35';
            } else {
                this.type = type;
                this.emoji = type.emoji;
                this.color = type.color;
                this.points = type.points;
            }
        }
        
        update() {
            this.vy += GRAVITY;
            this.x += this.vx;
            this.y += this.vy;
            this.rotation += this.rotationSpeed;
        }
        
        draw() {
            if (this.sliced) return;
            
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            // Shadow
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            
            // Draw emoji
            ctx.font = `${this.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.emoji, 0, 0);
            
            ctx.restore();
        }
        
        isOffScreen() {
            return this.y > HEIGHT + 50;
        }
        
        intersectsLine(x1, y1, x2, y2) {
            // Simple circle-line intersection with larger hitbox
            const dx = x2 - x1;
            const dy = y2 - y1;
            const fx = x1 - this.x;
            const fy = y1 - this.y;
            
            // Increased hitbox radius (was size/2, now size * 0.75 for 50% bigger hitbox)
            const hitboxRadius = this.size * 0.75;
            
            const a = dx * dx + dy * dy;
            const b = 2 * (fx * dx + fy * dy);
            const c = (fx * fx + fy * fy) - hitboxRadius * hitboxRadius;
            
            const discriminant = b * b - 4 * a * c;
            
            if (discriminant >= 0) {
                const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
                const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
                
                if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) {
                    return true;
                }
            }
            
            return false;
        }
    }
    
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 10;
            this.vy = (Math.random() - 0.5) * 10 - 5;
            this.life = 30;
            this.maxLife = 30;
            this.color = color;
            this.size = Math.random() * 8 + 4;
        }
        
        update() {
            this.vx *= 0.98;
            this.vy += 0.5;
            this.x += this.vx;
            this.y += this.vy;
            this.life--;
        }
        
        draw() {
            const alpha = this.life / this.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        isDead() {
            return this.life <= 0;
        }
    }
    
    function spawnObject() {
        const isBomb = Math.random() < 0.15; // 15% chance for bomb
        const x = Math.random() * (WIDTH - 100) + 50;
        const y = HEIGHT + 20;
        const vx = (Math.random() - 0.5) * 5; // Reduced from 8 to 5 (37% slower horizontal)
        const vy = -(Math.random() * 5 + 11); // Reduced from (8 + 15) to (5 + 11) (31% slower vertical)
        
        let obj;
        if (isBomb) {
            obj = new GameObject(x, y, vx, vy, null, true);
        } else {
            const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
            obj = new GameObject(x, y, vx, vy, type, false);
        }
        
        objects.push(obj);
    }
    
    function createSliceParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            particles.push(new Particle(x, y, color));
        }
    }
    
    function updateCombo() {
        if (combo > 0) {
            comboTimer--;
            if (comboTimer <= 0) {
                combo = 0;
                comboEl.textContent = '0x';
            }
        }
    }
    
    function addScore(points) {
        const comboBonus = Math.floor(combo / 3);
        const totalPoints = points + comboBonus;
        score += totalPoints;
        scoreEl.textContent = score;
        
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('fruitninja-highscore', highScore);
        }
    }
    
    function loseLife() {
        lives--;
        updateLives();
        
        if (lives <= 0) {
            gameOver();
        }
    }
    
    function updateLives() {
        livesEl.innerHTML = '';
        for (let i = 0; i < lives; i++) {
            const heart = document.createElement('span');
            heart.className = 'life';
            heart.textContent = '❤️';
            livesEl.appendChild(heart);
        }
    }
    
    function update() {
        if (gameState !== 'playing') return;
        
        // Spawn objects
        spawnTimer++;
        if (spawnTimer >= spawnInterval) {
            spawnObject();
            spawnTimer = 0;
            // Gradually increase difficulty
            spawnInterval = Math.max(30, 60 - Math.floor(score / 50));
        }
        
        // Update objects
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            obj.update();
            
            // Remove if off screen (no life penalty for missing fruits)
            if (obj.isOffScreen()) {
                objects.splice(i, 1);
            }
        }
        
        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].isDead()) {
                particles.splice(i, 1);
            }
        }
        
        // Update combo timer
        updateCombo();
    }
    
    function draw() {
        // Clear canvas with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        gradient.addColorStop(0, '#0a0e1a');
        gradient.addColorStop(1, '#1a1f35');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        // Draw objects
        objects.forEach(obj => obj.draw());
        
        // Draw particles
        particles.forEach(particle => particle.draw());
        
        // Draw trail
        if (trail.length > 1) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            for (let i = 0; i < trail.length - 1; i++) {
                const alpha = i / trail.length;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.moveTo(trail[i].x, trail[i].y);
                ctx.lineTo(trail[i + 1].x, trail[i + 1].y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
        
        // Draw high score if in ready state
        if (gameState === 'ready' && highScore > 0) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '20px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(`High Score: ${highScore}`, WIDTH / 2, HEIGHT / 2);
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
        lives = 3;
        combo = 0;
        comboTimer = 0;
        objects = [];
        particles = [];
        trail = [];
        spawnTimer = 0;
        spawnInterval = 60;
        
        scoreEl.textContent = '0';
        comboEl.textContent = '0x';
        updateLives();
        statusEl.textContent = 'Slice fruits, avoid bombs!';
        statusEl.style.color = '#06b6d4';
    }
    
    function gameOver() {
        gameState = 'gameover';
        statusEl.textContent = `Game Over! Final Score: ${score}`;
        statusEl.style.color = '#ef4444';
        
        if (score === highScore) {
            statusEl.textContent += ' 🏆 New High Score!';
        }
    }
    
    function resetGame() {
        gameState = 'ready';
        score = 0;
        lives = 3;
        combo = 0;
        objects = [];
        particles = [];
        trail = [];
        
        scoreEl.textContent = '0';
        comboEl.textContent = '0x';
        updateLives();
        statusEl.textContent = 'Click Start to begin!';
        statusEl.style.color = '#06b6d4';
    }
    
    // Mouse/Touch controls
    let isSlicing = false;
    let lastPos = null;
    
    function handleSliceStart(x, y) {
        if (gameState !== 'playing') return;
        isSlicing = true;
        lastPos = { x, y };
        trail = [{ x, y }];
    }
    
    function handleSliceMove(x, y) {
        if (!isSlicing || gameState !== 'playing') return;
        
        trail.push({ x, y });
        if (trail.length > MAX_TRAIL) {
            trail.shift();
        }
        
        // Check for slicing
        if (lastPos) {
            let slicedThisMove = false;
            
            for (let i = objects.length - 1; i >= 0; i--) {
                const obj = objects[i];
                if (!obj.sliced && obj.intersectsLine(lastPos.x, lastPos.y, x, y)) {
                    obj.sliced = true;
                    
                    if (obj.isBomb) {
                        // Hit bomb - lose life
                        loseLife();
                        createSliceParticles(obj.x, obj.y, '#ef4444');
                        combo = 0;
                        comboEl.textContent = '0x';
                    } else {
                        // Sliced fruit
                        addScore(obj.points);
                        createSliceParticles(obj.x, obj.y, obj.color);
                        combo++;
                        comboTimer = 60; // 1 second at 60fps
                        comboEl.textContent = combo + 'x';
                        slicedThisMove = true;
                    }
                    
                    objects.splice(i, 1);
                }
            }
        }
        
        lastPos = { x, y };
    }
    
    function handleSliceEnd() {
        isSlicing = false;
        lastPos = null;
        trail = [];
    }
    
    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        handleSliceStart(e.clientX - rect.left, e.clientY - rect.top);
    });
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        handleSliceMove(e.clientX - rect.left, e.clientY - rect.top);
    });
    
    canvas.addEventListener('mouseup', handleSliceEnd);
    canvas.addEventListener('mouseleave', handleSliceEnd);
    
    // Touch events
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        handleSliceStart(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        handleSliceMove(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleSliceEnd();
    });
    
    // Button events
    startBtn.addEventListener('click', startGame);
    resetBtn.addEventListener('click', resetGame);
    
    // Initialize
    resetGame();
    gameLoop();
});
