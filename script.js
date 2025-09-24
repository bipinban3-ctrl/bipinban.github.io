const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const highScoreEl = document.getElementById("highScore");
const playPauseBtn = document.getElementById("playPauseBtn");
const restartBtn = document.getElementById("restartBtn");
const muteBtn = document.getElementById("muteBtn");
const helpBtn = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const closeHelp = document.getElementById("closeHelp");
const swipeFeedback = document.getElementById("swipeFeedback");
const errorMsg = document.getElementById("errorMsg");

const box = 20;
let snake, direction, food, score, game, gameOver, level, speed, pointValue;
let highScore = localStorage.getItem("snakeHighScore") || 0;
let touchCooldown = false;
let isMuted = false;
highScoreEl.textContent = highScore;

// Audio with fallback handling
const audioFiles = {
  eatSound: 'https://www.soundbible.com/mp3/Eating-SoundBible.com-1475382882.mp3',
  gameOverSound: 'https://www.soundbible.com/mp3/Sad_Trombone-Joe_Lamb-665429450.mp3',
  moveSound: 'https://www.soundbible.com/mp3/Click2-Sebastiaan-569531976.mp3',
  winSound: 'https://www.soundbible.com/mp3/Ta_Da-SoundBible.com-1884170640.mp3',
  bgMusic: 'https://www.soundbible.com/mp3/Arcade_Music_Loop-Media_Right_Productions-1112457633.mp3'
};
const sounds = {};
let audioLoaded = {};

function loadAudio(key, url) {
  try {
    sounds[key] = new Audio();
    sounds[key].src = url;
    audioLoaded[key] = false;
    sounds[key].oncanplaythrough = () => {
      audioLoaded[key] = true;
      console.log(`Audio loaded: ${key}`);
    };
    sounds[key].onerror = () => {
      audioLoaded[key] = false;
      console.error(`Failed to load audio: ${url}`);
      showError(`Audio failed to load: ${key}`);
    };
  } catch (e) {
    console.error(`Error initializing audio ${key}:`, e);
    showError(`Audio setup failed: ${key}`);
  }
}

function playSound(key) {
  if (!isMuted && audioLoaded[key]) {
    try {
      sounds[key].currentTime = 0;
      sounds[key].play().catch(e => console.error(`Error playing ${key}:`, e));
    } catch (e) {
      console.error(`Error in playSound ${key}:`, e);
    }
  }
}

function updateVolume(value) {
  Object.values(sounds).forEach(sound => sound.volume = value);
  sounds.moveSound.volume = value * 0.3;
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.style.display = "block";
  setTimeout(() => errorMsg.style.display = "none", 5000);
}

Object.entries(audioFiles).forEach(([key, url]) => loadAudio(key, url));
sounds.bgMusic.loop = true;
updateVolume(0.7);

function resizeCanvas() {
  try {
    const size = Math.min(window.innerWidth * 0.9, 400);
    canvas.width = Math.floor(size / box) * box;
    canvas.height = canvas.width;
    console.log(`Canvas resized: ${canvas.width}x${canvas.height}`);
  } catch (e) {
    console.error("Canvas resize error:", e);
    showError("Failed to resize canvas");
  }
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function initGame() {
  try {
    snake = [{ x: 9 * box, y: 10 * box }];
    direction = null;
    food = randomFood();
    score = 0;
    gameOver = false;
    level = parseInt(levelSelect.value);
    speed = 150 - (level - 1) * 40;
    pointValue = level;
    scoreEl.textContent = score;
    levelEl.textContent = level;
    restartBtn.style.display = "none";
    touchCooldown = false;
    console.log("Game initialized");
  } catch (e) {
    console.error("Init game error:", e);
    showError("Failed to initialize game");
  }
}

function randomFood() {
  let newFood, overlap;
  do {
    overlap = false;
    newFood = {
      x: Math.floor(Math.random() * (canvas.width / box)) * box,
      y: Math.floor(Math.random() * (canvas.height / box)) * box
    };
    for (let part of snake) {
      if (part.x === newFood.x && part.y === newFood.y) {
        overlap = true;
        break;
      }
    }
  } while (overlap);
  return newFood;
}

document.addEventListener("keydown", setDirection);
function setDirection(event) {
  let newDirection;
  if (event.key === "ArrowLeft" && direction !== "RIGHT") newDirection = "LEFT";
  else if (event.key === "ArrowUp" && direction !== "DOWN") newDirection = "UP";
  else if (event.key === "ArrowRight" && direction !== "LEFT") newDirection = "RIGHT";
  else if (event.key === "ArrowDown" && direction !== "UP") newDirection = "DOWN";
  if (newDirection) {
    direction = newDirection;
    showSwipeFeedback(newDirection === "LEFT" ? "↺" : newDirection === "RIGHT" ? "↻" : newDirection);
    console.log(`Direction set: ${newDirection}`);
  }
}

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartTime = Date.now();
  console.log("Touch start:", touchStartX, touchStartY);
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (touchCooldown || gameOver || !game) return;
  let touchEndX = e.changedTouches[0].clientX;
  let touchEndY = e.changedTouches[0].clientY;
  let deltaX = touchEndX - touchStartX;
  let deltaY = touchEndY - touchStartY;
  let touchDuration = Date.now() - touchStartTime;

  if (touchDuration > 500 || (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15)) return;

  let newDirection;
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (deltaX > 0) {
      if (direction === "UP") newDirection = "RIGHT";
      else if (direction === "RIGHT") newDirection = "DOWN";
      else if (direction === "DOWN") newDirection = "LEFT";
      else if (direction === "LEFT") newDirection = "UP";
      else newDirection = "RIGHT";
      showSwipeFeedback("↻");
    } else {
      if (direction === "UP") newDirection = "LEFT";
      else if (direction === "RIGHT") newDirection = "UP";
      else if (direction === "DOWN") newDirection = "RIGHT";
      else if (direction === "LEFT") newDirection = "DOWN";
      else newDirection = "LEFT";
      showSwipeFeedback("↺");
    }
  }
  if (newDirection) {
    direction = newDirection;
    touchCooldown = true;
    setTimeout(() => touchCooldown = false, speed);
    if (navigator.vibrate) navigator.vibrate(50);
    console.log("Swipe direction:", newDirection);
  }
}, { passive: false });

function showSwipeFeedback(symbol) {
  swipeFeedback.textContent = symbol;
  swipeFeedback.style.opacity = '0.7';
  setTimeout(() => swipeFeedback.style.opacity = '0', 300);
}

function drawSnakePart(part, i) {
  try {
    if (i === 0) {
      ctx.fillStyle = "#00ff7f";
      ctx.beginPath();
      ctx.roundRect(part.x, part.y, box, box, 6);
      ctx.fill();
      ctx.strokeStyle = "#006400";
      ctx.lineWidth = 2;
      ctx.strokeRect(part.x, part.y, box, box);
      ctx.fillStyle = "#000";
      if (direction === "LEFT" || direction === "RIGHT") {
        ctx.beginPath();
        ctx.arc(part.x + (direction === "LEFT" ? 6 : 14), part.y + 6, 2, 0, 2 * Math.PI);
        ctx.arc(part.x + (direction === "LEFT" ? 6 : 14), part.y + 14, 2, 0, 2 * Math.PI);
        ctx.fill();
      } else if (direction) {
        ctx.beginPath();
        ctx.arc(part.x + 6, part.y + (direction === "UP" ? 6 : 14), 2, 0, 2 * Math.PI);
        ctx.arc(part.x + 14, part.y + (direction === "UP" ? 6 : 14), 2, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = "red";
      if (direction === "LEFT") ctx.fillRect(part.x - 4, part.y + 8, 4, 4);
      if (direction === "RIGHT") ctx.fillRect(part.x + box, part.y + 8, 4, 4);
      if (direction === "UP") ctx.fillRect(part.x + 8, part.y - 4, 4, 4);
      if (direction === "DOWN") ctx.fillRect(part.x + 8, part.y + box, 4, 4);
    } else if (i === snake.length - 1) {
      ctx.fillStyle = "#7fff00";
      ctx.beginPath();
      const prev = snake[i - 1];
      const tail = snake[i];
      if (prev.x < tail.x) {
        ctx.moveTo(tail.x + box, tail.y + box / 2);
        ctx.lineTo(tail.x, tail.y);
        ctx.lineTo(tail.x, tail.y + box);
      } else if (prev.x > tail.x) {
        ctx.moveTo(tail.x, tail.y + box / 2);
        ctx.lineTo(tail.x + box, tail.y);
        ctx.lineTo(tail.x + box, tail.y + box);
      } else if (prev.y < tail.y) {
        ctx.moveTo(tail.x + box / 2, tail.y + box);
        ctx.lineTo(tail.x, tail.y);
        ctx.lineTo(tail.x + box, tail.y);
      } else if (prev.y > tail.y) {
        ctx.moveTo(tail.x + box / 2, tail.y);
        ctx.lineTo(tail.x, tail.y + box);
        ctx.lineTo(tail.x + box, tail.y + box);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#7fff00";
      ctx.beginPath();
      ctx.roundRect(part.x, part.y, box, box, 6);
      ctx.fill();
      ctx.strokeStyle = "#006400";
      ctx.lineWidth = 2;
      ctx.strokeRect(part.x, part.y, box, box);
    }
  } catch (e) {
    console.error("Draw snake part error:", e);
    showError("Failed to draw snake");
  }
}

function drawFood() {
  try {
    const gradient = ctx.createRadialGradient(
      food.x + box / 2 - 5, food.y + box / 2 - 5, 2,
      food.x + box / 2, food.y + box / 2, box / 2
    );
    gradient.addColorStop(0, "#ff6666");
    gradient.addColorStop(1, "#cc0000");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(food.x + box / 2, food.y + box / 2, box / 2 - 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "brown";
    ctx.fillRect(food.x + box / 2 - 2, food.y - 4, 4, 6);
    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.moveTo(food.x + box / 2, food.y);
    ctx.lineTo(food.x + box / 2 + 6, food.y - 6);
    ctx.lineTo(food.x + box / 2, food.y - 12);
    ctx.closePath();
    ctx.fill();
  } catch (e) {
    console.error("Draw food error:", e);
    showError("Failed to draw food");
  }
}

function drawGame() {
  try {
    if (!ctx) {
      showError("Canvas context not available");
      return;
    }
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    snake.forEach((part, i) => drawSnakePart(part, i));
    drawFood();

    if (!direction) return;

    let snakeX = snake[0].x;
    let snakeY = snake[0].y;
    if (direction === "LEFT") snakeX -= box;
    if (direction === "UP") snakeY -= box;
    if (direction === "RIGHT") snakeX += box;
    if (direction === "DOWN") snakeY += box;

    if (snakeX === food.x && snakeY === food.y) {
      score += pointValue;
      food = randomFood();
      playSound("eatSound");
      if (navigator.vibrate) navigator.vibrate(100);
    } else {
      snake.pop();
    }

    let newHead = { x: snakeX, y: snakeY };
    if (snakeX < 0 || snakeY < 0 || snakeX >= canvas.width || snakeY >= canvas.height || collision(newHead, snake)) {
      clearInterval(game);
      game = null;
      gameOver = true;
      playPauseBtn.textContent = "Play";
      restartBtn.style.display = "inline-block";
      if (!isMuted) {
        sounds.bgMusic.pause();
        playSound("gameOverSound");
      }
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("snakeHighScore", highScore);
        highScoreEl.textContent = highScore;
      }
      alert("Game Over! Score: " + score + "\nTap Restart to play again!");
      console.log("Game over");
      return;
    }
    snake.unshift(newHead);
    scoreEl.textContent = score;
    playSound("moveSound");
    console.log(`Snake moved: ${snakeX}, ${snakeY}, Score: ${score}`);

    if (score >= 100) {
      clearInterval(game);
      game = null;
      gameOver = true;
      if (!isMuted) {
        sounds.bgMusic.pause();
        playSound("winSound");
      }
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("snakeHighScore", highScore);
        highScoreEl.textContent = highScore;
      }
      alert("🎉 You Win! Score: " + score + "\nTap Restart to play again!");
      restartBtn.style.display = "inline-block";
      console.log("Win condition met");
    }
  } catch (e) {
    console.error("Draw game error:", e);
    showError("Game loop failed");
    clearInterval(game);
    game = null;
    playPauseBtn.textContent = "Play";
  }
}

function drawBackground() {
  try {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    const t = (performance.now() % 5000) / 5000;
    gradient.addColorStop(0, `hsl(120, 50%, ${20 + t * 10}%)`);
    gradient.addColorStop(1, `hsl(120, 50%, ${30 - t * 10}%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < canvas.width / box; i++) {
      for (let j = 0; j < canvas.height / box; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? 'rgba(0, 100, 0, 0.5)' : 'rgba(34, 139, 34, 0.5)';
        ctx.fillRect(i * box, j * box, box, box);
      }
    }
  } catch (e) {
    console.error("Draw background error:", e);
    showError("Failed to draw background");
  }
}

function collision(head, array) {
  return array.some(part => head.x === part.x && part.y === head.y);
}

playPauseBtn.addEventListener("click", () => {
  try {
    if (gameOver) return;
    if (game) {
      clearInterval(game);
      game = null;
      playPauseBtn.textContent = "Play";
      if (!isMuted) sounds.bgMusic.pause();
      console.log("Game paused");
    } else {
      game = setInterval(drawGame, speed);
      playPauseBtn.textContent = "Pause";
      if (!isMuted) playSound("bgMusic");
      console.log("Game started");
    }
  } catch (e) {
    console.error("Play/pause error:", e);
    showError("Failed to start/pause game");
  }
});

restartBtn.addEventListener("click", () => {
  try {
    initGame();
    game = setInterval(drawGame, speed);
    playPauseBtn.textContent = "Pause";
    if (!isMuted) playSound("bgMusic");
    console.log("Game restarted");
  } catch (e) {
    console.error("Restart error:", e);
    showError("Failed to restart game");
  }
});

muteBtn.addEventListener("click", () => {
  isMuted = !isMuted;
  muteBtn.textContent = isMuted ? "Unmute" : "Mute";
  muteBtn.classList.toggle("muted", isMuted);
  if (isMuted) sounds.bgMusic.pause();
  else if (game) playSound("bgMusic");
  console.log("Mute toggled:", isMuted);
});

helpBtn.addEventListener("click", () => {
  if (game) {
    clearInterval(game);
    game = null;
    playPauseBtn.textContent = "Play";
    if (!isMuted) sounds.bgMusic.pause();
  }
  helpModal.style.display = "flex";
  console.log("Help modal opened");
});

closeHelp.addEventListener("click", () => {
  helpModal.style.display = "none";
  console.log("Help modal closed");
});

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    return this;
  };
}

try {
  initGame();
  console.log("Initial game setup complete");
} catch (e) {
  console.error("Initial setup error:", e);
  showError("Failed to initialize game");
}