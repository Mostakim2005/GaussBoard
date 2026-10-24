/**
 * GazBoard - Offline PhET Interactive STEM Simulation Runner
 * Sandboxed HTML5 Canvas 2D interactive physical and electrical simulations,
 * real-time parameter sliders, and 1-click frame snapshot to whiteboard canvas.
 */

import { t } from '../i18n.js';
import { uid } from '../core/util.js';

export const SIMULATION_PRESETS = [
  {
    id: 'ohms_law',
    name: "Ohm's Law & Circuit Lab",
    category: 'Electricity',
    icon: '⚡',
    desc: 'Explore the relationship between Voltage (V), Current (I), and Resistance (R).'
  },
  {
    id: 'projectile',
    name: 'Projectile Motion Kinematics',
    category: 'Mechanics',
    icon: '🎯',
    desc: 'Simulate 2D parabolic trajectories with velocity, launch angle, and gravity.'
  },
  {
    id: 'waves',
    name: 'Wave Interference & Superposition',
    category: 'Waves',
    icon: '🌊',
    desc: 'Observe constructive and destructive wave patterns from coherent point sources.'
  },
  {
    id: 'pendulum',
    name: 'Simple Harmonic Pendulum',
    category: 'Mechanics',
    icon: '⏱️',
    desc: 'Analyze period, oscillation frequency, and gravitational acceleration.'
  },
  {
    id: 'optics',
    name: 'Geometrical Optics & Ray Tracing',
    category: 'Optics',
    icon: '🔍',
    desc: 'Interactive convex/concave lens ray tracing: principal rays, real/virtual images, and magnification.'
  },
  {
    id: 'electric_field',
    name: 'Coulomb Electric Field & Dipole',
    category: 'Electromagnetism',
    icon: '🧲',
    desc: 'Visualize electric field vector lines and equipotential contour rings for point charges.'
  },
  {
    id: 'collisions',
    name: '2D Momentum & Elastic Collisions',
    category: 'Mechanics',
    icon: '🎱',
    desc: 'Analyze conservation of momentum (p = mv) and kinetic energy across elastic/inelastic impacts.'
  },
  {
    id: 'rigid_sandbox',
    name: 'Interactive 2D Rigid-Body Sandbox',
    category: 'Mechanics',
    icon: '📦',
    desc: 'Dynamic physics sandbox with gravity, surface friction, restitution, and draggable bodies.'
  }
];

export class PhetRunnerModal {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.activeSimId = 'ohms_law';
    this.animId = null;
    this.simState = {
      voltage: 9.0,
      resistance: 500,
      angle: 45,
      speed: 25,
      frequency: 2.0,
      focalLength: 80,
      objectDistance: 160,
      objectHeight: 50,
      charge1: 5,
      charge2: -5,
      mass1: 2.0,
      mass2: 1.0,
      elasticity: 0.95
    };

    // Rigid body sandbox particles
    this.sandboxBodies = [
      { x: 150, y: 50, vx: 2, vy: 0, r: 18, color: '#38bdf8', mass: 1 },
      { x: 300, y: 70, vx: -1.5, vy: 0, r: 24, color: '#ec4899', mass: 2 },
      { x: 450, y: 90, vx: 0.8, vy: 0, r: 16, color: '#22c55e', mass: 0.8 }
    ];
  }

  show() {
    if (this.container) this.container.remove();

    const overlay = document.createElement('div');
    overlay.className = 'phet-runner-overlay';
    overlay.innerHTML = `
      <div class="phet-modal-card">
        <div class="phet-modal-header">
          <div class="phet-modal-title">
            <span class="modal-icon">⚛️</span>
            <span>${t('PhET STEM Interactive Simulation Runner')}</span>
          </div>
          <button class="phet-modal-close" title="${t('Close (Esc)')}">✕</button>
        </div>
        <div class="phet-modal-body">
          <div class="phet-sidebar">
            <div class="phet-sim-list">
              <!-- Preset buttons rendered here -->
            </div>
            <div class="phet-actions-box">
              <button class="phet-capture-btn">
                <span>📸</span>
                <span>${t('Capture Snapshot to Board')}</span>
              </button>
            </div>
          </div>
          <div class="phet-stage-pane">
            <div class="phet-stage-header">
              <h4 class="stage-sim-name">Ohm's Law Lab</h4>
              <p class="stage-sim-desc">V = I · R</p>
            </div>
            <div class="phet-canvas-wrapper">
              <canvas class="phet-sim-canvas" width="600" height="340"></canvas>
            </div>
            <div class="phet-controls-bar">
              <!-- Sliders injected here -->
            </div>
          </div>
        </div>
      </div>
    `;

    overlay.querySelector('.phet-modal-close').addEventListener('click', () => this.hide());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hide();
    });

    overlay.querySelector('.phet-capture-btn').addEventListener('click', () => {
      this.captureFrameToBoard();
    });

    document.body.appendChild(overlay);
    this.container = overlay;

    this.renderSidebar();
    this.switchSim(this.activeSimId);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        this.hide();
        window.removeEventListener('keydown', onKey);
      }
    };
    window.addEventListener('keydown', onKey);
  }

  hide() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  renderSidebar() {
    const list = this.container?.querySelector('.phet-sim-list');
    if (!list) return;
    list.innerHTML = '';

    SIMULATION_PRESETS.forEach((sim) => {
      const item = document.createElement('div');
      item.className = `phet-sim-card ${this.activeSimId === sim.id ? 'active' : ''}`;
      item.innerHTML = `
        <span class="card-icon">${sim.icon}</span>
        <div class="card-meta">
          <span class="card-name">${sim.name}</span>
          <span class="card-cat">${sim.category}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        this.container?.querySelectorAll('.phet-sim-card').forEach((c) => c.classList.remove('active'));
        item.classList.add('active');
        this.switchSim(sim.id);
      });
      list.appendChild(item);
    });
  }

  switchSim(simId) {
    this.activeSimId = simId;
    const sim = SIMULATION_PRESETS.find((s) => s.id === simId) || SIMULATION_PRESETS[0];

    const title = this.container?.querySelector('.stage-sim-name');
    const desc = this.container?.querySelector('.stage-sim-desc');
    if (title) title.textContent = sim.name;
    if (desc) desc.textContent = sim.desc;

    this.renderControls(simId);
    this.startSimLoop();
  }

  renderControls(simId) {
    const bar = this.container?.querySelector('.phet-controls-bar');
    if (!bar) return;
    bar.innerHTML = '';

    if (simId === 'ohms_law') {
      bar.innerHTML = `
        <div class="sim-ctrl-group">
          <label>Voltage: <span id="valV">${this.simState.voltage} V</span></label>
          <input type="range" id="sliderV" min="0.5" max="15" step="0.5" value="${this.simState.voltage}">
        </div>
        <div class="sim-ctrl-group">
          <label>Resistance: <span id="valR">${this.simState.resistance} Ω</span></label>
          <input type="range" id="sliderR" min="10" max="1000" step="10" value="${this.simState.resistance}">
        </div>
      `;
      bar.querySelector('#sliderV').addEventListener('input', (e) => {
        this.simState.voltage = parseFloat(e.target.value);
        bar.querySelector('#valV').textContent = `${this.simState.voltage} V`;
      });
      bar.querySelector('#sliderR').addEventListener('input', (e) => {
        this.simState.resistance = parseInt(e.target.value, 10);
        bar.querySelector('#valR').textContent = `${this.simState.resistance} Ω`;
      });
    } else if (simId === 'projectile') {
      bar.innerHTML = `
        <div class="sim-ctrl-group">
          <label>Launch Angle: <span id="valA">${this.simState.angle}°</span></label>
          <input type="range" id="sliderA" min="10" max="85" step="1" value="${this.simState.angle}">
        </div>
        <div class="sim-ctrl-group">
          <label>Velocity: <span id="valS">${this.simState.speed} m/s</span></label>
          <input type="range" id="sliderS" min="5" max="50" step="1" value="${this.simState.speed}">
        </div>
      `;
      bar.querySelector('#sliderA').addEventListener('input', (e) => {
        this.simState.angle = parseInt(e.target.value, 10);
        bar.querySelector('#valA').textContent = `${this.simState.angle}°`;
      });
      bar.querySelector('#sliderS').addEventListener('input', (e) => {
        this.simState.speed = parseInt(e.target.value, 10);
        bar.querySelector('#valS').textContent = `${this.simState.speed} m/s`;
      });
    } else if (simId === 'optics') {
      bar.innerHTML = `
        <div class="sim-ctrl-group">
          <label>Focal Length f: <span id="valF">${this.simState.focalLength} mm</span></label>
          <input type="range" id="sliderF" min="40" max="140" step="5" value="${this.simState.focalLength}">
        </div>
        <div class="sim-ctrl-group">
          <label>Object Distance dₒ: <span id="valDo">${this.simState.objectDistance} mm</span></label>
          <input type="range" id="sliderDo" min="50" max="240" step="5" value="${this.simState.objectDistance}">
        </div>
      `;
      bar.querySelector('#sliderF').addEventListener('input', (e) => {
        this.simState.focalLength = parseInt(e.target.value, 10);
        bar.querySelector('#valF').textContent = `${this.simState.focalLength} mm`;
      });
      bar.querySelector('#sliderDo').addEventListener('input', (e) => {
        this.simState.objectDistance = parseInt(e.target.value, 10);
        bar.querySelector('#valDo').textContent = `${this.simState.objectDistance} mm`;
      });
    } else if (simId === 'electric_field') {
      bar.innerHTML = `
        <div class="sim-ctrl-group">
          <label>Charge q₁: <span id="valQ1">${this.simState.charge1 > 0 ? '+' : ''}${this.simState.charge1} µC</span></label>
          <input type="range" id="sliderQ1" min="-10" max="10" step="1" value="${this.simState.charge1}">
        </div>
        <div class="sim-ctrl-group">
          <label>Charge q₂: <span id="valQ2">${this.simState.charge2 > 0 ? '+' : ''}${this.simState.charge2} µC</span></label>
          <input type="range" id="sliderQ2" min="-10" max="10" step="1" value="${this.simState.charge2}">
        </div>
      `;
      bar.querySelector('#sliderQ1').addEventListener('input', (e) => {
        this.simState.charge1 = parseInt(e.target.value, 10);
        bar.querySelector('#valQ1').textContent = `${this.simState.charge1 > 0 ? '+' : ''}${this.simState.charge1} µC`;
      });
      bar.querySelector('#sliderQ2').addEventListener('input', (e) => {
        this.simState.charge2 = parseInt(e.target.value, 10);
        bar.querySelector('#valQ2').textContent = `${this.simState.charge2 > 0 ? '+' : ''}${this.simState.charge2} µC`;
      });
    } else if (simId === 'collisions') {
      bar.innerHTML = `
        <div class="sim-ctrl-group">
          <label>Mass m₁: <span id="valM1">${this.simState.mass1.toFixed(1)} kg</span></label>
          <input type="range" id="sliderM1" min="0.5" max="5.0" step="0.5" value="${this.simState.mass1}">
        </div>
        <div class="sim-ctrl-group">
          <label>Elasticity e: <span id="valE">${this.simState.elasticity.toFixed(2)}</span></label>
          <input type="range" id="sliderE" min="0" max="1" step="0.05" value="${this.simState.elasticity}">
        </div>
      `;
      bar.querySelector('#sliderM1').addEventListener('input', (e) => {
        this.simState.mass1 = parseFloat(e.target.value);
        bar.querySelector('#valM1').textContent = `${this.simState.mass1.toFixed(1)} kg`;
      });
      bar.querySelector('#sliderE').addEventListener('input', (e) => {
        this.simState.elasticity = parseFloat(e.target.value);
        bar.querySelector('#valE').textContent = this.simState.elasticity.toFixed(2);
      });
    } else {
      bar.innerHTML = `
        <div class="sim-ctrl-group">
          <label>Frequency: <span id="valF">${this.simState.frequency} Hz</span></label>
          <input type="range" id="sliderF" min="0.5" max="5" step="0.1" value="${this.simState.frequency}">
        </div>
      `;
      bar.querySelector('#sliderF').addEventListener('input', (e) => {
        this.simState.frequency = parseFloat(e.target.value);
        bar.querySelector('#valF').textContent = `${this.simState.frequency} Hz`;
      });
    }
  }

  startSimLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const canvas = this.container?.querySelector('.phet-sim-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let t = 0;
    const render = () => {
      t += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (this.activeSimId === 'ohms_law') {
        this.drawOhmsLaw(ctx, canvas.width, canvas.height, t);
      } else if (this.activeSimId === 'projectile') {
        this.drawProjectile(ctx, canvas.width, canvas.height, t);
      } else if (this.activeSimId === 'optics') {
        this.drawOptics(ctx, canvas.width, canvas.height, t);
      } else if (this.activeSimId === 'electric_field') {
        this.drawElectricField(ctx, canvas.width, canvas.height, t);
      } else if (this.activeSimId === 'collisions') {
        this.drawCollisions(ctx, canvas.width, canvas.height, t);
      } else if (this.activeSimId === 'pendulum') {
        this.drawPendulum(ctx, canvas.width, canvas.height, t);
      } else if (this.activeSimId === 'rigid_sandbox') {
        this.drawRigidSandbox(ctx, canvas.width, canvas.height, t);
      } else {
        this.drawWaves(ctx, canvas.width, canvas.height, t);
      }

      this.animId = requestAnimationFrame(render);
    };

    render();
  }

  drawOhmsLaw(ctx, w, h, t) {
    const v = this.simState.voltage;
    const r = this.simState.resistance;
    const currentAmp = v / r;
    const currentMa = (currentAmp * 1000).toFixed(1);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Circuit wires
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(80, 60, w - 160, h - 120, 16);
    ctx.stroke();

    // Moving electron current dots
    const loopLen = 2 * (w - 160 + h - 120);
    const speed = Math.min(24, Math.max(1, currentAmp * 400));
    const offset = (t * speed * 20) % 40;

    ctx.fillStyle = '#fde047';
    for (let d = offset; d < loopLen; d += 35) {
      const pt = this.getPerimeterPoint(d, 80, 60, w - 160, h - 120);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Battery symbol on left
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(50, h / 2 - 35, 60, 70);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(50, h / 2 - 35, 60, 70);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${v} V`, 80, h / 2 + 5);

    // Resistor on right
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(w - 110, h / 2 - 35, 60, 70);
    ctx.strokeStyle = '#f97316';
    ctx.strokeRect(w - 110, h / 2 - 35, 60, 70);
    ctx.fillStyle = '#f97316';
    ctx.fillText(`${r} Ω`, w - 80, h / 2 + 5);

    // Multimeter Readout in center
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(w / 2 - 110, h / 2 - 40, 220, 80, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`I = ${currentMa} mA`, w / 2, h / 2 + 5);
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`P = ${(v * currentAmp).toFixed(3)} W`, w / 2, h / 2 + 25);
  }

  getPerimeterPoint(d, x, y, w, h) {
    if (d < w) return { x: x + d, y: y };
    d -= w;
    if (d < h) return { x: x + w, y: y + d };
    d -= h;
    if (d < w) return { x: x + w - d, y: y + h };
    d -= w;
    return { x: x, y: y + h - d };
  }

  drawProjectile(ctx, w, h, t) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const rad = (this.simState.angle * Math.PI) / 180;
    const v0 = this.simState.speed;
    const g = 9.81;

    // Ground line
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, h - 40);
    ctx.lineTo(w - 40, h - 40);
    ctx.stroke();

    // Trajectory curve
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    const scale = 2.4;
    const tTotal = (2 * v0 * Math.sin(rad)) / g;
    const maxRange = (v0 * v0 * Math.sin(2 * rad)) / g;
    const maxHeight = (v0 * v0 * Math.sin(rad) * Math.sin(rad)) / (2 * g);

    for (let simT = 0; simT <= tTotal; simT += 0.05) {
      const px = 40 + v0 * Math.cos(rad) * simT * scale;
      const py = (h - 40) - (v0 * Math.sin(rad) * simT - 0.5 * g * simT * simT) * scale;
      if (simT === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Animated projectile ball
    const animT = (t % tTotal);
    const bx = 40 + v0 * Math.cos(rad) * animT * scale;
    const by = (h - 40) - (v0 * Math.sin(rad) * animT - 0.5 * g * animT * animT) * scale;

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fill();

    // Stats
    ctx.fillStyle = '#f8fafc';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`Max Height: ${maxHeight.toFixed(1)} m`, w - 210, 40);
    ctx.fillText(`Total Range: ${maxRange.toFixed(1)} m`, w - 210, 65);
    ctx.fillText(`Flight Time: ${tTotal.toFixed(2)} s`, w - 210, 90);
  }

  drawWaves(ctx, w, h, t) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const freq = this.simState.frequency;
    const src1 = { x: w * 0.35, y: h * 0.5 };
    const src2 = { x: w * 0.65, y: h * 0.5 };

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(src1.x, src1.y, 6, 0, Math.PI * 2);
    ctx.arc(src2.x, src2.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Animated ripple rings
    ctx.lineWidth = 1.5;
    for (let r = (t * 25) % 40; r < 240; r += 30) {
      const alpha = Math.max(0, 1 - r / 240);
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(src1.x, src1.y, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(src2.x, src2.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawPendulum(ctx, w, h, t) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const pivotX = w / 2;
    const pivotY = 35;
    const length = 180;
    const thetaMax = 0.55; // rad (~32 deg)
    const omega = 2.2;
    const theta = thetaMax * Math.cos(omega * t);

    const bobX = pivotX + length * Math.sin(theta);
    const bobY = pivotY + length * Math.cos(theta);

    // Support stand
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pivotX - 50, pivotY); ctx.lineTo(pivotX + 50, pivotY);
    ctx.stroke();

    // Rod
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY); ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // Pivot pin
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Bob
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(bobX, bobY, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Energy Bars
    const pe = 0.5 * (1 - Math.cos(theta));
    const ke = 0.5 * Math.sin(thetaMax) * Math.sin(thetaMax) - pe;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(30, h - 30, Math.max(0, ke) * 350, 14);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(30, h - 50, Math.max(0, pe) * 350, 14);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px sans-serif';
    ctx.fillText('Potential Energy (PE)', 30, h - 55);
    ctx.fillText('Kinetic Energy (KE)', 30, h - 35);
  }

  drawOptics(ctx, w, h, t) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const f = this.simState.focalLength;
    const do_val = this.simState.objectDistance;
    const ho = this.simState.objectHeight;
    const cx = w / 2;
    const cy = h / 2;

    // Optical Axis
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, cy); ctx.lineTo(w - 20, cy);
    ctx.stroke();

    // Convex Lens
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 10, h * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Focal points F1 and F2
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(cx - f, cy, 4, 0, Math.PI * 2);
    ctx.arc(cx + f, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '10px sans-serif';
    ctx.fillText('F₁', cx - f - 4, cy + 16);
    ctx.fillText('F₂', cx + f - 4, cy + 16);

    // Object Arrow
    const ox = cx - do_val;
    const oy = cy - ho;
    ctx.strokeStyle = '#22c55e';
    ctx.fillStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ox, cy); ctx.lineTo(ox, oy);
    ctx.stroke();
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(ox - 5, oy + 8); ctx.lineTo(ox, oy); ctx.lineTo(ox + 5, oy + 8);
    ctx.fill();

    // Calculate Image
    const di = (f * do_val) / (do_val - f);
    const hi = -ho * (di / do_val);
    const ix = cx + di;
    const iy = cy - hi;

    // Principal Rays
    ctx.lineWidth = 1.2;
    // Ray 1: Parallel to lens -> through F2
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.beginPath();
    ctx.moveTo(ox, oy); ctx.lineTo(cx, oy); ctx.lineTo(cx + Math.min(260, di * 1.4), cy + (oy - cy) + (Math.min(260, di * 1.4) / di) * (iy - (cy + (oy - cy))));
    ctx.stroke();

    // Ray 2: Through optical center (cx, cy)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.beginPath();
    ctx.moveTo(ox, oy); ctx.lineTo(cx + Math.min(260, di * 1.4), cy + (Math.min(260, di * 1.4) / do_val) * ho);
    ctx.stroke();

    // Draw Image Arrow
    if (Number.isFinite(di) && Math.abs(di) < 320) {
      ctx.strokeStyle = '#ec4899';
      ctx.fillStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ix, cy); ctx.lineTo(ix, iy);
      ctx.stroke();
      ctx.beginPath();
      const dir = hi < 0 ? 1 : -1;
      ctx.moveTo(ix - 5, iy - dir * 8); ctx.lineTo(ix, iy); ctx.lineTo(ix + 5, iy - dir * 8);
      ctx.fill();
    }

    // Readout
    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Image Distance dᵢ = ${di.toFixed(1)} mm | Magnification M = ${(di / do_val).toFixed(2)}x`, 24, 28);
  }

  drawElectricField(ctx, w, h, t) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const c1 = { x: w * 0.35, y: h * 0.5, q: this.simState.charge1 };
    const c2 = { x: w * 0.65, y: h * 0.5, q: this.simState.charge2 };

    // Vector field arrows grid
    ctx.lineWidth = 1.2;
    for (let x = 30; x < w - 20; x += 35) {
      for (let y = 30; y < h - 20; y += 35) {
        const dx1 = x - c1.x, dy1 = y - c1.y;
        const d1 = Math.hypot(dx1, dy1) || 1;
        const e1x = (c1.q / (d1 * d1)) * (dx1 / d1);
        const e1y = (c1.q / (d1 * d1)) * (dy1 / d1);

        const dx2 = x - c2.x, dy2 = y - c2.y;
        const d2 = Math.hypot(dx2, dy2) || 1;
        const e2x = (c2.q / (d2 * d2)) * (dx2 / d2);
        const e2y = (c2.q / (d2 * d2)) * (dy2 / d2);

        const ex = e1x + e2x;
        const ey = e1y + e2y;
        const mag = Math.hypot(ex, ey) || 0.0001;
        const arrowLen = Math.min(18, mag * 8000);

        ctx.strokeStyle = `rgba(56, 189, 248, ${Math.min(1, mag * 4000)})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (ex / mag) * arrowLen, y + (ey / mag) * arrowLen);
        ctx.stroke();
      }
    }

    // Point Charges
    [c1, c2].forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = c.q >= 0 ? '#ef4444' : '#3b82f6';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.q >= 0 ? '+' : '−', c.x, c.y);
    });
  }

  drawCollisions(ctx, w, h, t) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const m1 = this.simState.mass1;
    const m2 = this.simState.mass2;
    const e = this.simState.elasticity;

    // Track
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30, h * 0.65); ctx.lineTo(w - 30, h * 0.65);
    ctx.stroke();

    // Collision kinematics cycle
    const cycle = (t * 1.5) % 4; // 0 to 4s cycle
    let x1, x2, v1, v2;
    const v1_init = 60, v2_init = -40;

    if (cycle < 2) {
      // Approaching
      x1 = 60 + v1_init * cycle;
      x2 = w - 60 + v2_init * cycle;
      v1 = v1_init;
      v2 = v2_init;
    } else {
      // Rebounding after impact at cycle = 2
      const postT = cycle - 2;
      const v1_post = ((m1 - e * m2) / (m1 + m2)) * v1_init + (((1 + e) * m2) / (m1 + m2)) * v2_init;
      const v2_post = (((1 + e) * m1) / (m1 + m2)) * v1_init + ((m2 - e * m1) / (m1 + m2)) * v2_init;
      x1 = (60 + v1_init * 2) + v1_post * postT;
      x2 = (w - 60 + v2_init * 2) + v2_post * postT;
      v1 = v1_post;
      v2 = v2_post;
    }

    const r1 = Math.max(12, Math.min(28, 12 * Math.sqrt(m1)));
    const r2 = Math.max(12, Math.min(28, 12 * Math.sqrt(m2)));

    // Ball 1
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(x1, h * 0.65 - r1, r1, 0, Math.PI * 2);
    ctx.fill();

    // Ball 2
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(x2, h * 0.65 - r2, r2, 0, Math.PI * 2);
    ctx.fill();

    // Stats
    const pTotal = m1 * v1 + m2 * v2;
    const keTotal = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
    ctx.fillStyle = '#f8fafc';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Total Momentum p = ${pTotal.toFixed(1)} kg·m/s (Conserved)`, 24, 30);
    ctx.fillText(`Total Kinetic Energy KE = ${(keTotal / 1000).toFixed(2)} kJ`, 24, 50);
  }

  drawRigidSandbox(ctx, w, h, t) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Floor and walls
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, h - 30); ctx.lineTo(w - 20, h - 30);
    ctx.moveTo(20, 20); ctx.lineTo(20, h - 30);
    ctx.moveTo(w - 20, 20); ctx.lineTo(w - 20, h - 30);
    ctx.stroke();

    const g = 0.35;
    const restitution = 0.82;

    // Step physics
    for (const b of this.sandboxBodies) {
      b.vy += g;
      b.x += b.vx;
      b.y += b.vy;

      // Floor bounce
      if (b.y + b.r >= h - 30) {
        b.y = h - 30 - b.r;
        b.vy = -b.vy * restitution;
        b.vx *= 0.98; // Friction
      }
      // Wall bounce
      if (b.x - b.r <= 20) {
        b.x = 20 + b.r;
        b.vx = -b.vx * restitution;
      } else if (b.x + b.r >= w - 20) {
        b.x = w - 20 - b.r;
        b.vx = -b.vx * restitution;
      }

      // Draw body
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('Interactive 2D Rigid Bodies (Gravity, Surface Friction & Elastic Restitution)', 30, 25);
  }

  captureFrameToBoard() {
    const canvas = this.container?.querySelector('.phet-sim-canvas');
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const view = this.app.surface.cam.viewport(this.app.surface.width, this.app.surface.height);
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;

    const imgObj = {
      id: uid('img'),
      type: 'image',
      x: cx - 220,
      y: cy - 130,
      w: 440,
      h: 260,
      src: dataUrl,
      label: `PhET Simulation Snapshot — ${this.activeSimId}`
    };

    this.app.store.add(imgObj, 'capture phet simulation snapshot');
    this.app.surface.selection?.clear?.();
    this.app.surface.selection?.add?.(imgObj.id);
    this.app.surface.invalidate?.();
    this.app.toast?.(t('Simulation snapshot captured and placed on whiteboard.'));
    this.hide();
  }
}
