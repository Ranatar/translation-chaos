import express from 'express';
import gameModesService from '../services/game-modes.js';
import db from '../database/db.js';

const router = express.Router();

// Инициализация игрового режима "Предсказатель"
router.post('/predictor/init', async (req, res) => {
  const { text, chain } = req.body;
  const game = await gameModesService.predictorMode(text, chain);
  res.json(game);
});

// Оценка предсказания
router.post('/predictor/evaluate', async (req, res) => {
  const { runId, prediction } = req.body;
  const result = await gameModesService.evaluatePrediction(runId, prediction);
  
  // Сохранить результат игры
  db.saveGameResult({
    mode: 'predictor',
    runId,
    score: result.score,
    data: JSON.stringify(result)
  });
  
  res.json(result);
});

// Инициализация режима "Археолог"
router.post('/archeologist/init', async (req, res) => {
  const { runId } = req.body;
  const run = await db.getRun(runId);
  
  const game = await gameModesService.archeologistMode(
    run.results,
    run.analysis
  );
  
  res.json(game);
});

// Оценка ответа археолога
router.post('/archeologist/evaluate', async (req, res) => {
  const { runId, answer } = req.body;
  const run = await db.getRun(runId);
  
  const game = await gameModesService.archeologistMode(run.results, run.analysis);
  const result = gameModesService.evaluateArcheologist(answer, game.correctAnswer);
  
  db.saveGameResult({
    mode: 'archeologist',
    runId,
    score: result.score,
    data: JSON.stringify(result)
  });
  
  res.json(result);
});

// Инициализация "Обратной инженерии"
router.post('/reverse/init', async (req, res) => {
  const { runId } = req.body;
  const run = await db.getRun(runId);
  
  const game = await gameModesService.reverseEngineeringMode(
    run.results,
    run.analysis
  );
  
  res.json(game);
});

// Оценка обратной инженерии
router.post('/reverse/evaluate', async (req, res) => {
  const { runId, guess, hintsUsed } = req.body;
  const run = await db.getRun(runId);
  
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
});

// Получить ежедневные челленджи
router.get('/challenges/daily', (req, res) => {
  const challenges = gameModesService.generateDailyChallenges();
  res.json(challenges);
});

export default router;