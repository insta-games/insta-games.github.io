document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const resetBtn = document.getElementById('resetBtn');
    
    const BOARD_SIZE = 8;
    const CELL_SIZE = 80;
    const PIECE_RADIUS = 28;
    
    // 0 = empty, 1 = red piece, 2 = red king, -1 = black piece, -2 = black king
    let board = [];
    let currentPlayer = 1; // 1 = red (human), -1 = black (AI)
    let selectedPiece = null;
    let validMoves = [];
    let gameOver = false;
    let winner = null;
    let mustJump = false;
    let aiThinking = false;
    
    function initBoard() {
        board = Array(8).fill(0).map(() => Array(8).fill(0));
        
        // Place black pieces (top, AI)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    board[row][col] = -1;
                }
            }
        }
        
        // Place red pieces (bottom, human)
        for (let row = 5; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    board[row][col] = 1;
                }
            }
        }
    }
    
    function draw() {
        // Draw board
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                ctx.fillStyle = (row + col) % 2 === 0 ? '#1e293b' : '#334155';
                ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
        
        // Highlight valid moves
        if (selectedPiece) {
            validMoves.forEach(move => {
                ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
                ctx.fillRect(move.col * CELL_SIZE, move.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            });
            
            // Highlight selected piece
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 3;
            ctx.strokeRect(selectedPiece.col * CELL_SIZE, selectedPiece.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        
        // Draw pieces
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                if (piece !== 0) {
                    const x = col * CELL_SIZE + CELL_SIZE / 2;
                    const y = row * CELL_SIZE + CELL_SIZE / 2;
                    
                    // Draw piece
                    ctx.beginPath();
                    ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
                    ctx.fillStyle = piece > 0 ? '#ef4444' : '#1f2937';
                    ctx.fill();
                    ctx.strokeStyle = piece > 0 ? '#dc2626' : '#000';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    // Draw king crown
                    if (Math.abs(piece) === 2) {
                        ctx.fillStyle = piece > 0 ? '#fbbf24' : '#f3f4f6';
                        ctx.font = 'bold 24px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('♔', x, y);
                    }
                }
            }
        }
    }
    
    function getValidMoves(row, col) {
        const piece = board[row][col];
        if (piece === 0) return [];
        
        const moves = [];
        const jumps = [];
        const direction = piece > 0 ? -1 : 1; // Red moves up, black moves down
        const isKing = Math.abs(piece) === 2;
        
        // Check all four diagonal directions
        const directions = isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : [[direction, -1], [direction, 1]];
        
        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                if (board[newRow][newCol] === 0) {
                    moves.push({ row: newRow, col: newCol, jump: false });
                } else if (Math.sign(board[newRow][newCol]) !== Math.sign(piece)) {
                    // Can jump over opponent
                    const jumpRow = newRow + dRow;
                    const jumpCol = newCol + dCol;
                    if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8 && board[jumpRow][jumpCol] === 0) {
                        jumps.push({ row: jumpRow, col: jumpCol, jump: true, captureRow: newRow, captureCol: newCol });
                    }
                }
            }
        }
        
        // If there are jumps available, only return jumps (forced capture rule)
        return jumps.length > 0 ? jumps : moves;
    }
    
    function hasJumps(player) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (Math.sign(board[row][col]) === Math.sign(player)) {
                    const moves = getValidMoves(row, col);
                    if (moves.some(m => m.jump)) return true;
                }
            }
        }
        return false;
    }
    
    function movePiece(fromRow, fromCol, toRow, toCol, move) {
        const piece = board[fromRow][fromCol];
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = 0;
        
        // Capture piece if jump
        if (move.jump) {
            board[move.captureRow][move.captureCol] = 0;
        }
        
        // Check for king promotion
        if (piece === 1 && toRow === 0) board[toRow][toCol] = 2;
        if (piece === -1 && toRow === 7) board[toRow][toCol] = -2;
        
        // Check for multi-jump
        if (move.jump) {
            const nextJumps = getValidMoves(toRow, toCol).filter(m => m.jump);
            if (nextJumps.length > 0) {
                return { multiJump: true, row: toRow, col: toCol };
            }
        }
        
        return { multiJump: false };
    }
    
    function checkWin() {
        let redCount = 0;
        let blackCount = 0;
        let redMoves = false;
        let blackMoves = false;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece > 0) {
                    redCount++;
                    if (getValidMoves(row, col).length > 0) redMoves = true;
                } else if (piece < 0) {
                    blackCount++;
                    if (getValidMoves(row, col).length > 0) blackMoves = true;
                }
            }
        }
        
        if (redCount === 0 || !redMoves) {
            gameOver = true;
            winner = -1;
            return true;
        }
        if (blackCount === 0 || !blackMoves) {
            gameOver = true;
            winner = 1;
            return true;
        }
        return false;
    }
    
    function updateStatus() {
        if (gameOver) {
            if (winner === 1) {
                statusEl.textContent = '🏆 You Win! Restarting...';
                statusEl.style.color = '#ef4444';
            } else {
                statusEl.textContent = '🏆 AI Wins! Restarting...';
                statusEl.style.color = '#94a3b8';
            }
            // Auto-reset after 2 seconds
            setTimeout(() => {
                resetGame();
            }, 2000);
        } else {
            if (aiThinking || currentPlayer === -1) {
                statusEl.textContent = 'AI Thinking...';
                statusEl.style.color = '#94a3b8';
            } else {
                statusEl.textContent = 'Your Turn (Red)';
                statusEl.style.color = '#ef4444';
            }
        }
    }
    
    function aiMove() {
        // Find all possible moves
        const allMoves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (Math.sign(board[row][col]) === -1) {
                    const moves = getValidMoves(row, col);
                    moves.forEach(move => {
                        allMoves.push({ fromRow: row, fromCol: col, ...move });
                    });
                }
            }
        }
        
        if (allMoves.length === 0) {
            checkWin();
            aiThinking = false;
            updateStatus();
            draw();
            return;
        }
        
        // Prioritize jumps, then kings, then forward moves
        allMoves.sort((a, b) => {
            if (a.jump !== b.jump) return b.jump ? 1 : -1;
            const aPiece = Math.abs(board[a.fromRow][a.fromCol]);
            const bPiece = Math.abs(board[b.fromRow][b.fromCol]);
            if (aPiece !== bPiece) return bPiece - aPiece;
            return b.row - a.row; // Prefer moving forward
        });
        
        const bestMove = allMoves[0];
        aiMakeMove(bestMove);
    }
    
    function aiMakeMove(move) {
        const result = movePiece(move.fromRow, move.fromCol, move.row, move.col, move);
        draw();
        
        // Handle multi-jump
        if (result.multiJump) {
            setTimeout(() => {
                const nextJumps = getValidMoves(result.row, result.col).filter(m => m.jump);
                if (nextJumps.length > 0) {
                    aiMakeMove({ fromRow: result.row, fromCol: result.col, ...nextJumps[0] });
                } else {
                    // No more jumps, end AI turn
                    aiThinking = false;
                    if (!checkWin()) {
                        currentPlayer = 1;
                        mustJump = hasJumps(1);
                    }
                    updateStatus();
                    draw();
                }
            }, 400);
        } else {
            aiThinking = false;
            if (!checkWin()) {
                currentPlayer = 1;
                mustJump = hasJumps(1);
            }
            updateStatus();
            draw();
        }
    }
    
    canvas.addEventListener('click', (e) => {
        if (gameOver || aiThinking || currentPlayer !== 1) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);
        
        if (row < 0 || row >= 8 || col < 0 || col >= 8) return;
        
        // Check if clicked on valid move
        const moveClicked = validMoves.find(m => m.row === row && m.col === col);
        if (moveClicked && selectedPiece) {
            const result = movePiece(selectedPiece.row, selectedPiece.col, row, col, moveClicked);
            
            if (result.multiJump) {
                // Continue jumping with same piece
                selectedPiece = { row, col };
                validMoves = getValidMoves(row, col).filter(m => m.jump);
                draw();
            } else {
                selectedPiece = null;
                validMoves = [];
                
                if (!checkWin()) {
                    currentPlayer = -1;
                    aiThinking = true;
                    updateStatus();
                    draw();
                    setTimeout(() => {
                        aiMove();
                    }, 500);
                } else {
                    updateStatus();
                    draw();
                }
            }
        } else {
            // Select piece
            const piece = board[row][col];
            if (piece > 0) {
                const moves = getValidMoves(row, col);
                mustJump = hasJumps(1);
                
                // If must jump, only allow selecting pieces that can jump
                if (mustJump && !moves.some(m => m.jump)) {
                    return;
                }
                
                selectedPiece = { row, col };
                validMoves = mustJump ? moves.filter(m => m.jump) : moves;
                draw();
            }
        }
    });
    
    function resetGame() {
        initBoard();
        currentPlayer = 1;
        selectedPiece = null;
        validMoves = [];
        gameOver = false;
        winner = null;
        mustJump = false;
        aiThinking = false;
        updateStatus();
        draw();
    }
    
    resetBtn.addEventListener('click', resetGame);
    
    // Initialize
    initBoard();
    draw();
    updateStatus();
});
