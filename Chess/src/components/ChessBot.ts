import { Chess, Move, Square, Piece } from 'chess.js';

export class ChessBot {
  private game: Chess;

  constructor(game: Chess) {
    this.game = game;
  }

  makeMove(): Move | null {
    const depth = 2; // Depth of search
    const bestMove = this.minimaxRoot(depth, true);
    return bestMove ? bestMove : null;
  }

  private minimaxRoot(depth: number, isMaximisingPlayer: boolean): Move | null {
    const moves = this.game.moves({ verbose: true });
    let bestMove = -Infinity;
    let bestMoveFound: Move | null = null;

    for (const move of moves) {
      this.game.move(move.san);
      const value = this.minimax(depth - 1, -Infinity, Infinity, !isMaximisingPlayer);
      this.game.undo();
      if (value > bestMove) {
        bestMove = value;
        bestMoveFound = move;
      }
    }

    return bestMoveFound;
  }

  private minimax(depth: number, alpha: number, beta: number, isMaximisingPlayer: boolean): number {
    if (depth === 0) {
      return this.quiescenceSearch(alpha, beta, isMaximisingPlayer);
    }

    const moves = this.game.moves({ verbose: true });
    if (isMaximisingPlayer) {
      let bestMove = -Infinity;
      for (const move of moves) {
        this.game.move(move.san);
        bestMove = Math.max(bestMove, this.minimax(depth - 1, alpha, beta, !isMaximisingPlayer));
        this.game.undo();
        alpha = Math.max(alpha, bestMove);
        if (beta <= alpha) break;
      }
      return bestMove;
    } else {
      let bestMove = Infinity;
      for (const move of moves) {
        this.game.move(move.san);
        bestMove = Math.min(bestMove, this.minimax(depth - 1, alpha, beta, !isMaximisingPlayer));
        this.game.undo();
        beta = Math.min(beta, bestMove);
        if (beta <= alpha) break;
      }
      return bestMove;
    }
  }

  private quiescenceSearch(alpha: number, beta: number, isMaximisingPlayer: boolean): number {
    const standPat = this.evaluateBoard(this.game.board());
    if (isMaximisingPlayer) {
      if (standPat >= beta) return beta;
      alpha = Math.max(alpha, standPat);
    } else {
      if (standPat <= alpha) return alpha;
      beta = Math.min(beta, standPat);
    }

    const moves = this.game.moves({ verbose: true, legal: true }).filter(move => move.flags.includes('c'));
    for (const move of moves) {
      this.game.move(move.san);
      const score = this.quiescenceSearch(alpha, beta, !isMaximisingPlayer);
      this.game.undo();
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

  private evaluateBoard(board: (Piece | null)[][]): number {
    let totalEvaluation = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        totalEvaluation += this.getPieceValue(board[i][j], i, j);
      }
    }
    return totalEvaluation;
  }

  private getPieceValue(piece: Piece | null, x: number, y: number): number {
    if (!piece) return 0;
    const isWhite = piece.color === 'w';
    const pieceValue = this.getAbsoluteValue(piece, isWhite, x, y);
    return isWhite ? pieceValue : -pieceValue;
  }

  private getAbsoluteValue(piece: Piece, isWhite: boolean, x: number, y: number): number {
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
