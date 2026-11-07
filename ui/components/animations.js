/**
 * Page transition and entrance animation utilities.
 */

import { escapeHtml } from '../../utils/sanitize.js';
import { showToast } from './toast.js';

export function animatePageEnter(container) {
  if (!container) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  container.classList.remove('page-exit');
  container.classList.add('page-enter');
  requestAnimationFrame(() => {
    container.classList.add('page-enter-active');
  });

  const cleanup = () => {
    container.classList.remove('page-enter', 'page-enter-active');
    container.removeEventListener('transitionend', cleanup);
  };
  container.addEventListener('transitionend', cleanup);
}

export function staggerChildren(container, selector = '.animate-item') {
  if (!container) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const items = container.querySelectorAll(selector);
  items.forEach((el, i) => {
    el.style.animationDelay = `${i * 80}ms`;
    el.classList.add('stagger-in');
  });
}

export function pulseElement(el) {
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.classList.add('pulse-once');
  el.addEventListener('animationend', () => el.classList.remove('pulse-once'), { once: true });
}

export function celebrateAchievement(title) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    showToast(`Achievement: ${title}`, 'success');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';
  overlay.setAttribute('role', 'alert');
  overlay.setAttribute('aria-live', 'assertive');
  
  // Canvas for confetti
  const canvas = document.createElement('canvas');
  canvas.className = 'celebration-canvas';
  overlay.appendChild(canvas);
  
  const content = document.createElement('div');
  content.className = 'celebration-content';
  content.innerHTML = `
    <div class="celebration-icon" aria-hidden="true">🏆</div>
    <p class="celebration-title">Achievement Unlocked!</p>
    <p class="celebration-name">${escapeHtml(title)}</p>
  `;
  overlay.appendChild(content);
  
  document.body.appendChild(overlay);
  
  requestAnimationFrame(() => {
    overlay.classList.add('celebration-active');
    startConfetti(canvas);
  });

  setTimeout(() => {
    overlay.classList.remove('celebration-active');
    setTimeout(() => overlay.remove(), 400);
  }, 3000);
}

function startConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const colors = ['#ffc900', '#2ecc71', '#60A5FA', '#f2546d', '#4ecca3'];
  const particles = [];
  const particleCount = 80;
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12 - 4,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      life: 1
    });
  }
  
  let animationId;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    
    particles.forEach(p => {
      if (p.life <= 0) return;
      alive = true;
      
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3; // gravity
      p.life -= 0.012;
      p.rotation += p.rotationSpeed;
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    
    if (alive) {
      animationId = requestAnimationFrame(animate);
    }
  }
  
  animate();
}
