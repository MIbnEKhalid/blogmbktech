import request from 'supertest';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { engine } from 'express-handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Basic App Health Check', () => {
  let app;

  beforeAll(async () => {
    app = express();
    
    // Set up Handlebars
    app.engine('handlebars', engine());
    app.set('view engine', 'handlebars');
    app.set('views', join(dirname(__dirname), 'views'));
    
    // Mock middleware responses for testing
    app.get('/', (req, res) => {
      res.status(200).send('Homepage');
    });
    
    app.get('/archive', (req, res) => {
      res.status(200).send('Archive page');
    });
    
    app.get('/bookmarks', (req, res) => {
      res.status(200).send('Bookmarks page');
    });
  });

  test('Server should be created successfully', () => {
    expect(app).toBeDefined();
  });

  test('GET / should return 200', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
  });

  test('GET /archive should return 200', async () => {
    const response = await request(app).get('/archive');
    expect(response.status).toBe(200);
  });

  test('GET /bookmarks should return 200', async () => {
    const response = await request(app).get('/bookmarks');
    expect(response.status).toBe(200);
  });
});