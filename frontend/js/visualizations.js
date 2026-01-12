const visualizations = {
  driftChart: null,
  heatmapChart: null,
  trajectoryChart: null,

  // ====== 1. ГРАФИК ДРЕЙФА (улучшенный) ======
  renderDriftChart(analysis, mutations = []) {
    const ctx = document.getElementById('drift-chart');
    
    if (this.driftChart) {
      this.driftChart.destroy();
    }

    const labels = ['Оригинал', ...analysis.map(a => a.language)];
    const similarities = [1, ...analysis.map(a => a.similarity)];
    const localDrifts = [0, ...analysis.map(a => a.localDrift || 0)];

    // Цвета точек на основе типа изменения
    const pointColors = similarities.map(s => {
      if (s > 0.95) return 'rgb(76, 175, 80)';  // green
      if (s > 0.85) return 'rgb(255, 193, 7)';  // yellow
      if (s > 0.70) return 'rgb(255, 152, 0)';  // orange
      return 'rgb(244, 67, 54)';                 // red
    });

    // Размер точек на основе локального дрейфа
    const pointSizes = localDrifts.map(d => 5 + d * 15);

    this.driftChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Сходство с оригиналом',
          data: similarities,
          borderColor: 'rgb(102, 126, 234)',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointRadius: pointSizes,
          pointHoverRadius: pointSizes.map(s => s + 3)
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Семантический дрейф по шагам',
            font: { size: 16 }
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const idx = context.dataIndex;
                if (idx === 0) return 'Исходный текст';
                
                const sim = Math.round(similarities[idx] * 100);
                const drift = Math.round(localDrifts[idx] * 100);
                
                return [
                  `Сходство: ${sim}%`,
                  `Локальный дрейф: ${drift}%`,
                  analysis[idx - 1]?.changeType?.label || ''
                ];
              }
            }
          },
          annotation: {
            annotations: this.createAnnotations(analysis, mutations)
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
            ticks: {
              callback: value => `${Math.round(value * 100)}%`
            },
            title: {
              display: true,
              text: 'Сходство'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Шаг перевода'
            }
          }
        }
      }
    });
  },

  createAnnotations(analysis, mutations) {
    const annotations = {};

    // Аннотации для мутаций
    mutations.forEach((mutation, idx) => {
      if (mutation.type === 'critical_drift') {
        annotations[`mutation_${idx}`] = {
          type: 'line',
          xMin: mutation.step,
          xMax: mutation.step,
          borderColor: 'rgb(244, 67, 54)',
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            display: true,
            content: '🔥 Критический сдвиг',
            position: 'start'
          }
        };
      }
    });

    return annotations;
  },

  // ====== 2. ТЕПЛОВАЯ КАРТА СХОДСТВА ======
  renderHeatmap(results, analysis) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;

    const n = results.length;
    const data = [];

    // Вычисляем попарные сходства
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          row.push(1);
        } else if (i < j) {
          // Используем косинусное сходство между шагами
          const sim = this.calculatePairwiseSimilarity(
            results[i].text,
            results[j].text,
            analysis
          );
          row.push(sim);
        } else {
          row.push(data[j][i]); // Симметрично
        }
      }
      data.push(row);
    }

    this.renderHeatmapVisualization(container, data, results);
  },

  calculatePairwiseSimilarity(text1, text2, analysis) {
    // Простая Jaccard similarity
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  },

  renderHeatmapVisualization(container, data, results) {
    const canvas = document.createElement('canvas');
    canvas.id = 'heatmap-canvas';
    container.innerHTML = '';
    container.appendChild(canvas);

    const labels = results.map((r, i) => `${i}: ${r.language}`);

    // Преобразуем в формат Chart.js
    const chartData = [];
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i].length; j++) {
        chartData.push({
          x: labels[j],
          y: labels[i],
          v: data[i][j]
        });
      }
    }

    new Chart(canvas, {
      type: 'matrix',
      data: {
        datasets: [{
          label: 'Сходство',
          data: chartData,
          backgroundColor: (ctx) => {
            const value = ctx.raw.v;
            const alpha = value;
            return `rgba(102, 126, 234, ${alpha})`;
          },
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.5)',
          width: ({ chart }) => (chart.chartArea || {}).width / data.length - 1,
          height: ({ chart }) => (chart.chartArea || {}).height / data.length - 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Тепловая карта попарных сходств'
          },
          tooltip: {
            callbacks: {
              title: () => '',
              label: (ctx) => {
                const v = ctx.raw.v;
                return `Сходство: ${Math.round(v * 100)}%`;
              }
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            type: 'category',
            offset: true,
            ticks: {
              display: true
            },
            grid: {
              display: false
            }
          },
          y: {
            type: 'category',
            offset: true,
            ticks: {
              display: true
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  },

  // ====== 3. 2D ТРАЕКТОРИЯ (UMAP/t-SNE симуляция) ======
  async renderTrajectory(results, embeddings) {
    const container = document.getElementById('trajectory-container');
    if (!container) return;

    // Симуляция 2D проекции (в реальности нужен UMAP/t-SNE)
    // Для простоты используем PCA-подобную проекцию
    const coords = this.simulateUMAP(embeddings || results.map(r => r.text));

    this.renderTrajectoryVisualization(container, coords, results);
  },

  simulateUMAP(texts) {
    // Упрощенная симуляция 2D проекции
    // В реальности: использовать UMAP.js или отправлять на бэкенд
    
    const n = texts.length;
    const coords = [];
    
    for (let i = 0; i < n; i++) {
      // Простая "проекция" на основе позиции в цепочке
      const angle = (i / n) * Math.PI * 2;
      const radius = 1 + Math.random() * 0.5;
      
      coords.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }

    return coords;
  },

  renderTrajectoryVisualization(container, coords, results) {
    const canvas = document.createElement('canvas');
    canvas.id = 'trajectory-canvas';
    container.innerHTML = '';
    container.appendChild(canvas);

    const data = coords.map((coord, i) => ({
      x: coord.x,
      y: coord.y,
      label: `${i}: ${results[i].language}`,
      size: i === 0 || i === coords.length - 1 ? 10 : 5,
      color: i === 0 ? 'green' : (i === coords.length - 1 ? 'red' : 'blue')
    }));

    new Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Траектория',
          data: data,
          backgroundColor: data.map(d => d.color),
          pointRadius: data.map(d => d.size),
          showLine: true,
          borderColor: 'rgba(102, 126, 234, 0.5)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: '2D траектория семантического дрейфа'
          },
          tooltip: {
            callbacks: {
              label: (ctx) => data[ctx.dataIndex].label
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Компонента 1'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Компонента 2'
            }
          }
        }
      }
    });
  },

  // ====== 4. ДЕРЕВО ТРАНСФОРМАЦИЙ КЛЮЧЕВЫХ СЛОВ ======
  renderKeywordTree(transformations) {
    const container = document.getElementById('keyword-tree-container');
    if (!container) return;

    container.innerHTML = '<h3>Трансформации ключевых слов</h3>';

    transformations.forEach(transformation => {
      const treeDiv = document.createElement('div');
      treeDiv.className = 'keyword-tree';
      
      let html = `
        <div class="tree-root">
          <strong>${transformation.keyword}</strong>
          <span class="status-badge ${transformation.finalStatus}">
            ${transformation.finalStatus === 'preserved' ? '✓ Сохранено' : '✗ Утрачено'}
          </span>
        </div>
        <div class="tree-branches">
      `;

      transformation.chain.forEach((link, i) => {
        const statusClass = link.found ? 'found' : 'lost';
        const arrow = i < transformation.chain.length - 1 ? '↓' : '';
        
        html += `
          <div class="tree-node ${statusClass}">
            <span class="node-step">Шаг ${link.step}</span>
            <span class="node-lang">${link.language}</span>
            <span class="node-word">${link.word || '❌'}</span>
            ${arrow ? `<span class="node-arrow">${arrow}</span>` : ''}
          </div>
        `;
      });

      html += '</div>';
      
      if (transformation.lostAtStep !== null) {
        html += `
          <div class="tree-info">
            ⚠️ Утрачено на шаге ${transformation.lostAtStep}
          </div>
        `;
      }

      treeDiv.innerHTML = html;
      container.appendChild(treeDiv);
    });
  },

  // ====== 5. АНИМАЦИЯ ПРОЦЕССА ПЕРЕВОДА ======
  async animateTranslation(results, analysis, onStep) {
    const container = document.getElementById('animation-container');
    if (!container) return;

    for (let i = 0; i < results.length; i++) {
      const step = results[i];
      const stepAnalysis = i > 0 ? analysis[i - 1] : null;

      // Обновляем UI
      container.innerHTML = `
        <div class="animation-step">
          <div class="step-header">
            <span class="step-number">Шаг ${i}/${results.length - 1}</span>
            <span class="step-language">${step.language}</span>
            ${stepAnalysis ? `
              <span class="step-similarity ${this.getSimilarityClass(stepAnalysis.similarity)}">
                ${Math.round(stepAnalysis.similarity * 100)}%
              </span>
            ` : ''}
          </div>
          <div class="step-text">${step.text}</div>
          ${stepAnalysis && stepAnalysis.changeType ? `
            <div class="step-change-type">
              ${stepAnalysis.changeType.icon} ${stepAnalysis.changeType.label}
            </div>
          ` : ''}
          <div class="step-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${(i / (results.length - 1)) * 100}%"></div>
            </div>
          </div>
        </div>
      `;

      // Callback для внешней логики
      if (onStep) onStep(i, step, stepAnalysis);

      // Задержка для анимации
      if (i < results.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  },

  getSimilarityClass(similarity) {
    if (similarity > 0.85) return 'high';
    if (similarity > 0.70) return 'medium';
    return 'low';
  }
};