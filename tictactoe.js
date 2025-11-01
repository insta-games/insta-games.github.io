document.addEventListener('DOMContentLoaded', () => {
  const cells = Array.from(document.querySelectorAll('.ttt-cell'));
  const status = document.getElementById('ttt-status');
  const reset = document.getElementById('reset');
  const scoreX = document.getElementById('score-x');
  const scoreO = document.getElementById('score-o');
  const scoreDraws = document.getElementById('score-draws');
  let board = Array(9).fill(null);
  let turn = 'X';
  let scores = {X: 0, O: 0, draws: 0};
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  function render(){
    cells.forEach((c,i)=>{c.textContent = board[i] || ''});
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

  function resetBoard(){
    board = Array(9).fill(null);
    turn = 'X';
    cells.forEach(c=>c.classList.remove('win'));
    render();
    status.textContent = `Turn: ${turn}`;
  }

  function cellClick(e){
    const i = Number(e.currentTarget.dataset.pos);
    if(board[i] || checkWinResult()) return;
    board[i] = turn;
    turn = turn === 'X' ? 'O' : 'X';
    render();
    const winningLine = findWinningLine();
    const result = checkWinResult();
    if(winningLine){
      // highlight winning cells
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
      // Auto-reset after 1.5 seconds
      setTimeout(resetBoard, 1500);
    } else {
      status.textContent = `Turn: ${turn}`;
    }
  }

  cells.forEach(c=>c.addEventListener('click', cellClick));
  reset.addEventListener('click', resetBoard);
  render();
  status.textContent = `Turn: ${turn}`;
});
