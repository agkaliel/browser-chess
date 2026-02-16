// Chess piece Unicode characters
const PIECES = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙'
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
    }
};

// Initial board setup
const INITIAL_BOARD = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

class ChessGame {
    constructor() {
        this.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
        this.currentTurn = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameOver = false;
        // Track pieces that have moved (for castling)
        this.hasMoved = {
            whiteKing: false,
            blackKing: false,
            whiteRookLeft: false,
            whiteRookRight: false,
            blackRookLeft: false,
            blackRookRight: false
        };
        this.initializeBoard();
        this.attachEventListeners();
    }

    initializeBoard() {
        const chessboard = document.getElementById('chessboard');
        chessboard.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    square.innerHTML = `<span class="piece">${this.getPieceSymbol(piece)}</span>`;
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                chessboard.appendChild(square);
            }
        }

        this.updateTurnIndicator();
    }

    getPieceSymbol(piece) {
        const isWhite = piece === piece.toUpperCase();
        const color = isWhite ? 'white' : 'black';
        const pieceMap = {
            'k': 'king', 'q': 'queen', 'r': 'rook',
            'b': 'bishop', 'n': 'knight', 'p': 'pawn'
        };
        return PIECES[color][pieceMap[piece.toLowerCase()]];
    }

    handleSquareClick(row, col) {
        if (this.gameOver) return;

        if (this.selectedSquare) {
            // Try to move the piece
            const move = this.validMoves.find(m => m.row === row && m.col === col);
            if (move) {
                this.movePiece(this.selectedSquare.row, this.selectedSquare.col, row, col, move);
                this.clearSelection();
                this.switchTurn();
            } else if (this.isPieceOwnedByCurrentPlayer(row, col)) {
                // Select a different piece
                this.selectSquare(row, col);
            } else {
                this.clearSelection();
            }
        } else {
            // Select a piece
            if (this.isPieceOwnedByCurrentPlayer(row, col)) {
                this.selectSquare(row, col);
            }
        }
    }

    selectSquare(row, col) {
        this.selectedSquare = { row, col };
        this.validMoves = this.getValidMoves(row, col);
        this.highlightSquares();
    }

    clearSelection() {
        this.selectedSquare = null;
        this.validMoves = [];
        this.removeHighlights();
    }

    highlightSquares() {
        this.removeHighlights();

        if (this.selectedSquare) {
            const selectedElement = this.getSquareElement(this.selectedSquare.row, this.selectedSquare.col);
            selectedElement.classList.add('selected');

            this.validMoves.forEach(move => {
                const element = this.getSquareElement(move.row, move.col);
                element.classList.add('valid-move');
                if (this.board[move.row][move.col]) {
                    element.classList.add('has-piece');
                }
            });
        }
    }

    removeHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'has-piece');
        });
    }

    getSquareElement(row, col) {
        return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }

    isPieceOwnedByCurrentPlayer(row, col) {
        const piece = this.board[row][col];
        if (!piece) return false;
        return (this.currentTurn === 'white' && piece === piece.toUpperCase()) ||
               (this.currentTurn === 'black' && piece === piece.toLowerCase());
    }

    isValidMove(row, col) {
        return this.validMoves.some(move => move.row === row && move.col === col);
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        let moves = [];
        const pieceType = piece.toLowerCase();

        switch (pieceType) {
            case 'p':
                moves = this.getPawnMoves(row, col);
                break;
            case 'r':
                moves = this.getRookMoves(row, col);
                break;
            case 'n':
                moves = this.getKnightMoves(row, col);
                break;
            case 'b':
                moves = this.getBishopMoves(row, col);
                break;
            case 'q':
                moves = this.getQueenMoves(row, col);
                break;
            case 'k':
                moves = this.getKingMoves(row, col);
                break;
        }

        // Filter out moves that would put own king in check
        return moves.filter(move => !this.wouldBeInCheck(row, col, move.row, move.col));
    }

    getPawnMoves(row, col) {
        const moves = [];
        const piece = this.board[row][col];
        const isWhite = piece === piece.toUpperCase();
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;

        // Move forward one square
        if (this.isInBounds(row + direction, col) && !this.board[row + direction][col]) {
            moves.push({ row: row + direction, col });

            // Move forward two squares from starting position
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push({ row: row + 2 * direction, col });
            }
        }

        // Capture diagonally
        [-1, 1].forEach(colOffset => {
            const newRow = row + direction;
            const newCol = col + colOffset;
            if (this.isInBounds(newRow, newCol) && this.board[newRow][newCol] &&
                this.isOpponentPiece(newRow, newCol, isWhite)) {
                moves.push({ row: newRow, col: newCol });
            }
        });

        return moves;
    }

    getRookMoves(row, col) {
        return this.getLinearMoves(row, col, [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ]);
    }

    getBishopMoves(row, col) {
        return this.getLinearMoves(row, col, [
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ]);
    }

    getQueenMoves(row, col) {
        return this.getLinearMoves(row, col, [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ]);
    }

    getKnightMoves(row, col) {
        const moves = [];
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        const piece = this.board[row][col];
        const isWhite = piece === piece.toUpperCase();

        offsets.forEach(([rowOffset, colOffset]) => {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;
            if (this.isInBounds(newRow, newCol) &&
                (!this.board[newRow][newCol] || this.isOpponentPiece(newRow, newCol, isWhite))) {
                moves.push({ row: newRow, col: newCol });
            }
        });

        return moves;
    }

    getKingMoves(row, col) {
        const moves = [];
        const offsets = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        const piece = this.board[row][col];
        const isWhite = piece === piece.toUpperCase();

        offsets.forEach(([rowOffset, colOffset]) => {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;
            if (this.isInBounds(newRow, newCol) &&
                (!this.board[newRow][newCol] || this.isOpponentPiece(newRow, newCol, isWhite))) {
                moves.push({ row: newRow, col: newCol });
            }
        });

        // Add castling moves
        const castlingMoves = this.getCastlingMoves(row, col, isWhite);
        moves.push(...castlingMoves);

        return moves;
    }

    getCastlingMoves(row, col, isWhite) {
        const moves = [];

        // Can't castle if king is in check
        if (this.isKingInCheck(isWhite)) {
            return moves;
        }

        const kingMoved = isWhite ? this.hasMoved.whiteKing : this.hasMoved.blackKing;
        if (kingMoved) {
            return moves;
        }

        const baseRow = isWhite ? 7 : 0;

        // Kingside castling (short castling)
        const kingsideRookMoved = isWhite ? this.hasMoved.whiteRookRight : this.hasMoved.blackRookRight;
        if (!kingsideRookMoved &&
            !this.board[baseRow][5] &&
            !this.board[baseRow][6] &&
            this.board[baseRow][7] &&
            this.board[baseRow][7].toLowerCase() === 'r') {

            // Check if king passes through or ends on an attacked square
            if (!this.isSquareUnderAttack(baseRow, 5, isWhite) &&
                !this.isSquareUnderAttack(baseRow, 6, isWhite)) {
                moves.push({ row: baseRow, col: 6, isCastling: true, rookCol: 7 });
            }
        }

        // Queenside castling (long castling)
        const queensideRookMoved = isWhite ? this.hasMoved.whiteRookLeft : this.hasMoved.blackRookLeft;
        if (!queensideRookMoved &&
            !this.board[baseRow][1] &&
            !this.board[baseRow][2] &&
            !this.board[baseRow][3] &&
            this.board[baseRow][0] &&
            this.board[baseRow][0].toLowerCase() === 'r') {

            // Check if king passes through or ends on an attacked square
            if (!this.isSquareUnderAttack(baseRow, 2, isWhite) &&
                !this.isSquareUnderAttack(baseRow, 3, isWhite)) {
                moves.push({ row: baseRow, col: 2, isCastling: true, rookCol: 0 });
            }
        }

        return moves;
    }

    isSquareUnderAttack(row, col, isWhite) {
        // Check if any opponent piece can attack this square
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && ((isWhite && piece === piece.toLowerCase()) ||
                             (!isWhite && piece === piece.toUpperCase()))) {
                    const moves = this.getValidMovesWithoutCheckValidation(r, c);
                    if (moves.some(move => move.row === row && move.col === col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getLinearMoves(row, col, directions) {
        const moves = [];
        const piece = this.board[row][col];
        const isWhite = piece === piece.toUpperCase();

        directions.forEach(([rowDir, colDir]) => {
            let newRow = row + rowDir;
            let newCol = col + colDir;

            while (this.isInBounds(newRow, newCol)) {
                if (!this.board[newRow][newCol]) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (this.isOpponentPiece(newRow, newCol, isWhite)) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                newRow += rowDir;
                newCol += colDir;
            }
        });

        return moves;
    }

    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    isOpponentPiece(row, col, isWhite) {
        const piece = this.board[row][col];
        if (!piece) return false;
        return isWhite ? piece === piece.toLowerCase() : piece === piece.toUpperCase();
    }

    movePiece(fromRow, fromCol, toRow, toCol, move = {}) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        const isWhite = piece === piece.toUpperCase();

        // Handle castling
        if (move.isCastling) {
            // Move the king
            this.board[toRow][toCol] = piece;
            this.board[fromRow][fromCol] = null;

            // Move the rook
            const rookFromCol = move.rookCol;
            const rookToCol = toCol === 6 ? 5 : 3; // Kingside: rook to f-file, Queenside: rook to d-file
            const rook = this.board[toRow][rookFromCol];
            this.board[toRow][rookToCol] = rook;
            this.board[toRow][rookFromCol] = null;
        } else {
            // Capture piece if present
            if (capturedPiece) {
                const capturedColor = capturedPiece === capturedPiece.toUpperCase() ? 'white' : 'black';
                this.capturedPieces[capturedColor].push(capturedPiece);
                this.updateCapturedPieces();
            }

            // Move the piece
            this.board[toRow][toCol] = piece;
            this.board[fromRow][fromCol] = null;

            // Promote pawn to queen if it reaches the end
            if (piece.toLowerCase() === 'p') {
                if ((piece === 'P' && toRow === 0) || (piece === 'p' && toRow === 7)) {
                    this.board[toRow][toCol] = piece === 'P' ? 'Q' : 'q';
                }
            }
        }

        // Track piece movements for castling eligibility
        if (piece.toLowerCase() === 'k') {
            if (isWhite) {
                this.hasMoved.whiteKing = true;
            } else {
                this.hasMoved.blackKing = true;
            }
        } else if (piece.toLowerCase() === 'r') {
            if (isWhite) {
                if (fromCol === 0) this.hasMoved.whiteRookLeft = true;
                if (fromCol === 7) this.hasMoved.whiteRookRight = true;
            } else {
                if (fromCol === 0) this.hasMoved.blackRookLeft = true;
                if (fromCol === 7) this.hasMoved.blackRookRight = true;
            }
        }

        this.initializeBoard();
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
        // Simulate the move
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        const isWhite = piece === piece.toUpperCase();
        const inCheck = this.isKingInCheck(isWhite);

        // Undo the move
        this.board[fromRow][fromCol] = piece;
        this.board[toRow][toCol] = capturedPiece;

        return inCheck;
    }

    isKingInCheck(isWhite) {
        // Find the king
        let kingPos = null;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.toLowerCase() === 'k' &&
                    ((isWhite && piece === 'K') || (!isWhite && piece === 'k'))) {
                    kingPos = { row, col };
                    break;
                }
            }
            if (kingPos) break;
        }

        if (!kingPos) return false;

        // Check if any opponent piece can attack the king
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && ((isWhite && piece === piece.toLowerCase()) ||
                             (!isWhite && piece === piece.toUpperCase()))) {
                    const moves = this.getValidMovesWithoutCheckValidation(row, col);
                    if (moves.some(move => move.row === kingPos.row && move.col === kingPos.col)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    getValidMovesWithoutCheckValidation(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const pieceType = piece.toLowerCase();

        switch (pieceType) {
            case 'p': return this.getPawnMoves(row, col);
            case 'r': return this.getRookMoves(row, col);
            case 'n': return this.getKnightMoves(row, col);
            case 'b': return this.getBishopMoves(row, col);
            case 'q': return this.getQueenMoves(row, col);
            case 'k': return this.getBasicKingMoves(row, col);
            default: return [];
        }
    }

    getBasicKingMoves(row, col) {
        const moves = [];
        const offsets = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        const piece = this.board[row][col];
        const isWhite = piece === piece.toUpperCase();

        offsets.forEach(([rowOffset, colOffset]) => {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;
            if (this.isInBounds(newRow, newCol) &&
                (!this.board[newRow][newCol] || this.isOpponentPiece(newRow, newCol, isWhite))) {
                moves.push({ row: newRow, col: newCol });
            }
        });

        return moves;
    }

    switchTurn() {
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        this.updateTurnIndicator();
        this.checkGameStatus();
    }

    checkGameStatus() {
        const hasValidMoves = this.hasAnyValidMoves();
        const inCheck = this.isKingInCheck(this.currentTurn === 'white');

        if (!hasValidMoves) {
            if (inCheck) {
                this.endGame(`Checkmate! ${this.currentTurn === 'white' ? 'Black' : 'White'} wins!`);
            } else {
                this.endGame('Stalemate! Game is a draw.');
            }
        } else if (inCheck) {
            document.getElementById('game-status').textContent = 'Check!';
        } else {
            document.getElementById('game-status').textContent = '';
        }
    }

    hasAnyValidMoves() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.isPieceOwnedByCurrentPlayer(row, col)) {
                    const moves = this.getValidMoves(row, col);
                    if (moves.length > 0) return true;
                }
            }
        }
        return false;
    }

    endGame(message) {
        this.gameOver = true;
        document.getElementById('game-status').textContent = message;
    }

    updateTurnIndicator() {
        document.getElementById('current-turn').textContent =
            this.gameOver ? 'Game Over' : `${this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1)}'s Turn`;
    }

    updateCapturedPieces() {
        document.getElementById('captured-white').innerHTML =
            this.capturedPieces.white.map(p => this.getPieceSymbol(p)).join(' ');
        document.getElementById('captured-black').innerHTML =
            this.capturedPieces.black.map(p => this.getPieceSymbol(p)).join(' ');
    }

    attachEventListeners() {
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetGame();
        });
    }

    resetGame() {
        this.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
        this.currentTurn = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameOver = false;
        this.hasMoved = {
            whiteKing: false,
            blackKing: false,
            whiteRookLeft: false,
            whiteRookRight: false,
            blackRookLeft: false,
            blackRookRight: false
        };
        this.initializeBoard();
        this.updateCapturedPieces();
        document.getElementById('game-status').textContent = '';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});
