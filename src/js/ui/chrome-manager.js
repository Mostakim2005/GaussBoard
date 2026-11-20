/**
 * Workspace Chrome Coordinator (src/js/ui/chrome-manager.js)
 *
 * Prevents floating custom toolbars and left-edge drawers from piling on top
 * of each other, and provides a 1-key Zen / Focus Mode toggle (F10 or Ctrl+\)
 * to hide/restore surrounding chrome while inking.
 */

const ZEN_SELECTORS = [
  '.gb-tab-bar',
  '.sidebar-ribbon',
  '.sidebar-ribbon-latch',
  '.replay-bar-hud',
  '#pagestrip',
  '#pdfSidebarDrawer',
  '#zoombar',
  '#pagebar'
];

export class ChromeManager {
  constructor(app) {
    this.app = app;
    this.zenMode = false;
    this._leftDrawers = new Map();
    this._savedDisplay = new Map();
  }

  /** Register a left-edge drawer so opening one collapses competing drawers. */
  registerLeftDrawer(name, closeFn) {
    if (name && typeof closeFn === 'function') {
      this._leftDrawers.set(name, closeFn);
    }
  }

  /** Called when a left-edge drawer opens; closes all other registered left drawers. */
  notifyLeftOpen(activeName) {
    for (const [name, closeFn] of this._leftDrawers.entries()) {
      if (name !== activeName) {
        try { closeFn(); } catch { /* ignore individual drawer errors */ }
      }
    }
  }

  /** Hide or restore surrounding workspace chrome for distraction-free inking. */
  toggleZenMode(force) {
    const next = typeof force === 'boolean' ? force : !this.zenMode;
    if (next === this.zenMode) return this.zenMode;
    this.zenMode = next;
    if (typeof document === 'undefined') return this.zenMode;

    if (this.zenMode) {
      this._savedDisplay.clear();
      for (const sel of ZEN_SELECTORS) {
        for (const el of document.querySelectorAll(sel)) {
          this._savedDisplay.set(el, el.style.display);
          el.style.display = 'none';
        }
      }
    } else {
      for (const [el, prev] of this._savedDisplay.entries()) {
        if (el && el.style) el.style.display = prev;
      }
      this._savedDisplay.clear();
    }
    return this.zenMode;
  }
}
