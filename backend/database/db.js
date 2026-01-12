import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/translations.db');

// Создать директорию data если не существует
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Включить WAL режим для лучшей производительности
db.pragma('journal_mode = WAL');

// Полная схема базы данных
db.exec(`
  -- Основная таблица переводов
  CREATE TABLE IF NOT EXISTS translation_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_text TEXT NOT NULL,
    chain TEXT NOT NULL,
    results TEXT NOT NULL,
    analysis TEXT,
    timestamp INTEGER NOT NULL,
    overall_drift REAL,
    final_text TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_timestamp ON translation_runs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_drift ON translation_runs(overall_drift);

  -- Результаты игр
  CREATE TABLE IF NOT EXISTS game_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL,
    run_id INTEGER,
    score INTEGER,
    data TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (run_id) REFERENCES translation_runs(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_game_mode ON game_results(mode);
  CREATE INDEX IF NOT EXISTS idx_game_timestamp ON game_results(timestamp);

  -- Статистика пользователя
  CREATE TABLE IF NOT EXISTS user_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_runs INTEGER DEFAULT 0,
    max_drift REAL DEFAULT 0,
    unique_languages INTEGER DEFAULT 0,
    languages_used TEXT DEFAULT '[]',
    perfect_predictions INTEGER DEFAULT 0,
    prediction_streak INTEGER DEFAULT 0,
    max_prediction_streak INTEGER DEFAULT 0,
    archeologist_perfect INTEGER DEFAULT 0,
    archeologist_wins INTEGER DEFAULT 0,
    reverse_no_hints INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    max_daily_streak INTEGER DEFAULT 0,
    last_daily_challenge DATE,
    unlocked_achievements TEXT DEFAULT '[]',
    achievement_dates TEXT DEFAULT '{}',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  -- Инициализировать user_stats
  INSERT OR IGNORE INTO user_stats (id) VALUES (1);

  -- Кэш для embeddings (опционально)
  CREATE TABLE IF NOT EXISTS embeddings_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    embedding BLOB NOT NULL,
    model TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_text_model ON embeddings_cache(text, model);

  -- Челленджи
  CREATE TABLE IF NOT EXISTS daily_challenges (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    data TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_challenge_date ON daily_challenges(date);
`);

export default {
  // Translation runs
  saveTranslationRun(data) {
    const stmt = db.prepare(`
      INSERT INTO translation_runs 
      (original_text, chain, results, analysis, timestamp, overall_drift, final_text)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.originalText,
      data.chain,
      data.results,
      data.analysis,
      data.timestamp,
      data.overallDrift || null,
      data.finalText || null
    );
    
    // Обновить статистику
    this.updateStatsAfterRun(data);
    
    return result.lastInsertRowid;
  },

  getRun(id) {
    const stmt = db.prepare('SELECT * FROM translation_runs WHERE id = ?');
    const row = stmt.get(id);
    
    if (!row) return null;
    
    return {
      id: row.id,
      originalText: row.original_text,
      chain: JSON.parse(row.chain),
      results: JSON.parse(row.results),
      analysis: JSON.parse(row.analysis),
      timestamp: row.timestamp,
      overallDrift: row.overall_drift,
      finalText: row.final_text
    };
  },

  getHistory(limit = 20) {
    const stmt = db.prepare(`
      SELECT id, original_text, chain, timestamp, overall_drift
      FROM translation_runs
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    return stmt.all(limit).map(row => ({
      id: row.id,
      originalText: row.original_text,
      chain: JSON.parse(row.chain),
      timestamp: row.timestamp,
      overallDrift: row.overall_drift
    }));
  },

  // User stats
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

  updateStats(updates) {
    const fields = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.values(updates);
    values.push(Date.now()); // updated_at
    values.push(1); // id = 1

    const stmt = db.prepare(`
      UPDATE user_stats 
      SET ${fields}, updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(...values);
  },

  updateStatsAfterRun(run) {
    const stats = this.getUserStats();

    const updates = {
      total_runs: stats.total_runs + 1
    };

    // Обновить макс. дрейф
    if (run.overallDrift && run.overallDrift > stats.max_drift) {
      updates.max_drift = run.overallDrift;
    }

    // Добавить новые языки
    if (run.chain) {
      const languagesUsed = new Set(stats.languages_used);
      const newChain = typeof run.chain === 'string' 
        ? JSON.parse(run.chain) 
        : run.chain;
      
      newChain.forEach(lang => languagesUsed.add(lang));
      updates.languages_used = JSON.stringify([...languagesUsed]);
      updates.unique_languages = languagesUsed.size;
    }

    this.updateStats(updates);
  },

  // Game results
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
    return stmt.all(...params).map(row => ({
      ...row,
      data: JSON.parse(row.data)
    }));
  },

  // Achievements
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

  // Embeddings cache
  getCachedEmbedding(text, model = 'default') {
    const stmt = db.prepare(`
      SELECT embedding FROM embeddings_cache 
      WHERE text = ? AND model = ?
    `);
    
    const row = stmt.get(text, model);
    if (!row) return null;
    
    // Преобразовать BLOB обратно в массив
    return Array.from(new Float32Array(row.embedding.buffer));
  },

  cacheEmbedding(text, embedding, model = 'default') {
    // Преобразовать массив в BLOB
    const buffer = new Float32Array(embedding).buffer;
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO embeddings_cache (text, embedding, model)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(text, Buffer.from(buffer), model);
  },

  // Daily challenges
  saveDailyChallenge(challengeId, date, data) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO daily_challenges (id, date, data)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(challengeId, date, JSON.stringify(data));
  },

  getDailyChallenge(challengeId) {
    const stmt = db.prepare(`
      SELECT * FROM daily_challenges WHERE id = ?
    `);
    
    const row = stmt.get(challengeId);
    if (!row) return null;
    
    return {
      ...row,
      data: JSON.parse(row.data)
    };
  },

  completeDailyChallenge(challengeId) {
    const stmt = db.prepare(`
      UPDATE daily_challenges 
      SET completed = 1, completed_at = ?
      WHERE id = ?
    `);
    
    stmt.run(Date.now(), challengeId);
    
    // Обновить streak
    const stats = this.getUserStats();
    const newStreak = stats.daily_streak + 1;
    const maxStreak = Math.max(stats.max_daily_streak, newStreak);
    
    this.updateStats({
      daily_streak: newStreak,
      max_daily_streak: maxStreak,
      challenges_completed: stats.challenges_completed + 1,
      last_daily_challenge: new Date().toISOString().split('T')[0]
    });
  },

  // Utility
  close() {
    db.close();
  },

  // Очистка старых данных
  cleanup(daysOld = 90) {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    const stmt = db.prepare(`
      DELETE FROM translation_runs WHERE timestamp < ?
    `);
    
    const result = stmt.run(cutoff);
    console.log(`Cleaned up ${result.changes} old runs`);
    
    // Очистка кэша embeddings
    const cacheStmt = db.prepare(`
      DELETE FROM embeddings_cache WHERE created_at < ?
    `);
    
    const cacheResult = cacheStmt.run(cutoff);
    console.log(`Cleaned up ${cacheResult.changes} cached embeddings`);
    
    // VACUUM для освобождения места
    db.exec('VACUUM');
  }
};