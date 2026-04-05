const valuesInput = document.getElementById("values-input");
const runButton = document.getElementById("run-sort");
const resetButton = document.getElementById("reset");
const statusEl = document.getElementById("status");
const chartEl = document.getElementById("chart");

const defaultInput = "9, 4, 7, 2, 6, 1, 5";
let currentItems = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseValues(raw) {
  return raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => !Number.isNaN(value));
}

function buildItems(values) {
  return values.map((value, index) => ({
    value,
    originalIndex: index
  }));
}

function renderChart(items, options = {}) {
  chartEl.innerHTML = "";
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  items.forEach((item, index) => {
    const group = document.createElement("div");
    group.className = "bar-group";

    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";

    const bar = document.createElement("div");
    bar.className = "bar";

    if (options.activeIndices?.includes(index)) {
      bar.classList.add("active");
    }

    if (options.sorted) {
      bar.classList.add("sorted");
    }

    bar.style.height = `${(item.value / maxValue) * 220 + 24}px`;

    const label = document.createElement("div");
    label.className = "bar-label";
    label.textContent = item.value;

    const note = document.createElement("div");
    note.className = "bar-note";
    note.textContent = options.showPositions
      ? `position ${index + 1}`
      : `start ${item.originalIndex + 1}`;

    wrap.appendChild(bar);
    group.appendChild(wrap);
    group.appendChild(label);
    group.appendChild(note);
    chartEl.appendChild(group);
  });
}

function resetChart() {
  const values = parseValues(valuesInput.value);

  if (!values.length) {
    statusEl.textContent = "Please enter at least one valid number.";
    chartEl.innerHTML = "";
    currentItems = [];
    return;
  }

  currentItems = buildItems(values);
  renderChart(currentItems);
  statusEl.textContent = "Enter values and run the animation.";
}

async function animateSort() {
  const values = parseValues(valuesInput.value);

  if (!values.length) {
    statusEl.textContent = "Please enter at least one valid number.";
    return;
  }

  currentItems = buildItems(values);
  renderChart(currentItems);

  runButton.disabled = true;
  resetButton.disabled = true;

  let sel = 0;
  let swaps = 0;

  statusEl.textContent = "Scanning for the first valley...";
  await sleep(700);

  while (sel < currentItems.length - 1) {
    renderChart(currentItems, { activeIndices: [sel, sel + 1] });
    statusEl.textContent = `Checking ${currentItems[sel].value} and ${currentItems[sel + 1].value} for a drop...`;
    await sleep(800);

    if (currentItems[sel].value > currentItems[sel + 1].value) {
      statusEl.textContent = `Valley found. Swapping ${currentItems[sel].value} with ${currentItems[sel + 1].value}.`;
      [currentItems[sel], currentItems[sel + 1]] = [currentItems[sel + 1], currentItems[sel]];
      swaps += 1;
      renderChart(currentItems, { activeIndices: [sel, sel + 1] });
      await sleep(900);

      sel = 0;
      statusEl.textContent = "Restarting scan from the beginning.";
      renderChart(currentItems, { activeIndices: [0, 1] });
      await sleep(700);
    } else {
      sel += 1;
    }
  }

  renderChart(currentItems, { sorted: true, showPositions: true });
  statusEl.textContent = `Finished. Valley Sort made ${swaps} swap${swaps === 1 ? "" : "s"} to sort the list.`;

  runButton.disabled = false;
  resetButton.disabled = false;
}

valuesInput.addEventListener("input", resetChart);
runButton.addEventListener("click", animateSort);
resetButton.addEventListener("click", () => {
  valuesInput.value = defaultInput;
  resetChart();
});

valuesInput.value = defaultInput;
resetChart();
