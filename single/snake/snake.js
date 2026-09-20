document.addEventListener('DOMContentLoaded', ()=>{
  const canvas = document.getElementById('snake');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('snake-score');
  const size = 20;
  const cols = canvas.width / size;
  const rows = canvas.height / size;
  let snake, dir, food, running, loopId, gameStarted, gameOver;
  let isMultiplayer = false;
  let snake2, dir2, p1Score, p2Score;
  // High score persistence for single-player
  const storedHS = parseInt(localStorage.getItem('snake-highscore'));
  let highScore = Number.isFinite(storedHS) ? storedHS : 0;

  function reset(){
    if(isMultiplayer) {
      snake = [{x:5, y:Math.floor(rows/2)}, {x:4, y:Math.floor(rows/2)}, {x:3, y:Math.floor(rows/2)}];
      snake2 = [{x:cols-6, y:Math.floor(rows/2)}, {x:cols-5, y:Math.floor(rows/2)}, {x:cols-4, y:Math.floor(rows/2)}];
      dir = {x:1,y:0};
      dir2 = {x:-1,y:0};
      p1Score = 0;
      p2Score = 0;
    } else {
      snake = [{x:Math.floor(cols/2), y:Math.floor(rows/2)}, {x:Math.floor(cols/2)-1, y:Math.floor(rows/2)}, {x:Math.floor(cols/2)-2, y:Math.floor(rows/2)}];
      dir = {x:1,y:0};
    }
    placeFood();
    running = false;
    gameStarted = false;
    // clear any ended-game marker so inputs start a fresh session
    gameOver = false;
    updateScore();
    draw();
  }

  function placeFood(){
    food = {x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*rows)};
  }

  function draw(){
    // Create gradient background to match website theme
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(30,41,59,0.6)');
    gradient.addColorStop(1, 'rgba(15,23,42,0.7)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    // subtle themed grid lines for smoother visual feel
    ctx.strokeStyle = 'rgba(255,255,255,0.01)';
    ctx.lineWidth = 1;
    for(let gx = 0; gx <= cols; gx++){
      ctx.beginPath();
      ctx.moveTo(gx*size, 0);
      ctx.lineTo(gx*size, canvas.height);
      ctx.stroke();
    }
    for(let gy = 0; gy <= rows; gy++){
      ctx.beginPath();
      ctx.moveTo(0, gy*size);
      ctx.lineTo(canvas.width, gy*size);
      ctx.stroke();
    }
    // food - styled apple with website theme colors
    const appleX = food.x * size;
    const appleY = food.y * size;
    const appleRadius = size / 2.5;
    
    // Apple glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
    
    // Apple gradient
    const appleGradient = ctx.createRadialGradient(
      appleX + size/2 - appleRadius/3, 
      appleY + size/2 - appleRadius/3, 
      appleRadius/4,
      appleX + size/2, 
      appleY + size/2, 
      appleRadius
    );
    appleGradient.addColorStop(0, '#14b8a6');
    appleGradient.addColorStop(0.6, '#06b6d4');
    appleGradient.addColorStop(1, '#0891b2');
    
    ctx.fillStyle = appleGradient;
    ctx.beginPath();
    ctx.arc(appleX + size/2, appleY + size/2, appleRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Apple highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(appleX + size/2 - appleRadius/3, appleY + size/2 - appleRadius/3, appleRadius/3, 0, Math.PI * 2);
    ctx.fill();
    
    // snake 1 - styled with gradient and glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
    
    snake.forEach((s, i) => {
      const snakeGradient = ctx.createLinearGradient(
        s.x * size, 
        s.y * size, 
        s.x * size + size, 
        s.y * size + size
      );
      if(i === 0) {
        // Head is brighter
        snakeGradient.addColorStop(0, '#60a5fa');
        snakeGradient.addColorStop(1, '#3b82f6');
      } else {
        snakeGradient.addColorStop(0, '#3b82f6');
        snakeGradient.addColorStop(1, '#2563eb');
      }
      ctx.fillStyle = snakeGradient;
      
      // Rounded rectangle for snake segments
      const padding = 1;
      const radius = 4;
      const x = s.x * size + padding;
      const y = s.y * size + padding;
      const w = size - padding * 2;
      const h = size - padding * 2;
      
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    });
    
    ctx.shadowBlur = 0;
    ctx.shadowBlur = 0;
    
    // snake 2 in multiplayer - styled with gradient and glow
    if(isMultiplayer) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(6, 182, 212, 0.5)';
      
      snake2.forEach((s, i) => {
        const snakeGradient = ctx.createLinearGradient(
          s.x * size, 
          s.y * size, 
          s.x * size + size, 
          s.y * size + size
        );
        if(i === 0) {
          // Head is brighter
          snakeGradient.addColorStop(0, '#22d3ee');
          snakeGradient.addColorStop(1, '#06b6d4');
        } else {
          snakeGradient.addColorStop(0, '#06b6d4');
          snakeGradient.addColorStop(1, '#0891b2');
        }
        ctx.fillStyle = snakeGradient;
        
        // Rounded rectangle for snake segments
        const padding = 1;
        const radius = 4;
        const x = s.x * size + padding;
        const y = s.y * size + padding;
        const w = size - padding * 2;
        const h = size - padding * 2;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
      });
      
      ctx.shadowBlur = 0;
    }
    
    // Show instruction if not started
    if(!gameStarted){
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Press arrow/WASD or swipe to start', canvas.width/2, canvas.height/2);
    }
  }

  function step(){
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
    
    // Check wall collision
    if(head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows){
      if(isMultiplayer) {
        stop();
        gameOver = true;
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Player 2 Wins!', canvas.width/2, canvas.height/2 - 20);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('Press any key or tap to restart', canvas.width/2, canvas.height/2 + 20);
        return;
      } else {
        stop();
        gameOver = true;
        // update high score for single player
        try {
          const current = Math.max(0, snake.length - 1);
          if (checkAndSetHighScore(current)) updateScore();
        } catch (e) {}
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Game Over! Hit a wall', canvas.width/2, canvas.height/2 - 40);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '18px Arial, sans-serif';
        ctx.fillText(`Score: ${snake.length - 1} | High: ${highScore}`, canvas.width/2, canvas.height/2 - 10);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('Press any key or tap to restart', canvas.width/2, canvas.height/2 + 25);
        return;
      }
    }
    
    // collision with self (skip the head itself, check body segments only)
    for(let i = 1; i < snake.length; i++){
      if(snake[i].x === head.x && snake[i].y === head.y){
        if(isMultiplayer) {
        stop();
        gameOver = true;
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Player 2 Wins!', canvas.width/2, canvas.height/2 - 20);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('Press any key or tap to restart', canvas.width/2, canvas.height/2 + 20);
        return;
      } else {
        stop();
        gameOver = true;
        // update high score for single player
        const current = Math.max(0, snake.length - 1);
        try {
          if (checkAndSetHighScore(current)) updateScore();
        } catch (e) {}
        // Track game over
        if (typeof gtag === 'function') {
          gtag('event', 'game_over', {
            'game_name': 'snake',
            'score': current,
            'mode': 'single'
          });
        }
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Game Over! Hit yourself', canvas.width/2, canvas.height/2 - 40);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '18px Arial, sans-serif';
        ctx.fillText(`Score: ${snake.length - 1} | High: ${highScore}`, canvas.width/2, canvas.height/2 - 10);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('Press any key or tap to restart', canvas.width/2, canvas.height/2 + 25);
        return;
      }
    }
    }
    
    // Collision with other snake in multiplayer
    if(isMultiplayer && snake2.some(s=>s.x===head.x && s.y===head.y)){
      stop();
      gameOver = true;
      // Track multiplayer win
      if (typeof gtag === 'function') {
        gtag('event', 'game_over', {
          'game_name': 'snake',
          'score': p2Score,
          'mode': 'multiplayer',
          'winner': 'player2'
        });
      }
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Player 2 Wins!', canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('Press any key or tap to restart', canvas.width/2, canvas.height/2 + 20);
      return;
    }
    
    snake.unshift(head);
    if(head.x===food.x && head.y===food.y){
      if(isMultiplayer) p1Score++;
      placeFood();
    } else {
      snake.pop();
    }
    
    // Move snake 2 in multiplayer
    if(isMultiplayer) {
      const head2 = {x: snake2[0].x + dir2.x, y: snake2[0].y + dir2.y};
      
      // Check collisions for snake 2
      let snake2Collision = false;
      
      // Check wall collision
      if(head2.x < 0 || head2.x >= cols || head2.y < 0 || head2.y >= rows){
        snake2Collision = true;
      }
      
      // Check self collision (skip head, check body only)
      for(let i = 1; i < snake2.length; i++){
        if(snake2[i].x === head2.x && snake2[i].y === head2.y){
          snake2Collision = true;
          break;
        }
      }
      
      // Check collision with snake 1
      for(let i = 0; i < snake.length; i++){
        if(snake[i].x === head2.x && snake[i].y === head2.y){
          snake2Collision = true;
          break;
        }
      }
      
      if(snake2Collision){
      stop();
      gameOver = true;
        // Track multiplayer win
        if (typeof gtag === 'function') {
          gtag('event', 'game_over', {
            'game_name': 'snake',
            'score': p1Score,
            'mode': 'multiplayer',
            'winner': 'player1'
          });
        }
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Player 1 Wins!', canvas.width/2, canvas.height/2 - 20);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('Press any key or tap to restart', canvas.width/2, canvas.height/2 + 20);
        return;
      }
      
      snake2.unshift(head2);
      if(head2.x===food.x && head2.y===food.y){
        p2Score++;
        placeFood();
      } else {
        snake2.pop();
      }
    }
    
    draw();
    updateScore();
  }

  function updateScore(){
    if(isMultiplayer) {
      scoreEl.textContent = `P1 (Green): ${p1Score} | P2 (Blue): ${p2Score}`;
    } else {
      scoreEl.textContent = `Score: ${snake.length-1} | High: ${highScore}`;
    }
  }

  function checkAndSetHighScore(current) {
    if (current > highScore) {
      highScore = current;
      try { localStorage.setItem('snake-highscore', String(highScore)); } catch (e) {}
      return true;
    }
    return false;
  }

  function start(){
    if(running) return;
    running = true;
    gameStarted = true;
    // Track game start
    if (typeof gtag === 'function') {
      gtag('event', 'game_start', {
        'game_name': 'snake',
        'mode': isMultiplayer ? 'multiplayer' : 'single'
      });
    }
    // faster tick for smoother movement
    loopId = setInterval(step, 130);
  }
  
  function stop(){
    running = false;
    clearInterval(loopId);
  }

  document.addEventListener('keydown', (e)=>{
    // Prevent page scrolling with arrow keys
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    // If game is over, any key should restart first (prevent immediate resume glitch)
    if(gameOver){
      reset();
      return;
    }
    // Player 1: Arrow keys
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
    
    // Player 2 in multiplayer: WASD keys
    if(isMultiplayer) {
      if((e.key === 'w' || e.key === 'W') && dir2.y!==1) {
        dir2 = {x:0,y:-1};
        if(!running) start();
      }
      if((e.key === 's' || e.key === 'S') && dir2.y!==-1) {
        dir2 = {x:0,y:1};
        if(!running) start();
      }
      if((e.key === 'a' || e.key === 'A') && dir2.x!==1) {
        dir2 = {x:-1,y:0};
        if(!running) start();
      }
      if((e.key === 'd' || e.key === 'D') && dir2.x!==-1) {
        dir2 = {x:1,y:0};
        if(!running) start();
      }
    } else {
      // Single player: WASD also controls snake
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
    }
    
    // Any key to restart after game over (redundant fallback)
    if(gameOver){
      reset();
    }
  });

  // Touch/swipe controls for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, {passive: false});

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, {passive: false});

  function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30;

    // If game is over, restart on any touch
    if(gameOver){
      reset();
      return;
    }

    // Determine swipe direction
    if(Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if(Math.abs(deltaX) > minSwipeDistance) {
        if(deltaX > 0 && dir.x !== -1) {
          // Swipe right
          dir = {x:1, y:0};
          if(!running) start();
        } else if(deltaX < 0 && dir.x !== 1) {
          // Swipe left
          dir = {x:-1, y:0};
          if(!running) start();
        }
      }
    } else {
      // Vertical swipe
      if(Math.abs(deltaY) > minSwipeDistance) {
        if(deltaY > 0 && dir.y !== -1) {
          // Swipe down
          dir = {x:0, y:1};
          if(!running) start();
        } else if(deltaY < 0 && dir.y !== 1) {
          // Swipe up
          dir = {x:0, y:-1};
          if(!running) start();
        }
      }
    }
  }

  reset();
  // wire reset button (ensure handler is in same scope)
  const resetBtn = document.getElementById('reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      reset();
      updateScore();
    });
  }
});

