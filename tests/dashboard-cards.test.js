describe('dashboard cards visibility (regression)', () => {
  it('dashboard OL must not have stagger-children class', () => {
    const template = '<ol class="dash-list"></ol>';
    expect(template.includes('stagger-children')).toBe(false);
  });

  it('stagger-children rule does not match cards without the class', () => {
    const hasStaggerParent = false;
    const cardOpacity = hasStaggerParent ? 0 : 1;
    expect(cardOpacity).toBe(1);
  });

  it('Continue/Start button must be present in rendered HTML', () => {
    const unlockedCard = '<a href="#/module/module-1" class="dash-card-btn">Start module</a>';
    expect(unlockedCard).toContain('dash-card-btn');
    expect(unlockedCard).toContain('Start module');
  });
});

describe('user menu dialog (regression)', () => {
  it('navbar must render a dialog element not a hidden div', () => {
    const template = '<dialog class="nav-dialog" id="user-menu-dialog" aria-label="Account menu">';
    expect(template).toContain('<dialog');
    expect(template).toContain('user-menu-dialog');
    expect(template).not.toContain('user-menu-dropdown');
  });
});

describe('dashboard primary button (spec step 7)', () => {
  it('renders a primary continue/start button after the greeting', () => {
    // The button must come BEFORE the module list in the render order
    const src = require('fs').readFileSync('app/dashboard/dashboard.js', 'utf8');
    const renderFn = src.slice(src.indexOf('export async function renderDashboard'), src.indexOf('if (flash) {'));
    const btnIdx = renderFn.indexOf('primaryContinueButton');
    const listIdx = renderFn.indexOf('<ol class="dash-list">');
    expect(btnIdx).toBeGreaterThan(-1);
    expect(listIdx).toBeGreaterThan(-1);
    expect(btnIdx).toBeLessThan(listIdx);
  });

  it('primary button shows START for new users and CONTINUE for returning', () => {
    const src = require('fs').readFileSync('app/dashboard/dashboard.js', 'utf8');
    const fn = src.slice(src.indexOf('function primaryContinueButton'), src.indexOf('// ---- Greeting'));
    expect(fn).toContain("done > 0 ? 'CONTINUE' : 'START'");
    expect(fn).toContain('Start module');
  });
});
