document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const resetBtn = document.getElementById('resetBtn');
    
    const TRACK_WIDTH = 800;
    const TRACK_HEIGHT = 600;
    const LANE_WIDTH = 100;
    const CAR_WIDTH = 40;
    const CAR_HEIGHT = 60;
    const FINISH_LINE = 50;
    
    let gameState = 'ready'; // ready, playing, finished
    let winner = null;
    
    // Player 1 (Cyan - left lane)
    const player1 = {
        x: 130, // Centered in left lane (100-200)
        y: TRACK_HEIGHT - 100,
        width: CAR_WIDTH,
        height: CAR_HEIGHT,
        speed: 0,
        maxSpeed: 12, // Increased from 8
        acceleration: 0.4, // Increased from 0.3
        friction: 0.12, // Reduced for less slowdown
        color: '#06b6d4',
        keys: { up: false, down: false, left: false, right: false },
        lane: 0,
        laneX: 130,
        minX: 105,
        maxX: 175,
        distance: 0
    };
    
    // Player 2 (Blue - right lane)
    const player2 = {
        x: 630, // Centered in right lane (600-700)
        y: TRACK_HEIGHT - 100,
        width: CAR_WIDTH,
        height: CAR_HEIGHT,
        speed: 0,
        maxSpeed: 12, // Increased from 8
        acceleration: 0.4, // Increased from 0.3
        friction: 0.12, // Reduced for less slowdown
        color: '#3b82f6',
        keys: { up: false, down: false, left: false, right: false },
        lane: 1,
        laneX: 630,
        minX: 605,
        maxX: 675,
        distance: 0
    };
    
    // Obstacles
    let obstacles = [];
    let obstacleTimer = 0;
    const OBSTACLE_INTERVAL = 100; // Reduced from 120 for more frequent obstacles
    
    // Speed boosts
    let boosts = [];
    let boostTimer = 0;
    const BOOST_INTERVAL = 150; // Reduced from 180 for more frequent boosts
    
    // Track scroll
    let trackOffset = 0;
    let distanceTraveled = 0;
    const RACE_DISTANCE = 2500; // Reduced from 3000 for faster races
    
    function createObstacle() {
        const lanes = [130, 630]; // Match player lane centers
        const laneIndex = Math.floor(Math.random() * 2);
        obstacles.push({
            x: lanes[laneIndex] - 25, // Center obstacle (50px wide)
            y: -50,
            width: 50,
            height: 50,
            lane: laneIndex
        });
    }
    
    function createBoost() {
        const lanes = [130, 630]; // Match player lane centers
        const laneIndex = Math.floor(Math.random() * 2);
        boosts.push({
            x: lanes[laneIndex] - 20, // Center boost (40px wide)
            y: -30,
            width: 40,
            height: 40,
            lane: laneIndex
        });
    }
    
    function checkCollision(player, obj) {
        return player.x < obj.x + obj.width &&
               player.x + player.width > obj.x &&
               player.y < obj.y + obj.height &&
               player.y + player.height > obj.y;
    }
    
    function updatePlayer(player) {
        // Acceleration and braking
        if (player.keys.up) {
            player.speed = Math.min(player.speed + player.acceleration, player.maxSpeed);
        } else if (player.keys.down) {
            player.speed = Math.max(player.speed - player.acceleration * 2, 0);
        } else {
            // Apply friction
            player.speed = Math.max(player.speed - player.friction, 0);
        }
        
        // Lane switching with boundaries
        if (player.keys.left && player.x > player.minX) {
            player.x -= 2;
        }
        if (player.keys.right && player.x < player.maxX) {
            player.x += 2;
        }
        
        // Keep car centered in lane when no input
        if (!player.keys.left && !player.keys.right) {
            if (player.x < player.laneX - 1) {
                player.x += 1;
            } else if (player.x > player.laneX + 1) {
                player.x -= 1;
            }
        }
        
        // Check collisions with obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (checkCollision(player, obstacles[i])) {
                player.speed *= 0.3; // Slow down on collision
                obstacles.splice(i, 1);
            }
        }
        
        // Check collisions with boosts
        for (let i = boosts.length - 1; i >= 0; i--) {
            if (checkCollision(player, boosts[i])) {
                player.speed = Math.min(player.speed + 3, player.maxSpeed + 2);
                boosts.splice(i, 1);
            }
        }
    }
    
    function update() {
        if (gameState !== 'playing') return;
        
        updatePlayer(player1);
        updatePlayer(player2);
        
        // Update individual player distances
        player1.distance += player1.speed;
        player2.distance += player2.speed;
        
        // Update track offset based on maximum speed (faster car drives the visual)
        const maxSpeed = Math.max(player1.speed, player2.speed);
        trackOffset += maxSpeed;
        distanceTraveled += maxSpeed;
        
        // Spawn obstacles (only if cars are moving)
        if (maxSpeed > 0) {
            obstacleTimer++;
            if (obstacleTimer >= OBSTACLE_INTERVAL) {
                createObstacle();
                obstacleTimer = 0;
            }
            
            // Spawn boosts
            boostTimer++;
            if (boostTimer >= BOOST_INTERVAL) {
                createBoost();
                boostTimer = 0;
            }
        }
        
        // Move obstacles based on max speed (track moves faster when cars go faster)
        const obstacleSpeed = 3 + maxSpeed * 0.5; // Base speed + proportional to car speed
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].y += obstacleSpeed;
            if (obstacles[i].y > TRACK_HEIGHT) {
                obstacles.splice(i, 1);
            }
        }
        
        // Move boosts
        for (let i = boosts.length - 1; i >= 0; i--) {
            boosts[i].y += obstacleSpeed;
            if (boosts[i].y > TRACK_HEIGHT) {
                boosts.splice(i, 1);
            }
        }
        
        // Check for winner - first to reach RACE_DISTANCE
        if (player1.distance >= RACE_DISTANCE || player2.distance >= RACE_DISTANCE) {
            gameState = 'finished';
            if (player1.distance > player2.distance) {
                winner = 1;
                statusEl.textContent = '🏆 Player 1 (Cyan) Wins!';
                statusEl.style.color = '#06b6d4';
            } else if (player2.distance > player1.distance) {
                winner = 2;
                statusEl.textContent = '🏆 Player 2 (Blue) Wins!';
                statusEl.style.color = '#3b82f6';
            } else {
                statusEl.textContent = '🏁 It\'s a Tie!';
                statusEl.style.color = '#f59e0b';
            }
        }
    }
    
    function drawTrack() {
        // Draw background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, TRACK_HEIGHT);
        gradient.addColorStop(0, '#1a1f35');
        gradient.addColorStop(1, '#0a0e1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, TRACK_WIDTH, TRACK_HEIGHT);
        
        // Draw lanes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        
        // Left lane
        ctx.strokeRect(100, 0, 100, TRACK_HEIGHT);
        // Right lane
        ctx.strokeRect(600, 0, 100, TRACK_HEIGHT);
        
        // Draw lane dividers (animated)
        ctx.setLineDash([20, 20]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        const offset = (trackOffset % 40);
        ctx.lineDashOffset = -offset;
        
        ctx.beginPath();
        ctx.moveTo(150, 0);
        ctx.lineTo(150, TRACK_HEIGHT);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(650, 0);
        ctx.lineTo(650, TRACK_HEIGHT);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // Draw progress bar
        const progress = Math.min(distanceTraveled / RACE_DISTANCE, 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(10, 10, 200, 20);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(10, 10, 200 * progress, 20);
        ctx.strokeStyle = '#06b6d4';
        ctx.strokeRect(10, 10, 200, 20);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Inter';
        ctx.fillText(`${Math.floor(progress * 100)}%`, 220, 25);
        
        // Draw finish line if close
        if (distanceTraveled >= RACE_DISTANCE - 500) {
            const finishY = TRACK_HEIGHT - ((RACE_DISTANCE - distanceTraveled) / 5);
            if (finishY > 0 && finishY < TRACK_HEIGHT) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(0, finishY, TRACK_WIDTH, 5);
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 24px Inter';
                ctx.fillText('FINISH', TRACK_WIDTH / 2 - 50, finishY - 10);
            }
        }
    }
    
    function drawCar(player) {
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        
        // Car body
        ctx.fillStyle = player.color;
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        
        // Car details
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-player.width / 2 + 5, -player.height / 2 + 10, player.width - 10, 15); // windshield
        
        // Wheels
        ctx.fillStyle = '#1a1f35';
        ctx.fillRect(-player.width / 2 - 3, -player.height / 2 + 5, 5, 12);
        ctx.fillRect(player.width / 2 - 2, -player.height / 2 + 5, 5, 12);
        ctx.fillRect(-player.width / 2 - 3, player.height / 2 - 17, 5, 12);
        ctx.fillRect(player.width / 2 - 2, player.height / 2 - 17, 5, 12);
        
        // Speed indicator
        if (player.speed > 0) {
            ctx.fillStyle = player.color;
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(-player.width / 2 + 10, player.height / 2 + 10 + i * 15, 
                           player.width - 20, 8);
            }
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }
    
    function drawObstacles() {
        ctx.fillStyle = '#ef4444';
        obstacles.forEach(obs => {
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            // Warning stripes
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(obs.x + 5, obs.y + 5, obs.width - 10, 5);
            ctx.fillRect(obs.x + 5, obs.y + obs.height - 10, obs.width - 10, 5);
            ctx.fillStyle = '#ef4444';
        });
    }
    
    function drawBoosts() {
        boosts.forEach(boost => {
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(boost.x + boost.width / 2, boost.y + boost.height / 2, 
                   boost.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Star shape
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('⚡', boost.x + 10, boost.y + 28);
        });
    }
    
    function draw() {
        drawTrack();
        drawObstacles();
        drawBoosts();
        drawCar(player1);
        drawCar(player2);
        
        // Draw speeds
        ctx.fillStyle = player1.color;
        ctx.font = '14px Inter';
        ctx.fillText(`P1: ${Math.floor(player1.speed * 20)} mph`, 10, TRACK_HEIGHT - 10);
        
        ctx.fillStyle = player2.color;
        ctx.fillText(`P2: ${Math.floor(player2.speed * 20)} mph`, TRACK_WIDTH - 120, TRACK_HEIGHT - 10);
    }
    
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    function startGame() {
        gameState = 'playing';
        statusEl.textContent = 'Race to the finish!';
        statusEl.style.color = '#06b6d4';
        distanceTraveled = 0;
        trackOffset = 0;
        obstacles = [];
        boosts = [];
        obstacleTimer = 0;
        boostTimer = 0;
        winner = null;
        
        player1.speed = 0;
        player2.speed = 0;
    }
    
    function resetGame() {
        gameState = 'ready';
        statusEl.textContent = 'Press SPACE to Start Race!';
        statusEl.style.color = '#06b6d4';
        
        player1.x = 130;
        player1.y = TRACK_HEIGHT - 100;
        player1.speed = 0;
        player1.distance = 0;
        
        player2.x = 630;
        player2.y = TRACK_HEIGHT - 100;
        player2.speed = 0;
        player2.distance = 0;
        
        obstacles = [];
        boosts = [];
        distanceTraveled = 0;
        trackOffset = 0;
        winner = null;
    }
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        // Player 1 controls
        if (e.key === 'w' || e.key === 'W') player1.keys.up = true;
        if (e.key === 's' || e.key === 'S') player1.keys.down = true;
        if (e.key === 'a' || e.key === 'A') player1.keys.left = true;
        if (e.key === 'd' || e.key === 'D') player1.keys.right = true;
        
        // Player 2 controls
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            player2.keys.up = true;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            player2.keys.down = true;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            player2.keys.left = true;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            player2.keys.right = true;
        }
        
        // Start game
        if (e.key === ' ' && gameState === 'ready') {
            e.preventDefault();
            startGame();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        // Player 1 controls
        if (e.key === 'w' || e.key === 'W') player1.keys.up = false;
        if (e.key === 's' || e.key === 'S') player1.keys.down = false;
        if (e.key === 'a' || e.key === 'A') player1.keys.left = false;
        if (e.key === 'd' || e.key === 'D') player1.keys.right = false;
        
        // Player 2 controls
        if (e.key === 'ArrowUp') player2.keys.up = false;
        if (e.key === 'ArrowDown') player2.keys.down = false;
        if (e.key === 'ArrowLeft') player2.keys.left = false;
        if (e.key === 'ArrowRight') player2.keys.right = false;
    });
    
    resetBtn.addEventListener('click', resetGame);
    
    // Start game loop
    gameLoop();
});
