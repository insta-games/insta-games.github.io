const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas ? holdCanvas.getContext('2d') : null;
const statusEl = document.getElementById('tetris-status');

const BLOCK_SIZE = 30;
const COLS = 10;
const ROWS = 20;

// Tetromino shapes (I, O, T, S, Z, J, L)
const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

const COLORS = {
    I: '#06b6d4',  // cyan
    O: '#f59e0b',  // amber
    T: '#8b5cf6',  // purple
    S: '#10b981',  // green
    Z: '#ef4444',  // red
    J: '#3b82f6',  // blue
    L: '#f97316'   // orange
};

let board = [];
let currentPiece = null;
let nextPiece = null;
let holdPiece = null;
let canHold = true;
let score = 0;
let lines = 0;
let level = 1;
let gameOver = false;
let isPaused = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

// Key repeat for faster left/right movement
let leftPressed = false;
let rightPressed = false;
let moveCounter = 0;
const moveDelay = 100; // milliseconds between moves when key is held
const initialMoveDelay = 200; // initial delay before fast repeat starts
let leftFirstMove = false;
let rightFirstMove = false;

// Initialize board
function createBoard() {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

// Create a new piece
function createPiece(type) {
    const keys = Object.keys(SHAPES);
    const pieceType = type || keys[Math.floor(Math.random() * keys.length)];
    return {
        shape: SHAPES[pieceType],
        color: COLORS[pieceType],
        type: pieceType,
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[pieceType][0].length / 2),
        y: 0
    };
}

// Draw a block
function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = 'rgba(10,14,26,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// Draw the board
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(ctx, x, y, board[y][x]);
            }
        }
    }
}

// Draw current piece
function drawPiece(piece, context = ctx, offsetX = 0, offsetY = 0) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(context, piece.x + x + offsetX, piece.y + y + offsetY, piece.color);
            }
        });
    });
}

// Calculate where the piece will land
function getGhostY(piece) {
    let ghostY = piece.y;
    while (!collide(piece, board, piece.x, ghostY + 1)) {
        ghostY++;
    }
    return ghostY;
}

// Draw ghost piece (outline showing where piece will land)
function drawGhostPiece(piece) {
    const ghostY = getGhostY(piece);
    if (ghostY === piece.y) return; // Don't draw if already at landing position
    
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const blockX = (piece.x + x) * BLOCK_SIZE;
                const blockY = (ghostY + y) * BLOCK_SIZE;
                
                // Draw semi-transparent outline
                ctx.strokeStyle = piece.color;
                ctx.globalAlpha = 0.3;
                ctx.lineWidth = 3;
                ctx.strokeRect(blockX, blockY, BLOCK_SIZE, BLOCK_SIZE);
                ctx.globalAlpha = 1.0;
            }
        });
    });
}

// Draw next piece preview
function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const offsetX = (4 - nextPiece.shape[0].length) / 2;
        const offsetY = (4 - nextPiece.shape.length) / 2;
        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(nextCtx, x + offsetX, y + offsetY, nextPiece.color);
                }
            });
        });
    }
}

// Draw hold piece preview
function drawHoldPiece() {
    if (!holdCtx) return;
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    
    if (holdPiece) {
        const offsetX = (4 - holdPiece.shape[0].length) / 2;
        const offsetY = (4 - holdPiece.shape.length) / 2;
        holdPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(holdCtx, x + offsetX, y + offsetY, holdPiece.color);
                }
            });
        });
    }
}

// Hold piece function
function hold() {
    if (!canHold) return;
    
    canHold = false;
    
    if (holdPiece === null) {
        // First time holding - store current piece and get next piece
        holdPiece = {
            shape: SHAPES[currentPiece.type],
            color: currentPiece.color,
            type: currentPiece.type
        };
        currentPiece = nextPiece;
        nextPiece = createPiece();
        currentPiece.x = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
        currentPiece.y = 0;
    } else {
        // Swap current piece with held piece
        const temp = {
            shape: SHAPES[currentPiece.type],
            color: currentPiece.color,
            type: currentPiece.type
        };
        currentPiece = createPiece(holdPiece.type);
        holdPiece = temp;
    }
    
    drawHoldPiece();
}

// Check collision
function collide(piece, board, x = piece.x, y = piece.y) {
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (piece.shape[row][col]) {
                const newY = y + row;
                const newX = x + col;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Merge piece to board
function merge() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        });
    });
}

// Rotate piece clockwise
function rotate(piece) {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );
    
    const previousShape = piece.shape;
    const previousX = piece.x;
    const previousY = piece.y;
    
    // Calculate center offset for pivot rotation (horizontal only)
    const oldWidth = piece.shape[0].length;
    const newWidth = rotated[0].length;
    
    const offsetX = Math.floor((oldWidth - newWidth) / 2);
    
    // Temporarily apply rotation
    piece.shape = rotated;
    piece.x = previousX + offsetX;
    piece.y = previousY; // Keep Y position fixed
    
    // Try basic rotation at current position
    if (!collide(piece, board, piece.x, piece.y)) {
        return;
    }
    
    // Wall kick - try different positions (horizontal only to prevent upward floating)
    const kickTests = [
        {x: 1, y: 0},
        {x: -1, y: 0},
        {x: 2, y: 0},
        {x: -2, y: 0}
    ];
    
    for (let kick of kickTests) {
        piece.x = previousX + kick.x;
        piece.y = previousY + kick.y;
        if (!collide(piece, board, piece.x, piece.y)) {
            return;
        }
    }
    
    // If no valid position found, revert all changes
    piece.shape = previousShape;
    piece.x = previousX;
    piece.y = previousY;
}

// Rotate piece counterclockwise
function rotateCounterClockwise(piece) {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[row.length - 1 - i])
    );
    
    const previousShape = piece.shape;
    const previousX = piece.x;
    const previousY = piece.y;
    
    // Calculate center offset for pivot rotation (horizontal only)
    const oldWidth = piece.shape[0].length;
    const newWidth = rotated[0].length;
    
    const offsetX = Math.floor((oldWidth - newWidth) / 2);
    
    // Temporarily apply rotation
    piece.shape = rotated;
    piece.x = previousX + offsetX;
    piece.y = previousY; // Keep Y position fixed
    
    // Try basic rotation at current position
    if (!collide(piece, board, piece.x, piece.y)) {
        return;
    }
    
    // Wall kick - try different positions (horizontal only to prevent upward floating)
    const kickTests = [
        {x: 1, y: 0},
        {x: -1, y: 0},
        {x: 2, y: 0},
        {x: -2, y: 0}
    ];
    
    for (let kick of kickTests) {
        piece.x = previousX + kick.x;
        piece.y = previousY + kick.y;
        if (!collide(piece, board, piece.x, piece.y)) {
            return;
        }
    }
    
    // If no valid position found, revert all changes
    piece.shape = previousShape;
    piece.x = previousX;
    piece.y = previousY;
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;
    
    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (!board[y][x]) {
                continue outer;
            }
        }
        
        // Remove the line
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
        linesCleared++;
        y++; // Check the same row again
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        // Scoring: 1 line = 100, 2 = 300, 3 = 500, 4 = 800
        const points = [0, 100, 300, 500, 800][linesCleared];
        score += points * level;
        
        // Level up every 10 lines
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        updateScore();
    }
}

// Move piece down
function drop() {
    if (!collide(currentPiece, board, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        dropCounter = 0;
    } else {
        merge();
        clearLines();
        currentPiece = nextPiece;
        nextPiece = createPiece();
        canHold = true; // Reset hold ability when piece locks
        
        if (collide(currentPiece, board)) {
            gameOver = true;
            // Track game over
            if (typeof gtag === 'function') {
              gtag('event', 'game_over', {
                'game_name': 'tetris',
                'score': score,
                'lines': lines,
                'level': level
              });
            }
            if(statusEl){
                statusEl.textContent = `Game Over! Final Score: ${score}`;
                statusEl.style.color = '#ef4444';
            }
        }
    }
}

// Hard drop
function hardDrop() {
    while (!collide(currentPiece, board, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        score += 2;
    }
    drop();
    updateScore();
}

// Move piece
function move(dir) {
    if (!collide(currentPiece, board, currentPiece.x + dir, currentPiece.y)) {
        currentPiece.x += dir;
    }
}

// Update score display
function updateScore() {
    const scoreEl = document.getElementById('score');
    const linesEl = document.getElementById('lines');
    const levelEl = document.getElementById('level');
    if (scoreEl) scoreEl.textContent = score;
    if (linesEl) linesEl.textContent = lines;
    if (levelEl) levelEl.textContent = level;
}

// Game loop
function update(time = 0) {
    if (gameOver || isPaused) {
        requestAnimationFrame(update);
        return;
    }
    
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    moveCounter += deltaTime;
    
    // Handle continuous left/right movement with initial delay
    const currentMoveDelay = (leftFirstMove || rightFirstMove) ? initialMoveDelay : moveDelay;
    if (moveCounter > currentMoveDelay) {
        if (leftPressed) {
            move(-1);
            leftFirstMove = false; // After first delay, switch to fast repeat
        }
        if (rightPressed) {
            move(1);
            rightFirstMove = false; // After first delay, switch to fast repeat
        }
        moveCounter = 0;
    }
    
    if (dropCounter > dropInterval) {
        drop();
    }
    
    drawBoard();
    drawGhostPiece(currentPiece);
    drawPiece(currentPiece);
    drawNextPiece();
    drawHoldPiece();
    
    requestAnimationFrame(update);
}

// Keyboard controls
document.addEventListener('keydown', e => {
    if (gameOver) return;
    
    // Track game start on first action
    if (!isPaused && currentPiece && typeof gtag === 'function' && !window.tetrisGameStarted) {
      window.tetrisGameStarted = true;
      gtag('event', 'game_start', {
        'game_name': 'tetris'
      });
    }
    
    // Prevent page scrolling with arrow keys
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
    
    switch(e.key) {
        case 'ArrowLeft':
            if (!leftPressed) {
                move(-1);
                leftPressed = true;
                leftFirstMove = true; // Mark that we need initial delay
                moveCounter = 0;
            }
            break;
        case 'ArrowRight':
            if (!rightPressed) {
                move(1);
                rightPressed = true;
                rightFirstMove = true; // Mark that we need initial delay
                moveCounter = 0;
            }
            break;
        case 'ArrowDown':
            drop();
            break;
        case 'ArrowUp':
            rotate(currentPiece);
            break;
        case 'z':
        case 'Z':
            rotateCounterClockwise(currentPiece);
            break;
        case ' ':
            e.preventDefault();
            hardDrop();
            break;
        case 'c':
        case 'C':
            hold();
            break;
        case 'p':
        case 'P':
            isPaused = !isPaused;
            break;
    }
});

document.addEventListener('keyup', e => {
    switch(e.key) {
        case 'ArrowLeft':
            leftPressed = false;
            leftFirstMove = false;
            break;
        case 'ArrowRight':
            rightPressed = false;
            rightFirstMove = false;
            break;
    }
});

// Touch controls
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
});

canvas.addEventListener('touchend', e => {
    if (gameOver || isPaused) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx > 30) move(1);
        else if (dx < -30) move(-1);
    } else {
        // Vertical swipe
        if (dy > 30) drop();
        else if (dy < -30) rotate(currentPiece);
    }
});

// Restart button
const restartBtn = document.getElementById('restartBtn');
if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        score = 0;
        lines = 0;
        level = 1;
    dropInterval = 1000;
    gameOver = false;
    isPaused = false;
    holdPiece = null;
    canHold = true;
    createBoard();
    currentPiece = createPiece();
    nextPiece = createPiece();
    updateScore();
    if(statusEl){
        statusEl.textContent = '';
        statusEl.style.color = '#9ca3af';
    }
    });
}

// Reset button
const resetBtn = document.getElementById('reset');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = 1000;
        gameOver = false;
        isPaused = false;
        holdPiece = null;
        canHold = true;
        window.tetrisGameStarted = false; // Reset tracking flag
        createBoard();
        currentPiece = createPiece();
        nextPiece = createPiece();
        updateScore();
        if(statusEl){
            statusEl.textContent = '';
            statusEl.style.color = '#9ca3af';
        }
    });
}

// Initialize game
createBoard();
currentPiece = createPiece();
nextPiece = createPiece();
updateScore();
update();
