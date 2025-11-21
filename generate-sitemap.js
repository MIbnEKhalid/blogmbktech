import { pool } from './routes/pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL - update this to your actual domain
const BASE_URL = process.env.BASE_URL || 'https://blog.mbktech.org';
const PUBLIC_DIR = path.join(__dirname, 'public');

async function generateSitemaps() {
    try {
        console.log('🔄 Starting sitemap generation...');

        // Fetch all published posts
        const postsResult = await pool.query(
            `SELECT p.slug, p.created_at, p.updated_at
            FROM Posts p
            WHERE p.status = 'published'
            ORDER BY p.updated_at DESC`
        );

        // Fetch all categories
        const categoriesResult = await pool.query(
            `SELECT DISTINCT c.name, MAX(p.updated_at) as last_updated
            FROM Categories c
            LEFT JOIN Post_Categories pc ON c.id = pc.category_id
            LEFT JOIN Posts p ON pc.post_id = p.id AND p.status = 'published'
            GROUP BY c.name
            ORDER BY last_updated DESC`
        );

        // Fetch all tags
        const tagsResult = await pool.query(
            `SELECT DISTINCT t.name, MAX(p.updated_at) as last_updated
            FROM Tags t
            LEFT JOIN Post_Tags pt ON t.id = pt.tag_id
            LEFT JOIN Posts p ON pt.post_id = p.id AND p.status = 'published'
            GROUP BY t.name
            ORDER BY last_updated DESC`
        );

        const posts = postsResult.rows;
        const categories = categoriesResult.rows;
        const tags = tagsResult.rows;

        // Generate posts sitemap
        const postsSitemap = generatePostsSitemap(posts);
        fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-posts.xml'), postsSitemap);
        console.log(`✅ Generated sitemap-posts.xml (${posts.length} posts)`);

        // Generate categories sitemap
        const categoriesSitemap = generateCategoriesSitemap(categories);
        fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-categories.xml'), categoriesSitemap);
        console.log(`✅ Generated sitemap-categories.xml (${categories.length} categories)`);

        // Generate tags sitemap
        const tagsSitemap = generateTagsSitemap(tags);
        fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-tags.xml'), tagsSitemap);
        console.log(`✅ Generated sitemap-tags.xml (${tags.length} tags)`);

        // Generate sitemap index
        const sitemapIndex = generateSitemapIndex();
        fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapIndex);
        console.log('✅ Generated sitemap.xml (index)');

        console.log('🎉 All sitemaps generated successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error generating sitemaps:', err);
        process.exit(1);
    }
}

function generatePostsSitemap(posts) {
    const urls = posts.map(post => {
        const lastmod = post.updated_at
            ? new Date(post.updated_at).toISOString().split('T')[0]
            : new Date(post.created_at).toISOString().split('T')[0];

        return `    <url>
        <loc>${BASE_URL}/post/${post.slug}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;
}

function generateCategoriesSitemap(categories) {
    const categoryUrls = categories.map(cat => {
        const lastmod = cat.last_updated
            ? new Date(cat.last_updated).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

        return `    <url>
        <loc>${BASE_URL}/category/${encodeURIComponent(cat.name)}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${categoryUrls}
    <url>
        <loc>${BASE_URL}/categories</loc>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
    </url>
</urlset>`;
}

function generateTagsSitemap(tags) {
    const tagUrls = tags.map(tag => {
        const lastmod = tag.last_updated
            ? new Date(tag.last_updated).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

        return `    <url>
        <loc>${BASE_URL}/tag/${encodeURIComponent(tag.name)}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${tagUrls}
    <url>
        <loc>${BASE_URL}/tags</loc>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
    </url>
</urlset>`;
}

function generateSitemapIndex() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>${BASE_URL}/sitemap-posts.xml</loc>
    </sitemap>
    <sitemap>
        <loc>${BASE_URL}/sitemap-categories.xml</loc>
    </sitemap>
    <sitemap>
        <loc>${BASE_URL}/sitemap-tags.xml</loc>
    </sitemap>
</sitemapindex>`;
}

// Run the generation
generateSitemaps();
