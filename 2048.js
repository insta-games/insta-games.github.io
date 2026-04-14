document.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('board-2048');
  const scoreEl = document.getElementById('score-2048');
  const bestEl = document.getElementById('best-2048');
  const statusEl = document.getElementById('game-status-2048');
  const newGameBtn = document.getElementById('newGameBtn');

  const SIZE = 4;
  const TILE_COLORS = {
    2: ['#e2e8f0', '#0f172a'],
    4: ['#c7d2fe', '#0f172a'],
    8: ['#fbbf24', '#ffffff'],
    16: ['#fb923c', '#ffffff'],
    32: ['#f87171', '#ffffff'],
    64: ['#fb7185', '#ffffff'],
    128: ['#c084fc', '#ffffff'],
    256: ['#818cf8', '#ffffff'],
    512: ['#38bdf8', '#ffffff'],
    1024: ['#22d3ee', '#0f172a'],
    2048: ['#34d399', '#0f172a']
  };

  let grid = createGrid();
  let score = 0;
  let bestScore = loadBestScore();
  let won = false;
  let gameOver = false;
  let nextId = 1;
  let pointerStart = null;
  let tileLayer = null;

  function createGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  }

  function loadBestScore() {
    const stored = Number(localStorage.getItem('2048-best'));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  }

  function saveBestScore() {
    try {
      localStorage.setItem('2048-best', String(bestScore));
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function initBoard() {
    board.innerHTML = '';

    const background = document.createElement('div');
    background.className = 'game-2048-background';
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'game-2048-cell';
      background.appendChild(cell);
    }

    tileLayer = document.createElement('div');
    tileLayer.className = 'game-2048-tiles';

    board.append(background, tileLayer);
  }

  function resizeBoard() {
    const gap = parseFloat(getComputedStyle(board).getPropertyValue('--board-gap')) || 12;
    const innerWidth = board.clientWidth - gap * 2;
    const tileSize = Math.max(48, (innerWidth - gap * 3) / SIZE);
    board.style.setProperty('--tile-size', `${tileSize}px`);
  }

  function createTile(value, row, col) {
    return {
      id: nextId++,
      value,
      row,
      col,
      justCreated: true,
      merged: false
    };
  }

  function placeRandomTile() {
    const emptyCells = [];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (!grid[row][col]) {
          emptyCells.push([row, col]);
        }
      }
    }

    if (!emptyCells.length) return false;

    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    const tile = createTile(value, row, col);
    grid[row][col] = tile;
    return true;
  }

  function updateHud(message) {
    scoreEl.textContent = score;
    bestEl.textContent = bestScore;
    statusEl.textContent = message;
  }

  function startGame() {
    grid = createGrid();
    score = 0;
    won = false;
    gameOver = false;
    nextId = 1;
    placeRandomTile();
    placeRandomTile();
    render();
    updateHud('Use arrow keys or swipe to combine tiles.');
  }

  function colorForValue(value) {
    return TILE_COLORS[value] || ['#1d4ed8', '#ffffff'];
  }

  function fontSizeForValue(value) {
    const digits = String(value).length;
    if (digits <= 1) return 'clamp(1.6rem, 5vw, 2.5rem)';
    if (digits === 2) return 'clamp(1.45rem, 4.4vw, 2.2rem)';
    if (digits === 3) return 'clamp(1.2rem, 3.6vw, 1.95rem)';
    return 'clamp(1rem, 3vw, 1.6rem)';
  }

  function render() {
    const activeIds = new Set();

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const tile = grid[row][col];
        if (!tile) continue;

        activeIds.add(tile.id);
        let el = tileLayer.querySelector(`[data-id="${tile.id}"]`);
        const isNew = tile.justCreated;
        const isMerged = tile.merged;

        if (!el) {
          el = document.createElement('div');
          el.className = 'game-2048-tile';
          el.dataset.id = String(tile.id);
          tileLayer.appendChild(el);
        }

        const [backgroundColor, textColor] = colorForValue(tile.value);
        el.textContent = tile.value;
        el.style.setProperty('--x', tile.col);
        el.style.setProperty('--y', tile.row);
        el.style.setProperty('--tile-bg', `linear-gradient(145deg, ${backgroundColor}, ${backgroundColor})`);
        el.style.setProperty('--tile-fg', textColor);
        el.style.fontSize = fontSizeForValue(tile.value);
        el.classList.toggle('is-new', isNew);
        el.classList.toggle('is-merged', isMerged);

        if (isNew || isMerged) {
          const tileElement = el;
          window.setTimeout(() => {
            tileElement.classList.remove('is-new');
            tileElement.classList.remove('is-merged');
          }, 180);
        }

        tile.justCreated = false;
        tile.merged = false;
      }
    }

    tileLayer.querySelectorAll('.game-2048-tile').forEach((el) => {
      if (!activeIds.has(Number(el.dataset.id))) {
        el.remove();
      }
    });

    resizeBoard();
    scoreEl.textContent = score;
    bestEl.textContent = bestScore;
  }

  function linePositions(direction, index) {
    switch (direction) {
      case 'left':
        return [[index, 0], [index, 1], [index, 2], [index, 3]];
      case 'right':
        return [[index, 3], [index, 2], [index, 1], [index, 0]];
      case 'up':
        return [[0, index], [1, index], [2, index], [3, index]];
      case 'down':
        return [[3, index], [2, index], [1, index], [0, index]];
      default:
        return [];
    }
  }

  function canMerge() {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const tile = grid[row][col];
        if (!tile) continue;

        const right = col + 1 < SIZE ? grid[row][col + 1] : null;
        const down = row + 1 < SIZE ? grid[row + 1][col] : null;
        if (right && right.value === tile.value) return true;
        if (down && down.value === tile.value) return true;
      }
    }

    return false;
  }

  function hasOpenCells() {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (!grid[row][col]) return true;
      }
    }
    return false;
  }

  function finishMove(moved) {
    if (!moved) {
      if (!hasOpenCells() && !canMerge()) {
        gameOver = true;
        updateHud('No moves left. Start a new game to try again.');
      }
      return;
    }

    placeRandomTile();
    if (score > bestScore) {
      bestScore = score;
      saveBestScore();
    }

    render();

    if (!won && score >= 2048) {
      won = true;
      updateHud('You reached 2048. Keep playing for a higher score.');
    } else if (!hasOpenCells() && !canMerge()) {
      gameOver = true;
      updateHud('No moves left. Start a new game to try again.');
    } else {
      updateHud(won ? 'You reached 2048. Keep playing for a higher score.' : 'Use arrow keys or swipe to combine tiles.');
    }
  }

  function move(direction) {
    if (gameOver) return;

    const nextGrid = createGrid();
    let moved = false;

    for (let index = 0; index < SIZE; index++) {
      const positions = linePositions(direction, index);
      const lineTiles = positions.map(([row, col]) => grid[row][col]).filter(Boolean);
      let writeIndex = 0;

      for (let i = 0; i < lineTiles.length; i++) {
        const tile = lineTiles[i];
        const nextTile = lineTiles[i + 1];
        const [targetRow, targetCol] = positions[writeIndex];
        const startRow = tile.row;
        const startCol = tile.col;

        if (nextTile && nextTile.value === tile.value) {
          tile.value *= 2;
          tile.row = targetRow;
          tile.col = targetCol;
          tile.merged = true;
          nextGrid[targetRow][targetCol] = tile;
          score += tile.value;
          moved = true;
          if (tile.value === 2048) {
            won = true;
          }
          i++;
        } else {
          tile.row = targetRow;
          tile.col = targetCol;
          nextGrid[targetRow][targetCol] = tile;
          moved = moved || startRow !== targetRow || startCol !== targetCol;
        }

        writeIndex++;
      }
    }

    grid = nextGrid;
    finishMove(moved);
  }

  function handleKeydown(event) {
    const keyMap = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
      a: 'left',
      d: 'right',
      w: 'up',
      s: 'down',
      A: 'left',
      D: 'right',
      W: 'up',
      S: 'down'
    };

    const direction = keyMap[event.key];
    if (!direction) return;

    event.preventDefault();
    move(direction);
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY };
    if (typeof board.setPointerCapture === 'function') {
      board.setPointerCapture(event.pointerId);
    }
  }

  function handlePointerUp(event) {
    if (!pointerStart) return;

    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const threshold = 28;

    pointerStart = null;

    if (Math.max(absX, absY) < threshold) return;

    if (absX > absY) {
      move(deltaX > 0 ? 'right' : 'left');
    } else {
      move(deltaY > 0 ? 'down' : 'up');
    }
  }

  newGameBtn.addEventListener('click', startGame);
  document.addEventListener('keydown', handleKeydown);
  board.addEventListener('pointerdown', handlePointerDown);
  board.addEventListener('pointerup', handlePointerUp);
  board.addEventListener('pointercancel', () => {
    pointerStart = null;
  });
  board.addEventListener('click', () => board.focus());
  window.addEventListener('resize', () => {
    resizeBoard();
    render();
  });

  initBoard();
  startGame();
});
