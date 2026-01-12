import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/translations.db');

const db = new Database(dbPath);

// Расширение схемы БД
db.exec(`
  CREATE TABLE IF NOT EXISTS user_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_runs INTEGER DEFAULT 0,
    max_drift REAL DEFAULT 0,
    unique_languages INTEGER DEFAULT 0,
    languages_used TEXT DEFAULT '[]',
    perfect_predictions INTEGER DEFAULT 0,
    prediction_streak INTEGER DEFAULT 0,
    archeologist_perfect INTEGER DEFAULT 0,
    archeologist_wins INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    last_daily_challenge DATE,
    unlocked_achievements TEXT DEFAULT '[]',
    achievement_dates TEXT DEFAULT '{}',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS game_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL,
    run_id INTEGER,
    score INTEGER,
    data TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (run_id) REFERENCES translation_runs(id)
  );

  -- Инициализировать user_stats если пусто
  INSERT OR IGNORE INTO user_stats (id) VALUES (1);
`);

export default {
  // Получить статистику пользователя
  getUserStats() {
    const stmt = db.prepare('SELECT * FROM user_stats WHERE id = 1');
    const row = stmt.get();
    
    return {
      ...row,
      languages_used: JSON.parse(row.languages_used || '[]'),
      unlocked_achievements: JSON.parse(row.unlocked_achievements || '[]'),
      achievement_dates: JSON.parse(row.achievement_dates || '{}')
    };
  },

  // Обновить статистику
  updateStats(updates) {
    const fields = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.values(updates);
    values.push(1); // id = 1

    const stmt = db.prepare(`UPDATE user_stats SET ${fields} WHERE id = ?`);
    stmt.run(...values);
  },

  // Добавить достижение
  unlockAchievement(achievementId) {
    const stats = this.getUserStats();
    
    if (!stats.unlocked_achievements.includes(achievementId)) {
      stats.unlocked_achievements.push(achievementId);
      stats.achievement_dates[achievementId] = Date.now();

      this.updateStats({
        unlocked_achievements: JSON.stringify(stats.unlocked_achievements),
        achievement_dates: JSON.stringify(stats.achievement_dates)
      });

      return true;
    }

    return false;
  },

  // Сохранить результат игры
  saveGameResult(data) {
    const stmt = db.prepare(`
      INSERT INTO game_results (mode, run_id, score, data, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      data.mode,
      data.runId,
      data.score,
      data.data,
      Date.now()
    ).lastInsertRowid;
  },

  // Получить историю игр
  getGameHistory(mode = null, limit = 20) {
    let query = 'SELECT * FROM game_results';
    const params = [];

    if (mode) {
      query += ' WHERE mode = ?';
      params.push(mode);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  // Обновить статистику после завершения перевода
  updateStatsAfterRun(run) {
    const stats = this.getUserStats();

    // Обновляем счётчики
    const updates = {
      total_runs: stats.total_runs + 1,
      max_drift: Math.max(stats.max_drift, run.overallDrift || 0)
    };

    // Добавляем новые языки
    const languagesUsed = new Set(stats.languages_used);
    if (run.chain) {
      run.chain.forEach(lang => languagesUsed.add(lang));
      updates.languages_used = JSON.stringify([...languagesUsed]);
      updates.unique_languages = languagesUsed.size;
    }

    this.updateStats(updates);
  }
};