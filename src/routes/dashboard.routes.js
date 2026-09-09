import express from 'express';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';
import { dashboardController, postsController, commentsController, taxonomyController, mediaController, aiController } from '../controllers/index.js';

const router = express.Router();

/* ==========================================================================
   1. DASHBOARD OVERVIEW & ANALYTICS
   ========================================================================== */
router.get('/', dashboardController.getOverview);
router.get('/analytics', dashboardController.getAnalytics);

/* ==========================================================================
   2. POSTS MANAGEMENT
   ========================================================================== */
router.get('/posts', postsController.getPostsList);
router.get('/posts/create', postsController.getCreatePost);
router.get('/posts/edit/:id', postsController.getEditPost);

router.post('/api/posts', postsController.createPost);
router.put('/api/posts/:id', postsController.updatePost);
router.put('/api/posts/:id/quick', postsController.quickUpdatePost);
router.post('/api/posts/:id/duplicate', postsController.duplicatePost);
router.post('/api/posts/bulk', postsController.bulkPostsAction);
router.delete('/api/posts/:id', postsController.deletePost);

/* ==========================================================================
   3. COMMENTS MODERATION
   ========================================================================== */
router.get('/comments', commentsController.getCommentsList);
router.put('/api/comments/:id/:action', commentsController.moderateComment);
router.post('/api/comments/:id/reply', commentsController.replyComment);
router.post('/api/comments/bulk', commentsController.bulkCommentsAction);
router.delete('/api/comments/:id', commentsController.deleteComment);

/* ==========================================================================
   4. CATEGORIES MANAGEMENT
   ========================================================================== */
router.get('/categories', taxonomyController.getCategories);
router.post('/api/categories', taxonomyController.createCategory);
router.put('/api/categories/:id', taxonomyController.updateCategory);
router.delete('/api/categories/:id', taxonomyController.deleteCategory);

/* ==========================================================================
   5. TAGS MANAGEMENT
   ========================================================================== */
router.get('/tags', taxonomyController.getTags);
router.post('/api/tags', taxonomyController.createTag);
router.put('/api/tags/:id', taxonomyController.updateTag);
router.delete('/api/tags/:id', taxonomyController.deleteTag);

/* ==========================================================================
   6. SEO MANAGEMENT & AUDIT
   ========================================================================== */
router.get('/seo', dashboardController.getSeoOverview);
router.post('/api/seo/generate-sitemaps', dashboardController.generateSitemaps);

/* ==========================================================================
   7. ACTIVITY / AUDIT LOGS
   ========================================================================== */
router.get('/activity', dashboardController.getActivityLogs);

/* ==========================================================================
   8. SETTINGS & SYSTEM CONFIG
   ========================================================================== */
router.get('/settings', dashboardController.getSettings);
router.post('/api/settings', dashboardController.updateSettings);

/* ==========================================================================
   9. GLOBAL COMMAND PALETTE SEARCH
   ========================================================================== */
router.get('/api/global-search', dashboardController.globalSearch);

/* ==========================================================================
   10. MARKDOWN PREVIEW, IMAGE UPLOADS & R2 GALLERY
   ========================================================================== */
router.post('/api/markdown-preview', mediaController.renderMarkdownPreview);
router.post('/api/upload-image', uploadRateLimiter, mediaController.uploadImage);
router.post('/api/r2/list-images', uploadRateLimiter, express.json(), mediaController.listR2Images);

/* ==========================================================================
   11. GEMINI AI ASSIST
   ========================================================================== */
router.post('/api/ai-assist', aiController.aiAssist);

/* ==========================================================================
   12. BACKUP & DATA EXPORT
   ========================================================================== */
router.get('/api/download-all-data', dashboardController.downloadAllData);

export default router;
