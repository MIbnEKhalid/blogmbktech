import express from 'express';
import { sessPerm } from 'mbkauthe';
import { taxonomyController } from '../controllers/index.js';
import { Permissions } from '../permissions.js';

const router = express.Router();

/* ==========================================================================
   CATEGORIES — taxonomy management (feature: "categories")
   ========================================================================== */
router.get('/categories', sessPerm(Permissions.taxonomy.view), taxonomyController.getCategories);
router.post('/api/categories', sessPerm(Permissions.taxonomy.create), taxonomyController.createCategory);
router.put('/api/categories/:id', sessPerm(Permissions.taxonomy.edit), taxonomyController.updateCategory);
router.delete('/api/categories/:id', sessPerm(Permissions.taxonomy.delete), taxonomyController.deleteCategory);

export default router;
