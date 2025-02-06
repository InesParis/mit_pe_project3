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

function simulateCostEvolution(n, d, gamma, steps = 1000) {
    let DSM = generateDSM(n, d);
    let costs = Array(n).fill(1 / n);
    let totalCosts = [];

    for (let t = 1; t <= steps; t++) {
        let i = Math.floor(Math.random() * n);
        let Ai = DSM[i].map((val, j) => (val ? j : -1)).filter(j => j !== -1);
        let newCosts = [...costs];
        let sumAi = Ai.reduce((sum, j) => sum + costs[j], 0);
        
        Ai.forEach(j => {
            let cNew = Math.pow(Math.random(), 1 / gamma) * costs[j];
            newCosts[j] = cNew;
        });
        
        let newSumAi = Ai.reduce((sum, j) => sum + newCosts[j], 0);
        if (newSumAi < sumAi) costs = newCosts;
        
        totalCosts.push(costs.reduce((sum, c) => sum + c, 0));
    }
    return totalCosts;
}

function runSimulation() {
    let n = parseInt(document.getElementById("numComponents").value);
    let d = parseInt(document.getElementById("connectivity").value);
    let gamma = parseFloat(document.getElementById("difficulty").value);
    let costData = simulateCostEvolution(n, d, gamma);

    let ctx = document.getElementById("costChart").getContext("2d");
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: costData.length }, (_, i) => i + 1),
            datasets: [{
                label: 'Total Cost Evolution',
                data: costData,
                borderColor: 'blue',
                fill: false
            }]
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Innovation Attempts' } },
                y: { title: { display: true, text: 'Total Cost' } }
            }
        }
    });
}
