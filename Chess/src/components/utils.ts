import { PieceType, PieceName } from './types';
import { TILE_SIZE, BOARD_SIZE } from './config';

export function pieceTypeToName(type: PieceType): PieceName {
  const map: { [key in PieceType]: PieceName } = {
    'p': 'Pawn',
    'n': 'Knight',
    'b': 'Bishop',
    'r': 'Rook',
    'q': 'Queen',
    'k': 'King'
  };
  return map[type];
}

export function squareToCoords(square: string): [number, number] {
  const x = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const y = BOARD_SIZE - parseInt(square.charAt(1));
  return [x, y];
}

export function coordsToSquare(x: number, y: number): string {
  return `${String.fromCharCode('a'.charCodeAt(0) + x)}${BOARD_SIZE - y}`;
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function pixelToSquare(x: number, y: number): [number, number] {
  return [Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)];
}