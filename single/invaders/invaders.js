document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('invaders');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('invaders-status');

  // Game state
  let player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 60,
    width: 40,
    height: 30,
    speed: 5
  };

  let aliens = [];
  let bullets = [];
  let alienBullets = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let gameOver = false;
  let gameStarted = false;
  let alienDirection = 1; // 1 = right, -1 = left
  let alienSpeed = 1;
  let alienDropDistance = 20;
  let lastAlienShot = 0;

  const alienRows = 5;
  const alienCols = 11;
  const alienWidth = 30;
  const alienHeight = 20;
  const alienPadding = 10;
  const alienOffsetTop = 50;
  const alienOffsetLeft = 30;

  function createAliens() {
    aliens = [];
    for (let row = 0; row < alienRows; row++) {
      for (let col = 0; col < alienCols; col++) {
        aliens.push({
          x: col * (alienWidth + alienPadding) + alienOffsetLeft,
          y: row * (alienHeight + alienPadding) + alienOffsetTop,
          width: alienWidth,
          height: alienHeight,
          alive: true,
          type: row < 1 ? 3 : row < 3 ? 2 : 1 // Different alien types
        });
      }
    }
  }

  function reset() {
    player.x = canvas.width / 2 - 20;
    bullets = [];
    alienBullets = [];
    createAliens();
    alienDirection = 1;
    alienSpeed = 1 + (level - 1) * 0.3;
    updateStatus();
  }

  function resetGame() {
    score = 0;
    lives = 3;
    level = 1;
    gameOver = false;
    gameStarted = false;
    reset();
  }

  function updateStatus() {
    statusEl.textContent = `Score: ${score} | Lives: ${lives} | Level: ${level}`;
  }

  function draw() {
    // Clear with transparency to show game-wrap background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle stars with theme color
    ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137) % canvas.width;
      const y = (i * 211) % canvas.height;
      ctx.fillRect(x, y, 2, 2);
    }

    // Player - cyan gradient
    const playerGradient = ctx.createLinearGradient(player.x, player.y, player.x + player.width, player.y + player.height);
    playerGradient.addColorStop(0, '#06b6d4');
    playerGradient.addColorStop(1, '#3b82f6');
    ctx.fillStyle = playerGradient;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    // Player cannon
    ctx.fillRect(player.x + 15, player.y - 5, 10, 5);

    // Aliens with theme colors
    aliens.forEach(alien => {
      if (alien.alive) {
        if (alien.type === 3) {
          ctx.fillStyle = '#ef4444'; // red
        } else if (alien.type === 2) {
          ctx.fillStyle = '#f59e0b'; // amber
        } else {
          ctx.fillStyle = '#8b5cf6'; // purple
        }
        ctx.fillRect(alien.x, alien.y, alien.width, alien.height);
        
        // Alien eyes
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(alien.x + 8, alien.y + 6, 4, 4);
        ctx.fillRect(alien.x + 18, alien.y + 6, 4, 4);
      }
    });

    // Player bullets - cyan
    ctx.fillStyle = '#06b6d4';
    bullets.forEach(bullet => {
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    // Alien bullets - red/pink
    ctx.fillStyle = '#f43f5e';
    alienBullets.forEach(bullet => {
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    // Instructions or game over
    if (!gameStarted && !gameOver) {
      ctx.fillStyle = 'rgba(10, 14, 26, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 32px Inter, "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SPACE INVADERS', canvas.width / 2, canvas.height / 2 - 60);
      ctx.fillStyle = '#f9fafb';
      ctx.font = '18px Inter, "Courier New", monospace';
      ctx.fillText('Arrow Keys: Move', canvas.width / 2, canvas.height / 2);
      ctx.fillText('SPACE: Shoot', canvas.width / 2, canvas.height / 2 + 30);
      ctx.fillText('Press SPACE to Start', canvas.width / 2, canvas.height / 2 + 70);
    }

    if (gameOver) {
      ctx.fillStyle = 'rgba(10, 14, 26, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 40px Inter, "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
      ctx.fillStyle = '#f9fafb';
      ctx.font = '20px Inter, "Courier New", monospace';
      ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.font = '16px "Courier New", monospace';
      ctx.fillText('Press SPACE to Restart', canvas.width / 2, canvas.height / 2 + 60);
    }
  }

  function update() {
    if (!gameStarted || gameOver) return;

    // Move aliens
    let shouldDrop = false;
    let rightMost = 0;
    let leftMost = canvas.width;

    aliens.forEach(alien => {
      if (alien.alive) {
        alien.x += alienDirection * alienSpeed;
        rightMost = Math.max(rightMost, alien.x + alien.width);
        leftMost = Math.min(leftMost, alien.x);
      }
    });

    if (rightMost >= canvas.width || leftMost <= 0) {
      alienDirection *= -1;
      shouldDrop = true;
    }

    if (shouldDrop) {
      aliens.forEach(alien => {
        if (alien.alive) {
          alien.y += alienDropDistance;
          // Check if aliens reached player
          if (alien.y + alien.height >= player.y) {
            lives = 0;
            endGame();
          }
        }
      });
    }

    // Aliens shoot randomly
    if (Date.now() - lastAlienShot > 1000) {
      const aliveAliens = aliens.filter(a => a.alive);
      if (aliveAliens.length > 0 && Math.random() < 0.3) {
        const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
        alienBullets.push({
          x: shooter.x + shooter.width / 2 - 2,
          y: shooter.y + shooter.height,
          width: 4,
          height: 10,
          speed: 3
        });
        lastAlienShot = Date.now();
      }
    }

    // Move bullets
    bullets.forEach((bullet, index) => {
      bullet.y -= bullet.speed;
      if (bullet.y < 0) {
        bullets.splice(index, 1);
      }
    });

    alienBullets.forEach((bullet, index) => {
      bullet.y += bullet.speed;
      if (bullet.y > canvas.height) {
        alienBullets.splice(index, 1);
      }
    });

    // Check bullet collisions with aliens
    bullets.forEach((bullet, bIndex) => {
      aliens.forEach(alien => {
        if (alien.alive &&
            bullet.x < alien.x + alien.width &&
            bullet.x + bullet.width > alien.x &&
            bullet.y < alien.y + alien.height &&
            bullet.y + bullet.height > alien.y) {
          alien.alive = false;
          bullets.splice(bIndex, 1);
          score += alien.type * 10;
          updateStatus();
        }
      });
    });

    // Check alien bullet collisions with player
    alienBullets.forEach((bullet, index) => {
      if (bullet.x < player.x + player.width &&
          bullet.x + bullet.width > player.x &&
          bullet.y < player.y + player.height &&
          bullet.y + bullet.height > player.y) {
        alienBullets.splice(index, 1);
        lives--;
        updateStatus();
        if (lives <= 0) {
          endGame();
        }
      }
    });

    // Check if all aliens are destroyed
    if (aliens.every(a => !a.alive)) {
      level++;
      reset();
    }
  }

  function endGame() {
    gameOver = true;
    gameStarted = false;
    
    // Track game over
    if (typeof gtag === 'function') {
      gtag('event', 'game_over', {
        'game_name': 'space_invaders',
        'score': score,
        'level': level,
        'lives': lives
      });
    }
  }

  function shoot() {
    if (bullets.length < 3) { // Limit bullets on screen
      bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y - 10,
        width: 4,
        height: 10,
        speed: 7
      });
    }
  }

  // Controls
  let keys = {};
  document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // Prevent page scrolling with arrow keys
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    
    if (e.key === ' ') {
      e.preventDefault();
      if (!gameStarted && !gameOver) {
        gameStarted = true;
        
        // Track game start
        if (typeof gtag === 'function') {
          gtag('event', 'game_start', {
            'game_name': 'space_invaders'
          });
        }
      } else if (gameOver) {
        resetGame();
        gameStarted = true;
        
        // Track game start
        if (typeof gtag === 'function') {
          gtag('event', 'game_start', {
            'game_name': 'space_invaders'
          });
        }
      } else {
        shoot();
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  function handleKeyboard() {
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      player.x -= player.speed;
      if (player.x < 0) player.x = 0;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      player.x += player.speed;
      if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
      }
    }
  }

  // Touch controls for mobile
  let touchStartX = 0;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    
    if (!gameStarted && !gameOver) {
      gameStarted = true;
      
      // Track game start
      if (typeof gtag === 'function') {
        gtag('event', 'game_start', {
          'game_name': 'space_invaders'
        });
      }
    } else if (gameOver) {
      resetGame();
      gameStarted = true;
      
      // Track game start
      if (typeof gtag === 'function') {
        gtag('event', 'game_start', {
          'game_name': 'space_invaders'
        });
      }
    } else {
      shoot();
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    player.x = touchX - player.width / 2;
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) {
      player.x = canvas.width - player.width;
    }
  }, { passive: false });

  // Game loop
  function gameLoop() {
    handleKeyboard();
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Reset button (if present)
  const resetBtn = document.getElementById('reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetGame();
      updateStatus();
    });
  }

  resetGame();
  draw();
  gameLoop();
});
