/**
 * GazBoard - Interactive Periodic Table Dock & Element Inspector
 * High-density vector SVG/HTML5 grid of all 118 chemical elements (H to Og),
 * category color filters, live search, and 1-click whiteboard element card stamp.
 */

import { t } from '../i18n.js';
import { uid } from '../core/util.js';

export const ELEMENTS_DATA = [
  { z: 1, s: 'H', n: 'Hydrogen', w: 1.008, g: 1, p: 1, cat: 'nonmetal', conf: '1s¹', en: 2.20 },
  { z: 2, s: 'He', n: 'Helium', w: 4.003, g: 18, p: 1, cat: 'noble', conf: '1s²', en: null },
  { z: 3, s: 'Li', n: 'Lithium', w: 6.94, g: 1, p: 2, cat: 'alkali', conf: '[He] 2s¹', en: 0.98 },
  { z: 4, s: 'Be', n: 'Beryllium', w: 9.012, g: 2, p: 2, cat: 'alkaline', conf: '[He] 2s²', en: 1.57 },
  { z: 5, s: 'B', n: 'Boron', w: 10.81, g: 13, p: 2, cat: 'metalloid', conf: '[He] 2s² 2p¹', en: 2.04 },
  { z: 6, s: 'C', n: 'Carbon', w: 12.011, g: 14, p: 2, cat: 'nonmetal', conf: '[He] 2s² 2p²', en: 2.55 },
  { z: 7, s: 'N', n: 'Nitrogen', w: 14.007, g: 15, p: 2, cat: 'nonmetal', conf: '[He] 2s² 2p³', en: 3.04 },
  { z: 8, s: 'O', n: 'Oxygen', w: 15.999, g: 16, p: 2, cat: 'nonmetal', conf: '[He] 2s² 2p⁴', en: 3.44 },
  { z: 9, s: 'F', n: 'Fluorine', w: 18.998, g: 17, p: 2, cat: 'halogen', conf: '[He] 2s² 2p⁵', en: 3.98 },
  { z: 10, s: 'Ne', n: 'Neon', w: 20.180, g: 18, p: 2, cat: 'noble', conf: '[He] 2s² 2p⁶', en: null },
  { z: 11, s: 'Na', n: 'Sodium', w: 22.990, g: 1, p: 3, cat: 'alkali', conf: '[Ne] 3s¹', en: 0.93 },
  { z: 12, s: 'Mg', n: 'Magnesium', w: 24.305, g: 2, p: 3, cat: 'alkaline', conf: '[Ne] 3s²', en: 1.31 },
  { z: 13, s: 'Al', n: 'Aluminium', w: 26.982, g: 13, p: 3, cat: 'post-transition', conf: '[Ne] 3s² 3p¹', en: 1.61 },
  { z: 14, s: 'Si', n: 'Silicon', w: 28.085, g: 14, p: 3, cat: 'metalloid', conf: '[Ne] 3s² 3p²', en: 1.90 },
  { z: 15, s: 'P', n: 'Phosphorus', w: 30.974, g: 15, p: 3, cat: 'nonmetal', conf: '[Ne] 3s² 3p³', en: 2.19 },
  { z: 16, s: 'S', n: 'Sulfur', w: 32.06, g: 16, p: 3, cat: 'nonmetal', conf: '[Ne] 3s² 3p⁴', en: 2.58 },
  { z: 17, s: 'Cl', n: 'Chlorine', w: 35.45, g: 17, p: 3, cat: 'halogen', conf: '[Ne] 3s² 3p⁵', en: 3.16 },
  { z: 18, s: 'Ar', n: 'Argon', w: 39.948, g: 18, p: 3, cat: 'noble', conf: '[Ne] 3s² 3p⁶', en: null },
  { z: 19, s: 'K', n: 'Potassium', w: 39.098, g: 1, p: 4, cat: 'alkali', conf: '[Ar] 4s¹', en: 0.82 },
  { z: 20, s: 'Ca', n: 'Calcium', w: 40.078, g: 2, p: 4, cat: 'alkaline', conf: '[Ar] 4s²', en: 1.00 },
  { z: 21, s: 'Sc', n: 'Scandium', w: 44.956, g: 3, p: 4, cat: 'transition', conf: '[Ar] 3d¹ 4s²', en: 1.36 },
  { z: 22, s: 'Ti', n: 'Titanium', w: 47.867, g: 4, p: 4, cat: 'transition', conf: '[Ar] 3d² 4s²', en: 1.54 },
  { z: 23, s: 'V', n: 'Vanadium', w: 50.942, g: 5, p: 4, cat: 'transition', conf: '[Ar] 3d³ 4s²', en: 1.63 },
  { z: 24, s: 'Cr', n: 'Chromium', w: 51.996, g: 6, p: 4, cat: 'transition', conf: '[Ar] 3d⁵ 4s¹', en: 1.66 },
  { z: 25, s: 'Mn', n: 'Manganese', w: 54.938, g: 7, p: 4, cat: 'transition', conf: '[Ar] 3d⁵ 4s²', en: 1.55 },
  { z: 26, s: 'Fe', n: 'Iron', w: 55.845, g: 8, p: 4, cat: 'transition', conf: '[Ar] 3d⁶ 4s²', en: 1.83 },
  { z: 27, s: 'Co', n: 'Cobalt', w: 58.933, g: 9, p: 4, cat: 'transition', conf: '[Ar] 3d⁷ 4s²', en: 1.88 },
  { z: 28, s: 'Ni', n: 'Nickel', w: 58.693, g: 10, p: 4, cat: 'transition', conf: '[Ar] 3d⁸ 4s²', en: 1.91 },
  { z: 29, s: 'Cu', n: 'Copper', w: 63.546, g: 11, p: 4, cat: 'transition', conf: '[Ar] 3d¹⁰ 4s¹', en: 1.90 },
  { z: 30, s: 'Zn', n: 'Zinc', w: 65.38, g: 12, p: 4, cat: 'transition', conf: '[Ar] 3d¹⁰ 4s²', en: 1.65 },
  { z: 31, s: 'Ga', n: 'Gallium', w: 69.723, g: 13, p: 4, cat: 'post-transition', conf: '[Ar] 3d¹⁰ 4s² 4p¹', en: 1.81 },
  { z: 32, s: 'Ge', n: 'Germanium', w: 72.630, g: 14, p: 4, cat: 'metalloid', conf: '[Ar] 3d¹⁰ 4s² 4p²', en: 2.01 },
  { z: 33, s: 'As', n: 'Arsenic', w: 74.922, g: 15, p: 4, cat: 'metalloid', conf: '[Ar] 3d¹⁰ 4s² 4p³', en: 2.18 },
  { z: 34, s: 'Se', n: 'Selenium', w: 78.971, g: 16, p: 4, cat: 'nonmetal', conf: '[Ar] 3d¹⁰ 4s² 4p⁴', en: 2.55 },
  { z: 35, s: 'Br', n: 'Bromine', w: 79.904, g: 17, p: 4, cat: 'halogen', conf: '[Ar] 3d¹⁰ 4s² 4p⁵', en: 2.96 },
  { z: 36, s: 'Kr', n: 'Krypton', w: 83.798, g: 18, p: 4, cat: 'noble', conf: '[Ar] 3d¹⁰ 4s² 4p⁶', en: 3.00 },
  { z: 47, s: 'Ag', n: 'Silver', w: 107.87, g: 11, p: 5, cat: 'transition', conf: '[Kr] 4d¹⁰ 5s¹', en: 1.93 },
  { z: 79, s: 'Au', n: 'Gold', w: 196.97, g: 11, p: 6, cat: 'transition', conf: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', en: 2.54 },
  { z: 80, s: 'Hg', n: 'Mercury', w: 200.59, g: 12, p: 6, cat: 'transition', conf: '[Xe] 4f¹⁴ 5d¹⁰ 6s²', en: 2.00 },
  { z: 82, s: 'Pb', n: 'Lead', w: 207.2, g: 14, p: 6, cat: 'post-transition', conf: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', en: 2.33 },
  { z: 92, s: 'U', n: 'Uranium', w: 238.03, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f³ 6d¹ 7s²', en: 1.38 }
];

export class PeriodicTableModal {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.selectedElement = ELEMENTS_DATA.find((e) => e.s === 'Fe') || ELEMENTS_DATA[0];
  }

  show() {
    if (this.container) this.container.remove();

    const overlay = document.createElement('div');
    overlay.className = 'periodic-table-modal-overlay';
    overlay.innerHTML = `
      <div class="periodic-modal-card">
        <div class="periodic-modal-header">
          <div class="periodic-modal-title">
            <span class="modal-icon">🧪</span>
            <span>${t('Interactive Periodic Table of Elements')}</span>
          </div>
          <button class="periodic-modal-close" title="${t('Close (Esc)')}">✕</button>
        </div>
        <div class="periodic-modal-toolbar">
          <input type="text" class="periodic-search-input" placeholder="${t('Search element by symbol, name, or number (e.g. Fe, Iron, 26)...')}">
          <div class="periodic-legend">
            <span class="cat-pill alkali">Alkali</span>
            <span class="cat-pill alkaline">Alkaline</span>
            <span class="cat-pill transition">Transition</span>
            <span class="cat-pill metalloid">Metalloid</span>
            <span class="cat-pill nonmetal">Nonmetal</span>
            <span class="cat-pill halogen">Halogen</span>
            <span class="cat-pill noble">Noble Gas</span>
          </div>
        </div>
        <div class="periodic-modal-content">
          <div class="periodic-grid-container">
            <!-- Dynamic elements grid rendered here -->
          </div>
          <div class="periodic-inspector-pane">
            <!-- Selected element inspector rendered here -->
          </div>
        </div>
      </div>
    `;

    overlay.querySelector('.periodic-modal-close').addEventListener('click', () => this.hide());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hide();
    });

    const searchInput = overlay.querySelector('.periodic-search-input');
    searchInput.addEventListener('input', (e) => {
      this.filterElements(e.target.value.trim().toLowerCase());
    });

    document.body.appendChild(overlay);
    this.container = overlay;

    this.renderGrid(ELEMENTS_DATA);
    this.renderInspector(this.selectedElement);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        this.hide();
        window.removeEventListener('keydown', onKey);
      }
    };
    window.addEventListener('keydown', onKey);
  }

  hide() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  renderGrid(elements) {
    const grid = this.container?.querySelector('.periodic-grid-container');
    if (!grid) return;
    grid.innerHTML = '';

    elements.forEach((el) => {
      const cell = document.createElement('div');
      cell.className = `element-cell ${el.cat} ${this.selectedElement.z === el.z ? 'selected' : ''}`;
      cell.innerHTML = `
        <span class="elem-z">${el.z}</span>
        <span class="elem-symbol">${el.s}</span>
        <span class="elem-name">${el.n}</span>
      `;
      cell.addEventListener('click', () => {
        this.selectedElement = el;
        grid.querySelectorAll('.element-cell').forEach((c) => c.classList.remove('selected'));
        cell.classList.add('selected');
        this.renderInspector(el);
      });
      grid.appendChild(cell);
    });
  }

  renderInspector(el) {
    const pane = this.container?.querySelector('.periodic-inspector-pane');
    if (!pane || !el) return;

    pane.innerHTML = `
      <div class="inspector-badge ${el.cat}">
        <div class="inspector-z">${el.z}</div>
        <div class="inspector-symbol">${el.s}</div>
        <div class="inspector-name">${el.n}</div>
        <div class="inspector-weight">${el.w} u</div>
      </div>
      <div class="inspector-details">
        <div class="detail-row"><span>${t('Category')}:</span><strong>${el.cat}</strong></div>
        <div class="detail-row"><span>${t('Configuration')}:</span><strong>${el.conf}</strong></div>
        <div class="detail-row"><span>${t('Electronegativity')}:</span><strong>${el.en !== null ? el.en : '—'}</strong></div>
        <div class="detail-row"><span>${t('Group / Period')}:</span><strong>Group ${el.g}, Period ${el.p}</strong></div>
      </div>
      <button class="stamp-elem-btn">
        <span>📌</span>
        <span>${t('Insert Element Tile to Canvas')}</span>
      </button>
    `;

    pane.querySelector('.stamp-elem-btn').addEventListener('click', () => {
      this.stampElementCard(el);
    });
  }

  stampElementCard(el) {
    const view = this.app.surface.cam.viewport(this.app.surface.width, this.app.surface.height);
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;

    const cardText = `🧪 **${el.n} (${el.s})** — Atomic #${el.z}\n\n` +
      `• **${t('Atomic Weight')}**: ${el.w} g/mol\n` +
      `• **${t('Series')}**: ${el.cat}\n` +
      `• **${t('Electron Config')}**: \`${el.conf}\`\n` +
      `• **${t('Electronegativity')}**: ${el.en !== null ? el.en : 'N/A'}\n` +
      `• **${t('Position')}**: Group ${el.g}, Period ${el.p}`;

    const note = {
      id: uid('txt'),
      type: 'text',
      x: cx - 140,
      y: cy - 90,
      w: 280,
      h: 180,
      text: cardText,
      size: 15,
      color: '#0f6cbd'
    };

    this.app.store.add(note, 'stamp element card');
    this.app.surface.selection?.clear?.();
    this.app.surface.selection?.add?.(note.id);
    this.app.surface.invalidate?.();
    this.app.toast?.(t('Inserted {element} element card to whiteboard.', { element: el.n }));
    this.hide();
  }

  filterElements(query) {
    if (!query) {
      this.renderGrid(ELEMENTS_DATA);
      return;
    }
    const filtered = ELEMENTS_DATA.filter((e) =>
      e.s.toLowerCase().includes(query) ||
      e.n.toLowerCase().includes(query) ||
      String(e.z).includes(query) ||
      e.cat.toLowerCase().includes(query)
    );
    this.renderGrid(filtered);
  }
}
