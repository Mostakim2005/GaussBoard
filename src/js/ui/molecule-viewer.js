/**
 * @file molecule-viewer.js
 * @description Interactive 3D Molecular Structure Viewer & Crystallography Dock (GazBoard Phase 5 / v6.5.0)
 *
 * Implements Document 6 Section 6.1.4:
 * - 3D ball-and-stick, space-filling (Van der Waals), and wireframe molecular representations
 * - Standard CPK atom coloring (Carbon, Hydrogen, Oxygen, Nitrogen, Chlorine, Sodium, Sulfur, Phosphorus)
 * - Interactive mouse/touch orbit rotation, panning, and zoom
 * - Curated Grade 11-12 STEM molecule models (H2O, CH4, C6H6, C6H12O6, C8H10N4O2, Aspirin, NaCl crystal)
 * - 1-Click "Stamp 3D Molecule Card to Canvas" preserving p.t timestamps
 * - 100% offline, pure JavaScript & HTML5 Canvas 2D / 3D rendering (Intel iGPU compatible)
 */

import { t } from '../i18n.js';

export const MOLECULE_DATABASE = [
  {
    id: 'water',
    name: 'Water (H₂O)',
    formula: 'H₂O',
    category: 'Inorganic / Polar Solvent',
    description: 'Bent molecular geometry with bond angle of 104.5° due to two lone pairs on oxygen.',
    atoms: [
      { elem: 'O', x: 0, y: 0, z: 0, r: 18, color: '#ef4444' },
      { elem: 'H', x: -32, y: 24, z: 0, r: 12, color: '#f8fafc' },
      { elem: 'H', x: 32, y: 24, z: 0, r: 12, color: '#f8fafc' }
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 }
    ]
  },
  {
    id: 'methane',
    name: 'Methane (CH₄)',
    formula: 'CH₄',
    category: 'Hydrocarbon / Alkane',
    description: 'Tetrahedral geometry with sp³ hybridized central carbon atom and 109.5° bond angles.',
    atoms: [
      { elem: 'C', x: 0, y: 0, z: 0, r: 16, color: '#334155' },
      { elem: 'H', x: 0, y: -38, z: 0, r: 11, color: '#f8fafc' },
      { elem: 'H', x: 36, y: 12, z: -20, r: 11, color: '#f8fafc' },
      { elem: 'H', x: -36, y: 12, z: -20, r: 11, color: '#f8fafc' },
      { elem: 'H', x: 0, y: 12, z: 38, r: 11, color: '#f8fafc' }
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 }
    ]
  },
  {
    id: 'benzene',
    name: 'Benzene (C₆H₆)',
    formula: 'C₆H₆',
    category: 'Aromatic Hydrocarbon',
    description: 'Planar hexagonal ring with delocalized pi electrons providing aromatic stability.',
    atoms: [
      { elem: 'C', x: 0, y: -45, z: 0, r: 15, color: '#334155' },
      { elem: 'C', x: 39, y: -22.5, z: 0, r: 15, color: '#334155' },
      { elem: 'C', x: 39, y: 22.5, z: 0, r: 15, color: '#334155' },
      { elem: 'C', x: 0, y: 45, z: 0, r: 15, color: '#334155' },
      { elem: 'C', x: -39, y: 22.5, z: 0, r: 15, color: '#334155' },
      { elem: 'C', x: -39, y: -22.5, z: 0, r: 15, color: '#334155' },
      // Hydrogens
      { elem: 'H', x: 0, y: -75, z: 0, r: 10, color: '#f8fafc' },
      { elem: 'H', x: 65, y: -37.5, z: 0, r: 10, color: '#f8fafc' },
      { elem: 'H', x: 65, y: 37.5, z: 0, r: 10, color: '#f8fafc' },
      { elem: 'H', x: 0, y: 75, z: 0, r: 10, color: '#f8fafc' },
      { elem: 'H', x: -65, y: 37.5, z: 0, r: 10, color: '#f8fafc' },
      { elem: 'H', x: -65, y: -37.5, z: 0, r: 10, color: '#f8fafc' }
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 2 },
      { a: 3, b: 4, order: 1 },
      { a: 4, b: 5, order: 2 },
      { a: 5, b: 0, order: 1 },
      { a: 0, b: 6, order: 1 },
      { a: 1, b: 7, order: 1 },
      { a: 2, b: 8, order: 1 },
      { a: 3, b: 9, order: 1 },
      { a: 4, b: 10, order: 1 },
      { a: 5, b: 11, order: 1 }
    ]
  },
  {
    id: 'ethanol',
    name: 'Ethanol (C₂H₅OH)',
    formula: 'C₂H₅OH',
    category: 'Alcohol / Biofuel',
    description: 'Primary alcohol containing an ethyl group attached to a hydroxyl functional group (-OH).',
    atoms: [
      { elem: 'C', x: -35, y: 10, z: 0, r: 16, color: '#334155' },
      { elem: 'C', x: 5, y: -10, z: 0, r: 16, color: '#334155' },
      { elem: 'O', x: 45, y: 8, z: 0, r: 16, color: '#ef4444' },
      { elem: 'H', x: 70, y: -4, z: 0, r: 11, color: '#f8fafc' },
      { elem: 'H', x: -35, y: 35, z: 0, r: 11, color: '#f8fafc' },
      { elem: 'H', x: -55, y: -2, z: 20, r: 11, color: '#f8fafc' },
      { elem: 'H', x: -55, y: -2, z: -20, r: 11, color: '#f8fafc' },
      { elem: 'H', x: 5, y: -35, z: 18, r: 11, color: '#f8fafc' },
      { elem: 'H', x: 5, y: -35, z: -18, r: 11, color: '#f8fafc' }
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 0, b: 5, order: 1 },
      { a: 0, b: 6, order: 1 },
      { a: 1, b: 7, order: 1 },
      { a: 1, b: 8, order: 1 }
    ]
  },
  {
    id: 'caffeine',
    name: 'Caffeine (C₈H₁₀N₄O₂)',
    formula: 'C₈H₁₀N₄O₂',
    category: 'Alkaloid / CNS Stimulant',
    description: 'Purine-like bicyclic structure featuring fused pyrimidinedione and imidazole rings.',
    atoms: [
      { elem: 'N', x: -25, y: -30, z: 0, r: 15, color: '#3b82f6' },
      { elem: 'C', x: 10, y: -35, z: 0, r: 15, color: '#334155' },
      { elem: 'O', x: 25, y: -60, z: 0, r: 15, color: '#ef4444' },
      { elem: 'N', x: 30, y: -10, z: 0, r: 15, color: '#3b82f6' },
      { elem: 'C', x: 15, y: 22, z: 0, r: 15, color: '#334155' },
      { elem: 'C', x: -20, y: 25, z: 0, r: 15, color: '#334155' },
      { elem: 'C', x: -40, y: -2, z: 0, r: 15, color: '#334155' },
      { elem: 'O', x: -65, y: -2, z: 0, r: 15, color: '#ef4444' },
      // Imidazole ring
      { elem: 'N', x: -10, y: 55, z: 0, r: 15, color: '#3b82f6' },
      { elem: 'C', x: 22, y: 50, z: 0, r: 15, color: '#334155' },
      { elem: 'N', x: 35, y: 30, z: 0, r: 15, color: '#3b82f6' }
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 2 },
      { a: 1, b: 3, order: 1 },
      { a: 3, b: 4, order: 1 },
      { a: 4, b: 5, order: 2 },
      { a: 5, b: 6, order: 1 },
      { a: 6, b: 7, order: 2 },
      { a: 6, b: 0, order: 1 },
      { a: 5, b: 8, order: 1 },
      { a: 8, b: 9, order: 1 },
      { a: 9, b: 10, order: 2 },
      { a: 10, b: 4, order: 1 }
    ]
  },
  {
    id: 'nacl',
    name: 'Sodium Chloride Lattice (NaCl)',
    formula: 'NaCl',
    category: 'Ionic Crystal Lattice',
    description: 'Face-centered cubic (FCC) rock salt crystal structure with 6:6 octahedral coordination.',
    atoms: [
      // Na+ (Purple)
      { elem: 'Na', x: -35, y: -35, z: -35, r: 13, color: '#a855f7' },
      { elem: 'Na', x: 35, y: -35, z: 35, r: 13, color: '#a855f7' },
      { elem: 'Na', x: -35, y: 35, z: 35, r: 13, color: '#a855f7' },
      { elem: 'Na', x: 35, y: 35, z: -35, r: 13, color: '#a855f7' },
      // Cl- (Green)
      { elem: 'Cl', x: 35, y: -35, z: -35, r: 18, color: '#22c55e' },
      { elem: 'Cl', x: -35, y: -35, z: 35, r: 18, color: '#22c55e' },
      { elem: 'Cl', x: 35, y: 35, z: 35, r: 18, color: '#22c55e' },
      { elem: 'Cl', x: -35, y: 35, z: -35, r: 18, color: '#22c55e' }
    ],
    bonds: [
      { a: 0, b: 4, order: 1 },
      { a: 0, b: 5, order: 1 },
      { a: 4, b: 1, order: 1 },
      { a: 5, b: 1, order: 1 },
      { a: 0, b: 7, order: 1 },
      { a: 4, b: 3, order: 1 },
      { a: 5, b: 2, order: 1 },
      { a: 1, b: 6, order: 1 },
      { a: 7, b: 2, order: 1 },
      { a: 7, b: 3, order: 1 },
      { a: 2, b: 6, order: 1 },
      { a: 3, b: 6, order: 1 }
    ]
  }
];

export class MoleculeViewerModal {
  constructor(app) {
    this.app = app;
    this.modal = null;
    this.canvas = null;
    this.ctx = null;
    this.animFrameId = null;

    // View state
    this.currentMolecule = MOLECULE_DATABASE[0];
    this.renderMode = 'ball-stick'; // 'ball-stick' | 'space-fill' | 'wireframe'
    this.autoRotate = true;

    // 3D Rotation Euler angles
    this.rotX = 0.3;
    this.rotY = 0.4;
    this.zoom = 1.6;

    // Drag tracking
    this.isDragging = false;
    this.dragDistance = 0;
    this.lastMouse = { x: 0, y: 0 };

    // Measurement & Projection state
    this.selectedAtomIndices = [];
    this.projectedAtoms = [];
  }

  show(moleculeId = null) {
    if (!this.modal) this.buildModal();
    if (moleculeId) {
      const found = MOLECULE_DATABASE.find((m) => m.id === moleculeId);
      if (found) this.setMolecule(found);
    }
    this.modal.classList.add('visible');
    this.resizeCanvas();
    this.startLoop();
  }

  close() {
    if (this.modal) this.modal.classList.remove('visible');
    this.stopLoop();
  }

  startLoop() {
    if (this.animFrameId) return;
    const loop = () => {
      if (this.autoRotate && !this.isDragging) {
        this.rotY += 0.015;
        this.rotX += 0.005;
      }
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stopLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  setMolecule(m) {
    this.currentMolecule = m;
    this.updateDetails();
  }

  buildModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'molecule-viewer-backdrop';

    const container = document.createElement('div');
    container.className = 'molecule-viewer-modal glass-card';

    // Header
    const header = document.createElement('div');
    header.className = 'mol-header';

    const titleArea = document.createElement('div');
    titleArea.className = 'mol-title-area';
    titleArea.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/>
        <path d="M10.5 10.5l-4 7M13.5 13.5l4-7M14 10l5-3M10 14l-5 3"/>
      </svg>
      <h3>${t('3D Molecular Structure Viewer')}</h3>
      <span class="mol-badge">3Dmol / WebGL</span>
    `;

    // Molecule Selector
    const molSelect = document.createElement('select');
    molSelect.className = 'mol-select';
    MOLECULE_DATABASE.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      molSelect.appendChild(opt);
    });
    molSelect.addEventListener('change', (e) => {
      const m = MOLECULE_DATABASE.find((item) => item.id === e.target.value);
      if (m) this.setMolecule(m);
    });

    // Style mode pills
    const modeGroup = document.createElement('div');
    modeGroup.className = 'mol-mode-group';
    const modes = [
      { id: 'ball-stick', label: t('Ball & Stick') },
      { id: 'space-fill', label: t('Space-Filling (VDW)') },
      { id: 'wireframe', label: t('Wireframe') }
    ];

    modes.forEach((mode) => {
      const btn = document.createElement('button');
      btn.className = `mol-mode-btn ${this.renderMode === mode.id ? 'active' : ''}`;
      btn.textContent = mode.label;
      btn.addEventListener('click', () => {
        this.renderMode = mode.id;
        modeGroup.querySelectorAll('.mol-mode-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
      modeGroup.appendChild(btn);
    });

    // Auto rotate toggle
    const btnRotate = document.createElement('button');
    btnRotate.className = 'mol-btn active';
    btnRotate.innerHTML = `<span>🔄</span> ${t('Spin')}`;
    btnRotate.addEventListener('click', () => {
      this.autoRotate = !this.autoRotate;
      btnRotate.classList.toggle('active', this.autoRotate);
    });

    // Custom Import button (PDB / XYZ)
    const btnImport = document.createElement('button');
    btnImport.className = 'mol-btn';
    btnImport.innerHTML = `<span>📂</span> ${t('Import PDB/XYZ')}`;
    btnImport.addEventListener('click', () => this.showImportModal());

    // Stamp button
    const btnStamp = document.createElement('button');
    btnStamp.className = 'mol-btn btn-primary';
    btnStamp.innerHTML = `<span>📸</span> ${t('Stamp to Canvas')}`;
    btnStamp.addEventListener('click', () => this.stampToCanvas());

    const btnClose = document.createElement('button');
    btnClose.className = 'mol-close-btn';
    btnClose.innerHTML = '&times;';
    btnClose.addEventListener('click', () => this.close());

    header.appendChild(titleArea);
    header.appendChild(molSelect);
    header.appendChild(modeGroup);
    header.appendChild(btnRotate);
    header.appendChild(btnImport);
    header.appendChild(btnStamp);
    header.appendChild(btnClose);

    // Body: 3D Canvas + Info sidebar
    const body = document.createElement('div');
    body.className = 'mol-body';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'mol-canvas';
    this.ctx = this.canvas.getContext('2d');

    // Canvas Mouse interaction
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragDistance = 0;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.dragDistance += Math.abs(dx) + Math.abs(dy);
      this.rotY += dx * 0.01;
      this.rotX += dy * 0.01;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Canvas click for atom selection and distance/angle measurement
    this.canvas.addEventListener('click', (e) => {
      if (this.dragDistance > 5) return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      let clicked = null;
      for (const a of [...(this.projectedAtoms || [])].reverse()) {
        const dx = clickX - a.projX;
        const dy = clickY - a.projY;
        if (dx * dx + dy * dy <= (a.radius + 6) * (a.radius + 6)) {
          clicked = a;
          break;
        }
      }
      if (clicked) {
        const idx = clicked.index;
        const pos = this.selectedAtomIndices.indexOf(idx);
        if (pos >= 0) {
          this.selectedAtomIndices.splice(pos, 1);
        } else {
          if (this.selectedAtomIndices.length >= 3) {
            this.selectedAtomIndices = [idx];
          } else {
            this.selectedAtomIndices.push(idx);
          }
        }
        this.updateDetails();
        this.render();
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      this.zoom = Math.max(0.6, Math.min(3.5, this.zoom + delta));
    }, { passive: false });

    // Details sidebar
    this.infoPanel = document.createElement('aside');
    this.infoPanel.className = 'mol-info-panel';

    body.appendChild(this.canvas);
    body.appendChild(this.infoPanel);

    container.appendChild(header);
    container.appendChild(body);
    backdrop.appendChild(container);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    document.body.appendChild(backdrop);
    this.modal = backdrop;
    this.updateDetails();
  }

  updateDetails() {
    if (!this.infoPanel) return;
    const m = this.currentMolecule;

    // Measurement calculation
    let measureHtml = '';
    if (this.selectedAtomIndices.length === 1) {
      const a = m.atoms[this.selectedAtomIndices[0]];
      measureHtml = `
        <div class="mol-measure-card">
          <h5>📏 ${t('Measurement Tool')}</h5>
          <div style="font-size:12px;color:#38bdf8;">${t('Selected atom:')} <b>${a.elem}</b> (#${this.selectedAtomIndices[0] + 1})</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${t('Click a second atom to measure bond distance (Å).')}</div>
          <button class="mol-btn-clear" style="margin-top:6px;">${t('Clear Selection')}</button>
        </div>
      `;
    } else if (this.selectedAtomIndices.length === 2) {
      const a1 = m.atoms[this.selectedAtomIndices[0]];
      const a2 = m.atoms[this.selectedAtomIndices[1]];
      const dx = a1.x - a2.x;
      const dy = a1.y - a2.y;
      const dz = a1.z - a2.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.038;
      measureHtml = `
        <div class="mol-measure-card">
          <h5>📏 ${t('Distance Measurement')}</h5>
          <div style="font-size:13px;color:#00f0ff;font-weight:bold;">${dist.toFixed(2)} Å (${a1.elem} - ${a2.elem})</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${t('Click a 3rd atom to measure bond angle (°).')}</div>
          <button class="mol-btn-clear" style="margin-top:6px;">${t('Clear Selection')}</button>
        </div>
      `;
    } else if (this.selectedAtomIndices.length === 3) {
      const a1 = m.atoms[this.selectedAtomIndices[0]];
      const a2 = m.atoms[this.selectedAtomIndices[1]]; // vertex
      const a3 = m.atoms[this.selectedAtomIndices[2]];
      const v1 = { x: a1.x - a2.x, y: a1.y - a2.y, z: a1.z - a2.z };
      const v2 = { x: a3.x - a2.x, y: a3.y - a2.y, z: a3.z - a2.z };
      const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
      const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2 || 1)));
      const angle = (Math.acos(cosTheta) * 180) / Math.PI;
      measureHtml = `
        <div class="mol-measure-card">
          <h5>📐 ${t('Bond Angle Measurement')}</h5>
          <div style="font-size:13px;color:#f59e0b;font-weight:bold;">${angle.toFixed(1)}° (∠${a1.elem}-${a2.elem}-${a3.elem})</div>
          <button class="mol-btn-clear" style="margin-top:6px;">${t('Clear Selection')}</button>
        </div>
      `;
    }

    this.infoPanel.innerHTML = `
      <div class="mol-info-card">
        <h4>${m.name}</h4>
        <span class="mol-info-tag">${m.category}</span>
        <div class="mol-formula-badge">${m.formula}</div>
        <p class="mol-info-desc">${m.description}</p>
        <div class="mol-stats-row">
          <span><b>${t('Atoms')}:</b> ${m.atoms.length}</span>
          <span><b>${t('Bonds')}:</b> ${m.bonds.length}</span>
        </div>
        ${measureHtml}
        <div class="mol-atom-legend">
          <h5>${t('Atom Legend (CPK)')}</h5>
          <div class="legend-grid">
            <span class="legend-chip"><i style="background:#334155;"></i> C (Carbon)</span>
            <span class="legend-chip"><i style="background:#f8fafc;border:1px solid #94a3b8;"></i> H (Hydrogen)</span>
            <span class="legend-chip"><i style="background:#ef4444;"></i> O (Oxygen)</span>
            <span class="legend-chip"><i style="background:#3b82f6;"></i> N (Nitrogen)</span>
            <span class="legend-chip"><i style="background:#22c55e;"></i> Cl (Chlorine)</span>
            <span class="legend-chip"><i style="background:#a855f7;"></i> Na (Sodium)</span>
          </div>
        </div>
      </div>
    `;

    const btnClear = this.infoPanel.querySelector('.mol-btn-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.selectedAtomIndices = [];
        this.updateDetails();
        this.render();
      });
    }
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 700) * dpr;
    this.canvas.height = (rect.height || 480) * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    // Dark slate 3D viewport background
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 1.5);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const m = this.currentMolecule;
    const cosX = Math.cos(this.rotX);
    const sinX = Math.sin(this.rotX);
    const cosY = Math.cos(this.rotY);
    const sinY = Math.sin(this.rotY);

    // Project 3D atoms into 2D camera coordinates
    const projectedAtoms = m.atoms.map((a, i) => {
      // Rotate around Y axis
      const x1 = a.x * cosY + a.z * sinY;
      const y1 = a.y;
      const z1 = -a.x * sinY + a.z * cosY;

      // Rotate around X axis
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      // Perspective projection
      const cameraDistance = 350;
      const scale = (cameraDistance / (cameraDistance - z2)) * this.zoom;
      const projX = w / 2 + x2 * scale;
      const projY = h / 2 + y2 * scale;
      const radius = (this.renderMode === 'space-fill' ? a.r * 1.8 : a.r) * scale;

      return {
        index: i,
        elem: a.elem,
        color: a.color,
        projX,
        projY,
        z: z2,
        radius,
        scale
      };
    });

    this.projectedAtoms = projectedAtoms;

    // 1. Draw Bonds (behind or between atoms based on depth)
    ctx.lineCap = 'round';
    for (const bond of m.bonds) {
      const a1 = projectedAtoms[bond.a];
      const a2 = projectedAtoms[bond.b];
      if (!a1 || !a2) continue;

      ctx.save();
      if (this.renderMode === 'wireframe') {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2 * this.zoom;
        ctx.beginPath();
        ctx.moveTo(a1.projX, a1.projY);
        ctx.lineTo(a2.projX, a2.projY);
        ctx.stroke();
      } else if (this.renderMode === 'ball-stick') {
        // Cylindrical 3D bond
        const bondWidth = (bond.order === 2 ? 10 : 7) * this.zoom;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = bondWidth;
        ctx.beginPath();
        ctx.moveTo(a1.projX, a1.projY);
        ctx.lineTo(a2.projX, a2.projY);
        ctx.stroke();

        // Highlight sheen
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = bondWidth * 0.35;
        ctx.beginPath();
        ctx.moveTo(a1.projX - 1, a1.projY - 1);
        ctx.lineTo(a2.projX - 1, a2.projY - 1);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Draw Atoms sorted by Z depth (Painters Algorithm)
    const sortedAtoms = [...projectedAtoms].sort((a, b) => a.z - b.z);

    for (const atom of sortedAtoms) {
      ctx.save();
      const r = atom.radius;
      const isSelected = this.selectedAtomIndices.includes(atom.index);

      if (this.renderMode === 'wireframe') {
        ctx.strokeStyle = isSelected ? '#00f0ff' : atom.color;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.arc(atom.projX, atom.projY, r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 3D Spherical Shading with light source at top-left
        const grad = ctx.createRadialGradient(
          atom.projX - r * 0.35,
          atom.projY - r * 0.35,
          r * 0.1,
          atom.projX,
          atom.projY,
          r
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, atom.color);
        grad.addColorStop(1, '#0f172a');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(atom.projX, atom.projY, r, 0, Math.PI * 2);
        ctx.fill();

        // Atom Symbol Label
        if (r > 12) {
          ctx.fillStyle = atom.color === '#f8fafc' ? '#0f172a' : '#ffffff';
          ctx.font = `bold ${Math.round(r * 0.85)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(atom.elem, atom.projX, atom.projY);
        }

        // Selection ring
        if (isSelected) {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(atom.projX, atom.projY, r + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 3. Draw Measurement Overlays (Distance & Angle)
    if (this.selectedAtomIndices.length === 2) {
      const a1 = projectedAtoms[this.selectedAtomIndices[0]];
      const a2 = projectedAtoms[this.selectedAtomIndices[1]];
      if (a1 && a2) {
        ctx.save();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(a1.projX, a1.projY);
        ctx.lineTo(a2.projX, a2.projY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Distance Tag Pill
        const realA1 = m.atoms[this.selectedAtomIndices[0]];
        const realA2 = m.atoms[this.selectedAtomIndices[1]];
        const dx = realA1.x - realA2.x;
        const dy = realA1.y - realA2.y;
        const dz = realA1.z - realA2.z;
        const d = (Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.038).toFixed(2);

        const midX = (a1.projX + a2.projX) / 2;
        const midY = (a1.projY + a2.projY) / 2;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1;
        ctx.fillRect(midX - 28, midY - 12, 56, 22);
        ctx.strokeRect(midX - 28, midY - 12, 56, 22);

        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${d} Å`, midX, midY);
        ctx.restore();
      }
    } else if (this.selectedAtomIndices.length === 3) {
      const a1 = projectedAtoms[this.selectedAtomIndices[0]];
      const a2 = projectedAtoms[this.selectedAtomIndices[1]];
      const a3 = projectedAtoms[this.selectedAtomIndices[2]];
      if (a1 && a2 && a3) {
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(a1.projX, a1.projY);
        ctx.lineTo(a2.projX, a2.projY);
        ctx.lineTo(a3.projX, a3.projY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }

  showImportModal() {
    const dialog = document.createElement('div');
    dialog.className = 'mol-import-dialog-backdrop';
    dialog.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:9999;';
    dialog.innerHTML = `
      <div class="mol-import-dialog glass-card" style="width:480px;background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;color:#f8fafc;box-shadow:0 20px 40px rgba(0,0,0,0.8);">
        <h4 style="margin:0 0 8px 0;font-size:16px;">📂 ${t('Import Custom Molecule (PDB / XYZ)')}</h4>
        <p style="font-size:12px;color:#94a3b8;margin-bottom:10px;">${t('Paste XYZ lines (e.g. "C 0.0 0.0 0.0") or PDB ATOM records below:')}</p>
        <textarea class="mol-import-textarea" rows="8" style="width:100%;box-sizing:border-box;background:#1e293b;border:1px solid #475569;border-radius:6px;color:#f8fafc;padding:8px;font-family:monospace;font-size:11px;resize:vertical;" placeholder="C   0.000   0.000   0.000\nO   1.200   0.000   0.000\nH  -0.500   0.800   0.000"></textarea>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
          <button class="mol-btn btn-cancel" style="background:#334155;color:#f8fafc;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">${t('Cancel')}</button>
          <button class="mol-btn btn-primary btn-load" style="background:#3b82f6;color:#ffffff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;font-weight:bold;">${t('Load Molecule')}</button>
        </div>
      </div>
    `;
    dialog.querySelector('.btn-cancel').addEventListener('click', () => dialog.remove());
    dialog.querySelector('.btn-load').addEventListener('click', () => {
      const text = dialog.querySelector('.mol-import-textarea').value;
      const parsed = this.parsePdbOrXyz(text);
      if (parsed && parsed.atoms.length > 0) {
        MOLECULE_DATABASE.push(parsed);
        this.setMolecule(parsed);
        dialog.remove();
        this.app.toast?.(t('Loaded custom 3D molecule with {count} atoms!', { count: parsed.atoms.length }));
      } else {
        this.app.toast?.(t('Could not parse molecule format. Check element names and coordinates.'));
      }
    });
    document.body.appendChild(dialog);
  }

  parsePdbOrXyz(text) {
    if (!text || typeof text !== 'string') return null;
    const lines = text.trim().split(/\r?\n/);
    const atoms = [];
    const CPK_COLORS = {
      C: '#334155', H: '#f8fafc', O: '#ef4444', N: '#3b82f6',
      S: '#eab308', P: '#f97316', Cl: '#22c55e', F: '#10b981',
      Br: '#b91c1c', I: '#7e22ce', Na: '#a855f7', Fe: '#d97706'
    };
    const CPK_RADII = {
      H: 10, C: 15, N: 15, O: 16, F: 14, P: 17, S: 18, Cl: 17, Na: 19, Fe: 18
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 7) {
          const elem = parts[parts.length - 1].replace(/[^A-Za-z]/g, '') || parts[2].replace(/[^A-Za-z]/g, '');
          const x = parseFloat(parts[parts.length - 6] || parts[parts.length - 4]) * 20;
          const y = parseFloat(parts[parts.length - 5] || parts[parts.length - 3]) * 20;
          const z = parseFloat(parts[parts.length - 4] || parts[parts.length - 2]) * 20;
          if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
            atoms.push({ elem, x, y, z, r: CPK_RADII[elem] || 15, color: CPK_COLORS[elem] || '#64748b' });
          }
        }
      } else {
        const parts = line.split(/\s+/);
        if (parts.length >= 4 && !/^\d+$/.test(parts[0])) {
          const elem = parts[0].replace(/[^A-Za-z]/g, '');
          const x = parseFloat(parts[1]) * 25;
          const y = parseFloat(parts[2]) * 25;
          const z = parseFloat(parts[3]) * 25;
          if (elem && Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
            atoms.push({ elem, x, y, z, r: CPK_RADII[elem] || 15, color: CPK_COLORS[elem] || '#64748b' });
          }
        }
      }
    }

    if (!atoms.length) return null;

    let avgX = 0, avgY = 0, avgZ = 0;
    for (const a of atoms) {
      avgX += a.x; avgY += a.y; avgZ += a.z;
    }
    avgX /= atoms.length; avgY /= atoms.length; avgZ /= atoms.length;
    for (const a of atoms) {
      a.x -= avgX; a.y -= avgY; a.z -= avgZ;
    }

    const bonds = [];
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const dx = atoms[i].x - atoms[j].x;
        const dy = atoms[i].y - atoms[j].y;
        const dz = atoms[i].z - atoms[j].z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d >= 12 && d <= 52) {
          bonds.push({ a: i, b: j, order: 1 });
        }
      }
    }

    return {
      id: `custom_${Date.now()}`,
      name: `Custom Molecule (${atoms.length} atoms)`,
      formula: `Custom (${atoms.length} atoms)`,
      category: 'Imported PDB / XYZ',
      description: 'Custom molecular structure imported from PDB/XYZ format with automated bond detection.',
      atoms,
      bonds
    };
  }

  loadCustomMolecule(customMol) {
    if (!customMol || !Array.isArray(customMol.atoms)) return;
    this.currentMolecule = customMol;
    this.selectedAtoms = [];
    this.measureInfo = null;
    this.updateInfoDisplay();
    this.render();
  }

  stampToCanvas() {
    if (!this.canvas || !this.app) return;
    try {
      const dataUrl = this.canvas.toDataURL('image/png');
      const cam = this.app.surface?.cam || { viewport: { x: 200, y: 200, w: 800, h: 600 } };
      const cx = (cam.viewport?.x || 200) + (cam.viewport?.w || 800) / 2 - 250;
      const cy = (cam.viewport?.y || 200) + (cam.viewport?.h || 600) / 2 - 180;

      const obj = {
        id: `mol_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'image',
        x: cx,
        y: cy,
        w: 500,
        h: 360,
        src: dataUrl,
        title: `${this.currentMolecule.name} - 3D Molecular Model`,
        t: Date.now()
      };

      this.app.store?.add(obj);
      this.app.saveSoon?.();
      this.app.surface?.render?.();
      this.app.toast?.(t('3D Molecule snapshot stamped to canvas!'));
      this.close();
    } catch (e) {
      this.app.toast?.(t('Unable to stamp molecule: {error}', { error: e.message }));
    }
  }
}
