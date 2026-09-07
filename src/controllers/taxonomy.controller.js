import { taxonomyRepository } from '../repositories/index.js';

/**
 * 1. Categories Management Page
 */
export async function getCategories(req, res) {
    try {
        const [result, stats] = await Promise.all([
            taxonomyRepository.getCategoriesWithPostCount(),
            taxonomyRepository.getCategoryStats()
        ]);

        const statsRow = stats.rows[0] || {};
        res.render('dashboard/categories.handlebars', {
            layout: 'dashboard',
            active: 'categories',
            categories: result.rows || [],
            stats: statsRow,
            totalCategories: statsRow.total_categories || 0,
            totalPosts: statsRow.total_posts || 0
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).render('error.handlebars', { message: 'Error fetching categories', code: 500 });
    }
}

/**
 * 2. API: Create Category
 */
export async function createCategory(req, res) {
    try {
        const { name, description } = req.body;
        if (!name?.trim()) return res.status(400).json({ success: false, error: 'Category name is required' });

        const existing = await taxonomyRepository.findCategoryByName(name.trim());
        if (existing.rows?.length > 0) return res.status(400).json({ success: false, error: 'Category with this name already exists' });

        await taxonomyRepository.createCategory(name.trim(), description?.trim() || null);
        res.json({ success: true, message: 'Category created successfully' });
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(err.code === '23505' ? 400 : 500).json({ success: false, error: err.code === '23505' ? 'Category with this name already exists' : 'Failed to create category' });
    }
}

/**
 * 3. API: Update Category
 */
export async function updateCategory(req, res) {
    try {
        const { name, description } = req.body;
        if (!name?.trim()) return res.status(400).json({ success: false, error: 'Category name is required' });

        const existing = await taxonomyRepository.findCategoryByNameExcludingId(name.trim(), req.params.id);
        if (existing.rows?.length > 0) return res.status(400).json({ success: false, error: 'Category with this name already exists' });

        const result = await taxonomyRepository.updateCategory(req.params.id, name.trim(), description?.trim() || null);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Category not found' });

        res.json({ success: true, message: 'Category updated successfully' });
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ success: false, error: 'Failed to update category' });
    }
}

/**
 * 4. API: Delete Category
 */
export async function deleteCategory(req, res) {
    const { id } = req.params;
    try {
        const postCount = await taxonomyRepository.getCategoryPostCount(id);
        const count = parseInt(postCount.rows[0]?.count || 0);
        if (count > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete category. It is used by ${count} post(s). Please remove the category from all posts first.`
            });
        }

        const result = await taxonomyRepository.deleteCategory(id);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Category not found' });
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
}

/**
 * 5. Tags Management Page
 */
export async function getTags(req, res) {
    try {
        const [tags, stats] = await Promise.all([
            taxonomyRepository.getTagsWithPostCount(),
            taxonomyRepository.getTagStats()
        ]);

        const statsRow = stats.rows[0] || {};
        res.render('dashboard/tags.handlebars', {
            layout: 'dashboard',
            active: 'tags',
            tags: tags.rows || [],
            stats: statsRow,
            totalTags: statsRow.total_tags || 0,
            postsWithTags: statsRow.posts_with_tags || 0,
            totalPosts: statsRow.total_posts || 0
        });
    } catch (err) {
        console.error('Error fetching tags:', err);
        res.status(500).render('error.handlebars', { message: 'Error fetching tags', code: 500 });
    }
}

/**
 * 6. API: Create Tag
 */
export async function createTag(req, res) {
    try {
        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ success: false, error: 'Tag name is required' });

        const normalized = name.toLowerCase().trim();
        const existing = await taxonomyRepository.findTagByName(normalized);
        if (existing.rows?.length > 0) return res.status(400).json({ success: false, error: 'Tag already exists' });

        await taxonomyRepository.createTag(normalized);
        res.json({ success: true, message: 'Tag created successfully' });
    } catch (err) {
        console.error('Error creating tag:', err);
        res.status(err.code === '23505' ? 400 : 500).json({ success: false, error: err.code === '23505' ? 'Tag already exists' : 'Failed to create tag' });
    }
}

/**
 * 7. API: Update Tag
 */
export async function updateTag(req, res) {
    try {
        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ success: false, error: 'Tag name is required' });

        const normalized = name.toLowerCase().trim();
        const existing = await taxonomyRepository.findTagByNameExcludingId(normalized, req.params.id);
        if (existing.rows?.length > 0) return res.status(400).json({ success: false, error: 'Tag already exists' });

        const result = await taxonomyRepository.updateTag(req.params.id, normalized);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Tag not found' });

        res.json({ success: true, message: 'Tag updated successfully' });
    } catch (err) {
        console.error('Error updating tag:', err);
        res.status(500).json({ success: false, error: 'Failed to update tag' });
    }
}

/**
 * 8. API: Delete Tag
 */
export async function deleteTag(req, res) {
    try {
        const postCount = await taxonomyRepository.getTagPostCount(req.params.id);
        const count = parseInt(postCount.rows[0]?.count || 0);

        if (count > 0) {
            await taxonomyRepository.deletePostTagsByTagId(req.params.id);
        }

        const result = await taxonomyRepository.deleteTag(req.params.id);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Tag not found' });

        res.json({
            success: true,
            message: count > 0 ? `Tag deleted successfully and removed from ${count} post(s)` : 'Tag deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting tag:', err);
        res.status(500).json({ success: false, error: 'Failed to delete tag' });
    }
}
