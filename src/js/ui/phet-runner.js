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
      frequency: 2.0
    };
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
    } else {
      bar.innerHTML = `
        <div class="sim-ctrl-group">
          <label>Wave Frequency: <span id="valF">${this.simState.frequency} Hz</span></label>
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
