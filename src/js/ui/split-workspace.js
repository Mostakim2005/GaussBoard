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
      style: `position:relative;flex:none;width:${(this.ratio * 100).toFixed(1)}%;height:100%;overflow:hidden;background:var(--desk,#f0f0f0);`
    });

    // Vertical resizable divider
    this.divider = h('div', {
      id: 'splitDivider',
      class: 'split-divider',
      title: 'Drag to resize panes',
      style: 'flex:none;width:6px;height:100%;cursor:col-resize;background:var(--line,rgba(0,0,0,0.18));z-index:50;touch-action:none;'
    });

    // Right pane (Primary note-taking canvas)
    this.rightPane = h('div', {
      id: 'stageRight',
      class: 'split-pane split-right',
      style: 'position:relative;flex:1;height:100%;overflow:hidden;'
    });

    // Left secondary canvas
    const cLeft = document.createElement('canvas');
    cLeft.id = 'cLeft';
    cLeft.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    this.leftPane.appendChild(cLeft);

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
}
