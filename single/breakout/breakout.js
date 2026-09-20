document.addEventListener('DOMContentLoaded', ()=>{
  const canvas = document.getElementById('breakout');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('breakout-score');

  // Game state
  let mode = 'single'; // 'single' or 'multi'
  let paddle = {x: canvas.width/2 - 50, y: canvas.height - 30, w: 100, h: 12, speed: 8};
  let ball = {x: canvas.width/2, y: canvas.height - 50, dx: 3, dy: -3, r: 6};
  let bricks = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let running = false;
  let gameOver = false;
  let won = false;
  let loopId = null;
  
  // Multiplayer state
  let currentPlayer = 1;
  let player1Score = 0;
  let player2Score = 0;
  let player1Lives = 3;
  let player2Lives = 3;

  // Brick setup - increases with level
  const brickRows = Math.min(5 + Math.floor((level - 1) / 2), 8); // 5-8 rows
  const brickCols = 8;
  const brickW = 55;
  const brickH = 20;
  const brickPadding = 5;
  const brickOffsetTop = 40;
  const brickOffsetLeft = 10;

  function initBricks(){
    bricks = [];
    const rows = Math.min(5 + Math.floor((level - 1) / 2), 8);
    const colors = ['#ef4444','#f59e0b','#10b981','#06b6d4','#8b5cf6','#ec4899','#f97316','#14b8a6'];
    for(let r=0; r<rows; r++){
      for(let c=0; c<brickCols; c++){
        bricks.push({
          x: c * (brickW + brickPadding) + brickOffsetLeft,
          y: r * (brickH + brickPadding) + brickOffsetTop,
          status: 1,
          color: colors[r % colors.length]
        });
      }
    }
  }

  function reset(){
    paddle.x = canvas.width/2 - 50;
    ball.x = canvas.width/2;
    ball.y = canvas.height - 50;
    // Ball speed increases with level
    const speedMultiplier = 1 + (level - 1) * 0.15;
    ball.dx = 3 * speedMultiplier;
    ball.dy = -3 * speedMultiplier;
    
    if(mode === 'single'){
      score = 0;
      lives = 3;
      level = 1;
    } else {
      // In multiplayer, reset everything
      currentPlayer = 1;
      player1Score = 0;
      player2Score = 0;
      player1Lives = 3;
      player2Lives = 3;
      level = 1;
    }
    
    gameOver = false;
    won = false;
    initBricks();
    updateStatus();
    draw();
  }

  function updateStatus(){
    if(mode === 'single'){
      statusEl.textContent = `Level: ${level} | Score: ${score} | Lives: ${lives}`;
    } else {
      statusEl.textContent = `P${currentPlayer}'s Turn | P1: ${player1Score} (${player1Lives}❤) | P2: ${player2Score} (${player2Lives}❤)`;
    }
  }

  function draw(){
    // Clear with transparency to show game-wrap background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Bricks
    bricks.forEach(b=>{
      if(b.status === 1){
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, brickW, brickH);
      }
    });

    // Paddle
    ctx.fillStyle = mode === 'multi' && currentPlayer === 2 ? '#f59e0b' : '#06b6d4';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    // Ball
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
    ctx.fill();

    // Instructions or game over
    if(!running && !gameOver && !won){
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '18px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const startText = mode === 'multi' ? `Player ${currentPlayer}: Press SPACE to start` : 'Press SPACE or tap to start';
      ctx.fillText(startText, canvas.width/2, canvas.height/2);
    }

    if(gameOver){
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 28px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if(mode === 'multi'){
        const winner = player1Score > player2Score ? 'Player 1' : player2Score > player1Score ? 'Player 2' : 'Tie';
        ctx.fillText(winner === 'Tie' ? "It's a Tie!" : `${winner} Wins!`, canvas.width/2, canvas.height/2 - 30);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Inter, Arial, sans-serif';
        ctx.fillText(`P1: ${player1Score} | P2: ${player2Score}`, canvas.width/2, canvas.height/2);
        ctx.fillText('Press SPACE or tap to restart', canvas.width/2, canvas.height/2 + 30);
      } else {
        ctx.fillText('Game Over!', canvas.width/2, canvas.height/2 - 20);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Inter, Arial, sans-serif';
        ctx.fillText('Press SPACE or tap to restart', canvas.width/2, canvas.height/2 + 20);
      }
    }

    if(won){
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 28px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if(level >= 10){
        ctx.fillText('You Beat All 10 Levels!', canvas.width/2, canvas.height/2 - 20);
      } else {
        ctx.fillText(`Level ${level} Complete!`, canvas.width/2, canvas.height/2 - 20);
      }
      ctx.fillStyle = '#fff';
      ctx.font = '16px Inter, Arial, sans-serif';
      if(level >= 10){
        ctx.fillText('Press SPACE or tap to restart', canvas.width/2, canvas.height/2 + 20);
      } else {
        ctx.fillText('Next level starting...', canvas.width/2, canvas.height/2 + 20);
      }
    }
  }

  function update(){
    if(!running || gameOver || won) return;

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collisions
    if(ball.x + ball.r > canvas.width){
      // reflect and nudge back inside to avoid getting stuck
      ball.x = canvas.width - ball.r - 0.5;
      ball.dx = -Math.abs(ball.dx) || -3;
      if(Math.abs(ball.dx) < 1) ball.dx = (ball.dx < 0 ? -1.5 : 1.5);
    } else if(ball.x - ball.r < 0){
      ball.x = ball.r + 0.5;
      ball.dx = Math.abs(ball.dx) || 3;
      if(Math.abs(ball.dx) < 1) ball.dx = (ball.dx < 0 ? -1.5 : 1.5);
    }
    if(ball.y - ball.r < 0){
      ball.dy = -ball.dy;
    }

    // Bottom - lose life
    if(ball.y + ball.r > canvas.height){
      if(mode === 'single'){
        lives--;
        updateStatus();
        if(lives <= 0){
          running = false;
          gameOver = true;
          
          // Track game over
          if (typeof gtag === 'function') {
            gtag('event', 'game_over', {
              'game_name': 'breakout',
              'score': score,
              'level': level,
              'mode': 'single'
            });
          }
        } else {
          ball.x = canvas.width/2;
          ball.y = canvas.height - 50;
          const speedMultiplier = 1 + (level - 1) * 0.15;
          ball.dx = 3 * speedMultiplier;
          ball.dy = -3 * speedMultiplier;
          running = false;
        }
      } else {
        // Multiplayer: lose life and switch turns
        if(currentPlayer === 1){
          player1Lives--;
          if(player1Lives <= 0 && player2Lives <= 0){
            running = false;
            gameOver = true;
          } else if(player1Lives > 0){
            currentPlayer = 2;
            resetBall();
          } else {
            currentPlayer = 2;
            resetBall();
          }
        } else {
          player2Lives--;
          if(player1Lives <= 0 && player2Lives <= 0){
            running = false;
            gameOver = true;
            
            // Track game over
            if (typeof gtag === 'function') {
              gtag('event', 'game_over', {
                'game_name': 'breakout',
                'player1_score': player1Score,
                'player2_score': player2Score,
                'level': level,
                'mode': 'multi'
              });
            }
          } else if(player2Lives > 0){
            currentPlayer = 1;
            resetBall();
          } else {
            currentPlayer = 1;
            resetBall();
          }
        }
        updateStatus();
        running = false;
      }
    }

    // Paddle collision
    if(ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h &&
       ball.x >= paddle.x && ball.x <= paddle.x + paddle.w){
      ball.dy = -Math.abs(ball.dy);
      // Add spin based on where it hit paddle
      let hitPos = (ball.x - paddle.x) / paddle.w; // 0 to 1
      ball.dx = (hitPos - 0.5) * 6;
    }

    // Brick collision
    bricks.forEach(b=>{
      if(b.status === 1){
        if(ball.x > b.x && ball.x < b.x + brickW &&
           ball.y > b.y && ball.y < b.y + brickH){
          ball.dy = -ball.dy;
          b.status = 0;
          
          if(mode === 'single'){
            score += 10;
          } else {
            if(currentPlayer === 1){
              player1Score += 10;
            } else {
              player2Score += 10;
            }
          }
          updateStatus();
        }
      }
    });

    // Check win
    if(bricks.every(b => b.status === 0)){
      running = false;
      won = true;
      
      if(mode === 'single'){
        // Advance to next level
        setTimeout(()=>{
          if(level < 10){
            level++;
            nextLevel();
          } else {
            // Beat all 10 levels
            won = true;
          }
        }, 1500);
      } else {
        // In multiplayer, game ends when all bricks cleared
        setTimeout(()=>{
          gameOver = true;
        }, 1000);
      }
    }

    draw();
  }
  
  function resetBall(){
    ball.x = canvas.width/2;
    ball.y = canvas.height - 50;
    const speedMultiplier = 1 + (level - 1) * 0.15;
    ball.dx = 3 * speedMultiplier;
    ball.dy = -3 * speedMultiplier;
    paddle.x = canvas.width/2 - 50;
  }

  function nextLevel(){
    paddle.x = canvas.width/2 - 50;
    ball.x = canvas.width/2;
    ball.y = canvas.height - 50;
    // Ball speed increases with level
    const speedMultiplier = 1 + (level - 1) * 0.15;
    ball.dx = 3 * speedMultiplier;
    ball.dy = -3 * speedMultiplier;
    won = false;
    initBricks();
    updateStatus();
    draw();
    running = true;
  }

  function start(){
    if(gameOver || won){
      reset();
    }
    running = true;
    
    // Track game start
    if (typeof gtag === 'function') {
      gtag('event', 'game_start', {
        'game_name': 'breakout'
      });
    }
  }

  function gameLoop(){
    update();
    loopId = requestAnimationFrame(gameLoop);
  }

  // Keyboard controls
  let keys = {};
  document.addEventListener('keydown', (e)=>{
    keys[e.key] = true;
    
    // Prevent page scrolling with arrow keys
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    
    if(e.key === ' '){
      e.preventDefault();
      if(!running){
        start();
      }
    }
  });
  document.addEventListener('keyup', (e)=>{
    keys[e.key] = false;
  });

  // Move paddle with keys
  function handleKeyboardPaddle(){
    if(keys['ArrowLeft'] || keys['a'] || keys['A']){
      paddle.x -= paddle.speed;
      if(paddle.x < 0) paddle.x = 0;
    }
    if(keys['ArrowRight'] || keys['d'] || keys['D']){
      paddle.x += paddle.speed;
      if(paddle.x + paddle.w > canvas.width) paddle.x = canvas.width - paddle.w;
    }
  }

  // Mouse controls
  canvas.addEventListener('mousemove', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    paddle.x = mouseX - paddle.w/2;
    if(paddle.x < 0) paddle.x = 0;
    if(paddle.x + paddle.w > canvas.width) paddle.x = canvas.width - paddle.w;
  });

  canvas.addEventListener('click', ()=>{
    if(!running){
      start();
    }
  });

  // Touch controls
  canvas.addEventListener('touchmove', (e)=>{
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    paddle.x = touchX - paddle.w/2;
    if(paddle.x < 0) paddle.x = 0;
    if(paddle.x + paddle.w > canvas.width) paddle.x = canvas.width - paddle.w;
  }, {passive: false});

  canvas.addEventListener('touchstart', (e)=>{
    e.preventDefault();
    if(!running){
      start();
    }
  }, {passive: false});

  // Main loop with keyboard handling
  function mainLoop(){
    handleKeyboardPaddle();
    update();
    requestAnimationFrame(mainLoop);
  }

  function setMode(newMode){
    mode = newMode;
    reset();
    running = false;
  }

  // Global reset button (if present in HTML)
  const resetBtn = document.getElementById('reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // call game reset
      reset();
      // ensure UI shows level/score reset
      updateStatus();
    });
  }

  setMode('single');
  mainLoop();
});
