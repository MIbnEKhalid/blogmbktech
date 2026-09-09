import express from 'express';
import { dashboardController } from '../controllers/index.js';

const router = express.Router();

/* ==========================================================================
   1. DASHBOARD OVERVIEW & ANALYTICS
   ========================================================================== */
router.get('/', dashboardController.getOverview);
router.get('/analytics', dashboardController.getAnalytics);

/* ==========================================================================
   2. SEO MANAGEMENT & AUDIT
   ========================================================================== */
router.get('/seo', dashboardController.getSeoOverview);
router.post('/api/seo/generate-sitemaps', dashboardController.generateSitemaps);

/* ==========================================================================
   3. ACTIVITY / AUDIT LOGS
   ========================================================================== */
router.get('/activity', dashboardController.getActivityLogs);

/* ==========================================================================
   4. SETTINGS & SYSTEM CONFIG
   ========================================================================== */
router.get('/settings', dashboardController.getSettings);
router.post('/api/settings', dashboardController.updateSettings);

/* ==========================================================================
   5. GLOBAL COMMAND PALETTE SEARCH
   ========================================================================== */
router.get('/api/global-search', dashboardController.globalSearch);

/* ==========================================================================
   6. BACKUP & DATA EXPORT
   ========================================================================== */
router.get('/api/download-all-data', dashboardController.downloadAllData);

export default router;
