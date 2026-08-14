import { getApiBaseUrl, isApiEnabled } from '../core/api.js';

describe('api client', () => {
  const originalWindow = global.window;

  afterEach(() => {
    global.window = originalWindow;
  });

  test('isApiEnabled returns false when URL not set', () => {
    global.window = { PYKNOWLEDGE_API_URL: '' };
    expect(isApiEnabled()).toBe(false);
  });

  test('isApiEnabled returns true when URL configured', () => {
    global.window = { PYKNOWLEDGE_API_URL: 'http://localhost:3000' };
    expect(isApiEnabled()).toBe(true);
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });

  test('getApiBaseUrl strips trailing slash', () => {
    global.window = { PYKNOWLEDGE_API_URL: 'http://localhost:3000/' };
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });
});
