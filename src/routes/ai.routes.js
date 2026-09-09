import express from 'express';
import { aiController } from '../controllers/index.js';

const router = express.Router();

/* ==========================================================================
   AI ASSIST — Gemini content assist (feature: "ai")
   ========================================================================== */
router.post('/api/ai-assist', aiController.aiAssist);

export default router;
