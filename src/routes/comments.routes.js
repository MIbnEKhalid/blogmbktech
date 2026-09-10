import express from 'express';
import { sessPerm } from 'mbkauthe';
import { commentsController } from '../controllers/index.js';
import { Permissions } from '../permissions.js';

const router = express.Router();

/* ==========================================================================
   COMMENTS — moderation pages + APIs (feature: "comments")
   ========================================================================== */
router.get('/comments', sessPerm(Permissions.comments.view), commentsController.getCommentsList);
router.put('/api/comments/:id/:action', sessPerm(Permissions.comments.moderate), commentsController.moderateComment);
router.post('/api/comments/:id/reply', sessPerm(Permissions.comments.moderate), commentsController.replyComment);
router.post('/api/comments/bulk', sessPerm(Permissions.comments.moderate), commentsController.bulkCommentsAction);
router.delete('/api/comments/:id', sessPerm(Permissions.comments.delete), commentsController.deleteComment);

export default router;
