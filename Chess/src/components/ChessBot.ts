import { Chess, Move } from 'chess.js';

export class ChessBot {
  private game: Chess;
  private static worker: Worker | null = null;

  constructor(game: Chess) {
    this.game = game;
  }

  private static getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./ChessBotWorker.ts', import.meta.url), { type: 'module' });
    }
    return this.worker;
  }

  async makeMove(): Promise<Move | null> {
    return new Promise((resolve, reject) => {
      const worker = ChessBot.getWorker();

      const handleMessage = (event: MessageEvent) => {
        if (event.data.error) {
          console.error(event.data.error);
          reject(new Error(event.data.error));
          worker.removeEventListener('message', handleMessage);
          return;
        }
        if (!event.data.bestMove) {
          reject(new Error("No valid moves available"));
          worker.removeEventListener('message', handleMessage);
          return;
        }

        resolve(event.data.bestMove);
        worker.removeEventListener('message', handleMessage);
      };

      const handleError = (error: ErrorEvent) => {
        reject(error);
        worker.removeEventListener('error', handleError);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      worker.postMessage({
        fen: this.game.fen(),
        turn: this.game.turn()
      });
    });
  }
}
