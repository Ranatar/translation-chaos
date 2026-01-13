import express from 'express';
import gameModesService from '../services/game-modes.js';
import db from '../database/db.js';

const router = express.Router();

// Инициализация игрового режима "Предсказатель"
router.post('/predictor/init', async (req, res) => {
  try {
    const { text, chain } = req.body;
    const game = await gameModesService.predictorMode(text, chain);
    res.json(game);
  } catch (error) {
    console.error('Predictor init error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====== ИСПРАВЛЕНО: evaluatePrediction ======
router.post('/predictor/evaluate', async (req, res) => {
  try {
    const { runId, prediction } = req.body;
    
    // ИСПРАВЛЕНО: Получить run здесь, не в сервисе
    const run = await db.getRun(runId);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    // ИСПРАВЛЕНО: Передать run object вместо runId
    const result = await gameModesService.evaluatePrediction(run, prediction);
    
    db.saveGameResult({
      mode: 'predictor',
      runId,
      score: result.score,
      data: JSON.stringify(result)
    });
    
    res.json(result);
  } catch (error) {
    console.error('Predictor evaluation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Инициализация режима "Археолог"
router.post('/archeologist/init', async (req, res) => {
  try {
    const { runId } = req.body;
    const run = await db.getRun(runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    const game = await gameModesService.archeologistMode(
      run.results,
      run.analysis
    );
    
    res.json(game);
  } catch (error) {
    console.error('Archeologist init error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Оценка ответа археолога
router.post('/archeologist/evaluate', async (req, res) => {
  try {
    const { runId, answer } = req.body;
    const run = await db.getRun(runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    const game = await gameModesService.archeologistMode(run.results, run.analysis);
    const result = gameModesService.evaluateArcheologist(answer, game.correctAnswer);
    
    db.saveGameResult({
      mode: 'archeologist',
      runId,
      score: result.score,
      data: JSON.stringify(result)
    });
    
    res.json(result);
  } catch (error) {
    console.error('Archeologist evaluation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Инициализация "Обратной инженерии"
router.post('/reverse/init', async (req, res) => {
  try {
    const { runId } = req.body;
    const run = await db.getRun(runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    const game = await gameModesService.reverseEngineeringMode(
      run.results,
      run.analysis
    );
    
    res.json(game);
  } catch (error) {
    console.error('Reverse init error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Оценка обратной инженерии
router.post('/reverse/evaluate', async (req, res) => {
  try {
    const { runId, guess, hintsUsed } = req.body;
    const run = await db.getRun(runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    const result = gameModesService.evaluateReverse(
      guess,
      run.results[0].text,
      hintsUsed
    );
    
    db.saveGameResult({
      mode: 'reverse',
      runId,
      score: result.finalScore,
      data: JSON.stringify(result)
    });
    
    res.json(result);
  } catch (error) {
    console.error('Reverse evaluation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить ежедневные челленджи
router.get('/challenges/daily', (req, res) => {
  try {
    const challenges = gameModesService.generateDailyChallenges();
    res.json(challenges);
  } catch (error) {
    console.error('Daily challenges error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;