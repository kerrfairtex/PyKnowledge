/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'core/**/*.js',
    'storage/**/*.js',
    'utils/**/*.js',
    'app/quizzes/quiz-engine.js'
  ]
};
