const valuesInput = document.getElementById("values-input");
const runButton = document.getElementById("run-sort");
const resetButton = document.getElementById("reset");
const statusEl = document.getElementById("status");
const chartEl = document.getElementById("chart");

const defaultInput = "10, 2, 3, 4, 18, 7, 14";
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

function ketamineSort(list) {
  const max = Math.max(...list);
  const min = Math.min(...list);
  const halluciations = list.map(() => Math.random() * (max - min) + min);
  return list
    .map((value, index) => ({
      value,
      halluciation: halluciations[index]
    }))
    .sort((a, b) => a.halluciation - b.halluciation);
}

function renderChart(items, options = {}) {
  chartEl.innerHTML = "";
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  items.forEach((item) => {
    const group = document.createElement("div");
    group.className = "bar-group";

    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";

    const bar = document.createElement("div");
    bar.className = "bar";
    if (options.activeIndex === item.originalIndex) {
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
    note.textContent = options.showHallucinations
      ? `h: ${item.halluciation.toFixed(2)}`
      : `index ${item.originalIndex + 1}`;

    wrap.appendChild(bar);
    group.appendChild(wrap);
    group.appendChild(label);
    group.appendChild(note);
    chartEl.appendChild(group);
  });
}

function buildItems(values) {
  return values.map((value, index) => ({
    value,
    originalIndex: index
  }));
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

  runButton.disabled = true;
  resetButton.disabled = true;

  currentItems = buildItems(values);
  renderChart(currentItems);
  statusEl.textContent = "Generating hallucinated values...";
  await sleep(700);

  const sortedItemsTracker = new Set();
  const resolvedSortedItems = ketamineSort(values).map((item) => {
    const matchIndex = values.findIndex((value, index) => {
      return value === item.value && !sortedItemsTracker.has(index);
    });
    sortedItemsTracker.add(matchIndex);
    return {
      ...item,
      originalIndex: matchIndex
    };
  });

  for (const item of resolvedSortedItems) {
    renderChart(currentItems, { activeIndex: item.originalIndex });
    statusEl.textContent = `Hallucinating a weight for ${item.value}...`;
    await sleep(850);
  }

  statusEl.textContent = "Reordering bars by hallucinated values...";

  for (let step = 0; step < resolvedSortedItems.length; step += 1) {
    const nextItems = resolvedSortedItems.slice(0, step + 1);
    const remainingItems = currentItems.filter((item) => {
      return !nextItems.some((sortedItem) => sortedItem.originalIndex === item.originalIndex);
    });

    renderChart([...nextItems, ...remainingItems], {
      activeIndex: resolvedSortedItems[step].originalIndex
    });
    await sleep(650);
  }

  currentItems = resolvedSortedItems;
  renderChart(currentItems, { sorted: true, showHallucinations: true });
  statusEl.textContent = "Finished. The bars are ordered by fake random weights, not by actual value.";

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
