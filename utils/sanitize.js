/**
 * HTML escaping to prevent XSS when rendering dynamic content.
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

export function escapeAttr(text) {
  return escapeHtml(text).replace(/`/g, '&#96;');
}

/**
 * Strip script tags and event handlers from HTML strings.
 * Used as defense-in-depth for content authored externally.
 */
export function sanitizeHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}
