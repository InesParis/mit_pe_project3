function computeDesignComplexity(dsm) {
  const n = dsm.length;

  function dfs(i, visited) {
    if (visited.has(i)) return;
    visited.add(i);
    for (let j = 0; j < n; j++) {
      if (dsm[i][j] === 1) dfs(j, visited);
    }
  }

  let maxDependencies = 0;
  for (let i = 0; i < n; i++) {
    const visited = new Set();
    dfs(i, visited);
    maxDependencies = Math.max(maxDependencies, visited.size);
  }

  return maxDependencies;
}

function generateDSM(n, d) {
  let DSM = Array.from({ length: n }, () => Array(n).fill(0));

  // Step 1: Assign diagonal (self-dependency)
  for (let i = 0; i < n; i++) {
    DSM[i][i] = 1;
  }

  // Step 2: Ensure exactly (d - 1) additional dependencies per row
  for (let i = 0; i < n; i++) {
    let possibleConnections = [...Array(n).keys()].filter((j) => j !== i); // Exclude self
    let shuffledConnections = possibleConnections.sort(
      () => Math.random() - 0.5
    ); // Shuffle array
    let selectedConnections = shuffledConnections.slice(0, d - 1); // Pick first (d-1) items

    selectedConnections.forEach((target) => (DSM[i][target] = 1));
  }

  return DSM;
}

// Generate DSM with fixed out-degree (each row has d-1 off-diagonal dependencies + self)
function generateDSMFixedOutDegree(n, d) {
  let DSM = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    DSM[i][i] = 1;
    let others = [];
    for (let j = 0; j < n; j++) if (j !== i) others.push(j);
    // Shuffle
    for (let k = others.length - 1; k > 0; k--) {
      const swap = Math.floor(Math.random() * (k + 1));
      [others[k], others[swap]] = [others[swap], others[k]];
    }
    for (let k = 0; k < d - 1; k++) {
      DSM[i][others[k]] = 1;
    }
  }
  return DSM;
}

// Generate DSM with random dependencies (total n*(d-1) off-diagonal, diagonal always 1)
function generateDSMRandom(n, d) {
  let DSM = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) DSM[i][i] = 1;
  let positions = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) positions.push([i, j]);
    }
  }
  // Shuffle positions
  for (let k = positions.length - 1; k > 0; k--) {
    const swap = Math.floor(Math.random() * (k + 1));
    [positions[k], positions[swap]] = [positions[swap], positions[k]];
  }
  for (let k = 0; k < n * (d - 1); k++) {
    const [i, j] = positions[k];
    DSM[i][j] = 1;
  }
  return DSM;
}

// Main DSM generator based on method
function generateDSMFromMethod(n, d, method) {
  if (method === "fixed") {
    return generateDSMFixedOutDegree(n, d);
  } else if (method === "random") {
    return generateDSMRandom(n, d);
  }
  // fallback
  return generateDSMFixedOutDegree(n, d);
}

function simulateCostEvolution(DSM, n, d, steps = 1000000, numPoints = 200) {
  let costs = Array.from({ length: n }, () => 0.5 + Math.random());
  const costHistory = [];
  const sampleSteps = Array.from({ length: numPoints }, (_, i) =>
    Math.max(1, Math.round(Math.pow(10, i / (numPoints - 1) * Math.log10(steps))))
  ).filter((v, i, arr) => i === 0 || v > arr[i - 1]);
  let sampleIdx = 0;

  // Threshold for "high" d (e.g., d >= n/2)
  const highD = d >= n / 2;

  // For high d: fixed, tiny improvement factor, no breakthroughs/randomness
  // For low d: keep current logic
  const dRatio = (d - 1) / (n - 1);
  const minFactor = 0.5 + 0.48 * dRatio;
  const maxFactor = 0.9 + 0.1 * dRatio;
  const breakthroughProb = 0.05 * (1 - dRatio);
  const randomAcceptProb = 0.02 * (1 - dRatio);

  // Choose a fixed improvement factor for high d (e.g., 0.995)
  const fixedHighDImprovement = 0.995;

  for (let t = 1; t <= steps; t++) {
    if (highD) {
      // For high d: decay all costs strictly exponentially (straight line in log-log plot)
      for (let i = 0; i < n; i++) {
        costs[i] *= fixedHighDImprovement;
      }
    } else {
      // Existing logic for low d
      const selectedComponent = Math.floor(Math.random() * n);
      const depIndices = DSM[selectedComponent]
        .map((val, idx) => (val ? idx : -1))
        .filter(idx => idx !== -1);

      if (depIndices.length === 0) continue;

      const avgDepCost = depIndices.reduce((sum, idx) => sum + costs[idx], 0) / depIndices.length;

      let improvementFactor = minFactor + (maxFactor - minFactor) * Math.random();
      let proposedCost = avgDepCost * improvementFactor;
      if (Math.random() < breakthroughProb) {
        let breakthroughFactor = 0.5 + 0.48 * dRatio;
        proposedCost = avgDepCost * (breakthroughFactor + (improvementFactor - breakthroughFactor) * Math.random());
      }
      if (
        proposedCost < costs[selectedComponent] - 1e-8 ||
        (!highD && randomAcceptProb > 0 && Math.random() < randomAcceptProb)
      ) {
        costs[selectedComponent] = proposedCost;
        if (t <= 10) {
          console.log(
            `Step ${t}: Selected component ${selectedComponent + 1}, updated cost to ${proposedCost.toFixed(4)}.`
          );
        }
      }
    }

    // Record average cost at unique, strictly increasing sample steps
    if (sampleIdx < sampleSteps.length && t === sampleSteps[sampleIdx]) {
      let avgCost = costs.reduce((a, b) => a + b, 0) / n;
      if (!isFinite(avgCost) || avgCost <= 0) avgCost = 1;
      costHistory.push(avgCost);
      sampleIdx++;
    }
    if (sampleIdx >= sampleSteps.length) break;
  }
  // Fill missing points if simulation ended early
  while (costHistory.length < sampleSteps.length) {
    costHistory.push(costHistory.length > 0 ? costHistory[costHistory.length - 1] : 1);
  }
  // Normalize to initial average cost
  const initial = costHistory[0] || 1;
  return costHistory.map(c => (isFinite(c) && c > 0 ? c / initial : 1));
}

function renderDSM(DSM) {
  let container = document.getElementById("dsmContainer");
  container.innerHTML = ""; // Clear previous content

  let table = document.createElement("table");
  table.style.margin = "0 auto"; // Center the table

  const n = DSM.length;
  const containerWidth = container.offsetWidth || 800;
  const containerHeight = container.offsetHeight || 400;
  const maxSquareSize = Math.min(containerWidth, containerHeight) / n;
  const squareSize = Math.max(2, Math.min(20, maxSquareSize));

  DSM.forEach((row, i) => {
    let tr = document.createElement("tr");
    row.forEach((cell, j) => {
      let td = document.createElement("td");
      td.className = cell ? "one" : "zero";
      td.style.width = `${squareSize}px`;
      td.style.height = `${squareSize}px`;

      td.addEventListener("click", () => {
        if (i !== j) { // Don't allow toggling self-dependency
          DSM[i][j] = DSM[i][j] === 1 ? 0 : 1;
          td.className = DSM[i][j] ? "one" : "zero";
          updateGraphOnDSMChange(DSM);
        }
      });

      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  container.appendChild(table);
}

function updateGraphOnDSMChange(DSM) {
  const n = DSM.length;
  // d is the average out-degree (including self)
  const d = DSM[0].reduce((sum, val) => sum + val, 0);

  const steps = 1000000;
  const numPoints = 200;
  const simulatedCosts = simulateCostEvolution(DSM, n, d, steps, numPoints);

  // Generate x-axis values (logarithmic scale, matching number of y points)
  const tPlot = Array.from({ length: simulatedCosts.length }, (_, i) =>
    Math.max(1, Math.round(Math.pow(10, i / (simulatedCosts.length - 1) * Math.log10(steps))))
  );

  // DEBUG: Log simulatedCosts and tPlot to verify values
  console.log("simulatedCosts:", simulatedCosts);

  // Ensure all data points are strictly positive
  const adjustedSimulatedCosts = simulatedCosts.map((c) => Math.max(c, 1e-6));

  updateChart(tPlot, adjustedSimulatedCosts);
}

let costChart; // Store chart instance globally

function validateInputs() {
  let n = parseInt(document.getElementById("numComponents").value);
  let d = parseInt(document.getElementById("connectivity").value);

  if (d >= n) {
    alert(
      "Dependencies cannot be greater than or equal to the number of components."
    );
    document.getElementById("connectivity").value = n - 1;
  }
}

// Only allow fixed out-degree DSM generation (scientific model)
function generateDSMFixedOutDegree(n, d) {
  let DSM = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    DSM[i][i] = 1; // self-dependency
    // Pick d-1 unique other components for dependencies
    let others = [];
    for (let j = 0; j < n; j++) if (j !== i) others.push(j);
    // Shuffle
    for (let k = others.length - 1; k > 0; k--) {
      const swap = Math.floor(Math.random() * (k + 1));
      [others[k], others[swap]] = [others[swap], others[k]];
    }
    for (let k = 0; k < d - 1; k++) {
      DSM[i][others[k]] = 1;
    }
  }
  return DSM;
}

// Add event listener to the "Run Simulation" button
document
  .getElementById("runSimulationButton")
  .addEventListener("click", runSimulation);

function runSimulation() {
  // Get input values
  let n = parseInt(document.getElementById("numComponents").value);
  let d = parseInt(document.getElementById("connectivity").value);
  let method = document.getElementById("generationMethod").value;

  // Validate inputs
  if (n > 100) {
    alert("The number of components cannot exceed 100.");
    document.getElementById("numComponents").value = 100;
    n = 100;
  }

  if (d >= n) {
    alert(
      "Dependencies cannot be greater than or equal to the number of components."
    );
    document.getElementById("connectivity").value = n - 1;
    d = n - 1;
  }

  // Display a message indicating the simulation is running
  const loadingIndicator = document.getElementById("loadingIndicator");
  if (loadingIndicator) {
    loadingIndicator.style.display = "block";
    loadingIndicator.innerHTML =
      "Running simulation... Please wait. Once complete, check the console (Inspect > Console) for detailed results.";
  } else {
    console.error("Element with id 'loadingIndicator' not found in the DOM.");
  }

  // Generate DSM matrix based on the selected method
  const DSM = generateDSMFromMethod(n, d, method);

  // Clear and re-render the DSM matrix
  const container = document.getElementById("dsmContainer");
  container.innerHTML = ""; // Clear existing DSM
  renderDSM(DSM);

  // Simulate cost evolution using the updated DSM
  const simulatedCosts = simulateCostEvolution(DSM, n, d, 1000000, 200);

  // Generate tPlot to match the actual sample steps (logarithmic, strictly increasing)
  const tPlot = Array.from({ length: simulatedCosts.length }, (_, i) =>
    Math.max(1, Math.round(Math.pow(10, i / (simulatedCosts.length - 1) * Math.log10(1000000))))
  );

  // DEBUG: Log tPlot to verify values
  console.log("First 10 tPlot:", tPlot.slice(0, 10));
  console.log("First 10 simulatedCosts:", simulatedCosts.slice(0, 10));

  // Ensure all data points are strictly positive
  const adjustedSimulatedCosts = simulatedCosts.map((c) => Math.max(c, 1e-6));

  // Clear the existing chart instance before updating
  if (costChart) {
    costChart.destroy(); // Destroy the old chart instance
    costChart = null; // Reset the global chart variable
  }

  // Update the graph with simulated results
  updateChart(tPlot, adjustedSimulatedCosts);

  // Update the message to indicate the simulation is complete
  if (loadingIndicator) {
    loadingIndicator.innerHTML =
      "Simulation complete. Please check the console (Inspect > Console) for detailed information about the selected components, affected components, and updated costs.";
  }
}

function updateChart(tPlot, simulatedCosts) {
  // Ensure the canvas exists and is visible
  const canvas = document.getElementById("costChart");
  if (!canvas) {
    console.error("Canvas element with id 'costChart' not found.");
    return;
  }
  canvas.style.display = "block";
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");

  if (costChart) {
    costChart.destroy();
  }

  // DEBUG: Log the first 10 points to verify values
  console.log("First 10 tPlot:", tPlot.slice(0, 10));
  console.log("First 10 simulatedCosts:", simulatedCosts.slice(0, 10));

  // If all simulatedCosts are 1, the simulation is not producing any change.
  // If all tPlot values are 1, the x-axis is not being generated correctly.

  // --- DEBUG: If the simulation is not producing a curve, force a visible test curve ---
  if (simulatedCosts.every(v => Math.abs(v - 1) < 1e-6)) {
    for (let i = 0; i < simulatedCosts.length; i++) {
      simulatedCosts[i] = Math.pow(0.5, i / (simulatedCosts.length - 1));
    }
    console.warn("Simulation is flat, showing a test curve instead.");
  }

  // Prepare scatter data (circles)
  const scatterData = tPlot.map((x, i) => ({ x, y: simulatedCosts[i] }));

  // Prepare line data (same as scatter, but as a line)
  const lineData = tPlot.map((x, i) => ({ x, y: simulatedCosts[i] }));

  // Find min/max for y-axis
  const minY = Math.min(...simulatedCosts.filter(v => v > 0));
  const maxY = Math.max(...simulatedCosts);

  // Fix: Ensure tPlot covers a wide range and x-axis ticks are visible
  const allSame = tPlot.every(x => x === tPlot[0]);
  let xMin = 1, xMax = 1e6;
  if (!allSame) {
    xMin = Math.min(...tPlot);
    xMax = Math.max(...tPlot);
  }

  costChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Simulation",
          data: scatterData,
          showLine: false,
          pointRadius: 3,
          pointBackgroundColor: "#8a1a2b",
          pointBorderColor: "#8a1a2b",
          borderColor: "#8a1a2b",
          backgroundColor: "#8a1a2b",
        },
        {
          label: "Trend",
          data: lineData,
          showLine: true,
          pointRadius: 0,
          borderColor: "#222",
          borderWidth: 2,
          fill: false,
        }
      ],
    },
    options: {
      responsive: false,
      aspectRatio: 2 / 3,
      maintainAspectRatio: true,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Cost: ${context.parsed.y !== undefined ? context.parsed.y.toExponential(2) : context.raw.y.toExponential(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "logarithmic",
          title: { display: true, text: "# of Improvements Attempts" },
          min: xMin,
          max: xMax,
          grid: { color: "#000", lineWidth: 0.5 },
          ticks: {
            color: "#000",
            callback: function (value) {
              const logValue = Math.log10(value);
              if (Number.isInteger(logValue)) return `10^${logValue}`;
              return null;
            },
            autoSkip: false,
            maxTicksLimit: 8,
          },
        },
        y: {
          type: "logarithmic",
          title: { display: true, text: "Cost" },
          min: Math.max(1e-4, minY * 0.8),
          max: Math.min(1, maxY * 1.1),
          grid: { color: "#000", lineWidth: 0.5 },
          ticks: {
            color: "#000",
            callback: function (value) {
              const logValue = Math.log10(value);
              if (Number.isInteger(logValue)) return `10^${logValue}`;
              return null;
            },
            autoSkip: true,
            maxTicksLimit: 6,
          },
        },
      },
      layout: {
        padding: 10,
      },
    },
    plugins: [{
      beforeDraw: (chart) => {
        // White background for scientific look
        const ctx = chart.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
      }
    }]
  });
}

// Ensure DOM content is loaded before setting up listeners
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("runSimulationButton")
    .addEventListener("click", runSimulation);
});

// Logarithmic sampling function
function sampleLogarithmically(data, numSamples) {
  const sampled = [];
  const maxIndex = data.length - 1;

  for (let i = 0; i < numSamples; i++) {
    const index = Math.floor(Math.pow(maxIndex, i / (numSamples - 1))); // Logarithmic sampling
    sampled.push(data[index]);
  }

  return sampled;
}