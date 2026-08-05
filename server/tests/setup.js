import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

let app;
let dbReady = false;

beforeAll(async () => {
  app = createApp();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbReady = true;
  } catch {
    dbReady = false;
    console.warn('Database not available — skipping integration tests');
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { app, dbReady };
