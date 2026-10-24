/**
 * @file chemical-sketcher.js
 * @description 2D Chemical Structure Drawing & SMILES 2D/3D Parser Modal (GazBoard Phase 7 / v6.7.0)
 *
 * Implements:
 * - Interactive 2D chemical structure drawing canvas (single, double, triple, wedged stereobonds)
 * - Heteroatom palette (C, H, O, N, P, S, Cl, Br, F, I) and ring stamps (Benzene, Cyclopentane, Cyclohexane)
 * - Pure JavaScript SMILES parser (atoms, bonds, branching, rings)
 * - VSEPR 3D Cartesian coordinates generator
 * - Direct 1-click bridge to 3D Molecular Viewer & Whiteboard Stamping
 */

import { t } from '../i18n.js';
import { uid } from '../core/util.js';

export const SMILES_PRESETS = [
  { name: 'Aspirin (Acetylsalicylic Acid)', smiles: 'CC(=O)Oc1ccccc1C(=O)O', formula: 'C9H8O4' },
  { name: 'Caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', formula: 'C8H10N4O2' },
  { name: 'Paracetamol (Acetaminophen)', smiles: 'CC(=O)Nc1ccc(O)cc1', formula: 'C8H9NO2' },
  { name: 'Ibuprofen', smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O', formula: 'C13H18O2' },
  { name: 'Benzene', smiles: 'c1ccccc1', formula: 'C6H6' },
  { name: 'Acetic Acid (Vinegar)', smiles: 'CC(=O)O', formula: 'C2H4O2' },
  { name: 'Ethanol', smiles: 'CCO', formula: 'C2H6O' }
];

export const ELEMENT_COLORS = {
  C: '#334155',
  H: '#94a3b8',
  O: '#ef4444',
  N: '#3b82f6',
  S: '#eab308',
  P: '#f97316',
  Cl: '#22c55e',
  Br: '#854d0e',
  F: '#06b6d4',
  I: '#7c3aed'
};

export class ChemicalSketcherModal {
  constructor(app) {
    this.app = app;
    this.modal = null;
    this.canvas = null;
    this.ctx = null;

    // Drawing state
    this.selectedElement = 'C';
    this.selectedBondOrder = 1; // 1 = Single, 2 = Double, 3 = Triple, 4 = Wedge
    this.activeTool = 'draw'; // 'draw' | 'erase' | 'benzene' | 'cyclohexane'
    this.atoms = []; // { id, elem, x, y, z }
    this.bonds = []; // { a: idx, b: idx, order }

    this.dragStartAtom = null;
    this.mousePos = { x: 0, y: 0 };
    this.hoveredAtom = null;

    // Load initial Aspirin preset
    this.parseSMILES(SMILES_PRESETS[0].smiles);
  }

  show() {
    if (!this.modal) this.buildModal();
    this.modal.classList.add('visible');
    this.resizeCanvas();
    this.render();
  }

  close() {
    if (this.modal) this.modal.classList.remove('visible');
  }

  buildModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'chem-sketcher-backdrop';

    const container = document.createElement('div');
    container.className = 'chem-sketcher-modal glass-card';

    // Header
    const header = document.createElement('div');
    header.className = 'chem-header';
    header.innerHTML = `
      <div class="chem-title-area">
        <span style="font-size: 20px;">🧪</span>
        <h3>${t('2D Chemical Structure Sketcher & SMILES Studio')}</h3>
        <span class="chem-badge">v6.7.0</span>
      </div>
      <div class="chem-header-actions">
        <button class="chem-btn chem-stamp-btn">📸 ${t('Stamp to Canvas')}</button>
        <button class="chem-btn chem-3d-btn">🌐 ${t('View in 3D Viewer')}</button>
        <button class="chem-close-btn" title="${t('Close (Esc)')}">✕</button>
      </div>
    `;

    // Body
    const body = document.createElement('div');
    body.className = 'chem-body';

    // Left Toolbar Palette
    const palette = document.createElement('div');
    palette.className = 'chem-palette';
    palette.innerHTML = `
      <div class="palette-section">
        <h4>${t('Elements')}</h4>
        <div class="elem-grid">
          ${['C', 'H', 'O', 'N', 'S', 'P', 'Cl', 'Br', 'F', 'I'].map(el => `
            <button class="elem-btn ${el === this.selectedElement ? 'active' : ''}" data-elem="${el}" style="border-left: 4px solid ${ELEMENT_COLORS[el]};">
              ${el}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="palette-section">
        <h4>${t('Bonds & Rings')}</h4>
        <div class="bond-grid">
          <button class="bond-btn active" data-order="1">― ${t('Single')}</button>
          <button class="bond-btn" data-order="2">═ ${t('Double')}</button>
          <button class="bond-btn" data-order="3">≡ ${t('Triple')}</button>
          <button class="bond-btn" data-order="4">▲ ${t('Wedge')}</button>
          <button class="tool-btn" data-tool="benzene">⌬ ${t('Benzene')}</button>
          <button class="tool-btn" data-tool="cyclohexane">⬡ ${t('Ring-6')}</button>
          <button class="tool-btn" data-tool="erase">🧹 ${t('Eraser')}</button>
          <button class="tool-btn chem-clear-btn">✕ ${t('Clear Canvas')}</button>
        </div>
      </div>

      <div class="palette-section">
        <h4>${t('SMILES Presets')}</h4>
        <select class="chem-smiles-select">
          ${SMILES_PRESETS.map((p, i) => `<option value="${i}">${p.name}</option>`).join('')}
        </select>
        <div class="smiles-input-group">
          <input type="text" class="chem-smiles-input" value="${SMILES_PRESETS[0].smiles}" placeholder="e.g. c1ccccc1">
          <button class="chem-parse-btn">⚡ ${t('Parse')}</button>
        </div>
      </div>
    `;

    // Canvas Stage
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'chem-canvas-wrap';
    const canvas = document.createElement('canvas');
    canvas.className = 'chem-canvas';
    canvasWrap.appendChild(canvas);

    body.appendChild(palette);
    body.appendChild(canvasWrap);
    container.appendChild(header);
    container.appendChild(body);
    backdrop.appendChild(container);
    document.body.appendChild(backdrop);

    this.modal = backdrop;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Event Bindings
    header.querySelector('.chem-close-btn').addEventListener('click', () => this.close());
    header.querySelector('.chem-stamp-btn').addEventListener('click', () => this.stampToCanvas());
    header.querySelector('.chem-3d-btn').addEventListener('click', () => this.transferTo3D());

    // Element selection
    palette.querySelectorAll('.elem-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        palette.querySelectorAll('.elem-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedElement = btn.dataset.elem;
        this.activeTool = 'draw';
      });
    });

    // Bond selection
    palette.querySelectorAll('.bond-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        palette.querySelectorAll('.bond-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedBondOrder = parseInt(btn.dataset.order, 10);
        this.activeTool = 'draw';
      });
    });

    // Tool actions
    palette.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        if (tool === 'erase') {
          this.activeTool = 'erase';
        } else if (tool === 'benzene') {
          this.stampRing(6, true);
        } else if (tool === 'cyclohexane') {
          this.stampRing(6, false);
        }
      });
    });

    palette.querySelector('.chem-clear-btn').addEventListener('click', () => {
      this.atoms = [];
      this.bonds = [];
      this.render();
    });

    // SMILES input
    const select = palette.querySelector('.chem-smiles-select');
    const input = palette.querySelector('.chem-smiles-input');
    select.addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10);
      input.value = SMILES_PRESETS[idx].smiles;
      this.parseSMILES(input.value);
    });

    palette.querySelector('.chem-parse-btn').addEventListener('click', () => {
      this.parseSMILES(input.value);
    });

    // Canvas Mouse Events
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 700) * dpr;
    this.canvas.height = (rect.height || 500) * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // Find hovered atom
    this.hoveredAtom = null;
    for (const a of this.atoms) {
      if (Math.hypot(a.x - this.mousePos.x, a.y - this.mousePos.y) <= 16) {
        this.hoveredAtom = a;
        break;
      }
    }
    this.render();
  }

  onMouseDown(e) {
    if (e.button !== 0) return;

    if (this.activeTool === 'erase') {
      if (this.hoveredAtom) {
        const idx = this.atoms.indexOf(this.hoveredAtom);
        this.atoms.splice(idx, 1);
        this.bonds = this.bonds
          .filter(b => b.a !== idx && b.b !== idx)
          .map(b => ({
            a: b.a > idx ? b.a - 1 : b.a,
            b: b.b > idx ? b.b - 1 : b.b,
            order: b.order
          }));
        this.render();
      }
      return;
    }

    if (this.hoveredAtom) {
      this.dragStartAtom = this.hoveredAtom;
    } else {
      // Create new standalone atom
      const newAtom = {
        id: this.atoms.length,
        elem: this.selectedElement,
        x: this.mousePos.x,
        y: this.mousePos.y,
        z: 0
      };
      this.atoms.push(newAtom);
      this.dragStartAtom = newAtom;
      this.render();
    }
  }

  onMouseUp(e) {
    if (this.dragStartAtom) {
      if (this.hoveredAtom && this.hoveredAtom !== this.dragStartAtom) {
        // Connect bond between two existing atoms
        const aIdx = this.atoms.indexOf(this.dragStartAtom);
        const bIdx = this.atoms.indexOf(this.hoveredAtom);
        if (!this.bonds.find(b => (b.a === aIdx && b.b === bIdx) || (b.a === bIdx && b.b === aIdx))) {
          this.bonds.push({ a: aIdx, b: bIdx, order: this.selectedBondOrder });
        }
      } else if (!this.hoveredAtom) {
        const dist = Math.hypot(this.mousePos.x - this.dragStartAtom.x, this.mousePos.y - this.dragStartAtom.y);
        if (dist > 25) {
          // Create new atom and connect bond
          const newAtom = {
            id: this.atoms.length,
            elem: this.selectedElement,
            x: this.mousePos.x,
            y: this.mousePos.y,
            z: 0
          };
          this.atoms.push(newAtom);
          const aIdx = this.atoms.indexOf(this.dragStartAtom);
          const bIdx = this.atoms.length - 1;
          this.bonds.push({ a: aIdx, b: bIdx, order: this.selectedBondOrder });
        }
      }
      this.dragStartAtom = null;
      this.render();
    }
  }

  stampRing(sides = 6, aromatic = false) {
    const cx = (this.canvas.width / (window.devicePixelRatio || 1)) / 2;
    const cy = (this.canvas.height / (window.devicePixelRatio || 1)) / 2;
    const radius = 45;
    const startIdx = this.atoms.length;

    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      this.atoms.push({
        id: startIdx + i,
        elem: 'C',
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        z: 0
      });
    }

    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      const order = (aromatic && i % 2 === 0) ? 2 : 1;
      this.bonds.push({ a: startIdx + i, b: startIdx + next, order });
    }
    this.render();
  }

  /**
   * Simplified SMILES Parser
   * Parses atoms, bonds, branches, and rings into 2D layout and 3D VSEPR coordinates
   */
  parseSMILES(smiles) {
    if (!smiles) return;
    this.atoms = [];
    this.bonds = [];

    const clean = smiles.trim();
    let currentIdx = null;
    const branchStack = [];
    const ringClosures = new Map();

    const w = this.canvas ? this.canvas.width / (window.devicePixelRatio || 1) : 600;
    const h = this.canvas ? this.canvas.height / (window.devicePixelRatio || 1) : 400;
    let curX = w / 2 - 120;
    let curY = h / 2;
    let curZ = 0;
    let angle = 0;
    const bondDist = 38;

    let pendingBondOrder = 1;

    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];

      if (ch === '(') {
        branchStack.push({ idx: currentIdx, x: curX, y: curY, z: curZ, angle });
        angle -= Math.PI / 3;
      } else if (ch === ')') {
        if (branchStack.length > 0) {
          const state = branchStack.pop();
          currentIdx = state.idx;
          curX = state.x;
          curY = state.y;
          curZ = state.z;
          angle = state.angle + Math.PI / 3;
        }
      } else if (ch === '=') {
        pendingBondOrder = 2;
      } else if (ch === '#') {
        pendingBondOrder = 3;
      } else if (ch === '%') {
        // Multi-digit ring closure %10 .. %99
        let numStr = '';
        while (i + 1 < clean.length && /[0-9]/.test(clean[i + 1])) {
          numStr += clean[i + 1];
          i++;
        }
        if (numStr.length > 0) {
          const ringNum = parseInt(numStr, 10);
          if (ringClosures.has(ringNum)) {
            const targetIdx = ringClosures.get(ringNum);
            if (currentIdx !== null && targetIdx !== currentIdx) {
              this.bonds.push({ a: currentIdx, b: targetIdx, order: pendingBondOrder });
            }
            ringClosures.delete(ringNum);
          } else {
            ringClosures.set(ringNum, currentIdx);
          }
          pendingBondOrder = 1;
        }
      } else if (/[0-9]/.test(ch)) {
        // Ring closure
        const ringNum = parseInt(ch, 10);
        if (ringClosures.has(ringNum)) {
          const targetIdx = ringClosures.get(ringNum);
          if (currentIdx !== null && targetIdx !== currentIdx) {
            this.bonds.push({ a: currentIdx, b: targetIdx, order: pendingBondOrder });
          }
          ringClosures.delete(ringNum);
        } else {
          ringClosures.set(ringNum, currentIdx);
        }
        pendingBondOrder = 1;
      } else if (/[a-zA-Z]/.test(ch)) {
        // Element symbol detection
        let elem = ch;
        if (i + 1 < clean.length && /[a-z]/.test(clean[i + 1]) && !['c', 'n', 'o', 's', 'p'].includes(clean[i + 1])) {
          elem += clean[i + 1];
          i++;
        }
        elem = elem.toUpperCase();

        const atomIdx = this.atoms.length;
        if (currentIdx !== null) {
          curX += bondDist * Math.cos(angle);
          curY += bondDist * Math.sin(angle);
          curZ += (atomIdx % 2 === 0 ? 1 : -1) * 12;
          this.bonds.push({ a: currentIdx, b: atomIdx, order: pendingBondOrder });
          angle += (atomIdx % 2 === 0 ? 1 : -1) * (Math.PI / 6);
        }

        this.atoms.push({
          id: atomIdx,
          elem: elem,
          x: curX,
          y: curY,
          z: curZ
        });

        currentIdx = atomIdx;
        pendingBondOrder = 1;
      }
    }

    // Centering atoms in canvas
    if (this.atoms.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      this.atoms.forEach(a => {
        if (a.x < minX) minX = a.x;
        if (a.x > maxX) maxX = a.x;
        if (a.y < minY) minY = a.y;
        if (a.y > maxY) maxY = a.y;
      });
      const shiftX = (w / 2) - (minX + maxX) / 2;
      const shiftY = (h / 2) - (minY + maxY) / 2;
      this.atoms.forEach(a => {
        a.x += shiftX;
        a.y += shiftY;
      });
    }

    this.render();
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    // Subtle Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw Bonds
    for (const bond of this.bonds) {
      const a = this.atoms[bond.a];
      const b = this.atoms[bond.b];
      if (!a || !b) continue;

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = bond.order === 4 ? 6 : 2.5;

      if (bond.order === 1) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      } else if (bond.order === 2) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const px = (-dy / len) * 3;
        const py = (dx / len) * 3;

        ctx.beginPath();
        ctx.moveTo(a.x + px, a.y + py); ctx.lineTo(b.x + px, b.y + py);
        ctx.moveTo(a.x - px, a.y - py); ctx.lineTo(b.x - px, b.y - py);
        ctx.stroke();
      } else if (bond.order === 3) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const px = (-dy / len) * 4;
        const py = (dx / len) * 4;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.moveTo(a.x + px, a.y + py); ctx.lineTo(b.x + px, b.y + py);
        ctx.moveTo(a.x - px, a.y - py); ctx.lineTo(b.x - px, b.y - py);
        ctx.stroke();
      } else if (bond.order === 4) {
        // Wedged Stereobond
        ctx.fillStyle = '#64748b';
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const px = (-dy / len) * 5;
        const py = (dx / len) * 5;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x + px, b.y + py);
        ctx.lineTo(b.x - px, b.y - py);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Active Dragging Bond
    if (this.dragStartAtom) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.dragStartAtom.x, this.dragStartAtom.y);
      ctx.lineTo(this.mousePos.x, this.mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Atoms
    for (const a of this.atoms) {
      const isHovered = this.hoveredAtom === a;
      const color = ELEMENT_COLORS[a.elem] || '#334155';

      ctx.beginPath();
      ctx.arc(a.x, a.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      ctx.strokeStyle = isHovered ? '#38bdf8' : color;
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();

      ctx.fillStyle = isHovered ? '#38bdf8' : '#f8fafc';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.elem, a.x, a.y);
    }
  }

  transferTo3D() {
    if (this.atoms.length === 0) {
      this.app.toast?.(t('No molecular structure to transfer.'));
      return;
    }
    // Prepare 3D representation
    const mol3d = {
      id: `custom_${Date.now()}`,
      name: t('Custom Sketched Molecule'),
      formula: 'Custom',
      category: t('User 2D Sketch / SMILES'),
      description: t('Parsed from 2D chemical structure sketcher with VSEPR 3D coordinates.'),
      atoms: this.atoms.map((a, i) => ({
        elem: a.elem,
        x: (a.x - 300) * 0.45,
        y: (a.y - 200) * 0.45,
        z: a.z || 0,
        r: a.elem === 'H' ? 11 : a.elem === 'C' ? 16 : 15,
        color: ELEMENT_COLORS[a.elem] || '#334155'
      })),
      bonds: this.bonds.map(b => ({ a: b.a, b: b.b, order: b.order }))
    };

    this.close();
    if (!this.app.moleculeViewerModal) {
      import('./molecule-viewer.js').then(({ MoleculeViewerModal }) => {
        this.app.moleculeViewerModal = new MoleculeViewerModal(this.app);
        this.app.moleculeViewerModal.loadCustomMolecule?.(mol3d);
        this.app.moleculeViewerModal.show();
      });
    } else {
      this.app.moleculeViewerModal.loadCustomMolecule?.(mol3d);
      this.app.moleculeViewerModal.show();
    }
    this.app.toast?.(t('Loaded molecule into 3D Molecular Viewer!'));
  }

  stampToCanvas() {
    if (this.atoms.length === 0) {
      this.app.toast?.(t('Draw or parse a chemical structure first.'));
      return;
    }

    const dataUrl = this.canvas.toDataURL('image/png');
    const w = 360;
    const h = 260;
    const cam = this.app.surface?.cam;
    const sw = this.app.surface?.canvas?.width || 1200;
    const sh = this.app.surface?.canvas?.height || 800;
    const vp = (cam && typeof cam.viewport === 'function') ? cam.viewport(sw, sh) : (cam?.viewport || { x: 100, y: 100, w: 1000, h: 700 });
    const cx = (vp.x || 0) + (vp.w || 1000) / 2 - w / 2;
    const cy = (vp.y || 0) + (vp.h || 700) / 2 - h / 2;

    const imgObj = {
      id: `chem_stamp_${uid()}`,
      type: 'image',
      src: dataUrl,
      x: cx,
      y: cy,
      w: w,
      h: h,
      label: t('2D Chemical Structure')
    };

    this.app.store.add(imgObj, 'stamp 2d chemical structure');
    this.app.surface?.redraw();
    this.close();
    this.app.toast?.(t('Stamped 2D chemical structure card to whiteboard!'));
  }

  destroy() {
    this.close();
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
      this.modal = null;
    }
  }
}
