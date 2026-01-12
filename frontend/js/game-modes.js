const gameModes = {
  currentMode: null,
  currentGame: null,

  // ====== ПРЕДСКАЗАТЕЛЬ ======
  async initPredictor(text, chain) {
    this.currentMode = 'predictor';
    
    const game = await api.initPredictorGame(text, chain);
    this.currentGame = game;

    this.showPredictorUI(game);
  },

  showPredictorUI(game) {
    const container = document.getElementById('game-mode-container');
    
    container.innerHTML = `
      <div class="game-predictor">
        <h2>🔮 Режим "Предсказатель"</h2>
        <p>Предскажите, насколько сильно исказится смысл текста</p>
        
        <div class="game-info">
          <div class="info-box">
            <strong>Текст:</strong>
            <p>${game.text}</p>
          </div>
          <div class="info-box">
            <strong>Цепочка языков:</strong>
            <p>${game.chain.join(' → ')}</p>
          </div>
          <div class="info-box hint">
            <strong>💡 Подсказка:</strong>
            <p>Ожидаемый дрейф: ${Math.round(game.estimatedDrift * 100)}% ± 15%</p>
          </div>
        </div>

        <div class="prediction-input">
          <label for="drift-prediction">Ваш прогноз дрейфа:</label>
          <div class="slider-container">
            <input type="range" id="drift-prediction" min="0" max="100" value="50" step="1">
            <span id="prediction-value">50%</span>
          </div>
        </div>

        <button id="submit-prediction" class="primary-btn">Подтвердить и запустить</button>
        <button id="cancel-game" class="secondary-btn">Отмена</button>
      </div>
    `;

    // Обработчики
    const slider = document.getElementById('drift-prediction');
    const valueDisplay = document.getElementById('prediction-value');
    
    slider.addEventListener('input', () => {
      valueDisplay.textContent = `${slider.value}%`;
    });

    document.getElementById('submit-prediction').addEventListener('click', () => {
      this.submitPrediction(slider.value / 100);
    });

    document.getElementById('cancel-game').addEventListener('click', () => {
      container.classList.add('hidden');
    });
  },

  async submitPrediction(prediction) {
    // Запускаем перевод
    const result = await api.runTranslation(
      this.currentGame.text,
      this.currentGame.chain
    );

    // Оцениваем предсказание
    const evaluation = await api.evaluatePrediction(result.runId, prediction);

    this.showPredictionResult(evaluation, result);
  },

  showPredictionResult(evaluation, translationResult) {
    const container = document.getElementById('game-mode-container');
    
    const accuracy = Math.round(evaluation.accuracy * 100);
    const gradeClass = evaluation.score >= 90 ? 'excellent' : 
                       evaluation.score >= 70 ? 'good' : 'fair';

    container.innerHTML = `
      <div class="game-result ${gradeClass}">
        <h2>Результат предсказания</h2>
        
        <div class="score-display">
          <div class="score-circle">
            <span class="score-value">${evaluation.score}</span>
            <span class="score-label">очков</span>
          </div>
          <div class="grade">${evaluation.grade}</div>
        </div>

        <div class="comparison">
          <div class="comparison-item">
            <strong>Ваш прогноз:</strong>
            <span class="value">${Math.round(evaluation.userPrediction * 100)}%</span>
          </div>
          <div class="comparison-item">
            <strong>Реальный дрейф:</strong>
            <span class="value">${Math.round(evaluation.actualDrift * 100)}%</span>
          </div>
          <div class="comparison-item">
            <strong>Точность:</strong>
            <span class="value">${accuracy}%</span>
          </div>
        </div>

        <button id="view-details" class="primary-btn">Посмотреть детали перевода</button>
        <button id="play-again" class="secondary-btn">Играть ещё</button>
      </div>
    `;

    const scoreCircle = document.getElementById('score-circle');
    animations.pulse(scoreCircle, 1000);
    
    // Конфетти для отличного результата
    if (evaluation.score >= 90) {
      setTimeout(() => animations.confetti(), 500);
    }

    document.getElementById('view-details').addEventListener('click', () => {
      displayResults(translationResult);
      container.classList.add('hidden');
    });

    document.getElementById('play-again').addEventListener('click', () => {
      container.classList.add('hidden');
      // Вернуться к выбору режима
    });
  },

  // ====== АРХЕОЛОГ ======
  async initArcheologist(runId) {
    this.currentMode = 'archeologist';
    
    const game = await api.initArcheologistGame(runId);
    this.currentGame = game;

    this.showArcheologistUI(game);
  },

  showArcheologistUI(game) {
    const container = document.getElementById('game-mode-container');
    
    container.innerHTML = `
      <div class="game-archeologist">
        <h2>⛏️ Режим "Археолог"</h2>
        <p>${game.question}</p>
        
        <div class="options-grid">
          ${game.options.map(option => `
            <div class="option-card" data-step="${option.step}">
              <div class="option-header">
                <strong>Шаг ${option.step}</strong>
                <span class="option-lang">${option.language}</span>
              </div>
              <div class="option-text">${option.text}</div>
            </div>
          `).join('')}
        </div>

        <div class="hint-section">
          <button id="show-hint" class="hint-btn">💡 Показать подсказку (-10 очков)</button>
          <div id="hint-text" class="hidden">${game.hint}</div>
        </div>

        <button id="submit-archeologist" class="primary-btn" disabled>Подтвердить выбор</button>
        <button id="cancel-game" class="secondary-btn">Отмена</button>
      </div>
    `;

    let selectedStep = null;
    let hintUsed = false;

    // Выбор опции
    document.querySelectorAll('.option-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedStep = parseInt(card.dataset.step);
        document.getElementById('submit-archeologist').disabled = false;
      });
    });

    // Подсказка
    document.getElementById('show-hint').addEventListener('click', () => {
      document.getElementById('hint-text').classList.remove('hidden');
      hintUsed = true;
    });

    // Отправка
    document.getElementById('submit-archeologist').addEventListener('click', async () => {
      const evaluation = await api.evaluateArcheologist(
        this.currentGame.runId || 'current',
        selectedStep
      );
      
      // Штраф за подсказку
      if (hintUsed) {
        evaluation.score = Math.max(0, evaluation.score - 10);
      }

      this.showArcheologistResult(evaluation);
    });

    document.getElementById('cancel-game').addEventListener('click', () => {
      container.classList.add('hidden');
    });
  },

  showArcheologistResult(evaluation) {
    const container = document.getElementById('game-mode-container');
    
    const gradeClass = evaluation.score >= 90 ? 'excellent' : 
                       evaluation.score >= 60 ? 'good' : 'fair';

    container.innerHTML = `
      <div class="game-result ${gradeClass}">
        <h2>Результат раскопок</h2>
        
        <div class="score-display">
          <div class="score-circle">
            <span class="score-value">${evaluation.score}</span>
            <span class="score-label">очков</span>
          </div>
          <div class="grade">${evaluation.feedback}</div>
        </div>

        <div class="answer-reveal">
          <p><strong>Правильный ответ:</strong> Шаг ${evaluation.correctAnswer}</p>
          ${evaluation.distance === 0 ? 
            '<p class="success">🎯 Точное попадание!</p>' :
            `<p class="info">Вы были на расстоянии ${evaluation.distance} шагов</p>`
          }
        </div>

        <button id="play-again" class="primary-btn">Играть ещё</button>
      </div>
    `;

    document.getElementById('play-again').addEventListener('click', () => {
      container.classList.add('hidden');
    });
  },

  // ====== ОБРАТНАЯ ИНЖЕНЕРИЯ ======
  async initReverse(runId) {
    this.currentMode = 'reverse';
    
    const game = await api.initReverseGame(runId);
    this.currentGame = game;

    this.showReverseUI(game);
  },

  showReverseUI(game) {
    const container = document.getElementById('game-mode-container');
    
    container.innerHTML = `
      <div class="game-reverse">
        <h2>🧠 Режим "Обратная инженерия"</h2>
        <p>Угадайте исходный текст по финальному результату</p>
        
        <div class="game-info">
          <div class="info-box">
            <strong>Финальный текст:</strong>
            <p>${game.finalText}</p>
          </div>
          <div class="info-box">
            <strong>Цепочка языков:</strong>
            <p>${game.chain.join(' → ')}</p>
          </div>
          <div class="score-tracker">
            <strong>Макс. очков:</strong> <span id="current-max-score">${game.maxScore}</span>
          </div>
        </div>

        <div class="guess-input">
          <label for="guess-text">Ваше предположение:</label>
          <textarea id="guess-text" rows="3" placeholder="Введите предполагаемый исходный текст..."></textarea>
        </div>

        <div class="hints-section">
          <h3>Подсказки (каждая -10 очков):</h3>
          <div id="hints-list" class="hints-grid">
            ${game.hints.map((hint, i) => `
              <button class="hint-btn" data-hint-index="${i}">
                Шаг ${hint.step} (${hint.language})
              </button>
            `).join('')}
          </div>
          <div id="revealed-hints"></div>
        </div>

        <button id="submit-reverse" class="primary-btn">Проверить ответ</button>
        <button id="cancel-game" class="secondary-btn">Отмена</button>
      </div>
    `;

    const usedHints = [];
    let maxScore = game.maxScore;

    // Подсказки
    document.querySelectorAll('.hint-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.hintIndex);
        const hint = game.hints[index];
        
        usedHints.push(index);
        maxScore -= hint.penaltyCost;
        
        document.getElementById('current-max-score').textContent = maxScore;
        btn.disabled = true;
        
        const revealed = document.getElementById('revealed-hints');
        revealed.innerHTML += `
          <div class="revealed-hint">
            <strong>Шаг ${hint.step} (${hint.language}):</strong>
            <p>${hint.text}</p>
          </div>
        `;
      });
    });

    // Отправка
    document.getElementById('submit-reverse').addEventListener('click', async () => {
      const guess = document.getElementById('guess-text').value.trim();
      
      if (!guess) {
        alert('Введите ваше предположение');
        return;
      }

      const evaluation = await api.evaluateReverse(
        this.currentGame.runId || 'current',
        guess,
        usedHints
      );

      this.showReverseResult(evaluation);
    });

    document.getElementById('cancel-game').addEventListener('click', () => {
      container.classList.add('hidden');
    });
  },

  showReverseResult(evaluation) {
    const container = document.getElementById('game-mode-container');
    
    const gradeClass = evaluation.finalScore >= 90 ? 'excellent' : 
                       evaluation.finalScore >= 70 ? 'good' : 'fair';

    container.innerHTML = `
      <div class="game-result ${gradeClass}">
        <h2>Результат</h2>
        
        <div class="score-display">
          <div class="score-circle">
            <span class="score-value">${evaluation.finalScore}</span>
            <span class="score-label">очков</span>
          </div>
          <div class="grade">${evaluation.grade}</div>
        </div>

        <div class="comparison">
          <div class="comparison-section">
            <strong>Ваш ответ:</strong>
            <p class="user-answer">${evaluation.userGuess}</p>
          </div>
          <div class="comparison-section">
            <strong>Исходный текст:</strong>
            <p class="original-text">${evaluation.originalText}</p>
          </div>
        </div>

        <div class="stats">
          <div class="stat-item">
            <strong>Сходство:</strong> ${Math.round(evaluation.similarity * 100)}%
          </div>
          <div class="stat-item">
            <strong>Использовано подсказок:</strong> ${evaluation.hintsUsed}
          </div>
          <div class="stat-item">
            <strong>Штраф:</strong> -${evaluation.penalty} очков
          </div>
        </div>

        <button id="play-again" class="primary-btn">Играть ещё</button>
      </div>
    `;

    document.getElementById('play-again').addEventListener('click', () => {
      container.classList.add('hidden');
    });
  }
};