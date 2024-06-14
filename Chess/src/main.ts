import './style.css';

// Constants
const canvas = document.getElementById('chessBoard') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const tileSize = 64; // Assuming each tile is 64x64 pixels

// Load images
const boardImage = new Image();
boardImage.src = '/assets/Board.png';

const pieces = {
  black: {
    Bishop: new Image(),
    King: new Image(),
    Knight: new Image(),
    Pawn: new Image(),
    Queen: new Image(),
    Rook: new Image(),
  },
  white: {
    Bishop: new Image(),
    King: new Image(),
    Knight: new Image(),
    Pawn: new Image(),
    Queen: new Image(),
    Rook: new Image(),
  },
};

Object.keys(pieces.black).forEach(piece => {
  pieces.black[piece].src = `/assets/pieces/black/${piece}.png`;
  pieces.white[piece].src = `/assets/pieces/white/${piece}.png`;
});

let imagesLoaded = 0;
function imageLoadCallback() {
  imagesLoaded += 1;
  if (imagesLoaded === 13) {
    drawBoard();
    placePieces();
    updateTurnIndicator();
  }
}

boardImage.onload = imageLoadCallback;
Object.values(pieces.black).forEach(img => img.onload = imageLoadCallback);
Object.values(pieces.white).forEach(img => img.onload = imageLoadCallback);

function drawBoard() {
  ctx.drawImage(boardImage, 0, 0, canvas.width, canvas.height);
}

const initialBoardSetup: [string, string][] = [
  ['Rook', 'white'], ['Knight', 'white'], ['Bishop', 'white'], ['Queen', 'white'],
  ['King', 'white'], ['Bishop', 'white'], ['Knight', 'white'], ['Rook', 'white'],
  ...Array(8).fill(['Pawn', 'white']),
  ...Array(32).fill([null, null]),
  ...Array(8).fill(['Pawn', 'black']),
  ['Rook', 'black'], ['Knight', 'black'], ['Bishop', 'black'], ['Queen', 'black'],
  ['King', 'black'], ['Bishop', 'black'], ['Knight', 'black'], ['Rook', 'black'],
];

function placePieces() {
  initialBoardSetup.forEach((piece, index) => {
    if (piece[0]) {
      const [name, color] = piece;
      const x = (index % 8) * tileSize;
      const y = Math.floor(index / 8) * tileSize;
      ctx.drawImage(pieces[color][name], x, y, tileSize, tileSize);
    }
  });
}

function highlightTile(x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
}

function highlightMoves(moves: { x: number, y: number }[]) {
  ctx.fillStyle = '#9A90EB';
  moves.forEach(move => {
    const centerX = move.x * tileSize + tileSize / 2;
    const centerY = move.y * tileSize + tileSize / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, tileSize / 8, 0, 2 * Math.PI);
    ctx.fill();
  });
}

// Piece selection and turns
let selectedPiece: { piece: string, color: string, x: number, y: number } | null = null;
let turn: 'white' | 'black' = 'white';

function updateTurnIndicator() {
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) {
    turnIndicator.textContent = `Turn: ${turn}`;
  }
}

// Animation setup
interface Animation {
  piece: HTMLImageElement;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  duration: number;
}

let animations: Animation[] = [];

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function animatePieces() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
  drawBoard();

  initialBoardSetup.forEach((piece, index) => {
    if (piece[0] && !animations.some(anim => anim.toX === (index % 8) * tileSize && anim.toY === Math.floor(index / 8) * tileSize)) {
      const [name, color] = piece;
      const x = (index % 8) * tileSize;
      const y = Math.floor(index / 8) * tileSize;
      ctx.drawImage(pieces[color][name], x, y, tileSize, tileSize);
    }
  });

  animations.forEach((animation, index) => {
    const t = easeInOutQuad(animation.progress / animation.duration);
    const x = animation.fromX + (animation.toX - animation.fromX) * t;
    const y = animation.fromY + (animation.toY - animation.fromY) * t;

    ctx.drawImage(animation.piece, x, y, tileSize, tileSize);

    animation.progress++;
    if (animation.progress >= animation.duration) {
      animations.splice(index, 1); // Remove the animation when it's done
    }
  });
  
  if (animations.length > 0) {
    requestAnimationFrame(animatePieces);
  } else {
    placePieces(); // Ensure pieces are correctly placed after animation
  }
}

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const col = Math.floor(x / tileSize);
  const row = Math.floor(y / tileSize);
  const pieceIndex = row * 8 + col;

  const [piece, color] = initialBoardSetup[pieceIndex];

  if (piece && color === turn) {
    selectedPiece = { piece, color, x: col, y: row };
    console.log(`Selected: ${piece} at (${col}, ${row})`);
    drawBoard();
    highlightTile(col, row, '#B1A7FC');
    placePieces();
    const moves = getValidMoves(selectedPiece);
    highlightMoves(moves);
  } else {
    if (selectedPiece) {
      const targetIndex = row * 8 + col;
      const validMoves = getValidMoves(selectedPiece).some(move => move.x === col && move.y === row);
      if (validMoves) {
        const fromX = selectedPiece.x * tileSize;
        const fromY = selectedPiece.y * tileSize;
        const toX = col * tileSize;
        const toY = row * tileSize;
        const pieceImage = pieces[selectedPiece.color][selectedPiece.piece];

        animations.push({
          piece: pieceImage,
          fromX,
          fromY,
          toX,
          toY,
          progress: 0,
          duration: 20 // Adjust duration for animation speed
        });

        initialBoardSetup[targetIndex] = [selectedPiece.piece, selectedPiece.color];
        initialBoardSetup[selectedPiece.y * 8 + selectedPiece.x] = [null, null];
        selectedPiece = null;
        turn = turn === 'white' ? 'black' : 'white';
        updateTurnIndicator();

        requestAnimationFrame(animatePieces); // Start animation
      }
    }
  }
});

function getValidMoves(piece: { piece: string, color: string, x: number, y: number }) {
  const moves: { x: number, y: number }[] = [];

  switch (piece.piece) {
    case 'Pawn':
      // Correct the direction for each color
      const direction = piece.color === 'white' ? 1 : -1; // White moves down, black moves up
      const startRow = piece.color === 'white' ? 1 : 6;

      // Move forward
      if (initialBoardSetup[(piece.y + direction) * 8 + piece.x][0] === null) {
        moves.push({ x: piece.x, y: piece.y + direction });
        if (piece.y === startRow && initialBoardSetup[(piece.y + 2 * direction) * 8 + piece.x][0] === null) {
          moves.push({ x: piece.x, y: piece.y + 2 * direction });
        }
      }

      // Capture diagonally
      const captureMoves = [
        { x: piece.x - 1, y: piece.y + direction },
        { x: piece.x + 1, y: piece.y + direction }
      ];

      captureMoves.forEach(move => {
        if (move.x >= 0 && move.x < 8 && move.y >= 0 && move.y < 8) {
          const targetPiece = initialBoardSetup[move.y * 8 + move.x];
          if (targetPiece[0] !== null && targetPiece[1] !== piece.color) {
            moves.push(move);
          }
        }
      });

      break;

    // Other cases for Rook, Knight, Bishop, Queen, and King
    case 'Rook':
      for (let i = piece.y - 1; i >= 0; i--) {
        const targetPiece = initialBoardSetup[i * 8 + piece.x];
        if (targetPiece[0] === null) moves.push({ x: piece.x, y: i });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: piece.x, y: i });
          break;
        }
      }
      for (let i = piece.y + 1; i < 8; i++) {
        const targetPiece = initialBoardSetup[i * 8 + piece.x];
        if (targetPiece[0] === null) moves.push({ x: piece.x, y: i });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: piece.x, y: i });
          break;
        }
      }
      for (let i = piece.x - 1; i >= 0; i--) {
        const targetPiece = initialBoardSetup[piece.y * 8 + i];
        if (targetPiece[0] === null) moves.push({ x: i, y: piece.y });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: i, y: piece.y });
          break;
        }
      }
      for (let i = piece.x + 1; i < 8; i++) {
        const targetPiece = initialBoardSetup[piece.y * 8 + i];
        if (targetPiece[0] === null) moves.push({ x: i, y: piece.y });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: i, y: piece.y });
          break;
        }
      }
      break;

    case 'Knight':
      const knightMoves = [
        { x: piece.x - 1, y: piece.y - 2 }, { x: piece.x + 1, y: piece.y - 2 },
        { x: piece.x - 2, y: piece.y - 1 }, { x: piece.x + 2, y: piece.y - 1 },
        { x: piece.x - 2, y: piece.y + 1 }, { x: piece.x + 2, y: piece.y + 1 },
        { x: piece.x - 1, y: piece.y + 2 }, { x: piece.x + 1, y: piece.y + 2 }
      ];
      knightMoves.forEach(move => {
        if (move.x >= 0 && move.x < 8 && move.y >= 0 && move.y < 8) {
          const targetPiece = initialBoardSetup[move.y * 8 + move.x];
          if (targetPiece[0] === null || targetPiece[1] !== piece.color) {
            moves.push(move);
          }
        }
      });
      break;

    case 'Bishop':
      for (let i = 1; piece.x + i < 8 && piece.y + i < 8; i++) {
        const targetPiece = initialBoardSetup[(piece.y + i) * 8 + (piece.x + i)];
        if (targetPiece[0] === null) moves.push({ x: piece.x + i, y: piece.y + i });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: piece.x + i, y: piece.y + i });
          break;
        }
      }
      for (let i = 1; piece.x - i >= 0 && piece.y + i < 8; i++) {
        const targetPiece = initialBoardSetup[(piece.y + i) * 8 + (piece.x - i)];
        if (targetPiece[0] === null) moves.push({ x: piece.x - i, y: piece.y + i });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: piece.x - i, y: piece.y + i });
          break;
        }
      }
      for (let i = 1; piece.x + i < 8 && piece.y - i >= 0; i++) {
        const targetPiece = initialBoardSetup[(piece.y - i) * 8 + (piece.x + i)];
        if (targetPiece[0] === null) moves.push({ x: piece.x + i, y: piece.y - i });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: piece.x + i, y: piece.y - i });
          break;
        }
      }
      for (let i = 1; piece.x - i >= 0 && piece.y - i >= 0; i++) {
        const targetPiece = initialBoardSetup[(piece.y - i) * 8 + (piece.x - i)];
        if (targetPiece[0] === null) moves.push({ x: piece.x - i, y: piece.y - i });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: piece.x - i, y: piece.y - i });
          break;
        }
      }
      break;

    case 'Queen':
      // Rook moves
      for (let i = piece.y - 1; i >= 0; i--) {
        const targetPiece = initialBoardSetup[i * 8 + piece.x];
        if (targetPiece[0] === null) moves.push({ x: piece.x, y: i });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: piece.x, y: i });
          break;
        }
      }
      for (let i = piece.y + 1; i < 8; i++) {
        const targetPiece = initialBoardSetup[i * 8 + piece.x];
        if (targetPiece[0] === null) moves.push({ x: piece.x, y: i });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: piece.x, y: i });
          break;
        }
      }
      for (let i = piece.x - 1; i >= 0; i--) {
        const targetPiece = initialBoardSetup[piece.y * 8 + i];
        if (targetPiece[0] === null) moves.push({ x: i, y: piece.y });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: i, y: piece.y });
          break;
        }
      }
      for (let i = piece.x + 1; i < 8; i++) {
        const targetPiece = initialBoardSetup[piece.y * 8 + i];
        if (targetPiece[0] === null) moves.push({ x: i, y: piece.y });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: i, y: piece.y });
          break;
        }
      }
      // Bishop moves
      for (let i = 1; piece.x + i < 8 && piece.y + i < 8; i++) {
        const targetPiece = initialBoardSetup[(piece.y + i) * 8 + (piece.x + i)];
        if (targetPiece[0] === null) moves.push({ x: piece.x + i, y: piece.y + i });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: piece.x + i, y: piece.y + i });
          break;
        }
      }
      for (let i = 1; piece.x - i >= 0 && piece.y + i < 8; i++) {
        const targetPiece = initialBoardSetup[(piece.y + i) * 8 + (piece.x - i)];
        if (targetPiece[0] === null) moves.push({ x: piece.x - i, y: piece.y + i });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: piece.x - i, y: piece.y + i });
          break;
        }
      }
      for (let i = 1; piece.x + i < 8 && piece.y - i >= 0; i++) {
        const targetPiece = initialBoardSetup[(piece.y - i) * 8 + (piece.x + i)];
        if (targetPiece[0] === null) moves.push({ x: piece.x + i, y: piece.y - i });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: piece.x + i, y: piece.y - i });
          break;
        }
      }
      for (let i = 1; piece.x - i >= 0 && piece.y - i >= 0; i++) {
        const targetPiece = initialBoardSetup[(piece.y - i) * 8 + (piece.x - i)];
        if (targetPiece[0] === null) moves.push({ x: piece.x - i, y: piece.y - i });
        else {
          if (targetPiece[1] !== piece.color) moves.push({ x: piece.x - i, y: piece.y - i });
          break;
        }
      }
      break;

    case 'King':
      const kingMoves = [
        { x: piece.x, y: piece.y - 1 }, { x: piece.x + 1, y: piece.y - 1 },
        { x: piece.x + 1, y: piece.y }, { x: piece.x + 1, y: piece.y + 1 },
        { x: piece.x, y: piece.y + 1 }, { x: piece.x - 1, y: piece.y + 1 },
        { x: piece.x - 1, y: piece.y }, { x: piece.x - 1, y: piece.y - 1 },
      ];
      kingMoves.forEach(move => {
        if (move.x >= 0 && move.x < 8 && move.y >= 0 && move.y < 8) {
          const targetPiece = initialBoardSetup[move.y * 8 + move.x];
          if (targetPiece[0] === null || targetPiece[1] !== piece.color) {
            moves.push(move);
          }
        }
      });
      break;
  }

  return moves;
}
