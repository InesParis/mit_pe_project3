document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("costChart");
    const ctx = canvas.getContext("2d");
    
    let n = 10; // Number of components
    let d = 3;  // Connectivity
    let gamma = 1; // Cost reduction difficulty
    let steps = 1000;
    
    function generateDSM(n, d) {
        let DSM = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            let connections = new Set([i]); // Ensure self-connection
            while (connections.size < d) {
                connections.add(Math.floor(Math.random() * n));
            }
            connections.forEach(j => DSM[i][j] = 1);
        }
        return DSM;
    }
    
    function simulateCostReduction(n, d, gamma, steps) {
        let costs = Array(n).fill(1 / n);
        let DSM = generateDSM(n, d);
        let history = [];
        
        for (let t = 1; t <= steps; t++) {
            let i = Math.floor(Math.random() * n);
            let affected = DSM[i].map((v, idx) => v ? idx : -1).filter(idx => idx !== -1);
            
            let newCosts = affected.map(idx => Math.random() ** gamma);
            let oldSum = affected.reduce((sum, idx) => sum + costs[idx], 0);
            let newSum = newCosts.reduce((sum, val) => sum + val, 0);
            
            if (newSum < oldSum) {
                affected.forEach((idx, k) => costs[idx] = newCosts[k]);
            }
            history.push(costs.reduce((sum, c) => sum + c, 0));
        }
        return history;
    }
    
    function plotGraph(data) {
        new Chart(ctx, {
            type: "line",
            data: {
                labels: Array.from({ length: data.length }, (_, i) => i),
                datasets: [{ label: "Total Cost", data, borderColor: "blue", fill: false }]
            },
            options: { responsive: true, scales: { x: { title: { text: "Steps" } }, y: { title: { text: "Total Cost" } } } }
        });
    }
    
    let data = simulateCostReduction(n, d, gamma, steps);
    plotGraph(data);
});
