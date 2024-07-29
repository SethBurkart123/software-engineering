import { Chess, Move, Piece } from 'chess.js';

let game: Chess;
let movesAnalyzed = 0;

self.onmessage = (event) => {
  console.log('Simple Worker: Started', event.data);
  game = new Chess(event.data.fen);
  const turn = event.data.turn;
  if (game.turn() !== turn) {
    self.postMessage({ error: "Game state and turn do not match" });
    return;
  }
  movesAnalyzed = 0;
  const bestMove = iterativeDeepeningSearch(event.data.depth);
  self.postMessage({ bestMove });
};

function iterativeDeepeningSearch(maxDepth: number): Move | null {
  let bestMove: Move | null = null;
  for (let depth = 1; depth <= maxDepth; depth++) {
    bestMove = minimaxRoot(depth, true);
  }
  return bestMove;
}

function minimaxRoot(depth: number, isMaximisingPlayer: boolean): Move | null {
  const moves = game.moves({ verbose: true });
  let bestValue = -Infinity;
  let bestMove: Move | null = null;

  for (const move of moves) {
    game.move(move);
    const value = minimax(depth - 1, -Infinity, Infinity, !isMaximisingPlayer);
    game.undo();

    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
    movesAnalyzed++;
    self.postMessage({ moves: movesAnalyzed });
  }
  return bestMove;
}

function minimax(depth: number, alpha: number, beta: number, isMaximisingPlayer: boolean): number {
  if (depth === 0) {
    return evaluateBoard();
  }

  const moves = game.moves({ verbose: true });
  let bestValue = isMaximisingPlayer ? -Infinity : Infinity;

  for (const move of moves) {
    game.move(move);
    const value = minimax(depth - 1, alpha, beta, !isMaximisingPlayer);
    game.undo();

    if (isMaximisingPlayer) {
      bestValue = Math.max(bestValue, value);
      alpha = Math.max(alpha, bestValue);
    } else {
      bestValue = Math.min(bestValue, value);
      beta = Math.min(beta, bestValue);
    }
    if (beta <= alpha) break;
  }
  return bestValue;
}

function evaluateBoard(): number {
  const board = game.board();
  let totalEvaluation = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      totalEvaluation += getPieceValue(board[i][j]);
    }
  }
  return totalEvaluation;
}

function getPieceValue(piece: Piece | null): number {
  if (!piece) return 0;
  const values = { p: 10, r: 50, n: 30, b: 30, q: 90, k: 900 };
  const pieceValue = values[piece.type];
  return piece.color === 'w' ? pieceValue : -pieceValue;
}

// No need for complex piece-square tables in this simplified version
