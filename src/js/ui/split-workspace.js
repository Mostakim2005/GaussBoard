// Dual-viewport Split Study Workspace.
// Hosts two independent document/camera/surface viewports side-by-side in the DOM.

import { h } from './popover.js';
import { Surface } from '../core/surface.js';
import { Store } from '../core/store.js';
import { Interaction } from '../core/tools.js';
import { t } from '../i18n.js';

export class SplitWorkspace {
  /**
   * @param {object} app The main application instance
   * @param {HTMLElement} [host] Container element (defaults to #stage)
   */
  constructor(app, host = null) {
    this.app = app;
    this.host = host || (typeof document !== 'undefined' ? document.getElementById('stage') : null);
    this.enabled = false;
    this.ratio = 0.5; // 0.2 to 0.8
    this.wrapper = null;
    this.leftPane = null;
    this.rightPane = null;
    this.divider = null;
    this.leftStore = null;
    this.leftSurface = null;
    this.leftInteraction = null;
    this.primaryCanvas = null;
    this.originalCanvasParent = null;
    this.originalCanvasNextSibling = null;
  }

  get active() {
    return this.enabled;
  }

  /**
   * Mount dual-viewport workspace layout.
   */
  enable({ leftBoardData = null, ratio = 0.5 } = {}) {
    if (this.enabled) return;
    if (typeof document === 'undefined') {
      this.enabled = true;
      return;
    }

    this.host = this.host || document.getElementById('stage');
    if (!this.host) return;

    this.primaryCanvas = document.getElementById('c');
    if (!this.primaryCanvas) return;

    this.ratio = Math.max(0.2, Math.min(0.8, ratio));

    // Stash original parent & sibling to restore on disable
    this.originalCanvasParent = this.primaryCanvas.parentNode;
    this.originalCanvasNextSibling = this.primaryCanvas.nextSibling;

    // Create wrapper layout
    this.wrapper = h('div', {
      id: 'splitWorkspace',
      class: 'split-workspace',
      style: 'position:absolute;inset:0;display:flex;width:100%;height:100%;overflow:hidden;z-index:2;'
    });

    // Left pane (Reference deck / PDF)
    this.leftPane = h('div', {
      id: 'stageLeft',
      class: 'split-pane split-left',
      style: `position:relative;flex:none;width:${(this.ratio * 100).toFixed(1)}%;height:100%;overflow:hidden;background:var(--desk,#f0f0f0);display:flex;flex-direction:column;`
    });

    // Left pane top header
    this.boardSelect = h('select', {
      class: 'split-board-select',
      style: 'flex:1;max-width:240px;padding:4px 8px;border-radius:8px;border:1px solid var(--line,rgba(0,0,0,0.15));background:var(--surface,#ffffff);color:inherit;font-size:12px;outline:none;'
    }, h('option', { value: '' }, t('-- Select Board to Study --')));

    this.boardSelect.addEventListener('change', (e) => {
      const id = e.target.value;
      if (id) this.loadLeftBoard(id);
    });

    const btnSwap = h('button', {
      title: t('Swap left and right boards'),
      style: 'background:none;border:none;cursor:pointer;padding:4px;color:inherit;display:flex;align-items:center;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/></svg>'
    });
    btnSwap.addEventListener('click', () => this.swapPanes());

    const btnCloseSplit = h('button', {
      title: t('Close split view'),
      style: 'background:none;border:none;cursor:pointer;padding:4px;color:inherit;display:flex;align-items:center;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    });
    btnCloseSplit.addEventListener('click', () => this.disable());

    const leftHeader = h('div', {
      class: 'split-left-header',
      style: 'height:36px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;background:var(--surface,#ffffff);border-bottom:1px solid var(--line,rgba(0,0,0,0.1));z-index:10;'
    }, this.boardSelect, h('div', { style: 'display:flex;gap:4px;' }, btnSwap, btnCloseSplit));

    // Left canvas viewport wrapper
    const canvasWrap = h('div', {
      style: 'position:relative;flex:1;width:100%;height:100%;overflow:hidden;'
    });

    // Left secondary canvas
    const cLeft = document.createElement('canvas');
    cLeft.id = 'cLeft';
    cLeft.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
    canvasWrap.appendChild(cLeft);

    this.leftPane.appendChild(leftHeader);
    this.leftPane.appendChild(canvasWrap);

    // Divider
    this.divider = h('div', {
      class: 'split-divider',
      style: 'width:6px;background:var(--line,rgba(0,0,0,0.15));cursor:col-resize;user-select:none;touch-action:none;position:relative;z-index:10;'
    });

    // Right pane (Primary canvas)
    this.rightPane = h('div', {
      id: 'stageRight',
      class: 'split-pane split-right',
      style: 'position:relative;flex:1;height:100%;overflow:hidden;'
    });

    // Reparent primary canvas into right pane
    this.rightPane.appendChild(this.primaryCanvas);

    this.wrapper.appendChild(this.leftPane);
    this.wrapper.appendChild(this.divider);
    this.wrapper.appendChild(this.rightPane);
    this.host.appendChild(this.wrapper);

    // Initialize left subsystem
    this.leftStore = new Store();
    if (leftBoardData) {
      this.leftStore.load(leftBoardData);
    }
    this.leftSurface = new Surface(cLeft, this.leftStore, { lowLatency: false });
    this.leftSurface.resize();

    // Wire divider drag interaction
    this.wireDivider(this.divider);

    // Wire pan and zoom navigation on left canvas
    this.wireLeftCanvasNavigation(cLeft);

    // Populate board list dropdown
    this.populateBoardDropdown();

    // Update primary canvas surface size
    if (this.app?.surface) {
      this.app.surface.resize();
    }

    this.enabled = true;
  }

  /**
   * Dismantle dual-viewport and restore single canvas layout.
   */
  disable() {
    if (!this.enabled) return;

    if (this.leftSurface) {
      this.leftSurface.stop?.();
      this.leftSurface = null;
    }
    this.leftStore = null;

    if (this.primaryCanvas && this.originalCanvasParent) {
      if (this.originalCanvasNextSibling && typeof this.originalCanvasParent.insertBefore === 'function') {
        this.originalCanvasParent.insertBefore(this.primaryCanvas, this.originalCanvasNextSibling);
      } else if (typeof this.originalCanvasParent.appendChild === 'function') {
        this.originalCanvasParent.appendChild(this.primaryCanvas);
      }
    }

    if (this.wrapper) {
      if (typeof this.wrapper.remove === 'function') {
        this.wrapper.remove();
      } else if (this.wrapper.parentNode && typeof this.wrapper.parentNode.removeChild === 'function') {
        this.wrapper.parentNode.removeChild(this.wrapper);
      }
      this.wrapper = null;
    }

    this.leftPane = null;
    this.rightPane = null;
    this.divider = null;

    if (this.app?.surface) {
      this.app.surface.resize();
    }

    this.enabled = false;
  }

  toggle(opts = {}) {
    if (this.enabled) this.disable();
    else this.enable(opts);
  }

  setRatio(r) {
    this.ratio = Math.max(0.2, Math.min(0.8, r));
    if (this.leftPane) {
      this.leftPane.style.width = `${(this.ratio * 100).toFixed(1)}%`;
    }
    if (this.leftSurface) this.leftSurface.resize();
    if (this.app?.surface) this.app.surface.resize();
  }

  wireDivider(divider) {
    if (!divider) return;
    let dragging = false;

    const onPointerMove = (e) => {
      if (!dragging || !this.wrapper) return;
      const rect = this.wrapper.getBoundingClientRect();
      if (rect.width <= 0) return;
      const x = e.clientX - rect.left;
      this.setRatio(x / rect.width);
    };

    const onPointerUp = (e) => {
      if (!dragging) return;
      dragging = false;
      try { divider.releasePointerCapture(e.pointerId); } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    divider.addEventListener('pointerdown', (e) => {
      dragging = true;
      try { divider.setPointerCapture(e.pointerId); } catch {}
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });
  }

  /**
   * Swap left and right board documents.
   */
  swapPanes() {
    if (!this.enabled || !this.leftStore || !this.app?.store) return;
    const leftData = this.leftStore.toJSON();
    const rightData = this.app.store.toJSON();

    this.leftStore.load(rightData);
    this.app.loadBoard(leftData, { asCopy: false });

    if (this.leftSurface) this.leftSurface.repaintAll();
    if (this.app.surface) this.app.surface.repaintAll();
  }

  async populateBoardDropdown() {
    if (!this.boardSelect) return;
    try {
      if (window.board?.boards?.list) {
        const list = await window.board.boards.list();
        for (const b of list) {
          const opt = document.createElement('option');
          opt.value = b.id;
          opt.textContent = b.name || b.title || t('Untitled');
          this.boardSelect.appendChild(opt);
        }
      }
    } catch {}
  }

  async loadLeftBoard(id) {
    if (!id || !this.leftStore) return;
    try {
      let data = null;
      if (typeof window.board?.boards?.load === 'function') {
        data = await window.board.boards.load(id);
      } else if (typeof window.board?.boards?.get === 'function') {
        data = await window.board.boards.get(id);
      } else if (this.app?.storage?.load) {
        data = await this.app.storage.load(id);
      }
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch {}
      }
      if (data) {
        this.leftStore.load(data);
        if (this.leftSurface) {
          this.leftSurface.cam.reset?.();
          this.leftSurface.repaintAll();
        }
        if (this.boardSelect) this.boardSelect.value = id;
      }
    } catch (err) {
      this.app?.toast?.(t('Failed to load board: {msg}', { msg: err.message }));
    }
  }

  wireLeftCanvasNavigation(cLeft) {
    if (!cLeft) return;

    cLeft.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!this.leftSurface) return;
      const cam = this.leftSurface.cam;
      if (e.ctrlKey) {
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        cam.zoomAt?.(factor, e.clientX, e.clientY);
      } else {
        cam.pan?.(-e.deltaX, -e.deltaY);
      }
      this.leftSurface.repaintAll();
    }, { passive: false });

    let leftPanning = false, startX = 0, startY = 0;
    cLeft.addEventListener('pointerdown', (e) => {
      if (e.button === 0 || e.button === 1) {
        leftPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        try { cLeft.setPointerCapture(e.pointerId); } catch {}
      }
    });

    cLeft.addEventListener('pointermove', (e) => {
      if (!leftPanning || !this.leftSurface) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;
      this.leftSurface.cam.pan?.(dx, dy);
      this.leftSurface.repaintAll();
    });

    const endLeftPan = (e) => {
      if (leftPanning) {
        leftPanning = false;
        try { cLeft.releasePointerCapture(e.pointerId); } catch {}
      }
    };
    cLeft.addEventListener('pointerup', endLeftPan);
    cLeft.addEventListener('pointercancel', endLeftPan);
  }
}
