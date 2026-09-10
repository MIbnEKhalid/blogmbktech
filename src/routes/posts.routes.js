import express from 'express';
import { sessPerm } from 'mbkauthe';
import { postsController } from '../controllers/index.js';
import { Permissions } from '../permissions.js';

const router = express.Router();

/* ==========================================================================
   POSTS — dashboard pages + CRUD APIs (feature: "posts")
   ========================================================================== */
router.get('/posts', sessPerm(Permissions.posts.view), postsController.getPostsList);
router.get('/posts/create', sessPerm(Permissions.posts.create), postsController.getCreatePost);
router.get('/posts/edit/:id', sessPerm(Permissions.posts.edit), postsController.getEditPost);

router.post('/api/posts', sessPerm(Permissions.posts.create), postsController.createPost);
router.put('/api/posts/:id', sessPerm(Permissions.posts.edit), postsController.updatePost);
router.put('/api/posts/:id/quick', sessPerm(Permissions.posts.edit), postsController.quickUpdatePost);
router.post('/api/posts/:id/duplicate', sessPerm(Permissions.posts.create), postsController.duplicatePost);
router.post('/api/posts/bulk', sessPerm(Permissions.posts.edit), postsController.bulkPostsAction);
router.delete('/api/posts/:id', sessPerm(Permissions.posts.delete), postsController.deletePost);

export default router;
