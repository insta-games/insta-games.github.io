document.addEventListener('DOMContentLoaded', ()=>{
  const canvas = document.getElementById('snake');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('snake-score');
  const size = 20;
  const cols = canvas.width / size;
  const rows = canvas.height / size;
  let snake, dir, food, running, loopId, gameStarted;

  function reset(){
    snake = [{x:Math.floor(cols/2), y:Math.floor(rows/2)}];
    dir = {x:1,y:0};
    placeFood();
    running = false;
    gameStarted = false;
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
    
    // Show instruction if not started
    if(!gameStarted){
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Press arrow key or WASD to start', canvas.width/2, canvas.height/2);
    }
  }

  function step(){
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
    
    // Check wall collision
    if(head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows){
      stop();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Game Over! Hit a wall', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('Press any key to restart', canvas.width/2, canvas.height/2 + 20);
      return;
    }
    
    // collision with self
    if(snake.some(s=>s.x===head.x && s.y===head.y)){
      stop();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Game Over! Hit yourself', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('Press any key to restart', canvas.width/2, canvas.height/2 + 20);
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
    gameStarted = true;
    loopId = setInterval(step, 120);
  }
  
  function stop(){
    running = false;
    clearInterval(loopId);
  }

  document.addEventListener('keydown', (e)=>{
    // Arrow keys
    if(e.key === 'ArrowUp' && dir.y!==1) {
      dir = {x:0,y:-1};
      if(!running) start();
    }
    if(e.key === 'ArrowDown' && dir.y!==-1) {
      dir = {x:0,y:1};
      if(!running) start();
    }
    if(e.key === 'ArrowLeft' && dir.x!==1) {
      dir = {x:-1,y:0};
      if(!running) start();
    }
    if(e.key === 'ArrowRight' && dir.x!==-1) {
      dir = {x:1,y:0};
      if(!running) start();
    }
    
    // WASD keys
    if((e.key === 'w' || e.key === 'W') && dir.y!==1) {
      dir = {x:0,y:-1};
      if(!running) start();
    }
    if((e.key === 's' || e.key === 'S') && dir.y!==-1) {
      dir = {x:0,y:1};
      if(!running) start();
    }
    if((e.key === 'a' || e.key === 'A') && dir.x!==1) {
      dir = {x:-1,y:0};
      if(!running) start();
    }
    if((e.key === 'd' || e.key === 'D') && dir.x!==-1) {
      dir = {x:1,y:0};
      if(!running) start();
    }
    
    // Any key to restart after game over
    if(!running && gameStarted){
      reset();
    }
  });

  reset();
});
