import { Chess, Move } from 'chess.js';

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

// Give different pieces different values
const PIECE_VALUES = {
  p: 10,  // Pawn
  r: 50,  // Rook
  n: 30,  // Knight
  b: 30,  // Bishop
  q: 90,  // Queen
  k: 900  // King
};

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