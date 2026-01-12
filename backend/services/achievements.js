class AchievementsService {
  constructor() {
    this.achievements = {
      // Базовые достижения
      first_chaos: {
        id: 'first_chaos',
        title: 'Первый хаос',
        description: 'Запустите первую цепочку переводов',
        icon: '🎯',
        category: 'beginner',
        condition: (stats) => stats.totalRuns >= 1,
        reward: 'preset_unlock_1'
      },
      
      // Достижения по дрейфу
      extreme_drift: {
        id: 'extreme_drift',
        title: 'Экстремал',
        description: 'Достигните дрейфа >90%',
        icon: '💀',
        category: 'drift',
        condition: (stats) => stats.maxDrift >= 0.90,
        reward: 'preset_unlock_extreme'
      },
      
      total_loss: {
        id: 'total_loss',
        title: 'Полная потеря',
        description: 'Достигните дрейфа 100%',
        icon: '🌑',
        category: 'drift',
        condition: (stats) => stats.maxDrift >= 0.99,
        reward: 'title_chaos_master'
      },
      
      minimal_drift: {
        id: 'minimal_drift',
        title: 'Хирургическая точность',
        description: 'Пройдите 10 языков с дрейфом <20%',
        icon: '🎯',
        category: 'drift',
        condition: (stats, run) => 
          run && run.chain.length >= 10 && run.overallDrift < 0.20,
        reward: 'preset_unlock_stable'
      },

      // Достижения предсказателя
      perfect_prediction: {
        id: 'perfect_prediction',
        title: 'Ясновидение',
        description: 'Предскажите дрейф с точностью >95% 5 раз',
        icon: '🔮',
        category: 'predictor',
        condition: (stats) => stats.perfectPredictions >= 5,
        reward: 'preset_unlock_prophet'
      },

      prediction_master: {
        id: 'prediction_master',
        title: 'Мастер предсказаний',
        description: '10 точных прогнозов подряд (точность >90%)',
        icon: '🌟',
        category: 'predictor',
        condition: (stats) => stats.predictionStreak >= 10,
        reward: 'title_oracle'
      },

      // Достижения археолога
      archeologist_novice: {
        id: 'archeologist_novice',
        title: 'Археолог-новичок',
        description: 'Найдите точку невозврата с первой попытки',
        icon: '⛏️',
        category: 'archeologist',
        condition: (stats) => stats.archeologistPerfect >= 1,
        reward: 'preset_unlock_critical'
      },

      archeologist_expert: {
        id: 'archeologist_expert',
        title: 'Мастер раскопок',
        description: 'Найдите критическую точку 20 раз',
        icon: '🏺',
        category: 'archeologist',
        condition: (stats) => stats.archeologistWins >= 20,
        reward: 'title_archeologist'
      },

      // Достижения обратной инженерии
      reverse_genius: {
        id: 'reverse_genius',
        title: 'Обратный гений',
        description: 'Угадайте исходный текст без подсказок',
        icon: '🧠',
        category: 'reverse',
        condition: (stats, run) => 
          run && run.mode === 'reverse' && run.hintsUsed === 0 && run.score >= 90,
        reward: 'preset_unlock_reverse'
      },

      // Достижения по языкам
      all_continents: {
        id: 'all_continents',
        title: 'Все континенты',
        description: 'Используйте языки всех континентов в одной цепочке',
        icon: '🌍',
        category: 'explorer',
        condition: (stats, run) => this.checkAllContinents(run),
        reward: 'preset_unlock_world'
      },

      polyglot: {
        id: 'polyglot',
        title: 'Полиглот',
        description: 'Используйте 50+ уникальных языков',
        icon: '🗣️',
        category: 'explorer',
        condition: (stats) => stats.uniqueLanguages >= 50,
        reward: 'title_polyglot'
      },

      // Достижения по количеству
      hundred_runs: {
        id: 'hundred_runs',
        title: 'Центурион',
        description: 'Запустите 100 переводов',
        icon: '💯',
        category: 'milestone',
        condition: (stats) => stats.totalRuns >= 100,
        reward: 'preset_unlock_all'
      },

      // Специальные достижения
      lucky_return: {
        id: 'lucky_return',
        title: 'Случайное возвращение',
        description: 'Финальный текст случайно совпал с исходным (>90% сходство)',
        icon: '🍀',
        category: 'special',
        condition: (stats, run) => 
          run && run.overallDrift < 0.10 && run.chain.length >= 5,
        reward: 'title_lucky'
      },

      linguistic_loop: {
        id: 'linguistic_loop',
        title: 'Языковая петля',
        description: 'Обнаружите цикл в переводах (текст повторился)',
        icon: '🔄',
        category: 'special',
        condition: (stats, run) => this.checkLoop(run),
        reward: 'preset_unlock_loop'
      },

      // Челлендж достижения
      daily_warrior: {
        id: 'daily_warrior',
        title: 'Ежедневный воин',
        description: 'Выполните 7 дневных челленджей подряд',
        icon: '⚔️',
        category: 'challenge',
        condition: (stats) => stats.dailyStreak >= 7,
        reward: 'title_warrior'
      },

      challenge_master: {
        id: 'challenge_master',
        title: 'Мастер челленджей',
        description: 'Выполните 50 челленджей',
        icon: '👑',
        category: 'challenge',
        condition: (stats) => stats.challengesCompleted >= 50,
        reward: 'title_master'
      }
    };
  }

  checkAllContinents(run) {
    if (!run || !run.chain) return false;

    const continents = {
      africa: ['sw', 'am', 'ha', 'ig', 'yo', 'zu'],
      asia: ['zh', 'ja', 'ko', 'th', 'vi', 'hi', 'ar', 'he', 'fa'],
      europe: ['en', 'de', 'fr', 'es', 'it', 'ru', 'pl', 'uk', 'el', 'is', 'no'],
      oceania: ['mi', 'sm', 'haw'],
      americas: ['es', 'pt', 'en'] // упрощенно
    };

    const usedContinents = new Set();
    
    for (const lang of run.chain) {
      for (const [continent, languages] of Object.entries(continents)) {
        if (languages.includes(lang)) {
          usedContinents.add(continent);
        }
      }
    }

    return usedContinents.size >= 4; // минимум 4 континента
  }

  checkLoop(run) {
    if (!run || !run.results) return false;

    const texts = run.results.map(r => r.text?.toLowerCase().trim());
    const seen = new Set();

    for (let i = 1; i < texts.length - 1; i++) { // игнорируем первый и последний
      if (seen.has(texts[i])) {
        return true;
      }
      seen.add(texts[i]);
    }

    return false;
  }

  // Проверка достижений для пользователя
  checkAchievements(userStats, latestRun = null) {
    const unlocked = [];

    for (const [id, achievement] of Object.entries(this.achievements)) {
      // Пропустить уже разблокированные
      if (userStats.unlockedAchievements?.includes(id)) continue;

      // Проверить условие
      if (achievement.condition(userStats, latestRun)) {
        unlocked.push({
          ...achievement,
          unlockedAt: Date.now()
        });
      }
    }

    return unlocked;
  }

  // Получить все достижения с прогрессом
  getAllWithProgress(userStats) {
    return Object.values(this.achievements).map(achievement => {
      const unlocked = userStats.unlockedAchievements?.includes(achievement.id);
      
      let progress = 0;
      if (!unlocked) {
        progress = this.calculateProgress(achievement, userStats);
      }

      return {
        ...achievement,
        unlocked,
        progress: unlocked ? 100 : progress,
        unlockedAt: unlocked ? userStats.achievementDates?.[achievement.id] : null
      };
    });
  }

  calculateProgress(achievement, stats) {
    // Эвристика для расчёта прогресса
    switch (achievement.id) {
      case 'first_chaos':
        return Math.min(100, stats.totalRuns * 100);
      case 'extreme_drift':
        return Math.min(100, (stats.maxDrift / 0.90) * 100);
      case 'hundred_runs':
        return Math.min(100, (stats.totalRuns / 100) * 100);
      case 'perfect_prediction':
        return Math.min(100, (stats.perfectPredictions / 5) * 100);
      case 'polyglot':
        return Math.min(100, (stats.uniqueLanguages / 50) * 100);
      default:
        return 0;
    }
  }

  // Награды
  getRewards(achievementId) {
    const achievement = this.achievements[achievementId];
    if (!achievement || !achievement.reward) return null;

    const rewards = {
      // Разблокировка пресетов
      preset_unlock_1: {
        type: 'preset',
        value: 'babel-tower',
        description: 'Разблокирован пресет "Вавилонская башня"'
      },
      preset_unlock_extreme: {
        type: 'preset',
        value: 'isolate-extreme',
        description: 'Разблокирован экстремальный пресет'
      },
      
      // Титулы
      title_chaos_master: {
        type: 'title',
        value: 'Мастер Хаоса',
        description: 'Новый титул доступен в профиле'
      },
      title_oracle: {
        type: 'title',
        value: 'Оракул',
        description: 'Новый титул доступен в профиле'
      }
    };

    return rewards[achievement.reward];
  }
}

export default new AchievementsService();