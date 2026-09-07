import dotenv from 'dotenv';
dotenv.config();

import { PUBLIC_DIR } from '../config/constants.js';
import path from 'path';
import fs from 'fs';
import { postRepository, commentRepository } from '../repositories/index.js';
import { renderMarkdown, purify } from '../utils/markdown.js';

async function generatePosts() {
    console.log('Starting static blog post data generation...');
    const outputDir = path.join(PUBLIC_DIR, 'posts');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        const postsResult = await postRepository.getPublishedPostsForSitemap();
        console.log(`Found ${postsResult.rows.length} published posts.`);

        for (const simplePost of postsResult.rows) {
            const slug = simplePost.slug;
            console.log(`Generating cached data for: ${slug}`);

            const postQuery = await postRepository.findBySlug(slug);
            if (!postQuery.rows[0]) continue;
            const post = postQuery.rows[0];

            post.content_html = post.content_markdown
                ? renderMarkdown(post.content_markdown)
                : (post.content || '');

            const [tagsQuery, commentsQuery] = await Promise.all([
                postRepository.findPostTags(post.id),
                commentRepository.getPostComments('WHERE c.post_id = $1 AND c.is_approved = true', [post.id])
            ]);

            post.tags = tagsQuery.rows || [];
            const comments = commentsQuery.rows || [];

            comments.forEach(comment => {
                comment.replyCount = comments.filter(reply => reply.parent_id === comment.id).length;
                comment.content = purify.sanitize(comment.content);
                if (comment.parent_content) {
                    comment.parent_content = purify.sanitize(comment.parent_content);
                }
            });

            const postData = { post, comments };
            const filePath = path.join(outputDir, `${slug}.json`);
            fs.writeFileSync(filePath, JSON.stringify(postData, null, 2));
        }

        console.log('Successfully generated all blog post cache data.');
        process.exit(0);
    } catch (err) {
        console.error('Error generating posts:', err);
        process.exit(1);
    }
}

generatePosts();
