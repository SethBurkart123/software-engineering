export type PieceColor = 'b' | 'w';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceName = 'Pawn' | 'Knight' | 'Bishop' | 'Rook' | 'Queen' | 'King';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

export interface PieceImages {
  [key: string]: {
    [key in PieceName]: HTMLImageElement;
  };
}

export interface Animation {
  piece: HTMLImageElement;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  duration: number;
}