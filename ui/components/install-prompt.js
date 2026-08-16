/**
 * PWA installation prompt handler.
 *
 * Independent from navigation ("Start Learning" / "Open the app") —
 * this button is ONLY responsible for the native install flow.
 * Follows the standard beforeinstallprompt → prompt() → appinstalled
 * lifecycle, with standalone-mode detection.
 */

let deferredInstallPrompt = null;

export function initInstallPrompt() {
  const installButton = document.getElementById('installAppButton');
  if (!installButton) return;

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
    if (!isStandalone()) {
      installButton.hidden = false;
    }
  });

  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log(`Installation result: ${outcome}`);

    deferredInstallPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    console.log('PyKnowledge installed successfully.');
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });
}
