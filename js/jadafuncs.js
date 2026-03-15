const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const focusButton = document.getElementById("focusButton");

const grassImage = new Image();
grassImage.src = "/assets/jadaassets/grass.png";

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
jadaIdle.src = "/assets/jadaassets/jada.png";

const jadaMoving = new Image();
jadaMoving.src = "/assets/jadaassets/jadamoving.png";

const flagImage = new Image();
flagImage.src = "/assets/jadaassets/messageflag.png";

const messageFlags = [];
const MAX_FLAGS = 3;
const FLAG_SIZE = 42;

let activeMessagePopup = null;
let lastFlagSpawnTime = 0;
const FLAG_SPAWN_INTERVAL = 3500;

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
drinkImage.src = "/assets/jadaassets/lake.png";

const eatImage = new Image();
eatImage.src = "/assets/jadaassets/food.png";

const playImage = new Image();
playImage.src = "/assets/jadaassets/play.png";

let gameOver = false;
let gameWon = false;
let lastStatTick = 0;
let promptText = "";
let totalCareScore = 0;

const messages = [
  "I love you!",
  "Bark bark!",
  ":)",
  "Can we go outside again?",
  "I buried this just for you.",
  "You are my favorite human.",
  "I could really go for a snack.",
  "I saw a squirrel earlier.",
  "This yard smells amazing.",
  "I like when we play together.",
  "Digging is one of my talents.",
  "I hope you are having a good day.",
  "You throw. I chase. Perfect system.",
  "Being a dog is pretty great.",
  "I found this message all by myself.",
  "More water would be nice.",
  "The grass feels good on my paws.",
  "I am thinking about treats.",
  "Thanks for taking care of me.",
  "I would like one million belly rubs.",
  "Today is a good digging day.",
  "You are doing a great job.",
  "I think this spot is important.",
  "There might be treasure somewhere else too.",
  "Woof means I appreciate you."
];

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

window.addEventListener("click", () => {
  if (activeMessagePopup) {
    activeMessagePopup = null;
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
  Draws wrapped text inside a maximum width.
*/
function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, y);
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

  stats.happiness = clamp((stats.hunger + stats.thirst) / 100, 0, 100);

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
  Returns a random message from the list of possible messages.
*/
function getRandomMessage() {
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}

/*
  Spawns one message flag inside the middle 400x400 area.
  The flag stays away from the outer edges and interaction areas.
*/
function spawnMessageFlag() {
  if (messageFlags.length >= MAX_FLAGS) return;

  const xMin = (GAME_WIDTH - 400) / 2;
  const xMax = xMin + 400 - FLAG_SIZE;
  const yMin = (GAME_HEIGHT - 400) / 2;
  const yMax = yMin + 400 - FLAG_SIZE;

  let attempts = 0;

  while (attempts < 50) {
    const newFlag = {
      x: xMin + Math.random() * (xMax - xMin),
      y: yMin + Math.random() * (yMax - yMin),
      w: FLAG_SIZE,
      h: FLAG_SIZE,
      message: getRandomMessage()
    };

    let overlapsZone = false;
    for (const zone of zones) {
      if (rectsOverlap(newFlag, zone)) {
        overlapsZone = true;
        break;
      }
    }

    let overlapsFlag = false;
    for (const flag of messageFlags) {
      if (rectsOverlap(newFlag, flag)) {
        overlapsFlag = true;
        break;
      }
    }

    if (!overlapsZone && !overlapsFlag) {
      messageFlags.push(newFlag);
      return;
    }

    attempts++;
  }
}

/*
  Spawns flags over time until the max visible count is reached.
*/
function updateMessageFlags(timestamp) {
  if (gameOver || activeMessagePopup) return;

  if (!lastFlagSpawnTime) {
    lastFlagSpawnTime = timestamp;
  }

  if (
    messageFlags.length < MAX_FLAGS &&
    timestamp - lastFlagSpawnTime >= FLAG_SPAWN_INTERVAL
  ) {
    spawnMessageFlag();
    lastFlagSpawnTime = timestamp;
  }
}

/*
  Returns the message flag Jada is currently overlapping, if any.
*/
function getActiveMessageFlag() {
  for (let i = 0; i < messageFlags.length; i++) {
    if (rectsOverlap(jada, messageFlags[i])) {
      return i;
    }
  }
  return -1;
}

/*
  Opens the popup for a dug-up flag and removes the flag from the map.
*/
function digMessageFlag() {
  const flagIndex = getActiveMessageFlag();
  if (flagIndex === -1) return false;

  const flag = messageFlags[flagIndex];
  activeMessagePopup = flag.message;
  messageFlags.splice(flagIndex, 1);
  promptText = "";
  return true;
}

/*
  Performs interactions when Jada presses E.
  Message flags are checked first, then normal care zones.
*/
function interactWithZone() {
  if (activeMessagePopup) return;

  if (digMessageFlag()) {
    return;
  }

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

  messageFlags.length = 0;
  activeMessagePopup = null;
  lastFlagSpawnTime = 0;
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
  Draws all active message flags on the map.
*/
function drawMessageFlags() {
  for (const flag of messageFlags) {
    ctx.drawImage(flagImage, flag.x, flag.y, flag.w, flag.h);
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
  Draws a context prompt when Jada stands in an action area or flag.
*/
function drawPrompt() {
  if (activeMessagePopup) return;

  const flagIndex = getActiveMessageFlag();
  const zone = getActiveZone();

  if (flagIndex !== -1 && !gameOver) {
    promptText = "Press E to dig";
  } else if (zone && !gameOver) {
    promptText = "Press E to use " + zone.label;
  } else if (!gameOver) {
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
  Draws the white popup box for a dug-up message.
  Click anywhere to close it.
*/
function drawMessagePopup() {
  if (!activeMessagePopup) return;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const boxX = 220;
  const boxY = 180;
  const boxW = 560;
  const boxH = 180;

  ctx.fillStyle = "white";
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 3;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = "#111";
  ctx.font = "28px Arial";
  ctx.fillText("Jada found a message:", boxX + 30, boxY + 45);

  ctx.font = "24px Arial";
  wrapText(activeMessagePopup, boxX + 30, boxY + 90, boxW - 60, 32);

  ctx.font = "18px Arial";
  ctx.fillText("Click anywhere to close", boxX + 30, boxY + boxH - 25);
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
  updateMessageFlags(timestamp);

  drawBackground();
  drawZones();
  drawMessageFlags();
  drawJada();
  drawHud();
  drawPrompt();
  drawMessagePopup();
  drawEndScreen();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
