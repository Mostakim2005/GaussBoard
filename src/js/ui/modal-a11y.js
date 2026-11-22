// Shared modal accessibility helper: ARIA dialog attributes, Escape dismissal,
// Tab/Shift+Tab focus trap, and focus restoration to the triggering element.

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Bind accessible dialog behavior to a modal element when opened.
 * Returns a cleanup function that releases listeners and restores previous focus.
 */
export function bindModalA11y(modalEl, { onClose, label } = {}) {
  if (!modalEl || typeof document === 'undefined') return () => {};

  const prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (!modalEl.hasAttribute('role')) modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  if (label && !modalEl.hasAttribute('aria-label')) modalEl.setAttribute('aria-label', label);

  const getFocusable = () =>
    Array.from(modalEl.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = getFocusable();
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || !modalEl.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last || !modalEl.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  };

  window.addEventListener('keydown', onKeyDown, true);

  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener('keydown', onKeyDown, true);
    if (prevFocus && prevFocus.isConnected) {
      try { prevFocus.focus(); } catch {}
    }
  };
}
