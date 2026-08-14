import request from 'supertest';
import { jest } from '@jest/globals';
import { prisma } from '../src/lib/prisma.js';

import { createApp } from '../src/app.js';

const app = createApp();

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

describe('Health API', () => {
  test('GET /api/health returns service info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('pyknowledge-api');
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('database');
  });
});

describe('Content API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/content/lessons returns curriculum', async () => {
    const mockLessons = {
      version: '1.0.0',
      curriculum: 'CHED Python Programming',
      modules: [
        { id: 'module-1', title: 'Introduction to Python', lessons: [] }
      ]
    };
    
    prisma.contentManifest.findFirst.mockResolvedValue({
      lessonsData: mockLessons
    });

    const res = await request(app).get('/api/content/lessons');
    expect(res.status).toBe(200);
    expect(res.body.modules).toBeDefined();
    expect(Array.isArray(res.body.modules)).toBe(true);
    expect(res.body.modules.length).toBeGreaterThan(0);
  });

  test('GET /api/content/quizzes returns quizzes', async () => {
    const mockQuizzes = {
      version: '1.0.0',
      quizzes: [{ id: 'quiz-1', questions: [] }]
    };
    
    prisma.contentManifest.findFirst.mockResolvedValue({
      quizzesData: mockQuizzes
    });

    const res = await request(app).get('/api/content/quizzes');
    expect(res.status).toBe(200);
    expect(res.body.quizzes).toBeDefined();
  });

  test('GET /api/content/manifest returns meta', async () => {
    prisma.contentManifest.findFirst.mockResolvedValue({
      version: '1.0.0',
      curriculum: 'CHED Python Programming',
      publishedAt: new Date(),
    });

    const res = await request(app).get('/api/content/manifest');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hasContent', true);
  });

  test('GET /api/content/manifest returns empty when no manifest', async () => {
    prisma.contentManifest.findFirst.mockResolvedValue(null);

    const res = await request(app).get('/api/content/manifest');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hasContent', false);
  });
});

describe('Auth API - validation only', () => {
  test('POST /api/auth/login rejects invalid body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  test('GET /api/auth/me requires token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});