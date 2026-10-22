'use strict';

/**
 * Limit URLs handed to the operating system to ordinary web pages. In
 * particular, never let board text invoke file:, javascript:, or an arbitrary
 * registered desktop protocol through Electron's shell bridge.
 */
function safeExternalUrl(value) {
  if (typeof value !== 'string' || value.length > 8192 || /[\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

/** Permit only the configured GitHub releases page and its subpaths. */
function isReleaseUrl(value, releasesUrl) {
  if (typeof value !== 'string' || typeof releasesUrl !== 'string') return false;
  try {
    const actual = new URL(value);
    const base = new URL(releasesUrl);
    if (actual.protocol !== 'https:' || actual.origin !== base.origin
      || actual.username || actual.password || actual.search || actual.hash) return false;
    const root = base.pathname.replace(/\/$/, '');
    return actual.pathname === root || actual.pathname.startsWith(`${root}/`);
  } catch { return false; }
}

module.exports = { safeExternalUrl, isReleaseUrl };
