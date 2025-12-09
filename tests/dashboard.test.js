import server from '../index.js';
import { jest } from '@jest/globals';

// Mocks are loaded from setup.js - this must be imported before dashboard router
import { mockPoolQuery, mockPoolConnect, mockClient } from './setup.js';

import request from 'supertest';
import express from 'express';
import { engine } from 'express-handlebars';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mockPoolQueryResults from './mocks/poolQueryResults.js';
// Use test-specific dashboard routes without mbkauthe import
import dashboardRouter from '../routes/dashboard.js';
// Import the actual pool so we can work with it
import { pool } from '../routes/pool.js';

// Spy on pool methods to intercept real calls
jest.spyOn(pool, 'query');
jest.spyOn(pool, 'connect');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Dashboard Routes', () => {
    console.log('Executing Dashboard Routes tests...');
    let app;

    beforeEach(() => {
        app = express();

        // Setup handlebars
        app.engine('handlebars', engine({
            defaultLayout: 'dashboard',
            helpers: {
                eq: (v1, v2) => v1 === v2,
                formatDate: (date) => new Date(date).toLocaleDateString(),
                // Add missing helpers
                section: function(value, options) {
                    if (value) {
                        return options.fn(this);
                    }
                    return options.inverse(this);
                },
                list: function(items, options) {
                    let result = '';
                    for (let i = 0; i < items.length; i++) {
                        result += options.fn(items[i]);
                    }
                    return result;
                }
            }
        }));
        app.set('view engine', 'handlebars');
        app.set('views', join(__dirname, '../views'));

        // Add middleware
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Set up session mock middleware
        app.use((req, res, next) => {
            req.session = {
                user: {
                    id: 1,
                    username: 'testadmin',
                    UserName: 'testadmin',
                    role: 'SuperAdmin'
                }
            };
            next();
        });

        // Mock res.render to avoid Handlebars issues in tests
        app.use((req, res, next) => {
            const originalRender = res.render;
            res.render = function(view, context, callback) {
                // In tests, just return 200 OK without actually rendering
                // This avoids needing all Handlebars helpers
                return res.status(200).send('OK');
            };
            next();
        });

        // Use the test-specific dashboard router (no auth middleware)
        app.use('/dashboard', dashboardRouter);

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('GET /dashboard', () => {
        it('should render dashboard with statistics', async () => {
            const { dashboard_stats } = mockPoolQueryResults;
            pool.query.mockImplementation((query) => {
                // Normalize query by removing whitespace for matching
                const normalizedQuery = typeof query === 'string' ? query.replace(/\s+/g, ' ').toUpperCase() : '';
                
                if (normalizedQuery.includes('COUNT(*) AS TOTAL_POSTS')) {
                    return Promise.resolve(dashboard_stats.postStats);
                }
                if (normalizedQuery.includes('COUNT(*) AS TOTAL_COMMENTS')) {
                    return Promise.resolve(dashboard_stats.commentStats);
                }
                if (normalizedQuery.includes('STRING_AGG') && normalizedQuery.includes('POST_CATEGORIES')) {
                    return Promise.resolve(dashboard_stats.recentPosts);
                }
                if (normalizedQuery.includes('POST_TITLE') && normalizedQuery.includes('POST_SLUG')) {
                    return Promise.resolve(dashboard_stats.recentComments);
                }
                return Promise.resolve({ rows: [] });
            });

            const response = await request(app).get('/dashboard');
            expect(response.status).toBe(200);
            expect(pool.query).toHaveBeenCalledTimes(4);
        });
    });

    describe('POST /dashboard/api/posts', () => {
        const mockPost = {
            title: 'Test Post',
            content: 'Test Content',
            excerpt: 'Test Excerpt',
            categories: '[1, 2]',
            tags: '["tag1", "tag2"]',
            status: 'draft'
        };

        it('should create a new post successfully', async () => {
            const mockClientQuery = jest.fn((query) => {
                if (query.includes('BEGIN')) {
                    return Promise.resolve();
                }
                if (query.includes('INSERT INTO Posts')) {
                    return Promise.resolve({ rows: [{ id: 1 }] });
                }
                if (query.includes('INSERT INTO Post_Categories')) {
                    return Promise.resolve({ rows: [] });
                }
                if (query.includes('INSERT INTO Tags')) {
                    return Promise.resolve({ rows: [{ id: 1 }] });
                }
                if (query.includes('INSERT INTO Post_Tags')) {
                    return Promise.resolve({ rows: [] });
                }
                if (query.includes('SELECT id FROM Tags')) {
                    return Promise.resolve({ rows: [] });
                }
                if (query.includes('COMMIT')) {
                    return Promise.resolve();
                }
                return Promise.resolve({ rows: [] });
            });

            // Mock the pool.connect method to return a mock client
            pool.connect.mockResolvedValueOnce({
                query: mockClientQuery,
                release: jest.fn()
            });

            const response = await request(app)
                .post('/dashboard/api/posts')
                .send(mockPost);
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, id: 1 });
        });

        it('should return 400 if title or content is missing', async () => {
            const response = await request(app)
                .post('/dashboard/api/posts')
                .send({ title: 'Test Post' }); // Missing content
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message');
        });
    });

    describe('GET /dashboard/posts', () => {
        it('should render posts page with post list', async () => {
            pool.query.mockImplementation((query) => {
                const normalizedQuery = typeof query === 'string' ? query.replace(/\s+/g, ' ').toUpperCase() : '';
                
                if (normalizedQuery.includes('FROM POSTS P')) {
                    return Promise.resolve({
                        rows: [{
                            id: 1,
                            title: 'Test Post',
                            status: 'published',
                            created_at: new Date(),
                            UserName: 'testadmin',
                            categories: 'Test Category'
                        }]
                    });
                }
                return Promise.resolve({
                    rows: [{ total_posts: 1, published_posts: 1, draft_posts: 0, private_posts: 0, total_categories: 1 }]
                });
            });

            const response = await request(app).get('/dashboard/posts');
            expect(response.status).toBe(200);
            expect(pool.query).toHaveBeenCalled();
        });
    });

    describe('Comments API', () => {
        it('should approve a comment', async () => {
            pool.query.mockResolvedValue({ rowCount: 1 });
            const response = await request(app)
                .put('/dashboard/api/comments/1/approve');
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, message: 'Comment approved successfully' });
        });

        it('should delete a comment', async () => {
            pool.query.mockResolvedValue({ rowCount: 1 });
            const response = await request(app)
                .delete('/dashboard/api/comments/1');
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, message: 'Comment deleted successfully' });
        });
    });

    describe('Categories API', () => {
        it('should create a new category', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // Check for existing category
                .mockResolvedValueOnce({ rowCount: 1 }); // Insert new category
            const response = await request(app)
                .post('/dashboard/api/categories')
                .send({ name: 'New Category', description: 'Test Description' });
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, message: 'Category created successfully' });
        });

        it('should not delete category with associated posts', async () => {
            pool.query.mockImplementation((query) => {
                if (query.includes('SELECT COUNT(*)')) {
                    return Promise.resolve({ rows: [{ count: 1 }] });
                }
                return Promise.resolve({ rows: [] });
            });
            
            const response = await request(app)
                .delete('/dashboard/api/categories/1');
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Cannot delete category. It is used by 1 post(s). Please remove the category from all posts first.');
        });
    });

    describe('Markdown Preview', () => {
        it('should convert markdown to HTML', async () => {
            const response = await request(app)
                .post('/dashboard/api/markdown-preview')
                .send({ markdown: '# Test Heading' });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('html');
            expect(response.body.html).toContain('<h1>Test Heading</h1>');
        });

        it('should return 400 if markdown is missing', async () => {
            const response = await request(app)
                .post('/dashboard/api/markdown-preview')
                .send({});
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Markdown content is required');
        });
    });

    describe('Tags API', () => {
        it('should create a new tag', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // Check for existing tag
                .mockResolvedValueOnce({ rowCount: 1 }); // Insert new tag
            const response = await request(app)
                .post('/dashboard/api/tags')
                .send({ name: 'New Tag' });
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, message: 'Tag created successfully' });
        });

        it('should update a tag', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // Check for existing tag
                .mockResolvedValueOnce({ rowCount: 1 }); // Update tag
            const response = await request(app)
                .put('/dashboard/api/tags/1')
                .send({ name: 'Updated Tag' });
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, message: 'Tag updated successfully' });
        });

        it('should delete a tag', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Check post count
                .mockResolvedValueOnce({ rowCount: 1 }); // Delete tag
            const response = await request(app)
                .delete('/dashboard/api/tags/1');
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, message: 'Tag deleted successfully' });
        });
    });

    describe('Unauthorized Access', () => {
    
        it('should return 401 for non-logged-in user accessing dashboard', async () => {
            const response = await request(server).get('/dashboard');
            expect(response.status).toBe(401);
        });

        it('should return 401 for non-logged-in user posting to tags', async () => {
            const response = await request(server).post('/dashboard/tags');
            expect(response.status).toBe(401);
        });
    });
});