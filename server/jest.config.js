export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/server/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
