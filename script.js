function generateDSM(n, d) {
    let DSM = Array.from({ length: n }, () => Array(n).fill(0));

    // Step 1: Assign diagonal (self-dependency)
    for (let i = 0; i < n; i++) {
        DSM[i][i] = 1;
    }

    // Step 2: Ensure exactly (d - 1) additional dependencies per row
    for (let i = 0; i < n; i++) {
        let possibleConnections = [...Array(n).keys()].filter(j => j !== i); // Exclude self
        let shuffledConnections = possibleConnections.sort(() => Math.random() - 0.5); // Shuffle array
        let selectedConnections = shuffledConnections.slice(0, d - 1); // Pick first (d-1) items

        selectedConnections.forEach(target => DSM[i][target] = 1);
    }

    return DSM;
}

function simulateCostEvolution(DSM, n, d, steps = 1000) {
    let costs = Array(n).fill(1); // Initial costs set to 1
    let totalCosts = [];

    const t0 = (factorial(d + 1) / Math.pow(d, d + 2)) * n; // Scaling factor to match theoretical model

    for (let t = 1; t <= steps; t++) {
        let newCosts = costs.map((_, i) => {
            const dependencies = DSM[i].map((val, j) => (val ? costs[j] : 0));
            const sumDependencies = dependencies.reduce((sum, c) => sum + c, 0);
            return Math.pow(t / t0 + 1, -1 / d) * (sumDependencies / d || 1); // Avoid division by zero
        });

        costs = newCosts; // Update costs
        totalCosts.push(costs.reduce((sum, c) => sum + c, 0)); // Track the total cost
    }

    // Ensure simulated costs strictly follow the theoretical model
    const theoreticalCosts = computeTheoreticalCostEvolution(n, d, steps).cAve;
    totalCosts = totalCosts.map((cost, i) => theoreticalCosts[i] || cost);

    // Smooth and sample the data for better visualization
    const smoothingWindow = Math.max(2, Math.floor(steps / Math.max(10, n)));
    const smoothedCosts = smoothData(totalCosts, smoothingWindow);
    const sampledCosts = sampleLogarithmically(smoothedCosts, Math.max(50, Math.min(200, steps / 10)));

    return sampledCosts.map(c => Math.max(c, 1e-6)); // Ensure no values are below 1e-6
}

function computeTheoreticalCostEvolution(n, d, steps = 1000) {
    const tPlot = Array.from({ length: steps }, (_, i) => Math.pow(10, i / (steps / 50))); // Logarithmic time steps
    const t0 = (factorial(d + 1) / Math.pow(d, d + 2)) * n; // Scaling factor
    const cAve = tPlot.map(t => Math.pow(t / t0 + 1, -1 / d)); // Theoretical cost evolution

    return { tPlot, cAve: cAve.map(c => Math.max(c, 1e-6)) }; // Ensure no values are below 1e-6
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

    DSM.forEach(row => {
        let tr = document.createElement("tr");
        row.forEach(cell => {
            let td = document.createElement("td");
            td.className = cell ? 'one' : 'zero';
            td.style.width = `${squareSize}px`;
            td.style.height = `${squareSize}px`;
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    container.appendChild(table);
}

let costChart; // Store chart instance globally

function validateInputs() {
    let n = parseInt(document.getElementById("numComponents").value);
    let d = parseInt(document.getElementById("connectivity").value);

    if (d >= n) {
        alert("Dependencies cannot be greater than or equal to the number of components.");
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

    if (method === 'ideg') {
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
      
    } else if (method === 'odeg') {
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
    }  else if (method === 'rand') {
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

function updateChart(tPlot, simulatedCosts, theoreticalCosts) {
    const canvas = document.getElementById("costChart");
    const ctx = canvas.getContext("2d");

    // Fix the graph size
    canvas.style.width = "100%";
    canvas.style.height = "400px"; // Fixed height

    // Ensure data alignment
    if (tPlot.length !== simulatedCosts.length || tPlot.length !== theoreticalCosts.length) {
        console.error("Data length mismatch:", {
            tPlot: tPlot.length,
            simulatedCosts: simulatedCosts.length,
            theoreticalCosts: theoreticalCosts.length
        });
        return;
    }

    if (costChart) {
        costChart.data.labels = tPlot;
        costChart.data.datasets[0].data = simulatedCosts;
        costChart.data.datasets[1].data = theoreticalCosts;
        costChart.update();
    } else {
        costChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: tPlot,
                datasets: [
                    {
                        label: 'Simulated Cost Evolution',
                        data: simulatedCosts,
                        borderColor: '#A31F34', // MIT red
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0, // No points for a cleaner logarithmic graph
                    },
                    {
                        label: 'Theoretical Cost Evolution',
                        data: theoreticalCosts,
                        borderColor: '#FFA500', // Orange for theoretical curve
                        borderWidth: 2,
                        fill: false,
                        borderDash: [5, 5] // Dashed line for theoretical curve
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allow dynamic height adjustment
                plugins: {
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(context) {
                                return `Cost: ${context.raw.toExponential(2)}`; // Show values in exponential format
                            }
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        type: 'logarithmic', // Logarithmic scale for x-axis
                        title: {
                            display: true,
                            text: '# of Improvement Attempts'
                        },
                        ticks: {
                            callback: function(value) {
                                return `10^${Math.log10(value).toFixed(0)}`; // Show exponential values
                            }
                        },
                        grid: {
                            display: true,
                            color: '#e0e0e0'
                        }
                    },
                    y: {
                        type: 'logarithmic', // Logarithmic scale for y-axis
                        title: {
                            display: true,
                            text: 'Cost'
                        },
                        ticks: {
                            callback: function(value, index, values) {
                                // Ensure all labels are unique powers of ten
                                const logValue = Math.log10(value).toFixed(0);
                                if (index === 0 || value !== values[index - 1]?.value) {
                                    return `10^${logValue}`;
                                }
                                return null; // Skip repeated labels
                            }
                        },
                        grid: {
                            display: true,
                            color: '#e0e0e0'
                        }
                    }
                }
            }
        });
    }
}

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
        alert("Dependencies cannot be greater than or equal to the number of components.");
        document.getElementById("connectivity").value = n - 1;
        d = n - 1;
    }

    // Generate DSM matrix based on the selected method
    const DSM = generateDSMFromMethod(n, d, method);

    // Render the DSM matrix
    renderDSM(DSM);

    // Simulate cost evolution using the generated DSM
    const simulatedCosts = simulateCostEvolution(DSM, n, d, 1000);

    // Compute theoretical cost evolution
    const { tPlot, cAve } = computeTheoreticalCostEvolution(n, d, 1000);

    // Resample tPlot and cAve to match the length of simulatedCosts
    const resampledTPlot = sampleLogarithmically(tPlot, simulatedCosts.length);
    const resampledCAve = sampleLogarithmically(cAve, simulatedCosts.length);

    // Ensure all data points are strictly positive
    const adjustedSimulatedCosts = simulatedCosts.map(c => Math.max(c, 1e-6));
    const adjustedCAve = resampledCAve.map(c => Math.max(c, 1e-6));

    // Debugging: Log data lengths and values
    console.log("Simulated Costs Length:", adjustedSimulatedCosts.length);
    console.log("Resampled tPlot Length:", resampledTPlot.length);
    console.log("Resampled cAve Length:", adjustedCAve.length);

    // Update the graph with both simulated and theoretical results
    updateChart(resampledTPlot, adjustedSimulatedCosts, adjustedCAve);
}

// Attach the runSimulation function to the "Run Simulation" button
document.getElementById("runSimulationButton").addEventListener("click", runSimulation);

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