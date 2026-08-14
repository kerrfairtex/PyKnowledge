export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@prisma/client$': '<rootDir>/tests/__mocks__/@prisma/client.js'
  },
  testMatch: ['**/server/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/']
};