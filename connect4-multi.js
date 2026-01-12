document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const resetBtn = document.getElementById('resetBtn');
    
    const ROWS = 6;
    const COLS = 7;
    const CELL_SIZE = 80;
    const RADIUS = 30;
    
    let board = [];
    let currentPlayer = 1; // 1 = Red, 2 = Yellow
    let gameOver = false;
    let winner = null;
    
    function initBoard() {
        board = [];
        for (let r = 0; r < ROWS; r++) {
            board[r] = [];
            for (let c = 0; c < COLS; c++) {
                board[r][c] = 0;
            }
        }
    }
    
    function dropPiece(col) {
        if (gameOver) return false;
        if (col < 0 || col >= COLS) return false;
        
        // Find lowest empty row
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row][col] === 0) {
                board[row][col] = currentPlayer;
                checkWin(row, col);
                if (!gameOver) {
                    currentPlayer = currentPlayer === 1 ? 2 : 1;
                    updateStatus();
                }
                return true;
            }
        }
        return false; // Column full
    }
    
    function checkWin(row, col) {
        const player = board[row][col];
        
        // Check horizontal
        let count = 0;
        for (let c = 0; c < COLS; c++) {
            if (board[row][c] === player) {
                count++;
                if (count >= 4) {
                    gameOver = true;
                    winner = player;
                    return;
                }
            } else {
                count = 0;
            }
        }
        
        // Check vertical
        count = 0;
        for (let r = 0; r < ROWS; r++) {
            if (board[r][col] === player) {
                count++;
                if (count >= 4) {
                    gameOver = true;
                    winner = player;
                    return;
                }
            } else {
                count = 0;
            }
        }
        
        // Check diagonal (down-right)
        count = 0;
        let startR = row - Math.min(row, col);
        let startC = col - Math.min(row, col);
        while (startR < ROWS && startC < COLS) {
            if (board[startR][startC] === player) {
                count++;
                if (count >= 4) {
                    gameOver = true;
                    winner = player;
                    return;
                }
            } else {
                count = 0;
            }
            startR++;
            startC++;
        }
        
        // Check diagonal (down-left)
        count = 0;
        startR = row - Math.min(row, COLS - 1 - col);
        startC = col + Math.min(row, COLS - 1 - col);
        while (startR < ROWS && startC >= 0) {
            if (board[startR][startC] === player) {
                count++;
                if (count >= 4) {
                    gameOver = true;
                    winner = player;
                    return;
                }
            } else {
                count = 0;
            }
            startR++;
            startC--;
        }
        
        // Check for tie
        let tie = true;
        for (let c = 0; c < COLS; c++) {
            if (board[0][c] === 0) {
                tie = false;
                break;
            }
        }
        if (tie) {
            gameOver = true;
            winner = 0;
        }
    }

    
    function updateStatus() {
        if (gameOver) {
            if (winner === 0) {
                statusEl.textContent = '🏁 It\'s a Tie!';
                statusEl.style.color = '#f59e0b';
            } else if (winner === 1) {
                statusEl.textContent = '🏆 Red Wins!';
                statusEl.style.color = '#ef4444';
            } else {
                statusEl.textContent = '🏆 Yellow Wins!';
                statusEl.style.color = '#eab308';
            }
        } else {
            if (currentPlayer === 1) {
                statusEl.textContent = 'Red\'s Turn';
                statusEl.style.color = '#ef4444';
            } else {
                statusEl.textContent = 'Yellow\'s Turn';
                statusEl.style.color = '#eab308';
            }
        }
    }
    
    function draw() {
        // Background with themed gradient
        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, '#1e293b');
        bgGradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw board with themed blue gradient
        const boardGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        boardGradient.addColorStop(0, '#1e40af');
        boardGradient.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = boardGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid and pieces
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const x = col * CELL_SIZE + CELL_SIZE / 2;
                const y = row * CELL_SIZE + CELL_SIZE / 2;
                
                // Draw slot with subtle shadow
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.fillStyle = '#0a0e1a';
                ctx.beginPath();
                ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // Draw piece
                if (board[row][col] === 1) {
                    // Player 1 - cyan/teal gradient with glow (matching theme)
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
                    const p1Gradient = ctx.createRadialGradient(
                        x - RADIUS/3, y - RADIUS/3, RADIUS/5,
                        x, y, RADIUS - 2
                    );
                    p1Gradient.addColorStop(0, '#22d3ee');
                    p1Gradient.addColorStop(1, '#06b6d4');
                    ctx.fillStyle = p1Gradient;
                    ctx.beginPath();
                    ctx.arc(x, y, RADIUS - 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                } else if (board[row][col] === 2) {
                    // Player 2 - orange/amber gradient with glow (matching theme)
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = 'rgba(249, 115, 22, 0.6)';
                    const p2Gradient = ctx.createRadialGradient(
                        x - RADIUS/3, y - RADIUS/3, RADIUS/5,
                        x, y, RADIUS - 2
                    );
                    p2Gradient.addColorStop(0, '#fbbf24');
                    p2Gradient.addColorStop(1, '#f97316');
                    ctx.fillStyle = p2Gradient;
                    ctx.beginPath();
                    ctx.arc(x, y, RADIUS - 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }
    }
    
    function resetGame() {
        initBoard();
        currentPlayer = 1;
        gameOver = false;
        winner = null;
        updateStatus();
        draw();
    }
    
    canvas.addEventListener('click', (e) => {
        if (gameOver) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const col = Math.floor(x / CELL_SIZE);
        
        if (dropPiece(col)) {
            draw();
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (gameOver) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const col = Math.floor(x / CELL_SIZE);
        
        draw();
        
        // Draw preview piece
        if (col >= 0 && col < COLS && board[0][col] === 0) {
            const pieceX = col * CELL_SIZE + CELL_SIZE / 2;
            const pieceY = -CELL_SIZE / 2;
            
            ctx.globalAlpha = 0.5;
            ctx.shadowBlur = 10;
            
            if (currentPlayer === 1) {
                ctx.shadowColor = 'rgba(6, 182, 212, 0.5)';
                const previewGradient = ctx.createRadialGradient(
                    pieceX - RADIUS/3, pieceY - RADIUS/3, RADIUS/5,
                    pieceX, pieceY, RADIUS - 2
                );
                previewGradient.addColorStop(0, '#22d3ee');
                previewGradient.addColorStop(1, '#06b6d4');
                ctx.fillStyle = previewGradient;
            } else {
                ctx.shadowColor = 'rgba(249, 115, 22, 0.5)';
                const previewGradient = ctx.createRadialGradient(
                    pieceX - RADIUS/3, pieceY - RADIUS/3, RADIUS/5,
                    pieceX, pieceY, RADIUS - 2
                );
                previewGradient.addColorStop(0, '#fbbf24');
                previewGradient.addColorStop(1, '#f97316');
                ctx.fillStyle = previewGradient;
            }
            
            ctx.beginPath();
            ctx.arc(pieceX, pieceY, RADIUS - 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }
    });
    
    resetBtn.addEventListener('click', resetGame);
    
    // Initialize
    initBoard();
    draw();
    updateStatus();
});
