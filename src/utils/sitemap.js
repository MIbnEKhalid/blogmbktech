import fs from 'fs';
import path from 'path';
import { PUBLIC_DIR } from '../config/constants.js';
import { postRepository, taxonomyRepository } from '../repositories/index.js';

export function formatXmlUrl(loc, date, freq, prio) {
    const formattedDate = (date ? new Date(date) : new Date()).toISOString().split('T')[0];
    return `    <url>\n        <loc>${loc}</loc>\n        <lastmod>${formattedDate}</lastmod>\n        <changefreq>${freq}</changefreq>\n        <priority>${prio}</priority>\n    </url>`;
}

export async function generateAllSitemaps(baseUrl = process.env.BASE_URL || 'https://blog.mbktech.org') {
    const [postsRes, catsRes, tagsRes] = await Promise.all([
        postRepository.getPublishedPostsForSitemap(),
        taxonomyRepository.getDistinctCategoriesWithLastUpdated(),
        taxonomyRepository.getDistinctTagsWithLastUpdated()
    ]);

    const postUrls = (postsRes.rows || [])
        .map(p => formatXmlUrl(`${baseUrl}/post/${p.slug}`, p.updated_at || p.created_at, 'weekly', '0.8'))
        .join('\n');
    fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-posts.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${postUrls}\n</urlset>`);

    const catUrls = (catsRes.rows || [])
        .map(c => formatXmlUrl(`${baseUrl}/category/${encodeURIComponent(c.name)}`, c.last_updated, 'weekly', '0.6'))
        .join('\n');
    fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-categories.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${catUrls}\n</urlset>`);

    const tagUrls = (tagsRes.rows || [])
        .map(t => formatXmlUrl(`${baseUrl}/tag/${encodeURIComponent(t.name)}`, t.last_updated, 'weekly', '0.6'))
        .join('\n');
    fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-tags.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${tagUrls}\n</urlset>`);

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n    <sitemap>\n        <loc>${baseUrl}/sitemap-posts.xml</loc>\n    </sitemap>\n    <sitemap>\n        <loc>${baseUrl}/sitemap-categories.xml</loc>\n    </sitemap>\n    <sitemap>\n        <loc>${baseUrl}/sitemap-tags.xml</loc>\n    </sitemap>\n</sitemapindex>`;
    fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapIndex);

    return { postCount: postsRes.rows.length, categoryCount: catsRes.rows.length, tagCount: tagsRes.rows.length };
}
