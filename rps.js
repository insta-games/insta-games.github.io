document.addEventListener('DOMContentLoaded', ()=>{
  const buttons = document.querySelectorAll('.game-controls .btn');
  const scoreP = document.getElementById('score-player');
  const scoreC = document.getElementById('score-computer');
  const resultEl = document.getElementById('rps-result');
  let scorePlayer = 0, scoreComputer = 0;

  function compChoice(){
    return ['rock','paper','scissors'][Math.floor(Math.random()*3)];
  }

  function decide(p,c){
    if(p===c) return 'draw';
    if((p==='rock'&&c==='scissors')||(p==='scissors'&&c==='paper')||(p==='paper'&&c==='rock')) return 'win';
    return 'lose';
  }

  buttons.forEach(b=>b.addEventListener('click', ()=>{
    const p = b.dataset.choice;
    const c = compChoice();
    const res = decide(p,c);
    if(res==='win') { scorePlayer++; scoreP.textContent = scorePlayer; resultEl.textContent = `You win — ${p} beats ${c}` }
    else if(res==='lose'){ scoreComputer++; scoreC.textContent = scoreComputer; resultEl.textContent = `You lose — ${c} beats ${p}` }
    else resultEl.textContent = `Draw — both chose ${p}`;
  }));
});
