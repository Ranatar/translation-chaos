import express from 'express';
import translatorService from '../services/translator.js';
import embeddingService from '../services/embeddings.js';
import db from '../database/db.js';
import presets from '../services/presets.js';

const router = express.Router();

// GET предустановленные цепочки
router.get('/presets', (req, res) => {
  res.json(presets.getAll());
});

// POST запуск перевода
router.post('/run', async (req, res) => {
  try {
    const { text, languages, preset } = req.body;
    
    // Используем preset или кастомную цепочку
    const chain = preset 
      ? presets.get(preset).languages 
      : languages;

    if (!chain || chain.length < 3) {
      return res.status(400).json({ error: 'Invalid language chain' });
    }

    // Запускаем перевод
    const results = await translatorService.translateChain(text, chain);
    
    // Анализируем семантику
    const analysis = await embeddingService.analyzeChain(results);

    // Сохраняем в БД
    const runId = db.saveTranslationRun({
      originalText: text,
      chain: JSON.stringify(chain),
      results: JSON.stringify(results),
      analysis: JSON.stringify(analysis),
      timestamp: Date.now()
    });

    res.json({
      runId,
      results,
      analysis,
      finalText: results[results.length - 1].text,
      overallDrift: 1 - (analysis[analysis.length - 1]?.similarity || 0)
    });

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET история запусков
router.get('/history', (req, res) => {
  const history = db.getHistory(20);
  res.json(history);
});

// GET конкретный запуск
router.get('/run/:id', (req, res) => {
  const run = db.getRun(req.params.id);
  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }
  res.json(run);
});

export default router;