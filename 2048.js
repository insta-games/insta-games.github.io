document.addEventListener('DOMContentLoaded', ()=>{
  const gridEl = document.getElementById('game-2048');
  const statusEl = document.getElementById('status-2048');
  const restartBtn = document.getElementById('restart-2048');

  let grid = [];
  let score = 0;
  let gameOver = false;
  let mode = 'single'; // 'single' or 'multi'
  let currentPlayer = 1; // For multiplayer
  let player1Score = 0;
  let player2Score = 0;

  const size = 4;

  // Tile colors
  const colors = {
    2: '#eee4da',
    4: '#ede0c8',
    8: '#f2b179',
    16: '#f59563',
    32: '#f67c5f',
    64: '#f65e3b',
    128: '#edcf72',
    256: '#edcc61',
    512: '#edc850',
    1024: '#edc53f',
    2048: '#edc22e',
    4096: '#3c3a32',
    8192: '#3c3a32'
  };

  function init(){
    grid = Array(size).fill(null).map(()=>Array(size).fill(0));
    score = 0;
    player1Score = 0;
    player2Score = 0;
    currentPlayer = 1;
    gameOver = false;
    addRandomTile();
    addRandomTile();
    render();
    updateStatus();
  }

  function addRandomTile(){
    const empty = [];
    for(let r=0; r<size; r++){
      for(let c=0; c<size; c++){
        if(grid[r][c] === 0) empty.push({r,c});
      }
    }
    if(empty.length === 0) return;
    const {r,c} = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function render(){
    gridEl.innerHTML = '';
    gridEl.style.display = 'grid';
    gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    gridEl.style.gap = '8px';
    gridEl.style.width = '320px';
    gridEl.style.margin = '0 auto';
    gridEl.style.background = '#bbada0';
    gridEl.style.padding = '8px';
    gridEl.style.borderRadius = '8px';

    for(let r=0; r<size; r++){
      for(let c=0; c<size; c++){
        const tile = document.createElement('div');
        tile.className = 'tile-2048';
        const val = grid[r][c];
        if(val > 0){
          tile.textContent = val;
          tile.style.background = colors[val] || '#3c3a32';
          tile.style.color = val <= 4 ? '#776e65' : '#f9f6f2';
        } else {
          tile.style.background = 'rgba(238, 228, 218, 0.35)';
        }
        gridEl.appendChild(tile);
      }
    }
  }

  function updateStatus(){
    if(mode === 'single'){
      statusEl.textContent = `Score: ${score}`;
    } else {
      statusEl.textContent = `P1: ${player1Score} | P2: ${player2Score} | Turn: Player ${currentPlayer}`;
    }
  }

  function move(direction){
    if(gameOver) return;
    
    let moved = false;
    let newGrid = grid.map(row => [...row]);
    let addedScore = 0;

    if(direction === 'left'){
      for(let r=0; r<size; r++){
        const {row, points} = slideRow(newGrid[r]);
        if(JSON.stringify(row) !== JSON.stringify(newGrid[r])) moved = true;
        newGrid[r] = row;
        addedScore += points;
      }
    } else if(direction === 'right'){
      for(let r=0; r<size; r++){
        const reversed = [...newGrid[r]].reverse();
        const {row, points} = slideRow(reversed);
        if(JSON.stringify(row.reverse()) !== JSON.stringify(newGrid[r])) moved = true;
        newGrid[r] = row.reverse();
        addedScore += points;
      }
    } else if(direction === 'up'){
      for(let c=0; c<size; c++){
        const col = newGrid.map(row => row[c]);
        const {row, points} = slideRow(col);
        if(JSON.stringify(row) !== JSON.stringify(col)) moved = true;
        for(let r=0; r<size; r++){
          newGrid[r][c] = row[r];
        }
        addedScore += points;
      }
    } else if(direction === 'down'){
      for(let c=0; c<size; c++){
        const col = newGrid.map(row => row[c]).reverse();
        const {row, points} = slideRow(col);
        if(JSON.stringify(row.reverse()) !== JSON.stringify(col.reverse())) moved = true;
        for(let r=0; r<size; r++){
          newGrid[r][c] = row.reverse()[r];
        }
        addedScore += points;
      }
    }

    if(moved){
      grid = newGrid;
      if(mode === 'single'){
        score += addedScore;
      } else {
        if(currentPlayer === 1){
          player1Score += addedScore;
          currentPlayer = 2;
        } else {
          player2Score += addedScore;
          currentPlayer = 1;
        }
      }
      addRandomTile();
      render();
      updateStatus();
      checkGameOver();
    }
  }

  function slideRow(row){
    // Remove zeros
    let arr = row.filter(x => x !== 0);
    let points = 0;
    
    // Merge
    for(let i=0; i<arr.length-1; i++){
      if(arr[i] === arr[i+1]){
        arr[i] *= 2;
        points += arr[i];
        arr[i+1] = 0;
      }
    }
    
    // Remove zeros again
    arr = arr.filter(x => x !== 0);
    
    // Pad with zeros
    while(arr.length < size){
      arr.push(0);
    }
    
    return {row: arr, points};
  }

  function checkGameOver(){
    // Check for 2048 win
    for(let r=0; r<size; r++){
      for(let c=0; c<size; c++){
        if(grid[r][c] === 2048){
          gameOver = true;
          if(mode === 'single'){
            alert('You reached 2048! You win!');
          } else {
            const winner = player1Score > player2Score ? 'Player 1' : player2Score > player1Score ? 'Player 2' : 'Tie';
            alert(`2048 reached! ${winner} wins!`);
          }
          return;
        }
      }
    }

    // Check if any moves possible
    for(let r=0; r<size; r++){
      for(let c=0; c<size; c++){
        if(grid[r][c] === 0) return; // Empty space exists
        if(r < size-1 && grid[r][c] === grid[r+1][c]) return; // Vertical merge possible
        if(c < size-1 && grid[r][c] === grid[r][c+1]) return; // Horizontal merge possible
      }
    }

    gameOver = true;
    if(mode === 'single'){
      alert(`Game Over! Final Score: ${score}`);
    } else {
      const winner = player1Score > player2Score ? 'Player 1' : player2Score > player1Score ? 'Player 2' : 'Tie';
      alert(`Game Over! Winner: ${winner}`);
    }
  }

  // Keyboard controls
  let lastMoveTime = 0;
  const MOVE_COOLDOWN = 120; // ms
  document.addEventListener('keydown', (e)=>{
    // ignore auto-repeats to prevent spamming
    if (e.repeat) return;
    const now = Date.now();
    if (now - lastMoveTime < MOVE_COOLDOWN) return;

    const handle = (dir) => { lastMoveTime = Date.now(); move(dir); };

    if(e.key === 'ArrowLeft') { e.preventDefault(); handle('left'); }
    if(e.key === 'ArrowRight') { e.preventDefault(); handle('right'); }
    if(e.key === 'ArrowUp') { e.preventDefault(); handle('up'); }
    if(e.key === 'ArrowDown') { e.preventDefault(); handle('down'); }
    if(e.key === 'a' || e.key === 'A') { e.preventDefault(); handle('left'); }
    if(e.key === 'd' || e.key === 'D') { e.preventDefault(); handle('right'); }
    if(e.key === 'w' || e.key === 'W') { e.preventDefault(); handle('up'); }
    if(e.key === 's' || e.key === 'S') { e.preventDefault(); handle('down'); }
  });

  // Touch controls
  let touchStartX = 0;
  let touchStartY = 0;

  gridEl.addEventListener('touchstart', (e)=>{
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, {passive: true});

  gridEl.addEventListener('touchend', (e)=>{
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    const minSwipe = 30;

    if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipe){
      move(dx > 0 ? 'right' : 'left');
    } else if(Math.abs(dy) > minSwipe){
      move(dy > 0 ? 'down' : 'up');
    }
  }, {passive: true});

  // Mode: default to single
  restartBtn.addEventListener('click', init);

  init();
});
