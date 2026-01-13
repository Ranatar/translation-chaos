import express from 'express';
import translatorService from '../services/translator.js';
import embeddingService from '../services/embeddings.js';
import db from '../database/db.js';
import presets from '../services/presets.js';

const router = express.Router();

// ИСПРАВЛЕНО: Добавлен try-catch
// GET предустановленные цепочки
router.get('/presets', (req, res) => {
  try {
    res.json(presets.getAll());
  } catch (error) {
    console.error('Presets error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST запуск перевода
router.post('/run', async (req, res) => {
  try {
    const { text, languages, preset } = req.body;
    
    // ИСПРАВЛЕНО: Добавлена валидация входных данных
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid text' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 chars)' });
    }
    
    // Используем preset или кастомную цепочку
    const chain = preset 
      ? presets.get(preset).languages 
      : languages;

    if (!chain || chain.length < 3) {
      return res.status(400).json({ error: 'Invalid language chain (minimum 3 languages required)' });
    }

    // Запускаем перевод
    const results = await translatorService.translateChain(text, chain);
    
    // Анализируем семантику
    const analysis = await embeddingService.analyzeChain(results);

    // Вычисляем метрики для сохранения
    const overallDrift = 1 - (analysis[analysis.length - 1]?.similarity || 0);
    const finalText = results[results.length - 1]?.text;

    // Сохраняем в БД
    const runId = db.saveTranslationRun({
      originalText: text,
      chain: JSON.stringify(chain),
      results: JSON.stringify(results),
      analysis: JSON.stringify(analysis),
      timestamp: Date.now(),
      overallDrift: overallDrift,
      finalText: finalText
    });

    res.json({
      runId,
      results,
      analysis,
      finalText: finalText,
      overallDrift: overallDrift
    });

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ИСПРАВЛЕНО: Добавлен try-catch
// GET история запусков
router.get('/history', (req, res) => {
  try {
    const history = db.getHistory(20);
    res.json(history);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ИСПРАВЛЕНО: Добавлен try-catch
// GET конкретный запуск
router.get('/run/:id', (req, res) => {
  try {
    const run = db.getRun(req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    res.json(run);
  } catch (error) {
    console.error('Get run error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;