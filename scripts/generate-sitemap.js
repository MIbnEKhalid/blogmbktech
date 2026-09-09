import dotenv from 'dotenv';
dotenv.config();

import { generateAllSitemaps } from '../utils/sitemap.js';

async function run() {
    try {
        console.log('🔄 Starting sitemap generation...');
        const { postCount, categoryCount, tagCount } = await generateAllSitemaps();
        console.log(`✅ Generated sitemaps: ${postCount} posts, ${categoryCount} categories, ${tagCount} tags.`);
        console.log('🎉 All sitemaps generated successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error generating sitemaps:', err);
        process.exit(1);
    }
}

run();
