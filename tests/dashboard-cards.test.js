import { readFileSync } from 'fs';

describe('dashboard cards visibility (regression)', () => {
  it('dashboard OL must not have stagger-children class', () => {
    const src = readFileSync('app/dashboard/dashboard.js', 'utf8');
    expect(src).not.toContain('stagger-children');
    expect(src).toContain('<ol class="dash-list">');
  });

  it('Continue/Start button must be present in rendered HTML', () => {
    const src = readFileSync('app/dashboard/dashboard.js', 'utf8');
    expect(src).toContain('dash-card-btn');
    expect(src).toContain('Start module');
  });
});

describe('user menu dialog (regression)', () => {
  it('navbar renders a dialog element not a hidden div', () => {
    const src = readFileSync('ui/components/navbar.js', 'utf8');
    expect(src).toContain('<dialog class="nav-dialog" id="user-menu-dialog"');
    expect(src).not.toContain('user-menu-dropdown');
  });
});

describe('dashboard primary button (spec step 7)', () => {
  const src = readFileSync('app/dashboard/dashboard.js', 'utf8');
  const renderFn = src.slice(src.indexOf('export async function renderDashboard'), src.indexOf('if (flash) {'));

  it('renders primary button before module list', () => {
    const btnIdx = renderFn.indexOf('primaryContinueButton');
    const listIdx = renderFn.indexOf('<ol class="dash-list">');
    expect(btnIdx).toBeGreaterThan(-1);
    expect(listIdx).toBeGreaterThan(-1);
    expect(btnIdx).toBeLessThan(listIdx);
  });

  it('shows START for new users', () => {
    const fn = src.slice(src.indexOf('function primaryContinueButton'), src.indexOf('// ---- Greeting'));
    expect(fn).toContain("done > 0 ? 'CONTINUE' : 'START'");
    expect(fn).toContain('Start module');
  });
});
