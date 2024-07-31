import { Chess, Move, Piece } from 'chess.js';
import { PIECE_SQUARE_TABLES } from './PieceSquareTables';

// Global variables
let game: Chess;
let transpositionTable: Map<string, { score: number, depth: number }> = new Map();
let movesAnalyzed = 0;

// Main entry point for the Web Worker
self.onmessage = (event) => {
  console.log('Worker: Started', event.data);
  
  // Initialize the chess game with the provided FEN (board position)
  game = new Chess(event.data.fen);
  const turn = event.data.turn;
  
  // Validate that the game state matches the expected turn
  if (game.turn() !== turn) {
    self.postMessage({ error: "Game state and turn do not match" });
    return;
  }
  
  console.log('Worker: Starting iterative deepening search');
  movesAnalyzed = 0;

  // Run the iterative deepening search to find the best move
  const bestMove = iterativeDeepeningSearch(event.data.depth);
  
  // Send the best move back to the main thread
  self.postMessage({ bestMove });
};

// Helper function to increment and report the number of moves analyzed
function incrementMovesAnalyzed() {
  movesAnalyzed++;
  // Send back the number of moves analyzed to be displayed in the UI
  self.postMessage({ moves: movesAnalyzed });
}

// 1. Search Algorithm: Minimax with Alpha-Beta pruning

// Iterative Deepening Search
// This function gradually increases the search depth, allowing for better time management
function iterativeDeepeningSearch(maxDepth: number): Move | null {
  let depth = 1;
  let bestMove: Move | null = null;

  while (depth < maxDepth) {
    const move = minimaxRoot(depth, true);
    if (move) {
      bestMove = move;
    }
    depth++;
  }

  return bestMove || null;
}

// Root function for the minimax algorithm
// This function initiates the search for the best move at the current game state
function minimaxRoot(depth: number, isMaximisingPlayer: boolean): Move | null {
  const moves = game.moves({ verbose: true });
  console.log(`Worker: Available moves: ${moves.map(m => m.san).join(', ')}`);
  let bestMove = -Infinity;
  let bestMoveFound: Move | null = null;

  // Sort moves for better pruning (move ordering optimization) - this speeds up the search
  moves.sort((a, b) => moveOrderingScore(b) - moveOrderingScore(a));

  // loop through the moves
  for (const move of moves) {
    // try the move
    game.move(move);
    // evaluate the move
    const value = minimax(depth - 1, -Infinity, Infinity, !isMaximisingPlayer);
    // undo the move
    game.undo();
    // if the move is better than the best move, update the best move
    if (value > bestMove) {
      bestMove = value;
      bestMoveFound = move;
    }
    incrementMovesAnalyzed();
  }

  console.log(`Worker: Best move found in minimaxRoot: ${bestMoveFound}`);
  return bestMoveFound;
}

// Minimax function with alpha-beta pruning
// This recursive function evaluates the game tree and returns the best score
function minimax(depth: number, alpha: number, beta: number, isMaximisingPlayer: boolean): number {
  // get current board state of the game
  const fen = game.fen();
  
  // Check transposition table for previously computed positions (saves us a lot of time)
  const cachedResult = transpositionTable.get(fen);
  if (cachedResult && cachedResult.depth >= depth) {
    return cachedResult.score;
  }

  // If we've reached the maximum depth, perform a quiescence search
  if (depth === 0) {
    return quiescenceSearch(alpha, beta, isMaximisingPlayer);
  }

  const moves = game.moves({ verbose: true });
  
  // Sort moves for better pruning (move ordering optimization)
  moves.sort((a, b) => moveOrderingScore(b) - moveOrderingScore(a));

  let bestMove = isMaximisingPlayer ? -Infinity : Infinity;
  for (const move of moves) {
    game.move(move);
    const value = minimax(depth - 1, alpha, beta, !isMaximisingPlayer);
    game.undo();

    if (isMaximisingPlayer) {
      bestMove = Math.max(bestMove, value);
      // best value that the maximiser can guarantee will be recieved
      alpha = Math.max(alpha, bestMove);
    } else {
      bestMove = Math.min(bestMove, value);
      // best value that the minimiser can guarantee will be recieved
      beta = Math.min(beta, bestMove);
    }

    incrementMovesAnalyzed();
    
    // Alpha-beta pruning - if this is true, then these moves would not affect the outcome of the game
    if (beta <= alpha) break;
  }

  // Store the result in the transposition table
  transpositionTable.set(fen, { score: bestMove, depth });
  return bestMove;
}

// Quiescence Search
// This function continues the search in positions that involve captures
// to avoid the "horizon effect" (where shallow search might miss critical captures) 
// and provide more stable evaluations by considering only significant moves
function quiescenceSearch(alpha: number, beta: number, isMaximisingPlayer: boolean): number {
  // Evaluate the current board position and get the static evaluation score
  const standPat = evaluateBoard();
  
  // If the current player is maximizing (trying to get the highest score)
  if (isMaximisingPlayer) {
    // If the evaluation score is greater than or equal to beta, return beta
    // because the current move is not useful; it's already worse than what the opponent can achieve
    if (standPat >= beta) return beta;

    // Update alpha with the maximum value between alpha and the current evaluation score
    alpha = Math.max(alpha, standPat);
  } else {
    // If the current player is minimizing (trying to get the lowest score)
    // If the evaluation score is less than or equal to alpha, return alpha
    // because the current move is not useful; it's already worse than what the maximizing player can achieve
    if (standPat <= alpha) return alpha;

    // Update beta with the minimum value between beta and the current evaluation score
    beta = Math.min(beta, standPat);
  }

  // Get all possible moves from the current position
  // Only consider capture moves ('c' in flags) for further searching
  const moves = game.moves({ verbose: true }).filter(move => move.flags.includes('c'));

  // Iterate through each capture move
  for (const move of moves) {
    // Make the move on the board
    game.move(move.san);
    
    // Recursively call quiescence search on the new board position
    const score = quiescenceSearch(alpha, beta, !isMaximisingPlayer);

    // Undo the move to restore the original board state
    game.undo();

    // If the current player is maximizing
    if (isMaximisingPlayer) {
      // Update alpha with the maximum value between alpha and the current score
      alpha = Math.max(alpha, score);
      // If alpha is greater than or equal to beta, prune the search (beta cutoff)
      if (alpha >= beta) return alpha;
    } else {
      // If the current player is minimizing
      // Update beta with the minimum value between beta and the current score
      beta = Math.min(beta, score);
      // If beta is less than or equal to alpha, prune the search (alpha cutoff)
      if (alpha >= beta) return beta;
    }
  }
  
  // Return the final alpha or beta value depending on whether the current player is maximizing or minimizing
  return isMaximisingPlayer ? alpha : beta;
}

// 2. Evaluation: Material count with piece-square tables

// Evaluate the board and return a score
function evaluateBoard(): number {
  const board = game.board();
  let totalEvaluation = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      // loop through every piece and add its value to the total evaluation
      totalEvaluation += getPieceValue(board[i][j], i, j);
    }
  }
  return totalEvaluation;
}

// Get the value of a piece at a specific position
function getPieceValue(piece: Piece | null, x: number, y: number): number {
  if (!piece) return 0;
  const isWhite = piece.color === 'w';
  const pieceValue = getAbsoluteValue(piece, isWhite, x, y);
  return isWhite ? pieceValue : -pieceValue;
}

// Calculate the absolute value of a piece considering its position
function getAbsoluteValue(piece: Piece, isWhite: boolean, x: number, y: number): number {
  const pieceType = piece.type;
  const pieceSquareTable = getPieceSquareTable(pieceType, isWhite);
  return PIECE_VALUES[pieceType] + pieceSquareTable[y][x];
}

// Give different pieces different values
const PIECE_VALUES = {
  p: 10,  // Pawn
  r: 50,  // Rook
  n: 30,  // Knight
  b: 30,  // Bishop
  q: 90,  // Queen
  k: 900  // King
};

// Get the appropriate piece-square table for a given piece type and color
function getPieceSquareTable(pieceType: string, isWhite: boolean): number[][] {
  switch (pieceType) {
    case 'p': return isWhite ? PIECE_SQUARE_TABLES.pawnEvalWhite : PIECE_SQUARE_TABLES.pawnEvalBlack;
    case 'r': return isWhite ? PIECE_SQUARE_TABLES.rookEvalWhite : PIECE_SQUARE_TABLES.rookEvalBlack;
    case 'n': return PIECE_SQUARE_TABLES.knightEval;
    case 'b': return isWhite ? PIECE_SQUARE_TABLES.bishopEvalWhite : PIECE_SQUARE_TABLES.bishopEvalBlack;
    case 'q': return PIECE_SQUARE_TABLES.evalQueen;
    case 'k': return isWhite ? PIECE_SQUARE_TABLES.kingEvalWhite : PIECE_SQUARE_TABLES.kingEvalBlack;
    default: throw new Error(`Unknown piece type: ${pieceType}`);
  }
}

// 3. Move Ordering: MVV-LVA (Most Valuable Victim - Least Valuable Attacker) -> found from https://www.reddit.com/r/chessprogramming/comments/11zv78n/move_ordering_for_minimax_optimization/

// Calculate a score for move ordering based on MVV-LVA principle
function moveOrderingScore(move: Move): number {
  const capturedPiece = game.get(move.to);
  if (capturedPiece) {
    // MVV-LVA score: value of captured piece - value of attacking piece / 100
    return PIECE_VALUES[capturedPiece.type] - PIECE_VALUES[move.piece] / 100;
  }
  return 0;
}