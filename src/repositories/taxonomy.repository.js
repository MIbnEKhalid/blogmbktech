import { BaseRepository } from 'mbkauthe';
import { defaultAdapter } from '../db/index.js';

export class TaxonomyRepository extends BaseRepository {
  constructor(adapter = defaultAdapter) {
    super(adapter);
  }

  // --- Category Methods ---

  async getCategoriesWithPostCount() {
    return this.query(`
      SELECT c.*, COUNT(DISTINCT p.id) as post_count 
      FROM blog_categories c 
      LEFT JOIN blog_post_categories pc ON c.id = pc.category_id
      LEFT JOIN blog_posts p ON pc.post_id = p.id
      GROUP BY c.id 
      ORDER BY c.name
    `);
  }

  async getCategoryStats() {
    return this.query(`
      SELECT 
        COUNT(*) as total_categories,
        (SELECT COUNT(*) FROM blog_posts) as total_posts
      FROM blog_categories
    `);
  }

  async findCategoryByName(name) {
    return this.query('SELECT id FROM blog_categories WHERE LOWER(name) = LOWER($1)', [name]);
  }

  async findCategoryByNameExcludingId(name, id) {
    return this.query('SELECT id FROM blog_categories WHERE LOWER(name) = LOWER($1) AND id != $2', [name, id]);
  }

  async createCategory(name, description = null) {
    return this.query('INSERT INTO blog_categories (name, description) VALUES ($1, $2)', [name, description]);
  }

  async updateCategory(id, name, description = null) {
    return this.query('UPDATE blog_categories SET name = $1, description = $2 WHERE id = $3', [name, description, id]);
  }

  async getCategoryPostCount(categoryId) {
    return this.query('SELECT COUNT(*) FROM blog_post_categories WHERE category_id = $1', [categoryId]);
  }

  async deleteCategory(id) {
    return this.query('DELETE FROM blog_categories WHERE id = $1', [id]);
  }

  async getAllCategories() {
    return this.query('SELECT * FROM blog_categories ORDER BY name ASC');
  }

  async getCategoryByName(name) {
    return this.query('SELECT * FROM blog_categories WHERE name = $1', [name]);
  }

  async getCategoriesArchive(statusFilter) {
    return this.query(`
      SELECT c.*, COUNT(DISTINCT pc.post_id) as post_count
      FROM blog_categories c
      LEFT JOIN blog_post_categories pc ON c.id = pc.category_id
      LEFT JOIN blog_posts p ON pc.post_id = p.id ${statusFilter}
      WHERE p.id IS NOT NULL
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
  }

  async getDistinctCategoriesWithLastUpdated() {
    return this.query(`
      SELECT DISTINCT c.name, MAX(p.updated_at) as last_updated 
      FROM blog_categories c 
      LEFT JOIN blog_post_categories pc ON c.id = pc.category_id 
      LEFT JOIN blog_posts p ON pc.post_id = p.id AND p.status = 'published' 
      GROUP BY c.name 
      ORDER BY last_updated DESC
    `);
  }

  async globalSearchCategories(search, limit = 4) {
    return this.query('SELECT id, name FROM blog_categories WHERE name ILIKE $1 LIMIT $2', [search, limit]);
  }

  // --- Tag Methods ---

  async getTagsWithPostCount() {
    return this.query(`
      SELECT t.*, COUNT(pt.post_id) as post_count 
      FROM blog_tags t 
      LEFT JOIN blog_post_tags pt ON t.id = pt.tag_id 
      GROUP BY t.id 
      ORDER BY t.name
    `);
  }

  async getTagStats() {
    return this.query(`
      SELECT 
        COUNT(*) as total_tags,
        COUNT(DISTINCT pt.post_id) as posts_with_tags,
        (SELECT COUNT(*) FROM blog_posts) as total_posts
      FROM blog_tags t
      LEFT JOIN blog_post_tags pt ON t.id = pt.tag_id
    `);
  }

  async findTagByName(name) {
    return this.query('SELECT id FROM blog_tags WHERE name = $1', [name]);
  }

  async findTagByNameExcludingId(name, id) {
    return this.query('SELECT id FROM blog_tags WHERE name = $1 AND id != $2', [name, id]);
  }

  async createTag(name) {
    return this.query('INSERT INTO blog_tags (name) VALUES ($1)', [name]);
  }

  async updateTag(id, name) {
    return this.query('UPDATE blog_tags SET name = $1 WHERE id = $2', [name, id]);
  }

  async getTagPostCount(tagId) {
    return this.query('SELECT COUNT(*) FROM blog_post_tags WHERE tag_id = $1', [tagId]);
  }

  async deletePostTagsByTagId(tagId) {
    return this.query('DELETE FROM blog_post_tags WHERE tag_id = $1', [tagId]);
  }

  async deleteTag(id) {
    return this.query('DELETE FROM blog_tags WHERE id = $1', [id]);
  }

  async getAllTags() {
    return this.query('SELECT * FROM blog_tags ORDER BY name ASC');
  }

  async getTagByName(name) {
    return this.query('SELECT * FROM blog_tags WHERE name = $1', [name]);
  }

  async getTagsArchive(statusFilter) {
    return this.query(`
      SELECT t.*, COUNT(DISTINCT pt.post_id) as post_count
      FROM blog_tags t
      LEFT JOIN blog_post_tags pt ON t.id = pt.tag_id
      LEFT JOIN blog_posts p ON pt.post_id = p.id ${statusFilter}
      WHERE p.id IS NOT NULL
      GROUP BY t.id
      ORDER BY t.name ASC
    `);
  }

  async getDistinctTagsWithLastUpdated() {
    return this.query(`
      SELECT DISTINCT t.name, MAX(p.updated_at) as last_updated 
      FROM blog_tags t 
      LEFT JOIN blog_post_tags pt ON t.id = pt.tag_id 
      LEFT JOIN blog_posts p ON pt.post_id = p.id AND p.status = 'published' 
      GROUP BY t.name 
      ORDER BY last_updated DESC
    `);
  }

  async globalSearchTags(search, limit = 4) {
    return this.query('SELECT id, name FROM blog_tags WHERE name ILIKE $1 LIMIT $2', [search, limit]);
  }
}

export const taxonomyRepository = new TaxonomyRepository();
export default taxonomyRepository;
