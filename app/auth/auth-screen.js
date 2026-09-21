/**
 * Authentication screens — profile picker, login, and registration.
 */

import { escapeHtml } from '../../utils/sanitize.js';
import {
  getProfiles, createProfile, loginWithPin, hasProfiles, isAuthenticated
} from '../../storage/auth.js';
import { showSuccess } from '../../ui/components/toast.js';
import { animatePageEnter } from '../../ui/components/animations.js';
import { initInstallPrompt } from '../../ui/components/install-prompt.js';

const DOWNLOAD_BTN = `
  <button type="button" class="btn btn-ghost btn-sm" id="authDownloadButton" hidden>Download App</button>`;

function bindAuthExtras() {
  initInstallPrompt('authDownloadButton');
  const homeLink = document.getElementById('btn-back-home');
  if (homeLink) {
    homeLink.addEventListener('click', () => {
      window.location.hash = '#top';
    });
  }
}

export function renderAuthGate(main, onAuthenticated) {
  if (isAuthenticated()) {
    onAuthenticated();
    return;
  }

  if (hasProfiles()) {
    renderProfilePicker(main, onAuthenticated);
  } else {
    renderWelcome(main, onAuthenticated);
  }
}

function renderWelcome(main, onAuthenticated) {
  main.innerHTML = `
    <section class="auth-screen auth-welcome" aria-labelledby="welcome-title">
      <div class="auth-card animate-item">
        <p class="os-boot-line" aria-hidden="true">$ pyknowledge --first-run</p>
        <div class="auth-logo" aria-hidden="true">🐍</div>
        <h2 id="welcome-title">Welcome to PyKnowledge</h2>
        <p class="auth-subtitle">Create your student profile to save progress on this device.</p>
        <p class="auth-note">Works fully offline. No internet or account required.</p>
        <p class="os-auth-empty" role="note">no profiles found on this device</p>
        <button type="button" class="btn btn-primary btn-lg" id="btn-create-profile">Create Profile</button>
        ${DOWNLOAD_BTN}
        <button type="button" class="btn btn-ghost" id="btn-guest">Continue as Guest</button>
        <p class="auth-note">Guest progress is saved on this device and can be moved
        into a profile later.</p>

        <details class="install-guide">
          <summary>How to download &amp; install this app</summary>
          <ol class="install-guide-steps">
            <li><strong>Tap "Download App"</strong> above. Chrome shows an
              <em>Install app</em> confirmation — tap it, and PyKnowledge is added
              to your home screen like a normal app.</li>
            <li><strong>No button visible?</strong> On Android Chrome: tap the
              <kbd>⋮</kbd> menu (top-right) → <strong>Add to Home screen</strong> →
              <strong>Install</strong>. On iPhone Safari: tap <strong>Share</strong>
              → <strong>Add to Home Screen</strong>.</li>
            <li><strong>Open it anytime</strong> from your home screen — it launches
              full-screen, loads instantly, and works with
              <strong>zero internet connection</strong> once installed.</li>
          </ol>
          <p class="install-guide-note">Installing also saves all lessons to your
          device, so you can study offline anywhere.</p>
        </details>

        <a class="auth-about-link" id="btn-back-home" href="#top">&larr; Back to home</a>
      </div>
    </section>`;

  animatePageEnter(main);
  bindAuthExtras();
  document.getElementById('btn-create-profile').addEventListener('click', () => {
    renderRegister(main, onAuthenticated);
  });
  document.getElementById('btn-guest').addEventListener('click', () => {
    onAuthenticated();
  });
}

export function renderProfilePicker(main, onAuthenticated) {
  const profiles = getProfiles();

  main.innerHTML = `
    <section class="auth-screen" aria-labelledby="picker-title">
      <div class="auth-card">
        <p class="os-boot-line" aria-hidden="true">$ pyknowledge --login</p>
        <h2 id="picker-title">Who's learning today?</h2>
        <p class="auth-subtitle">Select your profile to continue</p>
        <div class="profile-grid" role="list">
          ${profiles.map((p, i) => `
            <button type="button" class="profile-card animate-item" data-user-id="${escapeHtml(p.id)}" role="listitem"
              style="--avatar-color: ${escapeHtml(p.avatar)}">
              <span class="profile-avatar" aria-hidden="true">${escapeHtml(p.displayName.charAt(0).toUpperCase())}</span>
              <span class="profile-name">${escapeHtml(p.displayName)}</span>
              <span class="profile-uid" aria-hidden="true">uid=${String(1001 + i)}</span>
            </button>
          `).join('')}
          <button type="button" class="profile-card profile-card-add animate-item" id="btn-add-profile" role="listitem">
            <span class="profile-avatar profile-avatar-add" aria-hidden="true">+</span>
            <span class="profile-name">Add Profile</span>
          </button>
        </div>
        <button type="button" class="btn btn-ghost" id="btn-guest-picker">Continue as Guest</button>
        ${DOWNLOAD_BTN}
      </div>
    </section>`;

  animatePageEnter(main);
  bindAuthExtras();

  main.querySelectorAll('.profile-card[data-user-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      renderPinEntry(main, btn.dataset.userId, onAuthenticated);
    });
  });

  document.getElementById('btn-add-profile').addEventListener('click', () => {
    renderRegister(main, onAuthenticated);
  });
  document.getElementById('btn-guest-picker').addEventListener('click', () => {
    onAuthenticated();
  });
}

function renderPinEntry(main, userId, onAuthenticated) {
  const profile = getProfiles().find((p) => p.id === userId);
  if (!profile) return;

  main.innerHTML = `
    <section class="auth-screen" aria-labelledby="pin-title">
      <div class="auth-card animate-item">
        <button type="button" class="auth-back" id="btn-back" aria-label="Back to profiles">&larr;</button>
        <div class="profile-avatar profile-avatar-lg" style="--avatar-color: ${escapeHtml(profile.avatar)}"
          aria-hidden="true">${escapeHtml(profile.displayName.charAt(0).toUpperCase())}</div>
        <h2 id="pin-title">Hello, ${escapeHtml(profile.displayName)}</h2>
        <p class="auth-subtitle os-sudo-prompt">[sudo] PIN for ${escapeHtml(profile.displayName)}:</p>
        <form id="pin-form" class="auth-form">
          <div class="pin-input-group">
            <input type="password" id="pin-input" class="pin-input" inputmode="none"
              readonly autocomplete="off" aria-label="PIN, use the keypad or your keyboard"
              aria-describedby="pin-dots-status">
            <div class="pin-dots" id="pin-dots" aria-hidden="true"></div>
            <p class="visually-hidden" id="pin-dots-status" aria-live="polite"></p>
          </div>
          <div class="os-keypad" id="os-keypad" role="group" aria-label="PIN keypad">
            <button type="button" class="os-key" data-key="1">1</button>
            <button type="button" class="os-key" data-key="2">2</button>
            <button type="button" class="os-key" data-key="3">3</button>
            <button type="button" class="os-key" data-key="4">4</button>
            <button type="button" class="os-key" data-key="5">5</button>
            <button type="button" class="os-key" data-key="6">6</button>
            <button type="button" class="os-key" data-key="7">7</button>
            <button type="button" class="os-key" data-key="8">8</button>
            <button type="button" class="os-key" data-key="9">9</button>
            <button type="button" class="os-key os-key-back" data-key="backspace" aria-label="Backspace">⌫</button>
            <button type="button" class="os-key" data-key="0">0</button>
            <button type="button" class="os-key os-key-enter" data-key="enter" aria-label="Sign in" disabled>ENTER</button>
          </div>
          <p class="form-error" id="pin-error" hidden role="alert"></p>
          <button id="authSubmit" type="submit" class="btn btn-primary btn-lg">Sign In</button>
        </form>
      </div>
    </section>`;

  animatePageEnter(main);
  const pinInput = document.getElementById('pin-input');
  const pinDots = document.getElementById('pin-dots');
  const pinStatus = document.getElementById('pin-dots-status');
  let attemptsLeft = 5;

  function renderDots() {
    const len = pinInput.value.length;
    pinDots.innerHTML = Array.from({ length: Math.max(4, len) }, (_, i) =>
      `<span class="pin-dot ${i < len ? 'is-filled' : ''}"></span>`).join('');
    pinStatus.textContent = len === 0 ? 'PIN empty' : `${len} digit${len > 1 ? 's' : ''} entered`;
  }

  const enterBtn = document.querySelector('.os-key-enter');
  function pressKey(key) {
    errorEl.hidden = true;
    if (key === 'backspace') {
      pinInput.value = pinInput.value.slice(0, -1);
    } else if (key === 'enter') {
      if (pinInput.value.length >= 4) pinInput.form.requestSubmit();
      return;
    } else if (pinInput.value.length < 8) {
      pinInput.value += key;
    }
    renderDots();
    if (enterBtn) enterBtn.disabled = pinInput.value.length < 4;
    if (navigator.vibrate) navigator.vibrate(8);
  }

  const errorEl = document.getElementById('pin-error');

  document.getElementById('os-keypad').addEventListener('click', (e) => {
    const btn = e.target.closest('.os-key');
    if (!btn) return;
    pressKey(btn.dataset.key);
  });
  // press feedback only on pointerdown; never preventDefault on touchstart
  document.getElementById('os-keypad').addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.os-key');
    if (btn) btn.classList.add('is-pressed');
  });
  document.getElementById('os-keypad').addEventListener('pointerup', (e) => {
    const btn = e.target.closest('.os-key');
    if (btn) btn.classList.remove('is-pressed');
  });
  document.getElementById('os-keypad').addEventListener('pointercancel', (e) => {
    const btn = e.target.closest('.os-key');
    if (btn) btn.classList.remove('is-pressed');
  });

  // physical keyboard support (readonly input, so we capture keys ourselves)
  document.addEventListener('keydown', pinKeyDown);
  function pinKeyDown(e) {
    if (!document.getElementById('pin-form')) { document.removeEventListener('keydown', pinKeyDown); return; }
    if (/^[0-9]$/.test(e.key)) { pressKey(e.key); }
    else if (e.key === 'Backspace') { pressKey('backspace'); }
    else if (e.key === 'Enter') { pressKey('enter'); }
  }

  renderDots();

  document.getElementById('btn-back').addEventListener('click', () => {
    document.removeEventListener('keydown', pinKeyDown);
    renderProfilePicker(main, onAuthenticated);
  });

  document.getElementById('pin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    try {
      await loginWithPin(userId, pinInput.value);
      document.removeEventListener('keydown', pinKeyDown);
      showSuccess('ACCESS GRANTED');
      showSuccess(`Welcome back, ${profile.displayName}!`);
      window.dispatchEvent(new CustomEvent('pk:rain', { detail: { burst: 600 } }));
      onAuthenticated();
    } catch (err) {
      attemptsLeft = Math.max(0, attemptsLeft - 1);
      errorEl.textContent = attemptsLeft > 0
        ? `ACCESS DENIED — ${err.message} (${attemptsLeft} left)`
        : `ACCESS DENIED — ${err.message}`;
      errorEl.hidden = false;
      pinInput.value = '';
      renderDots();
      pinInput.classList.add('shake');
      setTimeout(() => pinInput.classList.remove('shake'), 500);
    }
  });
}

function renderRegister(main, onAuthenticated) {
  let regStep = 1;
  let regName = '';
  let regPin = '';

  const renderStep = () => {
    const stepTitle = regStep === 1 ? 'Create Your Profile' : regStep === 2 ? 'Set PIN' : 'Confirm PIN';
    const stepSub = regStep === 1 ? 'Enter your name to get started' : regStep === 2 ? 'Choose a 4+ digit PIN' : 'Re-enter your PIN to confirm';

    main.innerHTML = `
      <section class="auth-screen" aria-labelledby="register-title">
        <div class="auth-card animate-item">
          <button type="button" class="auth-back" id="btn-back" aria-label="Back">&larr;</button>
          <p class="os-boot-line" aria-hidden="true">$ pyknowledge --create-profile</p>
          <h2 id="register-title">${stepTitle}</h2>
          <p class="auth-subtitle">${stepSub}</p>
          <p class="os-auth-empty" role="note">uid will be assigned on creation</p>
          <form id="register-form" class="auth-form">
            ${regStep === 1 ? `
              <div class="form-group">
                <label for="reg-name">Your Name</label>
                <input type="text" id="reg-name" class="form-input" required minlength="2"
                  maxlength="30" placeholder="e.g. Maria" autocomplete="name">
              </div>
              <button id="reg-next" type="submit" class="btn btn-primary btn-lg">Next</button>
            ` : regStep === 2 ? `
              <div class="pin-input-group">
                <input type="password" id="reg-pin" class="pin-input" inputmode="none"
                  readonly autocomplete="off" aria-label="PIN, use the keypad or your keyboard"
                  aria-describedby="reg-pin-status">
                <div class="pin-dots" id="reg-pin-dots" aria-hidden="true"></div>
                <p class="visually-hidden" id="reg-pin-status" aria-live="polite"></p>
              </div>
              <div class="os-keypad" id="reg-keypad" role="group" aria-label="PIN keypad">
                <button type="button" class="os-key" data-key="1" aria-label="1">1</button>
                <button type="button" class="os-key" data-key="2" aria-label="2">2</button>
                <button type="button" class="os-key" data-key="3" aria-label="3">3</button>
                <button type="button" class="os-key" data-key="4" aria-label="4">4</button>
                <button type="button" class="os-key" data-key="5" aria-label="5">5</button>
                <button type="button" class="os-key" data-key="6" aria-label="6">6</button>
                <button type="button" class="os-key" data-key="7" aria-label="7">7</button>
                <button type="button" class="os-key" data-key="8" aria-label="8">8</button>
                <button type="button" class="os-key" data-key="9" aria-label="9">9</button>
                <button type="button" class="os-key os-key-back" data-key="backspace" aria-label="Backspace">⌫</button>
                <button type="button" class="os-key" data-key="0" aria-label="0">0</button>
                <button type="button" class="os-key os-key-enter" data-key="enter" aria-label="Next">NEXT</button>
              </div>
            ` : `
              <div class="pin-input-group">
                <input type="password" id="reg-pin-confirm" class="pin-input" inputmode="none"
                  readonly autocomplete="off" aria-label="Confirm PIN, use the keypad or your keyboard"
                  aria-describedby="reg-confirm-status">
                <div class="pin-dots" id="reg-confirm-dots" aria-hidden="true"></div>
                <p class="visually-hidden" id="reg-confirm-status" aria-live="polite"></p>
              </div>
              <div class="os-keypad" id="reg-confirm-keypad" role="group" aria-label="Confirm PIN keypad">
                <button type="button" class="os-key" data-key="1" aria-label="1">1</button>
                <button type="button" class="os-key" data-key="2" aria-label="2">2</button>
                <button type="button" class="os-key" data-key="3" aria-label="3">3</button>
                <button type="button" class="os-key" data-key="4" aria-label="4">4</button>
                <button type="button" class="os-key" data-key="5" aria-label="5">5</button>
                <button type="button" class="os-key" data-key="6" aria-label="6">6</button>
                <button type="button" class="os-key" data-key="7" aria-label="7">7</button>
                <button type="button" class="os-key" data-key="8" aria-label="8">8</button>
                <button type="button" class="os-key os-key-back" data-key="backspace" aria-label="Backspace">⌫</button>
                <button type="button" class="os-key" data-key="0" aria-label="0">0</button>
                <button type="button" class="os-key os-key-enter" data-key="enter" aria-label="Create">CREATE</button>
              </div>
            `}
            <p class="form-error" id="reg-error" hidden role="alert"></p>
          </form>
        </div>
      </section>`;

    animatePageEnter(main);

    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (regStep > 1) {
          regStep--;
          renderStep();
        } else if (hasProfiles()) {
          renderProfilePicker(main, onAuthenticated);
        } else {
          renderWelcome(main, onAuthenticated);
        }
      });
    }

    if (regStep === 1) {
      const nameInput = document.getElementById('reg-name');
      nameInput.focus();
      document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('reg-error');
        errorEl.hidden = true;
        regName = nameInput.value.trim();
        if (regName.length < 2) {
          errorEl.textContent = 'Name must be at least 2 characters';
          errorEl.hidden = false;
          return;
        }
        regStep = 2;
        renderStep();
      });
    } else if (regStep === 2) {
      const pinInput = document.getElementById('reg-pin');
      const pinDots = document.getElementById('reg-pin-dots');
      const pinStatus = document.getElementById('reg-pin-status');
      const keypad = document.getElementById('reg-keypad');
      const errorEl = document.getElementById('reg-error');
      const enterBtn = keypad.querySelector('.os-key-enter');
      if (enterBtn) enterBtn.disabled = true;

      function renderDots() {
        const len = pinInput.value.length;
        pinDots.innerHTML = Array.from({ length: Math.max(4, len) }, (_, i) =>
          `<span class="pin-dot ${i < len ? 'is-filled' : ''}"></span>`).join('');
        pinStatus.textContent = len === 0 ? 'PIN empty' : `${len} digit${len > 1 ? 's' : ''} entered`;
      }

      function pressKey(key) {
        errorEl.hidden = true;
        if (key === 'backspace') {
          pinInput.value = pinInput.value.slice(0, -1);
        } else if (key === 'enter') {
          if (pinInput.value.length >= 4) {
            regPin = pinInput.value;
            regStep = 3;
            renderStep();
          }
          return;
        } else if (pinInput.value.length < 8) {
          pinInput.value += key;
        }
        renderDots();
        if (enterBtn) enterBtn.disabled = pinInput.value.length < 4;
        if (navigator.vibrate) navigator.vibrate(8);
      }

      keypad.addEventListener('click', (e) => {
        const btn = e.target.closest('.os-key');
        if (!btn) return;
        pressKey(btn.dataset.key);
      });
      keypad.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('.os-key');
        if (btn) btn.classList.add('is-pressed');
      });
      keypad.addEventListener('pointerup', (e) => {
        const btn = e.target.closest('.os-key');
        if (btn) btn.classList.remove('is-pressed');
      });
      keypad.addEventListener('pointercancel', (e) => {
        const btn = e.target.closest('.os-key');
        if (btn) btn.classList.remove('is-pressed');
      });

      document.addEventListener('keydown', pinKeyDown);
      function pinKeyDown(e) {
        if (!document.getElementById('register-form')) { document.removeEventListener('keydown', pinKeyDown); return; }
        if (/^[0-9]$/.test(e.key)) { pressKey(e.key); }
        else if (e.key === 'Backspace') { pressKey('backspace'); }
        else if (e.key === 'Enter') { pressKey('enter'); }
      }

      renderDots();
    } else {
      const confirmInput = document.getElementById('reg-pin-confirm');
      const confirmDots = document.getElementById('reg-confirm-dots');
      const confirmStatus = document.getElementById('reg-confirm-status');
      const keypad = document.getElementById('reg-confirm-keypad');
      const errorEl = document.getElementById('reg-error');
      const enterBtn = keypad.querySelector('.os-key-enter');
      if (enterBtn) enterBtn.disabled = true;

      function renderDots() {
        const len = confirmInput.value.length;
        confirmDots.innerHTML = Array.from({ length: Math.max(4, len) }, (_, i) =>
          `<span class="pin-dot ${i < len ? 'is-filled' : ''}"></span>`).join('');
        confirmStatus.textContent = len === 0 ? 'PIN empty' : `${len} digit${len > 1 ? 's' : ''} entered`;
      }

      function pressKey(key) {
        errorEl.hidden = true;
        if (key === 'backspace') {
          confirmInput.value = confirmInput.value.slice(0, -1);
        } else if (key === 'enter') {
          if (confirmInput.value.length >= 4) {
            if (confirmInput.value !== regPin) {
              errorEl.textContent = 'PINs do not match';
              errorEl.hidden = false;
              confirmInput.value = '';
              renderDots();
              return;
            }
            submitCreate();
          }
          return;
        } else if (confirmInput.value.length < 8) {
          confirmInput.value += key;
        }
        renderDots();
        if (enterBtn) enterBtn.disabled = confirmInput.value.length < 4;
        if (navigator.vibrate) navigator.vibrate(8);
      }

      keypad.addEventListener('click', (e) => {
        const btn = e.target.closest('.os-key');
        if (!btn) return;
        pressKey(btn.dataset.key);
      });
      keypad.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('.os-key');
        if (btn) btn.classList.add('is-pressed');
      });
      keypad.addEventListener('pointerup', (e) => {
        const btn = e.target.closest('.os-key');
        if (btn) btn.classList.remove('is-pressed');
      });
      keypad.addEventListener('pointercancel', (e) => {
        const btn = e.target.closest('.os-key');
        if (btn) btn.classList.remove('is-pressed');
      });

      document.addEventListener('keydown', confirmKeyDown);
      function confirmKeyDown(e) {
        if (!document.getElementById('register-form')) { document.removeEventListener('keydown', confirmKeyDown); return; }
        if (/^[0-9]$/.test(e.key)) { pressKey(e.key); }
        else if (e.key === 'Backspace') { pressKey('backspace'); }
        else if (e.key === 'Enter') { pressKey('enter'); }
      }

      async function submitCreate() {
        errorEl.hidden = true;
        try {
          const profile = await createProfile(regName, regPin);
          const { startSession } = await import('../../storage/auth.js');
          startSession(profile.id);
          try {
            const { migrateGuestProgress } = await import('../../core/storage.js');
            const migrated = await migrateGuestProgress(profile.id);
            if (migrated) {
              showSuccess(`Welcome, ${profile.displayName} — your guest progress was moved into this profile.`);
            } else {
              showSuccess(`Profile created! Welcome, ${profile.displayName}`);
            }
          } catch {
            showSuccess(`Profile created! Welcome, ${profile.displayName}`);
          }
          onAuthenticated();
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.hidden = false;
        }
      }

      renderDots();
    }
  };

  renderStep();
}
