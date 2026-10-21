// Turnout-inspired Page Margin Adjustment Dialog.
// Allows users to visually configure page margins with 8 draggable blue control handles,
// layout templates (Cornell notes, wide margins, header), background colors, and apply to
// either the current page or the entire note.
//
// Kinematics:
// Outward handle dragging expands margins; inward dragging shrinks margins.
// Max margin limit expanded to 2000px.
// Pointer capture prevents premature modal closure when mouse drifts outside card.

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
  }

  open() {
    this.close();
    this.build();
    document.body.appendChild(this.el);
  }

  close() {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }

  apply() {
    const pad = this.app.pages;
    if (!pad || !pad.length) {
      // If infinite, create a pad sheet
      this.app.pages = [{ w: 794, h: 1122, date: todayStamp() }];
    }

    const curIdx = this.app.currentPageIndex?.() || 0;
    const pages = this.app.pages.map((p, idx) => {
      if (this.scope === 'single' && idx !== curIdx) return p;
      // Adjust page width/height with margin expansion
      const baseW = p.baseW || p.w || 794;
      const baseH = p.baseH || p.h || 1122;
      const extraW = Math.max(0, this.margins.left + this.margins.right - 80);
      const extraH = Math.max(0, this.margins.top + this.margins.bottom - 80);
      return {
        ...p,
        baseW,
        baseH,
        w: baseW + extraW,
        h: baseH + extraH,
        margins: { ...this.margins },
        bg: this.color
      };
    });

    if (this.app.store) {
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
      style: 'background:var(--surface,#ffffff);color:var(--text,#111111);border-radius:18px;box-shadow:0 12px 36px rgba(0,0,0,0.28);border:1px solid var(--line,rgba(0,0,0,0.12));width:92%;max-width:440px;max-height:90vh;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:14px;font-family:inherit;'
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
      style: 'display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line,rgba(0,0,0,0.08));padding-bottom:12px;'
    }, btnCancel, title, btnConfirm);
    card.appendChild(headRow);

    // 2. Controls: Size dropdown
    const sizeSelect = h('select', {
      style: 'padding:4px 10px;border-radius:8px;border:1px solid var(--line,rgba(0,0,0,0.15));background:var(--surface-2,rgba(128,128,128,0.08));color:inherit;font-size:12.5px;font-weight:600;outline:none;'
    },
      h('option', { value: 'custom' }, t('Custom')),
      h('option', { value: 'a4' }, 'A4'),
      h('option', { value: 'letter' }, 'Letter'),
      h('option', { value: 'infinite' }, t('Infinite'))
    );
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
      { id: 'standard', title: 'Standard (Equal)', m: { left: 40, right: 40, top: 40, bottom: 40 }, icon: '◻' },
      { id: 'cornell', title: 'Cornell (Wide Left)', m: { left: 130, right: 30, top: 40, bottom: 40 }, icon: '▍◻' },
      { id: 'rightMargin', title: 'Wide Right', m: { left: 30, right: 130, top: 40, bottom: 40 }, icon: '◻▍' },
      { id: 'topHeader', title: 'Top Header', m: { left: 40, right: 40, top: 100, bottom: 40 }, icon: '▀◻' },
      { id: 'twoCol', title: 'Two Columns', m: { left: 30, right: 30, top: 40, bottom: 40 }, icon: '▥' }
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
          });
          return btn;
        })
      )
    );
    card.appendChild(tplRow);

    // 5. Interactive Visual Preview with 8 Draggable Blue Control Handles
    const previewContainer = h('div', {
      class: 'margin-preview-viewport',
      style: 'background:rgba(128,128,128,0.12);border-radius:12px;height:240px;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none;'
    });

    // The page box inside
    const pageBox = h('div', {
      style: 'background:#ffffff;border:1px solid rgba(0,0,0,0.18);box-shadow:0 4px 14px rgba(0,0,0,0.1);position:relative;transition:all 0.05s ease;'
    });

    // Inner writing content area
    const contentArea = h('div', {
      style: 'position:absolute;background:rgba(0,120,212,0.06);border:1px dashed rgba(0,120,212,0.4);display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(0,120,212,0.8);font-weight:600;'
    }, t('Writing Area'));
    pageBox.appendChild(contentArea);

    // 8 Blue control handles
    const handlePositions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const handles = {};
    for (const pos of handlePositions) {
      const hEl = h('div', {
        class: `drag-handle handle-${pos}`,
        style: 'position:absolute;width:12px;height:12px;border-radius:50%;background:#00e5ff;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;z-index:10;transform:translate(-50%,-50%);touch-action:none;'
      });
      handles[pos] = hEl;
      pageBox.appendChild(hEl);
    }

    const marginLabels = h('div', {
      style: 'position:absolute;bottom:6px;left:10px;font-size:10.5px;color:var(--text-2,rgba(128,128,128,0.9));font-variant-numeric:tabular-nums;'
    });
    previewContainer.appendChild(pageBox);
    previewContainer.appendChild(marginLabels);

    const updatePreviewBox = () => {
      // Content writing base dimensions in preview
      const contentW = 100, contentH = 130;
      const previewScale = 0.12;

      const leftPad = Math.max(2, Math.min(60, this.margins.left * previewScale));
      const rightPad = Math.max(2, Math.min(60, this.margins.right * previewScale));
      const topPad = Math.max(2, Math.min(45, this.margins.top * previewScale));
      const bottomPad = Math.max(2, Math.min(45, this.margins.bottom * previewScale));

      const pw = contentW + leftPad + rightPad;
      const ph = contentH + topPad + bottomPad;

      pageBox.style.width = `${pw}px`;
      pageBox.style.height = `${ph}px`;
      pageBox.style.backgroundColor = this.color === '#212529' ? '#25292e' : this.color;

      contentArea.style.left = `${leftPad}px`;
      contentArea.style.top = `${topPad}px`;
      contentArea.style.width = `${contentW}px`;
      contentArea.style.height = `${contentH}px`;

      // Position the 8 handles at outer page perimeter (intuitive outward dragging)
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

    // Wire dragging logic for the 8 handles:
    // Outward dragging EXPANDS margins; inward dragging SHRINKS margins.
    for (const [pos, handleEl] of Object.entries(handles)) {
      let startX = 0, startY = 0;
      let startM = { ...this.margins };

      const onPointerMove = (e) => {
        if (!isDragging) return;
        const dx = (e.clientX - startX);
        const dy = (e.clientY - startY);
        const dragScale = 0.5; // Smooth dragging sensitivity

        // Outward drag adds margin; inward subtracts
        if (pos.includes('w')) this.margins.left = Math.max(0, Math.min(MAX_MARGIN, Math.round(startM.left - dx / dragScale)));
        if (pos.includes('e')) this.margins.right = Math.max(0, Math.min(MAX_MARGIN, Math.round(startM.right + dx / dragScale)));
        if (pos.includes('n')) this.margins.top = Math.max(0, Math.min(MAX_MARGIN, Math.round(startM.top - dy / dragScale)));
        if (pos.includes('s')) this.margins.bottom = Math.max(0, Math.min(MAX_MARGIN, Math.round(startM.bottom + dy / dragScale)));

        updatePreviewBox();
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
    card.appendChild(previewContainer);

    // 6. Scope Radios (Apply to the entire note vs Apply to current page)
    const radioAll = h('input', { type: 'radio', name: 'marginScope', value: 'all', checked: true });
    radioAll.addEventListener('change', () => { if (radioAll.checked) this.scope = 'all'; });
    const radioSingle = h('input', { type: 'radio', name: 'marginScope', value: 'single' });
    radioSingle.addEventListener('change', () => { if (radioSingle.checked) this.scope = 'single'; });

    const scopeCol = h('div', {
      style: 'display:flex;flex-direction:column;gap:8px;padding-top:4px;'
    },
      h('label', { style: 'display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer;' },
        radioAll,
        h('span', { style: 'font-weight:600;' }, t('Apply to the entire note')),
        h('span', { style: 'font-size:11px;opacity:0.6;' }, t('(Include new page)'))
      ),
      h('label', { style: 'display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer;' },
        radioSingle,
        h('span', { style: 'font-weight:600;' }, t('Apply to current page only'))
      )
    );
    card.appendChild(scopeCol);

    backdrop.appendChild(card);
    backdrop.addEventListener('click', (e) => {
      // Guard: do not close if user is dragging or just released drag
      if (isDragging) return;
      if (e.target === backdrop) this.close();
    });

    this.el = backdrop;
  }
}
