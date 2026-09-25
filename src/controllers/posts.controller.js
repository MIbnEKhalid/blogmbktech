import { postRepository, taxonomyRepository } from '../repositories/index.js';
import { logActivity } from '../utils/activity-logger.js';
import { renderPage } from 'mbkauthe';

/**
 * 1. Posts List Page
 */
export async function getPostsList(req, res) {
    try {
        const { status, category, search, sort = 'newest', page = 1 } = req.query;
        const limit = 20;
        const pageNum = parseInt(page, 10) || 1;
        const offset = (pageNum - 1) * limit;

        const params = [];
        const whereClauses = [];

        if (status && status !== 'all') {
            params.push(status);
            whereClauses.push(`p.status = $${params.length}`);
        }

        if (category && category !== 'all') {
            params.push(category);
            whereClauses.push(`EXISTS (SELECT 1 FROM blog_post_categories bpc WHERE bpc.post_id = p.id AND bpc.category_id = $${params.length})`);
        }

        if (search && search.trim()) {
            params.push(`%${search.trim()}%`);
            whereClauses.push(`(p.title ILIKE $${params.length} OR p.content_markdown ILIKE $${params.length} OR p.slug ILIKE $${params.length})`);
        }

        let orderBy = 'p.created_at DESC';
        if (sort === 'oldest') orderBy = 'p.created_at ASC';
        else if (sort === 'views') orderBy = 'p.views DESC';
        else if (sort === 'title') orderBy = 'p.title ASC';

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const [postsResult, statsResult, categoriesResult] = await Promise.all([
            postRepository.findPostsAdmin({ whereClause, params, orderBy }),
            postRepository.getPostsDashboardStats(),
            taxonomyRepository.getAllCategories()
        ]);

        const allPosts = postsResult.rows || [];
        const totalFiltered = allPosts.length;
        const paginatedPosts = allPosts.slice(offset, offset + limit);
        const totalPages = Math.ceil(totalFiltered / limit) || 1;
        const stats = statsResult.rows[0] || {};

        return renderPage(req, res, 'dashboard/posts.hbs', 'dashboard', {
            active: 'posts',
            posts: paginatedPosts,
            categories: categoriesResult.rows || [],
            stats,
            totalPosts: stats.total_posts || 0,
            publishedPosts: stats.published_posts || 0,
            draftPosts: stats.draft_posts || 0,
            privatePosts: stats.private_posts || 0,
            totalCategories: stats.total_categories || 0,
            filters: { status: status || 'all', category: category || 'all', search: search || '', sort },
            pagination: {
                page: pageNum,
                totalPages,
                totalPosts: totalFiltered,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1,
                nextPage: pageNum + 1,
                prevPage: pageNum - 1
            }
        });
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500);
        return renderPage(req, res, 'error.hbs', false, { message: 'Error fetching posts', code: 500 });
    }
}

/**
 * 2. Create Post Form Page
 */
export async function getCreatePost(req, res) {
    try {
        const [categories, availableTags] = await Promise.all([
            taxonomyRepository.getAllCategories(),
            taxonomyRepository.getAllTags()
        ]);

        return renderPage(req, res, 'dashboard/edit-post.hbs', 'dashboard', {
            active: 'posts',
            isNew: true,
            categories: categories.rows || [],
            availableTags: availableTags.rows || [],
            post: { status: 'draft', categoryIds: [], tags: [] }
        });
    } catch (err) {
        console.error('Error loading create post form:', err);
        res.status(500);
        return renderPage(req, res, 'error.hbs', false, { message: 'Error loading create post form', code: 500 });
    }
}

/**
 * 3. Edit Post Form Page
 */
export async function getEditPost(req, res) {
    try {
        const { id } = req.params;
        const [post, categories, postCategories, postTags, availableTags] = await Promise.all([
            postRepository.findById(id),
            taxonomyRepository.getAllCategories(),
            postRepository.findPostCategories(id),
            postRepository.findPostTags(id),
            taxonomyRepository.getAllTags()
        ]);

        if (!post.rows?.[0]) {
            res.status(404);
            return renderPage(req, res, 'error.hbs', false, { message: 'Post not found', code: 404 });
        }

        const postData = post.rows[0];
        postData.tags = (postTags.rows || []).map(t => t.name);
        postData.categoryIds = (postCategories.rows || []).map(c => c.id);

        return renderPage(req, res, 'dashboard/edit-post.hbs', 'dashboard', {
            active: 'posts',
            isNew: false,
            post: postData,
            categories: categories.rows || [],
            availableTags: availableTags.rows || [],
            isPublished: postData.status === 'published',
            isPrivate: postData.status === 'private'
        });
    } catch (err) {
        console.error('Error loading edit post form:', err);
        res.status(500);
        return renderPage(req, res, 'error.hbs', false, { message: 'Error loading edit post form', code: 500 });
    }
}

/**
 * 4. API: Create Post
 */
export async function createPost(req, res) {
    const { title, content, excerpt, categories, tags, status, preview_image, slug: customSlug } = req.body;

    if (!title || !content) {
        return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    try {
        const username = req.session?.user?.username || 'testadmin';
        const newPostId = await postRepository.createPostWithRelations({
            title,
            content,
            excerpt,
            categories,
            tags,
            status,
            preview_image,
            customSlug,
            username
        });

        logActivity({ action: 'Created Post', entityType: 'post', entityId: newPostId, entityTitle: title, username });
        res.json({ success: true, id: newPostId });
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).json({ success: false, error: 'Failed to create post' });
    }
}

/**
 * 5. API: Update Post
 */
export async function updatePost(req, res) {
    const { id } = req.params;
    const { title, content, excerpt, categories, tags, status, preview_image, slug: customSlug } = req.body;

    if (!title || !content) {
        return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    try {
        await postRepository.updatePostWithRelations(id, {
            title,
            content,
            excerpt,
            categories,
            tags,
            status,
            preview_image,
            customSlug
        });

        logActivity({ action: 'Updated Post', entityType: 'post', entityId: parseInt(id, 10), entityTitle: title, username: req.session?.user?.username || 'admin' });
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating post:', err);
        res.status(500).json({ success: false, error: 'Failed to update post' });
    }
}

/**
 * 6. API: Quick Update Post
 */
export async function quickUpdatePost(req, res) {
    try {
        const { id } = req.params;
        const { title, slug, status, categoryId } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        await postRepository.quickUpdate(id, { title, slug, status, categoryId });
        res.json({ success: true, message: 'Post updated successfully' });
    } catch (err) {
        console.error('Error quick editing post:', err);
        res.status(500).json({ success: false, message: 'Failed to quick edit post' });
    }
}

/**
 * 7. API: Duplicate Post
 */
export async function duplicatePost(req, res) {
    try {
        const { id } = req.params;
        const newId = await postRepository.duplicatePost(id, req.session?.user?.username || 'admin');
        if (!newId) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        res.json({ success: true, id: newId, message: 'Post duplicated as draft' });
    } catch (err) {
        console.error('Error duplicating post:', err);
        res.status(500).json({ success: false, message: 'Failed to duplicate post' });
    }
}

/**
 * 8. API: Bulk Posts Action
 */
export async function bulkPostsAction(req, res) {
    const { action, postIds } = req.body;
    if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No posts selected' });
    }

    const ids = postIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    try {
        if (action === 'publish') {
            await postRepository.bulkUpdateStatus(ids, 'published', true);
        } else if (action === 'draft') {
            await postRepository.bulkUpdateStatus(ids, 'draft', false);
        } else if (action === 'private') {
            await postRepository.bulkUpdateStatus(ids, 'private', false);
        } else if (action === 'delete') {
            await postRepository.bulkDelete(ids);
        }
        res.json({ success: true, message: `Successfully updated ${ids.length} post(s)` });
    } catch (err) {
        console.error('Error in bulk action:', err);
        res.status(500).json({ success: false, message: 'Failed to perform bulk action' });
    }
}

/**
 * 9. API: Delete Post
 */
export async function deletePost(req, res) {
    try {
        const { id } = req.params;
        const deleted = await postRepository.deletePost(id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (err) {
        console.error('Error deleting post:', err);
        res.status(500).json({ success: false, error: 'Failed to delete post' });
    }
}
