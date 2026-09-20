document.addEventListener('DOMContentLoaded', () => {
  const cells = Array.from(document.querySelectorAll('.ttt-cell'));
  const status = document.getElementById('ttt-status');
  const reset = document.getElementById('reset');
  const scoreX = document.getElementById('score-x');
  const scoreO = document.getElementById('score-o');
  const scoreDraws = document.getElementById('score-draws');
  const modeSingleBtn = document.getElementById('mode-single');
  const modeMultiBtn = document.getElementById('mode-multi');
  const difficultyControls = document.getElementById('difficulty-controls');
  
  let board = Array(9).fill(null);
  let turn = 'X';
  let scores = {X: 0, O: 0, draws: 0};
  
  // Check for forced mode
  let mode = 'single';
  if (window.FORCE_SINGLE_PLAYER) {
    mode = 'single';
  } else if (window.FORCE_MULTIPLAYER) {
    mode = 'multi';
  }
  
  let isAiThinking = false;
  let gameStarted = false;
  
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  function render(){
    cells.forEach((c,i)=>{c.textContent = board[i] || ''});
  }

  // difficulty: easy, medium, hard, impossible
  const diffEl = document.getElementById('ttt-difficulty');
  let difficulty = diffEl?.value || 'impossible';
  if (diffEl) {
    diffEl.addEventListener('change', (e) => {
      difficulty = e.target.value;
    });
  }

  function findWinningLine(){
    for(const w of wins){
      const [a,b,c] = w;
      if(board[a] && board[a] === board[b] && board[a] === board[c]) return w;
    }
    return null;
  }

  function checkWinResult(){
    const w = findWinningLine();
    if(w) return board[w[0]]; // 'X' or 'O'
    if(board.every(Boolean)) return 'draw';
    return null;
  }

  // AI using minimax algorithm
  function minimax(testBoard, player) {
    const avail = testBoard.map((v,i)=>v===null?i:null).filter(v=>v!==null);
    
    // Check terminal states
    const winner = checkWinnerOnBoard(testBoard);
    if (winner === 'O') return {score: 10};
    if (winner === 'X') return {score: -10};
    if (avail.length === 0) return {score: 0};
    
    const moves = [];
    for (const i of avail) {
      const move = {index: i};
      testBoard[i] = player;
      
      if (player === 'O') {
        const result = minimax(testBoard, 'X');
        move.score = result.score;
      } else {
        const result = minimax(testBoard, 'O');
        move.score = result.score;
      }
      
      testBoard[i] = null;
      moves.push(move);
    }
    
    let bestMove;
    if (player === 'O') {
      let bestScore = -Infinity;
      for (const move of moves) {
        if (move.score > bestScore) {
          bestScore = move.score;
          bestMove = move;
        }
      }
    } else {
      let bestScore = Infinity;
      for (const move of moves) {
        if (move.score < bestScore) {
          bestScore = move.score;
          bestMove = move;
        }
      }
    }
    
    return bestMove;
  }

  function checkWinnerOnBoard(testBoard) {
    for(const w of wins){
      const [a,b,c] = w;
      if(testBoard[a] && testBoard[a] === testBoard[b] && testBoard[a] === testBoard[c]) {
        return testBoard[a];
      }
    }
    if(testBoard.every(Boolean)) return 'draw';
    return null;
  }

  function aiMove() {
    if (isAiThinking) return;
    isAiThinking = true;
    
    // Add slight delay for better UX
    setTimeout(() => {
      // choose move based on difficulty
      const chooseAIMove = () => {
        const avail = board.map((v,i)=>v===null?i:null).filter(v=>v!==null);
        if (avail.length === 0) return null;
        if (difficulty === 'easy') {
          return avail[Math.floor(Math.random()*avail.length)];
        }
        // medium: try win, block, otherwise 50% random else minimax
        if (difficulty === 'medium') {
          // win
          for (const pos of avail) {
            const tb = [...board]; tb[pos] = 'O';
            if (checkWinnerOnBoard(tb) === 'O') return pos;
          }
          // block
          for (const pos of avail) {
            const tb = [...board]; tb[pos] = 'X';
            if (checkWinnerOnBoard(tb) === 'X') return pos;
          }
          if (Math.random() < 0.5) return avail[Math.floor(Math.random()*avail.length)];
          const m = minimax([...board], 'O'); return m && m.index !== undefined ? m.index : avail[0];
        }
        // hard: win/block, then minimax
        if (difficulty === 'hard') {
          for (const pos of avail) {
            const tb = [...board]; tb[pos] = 'O';
            if (checkWinnerOnBoard(tb) === 'O') return pos;
          }
          for (const pos of avail) {
            const tb = [...board]; tb[pos] = 'X';
            if (checkWinnerOnBoard(tb) === 'X') return pos;
          }
          const m = minimax([...board], 'O'); return m && m.index !== undefined ? m.index : avail[0];
        }
        // impossible
        const m = minimax([...board], 'O'); return m && m.index !== undefined ? m.index : avail[0];
      };

      const bestIdx = chooseAIMove();
      if (bestIdx !== null && bestIdx !== undefined) {
        board[bestIdx] = 'O';
        turn = 'X';
        render();
        checkGameEnd();
      }
      isAiThinking = false;
    }, 300);
  }

  function checkGameEnd() {
    const winningLine = findWinningLine();
    const result = checkWinResult();
    
    if(winningLine){
      cells.forEach(c=>c.classList.remove('win'));
      winningLine.forEach(i=>cells[i].classList.add('win'));
    }
    
    if(result){
      if(result === 'draw') {
        status.textContent = 'Draw!';
        scores.draws++;
        scoreDraws.textContent = scores.draws;
      } else {
        status.textContent = `${result} wins!`;
        scores[result]++;
        if(result === 'X') scoreX.textContent = scores.X;
        else scoreO.textContent = scores.O;
      }
      setTimeout(resetBoard, 1500);
    } else {
      status.textContent = `Turn: ${turn}`;
      
      // If single player mode and it's O's turn (AI), make AI move
      if (mode === 'single' && turn === 'O' && !result) {
        aiMove();
      }
    }
  }

  function resetBoard(){
    board = Array(9).fill(null);
    turn = 'X';
    isAiThinking = false;
    gameStarted = false;
    cells.forEach(c=>c.classList.remove('win'));
    render();
    status.textContent = `Turn: ${turn}`;
    
    // Re-enable difficulty selector when board is reset
    if (diffEl) {
      diffEl.disabled = false;
    }
  }

  function cellClick(e){
    if (isAiThinking) return;
    
    const i = Number(e.currentTarget.dataset.pos);
    if(board[i] || checkWinResult()) return;
    
    // In single player mode, only allow X (human) to play
    if (mode === 'single' && turn === 'O') return;
    
    // Once the first move is made, lock the difficulty
    if (!gameStarted && mode === 'single') {
      gameStarted = true;
      if (diffEl) {
        diffEl.disabled = true;
      }
    }
    
    board[i] = turn;
    turn = turn === 'X' ? 'O' : 'X';
    render();
    checkGameEnd();
  }

  function setMode(newMode) {
    mode = newMode;
    resetBoard();
    scores = {X: 0, O: 0, draws: 0};
    scoreX.textContent = '0';
    scoreO.textContent = '0';
    scoreDraws.textContent = '0';
    
    // Update button styles (only if buttons exist)
    if (modeSingleBtn && modeMultiBtn && difficultyControls) {
      if (mode === 'single') {
        modeSingleBtn.classList.remove('secondary');
        modeMultiBtn.classList.add('secondary');
        difficultyControls.style.display = 'flex';
      } else {
        modeSingleBtn.classList.add('secondary');
        modeMultiBtn.classList.remove('secondary');
        difficultyControls.style.display = 'none';
      }
    }
  }

  cells.forEach(c=>c.addEventListener('click', cellClick));
  reset.addEventListener('click', () => {
    // Also clear cumulative scores when user clicks Reset
    scores = {X: 0, O: 0, draws: 0};
    scoreX.textContent = '0';
    scoreO.textContent = '0';
    scoreDraws.textContent = '0';
    gameStarted = false;
    if (diffEl) {
      diffEl.disabled = false;
    }
    resetBoard();
  });
  
  // Mode switching buttons (only if they exist)
  if (modeSingleBtn && modeMultiBtn) {
    modeSingleBtn.addEventListener('click', () => setMode('single'));
    modeMultiBtn.addEventListener('click', () => setMode('multi'));
  }
  
  // Start in appropriate mode
  setMode(mode);
  render();
});
