// Whack-a-Mole Game - Updated version with silent status messages
document.addEventListener('DOMContentLoaded', ()=>{
  const grid = document.getElementById('whack-grid');
  const start = document.getElementById('whack-start');
  const resetBtn = document.getElementById('reset');
  const timeEl = document.getElementById('whack-time');
  const score1Container = document.getElementById('score1-container');
  const score2Container = document.getElementById('score2-container');
  const statusEl = document.getElementById('whack-status');
  
  let holes = [];
  let molePos = -1;
  let timerId = null;
  let countdown = 30;
  let score1 = 0;
  let score2 = 0;
  let mode = 'single'; // 'single' or 'multi'
  let isPenalized = false; // Track if player is in penalty timeout

  // Helper to get current score elements
  function getScoreElements(){
    return {
      scoreEl: document.getElementById('whack-score'),
      scoreEl2: document.getElementById('whack-score2')
    };
  }

  function setup(){
    grid.innerHTML=''; holes = [];
    for(let i=0;i<9;i++){
      const d = document.createElement('div');
      d.className = 'card-tile whack-hole';
      d.dataset.idx = i;
      d.addEventListener('click', onHit);
      grid.appendChild(d); holes.push(d);
    }
  }

  function placeMole(){
    if(molePos>=0) holes[molePos].textContent='';
    molePos = Math.floor(Math.random()*holes.length);
    
    // In multiplayer, alternate mole colors
    if(mode === 'multi'){
      const moles = ['🐹', '🐰'];
      holes[molePos].textContent = moles[Math.floor(Math.random() * 2)];
    } else {
      holes[molePos].textContent = '🐹';
    }
  }

  function onHit(e){
    // Ignore clicks during penalty timeout
    if(isPenalized) return;
    
    const idx = Number(e.currentTarget.dataset.idx);
    if(idx === molePos){
      const moleType = holes[molePos].textContent;
      const {scoreEl, scoreEl2} = getScoreElements();
      
      if(mode === 'single'){
        score1++; 
        if(scoreEl) scoreEl.textContent = score1;
      } else {
        // In multiplayer, pink mole = player 1, bunny = player 2
        if(moleType === '🐹'){
          score1++; 
          if(scoreEl) scoreEl.textContent = score1;
        } else {
          score2++; 
          if(scoreEl2) scoreEl2.textContent = score2;
        }
      }
      
      holes[molePos].textContent=''; 
      molePos=-1;
    } else {
      // Wrong tile clicked - apply penalty
      isPenalized = true;
      
      // Visual feedback: flash the wrong tile red
      const tile = e.currentTarget;
      const originalBg = tile.style.backgroundColor;
      tile.style.backgroundColor = '#ef4444';
      tile.style.transition = 'background-color 0.1s';
      
      setTimeout(() => {
        tile.style.backgroundColor = originalBg;
        isPenalized = false;
      }, 500); // 500ms penalty
    }
  }

  function startRound(){
    score1 = 0; 
    score2 = 0;
    countdown = 30;
    const {scoreEl, scoreEl2} = getScoreElements();
    if(scoreEl) scoreEl.textContent = 0; 
    if(scoreEl2) scoreEl2.textContent = 0;
    if(timeEl) timeEl.textContent = countdown;
    if(statusEl){
      statusEl.textContent = 'Game in progress...';
      statusEl.style.color = '#9ca3af';
    }
    placeMole();
    
    timerId = setInterval(()=>{
      placeMole();
      countdown -= 1; 
      if(timeEl) timeEl.textContent = countdown;
      
      if(countdown <= 0){ 
        clearInterval(timerId); 
        timerId = null; 
        holes.forEach(h=>h.textContent='');
        
        if(statusEl){
          if(mode === 'single'){
            statusEl.textContent = `Game Over! Final Score: ${score1}`;
            statusEl.style.color = '#06b6d4';
          } else {
            const result = score1 > score2 ? 'Player 1 Wins!' : 
                          score2 > score1 ? 'Player 2 Wins!' : 
                          'It\'s a Tie!';
            statusEl.textContent = `Game Over! ${result} (P1: ${score1} | P2: ${score2})`;
            statusEl.style.color = '#06b6d4';
          }
        }
      }
    }, 800);
  }

  function setMode(newMode){
    mode = newMode;
    score1 = 0;
    score2 = 0;
    
    if(timerId){
      clearInterval(timerId);
      timerId = null;
      holes.forEach(h=>h.textContent='');
    }
    
    if(mode === 'single'){
      score1Container.innerHTML = 'Score: <strong id="whack-score">0</strong>';
      score2Container.style.display = 'none';
    } else {
      score1Container.innerHTML = 'P1: <strong id="whack-score">0</strong>';
      score2Container.style.display = 'block';
    }
    
    const {scoreEl, scoreEl2} = getScoreElements();
    if(scoreEl) scoreEl.textContent = 0;
    if(scoreEl2) scoreEl2.textContent = 0;
    
    if(statusEl){
      statusEl.textContent = 'Click Start to begin!';
      statusEl.style.color = '#9ca3af';
    }
  }

  start.addEventListener('click', ()=>{
    if(timerId) return; 
    startRound();
  });

  // Reset button
  if(resetBtn) {
    resetBtn.addEventListener('click', ()=>{
      if(timerId) {
        clearInterval(timerId);
        timerId = null;
        holes.forEach(h=>h.textContent='');
      }
      
      score1 = 0;
      score2 = 0;
      countdown = 30;
      
      const scoreEl = document.getElementById('whack-score');
      const scoreEl2 = document.getElementById('whack-score2');
      const timeEl = document.getElementById('whack-time');
      
      if(scoreEl) scoreEl.textContent = '0';
      if(scoreEl2) scoreEl2.textContent = '0';
      if(timeEl) timeEl.textContent = '30';
      if(statusEl){
        statusEl.textContent = 'Click Start to begin!';
        statusEl.style.color = '#9ca3af';
      }
    });
  }

  setup();
  setMode('single');
});
