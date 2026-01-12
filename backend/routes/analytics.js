import express from 'express';
import analyticsService from '../services/analytics.js';
import keywordService from '../services/keywords.js';
import db from '../database/db.js';

const router = express.Router();

// Получить детальный анализ всех шагов
router.get('/detailed/:runId', async (req, res) => {
  try {
    const run = db.getRun(req.params.runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const detailedAnalysis = [];

    for (let i = 1; i < run.results.length; i++) {
      const currentText = run.results[i].text;
      const previousText = run.results[i - 1].text;
      const fromLang = run.results[i].from;
      const toLang = run.results[i].language;
      const service = run.results[i].service;

      const stepAnalysis = await analyticsService.analyzeStep(
        currentText,
        previousText,
        fromLang,
        toLang,
        service
      );

      detailedAnalysis.push(stepAnalysis);
    }

    res.json(detailedAnalysis);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить трансформации ключевых слов
router.get('/keywords/:runId', async (req, res) => {
  try {
    const run = db.getRun(req.params.runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const transformations = keywordService.trackTransformations(run.results);
    const tree = keywordService.buildTransformationTree(transformations);

    res.json(transformations);
  } catch (error) {
    console.error('Keyword tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить интересные мутации
router.get('/mutations/:runId', async (req, res) => {
  try {
    const run = db.getRun(req.params.runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const mutations = analyticsService.findInterestingMutations(
      run.results,
      run.analysis
    );

    res.json(mutations);
  } catch (error) {
    console.error('Mutations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить семантические кластеры
router.get('/clusters/:runId', async (req, res) => {
  try {
    const run = db.getRun(req.params.runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const originalClusters = await analyticsService.extractSemanticClusters(
      run.results[0].text
    );
    
    const finalClusters = await analyticsService.extractSemanticClusters(
      run.results[run.results.length - 1].text
    );

    res.json({
      original: originalClusters,
      final: finalClusters,
      overlap: calculateOverlap(originalClusters, finalClusters)
    });
  } catch (error) {
    console.error('Clusters error:', error);
    res.status(500).json({ error: error.message });
  }
});

function calculateOverlap(clusters1, clusters2) {
  const keys1 = Object.keys(clusters1);
  const keys2 = Object.keys(clusters2);
  const common = keys1.filter(k => keys2.includes(k));
  
  return {
    commonCategories: common,
    overlapPercent: (common.length / Math.max(keys1.length, keys2.length)) * 100
  };
}

export default router;