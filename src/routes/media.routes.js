import express from 'express';
import { uploadRateLimiter } from '../middleware/rate-limiter.js';
import { mediaController } from '../controllers/index.js';

const router = express.Router();

/* ==========================================================================
   MEDIA — markdown preview, image uploads & R2 gallery (feature: "media")
   ========================================================================== */
router.post('/api/markdown-preview', mediaController.renderMarkdownPreview);
router.post('/api/upload-image', uploadRateLimiter, mediaController.uploadImage);
router.post('/api/r2/list-images', uploadRateLimiter, mediaController.listR2Images);

export default router;
