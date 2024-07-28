import { Chess, Move } from 'chess.js';

export class ChessBot {
  private game: Chess;

  constructor(game: Chess) {
    this.game = game;
  }

  async makeMove(): Promise<Move | null> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./ChessBotWorker.ts', import.meta.url), { type: 'module' });
      worker.postMessage({ 
        fen: this.game.fen(),
        turn: this.game.turn()
      });
      worker.onmessage = (event) => {
        if (event.data.error) {
          console.error(event.data.error);
          reject(new Error(event.data.error));
          worker.terminate();
          return;
        }
        if (!event.data.bestMove) {
          reject(new Error("No valid moves available"));
          worker.terminate();
          return;
        }
        const bestMove = this.game.move(event.data.bestMove);
        if (bestMove) {
          console.log(`Best move: ${bestMove.san}`);
          resolve(bestMove);
        } else {
          reject(new Error(`Invalid move: ${event.data.bestMove}`));
        }
        worker.terminate();
      };
      worker.onerror = (error) => {
        reject(error);
        worker.terminate();
      };
    });
  }
}