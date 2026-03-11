const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const moneyValue = document.getElementById("moneyValue");

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;

const player = {
  x: 80,
  y: 300,
  w: 22,
  h: 22,
  speed: 3.2,
  color: "black"
};

let money = 0;
let passiveIncomePerSecond = 1;
let lastIncomeTime = 0;
let hoveredMachineId = null;

const keys = {};

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
  Now the RIGHT HALF contains only tables.
*/
const furniture = [

  // sushi counter near top center
  { x: 420, y: 28, w: 160, h: 24, color: "#c94f4f", type: "counter" },
  { x: 447, y: 32, w: 18, h: 16, color: "#ffffff", type: "plate" },
  { x: 477, y: 32, w: 18, h: 16, color: "#ffffff", type: "plate" },
  { x: 507, y: 32, w: 18, h: 16, color: "#ffffff", type: "plate" },

  // right-side dining tables only
  { x: 715, y: 100, w: 110, h: 70, color: "#8b5a2b", type: "table" },
  { x: 855, y: 100, w: 110, h: 70, color: "#8b5a2b", type: "table" },

  { x: 715, y: 220, w: 110, h: 70, color: "#94612b", type: "table" },
  { x: 855, y: 220, w: 110, h: 70, color: "#94612b", type: "table" },

  { x: 715, y: 340, w: 110, h: 70, color: "#8b5a2b", type: "table" },
  { x: 855, y: 340, w: 110, h: 70, color: "#8b5a2b", type: "table" },

  { x: 715, y: 460, w: 110, h: 70, color: "#94612b", type: "table" },
  { x: 855, y: 460, w: 110, h: 70, color: "#94612b", type: "table" }
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
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) player.x += player.speed;

  clampPlayer();
}

/*
  Adds passive income once per second based on the current income rate.
  Uses the animation timestamp to stay consistent over time.
*/
function updateIncome(timestamp) {
  if (!lastIncomeTime) lastIncomeTime = timestamp;

  if (timestamp - lastIncomeTime >= 1000) {
    const secondsPassed = Math.floor((timestamp - lastIncomeTime) / 1000);
    money += passiveIncomePerSecond * secondsPassed;
    lastIncomeTime += secondsPassed * 1000;
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

  const machine = machines.find(m => m.id === hoveredMachineId);
  if (!machine || machine.bought) return;

  if (money >= machine.cost) {
    money -= machine.cost;
    machine.bought = true;
    passiveIncomePerSecond += machine.incomeGain;
    updateMoneyDisplay();
  }
}

/*
  Updates the money value displayed in the top HTML counter.
*/
function updateMoneyDisplay() {
  moneyValue.textContent = Math.floor(money);
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

  // visual divider between machine side and dining side
  ctx.strokeStyle = "#bdb6aa";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(680, 0);
  ctx.lineTo(680, GAME_HEIGHT);
  ctx.stroke();
}

/*
  Draws decorative furniture such as carpets and tables.
*/
function drawFurniture() {
  for (const item of furniture) {
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
  Unbought machines show cost and income gain.
  Bought machines change appearance to show they are active.
*/
function drawMachines() {
  for (const machine of machines) {
    if (machine.bought) {
      ctx.fillStyle = "#4caf50";
      ctx.fillRect(machine.x, machine.y, machine.w, machine.h);

      ctx.fillStyle = "#1b5e20";
      ctx.fillRect(machine.x + 10, machine.y + 10, 36, 12);
      ctx.fillRect(machine.x + 12, machine.y + 28, 32, 16);

      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.fillText("+$" + machine.incomeGain + "/s", machine.x + 7, machine.y + 52);
    } else {
      ctx.fillStyle = hoveredMachineId === machine.id ? "#90ee90" : "#b7f0b1";
      ctx.fillRect(machine.x, machine.y, machine.w, machine.h);

      ctx.strokeStyle = "#2e7d32";
      ctx.lineWidth = 2;
      ctx.strokeRect(machine.x, machine.y, machine.w, machine.h);

      ctx.fillStyle = "#1f1f1f";
      ctx.font = "12px Arial";
      ctx.fillText(machine.label, machine.x + 16, machine.y + 18);
      ctx.fillText("$" + machine.cost, machine.x + 10, machine.y + 34);
      ctx.fillText("+" + machine.incomeGain + "/s", machine.x + 6, machine.y + 49);
    }
  }
}

/*
  Draws the player as a simple black square.
*/
function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);
}

/*
  Draws a smaller HUD inside the canvas.
  Only shows passive income now since money is already shown in the page header.
*/
function drawHud() {
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(12, 12, 180, 52);

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, 180, 52);

  ctx.fillStyle = "#111";
  ctx.font = "18px Arial";
  ctx.fillText("Income: $" + passiveIncomePerSecond + "/sec", 24, 44);
}

/*
  Draws the machine purchase popup near the bottom center
  so it does not overlap the player or clip the machine area.
*/
function drawPurchasePrompt() {
  if (hoveredMachineId === null) return;

  const machine = machines.find(m => m.id === hoveredMachineId);
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
  Main game loop.
  Updates movement, income, hovered machine detection,
  and redraws the entire scene every animation frame.
*/
function gameLoop(timestamp) {
  updatePlayer();
  updateIncome(timestamp);
  updateHoveredMachine();

  drawBackground();
  drawFurniture();
  drawMachines();
  drawPlayer();
  drawHud();
  drawPurchasePrompt();

  requestAnimationFrame(gameLoop);
}

/*
  Tracks key presses and allows machine purchasing with E.
*/
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (e.key === "e" || e.key === "E") {
    buyHoveredMachine();
  }
});

/*
  Removes keys from the active key list when released.
*/
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

updateMoneyDisplay();
requestAnimationFrame(gameLoop);