import request from 'supertest';
import { app, dbReady } from './setup.js';

function dbTest(name, fn) {
  test(name, async () => {
    if (!dbReady) {
      console.warn(`Skipping (no DB): ${name}`);
      return;
    }
    await fn();
  });
}

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
  dbTest('GET /api/content/lessons returns curriculum', async () => {
    const res = await request(app).get('/api/content/lessons');
    expect(res.status).toBe(200);
    expect(res.body.modules).toBeDefined();
    expect(Array.isArray(res.body.modules)).toBe(true);
    expect(res.body.modules.length).toBeGreaterThan(0);
  });

  dbTest('GET /api/content/quizzes returns quizzes', async () => {
    const res = await request(app).get('/api/content/quizzes');
    expect(res.status).toBe(200);
    expect(res.body.quizzes).toBeDefined();
  });

  test('GET /api/content/manifest returns meta', async () => {
    const res = await request(app).get('/api/content/manifest');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hasContent');
  });
});

describe('Auth API', () => {
  dbTest('POST /api/auth/register and login', async () => {
    const email = `test-${Date.now()}@trac.edu.ph`;

    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', displayName: 'Test Student' });

    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();
    expect(reg.body.user.email).toBe(email);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password123' });

    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(me.status).toBe(200);
    expect(me.body.user.displayName).toBe('Test Student');
  });

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
