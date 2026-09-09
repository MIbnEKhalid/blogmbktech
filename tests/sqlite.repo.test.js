import path from 'path';
import { fileURLToPath } from 'url';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { SqliteAdapter, sqliteDialect, applySchema, closeAllConnections } from 'mbkauthe';

import { PostRepository } from '../src/repositories/PostRepository.js';
import { TaxonomyRepository } from '../src/repositories/TaxonomyRepository.js';
import { CommentRepository } from '../src/repositories/CommentRepository.js';
import { ActivityLogRepository } from '../src/repositories/ActivityLogRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMA_PATH = path.resolve(__dirname, '../src/db/schema/sqlite.sql');

describe('Dual DB Architecture: SQLite Repository Integration', () => {
  let adapter;
  let postRepo;
  let taxonomyRepo;
  let commentRepo;
  let activityRepo;

  beforeAll(async () => {
    adapter = new SqliteAdapter(':memory:', {
      dialect: sqliteDialect,
      jsonColumns: ['category_ids', 'category_names', 'sess'],
      booleanColumns: ['published', 'is_approved', 'active', 'is_active', 'have_mail_account'],
    });

    await applySchema(adapter, SCHEMA_PATH, { silent: true, name: 'test-sqlite-schema' });

    postRepo = new PostRepository(adapter);
    taxonomyRepo = new TaxonomyRepository(adapter);
    commentRepo = new CommentRepository(adapter);
    activityRepo = new ActivityLogRepository(adapter);
  });

  afterAll(async () => {
    await adapter.close();
    await closeAllConnections();
  });

  describe('TaxonomyRepository', () => {
    test('fetches default seeded categories and tags', async () => {
      const categoriesRes = await taxonomyRepo.getAllCategories();
      expect(categoriesRes.rows.length).toBeGreaterThanOrEqual(3);

      const tagsRes = await taxonomyRepo.getAllTags();
      expect(tagsRes.rows.length).toBeGreaterThanOrEqual(6);
    });

    test('creates, updates, and deletes a category', async () => {
      await taxonomyRepo.createCategory('Cloud Computing', 'Posts on AWS, GCP, Azure');
      const found = await taxonomyRepo.findCategoryByName('Cloud Computing');
      expect(found.rows.length).toBe(1);

      const catId = found.rows[0].id;
      await taxonomyRepo.updateCategory(catId, 'Cloud & DevOps', 'Updated description');

      const updated = await taxonomyRepo.getCategoryByName('Cloud & DevOps');
      expect(updated.rows[0].name).toBe('Cloud & DevOps');

      await taxonomyRepo.deleteCategory(catId);
      const afterDelete = await taxonomyRepo.findCategoryByName('Cloud & DevOps');
      expect(afterDelete.rows.length).toBe(0);
    });

    test('creates, updates, and deletes a tag', async () => {
      await taxonomyRepo.createTag('sqlite');
      const found = await taxonomyRepo.findTagByName('sqlite');
      expect(found.rows.length).toBe(1);

      const tagId = found.rows[0].id;
      await taxonomyRepo.updateTag(tagId, 'sqlite3');

      const updated = await taxonomyRepo.getTagByName('sqlite3');
      expect(updated.rows[0].name).toBe('sqlite3');

      await taxonomyRepo.deleteTag(tagId);
      const afterDelete = await taxonomyRepo.findTagByName('sqlite3');
      expect(afterDelete.rows.length).toBe(0);
    });
  });

  describe('PostRepository', () => {
    let createdPostId;

    test('creates a post with categories and tags inside a transaction', async () => {
      createdPostId = await postRepo.createPostWithRelations({
        title: 'Modern Architecture with SQLite',
        content: '# Hello SQLite\nThis is a dual database test post.',
        excerpt: 'Dual database test',
        categories: [1, 2],
        tags: ['nodejs', 'database'],
        status: 'published',
        preview_image: '/Assets/test.png',
        customSlug: 'modern-architecture-sqlite',
        username: 'admin',
      });

      expect(createdPostId).toBeDefined();
      expect(typeof createdPostId).toBe('number');
    });

    test('finds post by slug and parses category_ids & category_names', async () => {
      const res = await postRepo.findBySlug('modern-architecture-sqlite');
      expect(res.rows.length).toBe(1);

      const post = res.rows[0];
      expect(post.title).toBe('Modern Architecture with SQLite');
      expect(post.author_name).toBe('admin');
      expect(typeof post.categories).toBe('string');
      expect(post.categories.length).toBeGreaterThan(0);

      // JSON columns array parsing verification
      expect(Array.isArray(post.category_ids)).toBe(true);
      expect(post.category_ids).toContain(1);
    });

    test('fetches post categories and tags', async () => {
      const cats = await postRepo.findPostCategories(createdPostId);
      expect(cats.rows.length).toBe(2);

      const tags = await postRepo.findPostTags(createdPostId);
      expect(tags.rows.length).toBe(2);
    });

    test('increments post view count', async () => {
      await postRepo.incrementViews(createdPostId);
      const res = await postRepo.findById(createdPostId);
      expect(res.rows[0].views).toBe(1);
    });

    test('updates post with relations', async () => {
      await postRepo.updatePostWithRelations(createdPostId, {
        title: 'Modern Architecture with SQLite & Postgres',
        content: 'Updated content here.',
        excerpt: 'Updated excerpt',
        categories: [1],
        tags: ['database'],
        status: 'published',
        preview_image: '/Assets/updated.png',
        customSlug: 'modern-architecture-sqlite-postgres',
      });

      const res = await postRepo.findById(createdPostId);
      expect(res.rows[0].title).toBe('Modern Architecture with SQLite & Postgres');

      const cats = await postRepo.findPostCategories(createdPostId);
      expect(cats.rows.length).toBe(1);
    });

    test('duplicates a post within transaction', async () => {
      const dupeId = await postRepo.duplicatePost(createdPostId, 'admin');
      expect(dupeId).toBeDefined();

      const dupe = await postRepo.findById(dupeId);
      expect(dupe.rows[0].title).toContain('(Copy)');
      expect(dupe.rows[0].status).toBe('draft');

      // Cleanup duplicated post
      await postRepo.deletePost(dupeId);
    });

    test('fetches post list and overview stats', async () => {
      const list = await postRepo.getPostsList({});
      expect(list.rows.length).toBeGreaterThanOrEqual(1);

      const stats = await postRepo.getPostStats();
      expect(stats.rows[0].total_posts).toBeGreaterThanOrEqual(1);
      expect(stats.rows[0].published_posts).toBeGreaterThanOrEqual(1);
    });
  });

  describe('CommentRepository', () => {
    let commentId;
    let postId;

    beforeAll(async () => {
      const posts = await postRepo.getPostsList({});
      postId = posts.rows[0].id;
    });

    test('creates a comment and reply', async () => {
      const res = await commentRepo.createComment('Great article!', 'admin', postId);
      expect(res).toBeDefined();

      const comments = await commentRepo.getCommentsList();
      expect(comments.rows.length).toBeGreaterThanOrEqual(1);
      commentId = comments.rows[0].id;

      const replyRes = await commentRepo.replyComment('Thank you!', 'admin', postId, commentId);
      expect(replyRes.rows[0].id).toBeDefined();
    });

    test('moderates comment approval status', async () => {
      await commentRepo.moderateComment(commentId, true);
      const stats = await commentRepo.getCommentStats();
      expect(stats.rows[0].approved_comments).toBeGreaterThanOrEqual(1);
    });

    test('bulk approves, unapproves, and deletes comments', async () => {
      await commentRepo.bulkApprove([commentId]);
      await commentRepo.bulkUnapprove([commentId]);
      await commentRepo.bulkDelete([commentId]);

      const found = await commentRepo.findParentComment(commentId);
      expect(found.rows.length).toBe(0);
    });
  });

  describe('ActivityLogRepository', () => {
    test('logs activity and retrieves logs', async () => {
      await activityRepo.logActivity({
        action: 'CREATE_POST',
        entityType: 'post',
        entityId: 100,
        entityTitle: 'Test Post',
        details: 'Post created during SQLite tests',
        username: 'admin',
      });

      const logs = await activityRepo.getActivityLogs({ limit: 10 });
      expect(logs.rows.length).toBeGreaterThanOrEqual(1);
      expect(logs.rows[0].action).toBe('CREATE_POST');

      const count = await activityRepo.getActivityLogsCount({});
      expect(count.rows[0].total).toBeGreaterThanOrEqual(1);
    });

    test('saves and retrieves settings with upsert', async () => {
      await activityRepo.saveSettings({ blog_name: 'MBKTech Blog', posts_per_page: '12' });
      const settings = await activityRepo.getSettings();

      const map = Object.fromEntries(settings.rows.map((r) => [r.key, r.value]));
      expect(map.blog_name).toBe('MBKTech Blog');
      expect(map.posts_per_page).toBe('12');

      // Update existing key
      await activityRepo.saveSettings({ blog_name: 'MBKTech Blog Updated' });
      const updatedSettings = await activityRepo.getSettings();
      const updatedMap = Object.fromEntries(updatedSettings.rows.map((r) => [r.key, r.value]));
      expect(updatedMap.blog_name).toBe('MBKTech Blog Updated');
    });

    test('fetches entity counts', async () => {
      const counts = await activityRepo.getEntityCounts();
      expect(typeof counts.posts).toBe('number');
      expect(typeof counts.categories).toBe('number');
      expect(typeof counts.tags).toBe('number');
      expect(typeof counts.comments).toBe('number');
    });
  });
});
