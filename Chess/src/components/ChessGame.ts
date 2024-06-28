import { Chess } from 'chess.js';
import { PieceImages, Animation, ChessPiece } from './types';
import { TILE_SIZE, ANIMATION_DURATION, DOT_RADIUS, HIGHLIGHT_COLOR, DOT_COLOR } from './config';
import { pieceTypeToName, squareToCoords, coordsToSquare, easeInOutQuad, pixelToSquare } from './utils';
import { ChessBot } from './ChessBot';

export class ChessGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: Chess;
  private boardImage: HTMLImageElement;
  private pieces: PieceImages;
  private selectedSquare: string | null = null;
  private animations: Animation[] = [];
  private endGameAnimationFrame: number | null = null;
  private whiteBot: ChessBot | null = null;
  private blackBot: ChessBot | null = null;
  private whiteBotEnabled: boolean = false;
  private blackBotEnabled: boolean = false;
  private botAnimationsEnabled: boolean = true;
  private isGameOver: boolean = false;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.game = new Chess();
    this.boardImage = new Image();
    this.pieces = { b: {}, w: {} } as PieceImages;
    this.initializeImages();
    this.canvas.addEventListener('click', this.handleClick.bind(this));

    document.getElementById('white-bot-button')?.addEventListener('click', this.toggleWhiteBot.bind(this));
    document.getElementById('black-bot-button')?.addEventListener('click', this.toggleBlackBot.bind(this));
    document.getElementById('bot-animation-button')?.addEventListener('click', this.toggleBotAnimations.bind(this));
  }

  private initializeImages(): void {
    this.boardImage.src = '/assets/Board.png';
    this.boardImage.onload = this.imageLoadCallback.bind(this);

    const pieceTypes = ['Bishop', 'King', 'Knight', 'Pawn', 'Queen', 'Rook'];
    pieceTypes.forEach(piece => {
      this.pieces.b[piece] = new Image();
      this.pieces.w[piece] = new Image();
      this.pieces.b[piece].src = `/assets/pieces/black/${piece}.png`;
      this.pieces.w[piece].src = `/assets/pieces/white/${piece}.png`;
      this.pieces.b[piece].onload = this.imageLoadCallback.bind(this);
      this.pieces.w[piece].onload = this.imageLoadCallback.bind(this);
    });
  }

  private imageLoadCallback(): void {
    if (this.allImagesLoaded()) {
      this.draw();
      this.updateTurnIndicator();
    }
  }

  private allImagesLoaded(): boolean {
    if (!this.boardImage.complete) return false;
    for (const color of ['b', 'w']) {
      for (const piece in this.pieces[color]) {
        if (!this.pieces[color][piece].complete) return false;
      }
    }
    return true;
  }

  private draw(): void {
    this.drawBoard();
    this.drawPieces();
  }

  private drawBoard(): void {
    this.ctx.drawImage(this.boardImage, 0, 0, this.canvas.width, this.canvas.height);
  }

  private drawPieces(): void {
    const board = this.game.board();
    board.forEach((row, y) => {
      row.forEach((piece, x) => {
        if (piece) {
          const pieceImage = this.pieces[piece.color][pieceTypeToName(piece.type)];
          this.ctx.drawImage(pieceImage, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      });
    });
  }

  private highlightTile(x: number, y: number): void {
    this.ctx.fillStyle = HIGHLIGHT_COLOR;
    this.ctx.globalAlpha = 0.4;
    this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    this.ctx.globalAlpha = 1.0;
  }

  private highlightMoves(moves: string[]): void {
    moves.forEach(move => {
      const [x, y] = squareToCoords(move);
      this.drawDotOverlay(x, y);
    });
  }

  private drawDotOverlay(x: number, y: number): void {
    this.ctx.fillStyle = DOT_COLOR;
    this.ctx.beginPath();
    this.ctx.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, DOT_RADIUS, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  private updateTurnIndicator(): void {
    const turnIndicator = document.getElementById('turn-indicator');
    if (turnIndicator) {
      turnIndicator.textContent = `Turn: ${this.game.turn() === 'w' ? 'White' : 'Black'}`;
    }
  }

  private animatePieces(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBoard();

    const board = this.game.board();
    board.forEach((row, y) => {
      row.forEach((piece, x) => {
        if (piece && !this.animations.some(anim => anim.toX === x * TILE_SIZE && anim.toY === y * TILE_SIZE)) {
          const pieceImage = this.pieces[piece.color][pieceTypeToName(piece.type)];
          this.ctx.drawImage(pieceImage, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      });
    });

    this.animations.forEach((animation, index) => {
      const t = easeInOutQuad(animation.progress / animation.duration);
      const x = animation.fromX + (animation.toX - animation.fromX) * t;
      const y = animation.fromY + (animation.toY - animation.fromY) * t;

      this.ctx.drawImage(animation.piece, x, y, TILE_SIZE, TILE_SIZE);

      animation.progress++;
      if (animation.progress >= animation.duration) {
        this.animations.splice(index, 1);
      }
    });

    if (this.animations.length > 0) {
      requestAnimationFrame(this.animatePieces.bind(this));
    } else {
      this.drawPieces();
      this.checkEndgame();
      this.makeBotMove();
    }
  }

  private handleClick(event: MouseEvent): void {
    if (this.isGameOver) return; // Prevent interaction if game is over

    const rect = this.canvas.getBoundingClientRect();
    const [x, y] = pixelToSquare(event.clientX - rect.left, event.clientY - rect.top);
    const square = coordsToSquare(x, y);

    const piece = this.game.get(square) as ChessPiece | null;

    if (this.selectedSquare) {
      // Check if the selected square is a valid move
      const validMoves = this.game.moves({ square: this.selectedSquare, verbose: true }).map(m => m.to);
      if (validMoves.includes(square)) {
        const move = this.game.move({
          from: this.selectedSquare,
          to: square,
          promotion: 'q' // Always promote to queen for simplicity
        });

        if (move) {
          const [fromX, fromY] = squareToCoords(this.selectedSquare);
          const pieceImage = this.pieces[move.color][pieceTypeToName(move.piece)];

          if (this.botAnimationsEnabled) {
            this.animations.push({
              piece: pieceImage,
              fromX: fromX * TILE_SIZE,
              fromY: fromY * TILE_SIZE,
              toX: x * TILE_SIZE,
              toY: y * TILE_SIZE,
              progress: 0,
              duration: ANIMATION_DURATION
            });
          } else {
            this.animations.push({
              piece: pieceImage,
              fromX: fromX * TILE_SIZE,
              fromY: fromY * TILE_SIZE,
              toX: x * TILE_SIZE,
              toY: y * TILE_SIZE,
              progress: 0,
              duration: 0 // Set duration to 0 for instant move
            });
          }

          this.selectedSquare = null;
          if (this.botAnimationsEnabled) {
            requestAnimationFrame(this.animatePieces.bind(this));
          } else {
            requestAnimationFrame(this.animatePieces.bind(this)); // Ensure move is displayed correctly
          }
          this.updateTurnIndicator();
        }
      } else if (piece && piece.color === this.game.turn()) {
        // Reselect another piece of the same color
        this.selectedSquare = square;
        this.draw();
        this.highlightTile(x, y);
        const moves = this.game.moves({ square: this.selectedSquare, verbose: true });
        this.highlightMoves(moves.map(m => m.to));
      } else {
        // Invalid move, reselect
        this.selectedSquare = null;
        this.draw();
      }
    } else if (piece && piece.color === this.game.turn()) {
      this.selectedSquare = square;
      this.draw();
      this.highlightTile(x, y);
      const moves = this.game.moves({ square: this.selectedSquare, verbose: true });
      this.highlightMoves(moves.map(m => m.to));
    }
  }

  private checkEndgame(): void {
    if (this.game.isCheckmate()) {
      this.endGame(this.game.turn() === 'w' ? 'Black Wins!' : 'White Wins!');
    } else if (this.game.isStalemate() || this.game.isInsufficientMaterial() || this.game.isThreefoldRepetition() || this.game.isDraw()) {
      this.endGame('Draw!');
    }
  }

  private endGame(message: string): void {
    this.isGameOver = true;

    if (this.endGameAnimationFrame) {
      cancelAnimationFrame(this.endGameAnimationFrame);
    }

    const animateEndGame = (opacity: number) => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawBoard();
      this.drawPieces();

      this.ctx.fillStyle = 'rgba(0, 0, 0, ' + opacity + ')';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.font = '48px Arial';
      this.ctx.fillStyle = 'white';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);

      if (opacity < 0.8) {
        this.endGameAnimationFrame = requestAnimationFrame(() => animateEndGame(opacity + 0.02));
      }
    };

    animateEndGame(0);
  }

  private toggleWhiteBot(): void {
    this.whiteBotEnabled = !this.whiteBotEnabled;
    if (this.whiteBotEnabled) {
      this.whiteBot = new ChessBot(this.game);
      document.getElementById('white-bot-button')!.textContent = 'White Bot: ON';
      if (this.game.turn() === 'w') this.makeBotMove();
    } else {
      this.whiteBot = null;
      document.getElementById('white-bot-button')!.textContent = 'White Bot: OFF';
    }
  }

  private toggleBlackBot(): void {
    this.blackBotEnabled = !this.blackBotEnabled;
    if (this.blackBotEnabled) {
      this.blackBot = new ChessBot(this.game);
      document.getElementById('black-bot-button')!.textContent = 'Black Bot: ON';
      if (this.game.turn() === 'b') this.makeBotMove();
    } else {
      this.blackBot = null;
      document.getElementById('black-bot-button')!.textContent = 'Black Bot: OFF';
    }
  }

  private toggleBotAnimations(): void {
    this.botAnimationsEnabled = !this.botAnimationsEnabled;
    const button = document.getElementById('bot-animation-button');
    if (button) {
      button.textContent = `Bot Animations: ${this.botAnimationsEnabled ? 'ON' : 'OFF'}`;
    }
  }

  private makeBotMove(): void {
    if (this.isGameOver) return; // Prevent further moves if the game is over
  
    if ((this.whiteBotEnabled && this.game.turn() === 'w' && this.whiteBot) ||
        (this.blackBotEnabled && this.game.turn() === 'b' && this.blackBot)) {
      const bot = this.game.turn() === 'w' ? this.whiteBot : this.blackBot;
      const move = bot!.makeMove();
      if (move) {
        console.log('Applying move:', move);
        console.log('Game state before move:', this.game.fen());
  
        // Apply the move to the game state
        const result = this.game.move(move.san);
        if (!result) {
          console.error('Invalid move:', move.san);
          return;
        }
  
        console.log('Game state after move:', this.game.fen());
  
        const fromSquare = move.from;
        const toSquare = move.to;
        const [fromX, fromY] = squareToCoords(fromSquare);
        const [toX, toY] = squareToCoords(toSquare);
        const piece = this.pieces[move.color][pieceTypeToName(move.piece)];
  
        if (this.botAnimationsEnabled) {
          this.animations.push({
            piece: piece,
            fromX: fromX * TILE_SIZE,
            fromY: fromY * TILE_SIZE,
            toX: toX * TILE_SIZE,
            toY: toY * TILE_SIZE,
            progress: 0,
            duration: ANIMATION_DURATION
          });
          requestAnimationFrame(this.animatePieces.bind(this));
        } else {
          this.animations.push({
            piece: piece,
            fromX: fromX * TILE_SIZE,
            fromY: fromY * TILE_SIZE,
            toX: toX * TILE_SIZE,
            toY: toY * TILE_SIZE,
            progress: 0,
            duration: 0 // Set duration to 0 for instant move
          });
          requestAnimationFrame(this.animatePieces.bind(this)); // Ensure move is displayed correctly
        }
        this.updateTurnIndicator();
      }
    }
  }
}
