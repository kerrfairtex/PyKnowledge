import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/node_modules/playwright-core');
const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];

function assert(name, cond) {
  results.push({ name, pass: cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}`);
}

// Test 1: Empty picker shows both buttons
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8099/#/login', { waitUntil: 'networkidle' });
  const createBtn = await page.$('#btn-create-profile');
  const guestBtn = await page.$('#btn-guest');
  const downloadBtn = await page.$('#authDownloadButton');
  assert('Empty picker: CREATE PROFILE visible', createBtn !== null);
  assert('Empty picker: CONTINUE AS GUEST visible', guestBtn !== null);
  assert('Empty picker: DOWNLOAD APP visible', downloadBtn !== null);
  await ctx.close();
}

// Test 2: Create profile flow
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8099/#/login', { waitUntil: 'networkidle' });
  await page.click('#btn-create-profile');
  await page.waitForTimeout(300);
  // Step 1: name
  const nameInput = await page.$('#reg-name');
  const nextBtn = await page.$('#reg-next');
  assert('Step 1: name input visible', nameInput !== null);
  assert('Step 1: NEXT button visible', nextBtn !== null);
  await page.fill('#reg-name', 'Test User');
  await page.fill('#reg-name', 'Test User');
  await page.click('#reg-next');
  await page.waitForTimeout(300);
  // Step 2: set PIN
  const pinInput = await page.$('#reg-pin');
  const enterBtn = await page.$('.os-key-enter');
  assert('Step 2: PIN input visible', pinInput !== null);
  assert('Step 2: ENTER button visible', enterBtn !== null);
  assert('Step 2: ENTER disabled initially', await enterBtn.evaluate(el => el.disabled));
  await page.click('.os-key[data-key="1"]');
  await page.click('.os-key[data-key="2"]');
  await page.click('.os-key[data-key="3"]');
  await page.click('.os-key[data-key="4"]');
  assert('Step 2: ENTER enabled after 4 digits', await enterBtn.evaluate(el => !el.disabled));
  await page.click('.os-key-enter');
  await page.waitForTimeout(300);
  // Step 3: confirm PIN
  const confirmInput = await page.$('#reg-pin-confirm');
  assert('Step 3: confirm PIN input visible', confirmInput !== null);
  await page.click('.os-key[data-key="1"]');
  await page.click('.os-key[data-key="2"]');
  await page.click('.os-key[data-key="3"]');
  await page.click('.os-key[data-key="4"]');
  await page.click('.os-key-enter');
  await page.waitForTimeout(1000);
  assert('Create: redirected to dashboard', (await page.evaluate(() => location.hash)) === '#/dashboard');
  await ctx.close();
}

// Test 3: PIN via keyboard
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8099/#/login', { waitUntil: 'networkidle' });
  // Click first profile
  const profiles = await page.$$('.profile-card');
  if (profiles.length > 0) {
    await profiles[0].click();
    await page.waitForTimeout(500);
    // Type PIN via keyboard
    await page.keyboard.type('1234');
    await page.click('.os-key-enter');
    await page.waitForTimeout(1000);
    assert('PIN via keyboard: redirected to dashboard', (await page.evaluate(() => location.hash)) === '#/dashboard');
  }
  await ctx.close();
}

// Test 4: Wrong PIN
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8099/#/login', { waitUntil: 'networkidle' });
  const profiles = await page.$$('.profile-card');
  if (profiles.length > 0) {
    await profiles[0].click();
    await page.waitForTimeout(500);
    await page.click('.os-key[data-key="9"]');
    await page.click('.os-key[data-key="9"]');
    await page.click('.os-key[data-key="9"]');
    await page.click('.os-key[data-key="9"]');
    await page.click('.os-key-enter');
    await page.waitForTimeout(500);
    const denied = await page.textContent('#authError');
    assert('Wrong PIN: ACCESS DENIED shown', denied && denied.includes('ACCESS DENIED'));
  }
  await ctx.close();
}

// Test 5: Guest works
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8099/#/login', { waitUntil: 'networkidle' });
  await page.click('#btn-guest');
  await page.waitForTimeout(1000);
  assert('Guest: redirected to dashboard', (await page.evaluate(() => location.hash)) === '#/dashboard');
  await ctx.close();
}

// Test 6: Primary button visible without scrolling
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8099/#/login', { waitUntil: 'networkidle' });
  await page.click('#btn-create-profile');
  await page.waitForTimeout(300);
  const nextBtn = await page.$('#reg-next');
  const nextBtnBottom = await nextBtn.evaluate(el => el.getBoundingClientRect().bottom);
  assert('Step 1: NEXT button bottom < viewport height', nextBtnBottom < 640);
  await page.fill('#reg-name', 'Test User');
  await page.click('#reg-next');
  await page.waitForTimeout(300);
  const enterBtn = await page.$('.os-key-enter');
  const enterBtnBottom = await enterBtn.evaluate(el => el.getBoundingClientRect().bottom);
  assert('Step 2: ENTER button bottom < viewport height', enterBtnBottom < 640);
  await ctx.close();
}

// Test 7: OS keyboard never requested on PIN steps
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8099/#/login', { waitUntil: 'networkidle' });
  await page.click('#btn-create-profile');
  await page.waitForTimeout(300);
  await page.fill('#reg-name', 'Test User');
  await page.click('#reg-next');
  await page.waitForTimeout(300);
  const pinInput = await page.$('#reg-pin');
  const isReadonly = await pinInput.evaluate(el => el.readOnly);
  const inputMode = await pinInput.evaluate(el => el.inputMode);
  const activeElement = await page.evaluate(() => document.activeElement.tagName);
  assert('PIN input: readonly', isReadonly);
  assert('PIN input: inputmode none', inputMode === 'none');
  assert('PIN input: not focused (no OS keyboard)', activeElement !== 'INPUT');
  await ctx.close();
}

console.log('\n=== Summary ===');
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
console.log(`${passed} passed, ${failed} failed`);
console.log('Console errors:', errors.length === 0 ? 'NONE' : errors.join('; '));

await browser.close();
