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
const startX = 180;
const startY = 80;
const spacingX = 145;
const spacingY = 120;

/*
  Generates 20 machines in a 5 by 4 grid.
  Cost increases as machine number increases.
  Income gain also gradually increases.
*/
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 5; col++) {
    const cost = 20 + (machineId - 1) * 35;
    const incomeGain = 1 + Math.floor((machineId - 1) / 2);
    machines.push(
      makeMachine(
        machineId,
        startX + col * spacingX,
        startY + row * spacingY,
        cost,
        incomeGain
      )
    );
    machineId++;
  }
}

const furniture = [
  { x: 50, y: 60, w: 100, h: 70, color: "#d7b46a", type: "carpet" },
  { x: 50, y: 450, w: 120, h: 80, color: "#c79b55", type: "carpet" },

  { x: 760, y: 70, w: 80, h: 50, color: "#8b5a2b", type: "table" },
  { x: 845, y: 70, w: 18, h: 18, color: "#5c3b1d", type: "chair" },
  { x: 845, y: 102, w: 18, h: 18, color: "#5c3b1d", type: "chair" },
  { x: 738, y: 70, w: 18, h: 18, color: "#5c3b1d", type: "chair" },
  { x: 738, y: 102, w: 18, h: 18, color: "#5c3b1d", type: "chair" },

  { x: 760, y: 470, w: 90, h: 55, color: "#8b5a2b", type: "table" },
  { x: 850, y: 478, w: 18, h: 18, color: "#5c3b1d", type: "chair" },
  { x: 850, y: 505, w: 18, h: 18, color: "#5c3b1d", type: "chair" },
  { x: 738, y: 478, w: 18, h: 18, color: "#5c3b1d", type: "chair" },
  { x: 738, y: 505, w: 18, h: 18, color: "#5c3b1d", type: "chair" },

  { x: 450, y: 20, w: 120, h: 24, color: "#c94f4f", type: "counter" },
  { x: 455, y: 24, w: 18, h: 16, color: "#ffffff", type: "plate" },
  { x: 485, y: 24, w: 18, h: 16, color: "#ffffff", type: "plate" },
  { x: 515, y: 24, w: 18, h: 16, color: "#ffffff", type: "plate" }
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
}

/*
  Draws decorative furniture such as carpets, tables, chairs, and counter pieces.
*/
function drawFurniture() {
  for (const item of furniture) {
    ctx.fillStyle = item.color;
    ctx.fillRect(item.x, item.y, item.w, item.h);
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
  Draws the canvas HUD, including current money, passive income,
  and purchase instructions when standing on a machine.
*/
function drawHud() {
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(12, 12, 245, 78);

  ctx.strokeStyle = "#222";
  ctx.strokeRect(12, 12, 245, 78);

  ctx.fillStyle = "#111";
  ctx.font = "18px Arial";
  ctx.fillText("Money: $" + Math.floor(money), 24, 38);

  ctx.font = "16px Arial";
  ctx.fillText("Passive income: $" + passiveIncomePerSecond + "/sec", 24, 62);

  if (hoveredMachineId !== null) {
    const machine = machines.find(m => m.id === hoveredMachineId);

    if (machine && !machine.bought) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(300, 12, 360, 78);

      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.fillText(
        "Press E to buy Machine " + machine.id +
        " | Cost: $" + machine.cost +
        " | Gain: +$" + machine.incomeGain + "/sec",
        314,
        40
      );
      ctx.fillText("Stand on the green box to purchase it.", 314, 64);
    }
  }
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