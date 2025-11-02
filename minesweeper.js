document.addEventListener('DOMContentLoaded', () => {
  const gridEl = document.getElementById('minesweeper-grid');
  const easyBtn = document.getElementById('easyBtn');
  const mediumBtn = document.getElementById('mediumBtn');
  const hardBtn = document.getElementById('hardBtn');
  const restartBtn = document.getElementById('restart');
  const mineCountEl = document.getElementById('mine-count');
  const timerEl = document.getElementById('timer');
  const statusEl = document.getElementById('game-status');
  const difficultyText = document.getElementById('difficultyText');

  let grid = [];
  let rows = 9;
  let cols = 9;
  let mines = 10;
  let difficulty = 'easy';
  let gameStarted = false;
  let gameOver = false;
  let timerInterval = null;
  let seconds = 0;
  let flaggedCells = 0;
  let revealedCells = 0;

  const difficulties = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
  };

  function initGame() {
    gameStarted = false;
    gameOver = false;
    seconds = 0;
    flaggedCells = 0;
    revealedCells = 0;
    timerEl.textContent = '0';
    statusEl.textContent = '';
    
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    const config = difficulties[difficulty];
    rows = config.rows;
    cols = config.cols;
    mines = config.mines;
    mineCountEl.textContent = mines;

    // Create empty grid
    grid = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = {
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0
        };
      }
    }

    renderGrid();
  }

  function placeMines(firstRow, firstCol) {
    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      
      // Don't place mine on first click or adjacent cells
      const isFirstClick = (r === firstRow && c === firstCol);
      const isAdjacent = Math.abs(r - firstRow) <= 1 && Math.abs(c - firstCol) <= 1;
      
      if (!grid[r][c].isMine && !isFirstClick && !isAdjacent) {
        grid[r][c].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbor mine counts
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!grid[r][c].isMine) {
          grid[r][c].neighborMines = countNeighborMines(r, c);
        }
      }
    }
  }

  function countNeighborMines(row, col) {
    let count = 0;
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          if (grid[r][c].isMine) count++;
        }
      }
    }
    return count;
  }

  function renderGrid() {
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
    gridEl.style.gridTemplateRows = `repeat(${rows}, 30px)`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        const cellData = grid[r][c];

        if (cellData.isRevealed) {
          cell.classList.add('revealed');
          if (cellData.isMine) {
            cell.textContent = '💣';
            cell.classList.add('mine');
          } else if (cellData.neighborMines > 0) {
            cell.textContent = cellData.neighborMines;
            cell.classList.add(`mine-${cellData.neighborMines}`);
          }
        } else if (cellData.isFlagged) {
          cell.textContent = '🚩';
          cell.classList.add('flagged');
        }

        cell.addEventListener('click', handleCellClick);
        cell.addEventListener('contextmenu', handleRightClick);
        
        gridEl.appendChild(cell);
      }
    }
  }

  function handleCellClick(e) {
    if (gameOver) return;

    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const cellData = grid[row][col];

    if (cellData.isFlagged || cellData.isRevealed) return;

    // Start game on first click
    if (!gameStarted) {
      gameStarted = true;
      placeMines(row, col);
      startTimer();
    }

    revealCell(row, col);
  }

  function handleRightClick(e) {
    e.preventDefault();
    if (gameOver || !gameStarted) return;

    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const cellData = grid[row][col];

    if (cellData.isRevealed) return;

    cellData.isFlagged = !cellData.isFlagged;
    flaggedCells += cellData.isFlagged ? 1 : -1;
    mineCountEl.textContent = mines - flaggedCells;
    
    renderGrid();
  }

  function revealCell(row, col) {
    const cellData = grid[row][col];

    if (cellData.isRevealed || cellData.isFlagged) return;

    cellData.isRevealed = true;
    revealedCells++;

    if (cellData.isMine) {
      // Game over - reveal all mines
      gameOver = true;
      revealAllMines();
      statusEl.textContent = '💥 Game Over!';
      statusEl.style.color = '#ef4444';
      clearInterval(timerInterval);
      return;
    }

    // If cell has no neighbor mines, reveal neighbors recursively
    if (cellData.neighborMines === 0) {
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r >= 0 && r < rows && c >= 0 && c < cols) {
            revealCell(r, c);
          }
        }
      }
    }

    renderGrid();
    checkWin();
  }

  function revealAllMines() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].isMine) {
          grid[r][c].isRevealed = true;
        }
      }
    }
    renderGrid();
  }

  function checkWin() {
    const totalCells = rows * cols;
    if (revealedCells === totalCells - mines) {
      gameOver = true;
      clearInterval(timerInterval);
      statusEl.textContent = '🎉 You Win!';
      statusEl.style.color = '#10b981';
    }
  }

  function startTimer() {
    timerInterval = setInterval(() => {
      seconds++;
      timerEl.textContent = seconds;
    }, 1000);
  }

  function setDifficulty(level) {
    difficulty = level;
    
    easyBtn.classList.remove('active');
    mediumBtn.classList.remove('active');
    hardBtn.classList.remove('active');

    if (level === 'easy') {
      easyBtn.classList.add('active');
      difficultyText.textContent = 'Easy: 9×9 grid, 10 mines';
    } else if (level === 'medium') {
      mediumBtn.classList.add('active');
      difficultyText.textContent = 'Medium: 16×16 grid, 40 mines';
    } else if (level === 'hard') {
      hardBtn.classList.add('active');
      difficultyText.textContent = 'Hard: 16×30 grid, 99 mines';
    }

    initGame();
  }

  easyBtn.addEventListener('click', () => setDifficulty('easy'));
  mediumBtn.addEventListener('click', () => setDifficulty('medium'));
  hardBtn.addEventListener('click', () => setDifficulty('hard'));
  restartBtn.addEventListener('click', () => setDifficulty(difficulty));

  // Start with easy difficulty
  setDifficulty('easy');
});
