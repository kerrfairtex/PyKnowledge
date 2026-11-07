/**
 * Keyboard shortcut system for power users.
 * 
 * Shortcuts:
 *   n          → Next lesson
 *   p          → Previous lesson  
 *   d          → Dashboard
 *   l          → Library
 *   Esc        → Close overlay / Go home
 *   Ctrl+Enter → Run code (handled by code editor)
 */

export function initKeyboardShortcuts(navigate, getRoute) {
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in inputs
    const tag = e.target.tagName;
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.target.isContentEditable;
    
    // Esc always works — closes overlays or goes home
    if (e.key === 'Escape') {
      const overlay = document.querySelector('.celebration-overlay.celebration-active');
      if (overlay) {
        e.preventDefault();
        overlay.classList.remove('celebration-active');
        setTimeout(() => overlay.remove(), 400);
        return;
      }
      // Let router handle Esc for navigation
      return;
    }
    
    // Skip shortcut handling when in input fields
    if (isInput) return;
    
    // Don't trigger when modifier keys are held (except for code editor's Ctrl+Enter)
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    
    switch (e.key) {
      case 'n': {
        e.preventDefault();
        const nextLink = document.querySelector('[data-next-lesson]');
        if (nextLink) navigate(nextLink.dataset.nextLesson);
        break;
      }
      case 'p': {
        e.preventDefault();
        const prevLink = document.querySelector('[data-prev-lesson]');
        if (prevLink) navigate(prevLink.dataset.prevLesson);
        break;
      }
      case 'd':
        e.preventDefault();
        navigate('/dashboard');
        break;
      case 'l':
        e.preventDefault();
        navigate('/library');
        break;
    }
  });
}
