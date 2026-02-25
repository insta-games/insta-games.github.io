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
  const basePipeGap = 150;
  const basePipeSpeed = 2;
  let pipeGap = basePipeGap;
  let pipeSpeed = basePipeSpeed;
  let frameCount = 0;
  let score = 0;
  let highScore = localStorage.getItem('flappyHighScore') || 0;
  let gameStarted = false;
  let gameOver = false;

  const distortionBuffer = document.createElement('canvas');
  distortionBuffer.width = canvas.width;
  distortionBuffer.height = canvas.height;
  const distortionCtx = distortionBuffer.getContext('2d');

  // Colors - matching website theme
  const birdColor = '#06b6d4'; // cyan accent
  const birdAccentColor = '#3b82f6'; // blue accent
  const pipeColor = '#1e293b'; // dark slate
  const pipeBorderColor = '#334155'; // lighter slate

  function getLevel() {
    return Math.floor(score / 10) + 1;
  }

  function updateDifficulty() {
    const level = getLevel();
    const regularProgress = Math.max(0, level - 1);
    const extremeProgress = Math.max(0, level - 14);

    pipeSpeed =
      basePipeSpeed +
      Math.min(regularProgress * 0.03, 1.8) +
      Math.min(extremeProgress * 0.035, 2.2);

    pipeGap =
      basePipeGap -
      Math.min(regularProgress * 0.45, 32) -
      Math.min(extremeProgress * 0.55, 28);
  }

  function getPipeSpawnInterval() {
    const level = getLevel();
    const regularProgress = Math.max(0, level - 1);
    const extremeProgress = Math.max(0, level - 14);
    return Math.max(46, Math.floor(90 - regularProgress * 0.25 - extremeProgress * 0.35));
  }

  function getDynamicThemeColors() {
    const level = getLevel();
    const intensity = Math.min((level - 1) / 28, 1);
    const phase = frameCount * (0.14 + intensity * 0.12);

    const birdHue = (190 + Math.sin(phase) * (55 + intensity * 85) + 360) % 360;
    const birdHueSecondary = (birdHue + 70 + intensity * 55) % 360;
    const pipeHue = (220 + Math.cos(phase * 0.8) * (45 + intensity * 75) + 360) % 360;
    const borderHue = (pipeHue + 28 + intensity * 18) % 360;
    const groundHue = (birdHue + 22) % 360;

    return {
      birdPrimary: `hsl(${birdHue}, ${78 + intensity * 20}%, ${54 + intensity * 8}%)`,
      birdSecondary: `hsl(${birdHueSecondary}, ${76 + intensity * 20}%, ${50 + intensity * 8}%)`,
      pipeFill: `hsl(${pipeHue}, ${55 + intensity * 30}%, ${24 + intensity * 14}%)`,
      pipeBorder: `hsl(${borderHue}, ${62 + intensity * 28}%, ${35 + intensity * 14}%)`,
      groundLine: `hsla(${groundHue}, ${85 + intensity * 12}%, ${58 + intensity * 10}%, ${0.35 + intensity * 0.35})`
    };
  }

  function applyColorDistortion() {
    const level = getLevel();
    const intensity = Math.min(0.22 + (level - 1) / 24, 1);
    const hueRange = 14 + intensity * 58;
    const hueShift = Math.sin(frameCount * 0.18) * hueRange;
    const jitterX = Math.sin(frameCount * 0.42) * (2.4 + intensity * 8.5);
    const jitterY = Math.cos(frameCount * 0.31) * (1.6 + intensity * 4.4);

    distortionCtx.clearRect(0, 0, canvas.width, canvas.height);
    distortionCtx.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.filter = `hue-rotate(${hueShift}deg) saturate(${1.35 + intensity * 2.3}) contrast(${1.12 + intensity * 0.9})`;
    ctx.drawImage(distortionBuffer, jitterX, jitterY, canvas.width, canvas.height);
    ctx.restore();

    const channelOffset = 1 + intensity * 6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.1 + intensity * 0.2;
    ctx.drawImage(distortionBuffer, channelOffset, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.08 + intensity * 0.18;
    ctx.drawImage(distortionBuffer, -channelOffset, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(${125 + Math.floor(110 * intensity)}, 35, ${145 + Math.floor(105 * intensity)}, ${0.07 + intensity * 0.2})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.07 + intensity * 0.17;
    for (let y = 0; y < canvas.height; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? 'rgba(255,20,110,0.65)' : 'rgba(0,220,255,0.58)';
      ctx.fillRect(0, y, canvas.width, 1);
    }
    ctx.restore();
  }

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
    pipeGap = basePipeGap;
    pipeSpeed = basePipeSpeed;
    gameOver = false;
    gameStarted = false;
    updateStatus();
  }

  function updateStatus() {
    statusEl.textContent = `Score: ${score} | Level: ${getLevel()} | High Score: ${highScore}`;
  }

  function draw() {
    // Clear with transparency to show game-wrap background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dynamicColors = getDynamicThemeColors();

    // Pipes
    ctx.fillStyle = dynamicColors.pipeFill;
    pipes.forEach(pipe => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY - 100);
      
      // Pipe borders with theme color
      ctx.strokeStyle = dynamicColors.pipeBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.topHeight);
      ctx.strokeRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY - 100);
    });

    // Bird with gradient effect
    const gradient = ctx.createLinearGradient(bird.x, bird.y, bird.x + bird.width, bird.y + bird.height);
    gradient.addColorStop(0, dynamicColors.birdPrimary);
    gradient.addColorStop(1, dynamicColors.birdSecondary);
    ctx.fillStyle = gradient;
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
    
    // Bird eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bird.x + 26, bird.y + 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(bird.x + 27, bird.y + 10, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Ground line indicator
    ctx.strokeStyle = dynamicColors.groundLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 100);
    ctx.lineTo(canvas.width, canvas.height - 100);
    ctx.stroke();
    ctx.setLineDash([]);

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

    applyColorDistortion();
  }

  function update() {
    if (!gameStarted || gameOver) return;

    updateDifficulty();

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
    if (frameCount % getPipeSpawnInterval() === 0) {
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
    
    // Track game over
    if (typeof gtag === 'function') {
      gtag('event', 'game_over', {
        'game_name': 'flappy_bird',
        'score': score,
        'high_score': highScore
      });
    }
  }

  function flap() {
    if (!gameStarted && !gameOver) {
      gameStarted = true;
      createPipe();
      
      // Track game start
      if (typeof gtag === 'function') {
        gtag('event', 'game_start', {
          'game_name': 'flappy_bird'
        });
      }
    }
    
    if (gameOver) {
      reset();
      return;
    }

    bird.velocity = bird.jump;
  }

  // Controls
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
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
