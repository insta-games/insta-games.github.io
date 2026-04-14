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
  const tickMs = 180;
  const multiRoundTicks = Math.round(120000 / tickMs);
  const highScoreKey = 'pacman-highscore';

  const tunnelRow = 10;
  const ghostHouse = { left: 8, right: 12, top: 8, bottom: 12 };
  const pacmanSpawn = { x: 1, y: tunnelRow };
  const ghostSpawnsSingle = [
    { name: 'blinky', color: '#ef4444', x: 10, y: 7, scatterTarget: { x: cols - 1, y: 0 } },
    { name: 'pinky', color: '#f472b6', x: 9, y: 10, scatterTarget: { x: 0, y: 0 } },
    { name: 'inky', color: '#22d3ee', x: 10, y: 10, scatterTarget: { x: cols - 1, y: rows - 1 } },
    { name: 'clyde', color: '#f97316', x: 11, y: 10, scatterTarget: { x: 0, y: rows - 1 } }
  ];
  const ghostSpawnMulti = { name: 'blinky', color: '#ef4444', x: 10, y: 7, scatterTarget: { x: cols - 1, y: 0 } };

  const ghostPhaseSchedule = [
    { mode: 'scatter', ticks: 50 },
    { mode: 'chase', ticks: 120 },
    { mode: 'scatter', ticks: 40 },
    { mode: 'chase', ticks: 120 },
    { mode: 'scatter', ticks: 30 },
    { mode: 'chase', ticks: Infinity }
  ];

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
  let timeRemainingTicks = multiRoundTicks;
  let tickCount = 0;
  let intervalId = null;
  let message = 'Press an arrow key or click the board to start.';
  let ghostPhaseIndex = 0;
  let ghostPhaseTicks = ghostPhaseSchedule[0].ticks;
  let extraLifeAwarded = false;

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

    for (let y = ghostHouse.top; y <= ghostHouse.bottom; y += 1) {
      for (let x = ghostHouse.left; x <= ghostHouse.right; x += 1) {
        const isBorder = y === ghostHouse.top || y === ghostHouse.bottom || x === ghostHouse.left || x === ghostHouse.right;
        grid[y][x] = isBorder ? '#' : ' ';
      }
    }
    grid[ghostHouse.top][10] = 'G';

    grid[tunnelRow][0] = ' ';
    grid[tunnelRow][cols - 1] = ' ';

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

  function isWalkable(x, y, kind = 'pacman') {
    if (x < 0 || y < 0 || y >= rows) return false;
    if (x >= cols) return false;
    const cell = maze[y][x];
    if (cell === '#') return false;
    if (kind === 'pacman' && cell === 'G') return false;
    return true;
  }

  function canMoveFrom(x, y, dir, kind = 'pacman') {
    if (!dir || (dir.x === 0 && dir.y === 0)) return false;
    const nextX = x + dir.x;
    const nextY = y + dir.y;

    if (y === tunnelRow && dir.x !== 0 && (nextX < 0 || nextX >= cols)) {
      return true;
    }

    return isWalkable(nextX, nextY, kind);
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
    if (!extraLifeAwarded && score >= 10000) {
      lives += 1;
      extraLifeAwarded = true;
    }
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
      kind: 'pacman',
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 }
    };
  }

  function createSingleGhosts() {
    return ghostSpawnsSingle.map((spawn) => ({
      x: spawn.x,
      y: spawn.y,
      homeX: spawn.x,
      homeY: spawn.y,
      kind: 'ghost',
      name: spawn.name,
      color: spawn.color,
      scatterTarget: spawn.scatterTarget,
      dir: { x: 0, y: -1 },
      nextDir: { x: 0, y: -1 },
      released: spawn.name === 'blinky',
      releaseDelay: spawn.name === 'blinky' ? 0 : 10 + Math.floor(Math.random() * 25)
    }));
  }

  function createMultiGhost() {
    return [{
      x: ghostSpawnMulti.x,
      y: ghostSpawnMulti.y,
      homeX: ghostSpawnMulti.x,
      homeY: ghostSpawnMulti.y,
      kind: 'ghost',
      name: ghostSpawnMulti.name,
      dir: { x: -1, y: 0 },
      nextDir: { x: -1, y: 0 },
      color: ghostSpawnMulti.color,
      scatterTarget: ghostSpawnMulti.scatterTarget,
      controlled: true,
      released: true,
      releaseDelay: 0
    }];
  }

  function resetPositions() {
    pacman = createPacman();
    ghosts = mode === 'single' ? createSingleGhosts() : createMultiGhost();
    powerTicks = 0;
    ghostPhaseIndex = 0;
    ghostPhaseTicks = ghostPhaseSchedule[0].ticks;
  }

  function startLevel() {
    maze = cloneLayout();
    resetPositions();
    countPellets();
    running = false;
    gameOver = false;
    levelCleared = false;
    timeRemainingTicks = multiRoundTicks;
    tickCount = 0;
    if (mode === 'single' && level === 1) {
      score = 0;
      lives = 3;
      extraLifeAwarded = false;
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
    extraLifeAwarded = false;
    highScore = Number.parseInt(localStorage.getItem(highScoreKey), 10);
    if (!Number.isFinite(highScore)) highScore = 0;
    startLevel();
  }

  function updateStatus() {
    if (!statusEl) return;
    if (mode === 'single') {
      statusEl.textContent = `Score: ${score} | Lives: ${lives} | High Score: ${highScore}`;
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
      powerTicks = 50;
      ghosts.forEach((ghost) => {
        ghost.dir = oppositeDirection(ghost.dir);
        ghost.nextDir = ghost.dir;
      });
      return true;
    }
    return false;
  }

  function moveEntity(entity) {
    if (entity.nextDir && canMoveFrom(entity.x, entity.y, entity.nextDir, entity.kind)) {
      entity.dir = { x: entity.nextDir.x, y: entity.nextDir.y };
      entity.nextDir = null;
    }

    const nextX = entity.x + entity.dir.x;
    const nextY = entity.y + entity.dir.y;

    if (entity.dir.x !== 0 && entity.y === tunnelRow && (nextX < 0 || nextX >= cols)) {
      entity.x = nextX < 0 ? cols - 1 : 0;
      return;
    }

    if (canMoveFrom(entity.x, entity.y, entity.dir, entity.kind)) {
      entity.x = nextX;
      entity.y = nextY;
    }
  }

  function getPacmanAheadTile(distance) {
    return {
      x: clamp(pacman.x + pacman.dir.x * distance, 1, cols - 2),
      y: clamp(pacman.y + pacman.dir.y * distance, 1, rows - 2)
    };
  }

  function getGhostPhase() {
    return ghostPhaseSchedule[Math.min(ghostPhaseIndex, ghostPhaseSchedule.length - 1)];
  }

  function advanceGhostPhase() {
    if (mode !== 'single' || powerTicks > 0) return;
    if (ghostPhaseSchedule[ghostPhaseIndex].ticks === Infinity) return;

    ghostPhaseTicks -= 1;
    if (ghostPhaseTicks <= 0 && ghostPhaseIndex < ghostPhaseSchedule.length - 1) {
      ghostPhaseIndex += 1;
      ghostPhaseTicks = ghostPhaseSchedule[ghostPhaseIndex].ticks;
      ghosts.forEach((ghost) => {
        ghost.dir = oppositeDirection(ghost.dir);
        ghost.nextDir = ghost.dir;
      });
    }
  }

  function getGhostTarget(ghost) {
    const phase = getGhostPhase().mode;

    if (phase === 'scatter') {
      return ghost.scatterTarget;
    }

    if (ghost.name === 'blinky') {
      return { x: pacman.x, y: pacman.y };
    }

    if (ghost.name === 'pinky') {
      return getPacmanAheadTile(4);
    }

    if (ghost.name === 'inky') {
      const ahead = getPacmanAheadTile(2);
      const blinky = ghosts.find((item) => item.name === 'blinky') || ghosts[0];
      return {
        x: clamp(ahead.x + (ahead.x - blinky.x), 0, cols - 1),
        y: clamp(ahead.y + (ahead.y - blinky.y), 0, rows - 1)
      };
    }

    if (ghost.name === 'clyde') {
      return manhattan({ x: ghost.x, y: ghost.y }, pacman) > 8 ? { x: pacman.x, y: pacman.y } : ghost.scatterTarget;
    }

    return { x: pacman.x, y: pacman.y };
  }

  function manhattan(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function chooseGhostDirection(ghost) {
    const options = directions.filter((dir) => canMoveFrom(ghost.x, ghost.y, dir, 'ghost'));
    if (!options.length) return ghost.dir;

    if (powerTicks > 0) {
      let safestDir = options[0];
      let safestScore = -Infinity;
      options.forEach((dir) => {
        const nx = ghost.x + dir.x;
        const ny = ghost.y + dir.y;
        const scoreAway = Math.abs(nx - pacman.x) + Math.abs(ny - pacman.y);
        if (scoreAway > safestScore) {
          safestScore = scoreAway;
          safestDir = dir;
        }
      });
      return safestDir;
    }

    const reversed = oppositeDirection(ghost.dir);
    let candidates = options.filter((dir) => !sameDirection(dir, reversed));
    if (!candidates.length) candidates = options;

    const target = getGhostTarget(ghost);

    let bestDir = candidates[0];
    let bestScore = Infinity;
    candidates.forEach((dir) => {
      const nx = ghost.x + dir.x;
      const ny = ghost.y + dir.y;
      let scoreToTarget = manhattan({ x: nx, y: ny }, target);
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
    ghost.dir = { x: 0, y: -1 };
    ghost.nextDir = { x: 0, y: -1 };
    ghost.released = true;
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

    if (powerTicks > 0) powerTicks -= 1;
    if (mode === 'single') advanceGhostPhase();

    moveEntity(pacman);
    eatPelletAt(pacman.x, pacman.y);

    ghosts.forEach((ghost) => {
      if (mode === 'single' && ghost.released) {
        ghost.nextDir = chooseGhostDirection(ghost);
      } else if (mode === 'single' && !ghost.released) {
        if (ghost.releaseDelay > 0) {
          ghost.releaseDelay -= 1;
        } else {
          ghost.released = true;
        }
        if (ghost.released) {
          ghost.nextDir = chooseGhostDirection(ghost);
        }
      }
      moveEntity(ghost);
    });

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

  function drawGate(x, y) {
    const px = x * tileSize;
    const py = y * tileSize + tileSize / 2;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 4, py - 4);
    ctx.lineTo(px + tileSize - 4, py - 4);
    ctx.moveTo(px + 4, py + 4);
    ctx.lineTo(px + tileSize - 4, py + 4);
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
    const bodyColor = powerTicks > 0 ? '#2563eb' : ghost.color;

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
        } else if (maze[y][x] === 'G') {
          drawGate(x, y);
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
        ? 'Chase the pellets, use power pellets, and trap the ghosts.'
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