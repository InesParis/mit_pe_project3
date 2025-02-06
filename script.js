function generateDSM(n, d) {
    let DSM = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        DSM[i][i] = 1;
        let connections = new Set();
        while (connections.size < d - 1) {
            let target = Math.floor(Math.random() * n);
            if (target !== i) connections.add(target);
        }
        connections.forEach(target => DSM[i][target] = 1);
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
    container.innerHTML = "<h2>DSM Matrix</h2>";
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

function runSimulation() {
    let n = parseInt(document.getElementById("numComponents").value);
    let d = parseInt(document.getElementById("connectivity").value);
    let { DSM, totalCosts } = simulateCostEvolution(n, d);

    renderDSM(DSM);
    updateChart(totalCosts);
}

function updateChart(totalCosts) {
    let ctx = document.getElementById("costChart").getContext("2d");

    if (costChart) {
        // Update existing chart instead of creating a new one
        costChart.data.labels = Array.from({ length: totalCosts.length }, (_, i) => i + 1);
        costChart.data.datasets[0].data = totalCosts;
        costChart.update(); // Refresh the chart
    } else {
        // Create a new chart if it doesn't exist yet
        costChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: totalCosts.length }, (_, i) => i + 1),
                datasets: [{
                    label: 'Total Cost Evolution',
                    data: totalCosts,
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
                                return Number(value.toString()); // Convert to number
                            }
                        }
                    }
                }
            }
        });
    }
}