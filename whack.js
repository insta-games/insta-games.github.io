document.addEventListener('DOMContentLoaded', ()=>{
  const grid = document.getElementById('whack-grid');
  const start = document.getElementById('whack-start');
  const timeEl = document.getElementById('whack-time');
  const scoreEl = document.getElementById('whack-score');
  const scoreEl2 = document.getElementById('whack-score2');
  const score1Container = document.getElementById('score1-container');
  const score2Container = document.getElementById('score2-container');
  const singleBtn = document.getElementById('singleBtn');
  const multiBtn = document.getElementById('multiBtn');
  const modeText = document.getElementById('modeText');
  
  let holes = [];
  let molePos = -1;
  let timerId = null;
  let countdown = 30;
  let score1 = 0;
  let score2 = 0;
  let mode = 'single'; // 'single' or 'multi'

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
    const idx = Number(e.currentTarget.dataset.idx);
    if(idx === molePos){
      const moleType = holes[molePos].textContent;
      
      if(mode === 'single'){
        score1++; 
        scoreEl.textContent = score1;
      } else {
        // In multiplayer, pink mole = player 1, bunny = player 2
        if(moleType === '🐹'){
          score1++; 
          scoreEl.textContent = score1;
        } else {
          score2++; 
          scoreEl2.textContent = score2;
        }
      }
      
      holes[molePos].textContent=''; 
      molePos=-1;
    }
  }

  function startRound(){
    score1 = 0; 
    score2 = 0;
    countdown = 30; 
    scoreEl.textContent = 0; 
    scoreEl2.textContent = 0;
    timeEl.textContent = countdown;
    placeMole();
    
    timerId = setInterval(()=>{
      placeMole();
      countdown -= 1; 
      timeEl.textContent = countdown;
      
      if(countdown <= 0){ 
        clearInterval(timerId); 
        timerId = null; 
        holes.forEach(h=>h.textContent='');
        
        if(mode === 'single'){
          alert('Time\'s up! Score: ' + score1);
        } else {
          const result = score1 > score2 ? 'Player 1 Wins!' : 
                        score2 > score1 ? 'Player 2 Wins!' : 
                        'It\'s a Tie!';
          alert(`Time's up!\n${result}\nPlayer 1: ${score1} | Player 2: ${score2}`);
        }
      }
    }, 800);
  }

  function setMode(newMode){
    mode = newMode;
    score1 = 0;
    score2 = 0;
    scoreEl.textContent = 0;
    scoreEl2.textContent = 0;
    
    if(timerId){
      clearInterval(timerId);
      timerId = null;
      holes.forEach(h=>h.textContent='');
    }
    
    if(mode === 'single'){
      singleBtn.classList.add('active');
      multiBtn.classList.remove('active');
      modeText.textContent = 'Single Player: Click the moles as fast as you can!';
      score1Container.innerHTML = 'Score: <strong id="whack-score">0</strong>';
      score2Container.style.display = 'none';
    } else {
      multiBtn.classList.add('active');
      singleBtn.classList.remove('active');
      modeText.textContent = 'Multiplayer: 🐹 = Player 1, 🐰 = Player 2. Compete for highest score!';
      score1Container.innerHTML = 'P1: <strong id="whack-score">0</strong>';
      score2Container.style.display = 'block';
    }
    
    // Re-get references after innerHTML change
    const newScoreEl = document.getElementById('whack-score');
    if(newScoreEl) Object.defineProperty(window, 'scoreEl', {value: newScoreEl, writable: true});
  }

  start.addEventListener('click', ()=>{
    if(timerId) return; 
    startRound();
  });

  singleBtn.addEventListener('click', () => setMode('single'));
  multiBtn.addEventListener('click', () => setMode('multi'));

  setup();
  setMode('single');
});
