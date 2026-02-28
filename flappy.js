document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('flappy');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('flappy-status');

  // Disable image smoothing for crisp pixel-perfect rendering
  ctx.imageSmoothingEnabled = false;

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
  let visualFrameCount = 0;
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

  function getDistortionIntensity() {
    const level = getLevel();
    return Math.min(0.08 + (level - 1) / 40, 0.55);
  }

  function getDynamicThemeColors() {
    // Return static blue theme colors instead of dynamic rainbow colors
    return {
      birdPrimary: birdColor,        // #06b6d4 - cyan/blue
      birdSecondary: birdAccentColor, // #3b82f6 - blue
      pipeFill: pipeColor,           // #1e293b - dark slate
      pipeBorder: pipeBorderColor,   // #334155 - lighter slate
      groundLine: 'rgba(6, 182, 212, 0.3)' // cyan with transparency
    };
  }

  function applyColorDistortion() {
    const intensity = getDistortionIntensity();
    const hueRange = 10 + intensity * 46;
    const hueShift = Math.sin(visualFrameCount * 0.18) * hueRange;
    const jitterX = Math.sin(visualFrameCount * 0.42) * (0.8 + intensity * 3.2);
    const jitterY = Math.cos(visualFrameCount * 0.31) * (0.6 + intensity * 2.4);

    distortionCtx.clearRect(0, 0, canvas.width, canvas.height);
    distortionCtx.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.filter = `hue-rotate(${hueShift}deg) saturate(${1.12 + intensity * 0.85}) contrast(${1.05 + intensity * 0.4})`;
    ctx.drawImage(distortionBuffer, jitterX, jitterY, canvas.width, canvas.height);
    ctx.restore();

    const channelOffset = 0.6 + intensity * 3.2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.04 + intensity * 0.08;
    ctx.drawImage(distortionBuffer, channelOffset, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.03 + intensity * 0.07;
    ctx.drawImage(distortionBuffer, -channelOffset, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(${105 + Math.floor(70 * intensity)}, 45, ${120 + Math.floor(70 * intensity)}, ${0.03 + intensity * 0.08})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.015 + intensity * 0.05;
    for (let y = 0; y < canvas.height; y += 5) {
      ctx.fillStyle = y % 10 === 0 ? 'rgba(140,120,255,0.34)' : 'rgba(80,200,255,0.28)';
      ctx.fillRect(0, y, canvas.width, 1);
    }
    ctx.restore();
  }

  function applyPageDistortion() {
    const intensity = getDistortionIntensity();
    const phase = visualFrameCount * 0.21;
    const offsetX = Math.sin(phase * 1.37) * (0.8 + intensity * 2.4);
    const offsetY = Math.cos(phase * 1.11) * (0.6 + intensity * 1.8);
    const skewX = Math.sin(phase * 0.92) * (0.06 + intensity * 0.22);
    const skewY = Math.cos(phase * 1.24) * (0.05 + intensity * 0.18);
    const rotate = Math.sin(phase * 1.73) * (0.12 + intensity * 0.55);
    const scale = 1 + Math.sin(phase * 1.95) * (0.003 + intensity * 0.012);
    const hueShift = Math.sin(phase * 0.64) * (4 + intensity * 10);
    const brightness = 1 + Math.sin(phase * 2.1) * (0.01 + intensity * 0.03);
    const blurPx = 0.06 + Math.abs(Math.cos(phase * 2.15)) * (0.12 + intensity * 0.32);

    document.documentElement.style.willChange = 'transform, filter';
    document.documentElement.style.transformOrigin = 'center center';
    document.documentElement.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) skew(${skewX}deg, ${skewY}deg) rotate(${rotate}deg) scale(${scale})`;
    document.documentElement.style.filter = `hue-rotate(${hueShift}deg) saturate(${1.02 + intensity * 0.28}) contrast(${1.02 + intensity * 0.18}) blur(${blurPx}px) brightness(${brightness})`;
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
    visualFrameCount++;
    const dynamicColors = getDynamicThemeColors();

    // Ground line indicator (drawn first, with state management)
    ctx.save();
    ctx.strokeStyle = dynamicColors.groundLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 100);
    ctx.lineTo(canvas.width, canvas.height - 100);
    ctx.stroke();
    ctx.restore();

    // Pipes (using rounded coordinates for crisp rendering)
    ctx.fillStyle = dynamicColors.pipeFill;
    pipes.forEach(pipe => {
      const pipeX = Math.round(pipe.x);
      const topHeight = Math.round(pipe.topHeight);
      const bottomY = Math.round(pipe.bottomY);
      const bottomPipeHeight = canvas.height - 100 - bottomY;
      
      // Top pipe
      ctx.fillRect(pipeX, 0, pipeWidth, topHeight);
      // Bottom pipe - fixed to go to ground line
      ctx.fillRect(pipeX, bottomY, pipeWidth, bottomPipeHeight);
      
      // Pipe borders with theme color
      ctx.strokeStyle = dynamicColors.pipeBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(pipeX, 0, pipeWidth, topHeight);
      ctx.strokeRect(pipeX, bottomY, pipeWidth, bottomPipeHeight);
    });

    // Bird with gradient effect (using rounded coordinates)
    const birdX = Math.round(bird.x);
    const birdY = Math.round(bird.y);
    const gradient = ctx.createLinearGradient(birdX, birdY, birdX + bird.width, birdY + bird.height);
    gradient.addColorStop(0, dynamicColors.birdPrimary);
    gradient.addColorStop(1, dynamicColors.birdSecondary);
    ctx.fillStyle = gradient;
    ctx.fillRect(birdX, birdY, bird.width, bird.height);
    
    // Bird eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(birdX + 26, birdY + 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(birdX + 27, birdY + 10, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Instructions or game over
    if (!gameStarted && !gameOver) {
      ctx.save();
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
      ctx.restore();
    }

    if (gameOver) {
      ctx.save();
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
      ctx.restore();
    }

    // Score display during game
    if (gameStarted && !gameOver) {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.strokeText(score.toString(), canvas.width / 2, 50);
      ctx.fillText(score.toString(), canvas.width / 2, 50);
      ctx.restore();
    }

    // Remove distortion effects for clean rendering
    // applyPageDistortion();
    // applyColorDistortion();
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

  // Reset button
  const resetBtn = document.getElementById('reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', reset);
  }

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
