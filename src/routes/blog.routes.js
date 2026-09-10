import express from 'express';
import rateLimit from 'express-rate-limit';
import { sessVal } from 'mbkauthe';
import { blogController } from '../controllers/index.js';

const router = express.Router();

const imgLimiter = rateLimit({
    windowMs: 2 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).render('error.handlebars', { message: 'Too many requests. Try again later.', code: 429 })
});

// 1. Home / All Posts
router.get('/', blogController.getHome);

// 2. Categories Archive
router.get('/categories', blogController.getCategoriesArchive);

// 3. Tags Archive
router.get('/tags', blogController.getTagsArchive);

// 4. Posts by Author
router.get('/author/:username', blogController.getPostsByAuthor);

// 5. Posts by Category
router.get('/category/:categoryName', blogController.getPostsByCategory);

// 6. Posts by Tag
router.get('/tag/:tagName', blogController.getPostsByTag);

// 7. Single Post by Slug
router.get('/post/:slug', blogController.getPostBySlug);

// 8. Add Comment
router.post('/post/:slug/comment', sessVal, blogController.createComment);

// 9. Bookmarks
router.get('/bookmarks', blogController.getBookmarks);

// 10. High-Performance Image Streaming
router.get(/^\/images\/(?<key>.*)$/, imgLimiter, blogController.streamImage);

export default router;
