import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XIcon, CircleIcon } from 'lucide-react';
import { makeMove } from './botLogic';

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [botEnabled, setBotEnabled] = useState(false);

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handleClick = (i) => {
    if (calculateWinner(board) || board[i]) return;
    const newBoard = board.slice();
    newBoard[i] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);
  };

  useEffect(() => {
    if (botEnabled && !xIsNext && !calculateWinner(board)) {
      const timer = setTimeout(() => {
        const botMove = makeMove(board);
        if (botMove !== null) {
          handleClick(botMove);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [board, xIsNext, botEnabled]);

  const renderSquare = (i) => (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.01, ease: "easeOut" }}
      className="flex items-center justify-center rounded-xl btn btn__square"
      >
      <button
        className="inline-flex items-center justify-center w-full h-full text-sm font-medium transition-colors rounded-md whitespace-nowrap"
        onClick={() => handleClick(i)}
      >
        {board[i] === 'X' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 15 }}
          >
            <XIcon className="w-12 h-12 text-blue-600" />
          </motion.div>
        )}
        {board[i] === 'O' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 15 }}
          >
            <CircleIcon className="w-12 h-12 text-red-600" />
          </motion.div>
        )}
      </button>
    </motion.div>
  );

  const winner = calculateWinner(board);
  let status;
  if (winner) {
    status = `Winner: ${winner}`;
  } else if (board.every(square => square)) {
    status = 'Draw!';
  } else {
    status = `Next player: ${xIsNext ? 'X' : 'O'}`;
  }

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  };

  const toggleBot = () => {
    setBotEnabled(!botEnabled);
    if (!botEnabled && !xIsNext) {
      setXIsNext(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neumorphic">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 20 }}
        className="flex flex-col justify-center p-8 components rounded-2xl place-items-center"
      >
        <h1 className="mb-6 text-4xl font-bold text-center text-gray-700">Tic Tac Toe</h1>
        <div className="mb-4 text-2xl font-bold text-center text-gray-600">{status}</div>
        <div className="grid grid-cols-3 gap-4 mb-6 w-fit">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => renderSquare(i))}
        </div>
        <div className="flex justify-between gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 15 }}
          >
            <button onClick={resetGame} className="h-[3rem] rounded-2xl w-[11.25rem] btn btn__primary">
              Reset Game
            </button>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 15 }}
          >
            <button onClick={toggleBot} className={`btn btn__secondary rounded-2xl h-[3rem] w-[11.25rem]`}>
              {botEnabled ? 'Disable Bot' : 'Enable Bot'}
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default TicTacToe;