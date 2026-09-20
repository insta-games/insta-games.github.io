const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const newGameBtn = document.getElementById('newGameBtn');

const GRID_SIZE = 8;
const CELL_SIZE = 50;
const GRID_OFFSET_X = 50;
const GRID_OFFSET_Y = 50;
const PIECES_Y = 500;

let grid = [];
let score = 0;
let highScore = localStorage.getItem('blockPuzzleHighScore') || 0;
let currentPieces = [];
let draggedPiece = null;
let dragOffset = { x: 0, y: 0 };

// Block shapes (like Tetris but simpler)
const shapes = [
    [[1]], // Single block
    [[1, 1]], // Horizontal 2
    [[1], [1]], // Vertical 2
    [[1, 1, 1]], // Horizontal 3
    [[1], [1], [1]], // Vertical 3
    [[1, 1], [1, 1]], // Square 2x2
    [[1, 1, 1, 1]], // Horizontal 4
    [[1], [1], [1], [1]], // Vertical 4
    [[1, 1, 1], [1, 0, 0]], // L shape
    [[1, 1, 1], [0, 0, 1]], // Reversed L
    [[1, 1], [0, 1]], // Small L
    [[1, 1], [1, 0]], // Small reversed L
    [[1, 1, 1], [0, 1, 0]], // T shape
];

// Initialize game
function init() {
    grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    score = 0;
    scoreDisplay.textContent = 'Score: 0';
    highScoreDisplay.textContent = `Best: ${highScore}`;
    generateNewPieces();
    draw();
}

// Generate 3 new pieces
function generateNewPieces() {
    currentPieces = [];
    for (let i = 0; i < 3; i++) {
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#8b5cf6'];
        currentPieces.push({
            shape: JSON.parse(JSON.stringify(shape)),
            color: colors[Math.floor(Math.random() * colors.length)],
            x: 50 + i * 180,
            y: PIECES_Y,
            placed: false
        });
    }
}

// Draw grid
function drawGrid() {
    // No background - let it be transparent and show site background
    
    // Subtle grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(GRID_OFFSET_X + i * CELL_SIZE, GRID_OFFSET_Y);
        ctx.lineTo(GRID_OFFSET_X + i * CELL_SIZE, GRID_OFFSET_Y + GRID_SIZE * CELL_SIZE);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(GRID_OFFSET_X, GRID_OFFSET_Y + i * CELL_SIZE);
        ctx.lineTo(GRID_OFFSET_X + GRID_SIZE * CELL_SIZE, GRID_OFFSET_Y + i * CELL_SIZE);
        ctx.stroke();
    }
    
    // Draw placed blocks
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (grid[row][col]) {
                const x = GRID_OFFSET_X + col * CELL_SIZE;
                const y = GRID_OFFSET_Y + row * CELL_SIZE;
                
                // Use the color stored in the grid
                ctx.fillStyle = grid[row][col];
                ctx.fillRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);
                
                // Glowing edge with matching color
                ctx.strokeStyle = grid[row][col];
                ctx.lineWidth = 2;
                ctx.shadowColor = grid[row][col];
                ctx.shadowBlur = 4;
                ctx.strokeRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }
        }
    }
}

// Draw piece
function drawPiece(piece, alpha = 1) {
    if (piece.placed) return;
    
    ctx.globalAlpha = alpha;
    const shape = piece.shape;
    
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const x = piece.x + col * CELL_SIZE;
                const y = piece.y + row * CELL_SIZE;
                
                // Dark blue block with gradient
                const gradient = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
                gradient.addColorStop(0, '#1e3a8a');
                gradient.addColorStop(1, '#1e40af');
                ctx.fillStyle = gradient;
                ctx.fillRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);
                
                // Glowing edge
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#3b82f6';
                ctx.shadowBlur = 6;
                ctx.strokeRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }
        }
    }
    ctx.globalAlpha = 1;
}

// Draw ghost piece (preview where piece will be placed)
function drawGhostPiece(piece, gridRow, gridCol) {
    if (!canPlacePiece(piece, gridRow, gridCol)) return;
    
    ctx.globalAlpha = 0.4;
    const shape = piece.shape;
    
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const x = GRID_OFFSET_X + (gridCol + col) * CELL_SIZE;
                const y = GRID_OFFSET_Y + (gridRow + row) * CELL_SIZE;
                
                // Ghost preview with blue glow
                ctx.fillStyle = '#1e40af';
                ctx.fillRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);
                
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);
            }
        }
    }
    ctx.globalAlpha = 1;
}

// Check if piece can be placed
function canPlacePiece(piece, gridRow, gridCol) {
    const shape = piece.shape;
    
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const targetRow = gridRow + row;
                const targetCol = gridCol + col;
                
                if (targetRow < 0 || targetRow >= GRID_SIZE || 
                    targetCol < 0 || targetCol >= GRID_SIZE ||
                    grid[targetRow][targetCol]) {
                    return false;
                }
            }
        }
    }
    return true;
}

// Place piece on grid
function placePiece(piece, gridRow, gridCol) {
    const shape = piece.shape;
    const colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#8b5cf6'];
    
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                // Assign random color to each placed block
                grid[gridRow + row][gridCol + col] = colors[Math.floor(Math.random() * colors.length)];
            }
        }
    }
    
    piece.placed = true;
    
    // Calculate score from piece
    let cells = 0;
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) cells++;
        }
    }
    score += cells;
    
    // Clear complete lines
    clearLines();
    
    // Check if all pieces placed
    if (currentPieces.every(p => p.placed)) {
        generateNewPieces();
    }
    
    // Check game over
    if (isGameOver()) {
        setTimeout(() => {
            alert(`Game Over!\n\nFinal Score: ${score}`);
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('blockPuzzleHighScore', highScore);
                highScoreDisplay.textContent = `Best: ${highScore}`;
            }
        }, 100);
    }
    
    scoreDisplay.textContent = `Score: ${score}`;
}

// Clear complete lines
function clearLines() {
    let linesCleared = 0;
    
    // Check rows
    for (let row = 0; row < GRID_SIZE; row++) {
        if (grid[row].every(cell => cell !== 0)) {
            grid[row].fill(0);
            linesCleared++;
        }
    }
    
    // Check columns
    for (let col = 0; col < GRID_SIZE; col++) {
        let full = true;
        for (let row = 0; row < GRID_SIZE; row++) {
            if (grid[row][col] === 0) {
                full = false;
                break;
            }
        }
        if (full) {
            for (let row = 0; row < GRID_SIZE; row++) {
                grid[row][col] = 0;
            }
            linesCleared++;
        }
    }
    
    if (linesCleared > 0) {
        score += linesCleared * GRID_SIZE * 2; // Bonus for clearing lines
        scoreDisplay.textContent = `Score: ${score}`;
    }
}

// Check if game is over
function isGameOver() {
    for (const piece of currentPieces) {
        if (piece.placed) continue;
        
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (canPlacePiece(piece, row, col)) {
                    return false;
                }
            }
        }
    }
    return true;
}

// Draw everything
function draw() {
    // Clear with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawGrid();
    
    // Draw ghost piece if dragging
    if (draggedPiece) {
        const mouseGridX = Math.floor((draggedPiece.x - GRID_OFFSET_X + CELL_SIZE / 2) / CELL_SIZE);
        const mouseGridY = Math.floor((draggedPiece.y - GRID_OFFSET_Y + CELL_SIZE / 2) / CELL_SIZE);
        drawGhostPiece(draggedPiece, mouseGridY, mouseGridX);
    }
    
    // Draw pieces
    for (const piece of currentPieces) {
        if (piece !== draggedPiece) {
            drawPiece(piece);
        }
    }
    
    // Draw dragged piece last (on top)
    if (draggedPiece) {
        drawPiece(draggedPiece, 0.8);
    }
    
    requestAnimationFrame(draw);
}

// Mouse events
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    for (const piece of currentPieces) {
        if (piece.placed) continue;
        
        const shape = piece.shape;
        const width = shape[0].length * CELL_SIZE;
        const height = shape.length * CELL_SIZE;
        
        if (mouseX >= piece.x && mouseX <= piece.x + width &&
            mouseY >= piece.y && mouseY <= piece.y + height) {
            draggedPiece = piece;
            dragOffset.x = mouseX - piece.x;
            dragOffset.y = mouseY - piece.y;
            break;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (draggedPiece) {
        const rect = canvas.getBoundingClientRect();
        draggedPiece.x = e.clientX - rect.left - dragOffset.x;
        draggedPiece.y = e.clientY - rect.top - dragOffset.y;
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (draggedPiece) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate grid position based on top-left corner of piece
        // Use Math.round for better snapping to grid
        const gridCol = Math.round((draggedPiece.x - GRID_OFFSET_X) / CELL_SIZE);
        const gridRow = Math.round((draggedPiece.y - GRID_OFFSET_Y) / CELL_SIZE);
        
        if (canPlacePiece(draggedPiece, gridRow, gridCol)) {
            placePiece(draggedPiece, gridRow, gridCol);
        } else {
            // Return to original position
            const index = currentPieces.indexOf(draggedPiece);
            draggedPiece.x = 50 + index * 180;
            draggedPiece.y = PIECES_Y;
        }
        
        draggedPiece = null;
    }
});

newGameBtn.addEventListener('click', init);

// Initialize
init();
draw();
