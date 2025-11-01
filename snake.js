document.addEventListener('DOMContentLoaded', ()=>{
  const canvas = document.getElementById('snake');
  const ctx = canvas.getContext('2d');
  const startBtn = document.getElementById('start');
  const stopBtn = document.getElementById('stop');
  const scoreEl = document.getElementById('snake-score');
  const size = 20;
  const cols = canvas.width / size;
  const rows = canvas.height / size;
  let snake, dir, food, running, loopId;

  function reset(){
    snake = [{x:Math.floor(cols/2), y:Math.floor(rows/2)}];
    dir = {x:1,y:0};
    placeFood();
    running = false;
    updateScore();
    draw();
  }

  function placeFood(){
    food = {x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*rows)};
  }

  function draw(){
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    // food
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(food.x*size, food.y*size, size, size);
    // snake
    ctx.fillStyle = '#10b981';
    snake.forEach(s=>ctx.fillRect(s.x*size, s.y*size, size-1, size-1));
  }

  function step(){
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
    // wrap
    head.x = (head.x + cols) % cols;
    head.y = (head.y + rows) % rows;
    // collision with self
    if(snake.some(s=>s.x===head.x && s.y===head.y)){
      stop();
      return;
    }
    snake.unshift(head);
    if(head.x===food.x && head.y===food.y){
      placeFood();
    } else {
      snake.pop();
    }
    draw();
    updateScore();
  }

  function updateScore(){
    scoreEl.textContent = `Score: ${snake.length-1}`;
  }

  function start(){
    if(running) return;
    running = true;
    loopId = setInterval(step, 120);
  }
  function stop(){
    running = false;
    clearInterval(loopId);
  }

  document.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowUp' && dir.y!==1) dir = {x:0,y:-1};
    if(e.key === 'ArrowDown' && dir.y!==-1) dir = {x:0,y:1};
    if(e.key === 'ArrowLeft' && dir.x!==1) dir = {x:-1,y:0};
    if(e.key === 'ArrowRight' && dir.x!==-1) dir = {x:1,y:0};
  });

  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);

  reset();
});
