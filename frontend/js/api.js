const API_URL = 'http://localhost:3000/api';

const api = {
  // ====== ПЕРЕВОДЫ ======
  async getPresets() {
    const response = await fetch(`${API_URL}/translate/presets`);
    return response.json();
  },

  async runTranslation(text, languages, preset = null) {
    const response = await fetch(`${API_URL}/translate/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, languages, preset })
    });
    return response.json();
  },

  async getHistory() {
    const response = await fetch(`${API_URL}/translate/history`);
    return response.json();
  },

  async getRun(id) {
    const response = await fetch(`${API_URL}/translate/run/${id}`);
    return response.json();
  },

  // ====== АНАЛИТИКА ======
  async getDetailedAnalysis(runId) {
    const response = await fetch(`${API_URL}/analytics/detailed/${runId}`);
    return response.json();
  },

  async getKeywordTransformations(runId) {
    const response = await fetch(`${API_URL}/analytics/keywords/${runId}`);
    return response.json();
  },

  async getMutations(runId) {
    const response = await fetch(`${API_URL}/analytics/mutations/${runId}`);
    return response.json();
  },

  // ====== ИГРОВЫЕ РЕЖИМЫ ======
  async initPredictorGame(text, chain) {
    const response = await fetch(`${API_URL}/games/predictor/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, chain })
    });
    return response.json();
  },

  async evaluatePrediction(runId, prediction) {
    const response = await fetch(`${API_URL}/games/predictor/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, prediction })
    });
    return response.json();
  },

  async initArcheologistGame(runId) {
    const response = await fetch(`${API_URL}/games/archeologist/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId })
    });
    return response.json();
  },

  async evaluateArcheologist(runId, answer) {
    const response = await fetch(`${API_URL}/games/archeologist/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, answer })
    });
    return response.json();
  },

  async initReverseGame(runId) {
    const response = await fetch(`${API_URL}/games/reverse/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId })
    });
    return response.json();
  },

  async evaluateReverse(runId, guess, hintsUsed) {
    const response = await fetch(`${API_URL}/games/reverse/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, guess, hintsUsed })
    });
    return response.json();
  },

  async getDailyChallenges() {
    const response = await fetch(`${API_URL}/games/challenges/daily`);
    return response.json();
  },

  // ====== ДОСТИЖЕНИЯ ======
  async getUserStats() {
    const response = await fetch(`${API_URL}/achievements/stats`);
    return response.json();
  },

  async getAllAchievements() {
    const response = await fetch(`${API_URL}/achievements/all`);
    return response.json();
  },

  async checkAchievements(runId) {
    const response = await fetch(`${API_URL}/achievements/check/${runId}`, {
      method: 'POST'
    });
    return response.json();
  },

  // ====== ЭКСПОРТ ======
  getExportUrl(runId, format) {
    return `${API_URL}/export/${format}/${runId}`;
  },

  downloadExport(runId, format) {
    window.open(this.getExportUrl(runId, format), '_blank');
  }
};
// ИСПРАВЛЕНО: Добавлен экспорт в глобальную область
window.api = api;