import translate from '@vitalets/google-translate-api';
import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 }); // Кэш на 1 час

// Множественные источники для надёжности
class TranslatorService {
  constructor() {
    this.services = [
      { name: 'google', fn: this.googleTranslate },
      { name: 'mymemory', fn: this.myMemoryTranslate },
      { name: 'libretranslate', fn: this.libreTranslate }
    ];
    this.currentService = 0;
  }

  // Google Translate (неофициальный API)
  async googleTranslate(text, from, to) {
    const cacheKey = `gt_${from}_${to}_${text}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const result = await translate(text, { from, to });
      cache.set(cacheKey, result.text);
      return result.text;
    } catch (error) {
      console.error('Google Translate error:', error.message);
      throw error;
    }
  }

  // MyMemory API (1000 запросов/день бесплатно)
  async myMemoryTranslate(text, from, to) {
    const cacheKey = `mm_${from}_${to}_${text}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const langPair = `${from}|${to}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
      const response = await axios.get(url);
      
      if (response.data.responseStatus === 200) {
        const translated = response.data.responseData.translatedText;
        cache.set(cacheKey, translated);
        return translated;
      }
      throw new Error('MyMemory API error');
    } catch (error) {
      console.error('MyMemory error:', error.message);
      throw error;
    }
  }

  // LibreTranslate (self-hosted или публичный инстанс)
  async libreTranslate(text, from, to) {
    const cacheKey = `lt_${from}_${to}_${text}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const url = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com/translate';
      const response = await axios.post(url, {
        q: text,
        source: from,
        target: to,
        format: 'text'
      });
      
      cache.set(cacheKey, response.data.translatedText);
      return response.data.translatedText;
    } catch (error) {
      console.error('LibreTranslate error:', error.message);
      throw error;
    }
  }

  // Основной метод с fallback
  async translate(text, from, to, retries = 3) {
    for (let i = 0; i < retries; i++) {
      const service = this.services[this.currentService];
      
      try {
        console.log(`Trying ${service.name}: ${from} → ${to}`);
        const result = await service.fn.call(this, text, from, to);
        return { text: result, service: service.name };
      } catch (error) {
        console.log(`${service.name} failed, trying next...`);
        this.currentService = (this.currentService + 1) % this.services.length;
        
        if (i === retries - 1) {
          throw new Error(`All translation services failed for ${from}→${to}`);
        }
      }
    }
  }

  // Перевод всей цепочки
  async translateChain(text, languageChain) {
    const results = [{
      step: 0,
      language: languageChain[0],
      text: text,
      service: 'original'
    }];

    let currentText = text;
    
    for (let i = 0; i < languageChain.length - 1; i++) {
      const from = languageChain[i];
      const to = languageChain[i + 1];
      
      try {
        const translated = await this.translate(currentText, from, to);
        
        results.push({
          step: i + 1,
          language: to,
          text: translated.text,
          service: translated.service,
          from: from
        });
        
        currentText = translated.text;
        
        // Небольшая задержка для избежания rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        results.push({
          step: i + 1,
          language: to,
          text: null,
          error: error.message,
          from: from
        });
        break;
      }
    }

    return results;
  }
}

export default new TranslatorService();