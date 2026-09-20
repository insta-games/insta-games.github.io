document.addEventListener('DOMContentLoaded', ()=>{
  const grid = document.getElementById('memory');
  const restart = document.getElementById('restart');
  const status = document.getElementById('mem-status');
  const levelEl = document.getElementById('mem-level');
  const movesEl = document.getElementById('mem-moves');
  const playerScores = document.getElementById('player-scores');
  const p1ScoreEl = document.getElementById('p1-score');
  const p2ScoreEl = document.getElementById('p2-score');
  
  const allEmojis = ['🍎','🍌','🍇','🍓','🍍','🥝','🍑','🍊','🍒','🥭','🍐','🥑','🌶️','🥕','🌽','🥒'];
  
  // Persisted level: remember across sessions and resets
  const stored = parseInt(localStorage.getItem('memory-level'));
  let level = Number.isFinite(stored) && stored >= 1 ? stored : 1;
  let moves = 0;
  let deck = [];
  let flipped = [];
  let matched = new Set();
  let locked = false;
  let isMultiplayer = false;
  let currentPlayer = 1;
  let p1Score = 0;
  let p2Score = 0;

  // Level configs: [pairs, gridCols]
  const levels = [
    {pairs: 4, cols: 4},   // Level 1: 4x2 (8 cards)
    {pairs: 6, cols: 4},   // Level 2: 4x3 (12 cards)
    {pairs: 8, cols: 4},   // Level 3: 4x4 (16 cards)
    {pairs: 10, cols: 5},  // Level 4: 5x4 (20 cards)
    {pairs: 12, cols: 6},  // Level 5: 6x4 (24 cards)
  ];
  
  function shuffle(a){
    return a.sort(()=>Math.random()-0.5);
  }

  function build(){
    const config = levels[level - 1] || levels[levels.length - 1];
    const emojisNeeded = allEmojis.slice(0, config.pairs);
    deck = shuffle([...emojisNeeded, ...emojisNeeded]);
    
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
    
    deck.forEach((val,i)=>{
      const el = document.createElement('div');
      el.className = 'card-tile';
      el.dataset.idx = i;
      el.textContent = '';
      el.addEventListener('click', onTile);
      grid.appendChild(el);
    });
    
    flipped = [];
    matched = new Set();
    locked = false;
    grid.classList.remove('locked');
    levelEl.textContent = level;
    // persist current level
    try { localStorage.setItem('memory-level', String(level)); } catch (e) { /* ignore */ }
    status.textContent = '';
  }

  function cleanupVisualState(){
    // Ensure only cards in our flipped/matched arrays are shown
    const allTiles = grid.querySelectorAll('.card-tile');
    allTiles.forEach((tile, idx) => {
      if(!flipped.includes(idx) && !matched.has(idx)){
        tile.classList.remove('flipped');
        tile.textContent = '';
      }
    });
  }

  function onTile(e){
    // CRITICAL: Block ALL clicks if locked
    if(locked) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    const idx = Number(e.currentTarget.dataset.idx);
    
    // Check if already matched
    if(matched.has(idx)) {
      return;
    }
    
    // Check if already flipped
    if(flipped.includes(idx)) {
      return;
    }
    
    // CRITICAL: If we already have 2 cards, ignore this click completely
    if(flipped.length >= 2) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Add to flipped array FIRST before any DOM manipulation
    flipped.push(idx);
    
    // Then flip the tile visually
    flipTile(e.currentTarget, deck[idx]);
    
    // If this is the second card, lock immediately and process
    if(flipped.length === 2){
      locked = true;
      grid.classList.add('locked');
      
      // Small delay to ensure DOM updates, then process the pair
      setTimeout(() => {
        processFlippedPair();
      }, 50);
    }
  }

  function processFlippedPair(){
    moves++;
    movesEl.textContent = moves;
    const [a,b] = flipped;
    
    if(deck[a] === deck[b]){
      matched.add(a); 
      matched.add(b);
      // mark tiles as matched
      const elA = grid.querySelector(`[data-idx="${a}"]`);
      const elB = grid.querySelector(`[data-idx="${b}"]`);
      if(elA) elA.classList.add('matched');
      if(elB) elB.classList.add('matched');
      
      // In multiplayer, award point to current player
      if(isMultiplayer) {
        if(currentPlayer === 1) {
          p1Score++;
          p1ScoreEl.textContent = p1Score;
        } else {
          p2Score++;
          p2ScoreEl.textContent = p2Score;
        }
        // Player gets another turn after a match
      }
      
      flipped = [];
      cleanupVisualState();
      locked = false;
      grid.classList.remove('locked');
      
  if(matched.size === deck.length){
        if(isMultiplayer) {
          const winner = p1Score > p2Score ? 'Player 1' : p1Score < p2Score ? 'Player 2' : 'Tie';
          status.textContent = `🎉 Game Over! ${winner} wins! P1: ${p1Score} P2: ${p2Score}`;
        } else {
          if(level < levels.length){
            status.textContent = `Level ${level} complete! Next level in 2s...`;
            setTimeout(()=>{
              level++;
              try { localStorage.setItem('memory-level', String(level)); } catch (e) {}
              build();
            }, 2000);
          } else {
            status.textContent = `🎉 All levels complete! Moves: ${moves}`;
          }
        }
      }
    } else {
      setTimeout(()=>{
        unflip(a); 
        unflip(b);
        flipped = [];
        cleanupVisualState();
        
        // In multiplayer, switch turns
        if(isMultiplayer) {
          currentPlayer = currentPlayer === 1 ? 2 : 1;
        }
        
        locked = false;
        grid.classList.remove('locked');
      }, 700);
    }
  }

  function flipTile(el, val){
    el.classList.add('flipped');
    el.textContent = val;
  }
  function unflip(idx){
    const el = grid.querySelector(`[data-idx="${idx}"]`);
    if(el) { el.classList.remove('flipped'); el.textContent = ''; }
  }

  restart.addEventListener('click', ()=>{
    // Do NOT reset the level — level is persisted across sessions and resets
    moves = 0;
    movesEl.textContent = moves;
    if(isMultiplayer) {
      p1Score = 0;
      p2Score = 0;
      currentPlayer = 1;
      p1ScoreEl.textContent = '0';
      p2ScoreEl.textContent = '0';
    }
    build();
  });

  // Initialize the game
  build();
});
