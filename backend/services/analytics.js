import natural from 'natural'; // npm install natural
import embeddingService from './embeddings.js';

class AnalyticsService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
  }

  // ====== ДЕТАЛЬНЫЙ АНАЛИЗ КАЖДОГО ШАГА ======
  async analyzeStep(currentText, previousText, fromLang, toLang, service) {
    // Токенизация
    const currentTokens = this.tokenizer.tokenize(currentText.toLowerCase());
    const previousTokens = this.tokenizer.tokenize(previousText.toLowerCase());

    // Потерянные и новые слова
    const lost = previousTokens.filter(t => !currentTokens.includes(t));
    const gained = currentTokens.filter(t => !previousTokens.includes(t));
    const preserved = previousTokens.filter(t => currentTokens.includes(t));

    // Изменение длины
    const lengthChange = currentText.length - previousText.length;
    const lengthChangePercent = (lengthChange / previousText.length) * 100;

    // Семантический анализ
    const prevEmb = await embeddingService.getEmbedding(previousText);
    const currEmb = await embeddingService.getEmbedding(currentText);
    const localSimilarity = prevEmb && currEmb 
      ? embeddingService.cosineSimilarity(prevEmb, currEmb)
      : embeddingService.jaccardSimilarity(previousText, currentText);

    // Определение типа изменения
    const changeType = this.classifyChange(localSimilarity);

    // Возможные причины дрейфа
    const reasons = this.analyzeDriftReasons(
      fromLang, 
      toLang, 
      lost, 
      gained, 
      localSimilarity
    );

    return {
      fromLang,
      toLang,
      service,
      previousText,
      currentText,
      localSimilarity,
      localDrift: 1 - localSimilarity,
      changeType,
      tokens: {
        lost,
        gained,
        preserved,
        lostCount: lost.length,
        gainedCount: gained.length,
        preservedCount: preserved.length
      },
      lengthChange,
      lengthChangePercent: Math.round(lengthChangePercent),
      reasons,
      confidence: this.calculateConfidence(service, localSimilarity)
    };
  }

  classifyChange(similarity) {
    if (similarity > 0.95) return { type: 'minimal', label: 'Минимальное изменение', icon: '✓' };
    if (similarity > 0.85) return { type: 'stable', label: 'Стабильный шаг', icon: '→' };
    if (similarity > 0.70) return { type: 'moderate', label: 'Умеренный дрейф', icon: '⚠️' };
    if (similarity > 0.50) return { type: 'significant', label: 'Значительный сдвиг', icon: '⚡' };
    return { type: 'critical', label: 'Критический сдвиг', icon: '🔥' };
  }

  analyzeDriftReasons(fromLang, toLang, lost, gained, similarity) {
    const reasons = [];

    // Редкая языковая пара
    const rarePairs = ['eu', 'ka', 'is', 'mt', 'cy', 'hy'];
    if (rarePairs.includes(fromLang) || rarePairs.includes(toLang)) {
      reasons.push({
        type: 'rare_pair',
        description: `Редкая языковая пара ${fromLang}→${toLang}`,
        impact: 'high'
      });
    }

    // Большая потеря слов
    if (lost.length > 3) {
      reasons.push({
        type: 'word_loss',
        description: `Потеряно ${lost.length} слов: ${lost.slice(0, 3).join(', ')}...`,
        impact: 'medium'
      });
    }

    // Низкое сходство
    if (similarity < 0.7) {
      reasons.push({
        type: 'semantic_shift',
        description: 'Семантический сдвиг - изменение общего смысла',
        impact: 'high'
      });
    }

    // Добавление новых концептов
    if (gained.length > lost.length) {
      reasons.push({
        type: 'concept_expansion',
        description: 'Появление новых концептов в переводе',
        impact: 'medium'
      });
    }

    return reasons;
  }

  calculateConfidence(service, similarity) {
    // Эвристика доверия к разным сервисам
    const serviceConfidence = {
      'google': 0.85,
      'mymemory': 0.70,
      'libretranslate': 0.75
    };

    const baseConfidence = serviceConfidence[service] || 0.70;
    
    // Корректируем на основе сходства
    const adjusted = baseConfidence * (0.5 + similarity * 0.5);
    
    return Math.round(adjusted * 100) / 100;
  }

  // ====== СЕМАНТИЧЕСКИЕ КЛАСТЕРЫ ======
  async extractSemanticClusters(text) {
    // Извлечение ключевых концептов через TF-IDF
    this.tfidf.addDocument(text);
    
    const terms = [];
    this.tfidf.listTerms(0).forEach(item => {
      if (item.tfidf > 0.1) {
        terms.push({ term: item.term, weight: item.tfidf });
      }
    });

    // Группировка по семантическим категориям (упрощённо)
    const clusters = this.categorizeTerms(terms);

    return clusters;
  }

  categorizeTerms(terms) {
    // Словари категорий (упрощённая версия)
    const categories = {
      movement: ['пошёл', 'идти', 'went', 'go', 'move', 'walk'],
      commerce: ['магазин', 'shop', 'store', 'купить', 'buy'],
      religion: ['храм', 'temple', 'church', 'святой', 'sacred'],
      food: ['хлеб', 'bread', 'еда', 'food'],
      emotion: ['любовь', 'love', 'радость', 'joy', 'страх', 'fear']
    };

    const result = {};
    
    for (const term of terms) {
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(kw => term.term.includes(kw) || kw.includes(term.term))) {
          if (!result[category]) result[category] = [];
          result[category].push(term.term);
        }
      }
    }

    return result;
  }

  // ====== ИНТЕРЕСНЫЕ МУТАЦИИ ======
  findInterestingMutations(results, analysis) {
    const mutations = [];

    for (let i = 1; i < results.length; i++) {
      const step = analysis[i - 1];
      
      // Критический сдвиг
      if (step.localDrift && step.localDrift > 0.4) {
        mutations.push({
          type: 'critical_drift',
          step: i,
          language: results[i].language,
          description: `Критический сдвиг на шаге ${i}: ${results[i - 1].text.substring(0, 50)} → ${results[i].text.substring(0, 50)}`,
          drift: step.localDrift
        });
      }

      // Неожиданное исчезновение слова
      if (step.tokens && step.tokens.lostCount > 5) {
        mutations.push({
          type: 'word_disappearance',
          step: i,
          language: results[i].language,
          description: `Массовое исчезновение слов: ${step.tokens.lost.slice(0, 3).join(', ')}`,
          lostWords: step.tokens.lost
        });
      }

      // Появление нового концепта
      if (step.reasons && step.reasons.some(r => r.type === 'concept_expansion')) {
        mutations.push({
          type: 'new_concept',
          step: i,
          language: results[i].language,
          description: `Появление новых концептов: ${step.tokens.gained.slice(0, 3).join(', ')}`,
          newWords: step.tokens.gained
        });
      }
    }

    return mutations;
  }
}

export default new AnalyticsService();