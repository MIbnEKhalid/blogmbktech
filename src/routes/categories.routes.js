import express from 'express';
import { taxonomyController } from '../controllers/index.js';

const router = express.Router();

/* ==========================================================================
   CATEGORIES — taxonomy management (feature: "categories")
   ========================================================================== */
router.get('/categories', taxonomyController.getCategories);
router.post('/api/categories', taxonomyController.createCategory);
router.put('/api/categories/:id', taxonomyController.updateCategory);
router.delete('/api/categories/:id', taxonomyController.deleteCategory);

export default router;
