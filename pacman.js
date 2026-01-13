document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('pacman');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('pacman-score');
  const resetBtn = document.getElementById('reset');

  const tileSize = 20;
  const cols = 28;
  const rows = 31;

  // Game state
  let score = 0;
  let lives = 3;
  let gameOver = false;
  let gameStarted = false;
  let won = false;
  let totalDots = 0;
  let dotsEaten = 0;
  let powerMode = false;
  let powerModeTimer = 0;

  // High score
  const storedHS = parseInt(localStorage.getItem('pacman-highscore'));
  let highScore = Number.isFinite(storedHS) ? storedHS : 0;

  // Maze layout (0=empty, 1=wall, 2=dot, 3=power pellet)
  const maze = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,0,1,1,1,0,0,1,1,1,0,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
    [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  // Pac-Man
  let pacman = {
    x: 14,
    y: 26,
    dir: { x: 0, y: 0 },
    nextDir: { x: 0, y: 0 },
    mouthOpen: 0,
    speed: 0.3
  };

  // Ghosts
  const ghostColors = ['#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];
  let ghosts = [
    { x: 12, y: 14, startX: 12, startY: 14, dir: { x: 1, y: 0 }, color: ghostColors[0], personality: 'chase' },
    { x: 13, y: 14, startX: 13, startY: 14, dir: { x: -1, y: 0 }, color: ghostColors[1], personality: 'ambush' },
    { x: 14, y: 14, startX: 14, startY: 14, dir: { x: 0, y: -1 }, color: ghostColors[2], personality: 'random' },
    { x: 15, y: 14, startX: 15, startY: 14, dir: { x: 0, y: 1 }, color: ghostColors[3], personality: 'patrol' }
  ];

  function countDots() {
    let count = 0;
    for (let row of maze) {
      for (let cell of row) {
        if (cell === 2 || cell === 3) count++;
      }
    }
    return count;
  }

  function reset() {
    pacman.x = 14;
    pacman.y = 26;
    pacman.dir = { x: 0, y: 0 };
    pacman.nextDir = { x: 0, y: 0 };
    
    ghosts.forEach((g, i) => {
      g.x = g.startX;
      g.y = g.startY;
      g.dir = i % 2 === 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    });
    
    powerMode = false;
    powerModeTimer = 0;
  }

  function resetGame() {
    score = 0;
    lives = 3;
    gameOver = false;
    gameStarted = false;
    won = false;
    dotsEaten = 0;
    powerMode = false;
    powerModeTimer = 0;
    
    // Reset maze
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (maze[y][x] === 0 && (y === 1 || y === 29) && x > 0 && x < cols - 1) {
          maze[y][x] = 2;
        }
      }
    }
    
    // Re-add power pellets
    if (maze[3][1] === 0) maze[3][1] = 3;
    if (maze[3][26] === 0) maze[3][26] = 3;
    if (maze[23][1] === 0) maze[23][1] = 3;
    if (maze[23][26] === 0) maze[23][26] = 3;
    
    totalDots = countDots();
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
        localStorage.setItem('pacman-highscore', highScore.toString());
      } catch (e) {}
      return true;
    }
    return false;
  }

  function canMove(x, y) {
    const floorX = Math.floor(x);
    const floorY = Math.floor(y);
    if (floorY < 0 || floorY >= rows || floorX < 0 || floorX >= cols) return false;
    return maze[floorY][floorX] !== 1;
  }

  function drawMaze() {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = maze[y][x];
        if (cell === 1) {
          // Wall with themed gradient
          const gradient = ctx.createLinearGradient(
            x * tileSize, 
            y * tileSize, 
            x * tileSize + tileSize, 
            y * tileSize + tileSize
          );
          gradient.addColorStop(0, '#1e3a8a');
          gradient.addColorStop(1, '#1e40af');
          ctx.fillStyle = gradient;
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
          
          // Border
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
        } else if (cell === 2) {
          // Dot
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === 3) {
          // Power pellet with glow
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#06b6d4';
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }
  }

  function drawPacman() {
    const px = pacman.x * tileSize + tileSize / 2;
    const py = pacman.y * tileSize + tileSize / 2;
    
    // Animated mouth
    pacman.mouthOpen = (pacman.mouthOpen + 0.15) % 1;
    const mouthAngle = pacman.mouthOpen < 0.5 ? pacman.mouthOpen * 0.5 : (1 - pacman.mouthOpen) * 0.5;
    
    // Determine direction angle
    let dirAngle = 0;
    if (pacman.dir.x === 1) dirAngle = 0;
    else if (pacman.dir.x === -1) dirAngle = Math.PI;
    else if (pacman.dir.y === -1) dirAngle = -Math.PI / 2;
    else if (pacman.dir.y === 1) dirAngle = Math.PI / 2;
    
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(px, py, tileSize / 2 - 2, dirAngle + mouthAngle, dirAngle + Math.PI * 2 - mouthAngle);
    ctx.lineTo(px, py);
    ctx.fill();
  }

  function drawGhosts() {
    ghosts.forEach(ghost => {
      const gx = ghost.x * tileSize + tileSize / 2;
      const gy = ghost.y * tileSize + tileSize / 2;
      
      if (powerMode) {
        // Scared ghost - blue
        ctx.fillStyle = '#3b82f6';
      } else {
        ctx.fillStyle = ghost.color;
      }
      
      // Ghost body
      ctx.beginPath();
      ctx.arc(gx, gy - 2, tileSize / 2 - 2, Math.PI, 0);
      ctx.lineTo(gx + tileSize / 2 - 2, gy + tileSize / 2 - 2);
      ctx.lineTo(gx + tileSize / 3, gy + tileSize / 4);
      ctx.lineTo(gx, gy + tileSize / 2 - 2);
      ctx.lineTo(gx - tileSize / 3, gy + tileSize / 4);
      ctx.lineTo(gx - tileSize / 2 + 2, gy + tileSize / 2 - 2);
      ctx.closePath();
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(gx - 4, gy - 2, 3, 0, Math.PI * 2);
      ctx.arc(gx + 4, gy - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      
      if (!powerMode) {
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(gx - 4 + ghost.dir.x, gy - 2 + ghost.dir.y, 1.5, 0, Math.PI * 2);
        ctx.arc(gx + 4 + ghost.dir.x, gy - 2 + ghost.dir.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function draw() {
    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawMaze();
    drawPacman();
    drawGhosts();
    
    // Instructions
    if (!gameStarted && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80);
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press arrow keys or WASD to start', canvas.width / 2, canvas.height / 2);
    }
    
    // Game over
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120);
      ctx.fillStyle = won ? '#10b981' : '#ef4444';
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(won ? 'You Win!' : 'Game Over!', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#fff';
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText('Click New Game to play again', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  function update() {
    if (!gameStarted || gameOver) return;
    
    // Power mode timer
    if (powerMode) {
      powerModeTimer--;
      if (powerModeTimer <= 0) {
        powerMode = false;
      }
    }
    
    // Try to change direction
    const nextX = pacman.x + pacman.nextDir.x * pacman.speed;
    const nextY = pacman.y + pacman.nextDir.y * pacman.speed;
    if (canMove(nextX, nextY)) {
      pacman.dir = { ...pacman.nextDir };
    }
    
    // Move Pac-Man
    const newX = pacman.x + pacman.dir.x * pacman.speed;
    const newY = pacman.y + pacman.dir.y * pacman.speed;
    
    if (canMove(newX, newY)) {
      pacman.x = newX;
      pacman.y = newY;
      
      // Wrap around
      if (pacman.x < 0) pacman.x = cols - 1;
      if (pacman.x >= cols) pacman.x = 0;
      
      // Eat dots
      const cellX = Math.floor(pacman.x);
      const cellY = Math.floor(pacman.y);
      if (cellY >= 0 && cellY < rows && cellX >= 0 && cellX < cols) {
        const cell = maze[cellY][cellX];
      if (cell === 2) {
        maze[cellY][cellX] = 0;
        score += 10;
        dotsEaten++;
        updateScore();
        
        if (dotsEaten >= totalDots) {
          won = true;
          gameOver = true;
          checkAndSetHighScore(score);
          // Track game completion
          if (typeof gtag === 'function') {
            gtag('event', 'game_complete', {
              'game_name': 'pacman',
              'score': score,
              'result': 'won'
            });
          }
        }
      } else if (cell === 3) {
        maze[cellY][cellX] = 0;
        score += 50;
        dotsEaten++;
        powerMode = true;
        powerModeTimer = 120; // ~6 seconds at 20fps
        updateScore();
        
        if (dotsEaten >= totalDots) {
          won = true;
          gameOver = true;
          checkAndSetHighScore(score);
          // Track game completion
          if (typeof gtag === 'function') {
            gtag('event', 'game_complete', {
              'game_name': 'pacman',
              'score': score,
              'result': 'won'
            });
          }
        }
      }      }    }
    
    // Move ghosts
    ghosts.forEach(ghost => {
      const gx = Math.floor(ghost.x);
      const gy = Math.floor(ghost.y);
      
      // Simple AI - try to move towards Pac-Man or random
      const possibleDirs = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
      ].filter(d => {
        // Don't go backwards
        if (d.x === -ghost.dir.x && d.y === -ghost.dir.y) return false;
        return canMove(gx + d.x, gy + d.y);
      });
      
      if (possibleDirs.length > 0 && Math.random() < 0.15) {
        if (powerMode) {
          // Run away from Pac-Man
          const awayDirs = possibleDirs.sort((a, b) => {
            const distA = Math.abs((gx + a.x) - pacman.x) + Math.abs((gy + a.y) - pacman.y);
            const distB = Math.abs((gx + b.x) - pacman.x) + Math.abs((gy + b.y) - pacman.y);
            return distB - distA;
          });
          ghost.dir = awayDirs[0];
        } else {
          // Chase or random
          if (ghost.personality === 'chase' || Math.random() < 0.3) {
            const chaseDirs = possibleDirs.sort((a, b) => {
              const distA = Math.abs((gx + a.x) - pacman.x) + Math.abs((gy + a.y) - pacman.y);
              const distB = Math.abs((gx + b.x) - pacman.x) + Math.abs((gy + b.y) - pacman.y);
              return distA - distB;
            });
            ghost.dir = chaseDirs[0];
          } else {
            ghost.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
          }
        }
      }
      
      const newGX = ghost.x + ghost.dir.x * 0.15;
      const newGY = ghost.y + ghost.dir.y * 0.15;
      
      if (canMove(newGX, newGY)) {
        ghost.x = newGX;
        ghost.y = newGY;
        
        // Wrap around
        if (ghost.x < 0) ghost.x = cols - 1;
        if (ghost.x >= cols) ghost.x = 0;
      }
    });
    
    // Check collision with ghosts
    ghosts.forEach((ghost, index) => {
      const dx = Math.abs(pacman.x - ghost.x);
      const dy = Math.abs(pacman.y - ghost.y);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.5) {
        if (powerMode) {
          // Eat ghost
          score += 200;
          ghost.x = ghost.startX;
          ghost.y = ghost.startY;
          updateScore();
        } else {
          // Lose a life
          lives--;
          updateScore();
          
          if (lives <= 0) {
            gameOver = true;
            checkAndSetHighScore(score);
            // Track game over
            if (typeof gtag === 'function') {
              gtag('event', 'game_over', {
                'game_name': 'pacman',
                'score': score,
                'result': 'lost'
              });
            }
          } else {
            reset();
            gameStarted = false;
          }
        }
      }
    });
  }

  let lastTime = 0;
  const targetFPS = 30; // Faster game speed
  const frameDelay = 1000 / targetFPS;

  function gameLoop(currentTime) {
    if (currentTime - lastTime >= frameDelay) {
      update();
      draw();
      lastTime = currentTime;
    }
    requestAnimationFrame(gameLoop);
  }

  // Controls
  let keys = {};
  document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'].includes(e.key)) {
      e.preventDefault();
    }
    
    keys[e.key] = true;
    
    if (!gameStarted && !gameOver) {
      if (keys['ArrowUp'] || keys['w'] || keys['W'] || keys['ArrowDown'] || keys['s'] || keys['S'] ||
          keys['ArrowLeft'] || keys['a'] || keys['A'] || keys['ArrowRight'] || keys['d'] || keys['D']) {
        gameStarted = true;
        // Track game start
        if (typeof gtag === 'function') {
          gtag('event', 'game_start', {
            'game_name': 'pacman'
          });
        }
      }
    }
    
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
      pacman.nextDir = { x: 0, y: -1 };
    } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
      pacman.nextDir = { x: 0, y: 1 };
    } else if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      pacman.nextDir = { x: -1, y: 0 };
    } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      pacman.nextDir = { x: 1, y: 0 };
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
    
    if (!gameStarted && !gameOver) {
      gameStarted = true;
    }
  });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const dx = touchX - touchStartX;
    const dy = touchY - touchStartY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      pacman.nextDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      pacman.nextDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }
    
    touchStartX = touchX;
    touchStartY = touchY;
  });

  resetBtn.addEventListener('click', resetGame);

  // Initialize
  totalDots = countDots();
  updateScore();
  gameLoop();
});
