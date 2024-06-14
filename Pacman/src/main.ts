import './style.css'
import spritesheet from './assets/spritesheet.png'

const canvas = document.getElementById('game') as HTMLCanvasElement;
const context = canvas.getContext('2d');

if (!context) {
  throw new Error('No context found');
}

const FRAME_WIDTH = 8;
const FRAME_HEIGHT = 8;
const FRAME_COUNT = 2;
const ANIMATION_SPEED = 200;
const MOVEMENT_SPEED = 2;

let currentFrame = 0;
let lastFrameTime = 0;
let pacmanX = canvas.width / 2;
let pacmanY = canvas.height / 2;
let direction = 'right';

const directions = {
  right: 0,
  down: 1,
  left: 2,
  up: 3
};

function drawFrame(context: CanvasRenderingContext2D, frameX: number, frameY: number, image: HTMLImageElement) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    frameX * FRAME_WIDTH, frameY * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT, // Source rectangle
    Math.floor(pacmanX), Math.floor(pacmanY), FRAME_WIDTH * 4, FRAME_HEIGHT * 4 // Destination rectangle, scaled up 4x
  );
}

function updatePosition() {
  switch (direction) {
    case 'right':
      pacmanX += MOVEMENT_SPEED;
      break;
    case 'down':
      pacmanY += MOVEMENT_SPEED;
      break;
    case 'left':
      pacmanX -= MOVEMENT_SPEED;
      break;
    case 'up':
      pacmanY -= MOVEMENT_SPEED;
      break;
  }

  // Wrap around the canvas
  if (pacmanX > canvas.width) pacmanX = -FRAME_WIDTH * 4;
  if (pacmanX < -FRAME_WIDTH * 4) pacmanX = canvas.width;
  if (pacmanY > canvas.height) pacmanY = -FRAME_HEIGHT * 4;
  if (pacmanY < -FRAME_HEIGHT * 4) pacmanY = canvas.height;
}

function updateFrame(timestamp: number) {
  if (timestamp - lastFrameTime > ANIMATION_SPEED) {
    currentFrame = (currentFrame + 1) % FRAME_COUNT;
    lastFrameTime = timestamp;
  }
}

function animate(timestamp: number, context: CanvasRenderingContext2D, image: HTMLImageElement) {
  updateFrame(timestamp);
  updatePosition();
  drawFrame(context, currentFrame, directions[direction], image);
  requestAnimationFrame((newTimestamp) => animate(newTimestamp, context, image));
}

function startAnimation() {
  if (!context) {
    throw new Error('No context found');
  }

  const image = new Image();
  image.src = spritesheet;
  image.onload = () => {
    context.imageSmoothingEnabled = false;
    requestAnimationFrame((timestamp) => animate(timestamp, context, image));
  };
}

function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowRight':
      direction = 'right';
      break;
    case 'ArrowDown':
      direction = 'down';
      break;
    case 'ArrowLeft':
      direction = 'left';
      break;
    case 'ArrowUp':
      direction = 'up';
      break;
  }
}

window.addEventListener('keydown', handleKeydown);

startAnimation();
