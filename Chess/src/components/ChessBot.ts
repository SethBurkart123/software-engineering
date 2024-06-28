import { Chess, Move } from 'chess.js';

export class ChessBot {
  private game: Chess;

  constructor(game: Chess) {
    this.game = game;
  }

  makeMove(): Move | null {
    const moves = this.game.moves({ verbose: true });
    if (moves.length === 0) return null;

    // log out all legal moves
    console.log(moves);

    // return a random legal move
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
  }
}