document.addEventListener('DOMContentLoaded', ()=>{
  const canvas = document.getElementById('pong');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('pong-score');

  // Game objects
  const paddleW = 12;
  const paddleH = 80;
  const ballSize = 8;
  
  // Check for forced mode
  let mode = 'single';
  if (window.FORCE_SINGLE_PLAYER) {
    mode = 'single';
  } else if (window.FORCE_MULTIPLAYER) {
    mode = 'multi';
  }
  
  let player = {x: 20, y: canvas.height/2 - paddleH/2, w: paddleW, h: paddleH, speed: 6, dy: 0};
  let opponent = {x: canvas.width - 20 - paddleW, y: canvas.height/2 - paddleH/2, w: paddleW, h: paddleH, speed: 4, dy: 0};
  let ball = {x: canvas.width/2, y: canvas.height/2, dx: 4, dy: 3, size: ballSize};
  
  let playerScore = 0;
  let opponentScore = 0;
  let running = false;
  let gameOver = false;
  let winner = '';
  // difficulty selector
  const diffEl = document.getElementById('pong-difficulty');
  let difficulty = diffEl?.value || 'impossible';
  if (diffEl) diffEl.addEventListener('change', (e) => { difficulty = e.target.value; });

  function reset(){
    ball.x = canvas.width/2;
    ball.y = canvas.height/2;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
    ball.dy = (Math.random() - 0.5) * 6;
    player.y = canvas.height/2 - paddleH/2;
    opponent.y = canvas.height/2 - paddleH/2;
  }

  function resetGame(){
    playerScore = 0;
    opponentScore = 0;
    gameOver = false;
    winner = '';
    reset();
    updateScore();
  }

  function updateScore(){
    const label1 = mode === 'single' ? 'You' : 'Player 1';
    const label2 = mode === 'single' ? 'AI' : 'Player 2';
    statusEl.textContent = `${label1}: ${playerScore} | ${label2}: ${opponentScore}`;
  }

  function draw(){
    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width/2, 0);
    ctx.lineTo(canvas.width/2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Player paddle (left)
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // Opponent paddle (right)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(opponent.x, opponent.y, opponent.w, opponent.h);

    // Ball
    ctx.fillStyle = '#fff';
    ctx.fillRect(ball.x - ball.size/2, ball.y - ball.size/2, ball.size, ball.size);

    // Instructions
    if(!running && !gameOver){
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Press SPACE or tap to start', canvas.width/2, canvas.height/2 + 60);
    }

    // Game over
    if(gameOver){
      ctx.fillStyle = winner === 'player' ? '#10b981' : '#ef4444';
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const winText = mode === 'single' 
        ? (winner === 'player' ? 'You Win!' : 'AI Wins!')
        : (winner === 'player' ? 'Player 1 Wins!' : 'Player 2 Wins!');
      ctx.fillText(winText, canvas.width/2, canvas.height/2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('Press SPACE or tap to play again', canvas.width/2, canvas.height/2 + 20);
    }
  }

  function update(){
    if(!running || gameOver) return;

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with top/bottom
    if(ball.y - ball.size/2 <= 0){
      ball.y = ball.size/2;
      ball.dy = Math.abs(ball.dy);
    }
    if(ball.y + ball.size/2 >= canvas.height){
      ball.y = canvas.height - ball.size/2;
      ball.dy = -Math.abs(ball.dy);
    }

    // Ball collision with player paddle
    if(ball.x - ball.size/2 <= player.x + player.w &&
       ball.x + ball.size/2 >= player.x &&
       ball.y >= player.y &&
       ball.y <= player.y + player.h){
      ball.dx = Math.abs(ball.dx);
      // Add spin based on where it hit
      let relativeHit = (ball.y - (player.y + player.h/2)) / (player.h/2);
      ball.dy = relativeHit * 5;
    }

    // Ball collision with opponent paddle
    if(ball.x + ball.size/2 >= opponent.x &&
       ball.x - ball.size/2 <= opponent.x + opponent.w &&
       ball.y >= opponent.y &&
       ball.y <= opponent.y + opponent.h){
      ball.dx = -Math.abs(ball.dx);
      let relativeHit = (ball.y - (opponent.y + opponent.h/2)) / (opponent.h/2);
      ball.dy = relativeHit * 5;
    }

    // Score points
    if(ball.x < 0){
      opponentScore++;
      updateScore();
      if(opponentScore >= 5){
        gameOver = true;
        winner = 'opponent';
        running = false;
        
        // Track game over
        if (typeof gtag === 'function') {
          gtag('event', 'game_over', {
            'game_name': 'pong',
            'score': playerScore,
            'opponent_score': opponentScore,
            'winner': winner
          });
        }
      } else {
        reset();
        running = false;
      }
    }
    if(ball.x > canvas.width){
      playerScore++;
      updateScore();
      if(playerScore >= 5){
        gameOver = true;
        winner = 'player';
        running = false;
        
        // Track game over
        if (typeof gtag === 'function') {
          gtag('event', 'game_over', {
            'game_name': 'pong',
            'score': playerScore,
            'opponent_score': opponentScore,
            'winner': winner
          });
        }
      } else {
        reset();
        running = false;
      }
    }

    // Move player paddle
    player.y += player.dy;
    if(player.y < 0) player.y = 0;
    if(player.y + player.h > canvas.height) player.y = canvas.height - player.h;

    // Move opponent paddle (AI or Player 2)
    if (mode === 'single') {
      // AI behavior depends on difficulty
      const aiCenter = opponent.y + opponent.h/2;
      const targetY = ball.y - opponent.h/2;
      if (difficulty === 'easy') {
        // Randomized, slow reactions. Only track when ball is very near the AI side
        if (ball.x > canvas.width * 0.75) {
          if (Math.random() < 0.6) {
            if (aiCenter < ball.y - 6) opponent.y += opponent.speed * 0.6;
            else if (aiCenter > ball.y + 6) opponent.y -= opponent.speed * 0.6;
          }
        }
      } else if (difficulty === 'medium') {
        // Try to track, but with occasional mistakes
        if (ball.x > canvas.width/2) {
          const miss = Math.random() < 0.12; // 12% chance to miss
          const aim = miss ? ball.y + (Math.random() - 0.5) * 80 : ball.y;
          if (aiCenter < aim - 6) opponent.y += opponent.speed * 0.9;
          else if (aiCenter > aim + 6) opponent.y -= opponent.speed * 0.9;
        }
      } else if (difficulty === 'hard') {
        // Strong tracking with small reaction lag
        if (ball.x > canvas.width/2) {
          if (aiCenter < targetY - 4) opponent.y += opponent.speed * 1.1;
          else if (aiCenter > targetY + 4) opponent.y -= opponent.speed * 1.1;
        }
      } else {
        // impossible: perfect tracking (follow ball exactly)
        opponent.y = ball.y - opponent.h/2;
      }
    } else {
      // Player 2 controls
      opponent.y += opponent.dy;
    }
    
    if(opponent.y < 0) opponent.y = 0;
    if(opponent.y + opponent.h > canvas.height) opponent.y = canvas.height - opponent.h;
  }

  function start(){
    if(gameOver){
      resetGame();
    }
    running = true;
    
    // Track game start
    if (typeof gtag === 'function') {
      gtag('event', 'game_start', {
        'game_name': 'pong'
      });
    }
  }

  // Keyboard controls
  let keys = {};
  document.addEventListener('keydown', (e)=>{
    // prevent page scroll for arrow keys, space, and WASD used for controls
    if(['ArrowUp','ArrowDown',' ','w','W','s','S'].includes(e.key)) {
      try { e.preventDefault(); } catch (err) {}
    }
    keys[e.key] = true;
    if(e.key === ' '){
      if(!running){
        start();
      }
    }
  });
  document.addEventListener('keyup', (e)=>{
    keys[e.key] = false;
  });

  function handleKeyboard(){
    player.dy = 0;
    opponent.dy = 0;
    
    // Player 1 controls (left paddle) - W/S or Arrow keys in single player
    if(keys['w'] || keys['W']){
      player.dy = -player.speed;
    }
    if(keys['s'] || keys['S']){
      player.dy = player.speed;
    }
    
    // In single player mode, arrow keys also control player paddle
    if(mode === 'single'){
      if(keys['ArrowUp']){
        player.dy = -player.speed;
      }
      if(keys['ArrowDown']){
        player.dy = player.speed;
      }
    }
    
    // Player 2 controls (right paddle) - only in multiplayer mode
    if(mode === 'multi'){
      if(keys['ArrowUp']){
        opponent.dy = -opponent.speed;
      }
      if(keys['ArrowDown']){
        opponent.dy = opponent.speed;
      }
    }
  }

  // Touch controls
  let touchY = null;
  canvas.addEventListener('touchstart', (e)=>{
    e.preventDefault();
    if(!running){
      start();
    }
    touchY = e.touches[0].clientY;
  }, {passive: false});

  canvas.addEventListener('touchmove', (e)=>{
    e.preventDefault();
    if(e.touches.length > 0){
      const rect = canvas.getBoundingClientRect();
      const newTouchY = e.touches[0].clientY - rect.top;
      player.y = newTouchY - player.h/2;
      if(player.y < 0) player.y = 0;
      if(player.y + player.h > canvas.height) player.y = canvas.height - player.h;
    }
  }, {passive: false});

  canvas.addEventListener('click', ()=>{
    if(!running){
      start();
    }
  });

  // Main game loop
  function gameLoop(){
    handleKeyboard();
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  function setMode(newMode) {
    mode = newMode;
    resetGame();
    running = false;
    
    if (mode === 'single') {
      opponent.speed = 4; // AI speed
    } else {
      opponent.speed = 6; // Player 2 speed
    }
  }

  // Start in appropriate mode
  setMode(mode);
  draw();
  gameLoop();
  
  // Reset button (if present)
  const resetBtn = document.getElementById('reset');
  if (resetBtn) resetBtn.addEventListener('click', () => resetGame());
});
