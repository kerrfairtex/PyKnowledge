#!/usr/bin/env node
/**
 * Repaired E2E harness for PyKnowledge — full module 1 journey.
 *
 * Rules followed (authoritative):
 *  - A step is PASS only if the script ran it and checked the result on
 *    screen or in storage. Anything else is NOT RUN. Never infer a pass
 *    from reading code.
 *  - Prints a final table of every step (PASS / FAIL / NOT RUN) and writes
 *    the same table to /tmp/e2e/results.json. Exits non-zero if any step is
 *    FAIL or NOT RUN.
 *  - Do NOT edit app files. Only scripts/e2e-journey.mjs and helpers under
 *    scripts/e2e/ are touched. If an app bug exists, stop and report it with
 *    evidence instead of working around it.
 *
 * Steps: app loads, sign up, sign out, sign in with same PIN, greeting,
 * signed in as created profile, lesson-1-1 exercise alone does NOT complete
 * lesson, quiz 1-1 fail (4/6 -> 67%), quiz 1-1 pass (5/6 -> 83%) Continue ->
 * lesson 1-2 opens, quiz 1-2 fail+pass -> Continue -> lesson 1-3 opens,
 * quiz 1-3 pass -> module 2 unlocked + Continue href === #/lesson/lesson-2-1
 * -> lesson 2-1 opens, dashboard module 1 3 of 3 + primary -> lesson 2-1,
 * negative check fresh profile -> lesson-1-3 locked page.
 *
 * Usage:
    });
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { mkdirSync, writeFileSync, existsSync, rmSync } = require('fs');
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const REPO_DIR = '/data/data/com.termux/files/home/PyKnowledge';
const SCREEN_DIR = '/tmp/e2e';
const RESULTS_FILE = '/tmp/e2e/results.json';
const USER_DATA_DIR = `/tmp/e2e-user-data-${Date.now()}`;

const PIN = '1234';
const NAME = 'E2E Student';
const NEG_NAME = 'Negative Student';
const NEG_PIN = '0000';
let BASE_URL = null;

let browser = null;
let serverProc = null;
let port = null;
let page = null;

// ---------------------------------------------------------------------------
// Results tracking — each step exactly once, final status wins.
// ---------------------------------------------------------------------------
const results = {};
const stepOrder = [];
let stepNo = 0;
let halted = false;

function record(name, status, err) {
  if (!(name in results)) {
    results[name] = { name, status, error: err || null };
    stepOrder.push(name);
  } else {
    results[name].status = status;
    results[name].error = err || null;
  }
  const tag = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'NOT RUN';
  console.log(`${tag}: ${name}` + (err ? `  — ${err.message}` : ''));
}

async function screenshot(page, name) {
  try {
    mkdirSync(SCREEN_DIR, { recursive: true });
    await page.screenshot({ path: `${SCREEN_DIR}/${name}.png`, fullPage: true });
  } catch (e) {
    // best effort only
  }
}

async function step(name, fn) {
  if (halted) {
    record(name, 'NOT RUN');
    return;
  }
  stepNo += 1;
  const nn = String(stepNo).padStart(2, '0');
  try {
    await fn();
    await screenshot(page, `${nn}-${name}`);
    record(name, 'PASS');
  } catch (e) {
    halted = true;
    await screenshot(page, `${nn}-${name}`).catch(() => {});
    record(name, 'FAIL', e);
  }
}

// ---------------------------------------------------------------------------
// Browser helpers
// ---------------------------------------------------------------------------
async function waitEl(page, selector, timeout = 8000) {
  try {
    return await page.waitForSelector(selector, { timeout, state: 'visible' });
  } catch (e) {
    return null;
  }
}

async function clickEl(page, selector, timeout = 8000) {
  const el = await waitEl(page, selector, timeout);
  if (!el) return false;
  const vis = await el.isVisible().catch(() => false);
  const dis = await el.isDisabled().catch(() => true);
  if (vis && !dis) {
    await el.click();
    return true;
  }
  return false;
}

async function enterPinKeypad(page, pin) {
  for (const digit of String(pin)) {
    const key = await page.$(`.os-key[data-key="${digit}"]`);
    if (!key) throw new Error(`keypad key ${digit} not found`);
    await key.click();
    await page.waitForTimeout(200);
  }
}

async function waitForHash(page, fragment, timeout = 8000) {
  try {
    await page.waitForFunction(
      (frag) => window.location.hash === frag || window.location.hash.startsWith(frag + '/'),
      { timeout },
      (arg) => frag
    );
    return true;
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
async function signUp(page, name, pin) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const skip = await page.$('#osBootlogSkip');
  if (skip) {
    try { await skip.click(); await page.waitForTimeout(300); } catch { /* ignore */ }
  }
  const openApp = await page.$('a.btn-cta-small[href="#/login"]');
  if (!openApp) throw new Error('Open the app link not found on landing');
  await openApp.click();
  await waitForHash(page, '#/login');
  // The SPA engine loads asynchronously (showApp() doesn't await loadEngine()).
  // Wait for the auth screen's Create Profile button to actually render.
  const createBtn = await waitEl(page, '#btn-create-profile', 10000)
    || await waitEl(page, '#btn-add-profile', 10000);
  if (!createBtn) throw new Error('Create/Add Profile button not found');
  await createBtn.click();
  await page.waitForTimeout(500);
  const nameInput = await waitEl(page, '#reg-name', 5000);
  if (!nameInput) throw new Error('Name input not found');
  await nameInput.fill(name);
  await clickEl(page, '#reg-next', 5000);
  await page.waitForTimeout(500);
  await enterPinKeypad(page, pin);
  await clickEl(page, '.os-key-enter', 5000);
  await page.waitForTimeout(500);
  await enterPinKeypad(page, pin);
  await clickEl(page, '.os-key-enter', 5000);
  await page.waitForTimeout(4000);
  if (!page.url().includes('/dashboard')) {
    throw new Error(`signUp did not reach dashboard, url=${page.url()}`);
  }
}

async function signOut(page) {
  const menu = await page.$('#btn-user-menu');
  if (!menu) throw new Error('User menu button #btn-user-menu not found');
  await menu.click();
  await page.waitForTimeout(500);
  const logout = await page.$('#btn-logout');
  if (!logout) throw new Error('Sign out button #btn-logout not found in dialog');
  await logout.click();
  await page.waitForTimeout(1000);
  await page.waitForTimeout(1000);
  const atLogin = page.url().includes('/login')
    || (await page.$('#btn-create-profile') !== null)
    || (await page.$('.profile-card[data-user-id]') !== null);
  if (!atLogin) throw new Error(`signOut did not return to login, url=${page.url()}`);
}

async function signIn(page, name, pin) {
  await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const profileCard = await page.$('.profile-card[data-user-id]');
  if (!profileCard) throw new Error('Profile card not found on picker');
  await profileCard.click();
  await page.waitForTimeout(500);
  const pinInput = await waitEl(page, '#pin-input', 5000);
  if (!pinInput) throw new Error('PIN input not found');
  await enterPinKeypad(page, pin);
  await clickEl(page, '.os-key-enter', 5000);
  await page.waitForTimeout(4000);
  if (!page.url().includes('/dashboard')) {
    throw new Error(`signIn did not reach dashboard, url=${page.url()}`);
  }
}

async function getProgress(page) {
  return await page.evaluate(() => {
    try {
      const profiles = JSON.parse(localStorage.getItem('pyknowledge_profiles') || '[]');
      if (profiles.length === 0) return { completedLessons: [], unlockedModules: ['module-1'] };
      const profile = profiles[profiles.length - 1];
      const key = `pyknowledge_progress_${profile.id}`;
      const raw = localStorage.getItem(key);
      if (!raw) {
        // initStorage() hasn't written this profile's record yet (no quiz taken).
        // That itself means nothing is complete — return empty progress.
        return { completedLessons: [], unlockedModules: ['module-1'] };
      }
      return JSON.parse(raw);
    } catch (e) {
      return { _error: String(e) };
    }
  });
}

async function greetingName(page) {
  const el = await waitEl(page, '#dash-greeting', 5000);
  if (!el) throw new Error('#dash-greeting not found');
  return await el.innerText();
}

async function signedInAsCreatedProfile(page) {
  const info = await page.evaluate((name) => {
    const profiles = JSON.parse(localStorage.getItem('pyknowledge_profiles') || '[]');
    const profile = profiles.find((p) => p.displayName === name);
    const sessionRaw = sessionStorage.getItem('pyknowledge_session');
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    return {
      profileFound: !!profile,
      profileId: profile ? profile.id : null,
      profileDisplayName: profile ? profile.displayName : null,
      isGuest: profile ? !!profile.isGuest : null,
      sessionUserId: session ? session.userId : null,
      sessionLastActive: session ? session.lastActive : null,
    };
  }, NAME);
  if (!info.profileFound) throw new Error(`Profile "${NAME}" not found in pyknowledge_profiles`);
  if (info.isGuest) throw new Error('Active user is a guest, not a created profile');
  if (info.sessionUserId !== info.profileId) {
    throw new Error(`Session userId ${info.sessionUserId} != profile id ${info.profileId}`);
  }
  if (!info.sessionLastActive) throw new Error('Session has no lastActive timestamp');
}

// ---------------------------------------------------------------------------
// Quiz helper: answerQuiz(page, lessonId, { correct })
//
// Reads content/quizzes.json as the answer key (never guesses).
// The app does NOT shuffle options: MC options render in array order with
// value="${index}", correctAnswer is the option index. TF uses
// value="true"/"false". FB uses a text input.
// Answers exactly `correct` questions correctly (first `correct` questions),
// the rest incorrectly, submits, verifies the score shown on screen matches
// Math.round(correct/total*100) against the 70% pass mark, and verifies
// stored progress (lesson complete only on pass).
// ---------------------------------------------------------------------------
async function answerQuiz(page, lessonId, { correct }) {
  const quizzesPath = path.join(REPO_DIR, 'content/quizzes.json');
  const quizzes = JSON.parse(fs.readFileSync(quizzesPath, 'utf8'));
  const quiz = quizzes.quizzes.find((q) => q.lessonId === lessonId);
  if (!quiz) throw new Error(`No quiz found for lesson ${lessonId} in content/quizzes.json`);

  const total = quiz.questions.length;
  const expectedScore = Math.round((correct / total) * 100);
  const expectedPassed = expectedScore >= 70;

  await page.evaluate(() => { window.location.hash = '#/dashboard'; });
  await page.waitForTimeout(300);
  await page.evaluate((lid) => { window.location.hash = `#/quiz/${lid}`; }, lessonId);
  await page.waitForTimeout(1000);

  const quizIntro = await waitEl(page, '#quiz-start-btn', 5000);
  const quizContainer = await waitEl(page, '.os-quiz', 5000);
  if (!quizIntro && !quizContainer) {
    throw new Error(`Quiz did not load for ${lessonId}`);
  }
  if (quizIntro) {
    await quizIntro.click();
    await page.waitForTimeout(500);
  }

  for (let i = 0; i < total; i++) {
    const q = quiz.questions[i];
    const shouldBeCorrect = i < correct;

    if (q.type === 'multiple-choice') {
      const targetIndex = shouldBeCorrect ? q.correctAnswer : (q.correctAnswer + 1) % q.options.length;
      const selector = `input[name="q${i}"][value="${targetIndex}"]`;
      const el = await waitEl(page, selector, 5000);
      if (!el) throw new Error(`MC option index ${targetIndex} not found for Q${i + 1} (${q.question})`);
      await el.click();
    } else if (q.type === 'true-false') {
      const targetValue = shouldBeCorrect ? String(q.correctAnswer) : String(!q.correctAnswer);
      const selector = `input[name="q${i}"][value="${targetValue}"]`;
      const el = await waitEl(page, selector, 5000);
      if (!el) throw new Error(`TF option ${targetValue} not found for Q${i + 1} (${q.question})`);
      await el.click();
    } else if (q.type === 'fill-blank') {
      const input = await waitEl(page, `input[name="q${i}"]`, 5000);
      if (!input) throw new Error(`Fill-blank input not found for Q${i + 1} (${q.question})`);
      const value = shouldBeCorrect ? String(q.correctAnswer[0]) : 'definitely-wrong-answer-xyz';
      await input.fill(value);
    } else {
      throw new Error(`Unsupported question type ${q.type} for Q${i + 1}`);
    }

    const isLast = i === total - 1;
    const nextBtn = await waitEl(page, '#quiz-next', 5000);
    if (!nextBtn) throw new Error(`Next/Submit button not found after Q${i + 1}`);
    await nextBtn.click();
    await page.waitForTimeout(500);
  }

  const resultsEl = await waitEl(page, '#quiz-results', 5000);
  if (!resultsEl) throw new Error('Quiz results screen not shown after submit');
  const resultText = await resultsEl.innerText();

  const scoreMatch = resultText.match(/(\d+)%/);
  const shownScore = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
  if (shownScore !== expectedScore) {
    throw new Error(`Expected score ${expectedScore}%, screen shows ${shownScore}%. Text: ${resultText}`);
  }

  if (expectedPassed) {
    if (!resultText.includes('Passed!')) {
      throw new Error(`Expected pass screen, got: ${resultText}`);
    }
  } else {
    if (!resultText.includes('[FAIL]')) {
      throw new Error(`Expected fail screen, got: ${resultText}`);
    }
    const retryBtn = await page.$('#quiz-retry');
    if (!retryBtn) throw new Error('Retry Quiz button not found on fail screen');
    const reviewLink = await page.$('a.btn-secondary[href*="/lesson/"]');
    if (!reviewLink) throw new Error('Review Lesson link not found on fail screen');
  }

  const progress = await page.evaluate(() => {
    try {
      const profiles = JSON.parse(localStorage.getItem('pyknowledge_profiles') || '[]');
      const profile = profiles[profiles.length - 1];
      const key = `pyknowledge_progress_${profile.id}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return { _error: String(e) };
    }
  });
  const isComplete = progress && Array.isArray(progress.completedLessons)
    && progress.completedLessons.includes(lessonId);
  if (expectedPassed && !isComplete) {
    throw new Error(`Expected lesson ${lessonId} to be complete in storage, but it is not`);
  }
  if (!expectedPassed && isComplete) {
    throw new Error(`Expected lesson ${lessonId} to NOT be complete in storage, but it is`);
  }

  // Extract Continue href if present (pass screen only).
  let continueHref = null;
  const continueLink = await page.$('a.btn-primary[href^="#/lesson/"]');
  if (continueLink) {
    continueHref = await continueLink.getAttribute('href');
  }

  return { lessonId, correct, total, score: expectedScore, passed: expectedPassed, continueHref, resultText };
}

// ---------------------------------------------------------------------------
// Lesson helper: run write-code exercise and confirm lesson NOT completed.
// ---------------------------------------------------------------------------
async function runExerciseAndConfirmNotComplete(page, lessonId) {
  await page.evaluate(() => { window.location.hash = '#/dashboard'; });
  await page.waitForTimeout(300);
  await page.evaluate((lid) => { window.location.hash = `#/lesson/${lid}`; }, lessonId);
  await page.waitForTimeout(1000);

  // Confirm lesson loaded and not locked.
  const locked = await page.$('h2');
  if (locked) {
    const lockedText = await locked.innerText();
    if (lockedText === 'Lesson Locked') {
      throw new Error(`Lesson ${lessonId} is locked — unexpected`);
    }
  }

  // Find the write_code exercise card.
  const exCard = await page.$('#exercise-ex-1-1-b');
  if (!exCard) throw new Error(`Write-code exercise ex-1-1-b not found on lesson ${lessonId}`);

  // Fill the code editor textarea and click Run.
  const textarea = await exCard.$('.code-editor-textarea');
  if (!textarea) throw new Error('Code editor textarea not found in write-code exercise');
  await textarea.fill("print('Maria')");
  await page.waitForTimeout(200);
  const runBtn = await exCard.$('.code-run-btn');
  if (!runBtn) throw new Error('Run button not found in write-code exercise');
  await runBtn.click();
  await page.waitForTimeout(1500);

  // Confirm footer still shows "Take Quiz" (not complete).
  const takeQuiz = await page.$('a[data-take-quiz]');
  if (!takeQuiz) throw new Error('Take Quiz link not found — lesson may be incorrectly marked complete');
  const takeQuizText = await takeQuiz.innerText();
  if (takeQuizText.trim() !== 'Take Quiz') {
    throw new Error(`Expected "Take Quiz", got "${takeQuizText}"`);
  }

  // Confirm hint naming the quiz exists.
  const hint = await page.$('.os-hint');
  if (!hint) throw new Error('Quiz hint (.os-hint) not found in footer');
  const hintText = await hint.innerText();
  if (!hintText.includes('quiz')) {
    throw new Error(`Hint does not name the quiz: ${hintText}`);
  }

  // Confirm Next Lesson is disabled.
  const disabledNext = await page.$('button[disabled]');
  if (!disabledNext) throw new Error('Next Lesson button not disabled — exercise alone completed the lesson');
  const nextText = await disabledNext.innerText();
  if (!nextText.includes('Next Lesson')) {
    throw new Error(`Disabled button is not Next Lesson: ${nextText}`);
  }

  // Confirm lesson NOT in stored progress.
  const progress = await getProgress(page);
  if (!progress || !Array.isArray(progress.completedLessons)) {
    throw new Error('Could not read stored progress');
  }
  if (progress.completedLessons.includes(lessonId)) {
    throw new Error(`Lesson ${lessonId} is marked complete in storage after only running an exercise`);
  }
}

// ---------------------------------------------------------------------------
// Click Continue link on quiz result screen and confirm target lesson opens.
// ---------------------------------------------------------------------------
async function clickContinueAndConfirmLessonOpens(page, expectedLessonId) {
  const continueLink = await page.$('a.btn-primary[href^="#/lesson/"]');
  if (!continueLink) throw new Error('Continue link not found on quiz pass screen');
  const href = await continueLink.getAttribute('href');
  const expectedHref = `#/lesson/${expectedLessonId}`;
  if (href !== expectedHref) {
    throw new Error(`Continue href is ${href}, expected ${expectedHref}`);
  }
  await continueLink.click();
  await page.waitForTimeout(1000);

  // Confirm target lesson opened (not locked).
  const lockedH2 = await page.$('h2');
  let lockedText = null;
  if (lockedH2) {
    lockedText = await lockedH2.innerText();
  }
  if (lockedText === 'Lesson Locked') {
    throw new Error(`Lesson ${expectedLessonId} is locked — Continue led to a locked page`);
  }

  // Confirm the lesson content is present (has a heading).
  const lessonHeading = await page.$('h2');
  if (!lessonHeading) throw new Error(`Lesson ${expectedLessonId} did not render any content`);
  return href;
}

// ---------------------------------------------------------------------------
// Negative check: fresh profile, open lesson-1-3 directly, record lock page.
// ---------------------------------------------------------------------------
async function negativeCheckLockedLesson(page) {
  await page.evaluate(() => { window.location.hash = '#/dashboard'; });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.location.hash = '#/lesson/lesson-1-3'; });
  // Wait for the Lesson Locked page to render (router + renderLessonViewer are async).
  // Wait specifically for the lock page's error card so we don't match stale
  // dashboard h2s ("Nine modules, in order" / "This course, by the numbers").
  const errorCard = await waitEl(page, '#main-content .error-card', 10000);
  if (!errorCard) throw new Error('Lock page error card not found on direct lesson-1-3 navigation');

  const lockedH2 = await errorCard.$('h2');
  if (!lockedH2) throw new Error('No h2 found in lock page error card');
  const h2Text = await lockedH2.innerText();
  if (h2Text !== 'Lesson Locked') {
    throw new Error(`Expected "Lesson Locked", got "${h2Text}"`);
  }

  const lockP = await errorCard.$('p');
  if (!lockP) throw new Error('Lock page explanation paragraph not found');
  const lockText = await lockP.innerText();

  const backLink = await errorCard.$('a.btn-secondary[href="#/module/module-1"]');
  if (!backLink) throw new Error('Back to Module link to #/module/module-1 not found on lock page');

  const quizLink = await errorCard.$('a.btn-primary[data-take-quiz]');
  if (!quizLink) throw new Error('Quiz link not found on lock page');
  const quizHref = await quizLink.getAttribute('href');

  const lessonLink = await errorCard.$('a.btn-ghost[href^="#/lesson/"]');
  if (!lessonLink) throw new Error('Lesson link not found on lock page');
  const lessonHref = await lessonLink.getAttribute('href');

  return {
    h2Text,
    lockText,
    backLinkHref: await backLink.getAttribute('href'),
    quizHref,
    lessonHref,
  };
}

// ---------------------------------------------------------------------------
// Static file server (self-contained)
// ---------------------------------------------------------------------------
function findFreePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

function mimeType(file) {
  const ext = path.extname(file).toLowerCase();
  const map = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.mjs': 'application/javascript', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
    '.ttf': 'font/ttf', '.txt': 'text/plain',
  };
  return map[ext] || 'application/octet-stream';
}

function startStaticServer(dir, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(dir, req.url === '/' ? '/index.html' : req.url);
      const resolved = path.resolve(filePath);
      const dirResolved = path.resolve(dir);
      if (!resolved.startsWith(dirResolved + path.sep) && resolved !== dirResolved) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      fs.readFile(resolved, (err, content) => {
        if (err) {
          if (err.code === 'ENOENT') {
            fs.readFile(path.join(dirResolved, 'index.html'), (err2, idx) => {
              if (err2) { res.writeHead(404); res.end('Not found'); return; }
              res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(idx);
            });
          } else {
            res.writeHead(500); res.end('Server error');
          }
          return;
        }
        res.writeHead(200, { 'Content-Type': mimeType(resolved) });
        res.end(content);
      });
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

async function waitForServer(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) return;
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server on port ${port} did not become ready`);
}

// ---------------------------------------------------------------------------
// Chromium launch
// ---------------------------------------------------------------------------
async function launchChromium(userDataDir) {
  const { chromium } = require('/tmp/node_modules/playwright-core');
  const args = ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'];
  try {
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      viewport: { width: 1280, height: 720 },
      args,
    });
    return context;
  } catch (e) {
    console.log(`Chromium launch FAILED with flags: ${args.join(' ')}`);
    console.log(`Error: ${e.message}`);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  try {
    port = await findFreePort();
    BASE_URL = `http://127.0.0.1:${port}`;

    serverProc = await startStaticServer(REPO_DIR, port);
    await waitForServer(port);
    console.log(`Static server on ${BASE_URL}`);

    mkdirSync(SCREEN_DIR, { recursive: true });
    rmSync(USER_DATA_DIR, { recursive: true, force: true });

    const context = await launchChromium(USER_DATA_DIR);
    page = context.pages()[0] || await context.newPage();
    browser = context;

    const stepNames = [
      'app loads',
      'sign up',
      'sign out',
      'sign in with the same PIN',
      'greeting shows the name',
      'signed in as the created profile',
      'lesson-1-1: run write-code exercise alone does NOT complete lesson',
      'lesson-1-1: hint names current lesson quiz (not next lesson)',
      'quiz 1-1: fail with 4 of 6 (expect 67%)',
      'quiz 1-1: pass with 5 of 6 (expect 83%) -> Continue to lesson 1-2 opens',
      'quiz 1-2: fail with 3 of 5 (expect 60%)',
      'quiz 1-2: pass with 4 of 5 (expect 80%) -> Continue to lesson 1-3 opens',
      'quiz 1-3: pass with 4 of 5 (expect 80%) -> module 2 unlocked + Continue to lesson 2-1',
      'dashboard: module 1 shows 3 of 3 and primary button goes to lesson 2-1',
      'negative check: fresh profile opening lesson-1-3 directly shows lock page',
    ];
    for (const nm of stepNames) record(nm, 'NOT RUN');

    await step('app loads', async () => {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const landing = await page.$('#landing-root');
      if (!landing) throw new Error('landing root not found');
    });

    await step('sign up', async () => {
      await signUp(page, NAME, PIN);
    });

    await step('sign out', async () => {
      await signOut(page);
    });

    await step('sign in with the same PIN', async () => {
      await signIn(page, NAME, PIN);
    });

    await step('greeting shows the name', async () => {
      const text = await greetingName(page);
      if (!/Good (morning|afternoon|evening), E2E/.test(text)) {
        throw new Error(`greeting does not match expected pattern: ${text}`);
      }
    });

    await step('signed in as the created profile', async () => {
      await signedInAsCreatedProfile(page);
    });

    await step('lesson-1-1: run write-code exercise alone does NOT complete lesson', async () => {
      await runExerciseAndConfirmNotComplete(page, 'lesson-1-1');
    });

    await step('lesson-1-1: hint names current lesson quiz (not next lesson)', async () => {
      const fs = require('fs');
      const quizzes = JSON.parse(fs.readFileSync('/data/data/com.termux/files/home/PyKnowledge/content/quizzes.json', 'utf8'));
      const lessons = JSON.parse(fs.readFileSync('/data/data/com.termux/files/home/PyKnowledge/content/lessons.json', 'utf8'));
      const quiz = quizzes.quizzes.find((q) => q.lessonId === 'lesson-1-1' && q.id === 'lesson-1-1')
        || quizzes.quizzes.find((q) => q.lessonId === 'lesson-1-1');
      const quizTitle = quiz ? quiz.title.replace(/^Quiz: /, '') : 'lesson-1-1';
      const lesson2 = lessons.modules.flatMap((m) => m.lessons).find((l) => l.id === 'lesson-1-2');
      const expected = `Pass the quiz for ${quizTitle} to continue to ${lesson2 ? lesson2.title : ''}.`;
      const hint = await waitEl(page, '.os-hint', 10000);
      if (!hint) throw new Error('.os-hint not found on lesson-1-1');
      const hintText = await hint.innerText();
      if (hintText !== expected) {
        throw new Error(`Hint mismatch:
  expected: ${expected}
  actual:   ${hintText}`);
      }
    });

    await step('quiz 1-1: fail with 4 of 6 (expect 67%)', async () => {
      const result = await answerQuiz(page, 'lesson-1-1', { correct: 4 });
      if (result.score !== 67 || result.passed !== false) {
        throw new Error(`Unexpected quiz result: ${JSON.stringify(result)}`);
      }
    });

    await step('quiz 1-1: pass with 5 of 6 (expect 83%) -> Continue to lesson 1-2 opens', async () => {
      const result = await answerQuiz(page, 'lesson-1-1', { correct: 5 });
      if (result.score !== 83 || result.passed !== true || !result.continueHref) {
        throw new Error(`Unexpected quiz result: ${JSON.stringify(result)}`);
      }
      await clickContinueAndConfirmLessonOpens(page, 'lesson-1-2');
    });

    await step('quiz 1-2: fail with 3 of 5 (expect 60%)', async () => {
      const result = await answerQuiz(page, 'lesson-1-2', { correct: 3 });
      if (result.score !== 60 || result.passed !== false) {
        throw new Error(`Unexpected quiz result: ${JSON.stringify(result)}`);
      }
    });

    await step('quiz 1-2: pass with 4 of 5 (expect 80%) -> Continue to lesson 1-3 opens', async () => {
      const result = await answerQuiz(page, 'lesson-1-2', { correct: 4 });
      if (result.score !== 80 || result.passed !== true || !result.continueHref) {
        throw new Error(`Unexpected quiz result: ${JSON.stringify(result)}`);
      }
      await clickContinueAndConfirmLessonOpens(page, 'lesson-1-3');
    });

    await step('quiz 1-3: pass with 4 of 5 (expect 80%) -> module 2 unlocked + Continue to lesson 2-1', async () => {
      const result = await answerQuiz(page, 'lesson-1-3', { correct: 4 });
      if (result.score !== 80 || result.passed !== true || !result.continueHref) {
        throw new Error(`Unexpected quiz result: ${JSON.stringify(result)}`);
      }

      // Most important check: Continue href must be exactly #/lesson/lesson-2-1.
      // It is computed AFTER unlockNextModule saves progress, so if the href
      // is wrong the unlock-before-continue ordering is broken.
      if (result.continueHref !== '#/lesson/lesson-2-1') {
        throw new Error(`Continue href is ${result.continueHref}, expected #/lesson/lesson-2-1`);
      }

      // Confirm module 2 is unlocked in stored progress.
      const progress = await getProgress(page);
      if (!progress || !Array.isArray(progress.unlockedModules)) {
        throw new Error('Could not read stored progress for module unlock check');
      }
      if (!progress.unlockedModules.includes('module-2')) {
        throw new Error('Module 2 is NOT in stored unlockedModules after passing quiz 1-3');
      }

      // Click Continue and confirm lesson 2-1 opens (not locked).
      await clickContinueAndConfirmLessonOpens(page, 'lesson-2-1');
    });

    await step('dashboard: module 1 shows 3 of 3 and primary button goes to lesson 2-1', async () => {
      await page.evaluate(() => { window.location.hash = '#/dashboard'; });
      await page.waitForTimeout(1000);

      // Module 1 card shows "3/3 lessons".
      const module1Card = await page.$('.dash-card--module-1, .dash-card');
      if (!module1Card) throw new Error('Module cards not found on dashboard');
      // Check all module cards for module-1's count.
      const cards = await page.$$('.dash-card');
      let module1Found = false;
      for (const card of cards) {
        const title = await card.$('h3');
        if (!title) continue;
        const titleText = await title.innerText();
        if (titleText.includes('Introduction to Python')) {
          module1Found = true;
          const count = await card.$('.dash-card-count');
          if (!count) throw new Error('Module 1 card has no lesson count');
          const countText = await count.innerText();
          if (!countText.includes('3/3')) {
            throw new Error(`Module 1 shows "${countText}", expected "3/3 lessons"`);
          }
          const state = await card.$('.dash-chip--done');
          if (!state) throw new Error('Module 1 does not show DONE state');
          break;
        }
      }
      if (!module1Found) throw new Error('Module 1 card not found on dashboard');

      // Primary button goes to lesson 2-1.
      const primaryBtn = await page.$('.dash-primary .btn-primary.btn-lg');
      if (!primaryBtn) throw new Error('Primary continue button not found on dashboard');
      const primaryHref = await primaryBtn.getAttribute('href');
      if (primaryHref !== '#/lesson/lesson-2-1') {
        throw new Error(`Dashboard primary button href is ${primaryHref}, expected #/lesson/lesson-2-1`);
      }
    });

    await step('negative check: fresh profile opening lesson-1-3 directly shows lock page', async () => {
      await signOut(page);
      await signUp(page, NEG_NAME, NEG_PIN);

      // Confirm Negative Student is signed in on the dashboard before navigating.
      const greeting = await waitEl(page, '#dash-greeting', 5000);
      if (!greeting) throw new Error('Negative Student dashboard did not render');
      const greetText = await greeting.innerText();
      // The dashboard greeting shows only the first name ("Good afternoon, Negative")
      const negFirstName = NEG_NAME.split(' ')[0];
      if (!greetText.includes(negFirstName)) {
        throw new Error(`Not signed in as Negative Student: ${greetText}`);
      }

      // Let the dashboard settle before navigating directly to a locked lesson.
      await page.waitForTimeout(600);

      const lockInfo = await negativeCheckLockedLesson(page);

      if (lockInfo.h2Text !== 'Lesson Locked') {
        throw new Error(`Lock page heading: ${lockInfo.h2Text}`);
      }
      // Expected first incomplete lesson is lesson-1-1 for module-1
      const expectedSentence = 'Pass the quiz for "What is Python?" to unlock this lesson.';
      if (lockInfo.lockText !== expectedSentence) {
        throw new Error(`Lock page sentence: ${lockInfo.lockText}, expected: ${expectedSentence}`);
      }
      if (lockInfo.quizHref !== '#/quiz/lesson-1-1') {
        throw new Error(`Quiz link is ${lockInfo.quizHref}, expected #/quiz/lesson-1-1`);
      }
      if (lockInfo.lessonHref !== '#/lesson/lesson-1-1') {
        throw new Error(`Lesson link is ${lockInfo.lessonHref}, expected #/lesson/lesson-1-1`);
      }
      if (lockInfo.backLinkHref !== '#/module/module-1') {
        throw new Error(`Lock page links to ${lockInfo.backLinkHref}, expected #/module/module-1`);
      }
      console.log(`  Lock page says: "${lockInfo.h2Text}" — "${lockInfo.lockText}"`);
      console.log(`  Quiz link: ${lockInfo.quizHref}, Lesson link: ${lockInfo.lessonHref}, Back: ${lockInfo.backLinkHref}`);
    });

  } catch (e) {
    console.log('ERROR during journey:', e.message);
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    if (serverProc) {
      try { serverProc.close(); } catch { /* ignore */ }
    }
    rmSync(USER_DATA_DIR, { recursive: true, force: true });

    const resultsArray = stepOrder.map((nm) => results[nm]);

    const seen = new Set();
    let dupName = null;
    for (const r of resultsArray) {
      if (seen.has(r.name)) { dupName = r.name; break; }
      seen.add(r.name);
    }
    if (dupName) {
      console.log(`\nDUPLICATE STEP DETECTED: ${dupName} appears more than once`);
      process.exit(1);
    }

    let notRunOrFail = false;
    console.log('\n=== E2E RESULTS ===');
    for (const r of resultsArray) {
      console.log(`${r.status.padEnd(8)} ${r.name}`);
      if (r.status !== 'PASS') notRunOrFail = true;
    }

    try {
      writeFileSync(RESULTS_FILE, JSON.stringify({ results: resultsArray }, null, 2));
      console.log(`\nResults written to ${RESULTS_FILE}`);
    } catch (e) {
      console.log(`Failed to write results: ${e.message}`);
    }

    if (notRunOrFail) {
      console.log('\nSome steps did not PASS — see table above.');
      process.exit(1);
    }
    if (resultsArray.length === 0) {
      console.log('\nNo steps ran (crash before any step).');
      process.exit(1);
    }
    console.log('\nAll steps PASS.');
  }
}

main().catch((e) => {
  console.log('FATAL:', e.message);
  process.exit(1);
});
