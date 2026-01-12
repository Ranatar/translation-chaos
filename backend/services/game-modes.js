import embeddingService from './embeddings.js';
import translatorService from './translator.js';
import db from '../database/db.js'

class GameModesService {
  
  // ====== РЕЖИМ "ПРЕДСКАЗАТЕЛЬ" ======
  async predictorMode(text, chain) {
    // Предварительный расчёт ожидаемого дрейфа
    const estimate = await this.estimateDrift(text, chain);
    
    return {
      mode: 'predictor',
      text,
      chain,
      estimatedDrift: estimate,
      targetRange: {
        min: Math.max(0, estimate - 0.15),
        max: Math.min(1, estimate + 0.15)
      }
    };
  }

  async evaluatePrediction(runId, userPrediction) {
    // Получить реальный результат из БД
    const run = await db.getRun(runId);
    const actualDrift = run.overallDrift;
    
    const error = Math.abs(actualDrift - userPrediction);
    const accuracy = Math.max(0, 1 - error);
    
    // Система очков
    let score = 0;
    let grade = '';
    
    if (error < 0.02) {
      score = 100;
      grade = 'Идеально!';
    } else if (error < 0.05) {
      score = 95;
      grade = 'Отлично!';
    } else if (error < 0.10) {
      score = 80;
      grade = 'Хорошо';
    } else if (error < 0.20) {
      score = 60;
      grade = 'Неплохо';
    } else {
      score = 30;
      grade = 'Попробуйте ещё';
    }

    return {
      userPrediction,
      actualDrift,
      error,
      accuracy,
      score,
      grade
    };
  }

  // Оценка ожидаемого дрейфа на основе цепочки
  async estimateDrift(text, chain) {
    // Простая эвристика: больше языков = больше дрейф
    const length = chain.length;
    
    // Оценка "экзотичности" языковых пар
    const exoticScore = this.calculateExoticScore(chain);
    
    // Базовая формула
    const baseDrift = Math.min(0.9, 0.1 * length + exoticScore * 0.3);
    
    // Добавляем случайность ±10%
    return Math.max(0.1, Math.min(0.95, baseDrift + (Math.random() - 0.5) * 0.2));
  }

  calculateExoticScore(chain) {
    // Словарь "экзотичности" языков
    const exoticLanguages = {
      'eu': 0.9, 'ka': 0.9, 'is': 0.8, 'mt': 0.8,
      'hy': 0.8, 'cy': 0.7, 'hu': 0.7, 'fi': 0.7,
      'ja': 0.6, 'ko': 0.6, 'ar': 0.5, 'he': 0.5
    };
    
    let score = 0;
    for (const lang of chain) {
      score += exoticLanguages[lang] || 0.2;
    }
    
    return score / chain.length;
  }

  // ====== РЕЖИМ "АРХЕОЛОГ" ======
  async archeologistMode(results, analysis) {
    // Найти самый большой скачок дрейфа
    let maxDriftStep = 0;
    let maxDrift = 0;
    
    for (let i = 1; i < analysis.length; i++) {
      const drift = analysis[i].localDrift || 0;
      if (drift > maxDrift) {
        maxDrift = drift;
        maxDriftStep = i;
      }
    }

    // Создать варианты ответа (правильный + 2 случайных)
    const options = [maxDriftStep];
    while (options.length < 3) {
      const random = Math.floor(Math.random() * (analysis.length - 1)) + 1;
      if (!options.includes(random)) {
        options.push(random);
      }
    }
    
    // Перемешать
    options.sort(() => Math.random() - 0.5);

    return {
      mode: 'archeologist',
      question: 'На каком шаге произошёл критический сдвиг смысла?',
      options: options.map(step => ({
        step,
        language: analysis[step - 1].language,
        text: results[step].text.substring(0, 100) + '...'
      })),
      correctAnswer: maxDriftStep,
      hint: `Подсказка: дрейф составил ${Math.round(maxDrift * 100)}%`
    };
  }

  evaluateArcheologist(userAnswer, correctAnswer) {
    const distance = Math.abs(userAnswer - correctAnswer);
    
    let score = 0;
    let feedback = '';
    
    if (distance === 0) {
      score = 100;
      feedback = 'Точно в цель! Вы настоящий археолог перевода!';
    } else if (distance === 1) {
      score = 75;
      feedback = 'Очень близко! Разница всего в один шаг.';
    } else if (distance === 2) {
      score = 50;
      feedback = 'Неплохая интуиция, но можно точнее.';
    } else {
      score = 25;
      feedback = 'Критическая точка была в другом месте.';
    }

    return { score, feedback, distance, correctAnswer };
  }

  // ====== РЕЖИМ "ОБРАТНАЯ ИНЖЕНЕРИЯ" ======
  async reverseEngineeringMode(results, analysis) {
    const originalText = results[0].text;
    const finalText = results[results.length - 1].text;
    const chain = results.map(r => r.language);

    // Генерируем подсказки (показываем промежуточные шаги за штраф)
    const hints = [];
    for (let i = 1; i < results.length - 1; i++) {
      hints.push({
        step: i,
        language: results[i].language,
        text: results[i].text,
        penaltyCost: 10 // очки штрафа
      });
    }

    return {
      mode: 'reverse',
      finalText,
      chain,
      hints,
      maxScore: 100
    };
  }

  evaluateReverse(userGuess, originalText, hintsUsed) {
    // Нечёткое сравнение (Levenshtein distance)
    const similarity = this.levenshteinSimilarity(
      userGuess.toLowerCase().trim(),
      originalText.toLowerCase().trim()
    );

    const penalty = hintsUsed.length * 10;
    const baseScore = Math.round(similarity * 100);
    const finalScore = Math.max(0, baseScore - penalty);

    let grade = '';
    if (finalScore >= 90) grade = 'Гениально!';
    else if (finalScore >= 70) grade = 'Отлично!';
    else if (finalScore >= 50) grade = 'Хорошо';
    else if (finalScore >= 30) grade = 'Неплохо';
    else grade = 'Попробуйте ещё';

    return {
      userGuess,
      originalText,
      similarity,
      penalty,
      finalScore,
      grade,
      hintsUsed: hintsUsed.length
    };
  }

  levenshteinSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - distance / maxLen;
  }

  // ====== РЕЖИМ "ЧЕЛЛЕНДЖ" ======
  generateDailyChallenges() {
    const today = new Date().toISOString().split('T')[0];
    
    // Используем дату как seed для консистентности
    const seed = this.hashCode(today);
    const random = this.seededRandom(seed);

    const challenges = [
      {
        id: `drift-${today}`,
        title: 'Экстремальный дрейф',
        description: 'Получите дрейф >80% за 5 шагов',
        type: 'drift',
        target: { drift: 0.8, maxSteps: 5 },
        reward: 'achievement_extreme_drift',
        difficulty: '⭐⭐⭐⭐⭐'
      },
      {
        id: `preserve-${today}`,
        title: 'Сохранить ключевые слова',
        description: 'Сохраните хотя бы 2 ключевых слова через 10 языков',
        type: 'preserve',
        target: { minKeywords: 2, steps: 10 },
        reward: 'achievement_keyword_master',
        difficulty: '⭐⭐⭐⭐'
      },
      {
        id: `transform-${today}`,
        title: 'Трансформация противоположностей',
        description: `Найдите цепочку, где "${this.getRandomWord(random)}" превращается в свою противоположность`,
        type: 'transform',
        target: { word: this.getRandomWord(random) },
        reward: 'achievement_opposites',
        difficulty: '⭐⭐⭐'
      }
    ];

    return challenges;
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  getRandomWord(random) {
    const words = ['любовь', 'мир', 'свет', 'радость', 'жизнь', 'добро'];
    return words[Math.floor(random * words.length)];
  }
}

export default new GameModesService();