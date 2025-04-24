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
    let costs = Array(n).fill(1 / n); // Initial costs evenly distributed
    let totalCosts = [];

    for (let t = 1; t <= steps; t++) {
        let i = Math.floor(Math.random() * n);
        let Ai = DSM[i].map((val, j) => (val ? j : -1)).filter(j => j !== -1);

        let newCosts = [...costs];
        let sumAi = Ai.reduce((sum, j) => sum + costs[j], 0);

        Ai.forEach(j => {
            let cNew = Math.random() * costs[j];
            newCosts[j] = cNew;
        });

        let newSumAi = Ai.reduce((sum, j) => sum + newCosts[j], 0);

        if (newSumAi < sumAi) costs = newCosts;

        totalCosts.push(costs.reduce((sum, c) => sum + c, 0));
    }

    // Smooth the data to align better with theoretical evolution
    const smoothedCosts = smoothData(totalCosts, 10); // Apply moderate smoothing with a window size of 10

    // Sample fewer points logarithmically
    const sampledCosts = sampleLogarithmically(smoothedCosts, 100); // Sample 100 points logarithmically
    return sampledCosts;
}

function computeTheoreticalCostEvolution(n, d, steps = 1000) {
    const tPlot = Array.from({ length: steps }, (_, i) => Math.pow(10, i / 20)); // Logarithmic time steps
    const t0 = factorial(d + 1) / Math.pow(d, d + 2) * n; // Scaling factor
    const cAve = tPlot.map(t => Math.pow(t / t0 + 1, -1 / d)); // Theoretical cost evolution

    return { tPlot, cAve };
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

// Function to compute theoretical cost evolution
function computeTheoreticalCostEvolution(n, d, steps = 1000) {
    const tPlot = Array.from({ length: steps }, (_, i) => Math.pow(10, i / 20));
    const t0 = factorial(d + 1) / Math.pow(d, d + 2) * n;
    const cAve = tPlot.map(t => Math.pow(t / t0 + 1, -1 / d));

    // Replace very small values with a minimum value
    const cleanedCAve = cAve.map(value => Math.max(value, 1e-6));

    return { tPlot, cAve: cleanedCAve };
}

// Factorial helper function
function factorial(num) {
    if (num === 0 || num === 1) return 1;
    return num * factorial(num - 1);
}

// Update the runSimulation function to use the theoretical cost evolution
function runSimulation() {
    let n = parseInt(document.getElementById("numComponents").value);
    let d = parseInt(document.getElementById("connectivity").value);
    let method = document.getElementById("generationMethod").value;

    if (n > 100) {
        alert("The number of components cannot exceed 100.");
        document.getElementById("numComponents").value = 100;
        return;
    }

    if (d >= n) {
        alert("Dependencies cannot be greater than or equal to the number of components.");
        document.getElementById("connectivity").value = n - 1;
        return;
    }

    // Generate DSM matrix based on the selected method
    let DSM = generateDSMFromMethod(n, d, method);
    renderDSM(DSM);

    // Simulate cost evolution using the generated DSM
    const simulatedCosts = simulateCostEvolution(DSM, n, d);

    // Compute theoretical cost evolution
    const { tPlot, cAve } = computeTheoreticalCostEvolution(n, d);

    // Update the graph with both simulated and theoretical results
    updateChart(tPlot, simulatedCosts, cAve);
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

function updateChart(tPlot, simulatedCosts, theoreticalCosts) {
    const ctx = document.getElementById("costChart").getContext("2d");

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
                        pointRadius: 4,
                        pointBackgroundColor: '#A31F34'
                    },
                    {
                        label: 'Theoretical Cost Evolution',
                        data: theoreticalCosts,
                        borderColor: '#FFA500', // Orange for theoretical curve
                        borderWidth: 2,
                        fill: false,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 2, // Set graph dimensions to 1:2 ratio (wider than tall)
                plugins: {
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(context) {
                                return `Cost: ${context.raw.toExponential(2)}`; // Scientific notation
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
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: '# of Improvement Attempts'
                        },
                        ticks: {
                            callback: function(value) {
                                const logValue = Math.log10(value);
                                if (Number.isInteger(logValue)) {
                                    return `10^${logValue}`;
                                }
                                return null;
                            }
                        },
                        grid: {
                            display: true,
                            color: '#e0e0e0'
                        },
                        min: 1, // Set minimum value for x-axis
                        max: 1000 // Set maximum value for x-axis
                    },
                    y: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'Cost'
                        },
                        ticks: {
                            callback: function(value) {
                                return `10^${Math.log10(value).toFixed(0)}`; // Scientific notation
                            }
                        },
                        grid: {
                            display: true,
                            color: '#e0e0e0'
                        },
                        min: 1e-6, // Set minimum value for y-axis
                        max: 1 // Set maximum value for y-axis
                    }
                }
            }
        });
    }
}