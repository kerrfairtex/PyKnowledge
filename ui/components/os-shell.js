/**
 * PyKnowledge OS shell — status bar, mobile tab bar, command palette.
 * Reads REAL state: user, route, online, cache counts. No fake values.
 */
import { commands } from './command-registry.js';
import { writeFxOverride } from './fx-detector.js';
import { escapeHtml } from '../../utils/sanitize.js';

const THEME_KEY = 'pk-theme';
let paletteEl = null;
let paletteInput = null;
let paletteList = null;
let paletteActive = -1;

function userLabel() {
  try {
    const raw = localStorage.getItem('pk-auth-active');
    if (raw) {
      const u = JSON.parse(raw);
      if (u && u.displayName) return u.isGuest ? 'guest' : u.displayName.toLowerCase().replace(/\s+/g, '-');
    }
  } catch { /* fallthrough */ }
  return 'guest';
}

function routeLabel() {
  const h = window.location.hash.slice(1) || '/';
  const parts = h.split('/').filter(Boolean);
  return parts.length ? parts.join('/') : 'landing';
}

function netPill() {
  const online = navigator.onLine;
  return `<span class="os-pill ${online ? 'is-online' : 'is-offline'}" id="osNetPill">● ${online ? 'ONLINE' : 'OFFLINE-READY'}</span>`;
}

function renderStatusBar() {
  let bar = document.getElementById('osStatusBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'osStatusBar';
    bar.className = 'os-status-bar';
    bar.setAttribute('role', 'status');
    document.body.prepend(bar);
  }
  bar.innerHTML = `
    <span class="os-user" id="osUser">${escapeHtml(userLabel())}@pyknowledge:~/${escapeHtml(routeLabel())}</span>
    <span class="os-right">${netPill()}</span>`;
}

function renderTabBar() {
  let bar = document.getElementById('osTabBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'osTabBar';
    bar.className = 'os-tab-bar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'App sections');
    document.body.appendChild(bar);
  }
  const route = routeLabel();
  const tabs = [
    { id: 'dashboard', label: 'HOME', href: '#/dashboard' },
    { id: 'dashboard', label: 'MISSIONS', href: '#/dashboard' },
    { id: 'progress', label: 'PROGRESS', href: '#/progress' },
    { id: 'library', label: 'LIB', href: '#/library' },
    { id: 'you', label: 'YOU', href: '#/about' }
  ];
  bar.innerHTML = tabs.map((t) => {
    const active = route.startsWith(t.id);
    return `<a href="${t.href}" class="os-tab ${active ? 'is-active' : ''}" ${active ? 'aria-current="page"' : ''}>${t.label}</a>`;
  }).join('');
}

let osShellInited = false;

export function initOsShell() {
  if (osShellInited) return; // idempotent: landing boot + engine both call this
  osShellInited = true;
  renderStatusBar();
  const inApp = window.location.hash.startsWith('#/');
  if (inApp) renderTabBar();
  window.addEventListener('hashchange', () => {
    renderStatusBar();
    const inAppNow = window.location.hash.startsWith('#/');
    const existing = document.getElementById('osTabBar');
    if (inAppNow && !existing) renderTabBar();
    if (!inAppNow && existing) existing.remove();
  });
  window.addEventListener('online', renderStatusBar);
  window.addEventListener('offline', renderStatusBar);
  initPalette();
}

/* ---- Command palette (Ctrl+K / >_ button) ---- */
function paletteApi() {
  return {
    setFx: (t) => {
      writeFxOverride(t);
      document.documentElement.setAttribute('data-fx', t);
      closePalette();
      // FULL-only effects (rain/glitch) re-init when switching to full
      import('./os-fx.js').then((m) => m.initOsFx()).catch(() => {});
    },
    setTheme: (name) => {
      try { localStorage.setItem(THEME_KEY, name); } catch { /* storage unavailable */ }
      document.documentElement.setAttribute('data-theme', name === 'green' ? '' : name);
      closePalette();
    }
  };
}

function filterCommands(q) {
  if (!q) return commands;
  const lower = q.toLowerCase();
  return commands.filter((c) =>
    c.label.toLowerCase().includes(lower) || (c.keywords && c.keywords.includes(lower)));
}

function renderPaletteList(items) {
  paletteActive = Math.min(paletteActive, items.length - 1);
  return items.map((c, i) => `
    <button type="button" class="os-palette-item ${i === paletteActive ? 'is-active' : ''}" data-cmd="${escapeHtml(c.id)}" role="option" aria-selected="${i === paletteActive}">
      ${escapeHtml(c.label)}
    </button>`).join('');
}

function openPalette() {
  if (paletteEl) { paletteInput.focus(); return; }
  paletteEl = document.createElement('div');
  paletteEl.className = 'os-palette';
  paletteEl.setAttribute('role', 'dialog');
  paletteEl.setAttribute('aria-label', 'Command palette');
  paletteEl.innerHTML = `
    <div class="os-palette-panel">
      <input type="text" class="os-palette-input" placeholder="Type a command…" aria-label="Search commands" autocomplete="off">
      <div class="os-palette-list" role="listbox"></div>
    </div>`;
  document.body.appendChild(paletteEl);
  paletteInput = paletteEl.querySelector('.os-palette-input');
  paletteList = paletteEl.querySelector('.os-palette-list');
  const api = paletteApi();
  const redraw = () => {
    const items = filterCommands(paletteInput.value.trim());
    paletteList.innerHTML = items.length ? renderPaletteList(items) : '<p class="os-palette-empty">No matching command.</p>';
  };
  paletteInput.addEventListener('input', redraw);
  paletteInput.addEventListener('keydown', (e) => {
    const items = filterCommands(paletteInput.value.trim());
    if (e.key === 'ArrowDown') { e.preventDefault(); paletteActive = Math.min(paletteActive + 1, items.length - 1); redraw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); paletteActive = Math.max(paletteActive - 1, 0); redraw(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[paletteActive]) { items[paletteActive].run(api); } }
    else if (e.key === 'Escape') { closePalette(); }
  });
  paletteList.addEventListener('click', (e) => {
    const btn = e.target.closest('.os-palette-item');
    if (!btn) return;
    const cmd = commands.find((c) => c.id === btn.dataset.cmd);
    if (cmd) cmd.run(api);
  });
  paletteEl.addEventListener('click', (e) => { if (e.target === paletteEl) closePalette(); });
  paletteActive = 0;
  redraw();
  paletteInput.focus();
}

function closePalette() {
  if (paletteEl) { paletteEl.remove(); paletteEl = null; paletteInput = null; paletteList = null; paletteActive = -1; }
}

function initPalette() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openPalette();
    }
  });
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('[data-os-palette]')) openPalette();
  });
}

export { openPalette, closePalette };
