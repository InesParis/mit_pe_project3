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
    container.innerHTML = "<h2>DSM</h2>";
    let table = document.createElement("table");
    DSM.forEach(row => {
        let tr = document.createElement("tr");
        row.forEach(cell => {
            let td = document.createElement("td");
            td.className = cell ? 'one' : 'zero';
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

function runSimulation() {
    let n = parseInt(document.getElementById("numComponents").value);
    let d = parseInt(document.getElementById("connectivity").value);

    if (d >= n) {
        alert("Dependencies cannot be greater than or equal to the number of components.");
        return;
    }

    let { DSM, totalCosts } = simulateCostEvolution(n, d);

    renderDSM(DSM);
    updateChart(totalCosts);
}

function updateChart(totalCosts) {
    let ctx = document.getElementById("costChart").getContext("2d");

    // Ensure no zero values in the log scale
    let cleanedTotalCosts = totalCosts.map(cost => Math.max(cost, 1e-6)); // Replace zero with small value

    if (costChart) {
        // Update existing chart
        costChart.data.labels = Array.from({ length: cleanedTotalCosts.length }, (_, i) => i + 1);
        costChart.data.datasets[0].data = cleanedTotalCosts;
        costChart.update();
    } else {
        // Create a new chart if it doesn't exist yet
        costChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: cleanedTotalCosts.length }, (_, i) => i + 1),
                datasets: [{
                    label: 'Total Cost Evolution',
                    data: cleanedTotalCosts,
                    borderColor: '#A31F34', // MIT red
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Innovation Attempts' } },
                    y: { 
                        type: 'logarithmic',
                        title: { display: true, text: 'Total Cost' },
                        ticks: {
                            callback: function(value, index, values) {
                                // Show only powers of 10 (e.g., 0.001, 0.01, 0.1, 1, 10, 100)
                                const logValue = Math.log10(value);
                                if (Number.isInteger(logValue)) {
                                    return value;
                                }
                                return null; // Hide intermediate values for cleaner display
                            }
                        }
                    }
                }
            }
        });
    }
}

// Fetch the DSM data from the JSON file
fetch('dsm_data.json')
    .then(response => response.json())
    .then(data => {
        console.log('DSM Data:', data);

        // Example: Visualize DSM as a grid
        const dsmContainer = document.getElementById('dsm-container');
        if (dsmContainer) {
            data.forEach((row, i) => {
                const rowDiv = document.createElement('div');
                rowDiv.style.display = 'flex';
                row.forEach((cell, j) => {
                    const cellDiv = document.createElement('div');
                    cellDiv.style.width = '20px';
                    cellDiv.style.height = '20px';
                    cellDiv.style.border = '1px solid black';
                    cellDiv.style.backgroundColor = cell ? 'black' : 'white';
                    rowDiv.appendChild(cellDiv);
                });
                dsmContainer.appendChild(rowDiv);
            });
        }
    })
    .catch(error => console.error('Error loading DSM data:', error));

// Fetch the DSM data from the JSON file exported by MATLAB
fetch('dsm_data.json')
    .then(response => response.json())
    .then(data => {
        console.log('DSM Data from MATLAB:', data);

        // Render the DSM matrix from MATLAB
        const matlabDSMContainer = document.getElementById('matlab-dsm-container');
        if (matlabDSMContainer) {
            matlabDSMContainer.innerHTML = "<h2>MATLAB DSM</h2>";
            let table = document.createElement("table");
            data.forEach(row => {
                let tr = document.createElement("tr");
                row.forEach(cell => {
                    let td = document.createElement("td");
                    td.className = cell ? 'one' : 'zero';
                    tr.appendChild(td);
                });
                table.appendChild(tr);
            });
            matlabDSMContainer.appendChild(table);
        }
    })
    .catch(error => console.error('Error loading DSM data from MATLAB:', error));
