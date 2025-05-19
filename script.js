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

function simulateCostEvolution(DSM, n, d, steps = 1000000, numPoints = 200) {
  let costs = Array(n).fill(1);
  const costHistory = [];
  // Logarithmically spaced sample points
  const logMin = Math.log10(1);
  const logMax = Math.log10(steps);
  const sampleSteps = Array.from({ length: numPoints }, (_, i) =>
    Math.round(Math.pow(10, logMin + (logMax - logMin) * (i / (numPoints - 1))))
  );
  let sampleIdx = 0;

  for (let t = 1; t <= steps; t++) {
    const selectedComponent = Math.floor(Math.random() * n);
    const dependencies = DSM[selectedComponent].map((val, j) =>
      val ? costs[j] : 0
    );
    const sumDependencies = dependencies.reduce((sum, c) => sum + c, 0);
    const newCost = sumDependencies / d || 1;
    const adjustedNewCost = newCost * (1 - Math.random() * 0.05);

    let affectedComponents = [];
    if (adjustedNewCost < costs[selectedComponent]) {
      costs[selectedComponent] = adjustedNewCost;
      DSM.forEach((row, i) => {
        if (row[selectedComponent] === 1 && i !== selectedComponent) {
          if (costs[i] > adjustedNewCost) {
            costs[i] = adjustedNewCost;
            affectedComponents.push(i + 1); // 1-based index
          }
        }
      });
      // Log selected, affected components, and updated cost
      if (t <= 10) {
        console.log(
          `Step ${t}: Selected component ${selectedComponent + 1}, updated cost to ${adjustedNewCost.toFixed(4)}. Affected components: ${affectedComponents.join(", ")}`
        );
      }
    } else {
      costs[selectedComponent] *= 0.99;
      if (t <= 10) {
        console.log(
          `Step ${t}: Selected component ${selectedComponent + 1}, forced slight improvement.`
        );
      }
    }

    // Record average cost at logarithmically spaced steps
    if (t === sampleSteps[sampleIdx]) {
      costHistory.push(costs.reduce((a, b) => a + b, 0) / n);
      sampleIdx++;
    }
    if (sampleIdx >= sampleSteps.length) break;
  }
  // Fill missing points if simulation ended early
  while (costHistory.length < numPoints) {
    costHistory.push(costHistory.length > 0 ? costHistory[costHistory.length - 1] : 1);
  }
  // Normalize to initial average cost
  const initial = costHistory[0] || 1;
  return costHistory.map(c => c / initial);
}

function renderDSM(DSM) {
  let container = document.getElementById("dsmContainer");
  container.innerHTML = ""; // Clear previous content

  // Create and append the title above the table
  const title = document.createElement("h2");
  title.textContent = "Generated DSM";
  title.style.textAlign = "center";
  container.appendChild(title);

  let table = document.createElement("table");

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
        DSM[i][j] = DSM[i][j] === 1 ? 0 : 1;
        td.className = DSM[i][j] ? "one" : "zero";
        updateGraphOnDSMChange(DSM);
      });

      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  container.appendChild(table);
}

function updateGraphOnDSMChange(DSM) {
  const n = DSM.length;
  const d =
    DSM.reduce((sum, row) => sum + row.filter((val) => val === 1).length, 0) / n;

  const steps = 1000000; // 1e6 for wide x-axis
  const numPoints = 200; // More points for smoothness
  const simulatedCosts = simulateCostEvolution(DSM, n, d, steps, numPoints);

  // Generate x-axis values (logarithmic scale, matching number of y points)
  const tPlot = Array.from({ length: simulatedCosts.length }, (_, i) =>
    Math.pow(10, i / (simulatedCosts.length - 1) * 6) // log10(steps)=6 for 1e6
  );

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

// Function to generate DSM matrix based on the specified method
function generateDSMFromMethod(n, d, method) {
  let DSM = Array.from({ length: n }, () => Array(n).fill(false));

  // Set diagonal elements to true (self-dependency)
  for (let i = 0; i < n; i++) {
    DSM[i][i] = true;
  }

  if (method === "ideg") {
    // Fixed in-degree method
    for (let i = 0; i < n; i++) {
      let count = 0;
      while (count < d - 1) {
        const j = Math.floor(Math.random() * n);
        if (i !== j && !DSM[j][i]) {
          DSM[j][i] = true;
          count++;
        }
      }
    }
  } else if (method === "odeg") {
    // Fixed out-degree method
    for (let i = 0; i < n; i++) {
      let count = 0;
      while (count < d - 1) {
        const j = Math.floor(Math.random() * n);
        if (i !== j && !DSM[i][j]) {
          DSM[i][j] = true;
          count++;
        }
      }
    }
  } else if (method === "rand") {
    // Random method
    let positions = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) positions.push([i, j]);
      }
    }
    positions = positions.sort(() => Math.random() - 0.5); // Shuffle
    for (let k = 0; k < n * (d - 1); k++) {
      const [i, j] = positions[k];
      DSM[i][j] = true;
    }
  }

  return DSM;
}

// Factorial helper function
function factorial(num) {
  if (num === 0 || num === 1) return 1;
  return num * factorial(num - 1);
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

  // Generate x-axis values (logarithmic scale, matching number of y points)
  const tPlot = Array.from({ length: simulatedCosts.length }, (_, i) =>
    Math.pow(10, i / (simulatedCosts.length - 1) * 6)
  );

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

  // Ensure at least two points for plotting
  if (simulatedCosts.length < 2) {
    // Fill with last known value if needed
    while (simulatedCosts.length < 2) {
      simulatedCosts.push(simulatedCosts.length > 0 ? simulatedCosts[simulatedCosts.length - 1] : 1);
    }
  }
  if (tPlot.length < 2) {
    while (tPlot.length < 2) {
      tPlot.push(tPlot.length > 0 ? tPlot[tPlot.length - 1] + 1 : 2);
    }
  }

  // Use scatter mode with {x, y} pairs for log-log plot
  const dataPoints = tPlot.map((x, i) => ({ x, y: simulatedCosts[i] }));

  if (dataPoints.length < 2) {
    alert("Simulation did not produce enough valid data points to plot a line. Try changing the DSM parameters.");
    return;
  }

  costChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Simulated Cost Evolution",
          data: dataPoints,
          borderColor: "#000",
          backgroundColor: "#000",
          fill: false,
          pointRadius: 2,
          pointStyle: "circle",
          borderWidth: 2,
          tension: 0,
          showLine: true,
        }
      ],
    },
    options: {
      responsive: false,
      aspectRatio: 2 / 3,
      maintainAspectRatio: true,
      animation: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Cost: ${context.parsed.y !== undefined ? context.parsed.y.toExponential(2) : context.raw.y.toExponential(2)}`;
            },
          },
        },
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          type: "logarithmic",
          title: {
            display: true,
            text: "# of Improvements Attempts",
          },
          min: 1,
          max: 1e6,
          ticks: {
            callback: function (value) {
              const logValue = Math.log10(value);
              if (Number.isInteger(logValue)) {
                return `10^${logValue}`;
              }
              return null;
            },
            autoSkip: true,
            maxTicksLimit: 6,
          },
        },
        y: {
          type: "logarithmic",
          title: {
            display: true,
            text: "Cost",
          },
          min: 1e-3,
          max: 1,
          ticks: {
            callback: function (value) {
              const logValue = Math.log10(value);
              if (Number.isInteger(logValue)) {
                return `10^${logValue}`;
              }
              return null;
            },
            autoSkip: true,
            maxTicksLimit: 6,
          },
        },
      },
    },
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