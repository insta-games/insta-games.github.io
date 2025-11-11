document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('status');
    const resetBtn = document.getElementById('resetBtn');
    const singleBtn = document.getElementById('singleBtn');
    const multiBtn = document.getElementById('multiBtn');
    
    const ROWS = 6;
    const COLS = 7;
    const CELL_SIZE = 80;
    const RADIUS = 30;
    
    let gameMode = 'single'; // single or multi
    let board = [];
    let currentPlayer = 1; // 1 = Red, 2 = Yellow
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
    
    function dropPiece(col) {
        if (gameOver || aiThinking) return false;
        if (col < 0 || col >= COLS) return false;
        
        // Find lowest empty row
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row][col] === 0) {
                board[row][col] = currentPlayer;
                checkWin(row, col);
                if (!gameOver) {
                    currentPlayer = currentPlayer === 1 ? 2 : 1;
                    updateStatus();
                    
                    // AI turn in single player mode
                    if (gameMode === 'single' && currentPlayer === 2 && !gameOver) {
                        aiThinking = true;
                        setTimeout(() => {
                            aiMove();
                            aiThinking = false;
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
            dropPiece(move);
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
                statusEl.textContent = gameMode === 'single' ? 'AI Thinking...' : 'Yellow\'s Turn';
                statusEl.style.color = '#eab308';
            }
        }
    }
    
    function draw() {
        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a1f35');
        gradient.addColorStop(1, '#0a0e1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw board
        ctx.fillStyle = '#1e40af';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid and pieces
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const x = col * CELL_SIZE + CELL_SIZE / 2;
                const y = row * CELL_SIZE + CELL_SIZE / 2;
                
                // Draw slot
                ctx.fillStyle = '#0a0e1a';
                ctx.beginPath();
                ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw piece
                if (board[row][col] === 1) {
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(x, y, RADIUS - 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (board[row][col] === 2) {
                    ctx.fillStyle = '#eab308';
                    ctx.beginPath();
                    ctx.arc(x, y, RADIUS - 2, 0, Math.PI * 2);
                    ctx.fill();
                }
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
    
    function setGameMode(mode) {
        gameMode = mode;
        if (mode === 'single') {
            singleBtn.classList.add('active');
            multiBtn.classList.remove('active');
        } else {
            singleBtn.classList.remove('active');
            multiBtn.classList.add('active');
        }
        resetGame();
    }
    
    canvas.addEventListener('click', (e) => {
        if (gameOver || aiThinking) return;
        if (gameMode === 'single' && currentPlayer === 2) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const col = Math.floor(x / CELL_SIZE);
        
        if (dropPiece(col)) {
            draw();
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (gameOver || aiThinking) return;
        if (gameMode === 'single' && currentPlayer === 2) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const col = Math.floor(x / CELL_SIZE);
        
        draw();
        
        // Draw preview piece
        if (col >= 0 && col < COLS && board[0][col] === 0) {
            const pieceX = col * CELL_SIZE + CELL_SIZE / 2;
            const pieceY = -CELL_SIZE / 2;
            
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = currentPlayer === 1 ? '#ef4444' : '#eab308';
            ctx.beginPath();
            ctx.arc(pieceX, pieceY, RADIUS - 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    });
    
    resetBtn.addEventListener('click', resetGame);
    singleBtn.addEventListener('click', () => setGameMode('single'));
    multiBtn.addEventListener('click', () => setGameMode('multi'));
    
    // Initialize
    initBoard();
    draw();
    updateStatus();
});
