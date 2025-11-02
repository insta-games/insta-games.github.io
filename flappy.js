document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('flappy');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('flappy-status');

  // Game state
  let bird = {
    x: 80,
    y: canvas.height / 2,
    width: 34,
    height: 24,
    velocity: 0,
    gravity: 0.5,
    jump: -8
  };

  let pipes = [];
  let pipeWidth = 60;
  let pipeGap = 150;
  let pipeSpeed = 2;
  let frameCount = 0;
  let score = 0;
  let highScore = localStorage.getItem('flappyHighScore') || 0;
  let gameStarted = false;
  let gameOver = false;

  // Colors
  const skyColor = '#87CEEB';
  const birdColor = '#FFD700';
  const pipeColor = '#228B22';
  const groundColor = '#8B4513';

  function createPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - pipeGap - minHeight - 100;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    
    pipes.push({
      x: canvas.width,
      topHeight: topHeight,
      bottomY: topHeight + pipeGap,
      scored: false
    });
  }

  function reset() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes = [];
    frameCount = 0;
    score = 0;
    gameOver = false;
    gameStarted = false;
    updateStatus();
  }

  function updateStatus() {
    statusEl.textContent = `Score: ${score} | High Score: ${highScore}`;
  }

  function draw() {
    // Sky
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height - 100);

    // Ground
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

    // Bird
    ctx.fillStyle = birdColor;
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
    
    // Bird eye
    ctx.fillStyle = '#000';
    ctx.fillRect(bird.x + 24, bird.y + 8, 4, 4);

    // Pipes
    ctx.fillStyle = pipeColor;
    pipes.forEach(pipe => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY - 100);
      
      // Pipe borders
      ctx.strokeStyle = '#1a5f1a';
      ctx.lineWidth = 3;
      ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.topHeight);
      ctx.strokeRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY - 100);
    });

    // Instructions or game over
    if (!gameStarted && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Flappy Bird', canvas.width / 2, canvas.height / 2 - 40);
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText('Press SPACE or tap to start', canvas.width / 2, canvas.height / 2 + 10);
      ctx.fillText('Tap/SPACE to flap', canvas.width / 2, canvas.height / 2 + 40);
    }

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 40);
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('Press SPACE or tap to restart', canvas.width / 2, canvas.height / 2 + 40);
    }

    // Score display during game
    if (gameStarted && !gameOver) {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText(score.toString(), canvas.width / 2, 50);
      ctx.fillText(score.toString(), canvas.width / 2, 50);
    }
  }

  function update() {
    if (!gameStarted || gameOver) return;

    // Update bird
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    // Update pipes
    pipes.forEach((pipe, index) => {
      pipe.x -= pipeSpeed;

      // Score when passing pipe
      if (!pipe.scored && pipe.x + pipeWidth < bird.x) {
        pipe.scored = true;
        score++;
        updateStatus();
        
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('flappyHighScore', highScore);
          updateStatus();
        }
      }

      // Remove off-screen pipes
      if (pipe.x + pipeWidth < 0) {
        pipes.splice(index, 1);
      }
    });

    // Create new pipes
    frameCount++;
    if (frameCount % 90 === 0) {
      createPipe();
    }

    // Check collisions
    // Hit ground or ceiling
    if (bird.y + bird.height >= canvas.height - 100 || bird.y <= 0) {
      endGame();
    }

    // Hit pipes
    pipes.forEach(pipe => {
      if (bird.x + bird.width > pipe.x && bird.x < pipe.x + pipeWidth) {
        if (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomY) {
          endGame();
        }
      }
    });
  }

  function endGame() {
    gameOver = true;
    gameStarted = false;
  }

  function flap() {
    if (!gameStarted && !gameOver) {
      gameStarted = true;
      createPipe();
    }
    
    if (gameOver) {
      reset();
      return;
    }

    bird.velocity = bird.jump;
  }

  // Controls
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp') {
      e.preventDefault();
      flap();
    }
  });

  canvas.addEventListener('click', flap);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    flap();
  }, { passive: false });

  // Game loop
  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  reset();
  draw();
  gameLoop();
});
