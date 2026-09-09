import express from 'express';
import { taxonomyController } from '../controllers/index.js';

const router = express.Router();

/* ==========================================================================
   TAGS — taxonomy management (feature: "tags")
   ========================================================================== */
router.get('/tags', taxonomyController.getTags);
router.post('/api/tags', taxonomyController.createTag);
router.put('/api/tags/:id', taxonomyController.updateTag);
router.delete('/api/tags/:id', taxonomyController.deleteTag);

export default router;
