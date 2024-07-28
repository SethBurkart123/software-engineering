import { Chess, Move, Piece } from 'chess.js';
import {
  pawnEvalWhite, pawnEvalBlack, knightEval, bishopEvalWhite,
  bishopEvalBlack, rookEvalWhite, rookEvalBlack, evalQueen,
  kingEvalWhite, kingEvalBlack
} from './ChessEvals';

let game: Chess;
let transpositionTable = new Map<string, { score: number, depth: number }>();
const MAX_TRANSPOSITION_SIZE = 1e6;
let movesAnalyzed = 0;
let previousBestMove: Move | null = null;

self.onmessage = async ({ data }) => {
  console.log('Worker: Received message', data);
  game = new Chess(data.fen);
  movesAnalyzed = 0;

  if (game.turn() !== data.turn) {
    self.postMessage({ error: "Game state and turn do not match" });
    return;
  }

  console.log('Worker: Starting iterative deepening search');
  const bestMove = await iterativeDeepeningSearch(3);
  self.postMessage({ bestMove });
};

async function iterativeDeepeningSearch(depth: number): Promise<Move | null> {
  let bestMove = null;
  for (let d = 1; d <= depth; d++) {
    bestMove = minimaxRoot(d, true);
    previousBestMove = bestMove;
  }
  return bestMove;
}

function minimaxRoot(depth: number, isMaximisingPlayer: boolean): Move | null {
  const moves = game.moves({ verbose: true });
  if (previousBestMove) {
    // Prioritize the previous best move
    const index = moves.findIndex(move => move.san === previousBestMove?.san);
    if (index !== -1) {
      const [best] = moves.splice(index, 1);
      moves.unshift(best);
    }
  }
  return moves.sort((a, b) => evaluateMove(b) - evaluateMove(a))
    .reduce<{ bestMove: Move | null, bestMoveScore: number }>((best, move) => {
      game.move(move);
      const moveScore = minimax(depth - 1, -Infinity, Infinity, !isMaximisingPlayer);
      game.undo();
      if (moveScore > best.bestMoveScore) {
        best.bestMove = move;
        best.bestMoveScore = moveScore;
      }
      incrementMovesAnalyzed();
      return best;
    }, { bestMove: null, bestMoveScore: -Infinity }).bestMove;
}

function minimax(depth: number, alpha: number, beta: number, isMaximisingPlayer: boolean): number {
  const cachedResult = transpositionTable.get(game.fen());
  if (cachedResult && cachedResult.depth >= depth) return cachedResult.score;
  if (depth === 0) return quiescenceSearch(alpha, beta, isMaximisingPlayer);

  if (!isMaximisingPlayer && depth > 1 && !game.inCheck()) {
    const nullMoveScore = -minimax(depth - 1 - 2, -beta, -beta + 1, true);
    if (nullMoveScore >= beta) return nullMoveScore;
  }

  let bestMoveScore = isMaximisingPlayer ? -Infinity : Infinity;
  let b = beta;
  const moves = game.moves({ verbose: true }).sort((a, b) => evaluateMove(b) - evaluateMove(a));

  for (const move of moves) {
    game.move(move);
    let moveScore;
    if (move === moves[0]) {
      moveScore = minimax(depth - 1, alpha, b, !isMaximisingPlayer);
    } else {
      moveScore = minimax(depth - 1, alpha, alpha + 1, !isMaximisingPlayer);
      if (moveScore > alpha && moveScore < beta) {
        moveScore = minimax(depth - 1, alpha, b, !isMaximisingPlayer);
      }
    }
    game.undo();

    if (isMaximisingPlayer) {
      bestMoveScore = Math.max(bestMoveScore, moveScore);
      alpha = Math.max(alpha, bestMoveScore);
    } else {
      bestMoveScore = Math.min(bestMoveScore, moveScore);
      beta = Math.min(beta, bestMoveScore);
    }

    incrementMovesAnalyzed();
    if (beta <= alpha) break;
    b = alpha + 1; // Set the aspiration window for PVS
  }

  storeInTranspositionTable(game.fen(), bestMoveScore, depth);
  return bestMoveScore;
}

function quiescenceSearch(alpha: number, beta: number, isMaximisingPlayer: boolean): number {
  const standPat = evaluateBoard();
  if (isMaximisingPlayer) {
    if (standPat >= beta) return beta;
    alpha = Math.max(alpha, standPat);
  } else {
    if (standPat <= alpha) return alpha;
    beta = Math.min(beta, standPat);
  }

  const captures = game.moves({ verbose: true }).filter(move => move.flags.includes('c'));
  for (const move of captures) {
    game.move(move.san);
    const score = quiescenceSearch(alpha, beta, !isMaximisingPlayer);
    game.undo();

    if (isMaximisingPlayer) {
      alpha = Math.max(alpha, score);
      if (alpha >= beta) return alpha;
    } else {
      beta = Math.min(beta, score);
      if (beta <= alpha) return beta;
    }
  }
  return isMaximisingPlayer ? alpha : beta;
}

function evaluateBoard(): number {
  return game.board().reduce((total, row, y) => total + row.reduce((rowTotal, piece, x) => 
    rowTotal + (piece ? getPieceValue(piece, x, y) : 0), 0), 0);
}

function getPieceValue(piece: Piece, x: number, y: number): number {
  const value = getAbsoluteValue(piece, piece.color === 'w', x, y);
  return piece.color === 'w' ? value : -value;
}

function getAbsoluteValue(piece: Piece, isWhite: boolean, x: number, y: number): number {
  const pieceValue = {
    p: 10 + (isWhite ? pawnEvalWhite[y][x] : pawnEvalBlack[y][x]),
    r: 50 + (isWhite ? rookEvalWhite[y][x] : rookEvalBlack[y][x]),
    n: 30 + knightEval[y][x],
    b: 30 + (isWhite ? bishopEvalWhite[y][x] : bishopEvalBlack[y][x]),
    q: 90 + evalQueen[y][x],
    k: 900 + (isWhite ? kingEvalWhite[y][x] : kingEvalBlack[y][x])
  };
  return pieceValue[piece.type] || 0;
}

function evaluateMove(move: Move): number {
  const piece = game.get(move.to);
  const movingPiece = game.get(move.from);
  if (piece && movingPiece) {
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
    return 10 * values[piece.type] - values[movingPiece.type];
  }
  return 0;
}

function incrementMovesAnalyzed() {
  movesAnalyzed++;
  if (movesAnalyzed % 1000 === 0) console.log(`Moves analyzed: ${movesAnalyzed}`);
}

function storeInTranspositionTable(fen: string, score: number, depth: number) {
  if (transpositionTable.size >= MAX_TRANSPOSITION_SIZE) {
    // Remove a random entry (could use a better strategy like LRU)
    const keys = Array.from(transpositionTable.keys());
    transpositionTable.delete(keys[Math.floor(Math.random() * keys.length)]);
  }
  transpositionTable.set(fen, { score, depth });
}
