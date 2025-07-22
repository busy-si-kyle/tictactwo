document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const cells = document.querySelectorAll('.cell');
    const statusDisplay = document.getElementById('status-display');
    const timerDisplay = document.getElementById('timer-display');
    const restartButton = document.getElementById('restart-button');
    const themeToggleButton = document.getElementById('theme-toggle');
    const playerModeToggleButton = document.getElementById('player-mode-toggle');
    const difficultyControls = document.getElementById('difficulty-controls');
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    const body = document.body;

    // --- Game State Variables ---
    let gameActive = true;
    let currentPlayer = 'X';
    let isTwoPlayerMode = true;
    let difficulty = 'easy';
    let gameState = ["", "", "", "", "", "", "", "", ""];
    let playerMoves = { 'X': [], 'O': [] };
    let removeSequenceStarted = false;
    let moveTimer = null;

    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    const winningMessage = () => `Player ${currentPlayer} has won!`;
    const currentPlayerTurn = () => `${currentPlayer}'s Turn`;

    // --- Event Listeners ---
    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    restartButton.addEventListener('click', handleRestartGame);
    themeToggleButton.addEventListener('click', toggleTheme);
    playerModeToggleButton.addEventListener('click', togglePlayerMode);
    difficultyButtons.forEach(button => button.addEventListener('click', handleDifficultyChange));

    // --- Core Game Functions ---

    function handleCellClick(e) {
        const clickedCell = e.target;
        const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

        if (gameState[clickedCellIndex] !== "" || !gameActive) return;

        stopMoveTimer();
        makeMove(clickedCell, clickedCellIndex);
        
        if (!checkWin()) {
            changePlayer();
            if (!isTwoPlayerMode && currentPlayer === 'O' && gameActive) {
                disableBoard();
                setTimeout(computerMove, 700);
            }
        }
    }
    
    function makeMove(cell, index) {
        gameState[index] = currentPlayer;
        cell.innerHTML = currentPlayer;
        cell.classList.add(currentPlayer);
        playerMoves[currentPlayer].push(index);

        // This check is now correctly placed. The AI will know this is true on its *next* turn.
        if (!removeSequenceStarted && playerMoves['O'].length === 3) {
            removeSequenceStarted = true;
        }

        if (removeSequenceStarted) {
            const opponent = currentPlayer === 'X' ? 'O' : 'X';
            if (playerMoves[opponent].length > 0) {
                const oldestMoveIndex = playerMoves[opponent].shift();
                gameState[oldestMoveIndex] = "";
                const oldestCell = document.querySelector(`[data-index='${oldestMoveIndex}']`);
                oldestCell.innerHTML = "";
                oldestCell.classList.remove('X', 'O');
                oldestCell.classList.add('fade-out');
                setTimeout(() => oldestCell.classList.remove('fade-out'), 500);
            }
        }
        checkWin();
    }

    function checkWin() {
        let roundWon = false;
        for (const condition of winningConditions) {
            const [a, b, c] = condition;
            if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
                roundWon = true;
                break;
            }
        }
        if (roundWon) {
            statusDisplay.innerHTML = winningMessage();
            gameActive = false;
            stopMoveTimer();
        }
        return roundWon;
    }

    function changePlayer() {
        currentPlayer = currentPlayer === "X" ? "O" : "X";
        statusDisplay.innerHTML = currentPlayerTurn();
        startMoveTimer();
    }
    
    function handleRestartGame() {
        gameActive = true;
        currentPlayer = "X";
        gameState = ["", "", "", "", "", "", "", "", ""];
        playerMoves = { 'X': [], 'O': [] };
        removeSequenceStarted = false;
        statusDisplay.innerHTML = currentPlayerTurn();
        cells.forEach(cell => {
            cell.innerHTML = "";
            cell.classList.remove('X', 'O');
        });
        enableBoard();
        startMoveTimer();
    }

    // --- Timer Functions ---

    function startMoveTimer() {
        stopMoveTimer();
        if (!isTwoPlayerMode && difficulty === 'hard' && currentPlayer === 'X' && gameActive && playerMoves['X'].length > 0) {
            timerDisplay.classList.add('visible');
            let timeLeft = 3;
            timerDisplay.innerHTML = `Time left: ${timeLeft}`;
            moveTimer = setInterval(() => {
                timeLeft--;
                timerDisplay.innerHTML = `Time left: ${timeLeft}`;
                if (timeLeft <= 0) {
                    stopMoveTimer();
                    gameActive = false;
                    statusDisplay.innerHTML = "Time's up! O wins!";
                    disableBoard();
                }
            }, 1000);
        }
    }

    function stopMoveTimer() {
        clearInterval(moveTimer);
        moveTimer = null;
        if(timerDisplay) {
            timerDisplay.classList.remove('visible');
        }
    }

    // --- UI & Mode Functions ---

    function toggleTheme() {
        body.classList.toggle('dark-mode');
        themeToggleButton.querySelector('i').classList.toggle('fa-sun');
        themeToggleButton.querySelector('i').classList.toggle('fa-moon');
    }

    function togglePlayerMode() {
        isTwoPlayerMode = !isTwoPlayerMode;
        body.classList.toggle('two-player-mode', isTwoPlayerMode);
        body.classList.toggle('single-player-mode', !isTwoPlayerMode);
        handleRestartGame();
    }

    function handleDifficultyChange(e) {
        difficulty = e.target.getAttribute('data-difficulty');
        difficultyButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        handleRestartGame();
    }

    // --- AI Logic ---

    function computerMove() {
        let moveIndex;
        if (difficulty === 'hard') {
            moveIndex = getHardMove();
        } else if (difficulty === 'medium') {
            moveIndex = getMediumMove();
        } else {
            moveIndex = getEasyMove();
        }

        if (moveIndex !== null && gameActive) {
            const cellToPlay = document.querySelector(`[data-index='${moveIndex}']`);
            makeMove(cellToPlay, moveIndex);
            if (!checkWin()) {
                changePlayer();
            }
        }
        enableBoard();
    }

    function getEasyMove() {
        const availableCells = getAvailableCells(gameState);
        if (Math.random() < 0.33) {
            const blockMove = findWinningOrBlockingMove(gameState, 'X');
            if (blockMove !== null) return blockMove;
        }
        return availableCells[Math.floor(Math.random() * availableCells.length)];
    }

    function getMediumMove() {
        const winMove = findWinningOrBlockingMove(gameState, 'O');
        if (winMove !== null) return winMove;
        const blockMove = findWinningOrBlockingMove(gameState, 'X');
        if (blockMove !== null) return blockMove;
        if (gameState[4] === "") return 4;
        const availableCells = getAvailableCells(gameState);
        return availableCells[Math.floor(Math.random() * availableCells.length)];
    }

    function getHardMove() {
        // Priority 1: Can the AI win on this turn?
        let move = findWinningOrBlockingMove(gameState, 'O');
        if (move !== null) return move;
    
        // Priority 2: Advanced analysis. The key is to check if the player has 3 moves on the board.
        // If they do, the removal rule will be in effect, and the AI must think differently.
        if (playerMoves['X'].length === 3) {
            const oldestPlayerMove = playerMoves['X'][0];
    
            // 2a. Block any REAL threats from the player.
            // A "real threat" is a line that does NOT contain the player's oldest piece.
            const blockableThreat = findValidThreats(gameState, 'X', oldestPlayerMove);
            if (blockableThreat !== null) {
                return blockableThreat;
            }
    
            // 2b. Look for a strategic win based on the coming removal.
            const boardAfterRemoval = [...gameState];
            boardAfterRemoval[oldestPlayerMove] = ''; // Create a "future" board.
            const strategicWin = findWinningOrBlockingMove(boardAfterRemoval, 'O');
            if (strategicWin !== null && gameState[strategicWin] === '') {
                // Found a move that will win after the piece is removed, and the spot is currently empty.
                return strategicWin;
            }
        }
    
        // Priority 3: If no advanced moves are found, or if we are not in the removal phase,
        // perform a standard block check. This now correctly serves as a fallback.
        move = findWinningOrBlockingMove(gameState, 'X');
        if (move !== null) return move;
    
        // Priority 4: Take the center square if available.
        if (gameState[4] === "") return 4;
    
        // Priority 5: As a last resort, take any available random cell.
        const availableCells = getAvailableCells(gameState);
        return availableCells.length > 0 ? availableCells[Math.floor(Math.random() * availableCells.length)] : null;
    }
    
    // --- AI Helper Functions ---

    /**
     * Finds player threats but intelligently ignores "false threats"
     * that include the player's soon-to-be-removed oldest piece.
     */
    function findValidThreats(board, player, oldestMoveIndex) {
        for (const condition of winningConditions) {
            const [a, b, c] = condition;
            
            const line = [board[a], board[b], board[c]];
            if (line.filter(p => p === player).length === 2 && line.includes("")) {
                // It's a threat. Now, is it a REAL threat?
                if (condition.includes(oldestMoveIndex)) {
                    // This line contains the piece that will be removed. It's a false alarm.
                    continue; 
                } else {
                    // This is a REAL threat. Return the empty spot's index to be blocked.
                    return condition[line.indexOf("")];
                }
            }
        }
        return null; // No valid, blockable threats found.
    }
    
    function findWinningOrBlockingMove(board, player) {
        for (const condition of winningConditions) {
            const [a, b, c] = condition;
            const line = [board[a], board[b], board[c]];
            const emptyIndex = [a, b, c][line.indexOf("")];

            if (line.filter(p => p === player).length === 2 && line.includes("")) {
                return emptyIndex;
            }
        }
        return null;
    }

    function getAvailableCells(board) {
        return board.map((val, index) => val === "" ? index : null).filter(val => val !== null);
    }
    
    function disableBoard() {
        document.getElementById('game-grid').style.pointerEvents = 'none';
    }
    
    function enableBoard() {
        document.getElementById('game-grid').style.pointerEvents = 'auto';
    }

    // --- Initial Setup ---
    body.classList.add('two-player-mode');
    statusDisplay.innerHTML = currentPlayerTurn();
});
