document.addEventListener('DOMContentLoaded', ()=>{
  const grid = document.getElementById('whack-grid');
  const start = document.getElementById('whack-start');
  const timeEl = document.getElementById('whack-time');
  const scoreEl = document.getElementById('whack-score');
  let holes = [];
  let molePos = -1;
  let timerId = null;
  let countdown = 30;
  let score = 0;

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
    holes[molePos].textContent = '🐹';
  }

  function onHit(e){
    const idx = Number(e.currentTarget.dataset.idx);
    if(idx === molePos){ score++; scoreEl.textContent=score; holes[molePos].textContent=''; molePos=-1 }
  }

  function startRound(){
    score = 0; countdown=30; scoreEl.textContent=0; timeEl.textContent = countdown;
    placeMole();
    timerId = setInterval(()=>{
      placeMole();
      countdown -= 1; timeEl.textContent = countdown;
      if(countdown <=0){ clearInterval(timerId); timerId=null; holes.forEach(h=>h.textContent=''); alert('Time\'s up! Score: '+score) }
    },800);
  }

  start.addEventListener('click', ()=>{
    if(timerId) return; startRound();
  });

  setup();
});
