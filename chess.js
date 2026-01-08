// Chess Game - vs AI
(function() {
    const canvas = document.getElementById('chessCanvas');
    const ctx = canvas.getContext('2d');
    const statusDiv = document.getElementById('gameStatus');
    const newGameBtn = document.getElementById('newGameBtn');
    const undoBtn = document.getElementById('undoBtn');

    const BOARD_SIZE = 8;
    const SQUARE_SIZE = canvas.width / BOARD_SIZE;

    // Piece types
    const PIECES = {
        PAWN: 'p',
        ROOK: 'r',
        KNIGHT: 'n',
        BISHOP: 'b',
        QUEEN: 'q',
        KING: 'k'
    };

    // Colors
    const WHITE = 'white';
    const BLACK = 'black';

    // Game state
    let board = [];
    let selectedSquare = null;
    let validMoves = [];
    let currentPlayer = WHITE;
    let gameOver = false;
    let moveHistory = [];

    // Initialize board
    function initBoard() {
        board = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            board[row] = [];
            for (let col = 0; col < BOARD_SIZE; col++) {
                board[row][col] = null;
            }
        }

        // Place black pieces
        board[0][0] = { type: PIECES.ROOK, color: BLACK };
        board[0][1] = { type: PIECES.KNIGHT, color: BLACK };
        board[0][2] = { type: PIECES.BISHOP, color: BLACK };
        board[0][3] = { type: PIECES.QUEEN, color: BLACK };
        board[0][4] = { type: PIECES.KING, color: BLACK };
        board[0][5] = { type: PIECES.BISHOP, color: BLACK };
        board[0][6] = { type: PIECES.KNIGHT, color: BLACK };
        board[0][7] = { type: PIECES.ROOK, color: BLACK };
        for (let col = 0; col < BOARD_SIZE; col++) {
            board[1][col] = { type: PIECES.PAWN, color: BLACK };
        }

        // Place white pieces
        for (let col = 0; col < BOARD_SIZE; col++) {
            board[6][col] = { type: PIECES.PAWN, color: WHITE };
        }
        board[7][0] = { type: PIECES.ROOK, color: WHITE };
        board[7][1] = { type: PIECES.KNIGHT, color: WHITE };
        board[7][2] = { type: PIECES.BISHOP, color: WHITE };
        board[7][3] = { type: PIECES.QUEEN, color: WHITE };
        board[7][4] = { type: PIECES.KING, color: WHITE };
        board[7][5] = { type: PIECES.BISHOP, color: WHITE };
        board[7][6] = { type: PIECES.KNIGHT, color: WHITE };
        board[7][7] = { type: PIECES.ROOK, color: WHITE };

        selectedSquare = null;
        validMoves = [];
        currentPlayer = WHITE;
        gameOver = false;
        moveHistory = [];
        updateStatus();
    }

    // Get piece unicode symbol
    function getPieceSymbol(piece) {
        if (!piece) return '';
        const symbols = {
            [WHITE]: {
                [PIECES.PAWN]: '♙',
                [PIECES.ROOK]: '♖',
                [PIECES.KNIGHT]: '♘',
                [PIECES.BISHOP]: '♗',
                [PIECES.QUEEN]: '♕',
                [PIECES.KING]: '♔'
            },
            [BLACK]: {
                [PIECES.PAWN]: '♟',
                [PIECES.ROOK]: '♜',
                [PIECES.KNIGHT]: '♞',
                [PIECES.BISHOP]: '♝',
                [PIECES.QUEEN]: '♛',
                [PIECES.KING]: '♚'
            }
        };
        return symbols[piece.color][piece.type];
    }

    // Draw the board
    function draw() {
        // Draw squares
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const isLight = (row + col) % 2 === 0;
                ctx.fillStyle = isLight ? '#f0d9b5' : '#b58863';
                
                // Highlight selected square
                if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                    ctx.fillStyle = '#7cb342';
                }
                
                // Highlight valid moves
                if (validMoves.some(m => m.row === row && m.col === col)) {
                    ctx.fillStyle = '#9ccc65';
                }
                
                ctx.fillRect(col * SQUARE_SIZE, row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);
            }
        }

        // Draw pieces
        ctx.font = `${SQUARE_SIZE * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                if (piece) {
                    ctx.fillStyle = piece.color === WHITE ? '#ffffff' : '#000000';
                    ctx.strokeStyle = piece.color === WHITE ? '#000000' : '#ffffff';
                    ctx.lineWidth = 1;
                    const symbol = getPieceSymbol(piece);
                    const x = col * SQUARE_SIZE + SQUARE_SIZE / 2;
                    const y = row * SQUARE_SIZE + SQUARE_SIZE / 2;
                    ctx.strokeText(symbol, x, y);
                    ctx.fillText(symbol, x, y);
                }
            }
        }
    }

    // Get valid moves for a piece
    function getValidMoves(row, col) {
        const piece = board[row][col];
        if (!piece || piece.color !== currentPlayer) return [];

        const moves = [];

        switch (piece.type) {
            case PIECES.PAWN:
                const direction = piece.color === WHITE ? -1 : 1;
                const startRow = piece.color === WHITE ? 6 : 1;
                
                // Forward move
                if (isValidSquare(row + direction, col) && !board[row + direction][col]) {
                    moves.push({ row: row + direction, col });
                    
                    // Double move from start
                    if (row === startRow && !board[row + 2 * direction][col]) {
                        moves.push({ row: row + 2 * direction, col });
                    }
                }
                
                // Captures
                for (let dcol of [-1, 1]) {
                    const newRow = row + direction;
                    const newCol = col + dcol;
                    if (isValidSquare(newRow, newCol) && board[newRow][newCol] && 
                        board[newRow][newCol].color !== piece.color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
                break;

            case PIECES.ROOK:
                addLineMoves(moves, row, col, [[1,0], [-1,0], [0,1], [0,-1]]);
                break;

            case PIECES.KNIGHT:
                const knightMoves = [
                    [2,1], [2,-1], [-2,1], [-2,-1],
                    [1,2], [1,-2], [-1,2], [-1,-2]
                ];
                for (let [dr, dc] of knightMoves) {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (isValidSquare(newRow, newCol) && 
                        (!board[newRow][newCol] || board[newRow][newCol].color !== piece.color)) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
                break;

            case PIECES.BISHOP:
                addLineMoves(moves, row, col, [[1,1], [1,-1], [-1,1], [-1,-1]]);
                break;

            case PIECES.QUEEN:
                addLineMoves(moves, row, col, [
                    [1,0], [-1,0], [0,1], [0,-1],
                    [1,1], [1,-1], [-1,1], [-1,-1]
                ]);
                break;

            case PIECES.KING:
                const kingMoves = [
                    [1,0], [-1,0], [0,1], [0,-1],
                    [1,1], [1,-1], [-1,1], [-1,-1]
                ];
                for (let [dr, dc] of kingMoves) {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (isValidSquare(newRow, newCol) && 
                        (!board[newRow][newCol] || board[newRow][newCol].color !== piece.color)) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
                break;
        }

        return moves;
    }

    function addLineMoves(moves, row, col, directions) {
        const piece = board[row][col];
        for (let [dr, dc] of directions) {
            let newRow = row + dr;
            let newCol = col + dc;
            while (isValidSquare(newRow, newCol)) {
                if (board[newRow][newCol]) {
                    if (board[newRow][newCol].color !== piece.color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                moves.push({ row: newRow, col: newCol });
                newRow += dr;
                newCol += dc;
            }
        }
    }

    function isValidSquare(row, col) {
        return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
    }

    // Make a move
    function makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const capturedPiece = board[toRow][toCol];
        
        // Save move for undo
        moveHistory.push({
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: { ...piece },
            capturedPiece: capturedPiece ? { ...capturedPiece } : null
        });

        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = null;

        // Check for pawn promotion
        if (piece.type === PIECES.PAWN && (toRow === 0 || toRow === 7)) {
            board[toRow][toCol].type = PIECES.QUEEN;
        }

        return capturedPiece;
    }

    // Check if game is over
    function checkGameOver() {
        let whiteKing = false;
        let blackKing = false;

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                if (piece && piece.type === PIECES.KING) {
                    if (piece.color === WHITE) whiteKing = true;
                    if (piece.color === BLACK) blackKing = true;
                }
            }
        }

        if (!whiteKing) {
            gameOver = true;
            statusDiv.textContent = 'Black wins! White king captured!';
            return true;
        }
        if (!blackKing) {
            gameOver = true;
            statusDiv.textContent = 'White wins! Black king captured!';
            return true;
        }

        return false;
    }

    // Update status message
    function updateStatus() {
        if (!gameOver) {
            statusDiv.textContent = currentPlayer === WHITE ? 'White to move' : 'Black to move (AI thinking...)';
        }
    }

    // Simple AI move
    function makeAIMove() {
        if (gameOver) return;

        setTimeout(() => {
            const allMoves = [];
            
            // Get all possible moves for black pieces
            for (let row = 0; row < BOARD_SIZE; row++) {
                for (let col = 0; col < BOARD_SIZE; col++) {
                    const piece = board[row][col];
                    if (piece && piece.color === BLACK) {
                        const moves = getValidMoves(row, col);
                        for (let move of moves) {
                            allMoves.push({
                                from: { row, col },
                                to: move,
                                piece: piece
                            });
                        }
                    }
                }
            }

            if (allMoves.length === 0) {
                gameOver = true;
                statusDiv.textContent = 'White wins! Black has no moves!';
                return;
            }

            // Prioritize captures and king moves
            allMoves.sort((a, b) => {
                const aCapture = board[a.to.row][a.to.col] ? 1 : 0;
                const bCapture = board[b.to.row][b.to.col] ? 1 : 0;
                return bCapture - aCapture;
            });

            // Make the move
            const move = allMoves[0];
            const capturedPiece = makeMove(move.from.row, move.from.col, move.to.row, move.to.col);

            if (!checkGameOver()) {
                currentPlayer = WHITE;
                updateStatus();
            }
            
            draw();
        }, 500);
    }

    // Handle canvas click
    canvas.addEventListener('click', (e) => {
        if (gameOver || currentPlayer !== WHITE) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / SQUARE_SIZE);
        const row = Math.floor(y / SQUARE_SIZE);

        if (!isValidSquare(row, col)) return;

        // If a square is selected and clicked square is a valid move
        if (selectedSquare && validMoves.some(m => m.row === row && m.col === col)) {
            makeMove(selectedSquare.row, selectedSquare.col, row, col);
            selectedSquare = null;
            validMoves = [];
            
            if (!checkGameOver()) {
                currentPlayer = BLACK;
                updateStatus();
                draw();
                makeAIMove();
            } else {
                draw();
            }
        } else {
            // Select a piece
            const piece = board[row][col];
            if (piece && piece.color === WHITE) {
                selectedSquare = { row, col };
                validMoves = getValidMoves(row, col);
                draw();
            } else {
                selectedSquare = null;
                validMoves = [];
                draw();
            }
        }
    });

    // New game button
    newGameBtn.addEventListener('click', () => {
        initBoard();
        draw();
    });

    // Undo button
    undoBtn.addEventListener('click', () => {
        if (moveHistory.length === 0) return;

        // Undo AI move
        if (moveHistory.length > 0) {
            const aiMove = moveHistory.pop();
            board[aiMove.from.row][aiMove.from.col] = aiMove.piece;
            board[aiMove.to.row][aiMove.to.col] = aiMove.capturedPiece;
        }

        // Undo player move
        if (moveHistory.length > 0) {
            const playerMove = moveHistory.pop();
            board[playerMove.from.row][playerMove.from.col] = playerMove.piece;
            board[playerMove.to.row][playerMove.to.col] = playerMove.capturedPiece;
        }

        gameOver = false;
        currentPlayer = WHITE;
        selectedSquare = null;
        validMoves = [];
        updateStatus();
        draw();
    });

    // Start game
    initBoard();
    draw();
})();
