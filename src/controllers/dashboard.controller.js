import path from 'path';
import fs from 'fs';
import { PUBLIC_DIR } from '../config/constants.js';
import { postRepository, commentRepository, taxonomyRepository, activityLogRepository } from '../repositories/index.js';
import { generateAllSitemaps } from '../utils/sitemap.js';

/**
 * 1. Dashboard Overview (/dashboard)
 */
export async function getOverview(req, res) {
    try {
        const [postStats, commentStats, recentPosts, recentComments] = await Promise.all([
            postRepository.getOverviewPostStats(),
            commentRepository.getCommentStats(),
            postRepository.getRecentPosts(5),
            commentRepository.getRecentComments(5)
        ]);

        const postStatsRow = postStats.rows[0] || {};
        const commentStatsRow = commentStats.rows[0] || {};

        res.render('dashboard/index.handlebars', {
            layout: 'dashboard',
            active: 'dashboard',
            user: req.session?.user,
            stats: {
                totalPosts: postStatsRow.total_posts || 0,
                publishedPosts: postStatsRow.published_posts || 0,
                draftPosts: postStatsRow.draft_posts || 0,
                privatePosts: postStatsRow.private_posts || 0,
                totalComments: commentStatsRow.total_comments || 0,
                approvedComments: commentStatsRow.approved_comments || 0,
                pendingComments: commentStatsRow.pending_comments || 0
            },
            recentPosts: recentPosts.rows || [],
            recentComments: recentComments.rows || []
        });
    } catch (err) {
        console.error('Error loading dashboard overview:', err);
        res.status(500).render('error.handlebars', { message: 'Error loading dashboard', code: 500 });
    }
}

/**
 * 2. Analytics Page (/dashboard/analytics)
 */
export async function getAnalytics(req, res) {
    try {
        const [overviewStats, topPosts, categoryDistribution, statusDistribution] = await Promise.all([
            postRepository.getAnalyticsOverview(),
            postRepository.getTopPosts(10),
            postRepository.getCategoryDistribution(6),
            postRepository.getStatusDistribution()
        ]);

        const topPostViews = topPosts.rows[0]?.views || 1;
        const postsWithShare = (topPosts.rows || []).map(p => ({
            ...p,
            percentage: Math.round(((p.views || 0) / (topPostViews || 1)) * 100)
        }));

        res.render('dashboard/analytics.handlebars', {
            layout: 'dashboard',
            active: 'analytics',
            user: req.session?.user,
            overview: overviewStats.rows[0] || {},
            topPosts: postsWithShare,
            categoryDistribution: categoryDistribution.rows || [],
            statusDistribution: statusDistribution.rows || []
        });
    } catch (err) {
        console.error('Error loading analytics:', err);
        res.status(500).render('error.handlebars', { message: 'Error loading analytics', code: 500 });
    }
}

/**
 * 3. SEO Management & Audit (/dashboard/seo)
 */
export async function getSeoOverview(req, res) {
    try {
        const posts = await postRepository.getPostsForSeo();

        let missingExcerpt = 0, missingPreviewImage = 0, shortTitles = 0, longTitles = 0, shortContent = 0;
        const postsWithIssues = [];

        (posts.rows || []).forEach(p => {
            const issues = [];
            if (!p.excerpt || p.excerpt.length < 30) { missingExcerpt++; issues.push('Missing or very short excerpt'); }
            if (!p.preview_image) { missingPreviewImage++; issues.push('Missing social preview image'); }
            if (p.title.length < 20) { shortTitles++; issues.push('Title is too short (< 20 chars)'); }
            if (p.title.length > 70) { longTitles++; issues.push('Title may be truncated in SERP (> 70 chars)'); }
            if (p.content_markdown && p.content_markdown.length < 300) { shortContent++; issues.push('Content is under 300 characters'); }

            if (issues.length > 0) postsWithIssues.push({ ...p, issues });
        });

        const totalPosts = posts.rows.length || 1;
        const healthyPostsCount = totalPosts - postsWithIssues.length;
        const seoHealthScore = Math.max(10, Math.round((healthyPostsCount / totalPosts) * 100));

        const sitemaps = ['sitemap.xml', 'sitemap-posts.xml', 'sitemap-categories.xml', 'sitemap-tags.xml'].map(name => ({
            name,
            path: path.join(PUBLIC_DIR, name),
            exists: fs.existsSync(path.join(PUBLIC_DIR, name))
        }));

        res.render('dashboard/seo.handlebars', {
            layout: 'dashboard',
            active: 'seo',
            user: req.session?.user,
            seoHealthScore,
            totalPosts: posts.rows.length,
            postsNeedingAttention: postsWithIssues.slice(0, 10),
            stats: { missingExcerpt, missingPreviewImage, shortTitles, longTitles, shortContent },
            sitemaps
        });
    } catch (err) {
        console.error('Error loading SEO page:', err);
        res.status(500).render('error.handlebars', { message: 'Error loading SEO audit', code: 500 });
    }
}

/**
 * 4. API: Generate Sitemaps
 */
export async function generateSitemaps(req, res) {
    try {
        const { postCount } = await generateAllSitemaps();
        res.json({ success: true, message: `Successfully regenerated sitemaps (${postCount} posts indexed)` });
    } catch (err) {
        console.error('Error generating sitemaps:', err);
        res.status(500).json({ success: false, message: 'Failed to generate sitemaps: ' + err.message });
    }
}

/**
 * 5. Activity Logs (/dashboard/activity)
 */
export async function getActivityLogs(req, res) {
    try {
        const { entity, search, page = 1 } = req.query;
        const limit = 30;
        const pageNum = parseInt(page, 10) || 1;
        const offset = (pageNum - 1) * limit;

        const params = [];
        const whereClauses = [];

        if (entity && entity !== 'all') {
            params.push(entity);
            whereClauses.push(`entity_type = $${params.length}`);
        }
        if (search && search.trim()) {
            params.push(`%${search.trim()}%`);
            whereClauses.push(`(action ILIKE $${params.length} OR entity_title ILIKE $${params.length} OR details ILIKE $${params.length})`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const [activityRes, countRes] = await Promise.all([
            activityLogRepository.getActivityLogs({ whereSql, limit, offset }),
            activityLogRepository.getActivityLogsCount({ whereSql })
        ]);

        const total = parseInt(countRes.rows[0]?.total || 0, 10);
        const totalPages = Math.ceil(total / limit) || 1;

        res.render('dashboard/activity.handlebars', {
            layout: 'dashboard',
            active: 'activity',
            user: req.session?.user,
            activities: activityRes.rows || [],
            filters: { entity: entity || 'all', search: search || '' },
            pagination: {
                page: pageNum,
                totalPages,
                total,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1,
                nextPage: pageNum + 1,
                prevPage: pageNum - 1
            }
        });
    } catch (err) {
        console.error('Error loading activity logs:', err);
        res.status(500).render('error.handlebars', { message: 'Error loading activity log', code: 500 });
    }
}

/**
 * 6. Settings Page (/dashboard/settings)
 */
export async function getSettings(req, res) {
    try {
        const [settingsRes, counts] = await Promise.all([
            activityLogRepository.getSettings(),
            activityLogRepository.getEntityCounts()
        ]);

        const settingsMap = {};
        (settingsRes.rows || []).forEach(row => { settingsMap[row.key] = row.value; });

        res.render('dashboard/settings.handlebars', {
            layout: 'dashboard',
            active: 'settings',
            user: req.session?.user,
            settings: settingsMap,
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                uptimeSeconds: Math.floor(process.uptime()),
                memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
                dbConnected: true,
                storageType: 'Cloudflare R2 (mbkbucket)',
                counts
            }
        });
    } catch (err) {
        console.error('Error loading settings:', err);
        res.status(500).render('error.handlebars', { message: 'Error loading settings', code: 500 });
    }
}

/**
 * 7. API: Save Settings
 */
export async function updateSettings(req, res) {
    try {
        await activityLogRepository.saveSettings(req.body);
        res.json({ success: true, message: 'Settings saved successfully' });
    } catch (err) {
        console.error('Error saving settings:', err);
        res.status(500).json({ success: false, message: 'Failed to save settings' });
    }
}

/**
 * 8. API: Global Command Palette Search (/dashboard/api/global-search)
 */
export async function globalSearch(req, res) {
    try {
        const query = req.query.q?.trim() || '';
        if (query.length < 2) return res.json({ posts: [], categories: [], tags: [], comments: [] });

        const search = `%${query}%`;
        const [posts, categories, tags, comments] = await Promise.all([
            postRepository.globalSearchPosts(search, 5),
            taxonomyRepository.globalSearchCategories(search, 4),
            taxonomyRepository.globalSearchTags(search, 4),
            commentRepository.globalSearchComments(search, 4)
        ]);

        res.json({
            posts: posts.rows || [],
            categories: categories.rows || [],
            tags: tags.rows || [],
            comments: comments.rows || []
        });
    } catch (err) {
        console.error('Global search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
}

/**
 * 9. API: Backup & Data Export (/dashboard/api/download-all-data)
 */
export async function downloadAllData(req, res) {
    try {
        const [posts, categories, tags, comments, postCategories, postTags] = await Promise.all([
            postRepository.downloadAllPosts(),
            taxonomyRepository.getAllCategories(),
            taxonomyRepository.getAllTags(),
            commentRepository.downloadAllComments(),
            postRepository.downloadAllPostCategories(),
            postRepository.downloadAllPostTags()
        ]);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="blog_data.json"');
        res.send(JSON.stringify({
            posts: posts.rows,
            categories: categories.rows,
            tags: tags.rows,
            comments: comments.rows,
            postCategories: postCategories.rows,
            postTags: postTags.rows
        }, null, 2));
    } catch (err) {
        console.error('Error downloading data:', err);
        res.status(500).json({ success: false, error: 'Failed to download blog data' });
    }
}
