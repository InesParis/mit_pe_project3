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

function simulateCostEvolution(DSM, n, d, steps = 10) {
  let costs = Array(n).fill(1); // Initial costs set to 1
  const logSteps = []; // Array to store logs for each step

  for (let t = 1; t <= steps; t++) {
    // Randomly select a component to improve
    const selectedComponent = Math.floor(Math.random() * n);

    // Calculate the cost improvement for the selected component
    const dependencies = DSM[selectedComponent].map((val, j) =>
      val ? costs[j] : 0
    );
    const sumDependencies = dependencies.reduce((sum, c) => sum + c, 0);
    const newCost = sumDependencies / d || 1; // Avoid division by zero

    // Check if the new cost is cheaper
    if (newCost < costs[selectedComponent]) {
      // Update the cost of the selected component
      costs[selectedComponent] = newCost;

      // Propagate changes to dependent components
      const affectedComponents = [];
      DSM.forEach((row, i) => {
        if (row[selectedComponent] === 1 && i !== selectedComponent) {
          costs[i] = Math.min(costs[i], newCost); // Update cost if cheaper
          affectedComponents.push(i);
        }
      });

      // Log the step
      logSteps.push(
        `Step ${t}: Selected component ${selectedComponent + 1}, updated cost to ${newCost.toFixed(
          2
        )}. Affected components: ${affectedComponents
          .map((c) => c + 1)
          .join(", ")}`
      );
    } else {
      // Log the step if no improvement was made
      logSteps.push(
        `Step ${t}: Selected component ${selectedComponent + 1}, no improvement.`
      );
    }
  }

  // Print the log steps
  console.log("Simulation Steps:");
  logSteps.forEach((log) => console.log(log));

  // Display a message on the page
  const loadingIndicator = document.getElementById("loadingIndicator");
  loadingIndicator.style.display = "block";
  loadingIndicator.innerHTML =
    "Simulation complete. Please check the console (Inspect > Console) for detailed information.";

  return costs; // Return the final costs for reference
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

  // Dynamically adjust line width and point radius for better readability
  const lineWidth = 2; // Thinner lines for a cleaner look
  const pointRadius = 3; // Smaller points for better visibility

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
        duration: 800, // Smooth animation for updates
        easing: "easeInOutQuad", // Elegant easing for transitions
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
          labels: {
            font: {
              size: 14, // Slightly larger font for readability
              family: "Arial, sans-serif", // Clean font
            },
          },
        },
      },
      scales: {
        x: {
          type: "logarithmic",
          title: {
            display: true,
            text: "# of Improvement Attempts",
            font: {
              size: 16, // Larger font for axis title
              family: "Arial, sans-serif",
            },
          },
          ticks: {
            callback: function (value) {
              return `10^${Math.log10(value).toFixed(0)}`;
            },
            font: {
              size: 12, // Clean font size for ticks
            },
          },
          grid: {
            display: true,
            color: "#e0e0e0", // Subtle grid lines
          },
        },
        y: {
          type: "logarithmic",
          title: {
            display: true,
            text: "Cost",
            font: {
              size: 16, // Larger font for axis title
              family: "Arial, sans-serif",
            },
          },
          ticks: {
            callback: function (value) {
              const logValue = Math.log10(value);
              if (Number.isInteger(logValue)) {
                return `10^${logValue}`;
              }
              return null; // Skip non-integer powers of ten
            },
            font: {
              size: 12, // Clean font size for ticks
            },
          },
          grid: {
            display: true,
            color: "#e0e0e0", // Subtle grid lines
          },
          min: Math.min(...simulatedCosts.concat(theoreticalCosts)) * 0.9, // Dynamically adjust min
          max: Math.max(...simulatedCosts.concat(theoreticalCosts)) * 1.1, // Dynamically adjust max
        },
      },
      elements: {
        line: {
          borderWidth: lineWidth, // Thinner lines
        },
        point: {
          radius: pointRadius, // Smaller points
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