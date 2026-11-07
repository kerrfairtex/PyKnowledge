import { readFileSync } from 'fs';

describe('START button (regression)', () => {
  const src = readFileSync('app/dashboard/dashboard.js', 'utf8');
  const fn = src.slice(src.indexOf('function primaryContinueButton'), src.indexOf('// ---- Greeting'));

  it('renders START/CONTINUE label without escaped template literal', () => {
    expect(fn).not.toContain('\\${');
    expect(fn).toContain("done > 0 ? 'CONTINUE' : 'START'");
    expect(fn).toContain('${escapeHtml(lessonLabel)}');
  });

  it('button text matches /^(START|CONTINUE): /', () => {
    expect(fn).toContain("'START'");
    expect(fn).toContain("'CONTINUE'");
  });
});
