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
    let isInCheck = { white: false, black: false };
    let capturedPieces = { white: [], black: [] };
    let moveCount = 0;

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
        isInCheck = { white: false, black: false };
        capturedPieces = { white: [], black: [] };
        moveCount = 0;
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
                
                // Highlight king in check
                const piece = board[row][col];
                if (piece && piece.type === PIECES.KING) {
                    if ((piece.color === WHITE && isInCheck.white) || 
                        (piece.color === BLACK && isInCheck.black)) {
                        ctx.fillStyle = '#ef4444';
                    }
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

    // Find king position
    function findKing(color) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                if (piece && piece.type === PIECES.KING && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    // Check if a square is under attack by opponent
    function isSquareUnderAttack(row, col, byColor) {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const piece = board[r][c];
                if (piece && piece.color === byColor) {
                    const moves = getRawMoves(r, c);
                    if (moves.some(m => m.row === row && m.col === col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Get raw moves without check validation
    function getRawMoves(row, col) {
        const piece = board[row][col];
        if (!piece) return [];

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

    // Check if move puts own king in check
    function wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {
        // Simulate the move
        const originalPiece = board[fromRow][fromCol];
        const capturedPiece = board[toRow][toCol];
        
        board[toRow][toCol] = originalPiece;
        board[fromRow][fromCol] = null;

        // Find king position
        const kingPos = findKing(color);
        let inCheck = false;
        
        if (kingPos) {
            inCheck = isSquareUnderAttack(kingPos.row, kingPos.col, color === WHITE ? BLACK : WHITE);
        }

        // Undo the move
        board[fromRow][fromCol] = originalPiece;
        board[toRow][toCol] = capturedPiece;

        return inCheck;
    }

    // Get valid moves for a piece (with check validation)
    function getValidMoves(row, col, forColor = null) {
        const piece = board[row][col];
        if (!piece) return [];
        
        // If forColor is specified, only return moves for that color
        // Otherwise, only return moves if it's the current player's piece
        if (forColor !== null) {
            if (piece.color !== forColor) return [];
        } else {
            if (piece.color !== currentPlayer) return [];
        }

        const rawMoves = getRawMoves(row, col);
        
        // Filter out moves that would put own king in check
        return rawMoves.filter(move => 
            !wouldBeInCheck(row, col, move.row, move.col, piece.color)
        );
    }

    // Update check status
    function updateCheckStatus() {
        const whiteKingPos = findKing(WHITE);
        const blackKingPos = findKing(BLACK);

        isInCheck.white = whiteKingPos ? isSquareUnderAttack(whiteKingPos.row, whiteKingPos.col, BLACK) : false;
        isInCheck.black = blackKingPos ? isSquareUnderAttack(blackKingPos.row, blackKingPos.col, WHITE) : false;
    }

    // Check if current player is in checkmate
    function isCheckmate(color) {
        // Must be in check
        if ((color === WHITE && !isInCheck.white) || (color === BLACK && !isInCheck.black)) {
            return false;
        }

        // Check if any legal move exists
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                if (piece && piece.color === color) {
                    const moves = getValidMoves(row, col, color);
                    if (moves.length > 0) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    // Check if current player is in stalemate
    function isStalemate(color) {
        // Must NOT be in check
        if ((color === WHITE && isInCheck.white) || (color === BLACK && isInCheck.black)) {
            return false;
        }

        // Check if any legal move exists
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                if (piece && piece.color === color) {
                    const moves = getValidMoves(row, col, color);
                    if (moves.length > 0) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    // Calculate piece value
    function getPieceValue(piece) {
        const values = {
            [PIECES.PAWN]: 1,
            [PIECES.KNIGHT]: 3,
            [PIECES.BISHOP]: 3,
            [PIECES.ROOK]: 5,
            [PIECES.QUEEN]: 9,
            [PIECES.KING]: 0
        };
        return values[piece.type] || 0;
    }

    // Generate game review
    function generateGameReview(winner) {
        const loser = winner === WHITE ? BLACK : WHITE;
        const winnerCaptured = capturedPieces[loser];
        const loserCaptured = capturedPieces[winner];

        let winnerMaterialValue = 0;
        let loserMaterialValue = 0;

        for (let piece of winnerCaptured) {
            winnerMaterialValue += getPieceValue(piece);
        }
        for (let piece of loserCaptured) {
            loserMaterialValue += getPieceValue(piece);
        }

        const materialAdvantage = winnerMaterialValue - loserMaterialValue;
        const movesPlayed = moveCount;

        let performance = '';
        let rating = '';

        if (materialAdvantage >= 10 && movesPlayed <= 20) {
            performance = 'Brilliant! Dominant victory with crushing material advantage!';
            rating = '⭐⭐⭐⭐⭐ Master Level';
        } else if (materialAdvantage >= 7 || movesPlayed <= 25) {
            performance = 'Excellent! Strong tactical play and efficient checkmate!';
            rating = '⭐⭐⭐⭐ Expert Level';
        } else if (materialAdvantage >= 4 || movesPlayed <= 35) {
            performance = 'Good game! Solid strategy led to victory!';
            rating = '⭐⭐⭐ Intermediate';
        } else if (materialAdvantage >= 2 || movesPlayed <= 50) {
            performance = 'Decent performance. Victory achieved but room for improvement.';
            rating = '⭐⭐ Beginner';
        } else {
            performance = 'Hard-fought victory! Keep practicing your tactics.';
            rating = '⭐ Novice';
        }

        return `
Game Review - ${winner === WHITE ? 'White' : 'Black'} Wins!

${performance}
${rating}

📊 Statistics:
• Moves played: ${movesPlayed}
• Material captured: ${winnerMaterialValue} points
• Material lost: ${loserMaterialValue} points
• Net advantage: +${materialAdvantage} points

${winnerCaptured.length > 0 ? `🎯 Pieces captured: ${winnerCaptured.map(p => getPieceSymbol(p)).join(' ')}` : ''}
        `.trim();
    }

    // Make a move
    function makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        const capturedPiece = board[toRow][toCol];
        
        // Track captured pieces
        if (capturedPiece) {
            capturedPieces[piece.color].push({ ...capturedPiece });
        }

        // Save move for undo
        moveHistory.push({
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: { ...piece },
            capturedPiece: capturedPiece ? { ...capturedPiece } : null,
            checkStatus: { ...isInCheck }
        });

        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = null;

        // Check for pawn promotion
        if (piece.type === PIECES.PAWN && (toRow === 0 || toRow === 7)) {
            board[toRow][toCol].type = PIECES.QUEEN;
        }

        moveCount++;
        updateCheckStatus();

        return capturedPiece;
    }

    // Check if game is over
    function checkGameOver() {
        // Check for checkmate
        if (isCheckmate(WHITE)) {
            gameOver = true;
            const review = generateGameReview(BLACK);
            statusDiv.innerHTML = `<strong>Checkmate! Black wins!</strong><br><pre style="text-align:left;font-size:0.85rem;margin-top:1rem;line-height:1.6;">${review}</pre>`;
            return true;
        }
        if (isCheckmate(BLACK)) {
            gameOver = true;
            const review = generateGameReview(WHITE);
            statusDiv.innerHTML = `<strong>Checkmate! White wins!</strong><br><pre style="text-align:left;font-size:0.85rem;margin-top:1rem;line-height:1.6;">${review}</pre>`;
            return true;
        }

        // Check for stalemate
        if (isStalemate(WHITE) || isStalemate(BLACK)) {
            gameOver = true;
            statusDiv.textContent = 'Stalemate! Game is a draw.';
            return true;
        }

        return false;
    }

    // Update status message
    function updateStatus() {
        if (!gameOver) {
            let status = currentPlayer === WHITE ? 'White to move' : 'Black to move (AI thinking...)';
            if (currentPlayer === WHITE && isInCheck.white) {
                status = '⚠️ White is in CHECK!';
            } else if (currentPlayer === BLACK && isInCheck.black) {
                status = '⚠️ Black is in CHECK! (AI thinking...)';
            }
            statusDiv.textContent = status;
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
                        const moves = getValidMoves(row, col, BLACK);
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
                checkGameOver();
                draw();
                return;
            }

            // Score moves: prioritize captures, escaping check, and threatening pieces
            allMoves.forEach(move => {
                move.score = 0;
                
                // Capture value
                const target = board[move.to.row][move.to.col];
                if (target) {
                    move.score += getPieceValue(target) * 10;
                }
                
                // Bonus for escaping check
                if (isInCheck.black) {
                    move.score += 20;
                }
                
                // Small random factor
                move.score += Math.random() * 2;
            });

            // Sort by score
            allMoves.sort((a, b) => b.score - a.score);

            // Make the best move
            const move = allMoves[0];
            makeMove(move.from.row, move.from.col, move.to.row, move.to.col);

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
            
            // Remove from captured pieces
            if (aiMove.capturedPiece) {
                capturedPieces[BLACK].pop();
            }
            moveCount--;
        }

        // Undo player move
        if (moveHistory.length > 0) {
            const playerMove = moveHistory.pop();
            board[playerMove.from.row][playerMove.from.col] = playerMove.piece;
            board[playerMove.to.row][playerMove.to.col] = playerMove.capturedPiece;
            
            // Remove from captured pieces
            if (playerMove.capturedPiece) {
                capturedPieces[WHITE].pop();
            }
            moveCount--;
        }

        gameOver = false;
        currentPlayer = WHITE;
        selectedSquare = null;
        validMoves = [];
        updateCheckStatus();
        updateStatus();
        draw();
    });

    // Start game
    initBoard();
    draw();
})();
