// Экспорт графика в PNG на стороне клиента
const exportUtils = {
  // Экспорт canvas в PNG
  async exportChartToPNG(chartId, filename = 'chart.png') {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }

    // Конвертация canvas в blob
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    });
  },

  // Экспорт всех визуализаций
  async exportAllCharts(runId) {
    const charts = [
      { id: 'drift-chart', name: `drift_${runId}.png` },
      { id: 'heatmap-canvas', name: `heatmap_${runId}.png` },
      { id: 'trajectory-canvas', name: `trajectory_${runId}.png` }
    ];

    for (const chart of charts) {
      await this.exportChartToPNG(chart.id, chart.name);
      await new Promise(resolve => setTimeout(resolve, 500)); // Задержка между экспортами
    }
  }
};

window.exportUtils = exportUtils;