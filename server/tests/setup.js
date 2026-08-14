import { prisma } from '../src/lib/prisma.js';
import { jest } from '@jest/globals';

// Mock the entire auth service to avoid bcrypt issues - MUST be before app import
jest.unstable_mockModule('../src/services/auth.js', () => ({
  registerUser: jest.fn().mockImplementation(async ({ email, displayName }) => ({
    user: {
      id: 'user-1',
      email,
      displayName,
      role: 'STUDENT',
      institutionId: 'inst-1',
      createdAt: new Date(),
      institution: { id: 'inst-1', name: 'TRAC', region: 'BARMM' }
    },
    token: 'mock-jwt-token'
  })),
  loginUser: jest.fn().mockImplementation(async ({ email }) => ({
    user: {
      id: 'user-1',
      email,
      displayName: 'Test Student',
      role: 'STUDENT',
      institutionId: 'inst-1',
      createdAt: new Date(),
      institution: { id: 'inst-1', name: 'TRAC', region: 'BARMM' }
    },
    token: 'mock-jwt-token'
  })),
  verifyToken: jest.fn().mockImplementation(() => ({ sub: 'user-1' })),
  getUserById: jest.fn().mockResolvedValue({
    id: 'user-1',
    email: 'test@trac.edu.ph',
    displayName: 'Test Student',
    role: 'STUDENT',
    institutionId: 'inst-1',
    createdAt: new Date(),
    institution: { id: 'inst-1', name: 'TRAC', region: 'BARMM' }
  }),
  signToken: jest.fn().mockReturnValue('mock-jwt-token'),
}));

import { createApp } from '../src/app.js';

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

let app;
let dbReady = false;

beforeAll(async () => {
  app = createApp();
  dbReady = true;
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { app, dbReady, prisma };