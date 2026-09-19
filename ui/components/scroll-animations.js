/**
 * Scroll-triggered entrance animations.
 * Uses IntersectionObserver for GPU-friendly lazy animation.
 */

let observer = null;

function getObserver() {
  if (!observer && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  }
  return observer;
}

export function observeScrollAnimations(container) {
  const obs = getObserver();
  if (!obs) return;
  
  const targets = container.querySelectorAll('.scroll-animate');
  targets.forEach(el => obs.observe(el));
}
