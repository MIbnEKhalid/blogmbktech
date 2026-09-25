import { BaseRepository } from 'mbkauthe';
import { defaultAdapter } from '../db/index.js';

export class CommentRepository extends BaseRepository {
  constructor(adapter = defaultAdapter) {
    super(adapter, {
      defaultTable: 'blog_comments',
      booleanColumns: ['is_approved'],
      dateColumns: ['created_at'],
    });
  }

  async getCommentsList() {
    const res = await this.query(`
      SELECT c.*, p.title as post_title, p.slug as post_slug 
      FROM blog_comments c 
      LEFT JOIN blog_posts p ON c.post_id = p.id 
      ORDER BY c.created_at DESC
    `);
    return { ...res, rows: (res.rows || []).map((r) => this.normalizeEntity(r)) };
  }

  async getCommentStats() {
    const isSqlite = this.dialect.name === 'sqlite';
    const approvedCond = isSqlite ? '(is_approved = 1 OR is_approved = true)' : 'is_approved = true';
    const pendingCond = isSqlite ? '(is_approved = 0 OR is_approved = false)' : 'is_approved = false';
    return this.query(`
      SELECT 
        COUNT(*) as total_comments,
        COUNT(CASE WHEN ${approvedCond} THEN 1 END) as approved_comments,
        COUNT(CASE WHEN ${pendingCond} THEN 1 END) as pending_comments
      FROM blog_comments
    `);
  }

  async moderateComment(id, isApproved) {
    const val = this.dialect.name === 'sqlite' ? (isApproved ? 1 : 0) : isApproved;
    return this.query('UPDATE blog_comments SET is_approved = $1 WHERE id = $2', [val, id]);
  }

  async findParentComment(id) {
    return this.query('SELECT post_id FROM blog_comments WHERE id = $1', [id]);
  }

  async replyComment(content, username, postId, parentId) {
    const nowFn = this.dialect.name === 'sqlite' ? 'CURRENT_TIMESTAMP' : 'NOW()';
    const trueVal = this.dialect.name === 'sqlite' ? 1 : true;
    return this.query(
      `INSERT INTO blog_comments (content, username, post_id, parent_id, is_approved, created_at) VALUES ($1, $2, $3, $4, ${trueVal}, ${nowFn}) RETURNING id`,
      [content, username, postId, parentId]
    );
  }

  async bulkApprove(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return { rowCount: 0 };
    if (this.dialect.name === 'sqlite') {
      const placeholders = ids.map(() => '?').join(',');
      return this.query(`UPDATE blog_comments SET is_approved = 1 WHERE id IN (${placeholders})`, ids);
    }
    return this.query('UPDATE blog_comments SET is_approved = true WHERE id = ANY($1)', [ids]);
  }

  async bulkUnapprove(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return { rowCount: 0 };
    if (this.dialect.name === 'sqlite') {
      const placeholders = ids.map(() => '?').join(',');
      return this.query(`UPDATE blog_comments SET is_approved = 0 WHERE id IN (${placeholders})`, ids);
    }
    return this.query('UPDATE blog_comments SET is_approved = false WHERE id = ANY($1)', [ids]);
  }

  async bulkDelete(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return { rowCount: 0 };
    if (this.dialect.name === 'sqlite') {
      const placeholders = ids.map(() => '?').join(',');
      return this.query(`DELETE FROM blog_comments WHERE id IN (${placeholders})`, ids);
    }
    return this.query('DELETE FROM blog_comments WHERE id = ANY($1)', [ids]);
  }

  async deleteComment(id) {
    return this.query('DELETE FROM blog_comments WHERE id = $1', [id]);
  }

  async findPostParentComment(parentId, postId) {
    return this.query('SELECT id FROM blog_comments WHERE id = $1 AND post_id = $2', [parentId, postId]);
  }

  async createComment(content, username, postId, parentId = null) {
    return this.query(
      'INSERT INTO blog_comments (content, username, post_id, parent_id) VALUES ($1, $2, $3, $4)',
      [content, username, postId, parentId]
    );
  }

  async getPostComments(whereClause, params) {
    return this.query(`
      SELECT c.id, c.content, c.username, c.created_at, c.parent_id, c.is_approved,
             u.username as author_name,
             u.image as author_image,
             pc.content as parent_content, pu.username as parent_author_name,
             pu.image as parent_author_image
      FROM blog_comments c
      LEFT JOIN mbkcore_users u ON c.username = u.username
      LEFT JOIN blog_comments pc ON c.parent_id = pc.id
      LEFT JOIN mbkcore_users pu ON pc.username = pu.username
      ${whereClause}
      ORDER BY c.created_at DESC
    `, params);
  }

  async getRecentComments(limit = 5) {
    return this.query(`
      SELECT c.*, p.title as post_title, p.slug as post_slug
      FROM blog_comments c
      LEFT JOIN blog_posts p ON c.post_id = p.id
      ORDER BY c.created_at DESC
      LIMIT $1
    `, [limit]);
  }

  async globalSearchComments(search, limit = 4) {
    return this.query(`
      SELECT c.id, c.content, c.username, p.title as post_title 
      FROM blog_comments c 
      LEFT JOIN blog_posts p ON c.post_id = p.id 
      WHERE c.content ILIKE $1 OR c.username ILIKE $1 
      LIMIT $2
    `, [search, limit]);
  }

  async downloadAllComments() {
    return this.query('SELECT * FROM blog_comments');
  }
}

export const commentRepository = new CommentRepository();
export default commentRepository;
