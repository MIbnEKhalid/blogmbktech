import express from 'express';
import { sessPerm } from 'mbkauthe';
import { taxonomyController } from '../controllers/index.js';
import { Permissions } from '../permissions.js';

const router = express.Router();

/* ==========================================================================
   TAGS — taxonomy management (feature: "tags")
   ========================================================================== */
router.get('/tags', sessPerm(Permissions.taxonomy.view), taxonomyController.getTags);
router.post('/api/tags', sessPerm(Permissions.taxonomy.create), taxonomyController.createTag);
router.put('/api/tags/:id', sessPerm(Permissions.taxonomy.edit), taxonomyController.updateTag);
router.delete('/api/tags/:id', sessPerm(Permissions.taxonomy.delete), taxonomyController.deleteTag);

export default router;
