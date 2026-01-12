import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Routes
import translationRoutes from './routes/translation.js';
import analyticsRoutes from './routes/analytics.js';
import gamesRoutes from './routes/games.js';
import exportRoutes from './routes/export.js';
import achievementsRoutes from './routes/achievements.js';

// Database
import db from './database/db.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Статические файлы (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/translate', translationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/achievements', achievementsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    version: '1.0.0'
  });
});

// Serve frontend для всех остальных маршрутов
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  🌍 Translation Chaos Generator           ║
║  Server running on http://localhost:${PORT}  ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    db.close();
    process.exit(0);
  });
});

export default app;