import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 });

class EmbeddingService {
  constructor() {
    this.hfToken = process.env.HUGGINGFACE_TOKEN;
    this.model = 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2';
  }

  // Hugging Face Inference API
  async getEmbedding(text) {
    const cacheKey = `emb_${text}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${this.model}`,
        { inputs: text },
        { headers: { Authorization: `Bearer ${this.hfToken}` } }
      );
      
      // HF возвращает массив [embedding]
      const embedding = response.data[0] || response.data;
      cache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      console.error('Embedding error:', error.message);
      // Fallback на простые метрики
      return null;
    }
  }

  // Косинусное сходство
  cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2) return null;
    
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    
    return dotProduct / (mag1 * mag2);
  }

  // Простая Jaccard similarity (без embeddings)
  jaccardSimilarity(text1, text2) {
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }

  // Анализ всей цепочки
  async analyzeChain(results) {
    const originalText = results[0].text;
    const analysis = [];

    // Получаем embedding оригинала
    const originalEmb = await this.getEmbedding(originalText);

    for (let i = 1; i < results.length; i++) {
      const current = results[i];
      if (!current.text) continue;

      const currentEmb = await this.getEmbedding(current.text);
      
      // Сходство с оригиналом
      const similarity = originalEmb && currentEmb 
        ? this.cosineSimilarity(originalEmb, currentEmb)
        : null;

      // Fallback на Jaccard
      const jaccardSim = this.jaccardSimilarity(originalText, current.text);

      // Локальный дрейф (с предыдущим шагом)
      const prevEmb = i > 1 ? await this.getEmbedding(results[i-1].text) : originalEmb;
      const localDrift = prevEmb && currentEmb
        ? 1 - this.cosineSimilarity(prevEmb, currentEmb)
        : null;

      analysis.push({
        step: i,
        language: current.language,
        similarity: similarity || jaccardSim, // Используем fallback
        localDrift: localDrift,
        text: current.text
      });

      // Задержка для HF API
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return analysis;
  }
}

export default new EmbeddingService();