import { taxonomyRepository } from '../repositories/index.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * API: Gemini AI Assist (/dashboard/api/ai-assist)
 */
export async function aiAssist(req, res) {
    const { action, prompt, context = {} } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        let systemInstruction = '';
        let userPrompt = '';
        let isJsonMode = false;

        if (action === 'tags') {
            systemInstruction = 'You are an SEO specialist. Return EXACTLY 5–8 comma-separated tags. Lowercase only. No hashtags. No explanations.';
            userPrompt = `Content:\n${context.content?.substring(0, 3000) || ''}`;
        } else if (action === 'categories') {
            const cats = await taxonomyRepository.getAllCategories();
            isJsonMode = true;
            systemInstruction = 'You are a content classifier. Return JSON ONLY in this format: { "categoryIds": [number] }. Do not include explanations.';
            userPrompt = `Categories: ${JSON.stringify(cats.rows || [])}\nContent: ${context.content?.substring(0, 1500) || ''}`;
        } else if (action === 'title') {
            systemInstruction = 'You are a Blog Title Expert. Write ONE catchy, SEO-friendly blog title. Max 60 characters. No quotes. No explanations. Return ONLY the title text.';
            userPrompt = `User instruction: ${prompt || 'Generate a blog title'}\nCurrent title: ${context.currentTitle || 'None'}\nContent: ${context.content?.substring(0, 1000) || ''}`;
        } else if (action === 'excerpt') {
            systemInstruction = 'You are a professional editor. Write a 2-sentence SEO-friendly excerpt summarizing the post. Max 160 characters. No quotes. No explanations.';
            userPrompt = `Title: ${context.title || 'None'}\nContent:\n${context.content?.substring(0, 2000) || ''}`;
        } else if (action === 'content') {
            systemInstruction = 'You are a technical blog writer. Write in clean Markdown format with proper headings, code blocks and bullet points. Tone is engaging, crisp, and professional.';
            userPrompt = context.content ? `Improve and refine the following draft in markdown:\n${context.content}` : `Write a compelling blog post body for this topic: "${context.title || prompt || ''}"\nExcerpt: ${context.excerpt || ''}`;
        } else {
            systemInstruction = 'You are a helpful AI blog editor and writing assistant. Be concise and direct.';
            userPrompt = `Title: ${context.title || 'N/A'}\nRequest: ${prompt || ''}`;
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.7, responseMimeType: isJsonMode ? 'application/json' : 'text/plain' }
        });

        let reply = (await result.response).text();
        if (isJsonMode) {
            reply = reply.replace(/```json|```/g, '').trim();
            try { reply = JSON.parse(reply); } catch { reply = { categoryIds: [] }; }
        } else if (action === 'title' || action === 'excerpt' || action === 'tags') {
            reply = reply.replace(/^\"|\"$/g, '').split('\n')[0].trim();
        }

        res.json({ success: true, data: reply });
    } catch (err) {
        console.error('[AI-Assist] Error:', err);
        const status = (err.status === 429 || err.message?.includes('429')) ? 429 : 500;
        res.status(status).json({ success: false, error: status === 429 ? 'AI usage limit reached. Please try again shortly.' : 'AI service error: ' + err.message });
    }
}
