let currentPreset = null;
let currentChain = ['ru'];
let currentRun = null;
let currentMode = 'classic'; // classic, predictor, archeologist, reverse

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
  await loadPresets();
  await loadHistory();
  await loadDailyChallenges();
  await loadAchievements();
  await loadUserStats();
  setupEventListeners();
  setupModeSelector();
});

// ====== ЗАГРУЗКА ДАННЫХ ======
async function loadPresets() {
  const presets = await api.getPresets();
  const container = document.getElementById('presets-container');
  
  container.innerHTML = presets.map(preset => `
    <div class="preset-card" data-preset="${preset.id}">
      <h3>${preset.name}</h3>
      <p>${preset.description}</p>
      <div class="difficulty">${preset.difficulty}</div>
      <div class="languages">${preset.languages.join(' → ')}</div>
    </div>
  `).join('');

  container.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      currentPreset = card.dataset.preset;
    });
  });
}

async function loadHistory() {
  const history = await api.getHistory();
  const container = document.getElementById('history-list');
  
  if (history.length === 0) {
    container.innerHTML = '<p>История пуста</p>';
    return;
  }

  container.innerHTML = history.map(run => `
    <div class="history-item" data-id="${run.id}">
      <div class="history-date">${new Date(run.timestamp).toLocaleString('ru')}</div>
      <div class="history-text">${run.originalText.substring(0, 50)}...</div>
      <div class="history-chain">${run.chain.join(' → ')}</div>
      <div class="history-actions">
        <button class="view-btn" onclick="viewRun(${run.id})">👁️ Просмотр</button>
        <button class="play-game-btn" onclick="playGameWith(${run.id})">🎮 Играть</button>
      </div>
    </div>
  `).join('');
}

async function loadDailyChallenges() {
  const challenges = await api.getDailyChallenges();
  const container = document.getElementById('daily-challenges-container');
  
  if (!container) return;

  container.innerHTML = `
    <div class="daily-challenges">
      <h2>Ежедневные челленджи</h2>
      <div class="challenges-grid">
        ${challenges.map(challenge => `
          <div class="challenge-card" data-challenge-id="${challenge.id}">
            <div class="challenge-header">
              <span class="challenge-difficulty">${challenge.difficulty}</span>
            </div>
            <div class="challenge-title">${challenge.title}</div>
            <div class="challenge-description">${challenge.description}</div>
            <div class="challenge-reward">🏆 ${challenge.reward}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function loadAchievements() {
  const achievements = await api.getAllAchievements();
  const container = document.getElementById('achievements-container');
  
  if (!container) return;

  const grouped = groupAchievementsByCategory(achievements);

  let html = '<div class="achievements-panel"><h2>🏆 Достижения</h2>';

  for (const [category, items] of Object.entries(grouped)) {
    html += `
      <div class="achievement-category">
        <h3>${getCategoryName(category)}</h3>
        <div class="achievements-grid">
          ${items.map(ach => `
            <div class="achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}">
              <span class="achievement-icon">${ach.icon}</span>
              <div class="achievement-title">${ach.title}</div>
              <div class="achievement-description">${ach.description}</div>
              ${!ach.unlocked ? `
                <div class="achievement-progress">
                  <div class="achievement-progress-fill" style="width: ${ach.progress}%"></div>
                </div>
                <div class="achievement-progress-text">${ach.progress}%</div>
              ` : `
                <div class="achievement-unlocked-date">
                  Разблокировано: ${new Date(ach.unlockedAt).toLocaleDateString('ru')}
                </div>
              `}
              ${ach.reward ? `
                <div class="achievement-reward">Награда: ${ach.reward}</div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

async function loadUserStats() {
  const stats = await api.getUserStats();
  const container = document.getElementById('user-stats-container');
  
  if (!container) return;

  container.innerHTML = `
    <div class="user-stats-panel">
      <h2>📊 Ваша статистика</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.total_runs}</div>
          <div class="stat-label">Запусков</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${Math.round(stats.max_drift * 100)}%</div>
          <div class="stat-label">Макс. дрейф</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.unique_languages}</div>
          <div class="stat-label">Языков</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.unlocked_achievements.length}</div>
          <div class="stat-label">Достижений</div>
        </div>
      </div>
    </div>
  `;
}

// ====== СЕЛЕКТОР РЕЖИМОВ ======
function setupModeSelector() {
  const selector = document.getElementById('mode-selector');
  if (!selector) return;

  selector.innerHTML = `
    <div class="mode-selector-tabs">
      <div class="mode-tab active" data-mode="classic">
        <span class="mode-tab-icon">🌍</span>
        <div class="mode-tab-title">Классический</div>
        <div class="mode-tab-description">Обычный режим перевода</div>
      </div>
      <div class="mode-tab" data-mode="predictor">
        <span class="mode-tab-icon">🔮</span>
        <div class="mode-tab-title">Предсказатель</div>
        <div class="mode-tab-description">Угадайте дрейф</div>
      </div>
      <div class="mode-tab" data-mode="archeologist">
        <span class="mode-tab-icon">⛏️</span>
        <div class="mode-tab-title">Археолог</div>
        <div class="mode-tab-description">Найдите критическую точку</div>
      </div>
      <div class="mode-tab" data-mode="reverse">
        <span class="mode-tab-icon">🧠</span>
        <div class="mode-tab-title">Обратная инженерия</div>
        <div class="mode-tab-description">Угадайте исходный текст</div>
      </div>
    </div>
  `;

  selector.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      selector.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMode = tab.dataset.mode;
      updateUIForMode(currentMode);
    });
  });
}

function updateUIForMode(mode) {
  const runBtn = document.getElementById('run-btn');
  
  switch(mode) {
    case 'classic':
      runBtn.textContent = '🚀 Запустить хаос!';
      break;
    case 'predictor':
      runBtn.textContent = '🔮 Начать предсказание';
      break;
    case 'archeologist':
      runBtn.textContent = '⛏️ Сначала нужен перевод';
      runBtn.disabled = true;
      break;
    case 'reverse':
      runBtn.textContent = '🧠 Сначала нужен перевод';
      runBtn.disabled = true;
      break;
  }
}

// ====== СОБЫТИЯ ======
function setupEventListeners() {
  document.getElementById('run-btn').addEventListener('click', runTranslation);
  document.getElementById('new-btn')?.addEventListener('click', resetForm);
  document.getElementById('save-btn')?.addEventListener('click', saveResults);
}

function showError(message, element = null) {
  alert(message);
  if (element && typeof animations !== 'undefined') {
    animations.shake(element);
  }
}

async function runTranslation() {
  const textInput = document.getElementById('input-text');
  const text = textInput.value.trim();
  if (!text) {
    showError('Введите текст для перевода', textInput);
    return;
  }

  if (!currentPreset && currentChain.length < 3) {
    alert('Выберите предустановку или создайте цепочку из минимум 3 языков');
    return;
  }

  // Режим предсказателя
  if (currentMode === 'predictor') {
    const chain = currentPreset 
      ? (await api.getPresets()).find(p => p.id === currentPreset).languages 
      : currentChain;
    
    await gameModes.initPredictor(text, chain);
    return;
  }

  // Обычный запуск для классического режима
  showProgress();

  try {
    const result = await api.runTranslation(text, currentChain, currentPreset);

    const totalSteps = result.results.length;
    for (let i = 0; i < totalSteps; i++) {
      animations.updateProgress(
        i + 1, 
        totalSteps, 
        `Обработка шага ${i + 1}/${totalSteps}: ${result.results[i].language}`
      );
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    currentRun = result;
    hideProgress();

    currentRun = result;
    
    hideProgress();
    
    // Анимация процесса
    await animateTranslation(result);
    
    // Детальная аналитика
    const detailedAnalysis = await api.getDetailedAnalysis(result.runId);
    const keywords = await api.getKeywordTransformations(result.runId);
    const mutations = await api.getMutations(result.runId);
    
    // Отображение результатов
    await displayResults({
      ...result,
      detailedAnalysis,
      keywords,
      mutations
    });
    
    // Проверка достижений
    const newAchievements = await api.checkAchievements(result.runId);
    if (newAchievements.length > 0) {
      showAchievementNotifications(newAchievements);
    }
    
    // Обновление статистики
    await loadUserStats();
    await loadAchievements();
    
  } catch (error) {
    hideProgress();
    alert('Ошибка при переводе: ' + error.message);
  }
}

// ====== ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ ======
async function displayResults(result) {
  const section = document.getElementById('results-section');
  section.classList.remove('hidden');

  animations.pulse(section, 800);

  // Основные метрики
  const driftPercent = Math.round(result.overallDrift * 100);
  document.getElementById('overall-drift').textContent = `${driftPercent}%`;
  document.getElementById('original-text').textContent = result.results[0].text;
  document.getElementById('final-text').textContent = result.finalText;

  const driftElement = document.getElementById('overall-drift');
  await animations.typeText(driftElement, `${driftPercent}%`, 50);
  
  // Конфетти для экстремального дрейфа
  if (driftPercent > 80) {
    animations.confetti();
  }

  // График дрейфа
  visualizations.renderDriftChart(result.analysis, result.mutations);

  // Тепловая карта
  visualizations.renderHeatmap(result.results, result.analysis);

  // 2D траектория
  await visualizations.renderTrajectory(result.results);

  // Дерево ключевых слов
  if (result.keywords) {
    visualizations.renderKeywordTree(result.keywords);
  }

  // Интересные мутации
  if (result.mutations && result.mutations.length > 0) {
    displayMutations(result.mutations);
  }

  // Пошаговые результаты с детальным анализом
  displaySteps(result.results, result.detailedAnalysis);

  // Экспорт опции
  setupExportButtons(result.runId);

  section.scrollIntoView({ behavior: 'smooth' });
}

async function displaySteps(results, detailedAnalysis) {
  const stepsList = document.getElementById('steps-list');
  stepsList.innerHTML = ''; // Очистить
    for (let i = 0; i < results.length; i++) {
    if (i === 0) continue;
    
    const step = results[i];
    const analysis = detailedAnalysis[i - 1];
    const similarity = analysis?.localSimilarity || 0;
    const simPercent = Math.round(similarity * 100);
    const colorClass = simPercent > 80 ? 'high' : simPercent > 60 ? 'medium' : 'low';
    
    const stepCard = document.createElement('div');
    stepCard.className = `step-card ${colorClass}`;
    stepCard.dataset.step = i;
    stepCard.onclick = () => showStepDetail(i);
    
    stepCard.innerHTML = `
      <div class="step-header">
        <span class="step-number">Шаг ${i}</span>
        <span class="step-lang">${step.from} → ${step.language}</span>
        <span class="step-similarity">${simPercent}%</span>
        ${analysis?.changeType ? `
          <span class="step-change-icon">${analysis.changeType.icon}</span>
        ` : ''}
      </div>
      <div class="step-text">${step.text || 'Ошибка перевода'}</div>
      ${step.error ? `<div class="step-error">${step.error}</div>` : ''}
      ${analysis ? `
        <div class="step-meta">
          <small>${analysis.changeType?.label || ''}</small>
        </div>
      ` : ''}
      <span class="step-expand-icon">→</span>
    `;
    
    stepsList.appendChild(stepCard);
    
    // Анимация появления
    stepCard.style.opacity = '0';
    stepCard.style.transform = 'translateY(20px)';
    setTimeout(() => {
      stepCard.style.transition = 'all 0.3s ease';
      stepCard.style.opacity = '1';
      stepCard.style.transform = 'translateY(0)';
    }, i * 50);
  }
}

function displayMutations(mutations) {
  const container = document.getElementById('mutations-container');
  if (!container) return;

  container.innerHTML = `
    <div class="mutations-section">
      <h3>💡 Интересные моменты</h3>
      ${mutations.map(mutation => `
        <div class="mutation-item">
          <div class="mutation-type">${getMutationTypeLabel(mutation.type)}</div>
          <div class="mutation-description">${mutation.description}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ====== ДЕТАЛЬНЫЙ ВИД ШАГА ======
async function showStepDetail(stepIndex) {
  if (!currentRun) return;

  const step = currentRun.results[stepIndex];
  const prevStep = currentRun.results[stepIndex - 1];
  const analysis = currentRun.detailedAnalysis[stepIndex - 1];

  showModal(`
    <div class="step-detail-modal">
      <div class="step-detail-header">
        <h2>Шаг ${stepIndex}: ${step.from} → ${step.language}</h2>
        <button class="close-detail" onclick="closeModal()">×</button>
      </div>

      <div class="text-comparison">
        <div class="text-box input">
          <strong>Входной текст (${step.from}):</strong>
          <p>${prevStep.text}</p>
        </div>
        <div class="text-box output">
          <strong>Выходной текст (${step.language}):</strong>
          <p>${step.text}</p>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-box">
          <span class="label">Сходство</span>
          <span class="value">${Math.round(analysis.localSimilarity * 100)}%</span>
        </div>
        <div class="metric-box">
          <span class="label">Локальный дрейф</span>
          <span class="value">${Math.round(analysis.localDrift * 100)}%</span>
        </div>
        <div class="metric-box">
          <span class="label">Потеряно слов</span>
          <span class="value">${analysis.tokens.lostCount}</span>
        </div>
        <div class="metric-box">
          <span class="label">Добавлено слов</span>
          <span class="value">${analysis.tokens.gainedCount}</span>
        </div>
        <div class="metric-box">
          <span class="label">Изменение длины</span>
          <span class="value">${analysis.lengthChangePercent}%</span>
        </div>
        <div class="metric-box">
          <span class="label">Уверенность</span>
          <span class="value">${Math.round(analysis.confidence * 100)}%</span>
        </div>
      </div>

      <div class="change-type-display">
        <h3>${analysis.changeType.icon} ${analysis.changeType.label}</h3>
      </div>

      ${analysis.reasons.length > 0 ? `
        <div class="reasons-list">
          <h3>Причины дрейфа:</h3>
          ${analysis.reasons.map(reason => `
            <div class="reason-item ${reason.impact}">
              <div class="reason-icon">
                ${reason.impact === 'high' ? '🔥' : reason.impact === 'medium' ? '⚠️' : 'ℹ️'}
              </div>
              <div class="reason-content">
                <strong>${getReasonTypeLabel(reason.type)}</strong>
                <p>${reason.description}</p>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="tokens-display">
        <h3>Изменения слов:</h3>
        <div class="tokens-grid">
          ${analysis.tokens.lost.length > 0 ? `
            <div class="tokens-box lost">
              <strong>Потеряно (${analysis.tokens.lostCount}):</strong>
              <p>${analysis.tokens.lost.slice(0, 10).join(', ')}${analysis.tokens.lost.length > 10 ? '...' : ''}</p>
            </div>
          ` : ''}
          ${analysis.tokens.gained.length > 0 ? `
            <div class="tokens-box gained">
              <strong>Добавлено (${analysis.tokens.gainedCount}):</strong>
              <p>${analysis.tokens.gained.slice(0, 10).join(', ')}${analysis.tokens.gained.length > 10 ? '...' : ''}</p>
            </div>
          ` : ''}
          ${analysis.tokens.preserved.length > 0 ? `
            <div class="tokens-box preserved">
              <strong>Сохранено (${analysis.tokens.preservedCount}):</strong>
              <p>${analysis.tokens.preserved.slice(0, 10).join(', ')}${analysis.tokens.preserved.length > 10 ? '...' : ''}</p>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `);
}

// ====== АНИМАЦИЯ ======
async function animateTranslation(result) {
  const container = document.getElementById('animation-container');
  if (!container) return;

  container.classList.remove('hidden');

  await visualizations.animateTranslation(
    result.results,
    result.analysis,
    (i, step, analysis) => {
      // Callback для каждого шага
      console.log(`Шаг ${i}: ${step.language}`);
    }
  );

  container.classList.add('hidden');
}

// ====== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ======
function showProgress() {
  document.getElementById('progress-section').classList.remove('hidden');
  document.getElementById('results-section').classList.add('hidden');
}

function hideProgress() {
  document.getElementById('progress-section').classList.add('hidden');
}

function showModal(content) {
  const overlay = document.createElement('div');
  overlay.className = 'game-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = content;
  document.body.appendChild(overlay);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.remove();
  }
}

function showAchievementNotifications(achievements) {
  achievements.forEach((achievement, index) => {
    setTimeout(() => {
      animations.achievementUnlock(achievement);

      if (achievement.category === 'special' || achievement.score >= 100) {
        animations.confetti();
      }
    }, index * 500);
  });
}

function setupExportButtons(runId) {
  const container = document.getElementById('export-options');
  if (!container) return;

  container.innerHTML = `
    <div class="export-options">
      <button class="export-btn" onclick="api.downloadExport(${runId}, 'json')">
        <span>📄</span> JSON
      </button>
      <button class="export-btn" onclick="api.downloadExport(${runId}, 'markdown')">
        <span>📝</span> Markdown
      </button>
      <button class="export-btn" onclick="exportUtils.exportChartToPNG('drift-chart', 'drift_${runId}.png')">
        <span>📊</span> График (PNG)
      </button>
      <button class="export-btn" onclick="exportUtils.exportAllCharts(${runId})">
        <span>🖼️</span> Все графики
      </button>
    </div>
  `;
}

// Глобальные функции для onclick
window.viewRun = async (id) => {
  const run = await api.getRun(id);
  currentRun = run;
  displayResults(run);
};

window.playGameWith = async (id) => {
  const gameOverlay = document.getElementById('game-mode-container');
  gameOverlay.classList.remove('hidden');
  
  // Показать выбор режима
  gameOverlay.innerHTML = `
    <h2>Выберите игровой режим</h2>
    <div class="mode-selector-tabs">
      <div class="mode-tab" onclick="gameModes.initArcheologist(${id})">
        <span class="mode-tab-icon">⛏️</span>
        <div class="mode-tab-title">Археолог</div>
        <div class="mode-tab-description">Найдите критическую точку</div>
      </div>
      <div class="mode-tab" onclick="gameModes.initReverse(${id})">
        <span class="mode-tab-icon">🧠</span>
        <div class="mode-tab-title">Обратная инженерия</div>
        <div class="mode-tab-description">Угадайте исходный текст</div>
      </div>
    </div>
    <button onclick="closeGameOverlay()" class="secondary-btn">Отмена</button>
  `;
};

window.closeGameOverlay = () => {
  document.getElementById('game-mode-container').classList.add('hidden');
};

window.showStepDetail = showStepDetail;
window.closeModal = closeModal;

// Вспомогательные функции для меток
function getMutationTypeLabel(type) {
  const labels = {
    'critical_drift': '🔥 Критический сдвиг',
    'word_disappearance': '👻 Исчезновение слов',
    'new_concept': '✨ Новый концепт'
  };
  return labels[type] || type;
}

function getReasonTypeLabel(type) {
  const labels = {
    'rare_pair': 'Редкая языковая пара',
    'word_loss': 'Потеря слов',
    'semantic_shift': 'Семантический сдвиг',
    'concept_expansion': 'Расширение концептов'
  };
  return labels[type] || type;
}

function getCategoryName(category) {
  const names = {
    'beginner': '🌱 Начинающий',
    'drift': '🌀 Дрейф',
    'predictor': '🔮 Предсказатель',
    'archeologist': '⛏️ Археолог',
    'reverse': '🧠 Обратная инженерия',
    'explorer': '🗺️ Исследователь',
    'milestone': '🏆 Вехи',
    'special': '✨ Специальные',
    'challenge': '⚔️ Челленджи'
  };
  return names[category] || category;
}

function groupAchievementsByCategory(achievements) {
  const grouped = {};
  achievements.forEach(ach => {
    if (!grouped[ach.category]) {
      grouped[ach.category] = [];
    }
    grouped[ach.category].push(ach);
  });
  return grouped;
}

function resetForm() {
  document.getElementById('input-text').value = '';
  document.getElementById('results-section').classList.add('hidden');
  document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
  currentPreset = null;
  currentRun = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveResults() {
  if (!currentRun) return;
  
  // Сохранить в localStorage как резервную копию
  const saved = JSON.parse(localStorage.getItem('saved_runs') || '[]');
  saved.push({
    id: currentRun.runId,
    timestamp: Date.now(),
    data: currentRun
  });
  localStorage.setItem('saved_runs', JSON.stringify(saved));

  
  alert('Результаты сохранены локально!');
}