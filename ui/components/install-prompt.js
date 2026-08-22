/**
 * PWA installation prompt handler.
 *
 * Independent from navigation ("Start Learning" / "Open the app") —
 * this button is ONLY responsible for the native install flow.
 * Follows the standard beforeinstallprompt → prompt() → appinstalled
 * lifecycle, with standalone-mode detection.
 */

let deferredInstallPrompt = null;
const boundButtons = new Set();

/**
 * Show/hide all registered install buttons. Callers may register a button
 * anywhere (landing footer, auth screens, navbar) via initInstallPrompt(id).
 */
function syncButtonVisibility() {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const available = Boolean(deferredInstallPrompt) && !standalone;
  boundButtons.forEach((btn) => { btn.hidden = !available; });
}

export function initInstallPrompt(targetId = 'installAppButton') {
  const installButton = document.getElementById(targetId);
  if (!installButton || boundButtons.has(installButton)) return;

  // Re-rendered screens (auth views) create a fresh element each time.
  boundButtons.add(installButton);

  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log(`Installation result: ${outcome}`);

    deferredInstallPrompt = null;
    syncButtonVisibility();
  });

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  // Already running as an installed app — nothing to install.
  if (isStandalone()) {
    installButton.hidden = true;
    return;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    syncButtonVisibility();
  });

  window.addEventListener('appinstalled', () => {
    console.log('PyKnowledge installed successfully.');
    deferredInstallPrompt = null;
    syncButtonVisibility();
  });

  // If the prompt already fired earlier (e.g. module loaded after the event),
  // surface it immediately instead of waiting for a reload.
  if (deferredInstallPrompt) syncButtonVisibility();
}
