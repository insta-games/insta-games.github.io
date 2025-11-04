document.addEventListener('DOMContentLoaded', ()=>{
  const pads = Array.from(document.querySelectorAll('#simon-board [data-pad]'));
  const start = document.getElementById('simon-start');
  const levelEl = document.getElementById('simon-level');
  const resultEl = document.getElementById('simon-result');
  const singleBtn = document.getElementById('singleBtn');
  const multiBtn = document.getElementById('multiBtn');
  const modeText = document.getElementById('modeText');
  const playerScores = document.getElementById('player-scores');
  const p1ScoreEl = document.getElementById('p1-score');
  const p2ScoreEl = document.getElementById('p2-score');
  
  let sequence = [];
  let input = [];
  let playing = false;
  let isMultiplayer = false;
  let currentPlayer = 1;
  let p1Score = 0;
  let p2Score = 0;
  
  // Mode selection
  singleBtn.addEventListener('click', () => {
    isMultiplayer = false;
    singleBtn.style.background = '#06b6d4';
    multiBtn.style.background = '';
    modeText.textContent = 'Single Player Mode';
    playerScores.style.display = 'none';
    sequence = [];
    levelEl.textContent = 0;
    resultEl.textContent = '';
  });
  
  multiBtn.addEventListener('click', () => {
    isMultiplayer = true;
    multiBtn.style.background = '#06b6d4';
    singleBtn.style.background = '';
    modeText.textContent = 'Player 1\'s turn';
    playerScores.style.display = 'block';
    p1Score = 0;
    p2Score = 0;
    currentPlayer = 1;
    p1ScoreEl.textContent = '0';
    p2ScoreEl.textContent = '0';
    sequence = [];
    levelEl.textContent = 0;
    resultEl.textContent = '';
  });
  
  // Start with single player
  singleBtn.click();

  function flashPad(i, ms=500){
    const el = pads[i];
    el.classList.add('flipped');
    setTimeout(()=>el.classList.remove('flipped'), ms);
  }

  function playSequence(){
    playing = true;
    let i=0;
    const t = setInterval(()=>{
      flashPad(sequence[i]);
      i++;
      if(i>=sequence.length){ clearInterval(t); playing=false; }
    },700);
  }

  function nextRound(){
    sequence.push(Math.floor(Math.random()*4));
    levelEl.textContent = sequence.length;
    input = [];
    resultEl.textContent = '';
    setTimeout(playSequence, 400);
  }

  pads.forEach(p=>p.addEventListener('click', (e)=>{
    if(playing) return;
    const i = Number(e.currentTarget.dataset.pad);
    flashPad(i,200);
    input.push(i);
    const pos = input.length-1;
    if(input[pos] !== sequence[pos]){
      if(isMultiplayer) {
        const otherPlayer = currentPlayer === 1 ? 2 : 1;
        if(otherPlayer === 1) {
          p1Score++;
          p1ScoreEl.textContent = p1Score;
        } else {
          p2Score++;
          p2ScoreEl.textContent = p2Score;
        }
        resultEl.textContent = `Player ${currentPlayer} made a mistake! Player ${otherPlayer} gets a point!`;
        currentPlayer = otherPlayer;
        modeText.textContent = `Player ${currentPlayer}'s turn`;
      } else {
        resultEl.textContent = 'Wrong — try again (press Start)';
      }
      sequence = [];
      levelEl.textContent = 0;
      return;
    }
    if(input.length === sequence.length){
      if(isMultiplayer) {
        // Current player succeeded, give them a point and continue
        if(currentPlayer === 1) {
          p1Score++;
          p1ScoreEl.textContent = p1Score;
        } else {
          p2Score++;
          p2ScoreEl.textContent = p2Score;
        }
        resultEl.textContent = `Player ${currentPlayer} completed the sequence!`;
      } else {
        resultEl.textContent = 'Good — next round!';
      }
      setTimeout(nextRound, 700);
    }
  }));

  start.addEventListener('click', ()=>{
    sequence = [];
    nextRound();
  });
});
