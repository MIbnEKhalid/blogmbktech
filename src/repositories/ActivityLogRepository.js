import { BaseRepository } from 'mbkauthe';
import { defaultAdapter } from '../db/index.js';

export class ActivityLogRepository extends BaseRepository {
  constructor(adapter = defaultAdapter) {
    super(adapter);
    this.tablesInitialized = false;
  }

  async logActivity({ action, entityType, entityId = null, entityTitle = null, details = null, username = 'admin' }) {
    try {
      await this.query(
        `INSERT INTO blog_activity_logs (action, entity_type, entity_id, entity_title, details, username) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [action, entityType, entityId, entityTitle, details, username]
      );
    } catch (err) {
      console.error('Failed to log activity:', err.message);
    }
  }

  async getActivityLogs({ whereSql = '', limit = 30, offset = 0 }) {
    return this.query(`SELECT * FROM blog_activity_logs ${whereSql} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`).catch(() => ({ rows: [] }));
  }

  async getActivityLogsCount({ whereSql = '' }) {
    return this.query(`SELECT COUNT(*) as total FROM blog_activity_logs ${whereSql}`).catch(() => ({ rows: [{ total: 0 }] }));
  }

  async getSettings() {
    return this.query('SELECT * FROM blog_settings').catch(() => ({ rows: [] }));
  }

  async saveSettings(settingsMap) {
    for (const [key, value] of Object.entries(settingsMap || {})) {
      await this.query(
        `INSERT INTO blog_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, String(value)]
      );
    }
    return true;
  }

  async getEntityCounts() {
    const [posts, categories, tags, comments] = await Promise.all([
      this.query('SELECT COUNT(*) as count FROM blog_posts'),
      this.query('SELECT COUNT(*) as count FROM blog_categories'),
      this.query('SELECT COUNT(*) as count FROM blog_tags'),
      this.query('SELECT COUNT(*) as count FROM blog_comments')
    ]);

    return {
      posts: posts.rows[0]?.count || 0,
      categories: categories.rows[0]?.count || 0,
      tags: tags.rows[0]?.count || 0,
      comments: comments.rows[0]?.count || 0
    };
  }
}

export const activityLogRepository = new ActivityLogRepository();
export default activityLogRepository;
