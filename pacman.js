document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('pacman');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('pacman-status');
  const resetBtn = document.getElementById('reset');
  const mode = window.FORCE_MULTIPLAYER ? 'multi' : 'single';

  const tileSize = 24;
  const cols = 21;
  const rows = 21;
  const tickMs = 160;
  const totalTimeTicks = 750;
  const highScoreKey = 'pacman-highscore';

  const pacmanSpawn = { x: 1, y: 10 };
  const ghostSpawnsSingle = [
    { x: 19, y: 10 },
    { x: 19, y: 1 },
    { x: 19, y: 19 },
    { x: 10, y: 1 }
  ];
  const ghostSpawnMulti = { x: 19, y: 10 };

  const directions = [
    { name: 'up', x: 0, y: -1 },
    { name: 'down', x: 0, y: 1 },
    { name: 'left', x: -1, y: 0 },
    { name: 'right', x: 1, y: 0 }
  ];

  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;

  let layout = buildLayout();
  let maze = [];
  let pacman;
  let ghosts = [];
  let score = 0;
  let lives = mode === 'single' ? 3 : 1;
  let level = 1;
  let highScore = Number.parseInt(localStorage.getItem(highScoreKey), 10);
  if (!Number.isFinite(highScore)) highScore = 0;
  let pelletsLeft = 0;
  let running = false;
  let gameOver = false;
  let levelCleared = false;
  let powerTicks = 0;
  let timeRemainingTicks = totalTimeTicks;
  let tickCount = 0;
  let intervalId = null;
  let message = 'Press an arrow key or click the board to start.';

  function buildLayout() {
    const grid = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => {
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) return '#';
      return '.';
    }));

    const markVertical = (x, segments) => {
      segments.forEach(([startY, endY]) => {
        for (let y = startY; y <= endY; y += 1) grid[y][x] = '#';
      });
    };

    const markHorizontal = (y, segments) => {
      segments.forEach(([startX, endX]) => {
        for (let x = startX; x <= endX; x += 1) grid[y][x] = '#';
      });
    };

    markVertical(4, [[2, 8], [12, 18]]);
    markVertical(8, [[2, 4], [6, 14], [16, 18]]);
    markVertical(12, [[2, 8], [12, 18]]);
    markVertical(16, [[2, 4], [6, 14], [16, 18]]);

    markHorizontal(4, [[2, 8], [12, 18]]);
    markHorizontal(8, [[2, 4], [6, 14], [16, 18]]);
    markHorizontal(12, [[2, 8], [12, 18]]);
    markHorizontal(16, [[2, 4], [6, 14], [16, 18]]);

    [[1, 1], [19, 1], [1, 19], [19, 19]].forEach(([x, y]) => {
      grid[y][x] = 'o';
    });

    [pacmanSpawn, ...ghostSpawnsSingle, ghostSpawnMulti].forEach(({ x, y }) => {
      if (grid[y] && grid[y][x] !== '#') grid[y][x] = ' ';
    });

    return grid;
  }

  function cloneLayout() {
    return layout.map((row) => row.slice());
  }

  function sameDirection(a, b) {
    return a && b && a.x === b.x && a.y === b.y;
  }

  function oppositeDirection(dir) {
    return { x: -dir.x, y: -dir.y };
  }

  function isWalkable(x, y) {
    return y >= 0 && y < rows && x >= 0 && x < cols && maze[y][x] !== '#';
  }

  function canMoveFrom(x, y, dir) {
    if (!dir || (dir.x === 0 && dir.y === 0)) return false;
    return isWalkable(x + dir.x, y + dir.y);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function saveHighScore() {
    if (score > highScore) {
      highScore = score;
      try {
        localStorage.setItem(highScoreKey, String(highScore));
      } catch (error) {
        // Ignore storage errors.
      }
    }
  }

  function addScore(points) {
    score += points;
    saveHighScore();
  }

  function setMessage(text) {
    message = text;
  }

  function countPellets() {
    let count = 0;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (maze[y][x] === '.' || maze[y][x] === 'o') count += 1;
      }
    }
    pelletsLeft = count;
  }

  function createPacman() {
    return {
      x: pacmanSpawn.x,
      y: pacmanSpawn.y,
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 }
    };
  }

  function createSingleGhosts() {
    const palette = ['#ef4444', '#f59e0b', '#06b6d4', '#a855f7'];
    const strategies = ['direct', 'ahead', 'flank', 'wander'];

    return ghostSpawnsSingle.map((spawn, index) => ({
      x: spawn.x,
      y: spawn.y,
      homeX: spawn.x,
      homeY: spawn.y,
      dir: { x: -1, y: 0 },
      nextDir: { x: -1, y: 0 },
      color: palette[index % palette.length],
      strategy: strategies[index % strategies.length]
    }));
  }

  function createMultiGhost() {
    return [{
      x: ghostSpawnMulti.x,
      y: ghostSpawnMulti.y,
      homeX: ghostSpawnMulti.x,
      homeY: ghostSpawnMulti.y,
      dir: { x: -1, y: 0 },
      nextDir: { x: -1, y: 0 },
      color: '#ef4444',
      controlled: true
    }];
  }

  function resetPositions() {
    pacman = createPacman();
    ghosts = mode === 'single' ? createSingleGhosts() : createMultiGhost();
    powerTicks = 0;
  }

  function startLevel() {
    maze = cloneLayout();
    resetPositions();
    countPellets();
    running = false;
    gameOver = false;
    levelCleared = false;
    timeRemainingTicks = totalTimeTicks;
    tickCount = 0;
    if (mode === 'single' && level === 1) {
      score = 0;
      lives = 3;
    }
    if (mode === 'multi') {
      score = 0;
      lives = 1;
    }
    if (mode === 'single') {
      setMessage('Press an arrow key or click the board to start.');
    } else {
      setMessage('Player 1 uses arrows. Player 2 uses WASD.');
    }
    updateStatus();
    draw();
  }

  function restartGame() {
    level = 1;
    score = 0;
    lives = mode === 'single' ? 3 : 1;
    highScore = Number.parseInt(localStorage.getItem(highScoreKey), 10);
    if (!Number.isFinite(highScore)) highScore = 0;
    startLevel();
  }

  function updateStatus() {
    if (!statusEl) return;
    if (mode === 'single') {
      statusEl.textContent = `Score: ${score} | Lives: ${lives} | Level: ${level} | High Score: ${highScore}`;
      return;
    }

    const timeLeft = Math.max(0, Math.ceil(timeRemainingTicks / 10));
    statusEl.textContent = `Pac-Man: ${score} | Pellets Left: ${pelletsLeft} | Time: ${timeLeft}s`;
  }

  function eatPelletAt(x, y) {
    const cell = maze[y][x];
    if (cell === '.') {
      maze[y][x] = ' ';
      pelletsLeft -= 1;
      addScore(10);
      return true;
    }
    if (cell === 'o') {
      maze[y][x] = ' ';
      pelletsLeft -= 1;
      addScore(50);
      powerTicks = 45;
      return true;
    }
    return false;
  }

  function moveEntity(entity) {
    if (entity.nextDir && canMoveFrom(entity.x, entity.y, entity.nextDir)) {
      entity.dir = { x: entity.nextDir.x, y: entity.nextDir.y };
      entity.nextDir = null;
    }

    if (canMoveFrom(entity.x, entity.y, entity.dir)) {
      entity.x += entity.dir.x;
      entity.y += entity.dir.y;
    }
  }

  function getPacmanAheadTile(distance) {
    return {
      x: clamp(pacman.x + pacman.dir.x * distance, 1, cols - 2),
      y: clamp(pacman.y + pacman.dir.y * distance, 1, rows - 2)
    };
  }

  function chooseGhostDirection(ghost) {
    const options = directions.filter((dir) => canMoveFrom(ghost.x, ghost.y, dir));
    if (!options.length) return ghost.dir;

    const reversed = oppositeDirection(ghost.dir);
    let candidates = options.filter((dir) => !sameDirection(dir, reversed));
    if (!candidates.length) candidates = options;

    let target = { x: pacman.x, y: pacman.y };
    if (ghost.strategy === 'ahead') {
      target = getPacmanAheadTile(3);
    } else if (ghost.strategy === 'flank') {
      target = {
        x: clamp(pacman.x + pacman.dir.y * 3, 1, cols - 2),
        y: clamp(pacman.y - pacman.dir.x * 3, 1, rows - 2)
      };
    } else if (ghost.strategy === 'wander') {
      target = {
        x: Math.random() > 0.5 ? pacman.x : ghost.homeX,
        y: Math.random() > 0.5 ? pacman.y : ghost.homeY
      };
    }

    let bestDir = candidates[0];
    let bestScore = Infinity;
    candidates.forEach((dir) => {
      const nx = ghost.x + dir.x;
      const ny = ghost.y + dir.y;
      let scoreToTarget = Math.abs(nx - target.x) + Math.abs(ny - target.y);
      if (sameDirection(dir, ghost.dir)) scoreToTarget -= 0.2;
      scoreToTarget += Math.random() * 0.35;
      if (scoreToTarget < bestScore) {
        bestScore = scoreToTarget;
        bestDir = dir;
      }
    });

    return bestDir;
  }

  function resetGhost(ghost) {
    ghost.x = ghost.homeX;
    ghost.y = ghost.homeY;
    ghost.dir = { x: -1, y: 0 };
    ghost.nextDir = { x: -1, y: 0 };
  }

  function handleCollision(ghost) {
    if (ghost.x !== pacman.x || ghost.y !== pacman.y) return false;

    if (powerTicks > 0) {
      addScore(200);
      resetGhost(ghost);
      return false;
    }

    if (mode === 'single') {
      lives -= 1;
      if (lives <= 0) {
        gameOver = true;
        running = false;
        saveHighScore();
        setMessage('Game Over. Press any key or click Reset to try again.');
        return true;
      }

      resetPositions();
      setMessage(`Ouch. Lives left: ${lives}. Keep going.`);
      return false;
    }

    gameOver = true;
    running = false;
    setMessage('Ghost wins! Press any key or click Reset to play again.');
    return true;
  }

  function maybeAdvanceLevel() {
    if (mode !== 'single' || pelletsLeft > 0) return;

    levelCleared = true;
    running = false;
    addScore(500);
    setMessage(`Level ${level} cleared! Press any key for the next maze.`);
    updateStatus();
    draw();
  }

  function step() {
    if (!running || gameOver || levelCleared) return;

    tickCount += 1;
    if (mode === 'multi') {
      timeRemainingTicks -= 1;
      if (timeRemainingTicks <= 0) {
        gameOver = true;
        running = false;
        setMessage('Pac-Man survives the duel! Press any key or click Reset to play again.');
        updateStatus();
        draw();
        return;
      }
    }

    moveEntity(pacman);
    eatPelletAt(pacman.x, pacman.y);

    ghosts.forEach((ghost) => {
      if (mode === 'single') {
        ghost.nextDir = chooseGhostDirection(ghost);
      }
      moveEntity(ghost);
    });

    if (powerTicks > 0) powerTicks -= 1;

    for (const ghost of ghosts) {
      if (handleCollision(ghost)) {
        updateStatus();
        draw();
        return;
      }
    }

    maybeAdvanceLevel();
    updateStatus();
    draw();
  }

  function drawWall(x, y) {
    const px = x * tileSize;
    const py = y * tileSize;
    const radius = 6;

    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.moveTo(px + radius, py);
    ctx.lineTo(px + tileSize - radius, py);
    ctx.quadraticCurveTo(px + tileSize, py, px + tileSize, py + radius);
    ctx.lineTo(px + tileSize, py + tileSize - radius);
    ctx.quadraticCurveTo(px + tileSize, py + tileSize, px + tileSize - radius, py + tileSize);
    ctx.lineTo(px + radius, py + tileSize);
    ctx.quadraticCurveTo(px, py + tileSize, px, py + tileSize - radius);
    ctx.lineTo(px, py + radius);
    ctx.quadraticCurveTo(px, py, px + radius, py);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawPellet(x, y, cell) {
    const px = x * tileSize + tileSize / 2;
    const py = y * tileSize + tileSize / 2;

    ctx.fillStyle = cell === 'o' ? '#fef08a' : '#f8fafc';
    ctx.beginPath();
    ctx.arc(px, py, cell === 'o' ? 6 : 2.7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPacman() {
    const px = pacman.x * tileSize + tileSize / 2;
    const py = pacman.y * tileSize + tileSize / 2;
    const open = 0.25 + Math.abs(Math.sin(tickCount * 0.55)) * 0.25;
    let angle = 0;

    if (pacman.dir.x === -1) angle = Math.PI;
    else if (pacman.dir.y === -1) angle = -Math.PI / 2;
    else if (pacman.dir.y === 1) angle = Math.PI / 2;

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, tileSize * 0.42, angle + open * Math.PI, angle + (2 - open) * Math.PI, false);
    ctx.closePath();
    ctx.fill();
  }

  function drawGhost(ghost) {
    const px = ghost.x * tileSize + tileSize / 2;
    const py = ghost.y * tileSize + tileSize / 2;
    const bodyColor = powerTicks > 0 && mode === 'single' ? '#60a5fa' : ghost.color;

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(px, py - 2, tileSize * 0.38, Math.PI, 0, false);
    ctx.lineTo(px + tileSize * 0.38, py + tileSize * 0.3);
    ctx.lineTo(px + tileSize * 0.22, py + tileSize * 0.18);
    ctx.lineTo(px, py + tileSize * 0.3);
    ctx.lineTo(px - tileSize * 0.22, py + tileSize * 0.18);
    ctx.lineTo(px - tileSize * 0.38, py + tileSize * 0.3);
    ctx.closePath();
    ctx.fill();

    const eyeOffsetX = ghost.dir.x === -1 ? -2 : ghost.dir.x === 1 ? 2 : 0;
    const eyeOffsetY = ghost.dir.y === -1 ? -2 : ghost.dir.y === 1 ? 2 : 0;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - 4, py - 4, 3.5, 0, Math.PI * 2);
    ctx.arc(px + 4, py - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(px - 4 + eyeOffsetX, py - 4 + eyeOffsetY, 1.5, 0, Math.PI * 2);
    ctx.arc(px + 4 + eyeOffsetX, py - 4 + eyeOffsetY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawOverlay() {
    if (running && !gameOver && !levelCleared) return;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px Inter, Arial, sans-serif';

    let header = message;
    if (!running && !gameOver && !levelCleared) {
      header = mode === 'single'
        ? 'Pac-Man'
        : 'Pac-Man Duel';
    }

    ctx.fillText(header, canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = '16px Inter, Arial, sans-serif';

    let subtext = '';
    if (!running && !gameOver && !levelCleared) {
      subtext = mode === 'single'
        ? 'Collect every pellet and avoid the ghosts.'
        : 'Pac-Man survives by clearing the maze or outlasting the ghost.';
    } else if (gameOver) {
      subtext = mode === 'single'
        ? `Final score: ${score}`
        : `Pac-Man score: ${score}`;
    } else if (levelCleared) {
      subtext = `Score: ${score}`;
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 24);
  }

  function draw() {
    const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    background.addColorStop(0, '#020617');
    background.addColorStop(1, '#0f172a');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (maze[y][x] === '#') {
          drawWall(x, y);
        } else if (maze[y][x] === '.' || maze[y][x] === 'o') {
          drawPellet(x, y, maze[y][x]);
        }
      }
    }

    ghosts.forEach(drawGhost);
    drawPacman();
    drawOverlay();
  }

  function beginRunning() {
    if (gameOver) {
      restartGame();
    } else if (levelCleared) {
      level += 1;
      levelCleared = false;
      startLevel();
    }

    if (!running) {
      running = true;
      setMessage(mode === 'single'
        ? 'Eat every pellet and avoid the ghosts.'
        : 'Pac-Man is running. The ghost is hunting.');
    }

    updateStatus();
  }

  function setPacmanDirection(dir) {
    pacman.nextDir = dir;
    beginRunning();
  }

  function setGhostDirection(dir) {
    if (mode !== 'multi' || !ghosts[0]) return;
    ghosts[0].nextDir = dir;
    beginRunning();
  }

  document.addEventListener('keydown', (event) => {
    const key = event.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D', ' '].includes(key)) {
      try {
        event.preventDefault();
      } catch (error) {
        // Ignore scroll prevention failures.
      }
    }

    if (key === 'ArrowUp' || (mode === 'single' && (key === 'w' || key === 'W'))) setPacmanDirection({ x: 0, y: -1 });
    if (key === 'ArrowDown' || (mode === 'single' && (key === 's' || key === 'S'))) setPacmanDirection({ x: 0, y: 1 });
    if (key === 'ArrowLeft' || (mode === 'single' && (key === 'a' || key === 'A'))) setPacmanDirection({ x: -1, y: 0 });
    if (key === 'ArrowRight' || (mode === 'single' && (key === 'd' || key === 'D'))) setPacmanDirection({ x: 1, y: 0 });

    if (key === ' ') {
      beginRunning();
    }

    if (!running && !gameOver && !levelCleared && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D', ' '].includes(key)) {
      beginRunning();
    }
  });

  canvas.addEventListener('click', () => {
    beginRunning();
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      restartGame();
    });
  }

  startLevel();
  intervalId = window.setInterval(step, tickMs);

  window.addEventListener('beforeunload', () => {
    if (intervalId) window.clearInterval(intervalId);
  });
});