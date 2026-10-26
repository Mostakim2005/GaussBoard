// Turnout-inspired Page Margin Adjustment Dialog.
// Allows users to visually configure page margins with 8 draggable blue control handles,
// manual numeric steppers (1-20 scale = 100-2000px), layout templates (Cornell notes, wide margins, header),
// background colors, target page navigation with canvas highlighting, and apply to either the current page or the entire note.

import { h } from './popover.js';
import { t } from '../i18n.js';
import { pageRects, todayStamp } from '../core/pages.js';

export const MAX_MARGIN = 2000;

export class PageMarginDialog {
  /**
   * @param {object} app Main application instance
   */
  constructor(app) {
    this.app = app;
    this.el = null;

    // Default margins
    this.margins = { left: 40, right: 40, top: 40, bottom: 40 };
    this.color = '#ffffff';
    this.style = 'blank';
    this.sizePreset = 'custom';
    this.scope = 'all'; // 'all' | 'single'
    this.curIdx = null;
    this.pageCount = 1;
  }

  open() {
    this.close();
    this.curIdx = typeof this.app?.currentPageIndex === 'function' ? Math.max(0, this.app.currentPageIndex()) : 0;
    const pad = this.app?.pages || [];
    this.pageCount = pad.length || 1;
    const curPage = pad[this.curIdx];
    if (curPage?.margins) {
      this.margins = {
        left: Number(curPage.margins.left ?? 40),
        right: Number(curPage.margins.right ?? 40),
        top: Number(curPage.margins.top ?? 40),
        bottom: Number(curPage.margins.bottom ?? 40)
      };
    }
    if (curPage?.bg || this.app?.store?.doc?.background?.color) {
      this.color = curPage?.bg || this.app.store.doc.background.color;
    }

    // Visually highlight the target page on the canvas
    if (typeof window !== 'undefined') window.__marginHighlightPage = this.curIdx;
    this.app?.surface?.invalidate?.();

    this.build();
    this._onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
      }
    };
    if (typeof window !== 'undefined') window.addEventListener('keydown', this._onKeyDown);
    document.body.appendChild(this.el);
  }

  close() {
    if (typeof window !== 'undefined') {
      window.__marginHighlightPage = null;
      if (this._onKeyDown) {
        window.removeEventListener('keydown', this._onKeyDown);
        this._onKeyDown = null;
      }
    }
    this.app?.surface?.invalidate?.();
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }

  apply() {
    if (this.sizePreset === 'infinite') {
      this.app.setInfiniteCanvas?.();
      this.close();
      return;
    }
    const pad = this.app.pages;
    if (!pad || !pad.length) {
      // If infinite, create a pad sheet
      this.app.pages = [{ w: 794, h: 1122, date: todayStamp() }];
    }

    const curIdx = this.curIdx ?? (this.app.currentPageIndex?.() || 0);
    const pages = this.app.pages.map((p, idx) => {
      if (this.scope === 'single' && idx !== curIdx) return p;
      // Adjust page width/height with margin expansion
      const presetW = this.sizePreset === 'letter' ? 816 : (this.sizePreset === 'a4' ? 794 : null);
      const presetH = this.sizePreset === 'letter' ? 1056 : (this.sizePreset === 'a4' ? 1122 : null);
      const baseW = presetW || p.baseW || (p.w && p.margins ? Math.max(100, p.w - (Number(p.margins.left) || 0) + 40 - (Number(p.margins.right) || 0) + 40) : null) || (p.w && p.w <= 1000 ? p.w : 794);
      const baseH = presetH || p.baseH || (p.h && p.margins ? Math.max(100, p.h - (Number(p.margins.top) || 0) + 40 - (Number(p.margins.bottom) || 0) + 40) : null) || (p.h && p.h <= 1300 ? p.h : 1122);
      const extraW = (this.margins.left - 40) + (this.margins.right - 40);
      const extraH = (this.margins.top - 40) + (this.margins.bottom - 40);
      return {
        ...p,
        baseW,
        baseH,
        w: Math.max(200, baseW + extraW),
        h: Math.max(200, baseH + extraH),
        margins: { ...this.margins },
        bg: this.color
      };
    });

    if (this.app.store) {
      pages._layout = this.spreadToggle?.checked ? 'spread' : 'vertical';
      const ops = [this.app.store.pagesOp(pages)];
      if (this.color && this.app.store.doc.background) {
        const before = { ...this.app.store.doc.background };
        ops.push({ t: 'doc', before: { background: before },
          after: { background: { ...before, color: this.color } } });
      }
      this.app.store.commit('page margin adjustment', ops);
    }

    this.app.surface?.invalidate?.();
    this.app.toast(this.scope === 'all' ? t('Page margins applied to entire note') : t('Page margins applied to current page'));
    this.close();
  }

  build() {
    let isDragging = false;

    const backdrop = h('div', {
      id: 'pageMarginModal',
      class: 'modal-backdrop',
      style: 'position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;user-select:none;'
    });

    const card = h('div', {
      class: 'margin-dialog-card',
      style: 'background:var(--surface,#ffffff);color:var(--text,#111111);border-radius:18px;box-shadow:0 12px 36px rgba(0,0,0,0.28);border:1px solid var(--line,rgba(0,0,0,0.12));width:92%;max-width:460px;max-height:92vh;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px;font-family:inherit;'
    });

    // 1. Header (Cancel - Title - Confirm)
    const btnCancel = h('button', {
      style: 'background:none;border:none;color:var(--text-2,rgba(128,128,128,0.9));font-size:14px;cursor:pointer;font-weight:600;',
      onclick: () => this.close()
    }, t('Cancel'));

    const title = h('h3', { style: 'margin:0;font-size:15px;font-weight:700;' }, t('Page margin adjustment'));

    const btnConfirm = h('button', {
      style: 'background:none;border:none;color:var(--accent,#0078d4);font-size:14px;cursor:pointer;font-weight:700;',
      onclick: () => this.apply()
    }, t('Confirm'));

    const headRow = h('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line,rgba(0,0,0,0.08));padding-bottom:10px;'
    }, btnCancel, title, btnConfirm);
    card.appendChild(headRow);

    // 1B. Target page switcher bar
    const pad = this.app?.pages || [];
    this.pageCount = pad.length || 1;
    const pageLabel = h('span', {
      style: 'font-size:12px;font-weight:700;color:var(--accent,#0078d4);'
    }, t('Target: Page {curr} of {total}', { curr: this.curIdx + 1, total: this.pageCount }));

    const btnPrevPage = h('button', {
      style: 'background:none;border:1px solid var(--line,rgba(0,0,0,0.15));border-radius:4px;padding:1px 7px;cursor:pointer;color:inherit;font-size:12px;',
      disabled: this.curIdx <= 0
    }, '‹');

    const btnNextPage = h('button', {
      style: 'background:none;border:1px solid var(--line,rgba(0,0,0,0.15));border-radius:4px;padding:1px 7px;cursor:pointer;color:inherit;font-size:12px;',
      disabled: this.curIdx >= this.pageCount - 1
    }, '›');

    const targetPageRow = h('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;background:rgba(0,120,212,0.08);padding:5px 10px;border-radius:8px;'
    },
      pageLabel,
      h('div', { style: 'display:flex;gap:4px;align-items:center;' }, btnPrevPage, btnNextPage)
    );

    const onSwitchPage = (newIdx) => {
      this.curIdx = Math.max(0, Math.min(this.pageCount - 1, newIdx));
      pageLabel.textContent = t('Target: Page {curr} of {total}', { curr: this.curIdx + 1, total: this.pageCount });
      btnPrevPage.disabled = this.curIdx <= 0;
      btnNextPage.disabled = this.curIdx >= this.pageCount - 1;

      const p = pad[this.curIdx];
      if (p?.margins) {
        this.margins = {
          left: Number(p.margins.left ?? 40),
          right: Number(p.margins.right ?? 40),
          top: Number(p.margins.top ?? 40),
          bottom: Number(p.margins.bottom ?? 40)
        };
      }
      if (typeof window !== 'undefined') window.__marginHighlightPage = this.curIdx;
      this.app?.fitToPage?.(this.curIdx);
      this.app?.surface?.invalidate?.();
      updatePreviewBox();
      syncManualInputs();
      if (singleLabelSpan) singleLabelSpan.textContent = t('Apply to Page {n} only', { n: this.curIdx + 1 });
    };

    btnPrevPage.addEventListener('click', () => onSwitchPage(this.curIdx - 1));
    btnNextPage.addEventListener('click', () => onSwitchPage(this.curIdx + 1));

    if (this.pageCount > 1) {
      card.appendChild(targetPageRow);
    }

    // 2. Controls: Size dropdown
    const sizeSelect = h('select', {
      style: 'padding:4px 10px;border-radius:8px;border:1px solid var(--line,rgba(0,0,0,0.15));background:var(--surface-2,rgba(128,128,128,0.08));color:inherit;font-size:12.5px;font-weight:600;outline:none;'
    },
      h('option', { value: 'custom' }, t('Custom')),
      h('option', { value: 'a4' }, 'A4'),
      h('option', { value: 'letter' }, 'Letter'),
      h('option', { value: 'infinite' }, t('Infinite'))
    );
    sizeSelect.value = this.sizePreset || 'custom';
    sizeSelect.addEventListener('change', () => {
      this.sizePreset = sizeSelect.value;
      updatePreviewBox();
    });
    const sizeRow = h('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;'
    }, h('span', { style: 'font-size:13px;font-weight:600;' }, t('Size')), sizeSelect);
    card.appendChild(sizeRow);

    // 3. Color chips
    const colors = ['#ffffff', '#fcf9f2', '#fdfbe8', '#f0f3f6', '#212529'];
    const colorRow = h('div', { style: 'display:flex;align-items:center;justify-content:space-between;' },
      h('span', { style: 'font-size:13px;font-weight:600;' }, t('Color')),
      h('div', { style: 'display:flex;gap:8px;' },
        ...colors.map((c) => {
          const chip = h('button', {
            style: `width:22px;height:22px;border-radius:50%;background:${c};border:2px solid ${this.color === c ? 'var(--accent,#0078d4)' : 'rgba(0,0,0,0.15)'};cursor:pointer;outline:none;`
          });
          chip.addEventListener('click', () => {
            this.color = c;
            for (const el of colorRow.querySelectorAll('button')) el.style.borderColor = 'rgba(0,0,0,0.15)';
            chip.style.borderColor = 'var(--accent,#0078d4)';
            updatePreviewBox();
          });
          return chip;
        })
      )
    );
    card.appendChild(colorRow);

    // 4. Template presets
    const templates = [
      { id: 'standard', title: t('Standard (Equal)'), m: { left: 40, right: 40, top: 40, bottom: 40 }, icon: '◻' },
      { id: 'cornell', title: t('Cornell (Wide Left)'), m: { left: 130, right: 30, top: 40, bottom: 40 }, icon: '▍◻' },
      { id: 'turnout', title: t('Turnout Gutter (+160px)'), m: { left: 160, right: 40, top: 40, bottom: 40 }, icon: '◨' },
      { id: 'rightMargin', title: t('Wide Right'), m: { left: 30, right: 130, top: 40, bottom: 40 }, icon: '◻▍' },
      { id: 'topHeader', title: t('Top Header'), m: { left: 40, right: 40, top: 100, bottom: 40 }, icon: '▀◻' },
      { id: 'twoCol', title: t('Two Columns'), m: { left: 30, right: 30, top: 40, bottom: 40 }, icon: '▥' }
    ];

    const tplRow = h('div', { style: 'display:flex;align-items:center;justify-content:space-between;' },
      h('span', { style: 'font-size:13px;font-weight:600;' }, t('Template')),
      h('div', { style: 'display:flex;gap:6px;' },
        ...templates.map((tpl) => {
          const btn = h('button', {
            title: tpl.title,
            style: 'padding:4px 8px;border-radius:8px;border:1px solid var(--line,rgba(0,0,0,0.15));background:var(--surface-2,rgba(128,128,128,0.08));color:inherit;cursor:pointer;font-size:13px;font-weight:700;'
          }, tpl.icon);
          btn.addEventListener('click', () => {
            this.margins = { ...tpl.m };
            for (const el of tplRow.querySelectorAll('button')) el.style.borderColor = 'var(--line,rgba(0,0,0,0.15))';
            btn.style.borderColor = 'var(--accent,#0078d4)';
            updatePreviewBox();
            syncManualInputs();
          });
          return btn;
        })
      )
    );
    card.appendChild(tplRow);

    const spreadToggle = h('input', {
      type: 'checkbox',
      checked: this.app?.store?.doc?.pages?._layout === 'spread',
      style: 'cursor:pointer;'
    });
    this.spreadToggle = spreadToggle;
    const spreadRow = h('label', {
      style: 'display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-size:13px;font-weight:600;'
    }, h('span', {}, t('2-Page Book Spread (Reading View)')), spreadToggle);
    card.appendChild(spreadRow);

    // 5. Interactive Visual Preview with 8 Draggable Blue Control Handles
    const previewContainer = h('div', {
      class: 'margin-preview-viewport',
      style: 'background:rgba(128,128,128,0.12);border-radius:12px;height:230px;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none;'
    });

    const pageBox = h('div', {
      style: 'background:#ffffff;border:1px solid rgba(0,0,0,0.18);box-shadow:0 4px 14px rgba(0,0,0,0.1);position:relative;transition:all 0.05s ease;'
    });

    const contentArea = h('div', {
      style: 'position:absolute;background:rgba(0,120,212,0.06);border:1px dashed rgba(0,120,212,0.6);display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(0,120,212,0.9);font-weight:700;'
    }, t('Writing Area'));
    pageBox.appendChild(contentArea);

    const handlePositions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const handles = {};
    for (const pos of handlePositions) {
      const hEl = h('div', {
        class: `drag-handle handle-${pos}`,
        style: 'position:absolute;width:12px;height:12px;border-radius:50%;background:#00e5ff;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:pointer;z-index:10;transform:translate(-50%,-50%);touch-action:none;'
      });
      handles[pos] = hEl;
      pageBox.appendChild(hEl);
    }

    const marginLabels = h('div', {
      style: 'position:absolute;bottom:5px;left:10px;font-size:10.5px;color:var(--text-2,rgba(128,128,128,0.9));font-variant-numeric:tabular-nums;font-weight:600;'
    });
    previewContainer.appendChild(pageBox);
    previewContainer.appendChild(marginLabels);

    const updatePreviewBox = () => {
      // Proportional scale responsive all the way up to 2000px
      const baseW = 794, baseH = 1122;
      const totalW = baseW + this.margins.left + this.margins.right;
      const totalH = baseH + this.margins.top + this.margins.bottom;
      const scale = Math.min(270 / totalW, 165 / totalH);

      const pw = Math.max(60, Math.round(totalW * scale));
      const ph = Math.max(80, Math.round(totalH * scale));

      pageBox.style.width = `${pw}px`;
      pageBox.style.height = `${ph}px`;
      pageBox.style.backgroundColor = this.color === '#212529' ? '#25292e' : this.color;

      const leftPad = Math.round(this.margins.left * scale);
      const topPad = Math.round(this.margins.top * scale);
      const cw = Math.round(baseW * scale);
      const ch = Math.round(baseH * scale);

      contentArea.style.left = `${leftPad}px`;
      contentArea.style.top = `${topPad}px`;
      contentArea.style.width = `${cw}px`;
      contentArea.style.height = `${ch}px`;

      handles.nw.style.left = `0px`; handles.nw.style.top = `0px`;
      handles.n.style.left = `${pw / 2}px`; handles.n.style.top = `0px`;
      handles.ne.style.left = `${pw}px`; handles.ne.style.top = `0px`;
      handles.e.style.left = `${pw}px`; handles.e.style.top = `${ph / 2}px`;
      handles.se.style.left = `${pw}px`; handles.se.style.top = `${ph}px`;
      handles.s.style.left = `${pw / 2}px`; handles.s.style.top = `${ph}px`;
      handles.sw.style.left = `0px`; handles.sw.style.top = `${ph}px`;
      handles.w.style.left = `0px`; handles.w.style.top = `${ph / 2}px`;

      marginLabels.textContent = `Left: ${this.margins.left}px · Right: ${this.margins.right}px · Top: ${this.margins.top}px · Bottom: ${this.margins.bottom}px`;
    };

    // 5B. Manual Numeric Inputs (1–20 Scale: 1 = 100px, 5 = 500px, 10 = 1000px, 20 = 2000px)
    const createStepInput = (label, getVal, setVal) => {
      const input = h('input', {
        type: 'number',
        min: '0',
        max: '20',
        step: '0.5',
        value: (getVal() / 100).toFixed(1).replace(/\.0$/, ''),
        style: 'width:55px;padding:3px 6px;text-align:center;border-radius:6px;border:1px solid var(--line,rgba(0,0,0,0.18));background:var(--surface-2,rgba(128,128,128,0.08));color:inherit;font-size:12px;font-weight:700;'
      });
      const pxBadge = h('span', {
        style: 'font-size:10px;color:var(--text-2,rgba(128,128,128,0.7));min-width:42px;text-align:right;'
      }, `${getVal()}px`);

      input.addEventListener('input', () => {
        const num = parseFloat(input.value) || 0;
        const px = Math.max(0, Math.min(MAX_MARGIN, Math.round(num * 100)));
        setVal(px);
        pxBadge.textContent = `${px}px`;
        updatePreviewBox();
      });

      return {
        wrapper: h('div', {
          style: 'display:flex;align-items:center;justify-content:space-between;background:var(--surface-2,rgba(128,128,128,0.04));border:1px solid var(--line,rgba(0,0,0,0.08));padding:3px 8px;border-radius:8px;'
        },
          h('span', { style: 'font-size:11.5px;font-weight:600;' }, label),
          h('div', { style: 'display:flex;align-items:center;gap:4px;' }, input, pxBadge)
        ),
        sync: () => {
          const val = getVal();
          input.value = (val / 100).toFixed(1).replace(/\.0$/, '');
          pxBadge.textContent = `${val}px`;
        }
      };
    };

    const inputUniform = createStepInput(t('Uniform All (1–20):'),
      () => Math.round((this.margins.left + this.margins.right + this.margins.top + this.margins.bottom) / 4),
      (px) => {
        this.margins.left = px;
        this.margins.right = px;
        this.margins.top = px;
        this.margins.bottom = px;
        inputLeft.sync(); inputRight.sync(); inputTop.sync(); inputBottom.sync();
      }
    );

    const inputLeft = createStepInput(t('Left:'), () => this.margins.left, (px) => { this.margins.left = px; inputUniform.sync(); });
    const inputRight = createStepInput(t('Right:'), () => this.margins.right, (px) => { this.margins.right = px; inputUniform.sync(); });
    const inputTop = createStepInput(t('Top:'), () => this.margins.top, (px) => { this.margins.top = px; inputUniform.sync(); });
    const inputBottom = createStepInput(t('Bottom:'), () => this.margins.bottom, (px) => { this.margins.bottom = px; inputUniform.sync(); });

    const syncManualInputs = () => {
      inputUniform.sync();
      inputLeft.sync();
      inputRight.sync();
      inputTop.sync();
      inputBottom.sync();
    };

    const manualInputsSection = h('div', {
      class: 'margin-manual-steppers',
      style: 'display:flex;flex-direction:column;gap:6px;'
    },
      inputUniform.wrapper,
      h('div', {
        style: 'display:grid;grid-template-columns:1fr 1fr;gap:6px;'
      }, inputLeft.wrapper, inputRight.wrapper, inputTop.wrapper, inputBottom.wrapper),
      h('div', {
        style: 'font-size:10px;color:var(--text-2,rgba(128,128,128,0.7));text-align:right;'
      }, t('Scale: 1 = 100px · 5 = 500px · 10 = 1000px · 20 = 2000px'))
    );

    // Wire dragging logic for the 8 handles
    for (const [pos, handleEl] of Object.entries(handles)) {
      let startX = 0, startY = 0;
      let startM = { ...this.margins };

      const onPointerMove = (e) => {
        if (!isDragging) return;
        const dx = (e.clientX - startX);
        const dy = (e.clientY - startY);
        const dragScale = 0.5;

        if (pos.includes('w')) this.margins.left = Math.max(0, Math.min(MAX_MARGIN, Math.round(startM.left - dx / dragScale)));
        if (pos.includes('e')) this.margins.right = Math.max(0, Math.min(MAX_MARGIN, Math.round(startM.right + dx / dragScale)));
        if (pos.includes('n')) this.margins.top = Math.max(0, Math.min(MAX_MARGIN, Math.round(startM.top - dy / dragScale)));
        if (pos.includes('s')) this.margins.bottom = Math.max(0, Math.min(MAX_MARGIN, Math.round(startM.bottom + dy / dragScale)));

        updatePreviewBox();
        syncManualInputs();
      };

      const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        try { handleEl.releasePointerCapture(e.pointerId); } catch {}
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      handleEl.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isDragging = true;
        try { handleEl.setPointerCapture(e.pointerId); } catch {}
        startX = e.clientX;
        startY = e.clientY;
        startM = { ...this.margins };
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
      });
    }

    updatePreviewBox();
    syncManualInputs();
    card.appendChild(previewContainer);
    card.appendChild(manualInputsSection);

    // 6. Scope Radios
    const radioAll = h('input', { type: 'radio', name: 'marginScope', value: 'all', checked: true });
    radioAll.addEventListener('change', () => { if (radioAll.checked) this.scope = 'all'; });
    const radioSingle = h('input', { type: 'radio', name: 'marginScope', value: 'single' });
    radioSingle.addEventListener('change', () => { if (radioSingle.checked) this.scope = 'single'; });

    let singleLabelSpan = h('span', { style: 'font-weight:600;' }, t('Apply to Page {n} only', { n: this.curIdx + 1 }));

    const scopeCol = h('div', {
      style: 'display:flex;flex-direction:column;gap:6px;padding-top:2px;'
    },
      h('label', { style: 'display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer;' },
        radioAll,
        h('span', { style: 'font-weight:600;' }, t('Apply to the entire note')),
        h('span', { style: 'font-size:11px;opacity:0.6;' }, t('({n} pages)', { n: this.pageCount }))
      ),
      h('label', { style: 'display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer;' },
        radioSingle,
        singleLabelSpan
      )
    );
    card.appendChild(scopeCol);

    backdrop.appendChild(card);
    backdrop.addEventListener('click', (e) => {
      if (isDragging) return;
      if (e.target === backdrop) this.close();
    });

    this.el = backdrop;
  }
}
