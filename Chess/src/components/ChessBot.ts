import { Chess, Move } from 'chess.js';

export class ChessBot {
  private game: Chess;
  private static worker: Worker | null = null;
  private static simpleWorker: Worker | null = null;
  private statDisplay: HTMLElement | null = null;
  private maxDepth: HTMLInputElement | null = null;

  constructor(game: Chess) {
    this.game = game;
    this.statDisplay = document.getElementById('moves-analyzed');
    this.maxDepth = document.getElementById('max-depth') as HTMLInputElement;
  }

  private static getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./ChessBotWorker.ts', import.meta.url), { type: 'module' });
    }
    return this.worker;
  }

  private static getSimpleWorker(): Worker {
    if (!this.simpleWorker) {
      this.simpleWorker = new Worker(new URL('./ChessBotSimpleWorker.ts', import.meta.url), { type: 'module' });
    }
    return this.simpleWorker;
  }

  async makeMove(simpleBot: boolean): Promise<Move | null> {
    return new Promise((resolve, reject) => {
      const worker = simpleBot ? ChessBot.getSimpleWorker() : ChessBot.getWorker();
      console.log(simpleBot)

      const handleMessage = (event: MessageEvent) => {
        if (typeof event.data.moves === 'number') {
          if (this.statDisplay) {
            this.statDisplay.innerText = event.data.moves.toString();
          }
          return;
        }
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

        if (this.statDisplay) this.statDisplay.style.opacity = '0';
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
        turn: this.game.turn(),
        depth: this.maxDepth?.value
      });

      if (this.statDisplay) {
        this.statDisplay.innerHTML = '0';
        this.statDisplay.style.opacity = '1'
      }
    });
  }
}
