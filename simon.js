document.addEventListener('DOMContentLoaded', ()=>{
  const pads = Array.from(document.querySelectorAll('#simon-board [data-pad]'));
  const start = document.getElementById('simon-start');
  const levelEl = document.getElementById('simon-level');
  const resultEl = document.getElementById('simon-result');
  let sequence = [];
  let input = [];
  let playing = false;

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
      resultEl.textContent = 'Wrong — try again (press Start)';
      sequence = [];
      levelEl.textContent = 0;
      return;
    }
    if(input.length === sequence.length){
      resultEl.textContent = 'Good — next round!';
      setTimeout(nextRound, 700);
    }
  }));

  start.addEventListener('click', ()=>{
    sequence = [];
    nextRound();
  });
});
