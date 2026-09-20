const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const movesDisplay = document.getElementById('moves');
const newGameBtn = document.getElementById('newGameBtn');

const GRID_SIZE = 8;
const CELL_SIZE = 60;
const GRID_OFFSET = 10;

// Gem types with colors and emojis
const gems = [
    { color: '#ef4444', emoji: '🔴' },
    { color: '#3b82f6', emoji: '🔵' },
    { color: '#10b981', emoji: '🟢' },
    { color: '#eab308', emoji: '🟡' },
    { color: '#8b5cf6', emoji: '🟣' },
    { color: '#f97316', emoji: '🟠' }
];

let grid = [];
let score = 0;
let moves = 30;
let selectedGem = null;
let animating = false;

// Initialize game
function init() {
    grid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        grid[row] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
            grid[row][col] = Math.floor(Math.random() * gems.length);
        }
    }
    
    // Remove initial matches
    while (findMatches().length > 0) {
        removeMatches();
        fillEmptyCells();
    }
    
    score = 0;
    moves = 30;
    selectedGem = null;
    animating = false;
    
    scoreDisplay.textContent = 'Score: 0';
    movesDisplay.textContent = 'Moves: 30';
    
    draw();
}

// Draw grid
function draw() {
    // Clear with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw gems
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const gemType = grid[row][col];
            const gem = gems[gemType];
            
            const x = GRID_OFFSET + col * CELL_SIZE;
            const y = GRID_OFFSET + row * CELL_SIZE;
            
            // Gem background
            ctx.fillStyle = gem.color;
            ctx.beginPath();
            ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 2 - 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Gem border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Highlight selected gem
            if (selectedGem && selectedGem.row === row && selectedGem.col === col) {
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 4;
                ctx.stroke();
            }
            
            // Draw emoji
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(gem.emoji, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
        }
    }
}

// Find matches
function findMatches() {
    const matches = [];
    
    // Check horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE - 2; col++) {
            const gem = grid[row][col];
            if (gem === grid[row][col + 1] && gem === grid[row][col + 2]) {
                let matchLength = 3;
                while (col + matchLength < GRID_SIZE && grid[row][col + matchLength] === gem) {
                    matchLength++;
                }
                
                for (let i = 0; i < matchLength; i++) {
                    matches.push({ row, col: col + i });
                }
                col += matchLength - 1;
            }
        }
    }
    
    // Check vertical matches
    for (let col = 0; col < GRID_SIZE; col++) {
        for (let row = 0; row < GRID_SIZE - 2; row++) {
            const gem = grid[row][col];
            if (gem === grid[row + 1][col] && gem === grid[row + 2][col]) {
                let matchLength = 3;
                while (row + matchLength < GRID_SIZE && grid[row + matchLength][col] === gem) {
                    matchLength++;
                }
                
                for (let i = 0; i < matchLength; i++) {
                    matches.push({ row: row + i, col });
                }
                row += matchLength - 1;
            }
        }
    }
    
    // Remove duplicates
    const unique = [];
    const seen = new Set();
    for (const match of matches) {
        const key = `${match.row},${match.col}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(match);
        }
    }
    
    return unique;
}

// Remove matches
function removeMatches() {
    const matches = findMatches();
    
    if (matches.length > 0) {
        for (const match of matches) {
            grid[match.row][match.col] = -1; // Mark as empty
        }
        
        score += matches.length * 10;
        scoreDisplay.textContent = `Score: ${score}`;
        return true;
    }
    
    return false;
}

// Fill empty cells
function fillEmptyCells() {
    // Move gems down
    for (let col = 0; col < GRID_SIZE; col++) {
        let emptyRow = GRID_SIZE - 1;
        for (let row = GRID_SIZE - 1; row >= 0; row--) {
            if (grid[row][col] !== -1) {
                if (row !== emptyRow) {
                    grid[emptyRow][col] = grid[row][col];
                    grid[row][col] = -1;
                }
                emptyRow--;
            }
        }
    }
    
    // Fill empty spaces with new gems
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (grid[row][col] === -1) {
                grid[row][col] = Math.floor(Math.random() * gems.length);
            }
        }
    }
}

// Process matches and cascades
async function processMatches() {
    animating = true;
    
    let matchFound = true;
    while (matchFound) {
        matchFound = removeMatches();
        if (matchFound) {
            draw();
            await sleep(300);
            fillEmptyCells();
            draw();
            await sleep(300);
        }
    }
    
    animating = false;
    
    // Check if game over
    if (moves <= 0) {
        setTimeout(() => {
            alert(`Game Over!\n\nFinal Score: ${score}`);
        }, 100);
    }
}

// Swap gems
function swapGems(row1, col1, row2, col2) {
    const temp = grid[row1][col1];
    grid[row1][col1] = grid[row2][col2];
    grid[row2][col2] = temp;
}

// Check if swap is valid
function isValidSwap(row1, col1, row2, col2) {
    // Swap temporarily
    swapGems(row1, col1, row2, col2);
    
    // Check for matches
    const matches = findMatches();
    const valid = matches.length > 0;
    
    // Swap back
    swapGems(row1, col1, row2, col2);
    
    return valid;
}

// Helper sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle gem selection and swapping
canvas.addEventListener('click', async (e) => {
    if (animating || moves <= 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor((x - GRID_OFFSET) / CELL_SIZE);
    const row = Math.floor((y - GRID_OFFSET) / CELL_SIZE);
    
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
    
    if (!selectedGem) {
        // Select first gem
        selectedGem = { row, col };
        draw();
    } else {
        // Check if adjacent
        const rowDiff = Math.abs(row - selectedGem.row);
        const colDiff = Math.abs(col - selectedGem.col);
        
        if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
            // Adjacent gem selected - try to swap
            if (isValidSwap(selectedGem.row, selectedGem.col, row, col)) {
                swapGems(selectedGem.row, selectedGem.col, row, col);
                moves--;
                movesDisplay.textContent = `Moves: ${moves}`;
                selectedGem = null;
                draw();
                await processMatches();
            } else {
                // Invalid swap
                selectedGem = null;
                draw();
            }
        } else {
            // Not adjacent - select new gem
            selectedGem = { row, col };
            draw();
        }
    }
});

newGameBtn.addEventListener('click', init);

// Initialize
init();
