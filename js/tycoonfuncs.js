const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const WIN_GOAL = 10000;

ctx.imageSmoothingEnabled = false;

const playerSprite = new Image();
playerSprite.src = "/assets/tycoonassets/sprite.png";

const tableSprite = new Image();
tableSprite.src = "/assets/tycoonassets/table.png";

const buyMachineSprite = new Image();
buyMachineSprite.src = "/assets/tycoonassets/buymachine.png";

const boughtMachineSprite = new Image();
boughtMachineSprite.src = "/assets/tycoonassets/boughtmachine.png";

const player = {
  x: 80,
  y: 286,
  w: 46,
  h: 60,
  speed: 3.2,
  color: "black"
};

let money = 0;
let passiveIncomePerSecond = 1;
let nextBaseIncomeTime = 0;
let hoveredMachineId = null;
let playerFacing = "right";
let winBannerUntil = 0;
let currentTimestamp = 0;
const floatingIncomeTexts = [];

const keys = {};

const focusButton = document.getElementById("focusButton");
let gameFocused = false;

/*
  Creates and returns a machine object.
  Each machine has a position, size, cost, income gain, and purchase status.
*/
function makeMachine(id, x, y, cost, incomeGain) {
  return {
    id,
    x,
    y,
    w: 56,
    h: 56,
    cost,
    incomeGain,
    bought: false,
    nextPayoutTime: 0,
    label: "M" + id
  };
}

const machines = [];
let machineId = 1;

/*
  Generates 20 machines in a 4 by 5 layout on the LEFT HALF of the canvas.
*/
const machineStartX = 40;
const machineStartY = 115;
const machineSpacingX = 120;
const machineSpacingY = 121;

for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 5; col++) {
    const cost = 20 + (machineId - 1) * 35;
    const incomeGain = 1 + Math.floor((machineId - 1) / 2);

    machines.push(
      makeMachine(
        machineId,
        machineStartX + col * machineSpacingX,
        machineStartY + row * machineSpacingY,
        cost,
        incomeGain
      )
    );

    machineId++;
  }
}

/*
  Decorative furniture for the restaurant.
  The right half uses the uploaded table art.
*/
const furniture = [

  { x: 708, y: 72, w: 120, h: 120, color: "#8b5a2b", type: "table" },
  { x: 850, y: 72, w: 120, h: 120, color: "#8b5a2b", type: "table" },

  { x: 708, y: 210, w: 120, h: 120, color: "#94612b", type: "table" },
  { x: 850, y: 210, w: 120, h: 120, color: "#94612b", type: "table" },

  { x: 708, y: 348, w: 120, h: 120, color: "#8b5a2b", type: "table" },
  { x: 850, y: 348, w: 120, h: 120, color: "#8b5a2b", type: "table" },

  { x: 708, y: 486, w: 120, h: 120, color: "#94612b", type: "table" },
  { x: 850, y: 486, w: 120, h: 120, color: "#94612b", type: "table" }
];

/*
  Checks whether two rectangular objects overlap.
  Used for detecting when the player is standing on a machine.
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
  Prevents the player from moving outside the canvas boundaries.
*/
function clampPlayer() {
  if (player.x < 0) player.x = 0;
  if (player.y < 0) player.y = 0;
  if (player.x + player.w > GAME_WIDTH) player.x = GAME_WIDTH - player.w;
  if (player.y + player.h > GAME_HEIGHT) player.y = GAME_HEIGHT - player.h;
}

/*
  Updates the player's position based on currently pressed keys.
  Supports both WASD and arrow keys.
*/
function updatePlayer() {
  if (keys["ArrowUp"] || keys["w"] || keys["W"]) player.y -= player.speed;
  if (keys["ArrowDown"] || keys["s"] || keys["S"]) player.y += player.speed;

  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    player.x -= player.speed;
    playerFacing = "left";
  }

  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    player.x += player.speed;
    playerFacing = "right";
  }

  clampPlayer();
}

/*
  Pays out each income source on its own 1-second cycle.
  New machines begin paying one second after they are bought.
*/
function updateIncome(timestamp) {
  if (!nextBaseIncomeTime) {
    nextBaseIncomeTime = timestamp + 1000;
  }

  let earnedMoney = false;

  while (timestamp >= nextBaseIncomeTime) {
    money += 1;
    nextBaseIncomeTime += 1000;
    earnedMoney = true;
  }

  for (const machine of machines) {
    if (!machine.bought || !machine.nextPayoutTime) continue;

    while (timestamp >= machine.nextPayoutTime) {
      money += 1;
      machine.nextPayoutTime += 1000 / machine.incomeGain;
      spawnFloatingIncome(machine);
      earnedMoney = true;
    }
  }

  if (earnedMoney) {
    updateMoneyDisplay();
  }
}

/*
  Finds which machine the player is currently standing on, if any.
  Stores that machine's id so it can be highlighted and purchased.
*/
function updateHoveredMachine() {
  hoveredMachineId = null;

  for (const machine of machines) {
    if (!machine.bought && rectsOverlap(player, machine)) {
      hoveredMachineId = machine.id;
      break;
    }
  }
}

/*
  Purchases the currently hovered machine if the player has enough money.
  Buying a machine subtracts its cost and increases passive income.
*/
function buyHoveredMachine() {
  if (hoveredMachineId === null) return;

  const machine = machines.find((m) => m.id === hoveredMachineId);
  if (!machine || machine.bought) return;

  if (money >= machine.cost) {
    money -= machine.cost;
    machine.bought = true;
    machine.nextPayoutTime = currentTimestamp + 1000 / machine.incomeGain;
    passiveIncomePerSecond += machine.incomeGain;
    updateMoneyDisplay();
  }
}

/*
  Keeps money rounded cleanly for display inside the canvas HUD.
*/
function updateMoneyDisplay() {
  money = Math.max(0, Math.floor(money * 100) / 100);
}

/*
  Creates a floating +1 marker at the bin below a bought machine.
*/
function spawnFloatingIncome(machine) {
  floatingIncomeTexts.push({
    x: machine.x + machine.w / 2,
    y: machine.y + machine.h + 22,
    createdAt: currentTimestamp,
    duration: 650
  });
}

/*
  Updates and expires floating income markers.
*/
function updateFloatingIncomeTexts(timestamp) {
  for (let i = floatingIncomeTexts.length - 1; i >= 0; i--) {
    const text = floatingIncomeTexts[i];
    if (timestamp - text.createdAt > text.duration) {
      floatingIncomeTexts.splice(i, 1);
    }
  }
}

/*
  Resets the tycoon run after reaching the win goal.
*/
function resetGame() {
  money = 0;
  passiveIncomePerSecond = 1;
  nextBaseIncomeTime = currentTimestamp ? currentTimestamp + 1000 : 0;
  hoveredMachineId = null;
  player.x = 80;
  player.y = 286;
  playerFacing = "right";

  for (const machine of machines) {
    machine.bought = false;
    machine.nextPayoutTime = 0;
  }

  floatingIncomeTexts.length = 0;

  Object.keys(keys).forEach((key) => {
    keys[key] = false;
  });

  updateMoneyDisplay();
}

/*
  Ends the run when the player reaches the money goal.
*/
function checkWin(timestamp) {
  if (money < WIN_GOAL) return;

  winBannerUntil = timestamp + 1800;
  resetGame();
}

/*
  Draws the main background and floor grid for the restaurant.
*/
function drawBackground() {
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.strokeStyle = "#e2ddd2";
  ctx.lineWidth = 1;

  for (let x = 0; x <= GAME_WIDTH; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GAME_HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y <= GAME_HEIGHT; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_WIDTH, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#bdb6aa";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(680, 0);
  ctx.lineTo(680, GAME_HEIGHT);
  ctx.stroke();
}

/*
  Draws decorative furniture such as the sushi counter and dining tables.
  Tables use the uploaded sprite with a simple rectangle fallback.
*/
function drawFurniture() {
  for (const item of furniture) {
    if (item.type === "table" && tableSprite.complete && tableSprite.naturalWidth > 0) {
      ctx.drawImage(tableSprite, item.x, item.y, item.w, item.h);
      continue;
    }

    ctx.fillStyle = item.color;
    ctx.fillRect(item.x, item.y, item.w, item.h);

    if (item.type === "table") {
      ctx.strokeStyle = "#5c3b1d";
      ctx.lineWidth = 2;
      ctx.strokeRect(item.x, item.y, item.w, item.h);
    }
  }
}

/*
  Draws all machine pads.
  Unbought machines use the uploaded buy-machine art with only the machine number shown.
  Bought machines change appearance to show they are active.
*/
function drawMachines() {
  for (const machine of machines) {
    if (machine.bought) {
      if (boughtMachineSprite.complete && boughtMachineSprite.naturalWidth > 0) {
        ctx.drawImage(boughtMachineSprite, machine.x, machine.y, machine.w, machine.h);
      } else {
        ctx.fillStyle = "#4caf50";
        ctx.fillRect(machine.x, machine.y, machine.w, machine.h);

        ctx.fillStyle = "#1b5e20";
        ctx.fillRect(machine.x + 10, machine.y + 10, 36, 12);
        ctx.fillRect(machine.x + 12, machine.y + 28, 32, 16);
      }

      drawCollectionBin(machine);

    } else {
      if (buyMachineSprite.complete && buyMachineSprite.naturalWidth > 0) {
        ctx.drawImage(buyMachineSprite, machine.x, machine.y, machine.w, machine.h);
      } else {
        ctx.fillStyle = hoveredMachineId === machine.id ? "#90ee90" : "#b7f0b1";
        ctx.fillRect(machine.x, machine.y, machine.w, machine.h);
      }

      ctx.strokeStyle = "#2e7d32";
      ctx.lineWidth = 2;
      ctx.strokeRect(machine.x, machine.y, machine.w, machine.h);

      if (hoveredMachineId === machine.id) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
        ctx.fillRect(machine.x, machine.y, machine.w, machine.h);
      }

      ctx.fillStyle = "#1f1f1f";
      ctx.font = "bold 15px Arial";
      ctx.textAlign = "center";
      ctx.fillText(machine.label, machine.x + machine.w / 2, machine.y + 20);
      ctx.textAlign = "start";
    }
  }
}

/*
  Draws the collection bin directly south of a bought machine.
*/
function drawCollectionBin(machine) {
  const binWidth = 26;
  const binHeight = 18;
  const binX = machine.x + (machine.w - binWidth) / 2;
  const binY = machine.y + machine.h + 8;

  ctx.fillStyle = "#5f6779";
  ctx.fillRect(binX, binY, binWidth, binHeight);

  ctx.strokeStyle = "#1f2430";
  ctx.lineWidth = 2;
  ctx.strokeRect(binX, binY, binWidth, binHeight);

  ctx.fillStyle = "#8a93a8";
  ctx.fillRect(binX + 4, binY + 4, binWidth - 8, binHeight - 8);
}

/*
  Draws floating +1 markers that rise out of the collection bins.
*/
function drawFloatingIncomeTexts(timestamp) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 16px Arial";

  for (const text of floatingIncomeTexts) {
    const progress = Math.min((timestamp - text.createdAt) / text.duration, 1);
    const rise = 22 * progress;
    const alpha = 1 - progress;

    ctx.fillStyle = `rgba(34, 139, 34, ${alpha})`;
    ctx.fillText("+1", text.x, text.y - rise);
  }

  ctx.restore();
}

/*
  Draws the player using the uploaded sprite with a square fallback.
*/
function drawPlayer() {
  if (playerSprite.complete && playerSprite.naturalWidth > 0) {
    ctx.save();

    if (playerFacing === "left") {
      ctx.translate(player.x + player.w, player.y);
      ctx.scale(-1, 1);
      ctx.drawImage(playerSprite, 0, 0, player.w, player.h);
    } else {
      ctx.drawImage(playerSprite, player.x, player.y, player.w, player.h);
    }

    ctx.restore();
    return;
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);
}

/*
  Draws a single HUD box inside the canvas for both money and income rate.
*/
function drawHud() {
  const hudX = 12;
  const hudY = 12;
  const hudW = 240;
  const hudH = 74;

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.fillRect(hudX, hudY, hudW, hudH);

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.strokeRect(hudX, hudY, hudW, hudH);

  ctx.fillStyle = "#111";
  ctx.font = "bold 20px Arial";
  ctx.fillText("Money: $" + Math.floor(money), hudX + 14, hudY + 30);

  ctx.font = "16px Arial";
  ctx.fillText("Rate: $" + passiveIncomePerSecond + "/sec", hudX + 14, hudY + 56);
}

/*
  Draws a goal progress bar in the top-right corner of the canvas.
*/
function drawGoalProgress() {
  const boxW = 240;
  const boxH = 74;
  const boxX = GAME_WIDTH - boxW - 12;
  const boxY = 12;
  const progress = Math.min(money / WIN_GOAL, 1);
  const percent = Math.floor(progress * 100);

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = "#111";
  ctx.font = "bold 18px Arial";
  ctx.fillText("Goal: $10,000", boxX + 14, boxY + 24);

  ctx.fillStyle = "#dde6d7";
  ctx.fillRect(boxX + 14, boxY + 30, boxW - 28, 16);

  ctx.fillStyle = "#4caf50";
  ctx.fillRect(boxX + 14, boxY + 30, (boxW - 28) * progress, 16);

  ctx.strokeStyle = "#1f1f1f";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(boxX + 14, boxY + 30, boxW - 28, 16);

  ctx.fillStyle = "#111";
  ctx.font = "15px Arial";
  ctx.fillText(percent + "% complete", boxX + 14, boxY + 66);
}

/*
  Briefly shows a win message after the player hits the goal.
*/
function drawWinBanner(timestamp) {
  if (timestamp >= winBannerUntil) return;

  const boxWidth = 320;
  const boxHeight = 72;
  const boxX = (GAME_WIDTH - boxWidth) / 2;
  const boxY = 96;

  ctx.fillStyle = "rgba(0, 0, 0, 0.84)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("You hit $10,000!", boxX + boxWidth / 2, boxY + 30);
  ctx.font = "16px Arial";
  ctx.fillText("Starting a new run...", boxX + boxWidth / 2, boxY + 54);
  ctx.textAlign = "start";
}

/*
  Draws the machine purchase popup near the bottom center
  so it does not overlap the player or clip the machine area.
*/
function drawPurchasePrompt() {
  if (hoveredMachineId === null) return;

  const machine = machines.find((m) => m.id === hoveredMachineId);
  if (!machine || machine.bought) return;

  const boxWidth = 360;
  const boxHeight = 60;
  const boxX = (GAME_WIDTH - boxWidth) / 2;
  const boxY = GAME_HEIGHT - 85;

  ctx.fillStyle = "rgba(0,0,0,0.82)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText(
    "Press E to buy M" + machine.id + "  |  Cost: $" + machine.cost + "  |  +" + machine.incomeGain + "/sec",
    boxX + 16,
    boxY + 25
  );

  ctx.font = "14px Arial";
  ctx.fillText("Stand on the green machine pad to purchase it.", boxX + 16, boxY + 47);
}

/*
  Toggles whether the game has keyboard focus.
  When focused, movement keys will not scroll the page.
*/
focusButton.addEventListener("click", () => {
  gameFocused = !gameFocused;

  if (gameFocused) {
    focusButton.textContent = "End Game";
    focusButton.classList.add("active");
  } else {
    focusButton.textContent = "Start Game";
    focusButton.classList.remove("active");

    Object.keys(keys).forEach((key) => {
      keys[key] = false;
    });
  }
});

/*
  Tracks key presses and allows machine purchasing with E.
  Prevents page scrolling when the game is focused.
*/
window.addEventListener("keydown", (e) => {
  if (!gameFocused) return;

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }

  keys[e.key] = true;

  if (e.key === "e" || e.key === "E") {
    buyHoveredMachine();
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
  Main game loop.
  Updates movement, income, hovered machine detection,
  and redraws the entire scene every animation frame.
*/
function gameLoop(timestamp) {
  currentTimestamp = timestamp;
  updatePlayer();
  updateIncome(timestamp);
  updateFloatingIncomeTexts(timestamp);
  updateHoveredMachine();
  checkWin(timestamp);

  drawBackground();
  drawFurniture();
  drawMachines();
  drawFloatingIncomeTexts(timestamp);
  drawPlayer();
  drawHud();
  drawGoalProgress();
  drawPurchasePrompt();
  drawWinBanner(timestamp);

  requestAnimationFrame(gameLoop);
}

updateMoneyDisplay();
requestAnimationFrame(gameLoop);
