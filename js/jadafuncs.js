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

// Jada sprites
const jadaIdle = new Image();
jadaIdle.src = "assets/jadaassets/jada.png";

const jadaMoving = new Image();
jadaMoving.src = "assets/jadaassets/jadamoving.png";

const jada = {
    x: 130,
    y: 300,
    w: 70,
    h: 70,
    speed: 3.0,
    targetX: 130,
    targetY: 300,
    isMoving: false,
    facingLeft: false
  };

  const stats = {
    hunger: 100,
    thirst: 100,
    energy: 100,
    happiness: 100
  };

// zone assets
const drinkImage = new Image();
drinkImage.src = "assets/jadaassets/lake.png";

const eatImage = new Image();
eatImage.src = "assets/jadaassets/food.png";

const playImage = new Image();
playImage.src = "assets/jadaassets/play.png";

let gameOver = false;
let gameWon = false;
let lastStatTick = 0;
let promptText = "";
let totalCareScore = 0;

const messages = [
  "I love you!",
  "Bark Bark!",
  ":)",
  
]

const zones = [
  {
    id: "drink",
    label: "Drink",
    x: GAME_WIDTH - 150,
    y: 40,
    w: 70,
    h: 70,
  },
  {
    id: "eat",
    label: "Eat",
    x: GAME_WIDTH - 150,
    y: GAME_HEIGHT - 110,
    w: 70,
    h: 70,
  },
  {
    id: "play",
    label: "Play",
    x: 50,
    y: GAME_HEIGHT - 110,
    w: 70,
    h: 70,
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
  Updates Jada's needs over time.
  Happiness is computed from hunger and thirst.
*/
function updateStats(timestamp) {
  if (gameOver) return;

  if (!lastStatTick) lastStatTick = timestamp;

  const elapsed = (timestamp - lastStatTick) / 1000;
  if (elapsed < 1) return;

  const wholeSeconds = Math.floor(elapsed);
  lastStatTick += wholeSeconds * 1000;

  stats.hunger -= 1.0 * wholeSeconds;
  stats.thirst -= 1.0 * wholeSeconds;
  stats.energy += 1.0 * wholeSeconds;

  stats.hunger = clamp(stats.hunger, 0, 100);
  stats.thirst = clamp(stats.thirst, 0, 100);
  stats.energy = clamp(stats.energy, 0, 100);

  stats.happiness = clamp((stats.hunger * stats.thirst) / 100, 0, 100);

  totalCareScore += wholeSeconds;

  if (stats.happiness <= 0) {
    gameOver = true;
  }

  if (totalCareScore >= 180 && stats.happiness > 0) {
    gameWon = true;
  }
}

/*
  Returns the zone Jada is currently standing in, if any.
*/
function getActiveZone() {
    for (const zone of zones) {
      if (rectsOverlap(jada, zone)) {
        return zone;
      }
    }
    return null;
  }

/*
  Performs the zone action when Jada presses E on a box.
*/
function interactWithZone() {
  const zone = getActiveZone();
  if (!zone) return;

  if (zone.id === "drink") {
    stats.thirst = clamp(stats.thirst + 25, 0, 100);
    promptText = "Jada drank some water.";
  }

  if (zone.id === "eat") {
    stats.hunger = clamp(stats.hunger + 25, 0, 100);
    promptText = "Jada ate some food.";
  }

  if (zone.id === "play") {
    stats.energy = clamp(stats.energy - 10, 0, 100);
    stats.hunger = clamp(stats.hunger - 4, 0, 100);
    stats.thirst = clamp(stats.thirst - 6, 0, 100);
    promptText = "Jada played happily.";
  }

  stats.happiness = clamp((stats.hunger * stats.thirst) / 100, 0, 100);
}

function resetGame() {
  jada.x = 130;
  jada.y = 300;
  jada.isMoving = false;
  jada.facingLeft = false;

  stats.hunger = 100;
  stats.thirst = 100;
  stats.energy = 100;
  stats.happiness = 100;

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
  Draws the interaction zones.
  PNG images are drawn over the zone areas.
*/
function drawZones() {

  for (const zone of zones) {
    let image = null;

    if (zone.id === "drink") image = drinkImage;
    if (zone.id === "eat") image = eatImage;
    if (zone.id === "play") image = playImage;

    if (image) {
      ctx.drawImage(
        image,
        zone.x-50,
        zone.y-50,
      );
    }

  }

}

/*
  Draws Jada using sprites.
  Idle sprite when not moving, walking sprite when moving.
  Flips the sprite when facing left.
*/
function drawJada() {
    const sprite = jada.isMoving ? jadaMoving : jadaIdle;
  
    if (jada.facingLeft) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, -jada.x - jada.w, jada.y, jada.w, jada.h);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, jada.x, jada.y, jada.w, jada.h);
    }
  }

/*
  Draws the HUD showing Jada's current care stats.
*/
function drawHud() {
  drawStatBar("Happiness", stats.happiness, 16, 16, "#ff8fb1");
  drawStatBar("Hunger", stats.hunger, 16, 52, "#f6b26b");
  drawStatBar("Thirst", stats.thirst, 16, 88, "#6fa8dc");
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
  Updates Jada's movement based on WASD or arrow keys.
  Also tracks whether she is moving and which direction she is facing.
*/
function updateJada() {
    if (!gameFocused || gameOver) {
      jada.isMoving = false;
      return;
    }
  
    let moved = false;
  
    if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
      jada.y -= jada.speed;
      moved = true;
    }
  
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
      jada.y += jada.speed;
      moved = true;
    }
  
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
      jada.x -= jada.speed;
      jada.facingLeft = false;
      moved = true;
    }
  
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
      jada.x += jada.speed;
      jada.facingLeft = true;
      moved = true;
    }
  
    jada.x = clamp(jada.x, 0, GAME_WIDTH - jada.w);
    jada.y = clamp(jada.y, 0, GAME_HEIGHT - jada.h);
    jada.isMoving = moved;
  }

/*
  Main game loop.
  Updates gameplay state and redraws everything every frame.
*/
function gameLoop(timestamp) {
    updateJada();
    updateStats(timestamp);
  
    drawBackground();
    drawZones();
    drawJada();
    drawHud();
    drawPrompt();
    drawEndScreen();
  
    requestAnimationFrame(gameLoop);
  }

requestAnimationFrame(gameLoop);