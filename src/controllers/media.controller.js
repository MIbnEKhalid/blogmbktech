import { marked } from 'marked';
import Prism from 'prismjs';
import crypto from 'crypto';
import fs from 'fs';
import { uploadFile, listfiles } from 'mbkbucket';
import { validateFileSignature, generateSecureFilename } from '../utils/file-validation.js';

marked.setOptions({
    highlight: (code, lang) => Prism.languages[lang] ? Prism.highlight(code, Prism.languages[lang], lang) : code,
    breaks: true,
    gfm: true
});

/**
 * 1. API: Markdown Live Preview
 */
export function renderMarkdownPreview(req, res) {
    try {
        const { markdown } = req.body;
        if (!markdown) return res.status(400).json({ error: 'Markdown content is required' });
        res.json({ html: marked(markdown) });
    } catch (err) {
        console.error('Error converting markdown:', err);
        res.status(500).json({ error: 'Failed to convert markdown' });
    }
}

/**
 * 2. API: Image Upload to R2 Bucket
 */
export async function uploadImage(req, res) {
    let tempFilePath = null;
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file provided' });

        const file = req.file;
        tempFilePath = file.path;
        const fileBuffer = await fs.promises.readFile(tempFilePath);

        if (!validateFileSignature(fileBuffer, file.mimetype)) {
            await fs.promises.unlink(tempFilePath);
            return res.status(400).json({ error: 'File signature does not match declared type' });
        }

        const secureFileName = generateSecureFilename(file.originalname);
        await uploadFile(secureFileName, fileBuffer, file.mimetype, {
            metadata: {
                'original-name': file.originalname,
                'uploaded-by': req.session.user.username,
                'upload-type': 'blog-image',
                'file-hash': crypto.createHash('sha256').update(fileBuffer).digest('hex'),
                'upload-timestamp': new Date().toISOString()
            }
        });

        await fs.promises.unlink(tempFilePath);
        res.json({ success: true, url: `/images/${secureFileName}`, key: secureFileName, size: file.size, type: file.mimetype });
    } catch (err) {
        if (tempFilePath) {
            try { await fs.promises.unlink(tempFilePath); } catch {}
        }
        console.error('Image upload error:', err);
        res.status(500).json({ error: 'Failed to upload image' });
    }
}

/**
 * 3. API: List Images from R2 Bucket
 */
export async function listR2Images(req, res) {
    try {
        const { prefix = '', searchTerm = '', maxKeys = 30, continuationToken } = req.body ?? {};
        const filesResult = await listfiles(prefix, { maxKeys: parseInt(maxKeys), continuationToken: continuationToken || undefined });

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const images = (filesResult.Contents ?? [])
            .filter(f => f.Key && imageExtensions.some(ext => f.Key.toLowerCase().endsWith(ext)) && (!searchTerm || f.Key.toLowerCase().includes(searchTerm.toLowerCase())))
            .map(f => ({ key: f.Key, size: f.Size, lastModified: f.LastModified, url: `/images/${f.Key}` }));

        res.json({ success: true, images, hasMore: filesResult.hasMore ?? false, nextToken: filesResult.nextToken ?? null, total: images.length });
    } catch (err) {
        console.error('List images error:', err);
        res.status(500).json({ error: 'Failed to list images' });
    }
}
