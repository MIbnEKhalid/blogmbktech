import { downloadFile } from 'mbkbucket';
import fs from 'fs';
import path from 'path';
import { PUBLIC_DIR } from '../config/constants.js';
import { postRepository, taxonomyRepository, commentRepository } from '../repositories/index.js';
import { renderMarkdown, purify } from '../utils/markdown.js';
const PAGE_LIMIT = 10;
const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
const ALLOWED_REFERRERS = ['mbktech.org', 'localhost'];

// Single unified helpers for role and post visibility checks
const issuperadmin = (req) => Boolean(req?.session?.user?.role === 'superadmin');
const getStatusSql = (req) => issuperadmin(req) ? "IN ('published', 'private')" : "= 'published'";

// Helper to extract unique authors and categories in a single pass
function extractUniqueMeta(posts) {
    const authors = new Set();
    const categories = new Set();
    for (const post of posts) {
        const author = post.username;
        if (author) authors.add(author);
        if (post.categories) {
            for (const cat of post.categories.split(',')) {
                const trimmed = cat.trim();
                if (trimmed) categories.add(trimmed);
            }
        }
    }
    return {
        uniqueAuthors: Array.from(authors).sort(),
        uniqueCategories: Array.from(categories).sort()
    };
}

/**
 * 1. Home / All Posts
 */
export async function getHome(req, res) {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const offset = (page - 1) * PAGE_LIMIT;
        const whereClause = `WHERE p.status ${getStatusSql(req)}`;

        const { posts, totalPosts, totalPages } = await postRepository.fetchPostList({ whereClause, offset });
        const { uniqueAuthors, uniqueCategories } = extractUniqueMeta(posts);

        res.render('blog/index.handlebars', {
            posts,
            uniqueAuthors,
            uniqueCategories,
            canonicalUrl: `${req.protocol}://${req.get('host')}/`,
            pagination: { page, totalPages, totalPosts, hasNext: page < totalPages, hasPrev: page > 1 }
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error.handlebars', { message: 'Server error', code: 500 });
    }
}

/**
 * 2. Categories Archive
 */
export async function getCategoriesArchive(req, res) {
    try {
        const statusFilter = `AND p.status ${getStatusSql(req)}`;
        const result = await taxonomyRepository.getCategoriesArchive(statusFilter);

        res.render('blog/archive.handlebars', {
            categories: result.rows || [],
            canonicalUrl: `${req.protocol}://${req.get('host')}/categories`,
            pageType: 'categories'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error.handlebars', { message: 'Server error', code: 500 });
    }
}

/**
 * 3. Tags Archive
 */
export async function getTagsArchive(req, res) {
    try {
        const statusFilter = `AND p.status ${getStatusSql(req)}`;
        const result = await taxonomyRepository.getTagsArchive(statusFilter);

        res.render('blog/archive.handlebars', {
            tags: result.rows || [],
            canonicalUrl: `${req.protocol}://${req.get('host')}/tags`,
            pageType: 'tags'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error.handlebars', { message: 'Server error', code: 500 });
    }
}

/**
 * 4. Posts by Author
 */
export async function getPostsByAuthor(req, res) {
    try {
        const { username } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const offset = (page - 1) * PAGE_LIMIT;
        const whereClause = `WHERE p.status ${getStatusSql(req)} AND p.username = $1`;

        const { posts, totalPosts, totalPages } = await postRepository.fetchPostList({ whereClause, params: [username], offset });
        const { uniqueCategories } = extractUniqueMeta(posts);

        res.render('blog/archive.handlebars', {
            posts,
            username,
            uniqueCategories,
            canonicalUrl: `${req.protocol}://${req.get('host')}/author/${username}`,
            pageType: 'posts',
            pagination: { page, totalPages, totalPosts, hasNext: page < totalPages, hasPrev: page > 1, baseUrl: `/author/${username}` }
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error.handlebars', { message: 'Server error', code: 500 });
    }
}

/**
 * 5. Posts by Category
 */
export async function getPostsByCategory(req, res) {
    try {
        const { categoryName } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const offset = (page - 1) * PAGE_LIMIT;

        const category = await taxonomyRepository.getCategoryByName(categoryName);
        if (!category.rows[0]) {
            return res.status(404).render('error.handlebars', { message: 'Category not found', code: 404 });
        }

        const joinClause = 'INNER JOIN blog_post_categories filter_pc ON p.id = filter_pc.post_id AND filter_pc.category_id = $1';
        const whereClause = `WHERE p.status ${getStatusSql(req)}`;

        const { posts, totalPosts, totalPages } = await postRepository.fetchPostList({
            whereClause,
            joinClause,
            params: [category.rows[0].id],
            offset
        });
        const { uniqueAuthors } = extractUniqueMeta(posts);

        res.render('blog/archive.handlebars', {
            posts,
            category: category.rows[0],
            uniqueAuthors,
            canonicalUrl: `${req.protocol}://${req.get('host')}/category/${encodeURIComponent(category.rows[0].name)}`,
            pageType: 'posts',
            pagination: { page, totalPages, totalPosts, hasNext: page < totalPages, hasPrev: page > 1, baseUrl: `/category/${encodeURIComponent(categoryName)}` }
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error.handlebars', { message: 'Server error', code: 500 });
    }
}

/**
 * 6. Posts by Tag
 */
export async function getPostsByTag(req, res) {
    try {
        const { tagName } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const offset = (page - 1) * PAGE_LIMIT;

        const tag = await taxonomyRepository.getTagByName(tagName);
        if (!tag.rows[0]) {
            return res.status(404).render('error.handlebars', { message: 'Tag not found', code: 404 });
        }

        const joinClause = 'INNER JOIN blog_post_tags filter_pt ON p.id = filter_pt.post_id AND filter_pt.tag_id = $1';
        const whereClause = `WHERE p.status ${getStatusSql(req)}`;

        const { posts, totalPosts, totalPages } = await postRepository.fetchPostList({
            whereClause,
            joinClause,
            params: [tag.rows[0].id],
            offset
        });
        const { uniqueAuthors, uniqueCategories } = extractUniqueMeta(posts);

        res.render('blog/archive.handlebars', {
            posts,
            tag: tag.rows[0],
            uniqueAuthors,
            uniqueCategories,
            canonicalUrl: `${req.protocol}://${req.get('host')}/tag/${encodeURIComponent(tag.rows[0].name)}`,
            pageType: 'posts',
            pagination: { page, totalPages, totalPosts, hasNext: page < totalPages, hasPrev: page > 1, baseUrl: `/tag/${encodeURIComponent(tagName)}` }
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error.handlebars', { message: 'Server error', code: 500 });
    }
}

/**
 * 7. Single Post by Slug
 */
export async function getPostBySlug(req, res) {
    try {
        const { slug } = req.params;
        const cachedDataPath = path.join(PUBLIC_DIR, 'posts', `${slug}.json`);

        if (fs.existsSync(cachedDataPath)) {
            try {
                const cachedData = JSON.parse(fs.readFileSync(cachedDataPath, 'utf-8'));
                return res.render('blog/post.handlebars', {
                    post: cachedData.post,
                    comments: cachedData.comments,
                    canonicalUrl: `${req.protocol}://${req.get('host')}/post/${slug}`,
                    helpers: { getReplies: (comments, parentId) => comments.filter(c => c.parent_id === parentId) }
                });
            } catch (cacheErr) {
                console.error('Error reading cached post data:', cacheErr);
            }
        }

        const postResult = await postRepository.findBySlug(slug);
        const post = postResult.rows[0];
        if (!post) {
            return res.status(404).render('error.handlebars', { message: 'Post not found', code: 404 });
        }

        const user = req.session?.user;
        const isAdmin = issuperadmin(req);
        const currentUsername = user?.username;
        const isOwner = currentUsername && currentUsername === (post.author_name || post.username);

        if (post.status === 'private' && !isOwner && !isAdmin) {
            return res.status(403).render('error.handlebars', { message: 'This post is private. Only the owner can see it.', code: 403 });
        }

        // View count debounce via cookie
        const postId = String(post.id);
        let viewedPosts = [];
        try {
            if (req.cookies.viewed_posts) viewedPosts = JSON.parse(req.cookies.viewed_posts);
            if (!Array.isArray(viewedPosts)) viewedPosts = [];
        } catch {}

        if (!viewedPosts.includes(postId)) {
            viewedPosts.push(postId);
            if (viewedPosts.length > 200) viewedPosts.shift();

            res.cookie('viewed_posts', JSON.stringify(viewedPosts), {
                maxAge: 365 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production'
            });

            res.on('finish', () => {
                postRepository.incrementViews(postId).catch(console.error);
            });
        }

        // Markdown rendering
        post.content_html = post.content_markdown
            ? renderMarkdown(post.content_markdown)
            : (post.content || '');

        // Fetch tags, comments, and related posts in parallel
        const commentsWhere = isAdmin
            ? 'WHERE c.post_id = $1'
            : (currentUsername ? 'WHERE c.post_id = $1 AND (c.is_approved = true OR c.username = $2)' : 'WHERE c.post_id = $1 AND c.is_approved = true');
        const commentsParams = (currentUsername && !isAdmin) ? [post.id, currentUsername] : [post.id];

        const categoryIds = (post.category_ids || []).filter(Boolean);

        const [tagsResult, commentsResult, relatedResult] = await Promise.all([
            postRepository.findPostTags(post.id),
            commentRepository.getPostComments(commentsWhere, commentsParams),
            postRepository.getRelatedPosts(post.id, categoryIds).catch(err => {
                console.error('Error querying related posts:', err);
                return { rows: [] };
            })
        ]);

        post.tags = tagsResult.rows || [];
        const comments = commentsResult.rows || [];

        for (const comment of comments) {
            comment.replyCount = comments.filter(r => r.parent_id === comment.id).length;
            comment.content = purify.sanitize(comment.content);
            if (comment.parent_content) comment.parent_content = purify.sanitize(comment.parent_content);
        }

        res.render('blog/post.handlebars', {
            post,
            comments,
            relatedPosts: relatedResult.rows || [],
            canonicalUrl: `${req.protocol}://${req.get('host')}/post/${slug}`,
            helpers: { getReplies: (cmts, pId) => cmts.filter(c => c.parent_id === pId) }
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error.handlebars', { message: 'Server error', code: 500 });
    }
}

/**
 * 8. Add Comment
 */
export async function createComment(req, res) {
    const { content, parent_id } = req.body;
    const { slug } = req.params;

    if (!content || !content.trim()) {
        return res.status(400).render('error.handlebars', { message: 'Comment content is required', code: 400 });
    }

    try {
        const post = await postRepository.getPublishedPostBySlug(slug);
        if (!post.rows[0]) {
            return res.status(404).render('error.handlebars', { message: 'Post not found or not published', code: 404 });
        }

        const postId = post.rows[0].id;
        if (parent_id) {
            const parent = await commentRepository.findPostParentComment(parent_id, postId);
            if (!parent.rows[0]) {
                return res.status(400).render('error.handlebars', { message: 'Invalid parent comment', code: 400 });
            }
        }

        const username = req.session?.user?.username || 'anonymous';
        await commentRepository.createComment(purify.sanitize(content.trim()), username, postId, parent_id || null);

        res.redirect(`/post/${slug}`);
    } catch (err) {
        console.error(err);
        res.status(500).render('error.handlebars', { message: 'Error adding comment', code: 500 });
    }
}

/**
 * 9. Bookmarks
 */
export async function getBookmarks(req, res) {
    try {
        let bookmarkIds = [];
        if (req.query.ids) {
            try {
                const parsed = JSON.parse(req.query.ids);
                if (Array.isArray(parsed)) {
                    bookmarkIds = parsed.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
                }
            } catch {}
        }

        if (bookmarkIds.length === 0) {
            return res.render('blog/bookmarks.handlebars', {
                posts: [],
                canonicalUrl: `${req.protocol}://${req.get('host')}/bookmarks`
            });
        }

        const statusFilter = getStatusSql(req);
        const result = await postRepository.getBookmarkedPosts(bookmarkIds, statusFilter);

        res.render('blog/bookmarks.handlebars', {
            posts: result.rows || [],
            canonicalUrl: `${req.protocol}://${req.get('host')}/bookmarks`
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error.handlebars', { message: 'Server error', code: 500 });
    }
}

/**
 * 10. Public High-Performance Image Streaming
 */
export async function streamImage(req, res) {
    const referer = req.get('Referer');
    if (referer && !ALLOWED_REFERRERS.some(domain => referer.includes(domain))) {
        return res.status(403).send('Hotlinking not allowed');
    }

    try {
        const { key } = req.params;
        if (!key) return res.status(400).send('Image key is required');

        const ext = path.extname(key).toLowerCase();
        if (!ALLOWED_IMAGE_EXTS.has(ext)) {
            return res.status(400).send('Only image files are allowed');
        }

        const result = await downloadFile(key);

        res.set({
            'Content-Type': result.ContentType || 'image/jpeg',
            'Content-Length': result.ContentLength,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Last-Modified': result.LastModified,
            'ETag': result.ETag,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET'
        });

        // Fast conditional 304 response
        if (req.headers['if-none-match'] && req.headers['if-none-match'] === result.ETag) {
            return res.status(304).end();
        }
        if (req.headers['if-modified-since'] && result.LastModified) {
            if (new Date(result.LastModified) <= new Date(req.headers['if-modified-since'])) {
                return res.status(304).end();
            }
        }

        // Direct stream piping - avoids large RAM allocations
        if (typeof result.Body?.pipe === 'function') {
            result.Body.pipe(res);
        } else if (result.Body?.[Symbol.asyncIterator]) {
            for await (const chunk of result.Body) {
                res.write(chunk);
            }
            res.end();
        } else {
            res.send(result.Body);
        }
    } catch (err) {
        if (err.message?.includes('File not found')) {
            res.status(404).send('Image not found');
        } else if (err.message?.includes('Access denied')) {
            res.status(403).send('Access denied');
        } else {
            res.status(500).send('Failed to load image');
        }
    }
}
