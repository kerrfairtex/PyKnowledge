/**
 * Enhanced Navigation - Landing page progressive enhancement
 *
 * Loaded as a deferred non-module script on index.html.
 * Adds smooth scroll for in-page anchor links and ensures the
 * hash-based landing↔app controller (inline in index.html)
 * initialises on DOMContentLoaded regardless of load timing.
 *
 * No framework, no external deps — safe for offline use.
 */
(function () {
  'use strict';

  // Smooth scroll for same-page anchor links (#curriculum, #offline, etc.)
  function initSmoothScroll() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var duration = 200; // ms — short, native feel

    function easeInOutQuad(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function scrollTo(targetY, startTime, startY) {
      var currentTime = 0;
      var step = function () {
        currentTime += 1000 / 60; // ~60fps
        var progress = Math.min(currentTime / duration, 1);
        var eased = easeInOutQuad(progress);
        window.scrollTo(0, Math.round(startY + (targetY - startY) * eased));
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      step();
    }

    function handleClick(e) {
      var anchor = e.target;
      if (!(anchor.tagName === 'A' || anchor.tagName === 'BUTTON')) return;
      var href = anchor.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;

      var targetId = href.slice(1);
      if (targetId === 'top') {
        e.preventDefault();
        var startY = window.pageYOffset || document.documentElement.scrollTop;
        scrollTo(0, 0, startY);
        return;
      }

      var targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        var targetY = targetEl.getBoundingClientRect().top + window.pageYOffset;
        var startY = window.pageYOffset || document.documentElement.scrollTop;
        scrollTo(targetY, 0, startY);
      }
    }

    document.addEventListener('click', handleClick, true);
  }

  // Ensure hashchange fires on initial load for the page controller
  function ensureInitialHashCheck() {
    // The inline script in index.html calls onHashChange() synchronously,
    // but if this script loads after DOMContentLoaded the hash may not
    // have been processed. Re-trigger a hashchange to be safe.
    window.addEventListener('DOMContentLoaded', function () {
      // Only re-trigger if we're on the landing page (has landing-root)
      if (document.getElementById('landing-root')) {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
  }

  // Skip-link focus management for keyboard users
  function initSkipLink() {
    var skipLink = document.querySelector('.skip-link');
    if (!skipLink) return;

    skipLink.addEventListener('click', function (e) {
      var target = document.getElementById('main-content') ||
                   document.getElementById('spa-root');
      if (target) {
        target.focus();
      }
    });
  }

  // Initialise on DOM ready or immediately if already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initSmoothScroll();
      ensureInitialHashCheck();
      initSkipLink();
    });
  } else {
    initSmoothScroll();
    ensureInitialHashCheck();
    initSkipLink();
  }
})();
