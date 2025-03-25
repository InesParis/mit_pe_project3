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

function simulateCostEvolution(n, d, steps = 1000) {
    let DSM = generateDSM(n, d);
    let costs = Array(n).fill(1 / n);
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
    return { DSM, totalCosts };
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

    if (method === 'rand') {
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
    } else if (method === 'ideg') {
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
    } else if (method === 'loca') {
        // Local method (chain)
        for (let i = 0; i < n; i++) {
            for (let k = 1; k < d; k++) {
                const j = (i + k) % n;
                DSM[i][j] = true;
            }
        }
    } else if (method === 'cent') {
        // Centralized method
        const center = Math.floor(n / 2);
        for (let i = 0; i < n; i++) {
            if (i !== center) {
                DSM[i][center] = true;
                DSM[center][i] = true;
            }
        }
    }

    return DSM;
}

// Function to compute theoretical cost evolution
function computeCostEvolution(n, d, steps = 1000) {
    const tPlot = Array.from({ length: steps }, (_, i) => Math.pow(10, i / 20)); // Logarithmic time steps
    const t0 = factorial(d + 1) / Math.pow(d, d + 2) * n; // Scaling factor
    const cAve = tPlot.map(t => Math.pow(t / t0 + 1, -1 / d)); // Theoretical cost evolution

    // Ensure the cost values are within a reasonable range
    const cleanedCAve = cAve.map(value => Math.max(value, 1e-6)); // Replace very small values with a minimum

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

    if (d >= n) {
        alert("Dependencies cannot be greater than or equal to the number of components.");
        return;
    }

    // Generate DSM matrix in JavaScript
    let DSM = generateDSMFromMethod(n, d, method);
    renderDSM(DSM);

    // Compute theoretical cost evolution
    const { tPlot, cAve } = computeCostEvolution(n, d);
    updateChart(tPlot, cAve);
}

// Render the DSM matrix
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

// Simulate cost evolution (dummy implementation for now)
function simulateCostEvolution(DSM, n, d) {
    let totalCosts = Array.from({ length: 1000 }, (_, i) => Math.random() * 10); // Dummy data
    return totalCosts;
}

// Update the chart with theoretical cost evolution data
function updateChart(tPlot, cAve) {
    const ctx = document.getElementById("costChart").getContext("2d");

    if (costChart) {
        // Reset the chart data with new values
        costChart.data.labels = tPlot;
        costChart.data.datasets[0].data = cAve;
        costChart.update();
    } else {
        // Create a new chart if it doesn't exist yet
        costChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: tPlot,
                datasets: [{
                    label: 'Theoretical Cost Evolution',
                    data: cAve,
                    borderColor: '#A31F34', // MIT red
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 3, // Add points to match the style in the picture
                    pointBackgroundColor: '#A31F34'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: '# of Improvement Attempts'
                        },
                        ticks: {
                            callback: function(value) {
                                // Show only powers of 10 (e.g., 10^0, 10^1, 10^2)
                                const logValue = Math.log10(value);
                                if (Number.isInteger(logValue)) {
                                    return `10^${logValue}`;
                                }
                                return null; // Hide intermediate values
                            }
                        }
                    },
                    y: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: 'Cost'
                        },
                        ticks: {
                            callback: function(value) {
                                // Show only powers of 10 (e.g., 10^-3, 10^-2, 10^-1, 10^0)
                                const logValue = Math.log10(value);
                                if (Number.isInteger(logValue)) {
                                    return `10^${logValue}`;
                                }
                                return null; // Hide intermediate values
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Hide the legend to match the style in the picture
                    }
                }
            }
        });
    }
}
