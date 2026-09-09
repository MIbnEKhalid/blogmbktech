import express from 'express';
import { commentsController } from '../controllers/index.js';

const router = express.Router();

/* ==========================================================================
   COMMENTS — moderation pages + APIs (feature: "comments")
   ========================================================================== */
router.get('/comments', commentsController.getCommentsList);
router.put('/api/comments/:id/:action', commentsController.moderateComment);
router.post('/api/comments/:id/reply', commentsController.replyComment);
router.post('/api/comments/bulk', commentsController.bulkCommentsAction);
router.delete('/api/comments/:id', commentsController.deleteComment);

export default router;
