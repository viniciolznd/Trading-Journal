window.JournalCharts = (() => {
  let equityChart;
  let resultChart;
  let dailyChart;

  Chart.defaults.color = "#98a6ba";
  Chart.defaults.borderColor = "rgba(42,58,83,.55)";

  function destroy(chart) {
    if (chart) chart.destroy();
  }

  function renderEquity(trades) {
    destroy(equityChart);
    const ordered = [...trades].sort((a,b) => {
      const ad = `${a.trade_date}T${a.trade_time || "00:00"}`;
      const bd = `${b.trade_date}T${b.trade_time || "00:00"}`;
      return ad.localeCompare(bd);
    });
    let running = 0;
    const labels = [];
    const data = [];
    ordered.forEach(t => {
      running += Number(t.pnl || 0);
      labels.push(t.trade_date);
      data.push(Number(running.toFixed(2)));
    });

    equityChart = new Chart(document.getElementById("equityChart"), {
      type: "line",
      data: { labels, datasets: [{
        label: "Net P&L",
        data,
        borderColor: "#31d2c3",
        backgroundColor: "rgba(49,210,195,.10)",
        fill: true,
        tension: .28,
        pointRadius: ordered.length > 35 ? 0 : 2
      }]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 7 }, grid: { display: false } },
          y: { ticks: { callback: v => `$${v}` } }
        }
      }
    });
  }

  function renderResults(trades) {
    destroy(resultChart);
    const wins = trades.filter(t => t.result === "WIN").length;
    const losses = trades.filter(t => t.result === "LOSS").length;
    const be = trades.filter(t => t.result === "BE").length;

    resultChart = new Chart(document.getElementById("resultChart"), {
      type: "doughnut",
      data: {
        labels: ["Wins", "Losses", "BE"],
        datasets: [{
          data: [wins, losses, be],
          backgroundColor: ["#31d2c3", "#ff647f", "#708197"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "68%",
        plugins: { legend: { position: "bottom", labels: { usePointStyle: true, padding: 16 } } }
      }
    });
  }

  function renderDaily(trades) {
    destroy(dailyChart);
    const byDay = {};
    trades.forEach(t => {
      byDay[t.trade_date] = (byDay[t.trade_date] || 0) + Number(t.pnl || 0);
    });
    const keys = Object.keys(byDay).sort().slice(-14);
    const values = keys.map(k => Number(byDay[k].toFixed(2)));

    dailyChart = new Chart(document.getElementById("dailyChart"), {
      type: "bar",
      data: {
        labels: keys.map(k => k.slice(5)),
        datasets: [{
          label: "Daily P&L",
          data: values,
          backgroundColor: values.map(v => v >= 0 ? "#31d2c3" : "#ff647f"),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { ticks: { callback: v => `$${v}` } }
        }
      }
    });
  }

  function renderAll(trades) {
    renderEquity(trades);
    renderResults(trades);
    renderDaily(trades);
  }

  return { renderAll };
})();
