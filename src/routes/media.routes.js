import express from 'express';
import { sessPerm } from 'mbkauthe';
import { uploadRateLimiter } from '../middleware/rate-limiter.js';
import { mediaController } from '../controllers/index.js';
import { Permissions } from '../permissions.js';

const router = express.Router();

/* ==========================================================================
   MEDIA — markdown preview, image uploads & R2 gallery (feature: "media")
   ========================================================================== */
router.post('/api/markdown-preview', sessPerm(Permissions.media.preview), mediaController.renderMarkdownPreview);
router.post('/api/upload-image', uploadRateLimiter, sessPerm(Permissions.media.upload), mediaController.uploadImage);
router.post('/api/r2/list-images', uploadRateLimiter, sessPerm(Permissions.media.list), mediaController.listR2Images);

export default router;
