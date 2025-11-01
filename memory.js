document.addEventListener('DOMContentLoaded', ()=>{
  const grid = document.getElementById('memory');
  const restart = document.getElementById('restart');
  const status = document.getElementById('mem-status');
  const levelEl = document.getElementById('mem-level');
  const movesEl = document.getElementById('mem-moves');
  
  const allEmojis = ['🍎','🍌','🍇','🍓','🍍','🥝','🍑','🍊','🍒','🥭','🍐','🥑','🌶️','🥕','🌽','🥒'];
  
  let level = 1;
  let moves = 0;
  let deck = [];
  let flipped = [];
  let matched = new Set();
  let locked = false;

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
    levelEl.textContent = level;
    status.textContent = '';
  }

  function onTile(e){
    if(locked) return;
    const idx = Number(e.currentTarget.dataset.idx);
    if(matched.has(idx) || flipped.includes(idx)) return;
    flipTile(e.currentTarget, deck[idx]);
    flipped.push(idx);
    if(flipped.length === 2){
      locked = true;
      moves++;
      movesEl.textContent = moves;
      const [a,b] = flipped;
      if(deck[a] === deck[b]){
        matched.add(a); matched.add(b);
        // mark tiles as matched
        const elA = grid.querySelector(`[data-idx="${a}"]`);
        const elB = grid.querySelector(`[data-idx="${b}"]`);
        if(elA) elA.classList.add('matched');
        if(elB) elB.classList.add('matched');
        flipped = [];
        locked = false;
        if(matched.size === deck.length){
          if(level < levels.length){
            status.textContent = `Level ${level} complete! Next level in 2s...`;
            setTimeout(()=>{
              level++;
              build();
            }, 2000);
          } else {
            status.textContent = `🎉 All levels complete! Moves: ${moves}`;
          }
        }
      } else {
        setTimeout(()=>{
          unflip(a); unflip(b);
          flipped = [];
          locked = false;
        },700);
      }
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
    level = 1;
    moves = 0;
    movesEl.textContent = moves;
    build();
  });
  build();
});
