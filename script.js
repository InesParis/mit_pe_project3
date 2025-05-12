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

function simulateCostEvolution(DSM, n, d, steps = 3000) { // Increased steps for more data points
  let costs = Array(n).fill(1); // Initial costs set to 1
  const logSteps = [];
  const timeFactor = (factorial(d + 1) / Math.pow(d, d + 2)) * n; // Scaling factor for alignment

  for (let t = 1; t <= steps; t++) {
    const selectedComponent = Math.floor(Math.random() * n);
    const dependencies = DSM[selectedComponent].map((val, j) =>
      val ? costs[j] : 0
    );
    const sumDependencies = dependencies.reduce((sum, c) => sum + c, 0);
    const newCost = sumDependencies / d || 1;

    const adjustedNewCost = newCost * (1 - Math.random() * 0.05);

    if (adjustedNewCost < costs[selectedComponent]) {
      costs[selectedComponent] = adjustedNewCost;

      // Propagate changes to dependent components
      DSM.forEach((row, i) => {
        if (row[selectedComponent] === 1 && i !== selectedComponent) {
          if (costs[i] > adjustedNewCost) {
            costs[i] = adjustedNewCost;
          }
        }
      });
    } else {
      costs[selectedComponent] *= 0.99;
    }
  }

  // Normalize costs to initial value for "pregnant tummy" effect
  const initialCost = costs[0]; // Normalize to the first cost value
  return costs.map((c) => c / initialCost);
}

function computeTheoreticalCostEvolution(n, d, steps = 1000) {
  const tPlot = Array.from({ length: steps }, (_, i) =>
    Math.pow(10, i / (steps / 50))
  );
  const t0 = (factorial(d + 1) / Math.pow(d, d + 2)) * n;
  const cAve = tPlot.map((t) => Math.pow(t / t0 + 1, -1 / d));

  // Normalize theoretical costs for alignment
  const maxCAve = Math.max(...cAve);
  return { tPlot, cAve: cAve.map((c) => c / maxCAve).map((c) => Math.max(c, 1e-6)) };
}

function renderDSM(DSM) {
  let container = document.getElementById("dsmContainer");
  container.innerHTML = "<h2>Generated DSM</h2>";
  let table = document.createElement("table");

  // Dynamically calculate square size based on the number of components and container size
  const n = DSM.length;
  const containerWidth = container.offsetWidth || 800; // Default to 800px if width is not available
  const containerHeight = container.offsetHeight || 400; // Default to 400px if height is not available
  const maxSquareSize = Math.min(containerWidth, containerHeight) / n; // Fit squares within container
  const squareSize = Math.max(2, Math.min(20, maxSquareSize)); // Ensure a minimum size of 2px and a maximum of 20px

  DSM.forEach((row, i) => {
    let tr = document.createElement("tr");
    row.forEach((cell, j) => {
      let td = document.createElement("td");
      td.className = cell ? "one" : "zero";
      td.style.width = `${squareSize}px`;
      td.style.height = `${squareSize}px`;

      // Add click event listener to toggle cell state
      td.addEventListener("click", () => {
        DSM[i][j] = DSM[i][j] === 1 ? 0 : 1; // Toggle between 1 and 0
        td.className = DSM[i][j] ? "one" : "zero"; // Update cell class
        updateGraphOnDSMChange(DSM); // Trigger graph update
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

  // Recalculate simulated costs with more steps for better resolution
  const steps = 3000;
  const simulatedCosts = simulateCostEvolution(DSM, n, d, steps);

  // Generate x-axis values (logarithmic scale)
  const tPlot = Array.from({ length: steps }, (_, i) =>
    Math.pow(10, i / (steps / 50))
  );
  const resampledTPlot = sampleLogarithmically(tPlot, simulatedCosts.length);

  // Ensure all data points are strictly positive
  const adjustedSimulatedCosts = simulatedCosts.map((c) => Math.max(c, 1e-6));

  // Update the chart with the new data
  updateChart(resampledTPlot, adjustedSimulatedCosts);
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
  const simulatedCosts = simulateCostEvolution(DSM, n, d, 3000);

  // Generate x-axis values (logarithmic scale)
  const tPlot = Array.from({ length: 3000 }, (_, i) =>
    Math.pow(10, i / (3000 / 50))
  );
  const resampledTPlot = sampleLogarithmically(tPlot, simulatedCosts.length);

  // Ensure all data points are strictly positive
  const adjustedSimulatedCosts = simulatedCosts.map((c) => Math.max(c, 1e-6));

  // Clear the existing chart instance before updating
  if (costChart) {
    costChart.destroy(); // Destroy the old chart instance
    costChart = null; // Reset the global chart variable
  }

  // Update the graph with simulated results
  updateChart(resampledTPlot, adjustedSimulatedCosts);

  // Update the message to indicate the simulation is complete
  if (loadingIndicator) {
    loadingIndicator.innerHTML =
      "Simulation complete. Please check the console (Inspect > Console) for detailed information about the selected components, affected components, and updated costs.";
  }
}

function updateChart(tPlot, simulatedCosts) {
  const canvas = document.getElementById("costChart");
  // Set canvas aspect ratio to 2:3
  canvas.width = 600;
  canvas.height = 400;

  const ctx = canvas.getContext("2d");
  const lineWidth = 3; // Slightly wider line for better visibility
  const pointRadius = 2;

  // Destroy the existing chart instance if it exists
  if (costChart) {
    costChart.destroy();
  }

  // Ensure y-axis min is always positive and never negative
  const minY = Math.max(1e-6, Math.min(...simulatedCosts) * 0.9);
  const maxY = Math.max(...simulatedCosts) * 1.1;

  costChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: tPlot,
      datasets: [
        {
          label: "Simulated Cost Evolution",
          data: simulatedCosts,
          borderColor: "#A31F34", // MIT red
          borderWidth: lineWidth,
          fill: false,
          pointRadius: pointRadius,
        },
      ],
    },
    options: {
      responsive: false,
      aspectRatio: 2 / 3,
      maintainAspectRatio: true,
      animation: {
        duration: 800,
        easing: "easeInOutQuad",
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Cost: ${context.raw.toExponential(2)}`;
            },
          },
        },
        legend: {
          display: false, // Remove legend since there's only one line
        },
      },
      scales: {
        x: {
          type: "logarithmic",
          title: {
            display: true,
            text: "# of Improvement Attempts",
          },
          ticks: {
            callback: function (value, index) {
              const logValue = Math.log10(value);
              return Number.isInteger(logValue) ? `10^${logValue}` : "";
            },
          },
        },
        y: {
          type: "logarithmic",
          title: {
            display: true,
            text: "Cost",
          },
          min: minY,
          max: maxY,
          ticks: {
            callback: function (value) {
              const logValue = Math.log10(value);
              if (Number.isInteger(logValue)) {
                return `10^${logValue}`;
              }
              return null;
            },
          },
        },
      },
    },
  });
}

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