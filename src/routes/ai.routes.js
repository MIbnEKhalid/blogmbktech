import express from 'express';
import { sessPerm } from 'mbkauthe';
import { aiController } from '../controllers/index.js';
import { Permissions } from '../permissions.js';

const router = express.Router();

/* ==========================================================================
   AI ASSIST — Gemini content assist (feature: "ai")
   ========================================================================== */
router.post('/api/ai-assist', sessPerm(Permissions.ai.use), aiController.aiAssist);

export default router;
