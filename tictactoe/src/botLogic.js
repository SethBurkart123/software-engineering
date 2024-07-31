// botLogic.js

export const makeMove = (board) => {
  return minimax(board, 'O').index;
};

const minimax = (board, player, alpha = -Infinity, beta = Infinity, depth = 0) => {
  const availableSpots = getEmptyIndices(board);

  if (checkWinner(board, 'X')) {
    return { score: depth - 10 };
  } else if (checkWinner(board, 'O')) {
    return { score: 10 - depth };
  } else if (availableSpots.length === 0) {
    return { score: 0 };
  }

  let bestMove = {
    index: -1,
    score: player === 'O' ? -Infinity : Infinity
  };

  for (let i = 0; i < availableSpots.length; i++) {
    const currentSpot = availableSpots[i];
    board[currentSpot] = player;

    const result = minimax(board, player === 'O' ? 'X' : 'O', alpha, beta, depth + 1);
    board[currentSpot] = null;

    result.index = currentSpot;

    if (player === 'O') {
      if (result.score > bestMove.score) {
        bestMove = result;
      }
      alpha = Math.max(alpha, bestMove.score);
    } else {
      if (result.score < bestMove.score) {
        bestMove = result;
      }
      beta = Math.min(beta, bestMove.score);
    }

    if (beta <= alpha) {
      break;
    }
  }

  return bestMove;
};

const getEmptyIndices = (board) => {
  return board.reduce((acc, cell, index) => {
    if (cell === null) {
      acc.push(index);
    }
    return acc;
  }, []);
};

const checkWinner = (board, player) => {
  const winningCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];

  return winningCombos.some(combo => 
    combo.every(index => board[index] === player)
  );
};