import express from 'express';
import { sessPerm } from 'mbkauthe';
import { dashboardController } from '../controllers/index.js';
import { Permissions } from '../permissions.js';

const router = express.Router();

/* ==========================================================================
   1. DASHBOARD OVERVIEW & ANALYTICS
   ========================================================================== */
router.get('/', sessPerm(Permissions.dashboard.view), dashboardController.getOverview);
router.get('/analytics', sessPerm(Permissions.dashboard.view), dashboardController.getAnalytics);

/* ==========================================================================
   2. SEO MANAGEMENT & AUDIT
   ========================================================================== */
router.get('/seo', sessPerm(Permissions.dashboard.seo), dashboardController.getSeoOverview);
router.post('/api/seo/generate-sitemaps', sessPerm(Permissions.dashboard.seo), dashboardController.generateSitemaps);

/* ==========================================================================
   3. ACTIVITY / AUDIT LOGS
   ========================================================================== */
router.get('/activity', sessPerm(Permissions.dashboard.view), dashboardController.getActivityLogs);

/* ==========================================================================
   4. SETTINGS & SYSTEM CONFIG
   ========================================================================== */
router.get('/settings', sessPerm(Permissions.dashboard.settings), dashboardController.getSettings);
router.post('/api/settings', sessPerm(Permissions.dashboard.settings), dashboardController.updateSettings);

/* ==========================================================================
   5. GLOBAL COMMAND PALETTE SEARCH
   ========================================================================== */
router.get('/api/global-search', sessPerm(Permissions.dashboard.view), dashboardController.globalSearch);

/* ==========================================================================
   6. BACKUP & DATA EXPORT
   ========================================================================== */
router.get('/api/download-all-data', sessPerm(Permissions.dashboard.settings), dashboardController.downloadAllData);

export default router;
