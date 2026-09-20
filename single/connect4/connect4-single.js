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
    let currentPlayer = 1; // 1 = Red (Player), 2 = Yellow (AI)
    let gameOver = false;
    let winner = null;
    let aiThinking = false;
    
    function initBoard() {
        board = [];
        for (let r = 0; r < ROWS; r++) {
            board[r] = [];
            for (let c = 0; c < COLS; c++) {
                board[r][c] = 0;
            }
        }
    }
    
    function dropPiece(col, isAI = false) {
        console.log('dropPiece called, col:', col, 'player:', currentPlayer, 'aiThinking:', aiThinking, 'isAI:', isAI);
        if (gameOver) return false;
        if (!isAI && aiThinking) return false; // Only block human moves when AI is thinking
        if (col < 0 || col >= COLS) return false;
        
        // Find lowest empty row
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row][col] === 0) {
                board[row][col] = currentPlayer;
                checkWin(row, col);
                if (!gameOver) {
                    currentPlayer = currentPlayer === 1 ? 2 : 1;
                    updateStatus();
                    
                    // AI turn
                    if (currentPlayer === 2 && !gameOver) {
                        aiThinking = true;
                        updateStatus();
                        setTimeout(() => {
                            aiMove();
                            aiThinking = false;
                            updateStatus();
                            draw();
                        }, 500);
                    }
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
    
    function aiMove() {
        console.log('AI Move called');
        // Simple AI: Try to win, block opponent, or pick random
        let move = -1;
        
        // Try to win
        for (let c = 0; c < COLS; c++) {
            const testBoard = board.map(row => [...row]);
            const row = getLowestRow(c);
            if (row !== -1) {
                testBoard[row][c] = 2;
                if (checkWinForPlayer(testBoard, row, c, 2)) {
                    move = c;
                    break;
                }
            }
        }
        
        // Try to block
        if (move === -1) {
            for (let c = 0; c < COLS; c++) {
                const testBoard = board.map(row => [...row]);
                const row = getLowestRow(c);
                if (row !== -1) {
                    testBoard[row][c] = 1;
                    if (checkWinForPlayer(testBoard, row, c, 1)) {
                        move = c;
                        break;
                    }
                }
            }
        }
        
        // Pick center or random
        if (move === -1) {
            const validMoves = [];
            for (let c = 0; c < COLS; c++) {
                if (board[0][c] === 0) validMoves.push(c);
            }
            // Prefer center columns
            if (validMoves.includes(3)) {
                move = 3;
            } else if (validMoves.length > 0) {
                move = validMoves[Math.floor(Math.random() * validMoves.length)];
            }
        }
        
        if (move !== -1) {
            console.log('AI making move at column:', move);
            dropPiece(move, true); // Pass true to indicate this is an AI move
        } else {
            console.log('No valid move found!');
        }
    }
    
    function getLowestRow(col) {
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row][col] === 0) return row;
        }
        return -1;
    }
    
    function checkWinForPlayer(testBoard, row, col, player) {
        // Simplified win check for AI
        // Check horizontal
        let count = 0;
        for (let c = 0; c < COLS; c++) {
            count = testBoard[row][c] === player ? count + 1 : 0;
            if (count >= 4) return true;
        }
        
        // Check vertical
        count = 0;
        for (let r = 0; r < ROWS; r++) {
            count = testBoard[r][col] === player ? count + 1 : 0;
            if (count >= 4) return true;
        }
        
        // Check diagonals
        count = 0;
        let startR = row - Math.min(row, col);
        let startC = col - Math.min(row, col);
        while (startR < ROWS && startC < COLS) {
            count = testBoard[startR][startC] === player ? count + 1 : 0;
            if (count >= 4) return true;
            startR++;
            startC++;
        }
        
        count = 0;
        startR = row - Math.min(row, COLS - 1 - col);
        startC = col + Math.min(row, COLS - 1 - col);
        while (startR < ROWS && startC >= 0) {
            count = testBoard[startR][startC] === player ? count + 1 : 0;
            if (count >= 4) return true;
            startR++;
            startC--;
        }
        
        return false;
    }
    
    function updateStatus() {
        if (gameOver) {
            if (winner === 0) {
                statusEl.textContent = '🏁 It\'s a Tie!';
                statusEl.style.color = '#f59e0b';
            } else if (winner === 1) {
                statusEl.textContent = '🏆 You Win!';
                statusEl.style.color = '#ef4444';
            } else {
                statusEl.textContent = '🏆 AI Wins!';
                statusEl.style.color = '#eab308';
            }
        } else {
            if (currentPlayer === 1) {
                statusEl.textContent = 'Your Turn (Red)';
                statusEl.style.color = '#ef4444';
            } else {
                statusEl.textContent = 'AI Thinking...';
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
        
        // Draw board with themed blue gradient and rounded corners
        const boardGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        boardGradient.addColorStop(0, '#2563eb');
        boardGradient.addColorStop(0.5, '#1e40af');
        boardGradient.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = boardGradient;
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.shadowBlur = 0;
        
        // Draw board frame/border for depth
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        // Inner highlight on board
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
        
        // Draw grid and pieces
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const x = col * CELL_SIZE + CELL_SIZE / 2;
                const y = row * CELL_SIZE + CELL_SIZE / 2;
                
                // Draw slot with deep shadow (creates 3D effect)
                ctx.shadowBlur = 12;
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowOffsetY = 2;
                ctx.fillStyle = '#0a0e1a';
                ctx.beginPath();
                ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
                ctx.fill();
                
                // Inner ring for depth
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, RADIUS - 1, 0, Math.PI * 2);
                ctx.stroke();
                
                // Draw piece
                if (board[row][col] === 1) {
                    // Player 1 - Red/orange gradient with glow
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
                    const p1Gradient = ctx.createRadialGradient(
                        x - RADIUS/2.5, y - RADIUS/2.5, RADIUS/6,
                        x, y, RADIUS - 2
                    );
                    p1Gradient.addColorStop(0, '#fca5a5');
                    p1Gradient.addColorStop(0.3, '#ef4444');
                    p1Gradient.addColorStop(1, '#b91c1c');
                    ctx.fillStyle = p1Gradient;
                    ctx.beginPath();
                    ctx.arc(x, y, RADIUS - 3, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Add highlight shine
                    ctx.shadowBlur = 0;
                    const highlightGradient = ctx.createRadialGradient(
                        x - RADIUS/3, y - RADIUS/3, 0,
                        x - RADIUS/3, y - RADIUS/3, RADIUS/2
                    );
                    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = highlightGradient;
                    ctx.beginPath();
                    ctx.arc(x, y, RADIUS - 3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (board[row][col] === 2) {
                    // Player 2 - orange/amber gradient with glow
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = 'rgba(249, 115, 22, 0.8)';
                    const p2Gradient = ctx.createRadialGradient(
                        x - RADIUS/2.5, y - RADIUS/2.5, RADIUS/6,
                        x, y, RADIUS - 2
                    );
                    p2Gradient.addColorStop(0, '#fde047');
                    p2Gradient.addColorStop(0.3, '#fbbf24');
                    p2Gradient.addColorStop(1, '#ea580c');
                    ctx.fillStyle = p2Gradient;
                    ctx.beginPath();
                    ctx.arc(x, y, RADIUS - 3, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Add highlight shine
                    ctx.shadowBlur = 0;
                    const highlightGradient = ctx.createRadialGradient(
                        x - RADIUS/3, y - RADIUS/3, 0,
                        x - RADIUS/3, y - RADIUS/3, RADIUS/2
                    );
                    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = highlightGradient;
                    ctx.beginPath();
                    ctx.arc(x, y, RADIUS - 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;
            }
        }
    }
    
    function resetGame() {
        initBoard();
        currentPlayer = 1;
        gameOver = false;
        winner = null;
        aiThinking = false;
        updateStatus();
        draw();
    }
    
    canvas.addEventListener('click', (e) => {
        if (gameOver || aiThinking) return;
        if (currentPlayer === 2) return; // Prevent click during AI turn
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const col = Math.floor(x / CELL_SIZE);
        
        if (dropPiece(col)) {
            draw();
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (gameOver || aiThinking) return;
        if (currentPlayer === 2) return; // No preview during AI turn
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const col = Math.floor(x / CELL_SIZE);
        
        draw();
        
        // Draw preview piece
        if (col >= 0 && col < COLS && board[0][col] === 0) {
            const pieceX = col * CELL_SIZE + CELL_SIZE / 2;
            const pieceY = -CELL_SIZE / 2;
            
            ctx.globalAlpha = 0.6;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
            const previewGradient = ctx.createRadialGradient(
                pieceX - RADIUS/2.5, pieceY - RADIUS/2.5, RADIUS/6,
                pieceX, pieceY, RADIUS - 2
            );
            previewGradient.addColorStop(0, '#67e8f9');
            previewGradient.addColorStop(0.3, '#22d3ee');
            previewGradient.addColorStop(1, '#0891b2');
            ctx.fillStyle = previewGradient;
            ctx.beginPath();
            ctx.arc(pieceX, pieceY, RADIUS - 3, 0, Math.PI * 2);
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
