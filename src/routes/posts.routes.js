import express from 'express';
import { postsController } from '../controllers/index.js';

const router = express.Router();

/* ==========================================================================
   POSTS — dashboard pages + CRUD APIs (feature: "posts")
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

export default router;
