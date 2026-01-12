import natural from 'natural';

class KeywordTrackingService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
  }

  // ====== ИЗВЛЕЧЕНИЕ И ТРЕКИНГ КЛЮЧЕВЫХ СЛОВ ======
  extractKeywords(text, language = 'en') {
    // Токенизация
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    
    // Удаление стоп-слов
    const stopwords = this.getStopwords(language);
    const filtered = tokens.filter(token => 
      !stopwords.includes(token) && token.length > 2
    );

    // Стемминг для группировки
    const stemmed = filtered.map(token => ({
      original: token,
      stem: this.stemmer.stem(token)
    }));

    // Подсчёт частоты
    const frequency = {};
    stemmed.forEach(({ stem, original }) => {
      if (!frequency[stem]) {
        frequency[stem] = { count: 0, variants: [] };
      }
      frequency[stem].count++;
      if (!frequency[stem].variants.includes(original)) {
        frequency[stem].variants.push(original);
      }
    });

    // Топ ключевых слов
    const keywords = Object.entries(frequency)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([stem, data]) => ({
        stem,
        primary: data.variants[0],
        variants: data.variants,
        frequency: data.count
      }));

    return keywords;
  }

  // ====== ТРЕКИНГ ТРАНСФОРМАЦИЙ ======
  trackTransformations(results) {
    // Извлекаем ключевые слова из оригинала
    const originalKeywords = this.extractKeywords(results[0].text, results[0].language);
    
    const transformations = originalKeywords.map(keyword => {
      const chain = [{
        step: 0,
        language: results[0].language,
        word: keyword.primary,
        found: true
      }];

      // Отслеживаем через все шаги
      for (let i = 1; i < results.length; i++) {
        const currentText = results[i].text.toLowerCase();
        const currentTokens = this.tokenizer.tokenize(currentText);
        
        // Проверяем наличие (простой поиск по вхождению)
        const found = keyword.variants.some(variant => 
          currentTokens.some(token => 
            token.includes(variant) || variant.includes(token)
          )
        );

        if (found) {
          // Найти конкретное слово
          const matchedToken = currentTokens.find(token =>
            keyword.variants.some(v => token.includes(v) || v.includes(token))
          );
          
          chain.push({
            step: i,
            language: results[i].language,
            word: matchedToken || '?',
            found: true
          });
        } else {
          chain.push({
            step: i,
            language: results[i].language,
            word: null,
            found: false,
            status: 'lost'
          });
        }
      }

      // Определить судьбу слова
      const finalStatus = chain[chain.length - 1].found ? 'preserved' : 'lost';
      const lostAtStep = chain.findIndex(c => !c.found);

      return {
        keyword: keyword.primary,
        variants: keyword.variants,
        chain,
        finalStatus,
        lostAtStep: lostAtStep === -1 ? null : lostAtStep,
        preservationRate: chain.filter(c => c.found).length / chain.length
      };
    });

    return transformations;
  }

  getStopwords(language) {
    const stopwords = {
      'en': ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for'],
      'ru': ['и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все', 'она', 'так'],
      'default': ['the', 'is', 'at', 'and', 'or']
    };

    return stopwords[language] || stopwords['default'];
  }

  // ====== СОЗДАНИЕ ДЕРЕВА ТРАНСФОРМАЦИЙ ======
  buildTransformationTree(transformations) {
    return transformations.map(t => {
      const nodes = t.chain.map((link, i) => ({
        id: `${t.keyword}_${i}`,
        step: link.step,
        language: link.language,
        word: link.word,
        status: link.found ? 'active' : 'lost',
        parent: i > 0 ? `${t.keyword}_${i-1}` : null
      }));

      return {
        rootKeyword: t.keyword,
        nodes,
        finalStatus: t.finalStatus
      };
    });
  }
}

export default new KeywordTrackingService();