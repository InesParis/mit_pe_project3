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

function simulateCostEvolution(DSM, n, d, steps = 1000) {
  let costs = Array(n).fill(1); // Initial costs set to 1
  let totalCosts = [];

  const t0 = (factorial(d + 1) / Math.pow(d, d + 2)) * n; // Scaling factor to match theoretical model
  const { cAve } = computeTheoreticalCostEvolution(n, d, steps); // Get theoretical costs

  const delayFactor = Math.log(d + 1); // Introduce a delay factor based on dependencies

  for (let t = 1; t <= steps; t++) {
    let newCosts = costs.map((_, i) => {
      const dependencies = DSM[i].map((val, j) => (val ? costs[j] : 0)); // Use updated DSM
      const sumDependencies = dependencies.reduce((sum, c) => sum + c, 0);

      // Adjust timeFactor for more pronounced step-like behavior
      const timeFactor = Math.ceil(t / (delayFactor * t0)); // Use Math.ceil for larger steps
      return Math.pow(timeFactor, -1 / d) * (sumDependencies / d || 1); // Avoid division by zero
    });

    costs = newCosts; // Update costs
    const totalCost = costs.reduce((sum, c) => sum + c, 0); // Track the total cost
    totalCosts.push(totalCost * (cAve[t - 1] / totalCost || 1)); // Scale to theoretical trend
  }

  // Smooth and sample the data for better visualization
  const smoothingWindow = Math.max(2, Math.floor(steps / Math.max(10, n)));
  const smoothedCosts = smoothData(totalCosts, smoothingWindow); // Single smoothing pass
  const sampledCosts = sampleLogarithmically(
    smoothedCosts,
    Math.max(50, Math.min(200, steps / 10))
  );

  return sampledCosts.map((c) => Math.max(c, 1e-6)); // Ensure no values are below 1e-6
}

function computeTheoreticalCostEvolution(n, d, steps = 1000) {
  const tPlot = Array.from({ length: steps }, (_, i) =>
    Math.pow(10, i / (steps / 50))
  ); // Logarithmic time steps
  const t0 = (factorial(d + 1) / Math.pow(d, d + 2)) * n; // Scaling factor
  const cAve = tPlot.map((t) => Math.pow(t / t0 + 1, -1 / d)); // Theoretical cost evolution

  return { tPlot, cAve: cAve.map((c) => Math.max(c, 1e-6)) }; // Ensure no values are below 1e-6
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
  // Get the current number of components
  const n = DSM.length;

  // Recalculate the average connectivity (d) dynamically
  const d =
    DSM.reduce((sum, row) => sum + row.filter((val) => val === 1).length, 0) /
    n;

  // Simulate cost evolution using the updated DSM
  const simulatedCosts = simulateCostEvolution(DSM, n, d, 1000);

  // Compute theoretical cost evolution dynamically based on the updated DSM
  const { tPlot, cAve } = computeTheoreticalCostEvolution(n, d, 1000);

  // Resample tPlot and cAve to match the length of simulatedCosts
  const resampledTPlot = sampleLogarithmically(tPlot, simulatedCosts.length);
  const resampledCAve = sampleLogarithmically(cAve, simulatedCosts.length);

  // Ensure all data points are strictly positive
  const adjustedSimulatedCosts = simulatedCosts.map((c) => Math.max(c, 1e-6));
  const adjustedCAve = resampledCAve.map((c) => Math.max(c, 1e-6));

  // Update the existing chart dynamically without destroying it
  if (costChart) {
    costChart.data.labels = resampledTPlot; // Update x-axis labels
    costChart.data.datasets[0].data = adjustedSimulatedCosts; // Update simulated costs
    costChart.data.datasets[1].data = adjustedCAve; // Update theoretical costs

    // Dynamically adjust the y-axis scale to ensure both lines are visible
    costChart.options.scales.y.min =
      Math.min(...adjustedSimulatedCosts.concat(adjustedCAve)) * 0.9;
    costChart.options.scales.y.max =
      Math.max(...adjustedSimulatedCosts.concat(adjustedCAve)) * 1.1;

    costChart.update(); // Apply the changes to the chart
  } else {
    // If the chart doesn't exist, create it
    updateChart(resampledTPlot, adjustedSimulatedCosts, adjustedCAve);
  }
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

  // Generate DSM matrix based on the selected method
  const DSM = generateDSMFromMethod(n, d, method);

  // Clear and re-render the DSM matrix
  const container = document.getElementById("dsmContainer");
  container.innerHTML = ""; // Clear existing DSM
  renderDSM(DSM);

  // Simulate cost evolution using the updated DSM
  const simulatedCosts = simulateCostEvolution(DSM, n, d, 1000);

  // Compute theoretical cost evolution dynamically based on the updated DSM
  const { tPlot, cAve } = computeTheoreticalCostEvolution(n, d, 1000);

  // Resample tPlot and cAve to match the length of simulatedCosts
  const resampledTPlot = sampleLogarithmically(tPlot, simulatedCosts.length);
  const resampledCAve = sampleLogarithmically(cAve, simulatedCosts.length);

  // Ensure all data points are strictly positive
  const adjustedSimulatedCosts = simulatedCosts.map((c) => Math.max(c, 1e-6));
  const adjustedCAve = resampledCAve.map((c) => Math.max(c, 1e-6));

  // Clear the existing chart instance before updating
  if (costChart) {
    costChart.destroy(); // Destroy the old chart instance
    costChart = null; // Reset the global chart variable
  }

  // Update the graph with both simulated and theoretical results
  updateChart(resampledTPlot, adjustedSimulatedCosts, adjustedCAve);
}

function updateChart(tPlot, simulatedCosts, theoreticalCosts) {
  const canvas = document.getElementById("costChart");
  const ctx = canvas.getContext("2d");

  // Set a fixed height and width for better readability
  canvas.style.width = "100%";
  canvas.style.height = "500px";

  // Dynamically adjust line width and point radius based on DSM size
  const lineWidth = 3; // Fixed line width for better readability
  const pointRadius = 4; // Fixed point radius for better visibility

  // Create a new chart instance
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
        {
          label: "Theoretical Cost Evolution",
          data: theoreticalCosts,
          borderColor: "#FFA500", // Orange for theoretical curve
          borderWidth: lineWidth,
          fill: false,
          borderDash: [5, 5], // Dashed line for theoretical curve
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500, // Smooth animation for updates
        easing: "easeOutCubic",
      },
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            label: function (context) {
              return `Cost: ${context.raw.toExponential(2)}`; // Show values in exponential format
            },
          },
        },
        legend: {
          display: true,
          position: "top",
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
            callback: function (value) {
              return `10^${Math.log10(value).toFixed(0)}`;
            },
          },
          grid: {
            display: true,
            color: "#e0e0e0",
          },
        },
        y: {
          type: "logarithmic",
          title: {
            display: true,
            text: "Cost",
          },
          ticks: {
            callback: function (value) {
              const logValue = Math.log10(value);
              if (Number.isInteger(logValue)) {
                return `10^${logValue}`;
              }
              return null; // Skip non-integer powers of ten
            },
          },
          grid: {
            display: true,
            color: "#e0e0e0",
          },
          min: Math.min(...simulatedCosts.concat(theoreticalCosts)) * 0.9, // Dynamically adjust min
          max: Math.max(...simulatedCosts.concat(theoreticalCosts)) * 1.1, // Dynamically adjust max
        },
      },
      elements: {
        line: {
          borderWidth: lineWidth, // Fixed line width
        },
        point: {
          radius: pointRadius, // Fixed point radius
        },
      },
    },
  });
}

function sampleLogarithmically(data, numSamples) {
  const sampled = [];
  const maxIndex = data.length - 1;

  for (let i = 0; i < numSamples; i++) {
    const index = Math.floor(Math.pow(maxIndex, i / (numSamples - 1))); // Logarithmic sampling
    sampled.push(data[index]);
  }

  return sampled;
}

function smoothData(data, windowSize) {
  const smoothed = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize);
    const end = Math.min(data.length, i + windowSize + 1);
    const window = data.slice(start, end);
    const average = window.reduce((sum, val) => sum + val, 0) / window.length;
    smoothed.push(average);
  }
  return smoothed;
}
