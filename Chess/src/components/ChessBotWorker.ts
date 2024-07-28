import { Chess, Move, Piece } from 'chess.js';

let game: Chess;
let transpositionTable: Map<string, { score: number, depth: number }> = new Map();
let movesAnalyzed = 0;

self.onmessage = (event) => {
  console.log('Worker: Received message', event.data);
  game = new Chess(event.data.fen);
  console.log(`Worker: Initialized game with FEN: ${game.fen()}`);
  const turn = event.data.turn;
  console.log(`Worker: Received turn: ${turn}`);
  console.log(`Worker: Current game turn: ${game.turn()}`);
  if (game.turn() !== turn) {
    console.error('Worker: Game state and turn do not match');
    self.postMessage({ error: "Game state and turn do not match" });
    return;
  }
  console.log('Worker: Starting iterative deepening search');
  const bestMove = iterativeDeepeningSearch(1000); // 1 second time limit
  console.log(`Worker: Best move found: ${bestMove}`);
  self.postMessage({ bestMove });
};

function iterativeDeepeningSearch(timeLimit: number): string {
  const startTime = Date.now();
  let depth = 1;
  let bestMove: string | null = null;

  while (Date.now() - startTime < timeLimit) {
    console.log(`Worker: Searching at depth ${depth}`);
    const move = minimaxRoot(depth, true);
    if (move) {
      bestMove = move;
      console.log(`Worker: Found move at depth ${depth}: ${move}`);
    }
    depth++;
  }

  return bestMove || '';
}

function minimaxRoot(depth: number, isMaximisingPlayer: boolean): string | null {
  const moves = game.moves({ verbose: true });
  console.log(`Worker: Available moves: ${moves.map(m => m.san).join(', ')}`);
  let bestMove = -Infinity;
  let bestMoveFound: string | null = null;

  moves.sort((a, b) => evaluateMove(b) - evaluateMove(a));

  for (const move of moves) {
    game.move(move);
    const value = minimax(depth - 1, -Infinity, Infinity, !isMaximisingPlayer);
    game.undo();
    if (value > bestMove) {
      bestMove = value;
      bestMoveFound = move.san;
    }
    incrementMovesAnalyzed();
  }

  console.log(`Worker: Best move found in minimaxRoot: ${bestMoveFound}`);
  return bestMoveFound;
}

function minimax(depth: number, alpha: number, beta: number, isMaximisingPlayer: boolean): number {
  const fen = game.fen();
  const cachedResult = transpositionTable.get(fen);
  if (cachedResult && cachedResult.depth >= depth) {
    return cachedResult.score;
  }

  if (depth === 0) {
    return quiescenceSearch(alpha, beta, isMaximisingPlayer);
  }

  const moves = game.moves({ verbose: true });
  moves.sort((a, b) => evaluateMove(b) - evaluateMove(a));

  let bestMove = isMaximisingPlayer ? -Infinity : Infinity;
  for (const move of moves) {
    game.move(move);
    const value = minimax(depth - 1, alpha, beta, !isMaximisingPlayer);
    game.undo();

    if (isMaximisingPlayer) {
      bestMove = Math.max(bestMove, value);
      alpha = Math.max(alpha, bestMove);
    } else {
      bestMove = Math.min(bestMove, value);
      beta = Math.min(beta, bestMove);
    }

    incrementMovesAnalyzed();
    if (beta <= alpha) break;
  }

  transpositionTable.set(fen, { score: bestMove, depth });
  return bestMove;
}

function incrementMovesAnalyzed() {
  movesAnalyzed++;
  if (movesAnalyzed % 1000 === 0) {
    console.log(`Moves analyzed: ${movesAnalyzed}`);
  }
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

  const moves = game.moves({ verbose: true }).filter(move => move.flags.includes('c'));
  for (const move of moves) {
    game.move(move.san);
    const score = quiescenceSearch(alpha, beta, !isMaximisingPlayer);
    game.undo();
    if (isMaximisingPlayer) {
      alpha = Math.max(alpha, score);
      if (alpha >= beta) return alpha;
    } else {
      beta = Math.min(beta, score);
      if (alpha >= beta) return beta;
    }
  }
  return isMaximisingPlayer ? alpha : beta;
}

function evaluateBoard(): number {
  const board = game.board();
  let totalEvaluation = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      totalEvaluation += getPieceValue(board[i][j], i, j);
    }
  }
  totalEvaluation += evaluateKingSafety(board);
  totalEvaluation += evaluatePawnStructure(board);
  return totalEvaluation;
}

function getPieceValue(piece: Piece | null, x: number, y: number): number {
  if (!piece) return 0;
  const isWhite = piece.color === 'w';
  const pieceValue = getAbsoluteValue(piece, isWhite, x, y);
  return isWhite ? pieceValue : -pieceValue;
}

function getAbsoluteValue(piece: Piece, isWhite: boolean, x: number, y: number): number {
  switch (piece.type) {
    case 'p':
      return 10 + (isWhite ? pawnEvalWhite[y][x] : pawnEvalBlack[y][x]);
    case 'r':
      return 50 + (isWhite ? rookEvalWhite[y][x] : rookEvalBlack[y][x]);
    case 'n':
      return 30 + knightEval[y][x];
    case 'b':
      return 30 + (isWhite ? bishopEvalWhite[y][x] : bishopEvalBlack[y][x]);
    case 'q':
      return 90 + evalQueen[y][x];
    case 'k':
      return 900 + (isWhite ? kingEvalWhite[y][x] : kingEvalBlack[y][x]);
    default:
      throw new Error(`Unknown piece type: ${piece.type}`);
  }
}

function evaluateMove(move: Move): number {
  const pieceValues = { p: 10, r: 50, n: 30, b: 30, q: 90, k: 900 };
  const piece = game.get(move.to);
  return piece ? pieceValues[piece.type] : 0;
}

function evaluateKingSafety(board: (Piece | null)[][]): number {
  // Placeholder implementation
  return 0;
}

function evaluatePawnStructure(board: (Piece | null)[][]): number {
  // Placeholder implementation
  return 0;
}

// Piece square tables and evaluation values
const reverseArray = (array: number[][]): number[][] => array.slice().reverse();

const pawnEvalWhite = [
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
  [1.0, 1.0, 2.0, 3.0, 3.0, 2.0, 1.0, 1.0],
  [0.5, 0.5, 1.0, 2.5, 2.5, 1.0, 0.5, 0.5],
  [0.0, 0.0, 0.0, 2.0, 2.0, 0.0, 0.0, 0.0],
  [0.5, -0.5, -1.0, 0.0, 0.0, -1.0, -0.5, 0.5],
  [0.5, 1.0, 1.0, -2.0, -2.0, 1.0, 1.0, 0.5],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
];

const pawnEvalBlack = reverseArray(pawnEvalWhite);

const knightEval = [
  [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
  [-4.0, -2.0, 0.0, 0.0, 0.0, 0.0, -2.0, -4.0],
  [-3.0, 0.0, 1.0, 1.5, 1.5, 1.0, 0.0, -3.0],
  [-3.0, 0.5, 1.5, 2.0, 2.0, 1.5, 0.5, -3.0],
  [-3.0, 0.0, 1.5, 2.0, 2.0, 1.5, 0.0, -3.0],
  [-3.0, 0.5, 1.0, 1.5, 1.5, 1.0, 0.5, -3.0],
  [-4.0, -2.0, 0.0, 0.5, 0.5, 0.0, -2.0, -4.0],
  [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
];

const bishopEvalWhite = [
  [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
  [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
  [-1.0, 0.0, 0.5, 1.0, 1.0, 0.5, 0.0, -1.0],
  [-1.0, 0.5, 0.5, 1.0, 1.0, 0.5, 0.5, -1.0],
  [-1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0],
  [-1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0],
  [-1.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, -1.0],
  [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0]
];

const bishopEvalBlack = reverseArray(bishopEvalWhite);

const rookEvalWhite = [
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0]
];

const rookEvalBlack = reverseArray(rookEvalWhite);

const evalQueen = [
  [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
  [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
  [-1.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
  [-0.5, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
  [0.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
  [-1.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
  [-1.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, -1.0],
  [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0]
];

const kingEvalWhite = [
  [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [-2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
  [-1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
  [2.0, 2.0, 0.0, 0.0, 0.0, 0.0, 2.0, 2.0],
  [2.0, 3.0, 1.0, 0.0, 0.0, 1.0, 3.0, 2.0]
];

const kingEvalBlack = reverseArray(kingEvalWhite);
