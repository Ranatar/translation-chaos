import express from 'express';
import achievementsService from '../services/achievements.js';
import db from '../database/db.js'

const router = express.Router();

// Получить статистику пользователя
router.get('/stats', (req, res) => {
  const stats = achievementsDb.getUserStats();
  res.json(stats);
});

// Получить все достижения с прогрессом
router.get('/all', (req, res) => {
  const stats = achievementsDb.getUserStats();
  const achievements = achievementsService.getAllWithProgress(stats);
  res.json(achievements);
});

// Проверить достижения после запуска
router.post('/check/:runId', async (req, res) => {
  try {
    const run = await db.getRun(req.params.runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const stats = achievementsDb.getUserStats();
    const unlocked = achievementsService.checkAchievements(stats, run);

    // Сохранить новые достижения
    for (const achievement of unlocked) {
      achievementsDb.unlockAchievement(achievement.id);
    }

    res.json(unlocked);
  } catch (error) {
    console.error('Achievement check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить награды за достижение
router.get('/reward/:achievementId', (req, res) => {
  const reward = achievementsService.getRewards(req.params.achievementId);
  res.json(reward);
});

export default router;