const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');

// Game state
let gameRunning = false;
let gamePaused = false;
let score = 0;
let level = 1;
let lives = 3;

// Paddle
const paddle = {
    width: 100,
    height: 15,
    x: canvas.width / 2 - 50,
    y: canvas.height - 30,
    speed: 8,
    dx: 0
};

// Ball
const ball = {
    x: canvas.width / 2,
    y: paddle.y - 10,
    radius: 8,
    dx: 4,
    dy: -4,
    speed: 4,
    stuck: true
};

// Bricks
const brickInfo = {
    rows: 5,
    cols: 9,
    width: 60,
    height: 20,
    padding: 10,
    offsetX: 15,
    offsetY: 60
};

let bricks = [];

// Colors for different brick rows
const brickColors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4'];

// Initialize bricks
function createBricks() {
    bricks = [];
    const rows = Math.min(5 + Math.floor(level / 3), 8);
    for (let row = 0; row < rows; row++) {
        bricks[row] = [];
        for (let col = 0; col < brickInfo.cols; col++) {
            const x = col * (brickInfo.width + brickInfo.padding) + brickInfo.offsetX;
            const y = row * (brickInfo.height + brickInfo.padding) + brickInfo.offsetY;
            bricks[row][col] = { x, y, visible: true };
        }
    }
}

// Draw paddle
function drawPaddle() {
    const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y + paddle.height);
    gradient.addColorStop(0, '#06b6d4');
    gradient.addColorStop(1, '#0891b2');
    ctx.fillStyle = gradient;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

// Draw ball
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#06b6d4');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Draw bricks
function drawBricks() {
    for (let row = 0; row < bricks.length; row++) {
        for (let col = 0; col < bricks[row].length; col++) {
            const brick = bricks[row][col];
            if (brick.visible) {
                const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x + brickInfo.width, brick.y + brickInfo.height);
                const color = brickColors[row % brickColors.length];
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, adjustBrightness(color, -20));
                ctx.fillStyle = gradient;
                ctx.fillRect(brick.x, brick.y, brickInfo.width, brickInfo.height);
                
                ctx.strokeStyle = '#0a0e1a';
                ctx.lineWidth = 2;
                ctx.strokeRect(brick.x, brick.y, brickInfo.width, brickInfo.height);
            }
        }
    }
}

// Helper function to adjust color brightness
function adjustBrightness(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Draw game info
function drawInfo() {
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Level: ${level}`, 10, 50);
    ctx.fillText(`Lives: ${lives}`, canvas.width - 100, 30);
}

// Move paddle
function movePaddle() {
    paddle.x += paddle.dx;
    
    // Wall collision
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
}

// Move ball
function moveBall() {
    if (ball.stuck) {
        ball.x = paddle.x + paddle.width / 2;
        ball.y = paddle.y - ball.radius;
        return;
    }
    
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Wall collision
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.dx = -ball.dx;
    }
    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
    }
    
    // Paddle collision
    if (ball.y + ball.radius > paddle.y && 
        ball.x > paddle.x && 
        ball.x < paddle.x + paddle.width &&
        ball.dy > 0) {
        
        // Change angle based on where ball hits paddle
        const hitPos = (ball.x - paddle.x) / paddle.width;
        const angle = (hitPos - 0.5) * Math.PI / 3;
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        ball.dx = speed * Math.sin(angle);
        ball.dy = -speed * Math.cos(angle);
    }
    
    // Bottom collision (lose life)
    if (ball.y + ball.radius > canvas.height) {
        lives--;
        livesDisplay.textContent = `Lives: ${lives}`;
        
        if (lives === 0) {
            gameOver();
        } else {
            resetBall();
        }
    }
    
    // Brick collision
    for (let row = 0; row < bricks.length; row++) {
        for (let col = 0; col < bricks[row].length; col++) {
            const brick = bricks[row][col];
            if (brick.visible) {
                if (ball.x + ball.radius > brick.x &&
                    ball.x - ball.radius < brick.x + brickInfo.width &&
                    ball.y + ball.radius > brick.y &&
                    ball.y - ball.radius < brick.y + brickInfo.height) {
                    
                    ball.dy = -ball.dy;
                    brick.visible = false;
                    score += 10 * level;
                    scoreDisplay.textContent = `Score: ${score}`;
                    
                    // Check if level complete
                    if (checkLevelComplete()) {
                        nextLevel();
                    }
                }
            }
        }
    }
}

// Check if level is complete
function checkLevelComplete() {
    for (let row = 0; row < bricks.length; row++) {
        for (let col = 0; col < bricks[row].length; col++) {
            if (bricks[row][col].visible) return false;
        }
    }
    return true;
}

// Next level
function nextLevel() {
    level++;
    levelDisplay.textContent = `Level: ${level}`;
    
    // Increase ball speed slightly
    const speedIncrease = 0.3;
    const angle = Math.atan2(ball.dy, ball.dx);
    const newSpeed = ball.speed + speedIncrease;
    ball.speed = newSpeed;
    ball.dx = newSpeed * Math.cos(angle);
    ball.dy = newSpeed * Math.sin(angle);
    
    resetBall();
    createBricks();
}

// Reset ball
function resetBall() {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius;
    ball.stuck = true;
    const angle = -Math.PI / 4 + (Math.random() - 0.5) * Math.PI / 4;
    ball.dx = ball.speed * Math.sin(angle);
    ball.dy = -ball.speed * Math.cos(angle);
}

// Game over
function gameOver() {
    gameRunning = false;
    gamePaused = false;
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
    
    setTimeout(() => {
        alert(`Game Over!\n\nFinal Score: ${score}\nLevel Reached: ${level}`);
    }, 100);
}

// Draw everything
function draw() {
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawBricks();
    drawPaddle();
    drawBall();
    drawInfo();
    
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
}

// Game loop
function gameLoop() {
    if (gameRunning && !gamePaused) {
        movePaddle();
        moveBall();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        paddle.dx = -paddle.speed;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        paddle.dx = paddle.speed;
    } else if (e.key === ' ' && gameRunning && ball.stuck) {
        ball.stuck = false;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
        e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D') {
        paddle.dx = 0;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (gameRunning) {
        const rect = canvas.getBoundingClientRect();
        paddle.x = e.clientX - rect.left - paddle.width / 2;
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
    }
});

canvas.addEventListener('click', () => {
    if (gameRunning && ball.stuck) {
        ball.stuck = false;
    }
});

startBtn.addEventListener('click', () => {
    score = 0;
    level = 1;
    lives = 3;
    ball.speed = 4;
    scoreDisplay.textContent = 'Score: 0';
    levelDisplay.textContent = 'Level: 1';
    livesDisplay.textContent = 'Lives: 3';
    
    createBricks();
    resetBall();
    
    gameRunning = true;
    gamePaused = false;
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-block';
});

pauseBtn.addEventListener('click', () => {
    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? 'Resume' : 'Pause';
});

// Initialize
createBricks();
gameLoop();
