import './style.css';
import { ChessGame } from './components/ChessGame';

document.addEventListener('DOMContentLoaded', () => {
  new ChessGame('chessBoard');
});