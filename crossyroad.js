document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('crossyroad');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('crossy-score');
  const resetBtn = document.getElementById('reset');

  const tileSize = 50;
  const cols = 10;
  const rows = 12;

  // Game state
  let score = 0;
  let lives = 3;
  let gameOver = false;
  let gameStarted = false;
  let maxProgress = 0;

  // High score
  const storedHS = parseInt(localStorage.getItem('crossyroad-highscore'));
  let highScore = Number.isFinite(storedHS) ? storedHS : 0;

  // Player
  let player = {
    x: 4,
    y: 11,
    moveDelay: 0
  };

  // Lane types: 'grass', 'road', 'water'
  let lanes = [];
  
  // Obstacles (cars) and platforms (logs)
  let obstacles = [];

  function generateLane(y) {
    if (y === 11 || y === 0) {
      return { type: 'grass', speed: 0, dir: 0 };
    }
    
    const rand = Math.random();
    if (rand < 0.4) {
      // Road
      const dir = Math.random() > 0.5 ? 1 : -1;
      const speed = 1 + Math.random() * 2;
      return { type: 'road', speed: speed, dir: dir };
    } else if (rand < 0.7) {
      // Water
      const dir = Math.random() > 0.5 ? 1 : -1;
      const speed = 0.5 + Math.random() * 1.5;
      return { type: 'water', speed: speed, dir: dir };
    } else {
      // Grass
      return { type: 'grass', speed: 0, dir: 0 };
    }
  }

  function initLanes() {
    lanes = [];
    for (let i = 0; i < rows; i++) {
      lanes.push(generateLane(i));
    }
  }

  function generateObstacles() {
    obstacles = [];
    for (let i = 0; i < rows; i++) {
      const lane = lanes[i];
      if (lane.type === 'road') {
        // Generate cars
        const numCars = 2 + Math.floor(Math.random() * 3);
        for (let j = 0; j < numCars; j++) {
          obstacles.push({
            x: (j * cols / numCars) + Math.random() * 2,
            y: i,
            width: 1.5 + Math.random() * 0.5,
            type: 'car',
            lane: i
          });
        }
      } else if (lane.type === 'water') {
        // Generate logs
        const numLogs = 2 + Math.floor(Math.random() * 2);
        for (let j = 0; j < numLogs; j++) {
          obstacles.push({
            x: (j * cols / numLogs) + Math.random() * 2,
            y: i,
            width: 2 + Math.random() * 1.5,
            type: 'log',
            lane: i
          });
        }
      }
    }
  }

  function reset() {
    player.x = 4;
    player.y = 11;
    player.moveDelay = 0;
    maxProgress = 0;
  }

  function resetGame() {
    score = 0;
    lives = 3;
    gameOver = false;
    gameStarted = false;
    initLanes();
    generateObstacles();
    reset();
    updateScore();
  }

  function updateScore() {
    scoreEl.textContent = `Score: ${score} | Lives: ${lives} | High: ${highScore}`;
  }

  function checkAndSetHighScore(currentScore) {
    if (currentScore > highScore) {
      highScore = currentScore;
      try {
        localStorage.setItem('crossyroad-highscore', highScore.toString());
      } catch (e) {}
      return true;
    }
    return false;
  }

  function drawLane(y) {
    const lane = lanes[y];
    const gradient = ctx.createLinearGradient(0, y * tileSize, 0, y * tileSize + tileSize);
    
    if (lane.type === 'grass') {
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(1, '#059669');
      ctx.fillStyle = gradient;
    } else if (lane.type === 'road') {
      gradient.addColorStop(0, '#374151');
      gradient.addColorStop(1, '#1f2937');
      ctx.fillStyle = gradient;
    } else if (lane.type === 'water') {
      gradient.addColorStop(0, '#06b6d4');
      gradient.addColorStop(1, '#0891b2');
      ctx.fillStyle = gradient;
    }
    
    ctx.fillRect(0, y * tileSize, canvas.width, tileSize);
    
    // Road markings
    if (lane.type === 'road') {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(0, y * tileSize + tileSize / 2 - 1, canvas.width, 2);
    }
  }

  function drawPlayer() {
    const px = player.x * tileSize;
    const py = player.y * tileSize;
    
    // Player character with glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fbbf24';
    
    // Body
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(px + tileSize / 2, py + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px + tileSize / 2 - 6, py + tileSize / 2 - 4, 3, 0, Math.PI * 2);
    ctx.arc(px + tileSize / 2 + 6, py + tileSize / 2 - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawObstacles() {
    obstacles.forEach(obs => {
      const ox = obs.x * tileSize;
      const oy = obs.y * tileSize;
      const width = obs.width * tileSize;
      
      if (obs.type === 'car') {
        // Car with gradient
        const carGradient = ctx.createLinearGradient(ox, oy, ox + width, oy);
        carGradient.addColorStop(0, '#ef4444');
        carGradient.addColorStop(0.5, '#dc2626');
        carGradient.addColorStop(1, '#b91c1c');
        ctx.fillStyle = carGradient;
        
        // Car body
        ctx.fillRect(ox + 5, oy + 10, width - 10, tileSize - 20);
        
        // Windows
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(ox + 10, oy + 15, width - 20, tileSize - 30);
        
        // Wheels
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(ox + 15, oy + tileSize - 10, 5, 0, Math.PI * 2);
        ctx.arc(ox + width - 15, oy + tileSize - 10, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'log') {
        // Log with wood texture
        const logGradient = ctx.createLinearGradient(ox, oy, ox, oy + tileSize);
        logGradient.addColorStop(0, '#92400e');
        logGradient.addColorStop(0.5, '#78350f');
        logGradient.addColorStop(1, '#92400e');
        ctx.fillStyle = logGradient;
        
        // Log body
        ctx.fillRect(ox, oy + 15, width, tileSize - 30);
        
        // Wood rings
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(ox + width / 2 + (i - 1) * 20, oy + tileSize / 2, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });
  }

  function draw() {
    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw lanes
    for (let i = 0; i < rows; i++) {
      drawLane(i);
    }
    
    // Draw obstacles
    drawObstacles();
    
    // Draw player
    drawPlayer();
    
    // Instructions
    if (!gameStarted && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(50, canvas.height / 2 - 40, canvas.width - 100, 80);
      ctx.fillStyle = '#fff';
      ctx.font = '18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press arrow keys or WASD to start', canvas.width / 2, canvas.height / 2);
    }
    
    // Game over
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(50, canvas.height / 2 - 60, canvas.width - 100, 120);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#fff';
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText('Click New Game to play again', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  function isOnLog() {
    const playerLane = lanes[player.y];
    if (playerLane.type !== 'water') return null;
    
    // Check if player is on any log
    for (let obs of obstacles) {
      if (obs.type === 'log' && obs.y === player.y) {
        const obsLeft = obs.x;
        const obsRight = obs.x + obs.width;
        if (player.x >= obsLeft - 0.3 && player.x <= obsRight - 0.7) {
          return obs;
        }
      }
    }
    return null;
  }

  function checkCollision() {
    const playerLane = lanes[player.y];
    
    // Check if in water without log
    if (playerLane.type === 'water') {
      if (!isOnLog()) {
        return true; // Drowned
      }
    }
    
    // Check car collision
    if (playerLane.type === 'road') {
      for (let obs of obstacles) {
        if (obs.type === 'car' && obs.y === player.y) {
          const obsLeft = obs.x;
          const obsRight = obs.x + obs.width;
          if (player.x >= obsLeft - 0.3 && player.x <= obsRight - 0.7) {
            return true; // Hit by car
          }
        }
      }
    }
    
    return false;
  }

  function update() {
    if (!gameStarted || gameOver) return;
    
    if (player.moveDelay > 0) {
      player.moveDelay--;
    }
    
    // Move obstacles
    obstacles.forEach(obs => {
      const lane = lanes[obs.lane];
      obs.x += lane.dir * lane.speed * 0.02;
      
      // Wrap around
      if (lane.dir > 0 && obs.x > cols + 2) {
        obs.x = -obs.width - 2;
      } else if (lane.dir < 0 && obs.x < -obs.width - 2) {
        obs.x = cols + 2;
      }
    });
    
    // If on log, move with log
    const log = isOnLog();
    if (log) {
      const lane = lanes[log.lane];
      player.x += lane.dir * lane.speed * 0.02;
      
      // Check if fell off edge
      if (player.x < -0.5 || player.x > cols - 0.5) {
        lives--;
        updateScore();
        if (lives <= 0) {
          gameOver = true;
          checkAndSetHighScore(score);
        } else {
          reset();
          gameStarted = false;
        }
        return;
      }
    }
    
    // Check collisions
    if (checkCollision()) {
      lives--;
      updateScore();
      if (lives <= 0) {
        gameOver = true;
        checkAndSetHighScore(score);
      } else {
        reset();
        gameStarted = false;
      }
    }
    
    // Update score based on progress
    if (player.y < maxProgress) {
      const progress = maxProgress - player.y;
      score += progress * 10;
      maxProgress = player.y;
      updateScore();
      checkAndSetHighScore(score);
    }
  }

  function movePlayer(dx, dy) {
    if (!gameStarted || gameOver || player.moveDelay > 0) return;
    
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    // Check bounds
    if (newX < 0 || newX >= cols || newY < 0 || newY >= rows) return;
    
    player.x = newX;
    player.y = newY;
    player.moveDelay = 5; // Delay between moves
    
    if (!gameStarted) {
      gameStarted = true;
    }
  }

  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Controls
  let keys = {};
  document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'].includes(e.key)) {
      e.preventDefault();
    }
    
    if (keys[e.key]) return; // Prevent repeat
    keys[e.key] = true;
    
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      movePlayer(0, -1);
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      movePlayer(0, 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      movePlayer(-1, 0);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      movePlayer(1, 0);
    }
  });
  
  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  // Touch controls
  let touchStartX = 0;
  let touchStartY = 0;
  
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });
  
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) {
        movePlayer(dx > 0 ? 1 : -1, 0);
      }
    } else {
      if (Math.abs(dy) > 30) {
        movePlayer(0, dy > 0 ? 1 : -1);
      }
    }
  });

  resetBtn.addEventListener('click', resetGame);

  // Initialize
  initLanes();
  generateObstacles();
  updateScore();
  gameLoop();
});
