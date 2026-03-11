const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const focusButton = document.getElementById("focusButton");

const grassImage = new Image();
grassImage.src = "assets/jadaassets/grass.png";

let grassPattern = null;

grassImage.onload = () => {
  grassPattern = ctx.createPattern(grassImage, "repeat");
};

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;

let gameFocused = false;
const keys = {};

const player = {
  x: 130,
  y: 300,
  w: 28,
  h: 28,
  speed: 3.4,
  color: "#222"
};

const jada = {
  x: 520,
  y: 305,
  w: 64,
  h: 42,
  targetX: 520,
  targetY: 305,
  moveTimer: 0
};

const stats = {
  happiness: 100,
  hunger: 100,
  cleanliness: 100,
  energy: 100
};

let gameOver = false;
let gameWon = false;
let lastStatTick = 0;
let promptText = "";
let totalCareScore = 0;

/*
  Defines the interactive areas in the game.
  The player can stand in these zones and press E to care for Jada.
*/
const zones = [
  {
    id: "food",
    label: "Food Bowl",
    x: 70,
    y: 120,
    w: 120,
    h: 90,
    color: "#f4b183"
  },
  {
    id: "groom",
    label: "Grooming Station",
    x: 70,
    y: 400,
    w: 140,
    h: 90,
    color: "#9dc3e6"
  },
  {
    id: "walk",
    label: "Walk Door",
    x: 840,
    y: 220,
    w: 110,
    h: 140,
    color: "#a9d18e"
  }
];

/*
  Toggles whether the game has focus.
  When focused, movement keys will not scroll the page.
*/
focusButton.addEventListener("click", () => {
  gameFocused = !gameFocused;

  if (gameFocused) {
    focusButton.textContent = "Release Game";
    focusButton.classList.add("active");
  } else {
    focusButton.textContent = "Focus Game";
    focusButton.classList.remove("active");
    clearKeys();
  }
});

/*
  Tracks keys currently pressed and prevents page scrolling
  when the game is focused.
*/
window.addEventListener("keydown", (e) => {
  if (!gameFocused) return;

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }

  keys[e.key] = true;

  if ((e.key === "e" || e.key === "E") && !gameOver) {
    interactWithZone();
  }

  if ((e.key === "r" || e.key === "R") && gameOver) {
    resetGame();
  }
});

/*
  Removes keys from the active key list when released.
*/
window.addEventListener("keyup", (e) => {
  if (!gameFocused) return;
  keys[e.key] = false;
});

/*
  Clears all movement keys.
  Useful when releasing game focus.
*/
function clearKeys() {
  for (const key in keys) {
    keys[key] = false;
  }
}

/*
  Checks whether two rectangles overlap.
  Used for interaction detection and simple proximity logic.
*/
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/*
  Keeps a value inside a given min/max range.
*/
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/*
  Prevents the player from moving outside the screen.
*/
function clampPlayer() {
  player.x = clamp(player.x, 0, GAME_WIDTH - player.w);
  player.y = clamp(player.y, 0, GAME_HEIGHT - player.h);
}

/*
  Updates the player's movement based on WASD or arrow keys.
*/
function updatePlayer() {
  if (!gameFocused || gameOver) return;

  if (keys["ArrowUp"] || keys["w"] || keys["W"]) player.y -= player.speed;
  if (keys["ArrowDown"] || keys["s"] || keys["S"]) player.y += player.speed;
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) player.x += player.speed;

  clampPlayer();
}

/*
  Slowly lowers Jada's needs over time.
  Happiness is influenced by the other needs.
*/
function updateStats(timestamp) {
  if (gameOver) return;

  if (!lastStatTick) lastStatTick = timestamp;

  const elapsed = (timestamp - lastStatTick) / 1000;
  if (elapsed < 1) return;

  const wholeSeconds = Math.floor(elapsed);
  lastStatTick += wholeSeconds * 1000;

  stats.hunger -= 1.0 * wholeSeconds;
  stats.cleanliness -= 0.7 * wholeSeconds;
  stats.energy += 1 * wholeSeconds;

  const supportAverage = (stats.hunger + stats.cleanliness + stats.energy) / 3;
  if (supportAverage < 70) stats.happiness -= 0.8 * wholeSeconds;
  if (supportAverage < 45) stats.happiness -= 1.2 * wholeSeconds;
  if (supportAverage > 85) stats.happiness += 0.25 * wholeSeconds;

  stats.hunger = clamp(stats.hunger, 0, 100);
  stats.cleanliness = clamp(stats.cleanliness, 0, 100);
  stats.energy = clamp(stats.energy, 0, 100);
  stats.happiness = clamp(stats.happiness, 0, 100);

  totalCareScore += wholeSeconds;

  if (stats.happiness <= 0) {
    gameOver = true;
  }

  if (totalCareScore >= 180 && stats.happiness > 0) {
    gameWon = true;
  }
}

/*
  Makes Jada wander around the center of the room a bit
  so she feels more alive.
*/
function updateJada(timestamp) {
  if (gameOver) return;

  if (jada.moveTimer <= 0) {
    jada.targetX = 420 + Math.random() * 220;
    jada.targetY = 180 + Math.random() * 220;
    jada.moveTimer = 80 + Math.random() * 100;
  }

  const dx = jada.targetX - jada.x;
  const dy = jada.targetY - jada.y;

  jada.x += dx * 0.01;
  jada.y += dy * 0.01;
  jada.moveTimer -= 1;
}

/*
  Returns the zone the player is currently standing in, if any.
*/
function getActiveZone() {
  for (const zone of zones) {
    if (rectsOverlap(player, zone)) {
      return zone;
    }
  }
  return null;
}

/*
  Performs the zone action when the player presses E.
*/
function interactWithZone() {
  const zone = getActiveZone();
  if (!zone) return;

  if (zone.id === "food") {
    stats.hunger = clamp(stats.hunger + 28, 0, 100);
    stats.happiness = clamp(stats.happiness + 8, 0, 100);
    promptText = "You fed Jada.";
  }

  if (zone.id === "groom") {
    stats.cleanliness = clamp(stats.cleanliness + 32, 0, 100);
    stats.happiness = clamp(stats.happiness + 6, 0, 100);
    promptText = "You groomed Jada.";
  }

  if (zone.id === "walk") {
    stats.energy = clamp(stats.energy - 10, 0, 100);
    stats.happiness = clamp(stats.happiness + 14, 0, 100);
    stats.hunger = clamp(stats.hunger - 5, 0, 100);
    promptText = "You took Jada on a walk.";
  }
}

/*
  Resets the game to its initial state.
*/
function resetGame() {
  player.x = 130;
  player.y = 300;

  jada.x = 520;
  jada.y = 305;
  jada.targetX = 520;
  jada.targetY = 305;
  jada.moveTimer = 0;

  stats.happiness = 100;
  stats.hunger = 100;
  stats.cleanliness = 100;
  stats.energy = 100;

  gameOver = false;
  gameWon = false;
  totalCareScore = 0;
  lastStatTick = 0;
  promptText = "";
  clearKeys();
}

/*
  Draws the grass background using a tiled sprite.
*/
function drawBackground() {

    if (grassPattern) {
      ctx.fillStyle = grassPattern;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
      // fallback color while image loads
      ctx.fillStyle = "#7fc96a";
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
  
  }

/*
  Draws the interaction zones like food, grooming, and walk areas.
*/
function drawZones() {
  for (const zone of zones) {
    ctx.fillStyle = zone.color;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    ctx.fillStyle = "#222";
    ctx.font = "18px Arial";
    ctx.fillText(zone.label, zone.x + 10, zone.y + 28);

    if (zone.id === "food") {
      ctx.fillStyle = "#7f6000";
      ctx.beginPath();
      ctx.arc(zone.x + 52, zone.y + 55, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    if (zone.id === "groom") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(zone.x + 25, zone.y + 48, 70, 18);
    }

    if (zone.id === "walk") {
      ctx.fillStyle = "#6aa84f";
      ctx.fillRect(zone.x + 18, zone.y + 38, 70, 60);
    }
  }
}

/*
  Draws the player as Jada's owner.
*/
function drawPlayer() {
  ctx.fillStyle = "#222";
  ctx.fillRect(player.x, player.y, player.w, player.h);
}

/*
  Draws Jada as a simple doodle dog made from rectangles and circles.
*/
function drawJada() {
  const x = jada.x;
  const y = jada.y;

  ctx.fillStyle = "#d9b38c";
  ctx.fillRect(x, y, 46, 26);

  ctx.fillRect(x + 35, y - 8, 20, 18);

  ctx.fillRect(x + 6, y + 22, 7, 20);
  ctx.fillRect(x + 34, y + 22, 7, 20);

  ctx.fillRect(x - 10, y + 4, 14, 6);

  ctx.fillStyle = "#8b5e3c";
  ctx.fillRect(x + 39, y - 3, 4, 4);
}

/*
  Draws the HUD showing Jada's current care stats.
*/
function drawHud() {
  drawStatBar("Happiness", stats.happiness, 16, 16, "#ff8fb1");
  drawStatBar("Hunger", stats.hunger, 16, 52, "#f6b26b");
  drawStatBar("Cleanliness", stats.cleanliness, 16, 88, "#6fa8dc");
  drawStatBar("Energy", stats.energy, 16, 124, "#93c47d");
}

/*
  Draws one stat bar with label and fill amount.
*/
function drawStatBar(label, value, x, y, color) {
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(x, y, 220, 24);

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, 220, 24);

  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, (216 * value) / 100, 20);

  ctx.fillStyle = "#111";
  ctx.font = "14px Arial";
  ctx.fillText(label + ": " + Math.floor(value), x + 8, y + 17);
}

/*
  Draws a context prompt when the player stands in an action area.
*/
function drawPrompt() {
  const zone = getActiveZone();

  if (zone && !gameOver) {
    promptText = "Press E to use " + zone.label;
  }

  if (!zone && !gameOver && promptText.startsWith("Press E")) {
    promptText = "";
  }

  if (!promptText) return;

  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.fillRect(300, 545, 400, 52);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(300, 545, 400, 52);

  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText(promptText, 320, 577);
}

/*
  Draws the ending overlay for lose or win conditions.
*/
function drawEndScreen() {
  if (!gameOver && !gameWon) return;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = "white";
  ctx.fillRect(260, 180, 480, 180);

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 3;
  ctx.strokeRect(260, 180, 480, 180);

  ctx.fillStyle = "#111";
  ctx.font = "34px Arial";

  if (gameOver) {
    ctx.fillText("Jada got too unhappy.", 335, 240);
  } else {
    ctx.fillText("You took great care of Jada!", 290, 240);
  }

  ctx.font = "22px Arial";
  ctx.fillText("Press R to restart", 410, 295);
}

/*
  Main game loop.
  Updates gameplay state and redraws everything every frame.
*/
function gameLoop(timestamp) {
  updatePlayer();
  updateStats(timestamp);
  updateJada(timestamp);

  drawBackground();
  drawZones();
  drawPlayer();
  drawJada();
  drawHud();
  drawPrompt();
  drawEndScreen();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);