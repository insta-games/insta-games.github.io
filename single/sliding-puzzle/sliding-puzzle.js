const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const movesDisplay = document.getElementById('moves');
const timerDisplay = document.getElementById('timer');
const newGameBtn = document.getElementById('newGameBtn');
const hintBtn = document.getElementById('hintBtn');

const GRID_SIZE = 4;
const TILE_SIZE = canvas.width / GRID_SIZE;
let tiles = [];
let emptyPos = { row: 3, col: 3 };
let moves = 0;
let timer = 0;
let timerInterval = null;
let showingSolution = false;
let hoverTile = null;

// Initialize game
function init() {
    tiles = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        tiles[row] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
            const num = row * GRID_SIZE + col + 1;
            tiles[row][col] = (num === 16) ? 0 : num;
        }
    }
    emptyPos = { row: 3, col: 3 };
    moves = 0;
    timer = 0;
    showingSolution = false;
    movesDisplay.textContent = 'Moves: 0';
    timerDisplay.textContent = 'Time: 0:00';
    shuffle();
    startTimer();
}

// Shuffle the puzzle
function shuffle() {
    // Make 100 random valid moves to ensure solvability
    for (let i = 0; i < 100; i++) {
        const neighbors = getNeighbors(emptyPos.row, emptyPos.col);
        const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        moveTile(randomNeighbor.row, randomNeighbor.col, false);
    }
    moves = 0;
    movesDisplay.textContent = 'Moves: 0';
}

// Get neighboring tiles
function getNeighbors(row, col) {
    const neighbors = [];
    if (row > 0) neighbors.push({ row: row - 1, col });
    if (row < GRID_SIZE - 1) neighbors.push({ row: row + 1, col });
    if (col > 0) neighbors.push({ row, col: col - 1 });
    if (col < GRID_SIZE - 1) neighbors.push({ row, col: col + 1 });
    return neighbors;
}

// Move a tile
function moveTile(row, col, countMove = true) {
    // Check if the tile is adjacent to empty space
    const rowDiff = Math.abs(row - emptyPos.row);
    const colDiff = Math.abs(col - emptyPos.col);
    
    if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
        // Swap tile with empty space
        tiles[emptyPos.row][emptyPos.col] = tiles[row][col];
        tiles[row][col] = 0;
        emptyPos = { row, col };
        
        if (countMove) {
            moves++;
            movesDisplay.textContent = `Moves: ${moves}`;
            
            if (checkWin()) {
                stopTimer();
                setTimeout(() => {
                    alert(`🎉 You won!\n\nMoves: ${moves}\nTime: ${formatTime(timer)}`);
                }, 100);
            }
        }
    }
}

// Check if puzzle is solved
function checkWin() {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const expectedNum = row * GRID_SIZE + col + 1;
            if (row === 3 && col === 3) {
                if (tiles[row][col] !== 0) return false;
            } else {
                if (tiles[row][col] !== expectedNum) return false;
            }
        }
    }
    return true;
}

// Draw the puzzle
function draw() {
    // Clear with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw tiles
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const num = tiles[row][col];
            if (num === 0) continue; // Skip empty space
            
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;
            
            // Determine if tile is in correct position
            const correctNum = row * GRID_SIZE + col + 1;
            const isCorrect = showingSolution && (num === correctNum);
            
            // Check if this tile is hovered and can be moved
            const isHovered = hoverTile && hoverTile.row === row && hoverTile.col === col;
            const canMove = isHovered && Math.abs(row - emptyPos.row) + Math.abs(col - emptyPos.col) === 1;
            
            // Tile background with gradient
            const gradient = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
            if (showingSolution) {
                if (isCorrect) {
                    gradient.addColorStop(0, '#10b981');
                    gradient.addColorStop(1, '#059669');
                } else {
                    gradient.addColorStop(0, '#ef4444');
                    gradient.addColorStop(1, '#dc2626');
                }
            } else {
                if (canMove) {
                    // Brighter for hoverable tiles
                    gradient.addColorStop(0, '#1e3a8a');
                    gradient.addColorStop(1, '#1e40af');
                } else {
                    // Dark blue gradient
                    gradient.addColorStop(0, '#1e293b');
                    gradient.addColorStop(1, '#0f172a');
                }
            }
            ctx.fillStyle = gradient;
            
            // Rounded rectangle tile
            const radius = 10;
            const padding = 5;
            
            ctx.beginPath();
            ctx.roundRect(x + padding, y + padding, TILE_SIZE - padding * 2, TILE_SIZE - padding * 2, radius);
            ctx.fill();
            
            // Glowing edge effect
            ctx.strokeStyle = canMove && !showingSolution ? '#3b82f6' : '#475569';
            ctx.lineWidth = 2;
            ctx.shadowColor = canMove && !showingSolution ? '#3b82f6' : '#475569';
            ctx.shadowBlur = canMove && !showingSolution ? 8 : 4;
            ctx.stroke();
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            // Tile number
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 48px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(num, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
            
            // Small indicator for correct position when showing solution
            if (showingSolution && isCorrect) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px Inter';
                ctx.fillText('✓', x + TILE_SIZE - 20, y + 20);
            }
        }
    }
    
    // Draw empty space with glow effect
    const x = emptyPos.col * TILE_SIZE;
    const y = emptyPos.row * TILE_SIZE;
    
    // Outer glow
    const glowGradient = ctx.createRadialGradient(
        x + TILE_SIZE / 2, y + TILE_SIZE / 2, 0,
        x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 2
    );
    glowGradient.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
    glowGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    // Empty space border
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const padding = 8;
    ctx.strokeRect(x + padding, y + padding, TILE_SIZE - padding * 2, TILE_SIZE - padding * 2);
    ctx.setLineDash([]);
}

// Timer functions
function startTimer() {
    stopTimer();
    timer = 0;
    timerInterval = setInterval(() => {
        timer++;
        timerDisplay.textContent = `Time: ${formatTime(timer)}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Event listeners
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        hoverTile = { row, col };
        
        // Change cursor if tile can be moved
        const canMove = Math.abs(row - emptyPos.row) + Math.abs(col - emptyPos.col) === 1;
        canvas.style.cursor = canMove ? 'pointer' : 'default';
    } else {
        hoverTile = null;
        canvas.style.cursor = 'default';
    }
    
    draw();
});

canvas.addEventListener('mouseleave', () => {
    hoverTile = null;
    canvas.style.cursor = 'default';
    draw();
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    
    moveTile(row, col);
});

newGameBtn.addEventListener('click', init);

hintBtn.addEventListener('click', () => {
    showingSolution = !showingSolution;
    hintBtn.textContent = showingSolution ? 'Hide Solution' : 'Show Solution';
});

// Initialize game on load
init();

// Continuous draw loop for smooth hover effects
function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
