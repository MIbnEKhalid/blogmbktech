import { BaseRepository } from 'mbkauthe';
import { defaultAdapter } from '../db/index.js';
import { generateSlug, parseArray } from '../utils/helpers.js';

export class PostRepository extends BaseRepository {
  constructor(adapter = defaultAdapter) {
    super(adapter, {
      defaultTable: 'blog_posts',
      booleanColumns: ['is_published', 'featured'],
      dateColumns: ['created_at', 'updated_at'],
    });
  }

  // --- Helper to sync post categories within a transaction ---
  async syncPostCategories(clientOrTx, postId, categories) {
    const catIds = parseArray(categories).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    const finalCatIds = catIds.length > 0 ? catIds : [1];
    for (const catId of finalCatIds) {
      await clientOrTx.query('INSERT INTO blog_post_categories (post_id, category_id) VALUES ($1, $2)', [postId, catId]);
    }
  }

  // --- Helper to sync post tags within a transaction ---
  async syncPostTags(clientOrTx, postId, tags) {
    const tagArray = parseArray(tags);
    for (const tag of tagArray) {
      const name = String(tag).toLowerCase().trim();
      if (!name) continue;

      let tagRes = await clientOrTx.query('SELECT id FROM blog_tags WHERE name = $1', [name]);
      if (tagRes.rows.length === 0) {
        tagRes = await clientOrTx.query('INSERT INTO blog_tags (name) VALUES ($1) RETURNING id', [name]);
      }
      await clientOrTx.query('INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2)', [postId, tagRes.rows[0].id]);
    }
  }

  async getPostsList({ whereSql = '', orderBy = 'p.created_at DESC', params = [] }) {
    const agg = this.dialect.name === 'sqlite' ? 'GROUP_CONCAT(DISTINCT c.name)' : "STRING_AGG(DISTINCT c.name, ', ')";
    const res = await this.query(`
      SELECT p.*, p.username as author_name,
             ${agg} as categories
      FROM blog_posts p
      LEFT JOIN blog_post_categories pc ON p.id = pc.post_id
      LEFT JOIN blog_categories c ON pc.category_id = c.id
      ${whereSql}
      GROUP BY p.id
      ORDER BY ${orderBy}
    `, params);
    return { ...res, rows: (res.rows || []).map((r) => this.normalizeEntity(r)) };
  }

  async getPostStats() {
    return this.query(`
      SELECT 
        COUNT(*) as total_posts,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_posts,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_posts,
        COUNT(CASE WHEN status = 'private' THEN 1 END) as private_posts,
        (SELECT COUNT(*) FROM blog_categories) as total_categories
      FROM blog_posts
    `);
  }

  async findById(id) {
    const res = await this.query('SELECT * FROM blog_posts WHERE id = $1', [id]);
    return { ...res, rows: (res.rows || []).map((r) => this.normalizeEntity(r)) };
  }

  async findPostCategories(postId) {
    return this.query('SELECT c.id, c.name FROM blog_categories c JOIN blog_post_categories pc ON c.id = pc.category_id WHERE pc.post_id = $1', [postId]);
  }

  async findPostTags(postId) {
    return this.query('SELECT t.name FROM blog_tags t JOIN blog_post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = $1', [postId]);
  }

  async createPostWithRelations({ title, content, excerpt, categories, tags, status, preview_image, customSlug, username }) {
    return this.withTransaction(async (tx) => {
      const slug = (customSlug && customSlug.trim()) ? generateSlug(customSlug) : generateSlug(title);
      const postStatus = status || 'draft';
      const isPublished = this.dialect.name === 'sqlite' ? (postStatus === 'published' ? 1 : 0) : (postStatus === 'published');

      const postResult = await tx.query(
        'INSERT INTO blog_posts (title, slug, excerpt, content_markdown, status, published, preview_image, username) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [title, slug, excerpt || null, content, postStatus, isPublished, preview_image || null, username]
      );

      const newPostId = postResult.rows[0].id;
      await this.syncPostCategories(tx, newPostId, categories);
      await this.syncPostTags(tx, newPostId, tags);
      return newPostId;
    });
  }

  async updatePostWithRelations(id, { title, content, excerpt, categories, tags, status, preview_image, customSlug }) {
    return this.withTransaction(async (tx) => {
      const slug = (customSlug && customSlug.trim()) ? generateSlug(customSlug) : generateSlug(title);
      const postStatus = status || 'draft';
      const nowFn = this.dialect.name === 'sqlite' ? 'CURRENT_TIMESTAMP' : 'NOW()';
      const isPublished = this.dialect.name === 'sqlite' ? (postStatus === 'published' ? 1 : 0) : (postStatus === 'published');

      await tx.query(
        `UPDATE blog_posts SET title = $1, slug = $2, excerpt = $3, content_markdown = $4, status = $5, published = $6, preview_image = $7, updated_at = ${nowFn} WHERE id = $8`,
        [title, slug, excerpt || null, content, postStatus, isPublished, preview_image || null, id]
      );

      await tx.query('DELETE FROM blog_post_categories WHERE post_id = $1', [id]);
      await this.syncPostCategories(tx, id, categories);

      await tx.query('DELETE FROM blog_post_tags WHERE post_id = $1', [id]);
      await this.syncPostTags(tx, id, tags);
      return true;
    });
  }

  async quickUpdate(id, { title, slug, status, categoryId }) {
    const cleanSlug = slug && slug.trim() ? generateSlug(slug) : generateSlug(title);
    const nowFn = this.dialect.name === 'sqlite' ? 'CURRENT_TIMESTAMP' : 'NOW()';
    const isPub = this.dialect.name === 'sqlite' ? (status === 'published' ? 1 : 0) : (status === 'published');
    await this.query(
      `UPDATE blog_posts SET title = $1, slug = $2, status = $3, published = $4, updated_at = ${nowFn} WHERE id = $5`,
      [title.trim(), cleanSlug, status || 'draft', isPub, id]
    );

    if (categoryId) {
      await this.query('DELETE FROM blog_post_categories WHERE post_id = $1', [id]);
      await this.query('INSERT INTO blog_post_categories (post_id, category_id) VALUES ($1, $2)', [id, parseInt(categoryId, 10)]);
    }
    return true;
  }

  async duplicatePost(id, username) {
    return this.withTransaction(async (tx) => {
      const postResult = await tx.query('SELECT * FROM blog_posts WHERE id = $1', [id]);
      if (!postResult.rows[0]) {
        return null;
      }

      const orig = postResult.rows[0];
      const newTitle = `${orig.title} (Copy)`;
      const newSlug = `${orig.slug}-copy-${Date.now().toString().slice(-4)}`;
      const nowFn = this.dialect.name === 'sqlite' ? 'CURRENT_TIMESTAMP' : 'NOW()';
      const falseVal = this.dialect.name === 'sqlite' ? 0 : false;

      const newPost = await tx.query(
        `INSERT INTO blog_posts (title, slug, excerpt, content_markdown, status, published, preview_image, username, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'draft', ${falseVal}, $5, $6, ${nowFn}, ${nowFn}) RETURNING id`,
        [newTitle, newSlug, orig.excerpt, orig.content_markdown, orig.preview_image, username || 'admin']
      );

      const newId = newPost.rows[0].id;
      await tx.query('INSERT INTO blog_post_categories (post_id, category_id) SELECT $1, category_id FROM blog_post_categories WHERE post_id = $2', [newId, id]);
      await tx.query('INSERT INTO blog_post_tags (post_id, tag_id) SELECT $1, tag_id FROM blog_post_tags WHERE post_id = $2', [newId, id]);
      return newId;
    });
  }

  async bulkUpdateStatus(ids, status, published) {
    if (!Array.isArray(ids) || ids.length === 0) return;
    return this.withTransaction(async (tx) => {
      const nowFn = this.dialect.name === 'sqlite' ? 'CURRENT_TIMESTAMP' : 'NOW()';
      const pubVal = this.dialect.name === 'sqlite' ? (published ? 1 : 0) : published;
      if (this.dialect.name === 'sqlite') {
        const ph = ids.map(() => '?').join(',');
        await tx.query(`UPDATE blog_posts SET status = ?, published = ?, updated_at = ${nowFn} WHERE id IN (${ph})`, [status, pubVal, ...ids]);
      } else {
        await tx.query(`UPDATE blog_posts SET status = $1, published = $2, updated_at = ${nowFn} WHERE id = ANY($3)`, [status, pubVal, ids]);
      }
    });
  }

  async bulkDelete(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return;
    return this.withTransaction(async (tx) => {
      if (this.dialect.name === 'sqlite') {
        const ph = ids.map(() => '?').join(',');
        await tx.query(`DELETE FROM blog_comments WHERE post_id IN (${ph})`, ids);
        await tx.query(`DELETE FROM blog_post_categories WHERE post_id IN (${ph})`, ids);
        await tx.query(`DELETE FROM blog_post_tags WHERE post_id IN (${ph})`, ids);
        await tx.query(`DELETE FROM blog_posts WHERE id IN (${ph})`, ids);
      } else {
        await tx.query('DELETE FROM blog_comments WHERE post_id = ANY($1)', [ids]);
        await tx.query('DELETE FROM blog_post_categories WHERE post_id = ANY($1)', [ids]);
        await tx.query('DELETE FROM blog_post_tags WHERE post_id = ANY($1)', [ids]);
        await tx.query('DELETE FROM blog_posts WHERE id = ANY($1)', [ids]);
      }
    });
  }

  async deletePost(id) {
    return this.withTransaction(async (tx) => {
      const check = await tx.query('SELECT id FROM blog_posts WHERE id = $1', [id]);
      if (!check.rows[0]) return false;

      await tx.query('DELETE FROM blog_comments WHERE post_id = $1', [id]);
      await tx.query('DELETE FROM blog_post_tags WHERE post_id = $1', [id]);
      await tx.query('DELETE FROM blog_post_categories WHERE post_id = $1', [id]);
      await tx.query('DELETE FROM blog_posts WHERE id = $1', [id]);
      return true;
    });
  }

  async fetchPostList({ whereClause, joinClause = '', params = [], limit = 10, offset = 0 }) {
    const agg = this.dialect.name === 'sqlite' ? 'GROUP_CONCAT(DISTINCT c.name)' : "STRING_AGG(DISTINCT c.name, ', ')";
    const [countRes, postsRes] = await Promise.all([
      this.query(`SELECT COUNT(DISTINCT p.id) as total FROM blog_posts p ${joinClause} ${whereClause}`, params),
      this.query(`
        SELECT p.*, 
               ${agg} as categories,
               (SELECT COUNT(*) FROM blog_comments WHERE post_id = p.id) as comment_count,
               u.username,
               u.username as author_name,
               u.image as author_image
        FROM blog_posts p
        ${joinClause}
        LEFT JOIN blog_post_categories pc ON p.id = pc.post_id
        LEFT JOIN blog_categories c ON pc.category_id = c.id
        LEFT JOIN mbkcore_users u ON p.username = u.username
        ${whereClause}
        GROUP BY p.id, u.username, u.image
        ORDER BY p.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset])
    ]);

    const totalPosts = parseInt(countRes.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(totalPosts / limit) || 1;
    return { posts: (postsRes.rows || []).map((r) => this.normalizeEntity(r)), totalPosts, totalPages };
  }

  async findBySlug(slug) {
    const agg = this.dialect.name === 'sqlite' ? 'GROUP_CONCAT(DISTINCT c.name)' : "STRING_AGG(DISTINCT c.name, ', ')";
    const catIdsAgg = this.dialect.name === 'sqlite'
      ? "json_group_array(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL)"
      : "ARRAY_AGG(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL)";
    const catNamesAgg = this.dialect.name === 'sqlite'
      ? "json_group_array(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL)"
      : "ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL)";

    const res = await this.query(`
      SELECT p.*, 
             ${agg} as categories,
             u.username as author_name,
             u.image as author_image,
             ${catIdsAgg} as category_ids,
             ${catNamesAgg} as category_names
      FROM blog_posts p
      LEFT JOIN mbkcore_users u ON p.username = u.username
      LEFT JOIN blog_post_categories pc ON p.id = pc.post_id
      LEFT JOIN blog_categories c ON pc.category_id = c.id
      WHERE p.slug = $1 AND p.status IN ('published', 'private')
      GROUP BY p.id, u.username, u.image
    `, [slug]);
    return { ...res, rows: (res.rows || []).map((r) => this.normalizeEntity(r)) };
  }

  async incrementViews(id) {
    return this.query('UPDATE blog_posts SET views = views + 1 WHERE id = $1', [id]);
  }

  async getRelatedPosts(postId, categoryIds = []) {
    const agg = this.dialect.name === 'sqlite' ? 'GROUP_CONCAT(DISTINCT c.name)' : "STRING_AGG(DISTINCT c.name, ', ')";
    const cleanCatIds = (categoryIds || []).filter(Boolean);
    if (cleanCatIds.length > 0) {
      if (this.dialect.name === 'sqlite') {
        const ph = cleanCatIds.map(() => '?').join(',');
        return this.query(`
          SELECT DISTINCT p.id, p.title, p.slug, p.preview_image, p.created_at, p.content_markdown,
                 u.username,
                 u.username as author_name,
                 u.image as author_image,
                 ${agg} as categories
          FROM blog_posts p
          LEFT JOIN mbkcore_users u ON p.username = u.username
          LEFT JOIN blog_post_categories pc ON p.id = pc.post_id
          LEFT JOIN blog_categories c ON pc.category_id = c.id
          WHERE p.id != ? AND p.status = 'published' AND pc.category_id IN (${ph})
          GROUP BY p.id, u.username, u.image
          ORDER BY p.created_at DESC
          LIMIT 3
        `, [postId, ...cleanCatIds]);
      }
      return this.query(`
        SELECT DISTINCT p.id, p.title, p.slug, p.preview_image, p.created_at, p.content_markdown,
               u.username,
               u.username as author_name,
               u.image as author_image,
               ${agg} as categories
        FROM blog_posts p
        LEFT JOIN mbkcore_users u ON p.username = u.username
        LEFT JOIN blog_post_categories pc ON p.id = pc.post_id
        LEFT JOIN blog_categories c ON pc.category_id = c.id
        WHERE p.id != $1 AND p.status = 'published' AND pc.category_id = ANY($2::int[])
        GROUP BY p.id, u.username, u.image
        ORDER BY p.created_at DESC
        LIMIT 3
      `, [postId, cleanCatIds]);
    }
    return this.query(`
      SELECT DISTINCT p.id, p.title, p.slug, p.preview_image, p.created_at, p.content_markdown,
             u.username,
             u.username as author_name,
             u.image as author_image,
             ${agg} as categories
      FROM blog_posts p
      LEFT JOIN mbkcore_users u ON p.username = u.username
      LEFT JOIN blog_post_categories pc ON p.id = pc.post_id
      LEFT JOIN blog_categories c ON pc.category_id = c.id
      WHERE p.id != $1 AND p.status = 'published'
      GROUP BY p.id, u.username, u.image
      ORDER BY p.created_at DESC
      LIMIT 3
    `, [postId]);
  }

  async getBookmarkedPosts(ids, statusFilter) {
    if (!Array.isArray(ids) || ids.length === 0) return { rows: [] };
    const agg = this.dialect.name === 'sqlite' ? 'GROUP_CONCAT(DISTINCT c.name)' : "STRING_AGG(DISTINCT c.name, ', ')";
    if (this.dialect.name === 'sqlite') {
      const ph = ids.map(() => '?').join(',');
      return this.query(`
        SELECT p.*, 
               ${agg} as categories,
               (SELECT COUNT(*) FROM blog_comments WHERE post_id = p.id) as comment_count,
               u.username,
               u.username as author_name,
               u.image as author_image
        FROM blog_posts p
        LEFT JOIN blog_post_categories pc ON p.id = pc.post_id
        LEFT JOIN blog_categories c ON pc.category_id = c.id
        LEFT JOIN mbkcore_users u ON p.username = u.username
        WHERE p.status ${statusFilter} AND p.id IN (${ph})
        GROUP BY p.id, u.username, u.image
        ORDER BY p.created_at DESC
      `, ids);
    }
    return this.query(`
      SELECT p.*, 
             ${agg} as categories,
             (SELECT COUNT(*) FROM blog_comments WHERE post_id = p.id) as comment_count,
             u.username,
             u.username as author_name,
             u.image as author_image
      FROM blog_posts p
      LEFT JOIN blog_post_categories pc ON p.id = pc.post_id
      LEFT JOIN blog_categories c ON pc.category_id = c.id
      LEFT JOIN mbkcore_users u ON p.username = u.username
      WHERE p.status ${statusFilter} AND p.id = ANY($1::int[])
      GROUP BY p.id, u.username, u.image
      ORDER BY p.created_at DESC
    `, [ids]);
  }

  async getPublishedPostBySlug(slug) {
    return this.query('SELECT id FROM blog_posts WHERE slug = $1 AND status = $2', [slug, 'published']);
  }

  async getOverviewPostStats() {
    return this.query(`
      SELECT 
        COUNT(*) as total_posts,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_posts,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_posts,
        COUNT(CASE WHEN status = 'private' THEN 1 END) as private_posts
      FROM blog_posts
    `);
  }

  async getRecentPosts(limit = 5) {
    const agg = this.dialect.name === 'sqlite' ? 'GROUP_CONCAT(c.name)' : "STRING_AGG(c.name, ', ')";
    return this.query(`
      SELECT p.*, p.username as author_name, ${agg} as categories
      FROM blog_posts p
      LEFT JOIN blog_post_categories pc ON p.id = pc.post_id
      LEFT JOIN blog_categories c ON pc.category_id = c.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $1
    `, [limit]);
  }

  async getAnalyticsOverview() {
    return this.query(`
      SELECT 
        COALESCE(SUM(views), 0) as total_views,
        CAST(COALESCE(AVG(views), 0) AS INTEGER) as avg_views,
        COUNT(*) as total_posts,
        (SELECT COUNT(*) FROM blog_comments) as total_comments
      FROM blog_posts
    `);
  }

  async getTopPosts(limit = 10) {
    const agg = this.dialect.name === 'sqlite' ? 'GROUP_CONCAT(DISTINCT c.name)' : "STRING_AGG(DISTINCT c.name, ', ')";
    return this.query(`
      SELECT p.id, p.title, p.slug, p.views, p.created_at, p.status,
             (SELECT COUNT(*) FROM blog_comments WHERE post_id = p.id) as comment_count,
             ${agg} as categories
      FROM blog_posts p
      LEFT JOIN blog_post_categories pc ON p.id = pc.post_id
      LEFT JOIN blog_categories c ON pc.category_id = c.id
      GROUP BY p.id
      ORDER BY p.views DESC, p.created_at DESC
      LIMIT $1
    `, [limit]);
  }

  async getCategoryDistribution(limit = 6) {
    return this.query(`
      SELECT c.name, COUNT(DISTINCT pc.post_id) as count, COALESCE(SUM(p.views), 0) as views
      FROM blog_categories c
      LEFT JOIN blog_post_categories pc ON c.id = pc.category_id
      LEFT JOIN blog_posts p ON pc.post_id = p.id
      GROUP BY c.id
      ORDER BY count DESC
      LIMIT $1
    `, [limit]);
  }

  async getStatusDistribution() {
    return this.query('SELECT status, COUNT(*) as count FROM blog_posts GROUP BY status');
  }

  async getPostsForSeo() {
    return this.query(`
      SELECT id, title, slug, excerpt, content_markdown, preview_image, status, created_at
      FROM blog_posts
      ORDER BY created_at DESC
    `);
  }

  async getPublishedPostsForSitemap() {
    return this.query("SELECT slug, created_at, updated_at FROM blog_posts WHERE status = 'published' ORDER BY updated_at DESC");
  }

  async globalSearchPosts(search, limit = 5) {
    const matchOp = this.dialect.name === 'sqlite' ? 'LIKE' : 'ILIKE';
    return this.query(`SELECT id, title, slug, status, created_at FROM blog_posts WHERE title ${matchOp} $1 OR excerpt ${matchOp} $1 LIMIT $2`, [search, limit]);
  }

  async downloadAllPosts() {
    return this.query('SELECT * FROM blog_posts');
  }

  async downloadAllPostCategories() {
    return this.query('SELECT * FROM blog_post_categories');
  }

  async downloadAllPostTags() {
    return this.query('SELECT * FROM blog_post_tags');
  }
}

export const postRepository = new PostRepository();
export default postRepository;
