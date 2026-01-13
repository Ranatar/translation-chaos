import express from 'express';
import achievementsService from '../services/achievements.js';
import db from '../database/db.js';

const router = express.Router();

// ИСПРАВЛЕНО: Добавлен try-catch
// Получить статистику пользователя
router.get('/stats', (req, res) => {
  try {
    const stats = db.getUserStats();
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ИСПРАВЛЕНО: Добавлен try-catch
// Получить все достижения с прогрессом
router.get('/all', (req, res) => {
  try {
    const stats = db.getUserStats();
    const achievements = achievementsService.getAllWithProgress(stats);
    res.json(achievements);
  } catch (error) {
    console.error('Achievements error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Проверить достижения после запуска
router.post('/check/:runId', async (req, res) => {
  try {
    const run = await db.getRun(req.params.runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const stats = db.getUserStats();
    const unlocked = achievementsService.checkAchievements(stats, run);

    // Сохранить новые достижения
    for (const achievement of unlocked) {
      db.unlockAchievement(achievement.id);
    }

    res.json(unlocked);
  } catch (error) {
    console.error('Achievement check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ИСПРАВЛЕНО: Добавлен try-catch
// Получить награды за достижение
router.get('/reward/:achievementId', (req, res) => {
  try {
    const reward = achievementsService.getRewards(req.params.achievementId);
    res.json(reward);
  } catch (error) {
    console.error('Reward error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;