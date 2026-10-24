/**
 * @file circuit-workbench.js
 * @description Interactive 2.5D Industrial Circuit Simulation Workbench Modal (GazBoard Phase 4 / v6.4.0)
 *
 * Implements Document 6 Section 2.1 & 2.2:
 * - High-fidelity 2.5D visual industrial components (MCB, Contactor, Overload Relay, Pushbuttons, Motor, Lights)
 * - Magnetic terminal lug snapping & cubic Bézier spline wire routing
 * - Animated electron current flow visualization
 * - Interactive Digital Multimeter (DMM) with live probing and audio continuity beep
 * - Dual-trace live oscilloscope waveform display
 * - 1-Click "Snapshot to Whiteboard" with p.t timestamp preservation
 * - Bill of Materials (BOM) & Relay Ladder Logic exporter
 */

import { IndustrialCircuitSim, circuitAudio } from '../core/circuit-sim.js';
import { LADDER_PRESETS } from '../core/diagram-builder.js';
import { t } from '../i18n.js';

export class CircuitWorkbenchModal {
  constructor(app) {
    this.app = app;
    this.sim = new IndustrialCircuitSim();
    this.modal = null;
    this.canvas = null;
    this.ctx = null;
    this.animFrameId = null;
    this.wireColor = '#e81123'; // Default control wire (Red)

    // Wire dragging interaction state
    this.activeWireSource = null; // 'comp:port'
    this.mousePos = { x: 0, y: 0 };
    this.hoveredPort = null;

    // Terminal Port Hitbox Registry: Map<'comp:port', { x, y, compId, portName, label }>
    this.portHitboxes = new Map();

    // Multimeter drag / probe state
    this.selectedProbe = null; // 'red' | 'black'

    // Oscilloscope tray open state
    this.scopeVisible = false;

    // Initialize with standard Direct-On-Line (DOL) Starter preset
    this.sim.loadPresetDOL();
  }

  show() {
    if (!this.modal) {
      this.buildModal();
    }
    this.modal.classList.add('visible');
    this.resizeCanvas();
    this.startSimulationLoop();
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('visible');
    }
    this.stopSimulationLoop();
  }

  startSimulationLoop() {
    if (this.animFrameId) return;
    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      if (this.sim.running) {
        this.sim.step(dt);
      }

      this.render();
      this.updateHudReadouts();
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  stopSimulationLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  buildModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'circuit-workbench-backdrop';

    const container = document.createElement('div');
    container.className = 'circuit-workbench-modal glass-card';

    // 1. Header with Controls
    const header = document.createElement('div');
    header.className = 'workbench-header';

    const titleArea = document.createElement('div');
    titleArea.className = 'workbench-title-area';
    titleArea.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <h3>${t('Industrial Electrical Workbench (2.5D Simulation)')}</h3>
      <span class="workbench-badge">v6.4.0 MNA</span>
    `;

    // Presets Selector
    const presetSelect = document.createElement('select');
    presetSelect.className = 'workbench-select';
    presetSelect.innerHTML = `
      <option value="dol">${t('Direct-On-Line (DOL) Starter')}</option>
      <option value="rev">${t('Forward-Reverse Interlock')}</option>
      <option value="clear">${t('Empty Breadboard (Custom Wiring)')}</option>
    `;
    presetSelect.addEventListener('change', (e) => {
      if (e.target.value === 'dol') this.sim.loadPresetDOL();
      else if (e.target.value === 'rev') this.sim.loadPresetForwardReverse();
      else if (e.target.value === 'clear') this.sim.clear();
      this.rebuildPortHitboxes();
    });

    // Wire Color Palette
    const colorGroup = document.createElement('div');
    colorGroup.className = 'workbench-color-group';
    const wireColors = [
      { color: '#e81123', label: t('Red (Control / DC+)') },
      { color: '#8b4513', label: t('Brown (Phase L1)') },
      { color: '#201f1e', label: t('Black (Phase L2 / DC-)') },
      { color: '#605e5c', label: t('Grey (Phase L3)') },
      { color: '#0078d4', label: t('Blue (Neutral N)') },
      { color: '#107c41', label: t('Green/Yellow (PE Earth)') }
    ];

    wireColors.forEach((wc) => {
      const dot = document.createElement('button');
      dot.className = `wire-color-dot ${this.wireColor === wc.color ? 'active' : ''}`;
      dot.style.backgroundColor = wc.color;
      dot.title = wc.label;
      dot.addEventListener('click', () => {
        this.wireColor = wc.color;
        colorGroup.querySelectorAll('.wire-color-dot').forEach((d) => d.classList.remove('active'));
        dot.classList.add('active');
      });
      colorGroup.appendChild(dot);
    });

    // DC Supply Voltage Slider Control
    const dcControl = document.createElement('div');
    dcControl.className = 'workbench-dc-control';
    dcControl.style.cssText = 'display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);';
    dcControl.innerHTML = `
      <span style="font-size:11px;color:#94a3b8;white-space:nowrap;">${t('DC Supply')}:</span>
      <input type="range" class="workbench-dc-slider" min="0" max="30" step="0.5" value="${this.sim.dcSupplyVoltage || 24}" style="width:70px;cursor:pointer;">
      <b class="workbench-dc-val" style="color:#00f0ff;font-size:12px;min-width:38px;">${(this.sim.dcSupplyVoltage || 24).toFixed(1)}V</b>
    `;
    const dcSlider = dcControl.querySelector('.workbench-dc-slider');
    const dcVal = dcControl.querySelector('.workbench-dc-val');
    dcSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.sim.dcSupplyVoltage = v;
      dcVal.textContent = `${v.toFixed(1)}V`;
    });

    // Action Buttons
    const btnReset = document.createElement('button');
    btnReset.className = 'workbench-btn';
    btnReset.innerHTML = `<span>🔄</span> ${t('Reset Trip')}`;
    btnReset.title = t('Reset thermal overload trip & pushbuttons');
    btnReset.addEventListener('click', () => {
      for (const comp of this.sim.components.values()) {
        if (comp.type === 'overload_relay') comp.tripped = false;
        if (comp.type === 'breaker') comp.tripped = false;
        if (comp.type === 'estop') comp.latched = false;
      }
      this.app.toast?.(t('Protection circuits reset to normal state.'));
    });

    const btnSnap = document.createElement('button');
    btnSnap.className = 'workbench-btn btn-primary';
    btnSnap.innerHTML = `<span>📸</span> ${t('Stamp to Whiteboard')}`;
    btnSnap.title = t('Capture simulated circuit snapshot onto canvas');
    btnSnap.addEventListener('click', () => this.stampToWhiteboard());

    const btnBOM = document.createElement('button');
    btnBOM.className = 'workbench-btn';
    btnBOM.innerHTML = `<span>📋</span> ${t('Export BOM & Ladder')}`;
    btnBOM.title = t('Export Bill of Materials and ladder logic table');
    btnBOM.addEventListener('click', () => this.exportBOM());

    const btnClose = document.createElement('button');
    btnClose.className = 'workbench-close-btn';
    btnClose.innerHTML = '&times;';
    btnClose.title = t('Close (Esc)');
    btnClose.addEventListener('click', () => this.close());

    header.appendChild(titleArea);
    header.appendChild(presetSelect);
    header.appendChild(dcControl);
    header.appendChild(colorGroup);
    header.appendChild(btnReset);
    header.appendChild(btnSnap);
    header.appendChild(btnBOM);
    header.appendChild(btnClose);

    // 2. Main Body: Workbench Canvas + Floating Multimeter HUD
    const body = document.createElement('div');
    body.className = 'workbench-body';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'workbench-canvas';
    this.ctx = this.canvas.getContext('2d');

    // Attach Canvas Event Listeners
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));

    // Floating Digital Multimeter HUD Widget
    this.dmmWidget = this.buildDmmWidget();

    body.appendChild(this.canvas);
    body.appendChild(this.dmmWidget);

    // 3. Bottom Oscilloscope Drawer (Collapsible)
    const scopeBar = document.createElement('div');
    scopeBar.className = 'workbench-scope-bar';
    scopeBar.innerHTML = `
      <div class="scope-header">
        <span class="scope-title">📈 ${t('Dual-Trace Virtual Oscilloscope')}</span>
        <button class="scope-toggle-btn">${t('Toggle Trace Display')}</button>
      </div>
      <div class="scope-content">
        <canvas class="scope-canvas" width="600" height="90"></canvas>
      </div>
    `;

    const toggleBtn = scopeBar.querySelector('.scope-toggle-btn');
    toggleBtn.addEventListener('click', () => {
      scopeBar.classList.toggle('expanded');
      this.scopeVisible = scopeBar.classList.contains('expanded');
    });

    this.scopeCanvas = scopeBar.querySelector('.scope-canvas');
    this.scopeCtx = this.scopeCanvas.getContext('2d');

    container.appendChild(header);
    container.appendChild(body);
    container.appendChild(scopeBar);
    backdrop.appendChild(container);

    // Close on backdrop click or Escape
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.classList.contains('visible')) {
        this.close();
      }
    });

    document.body.appendChild(backdrop);
    this.modal = backdrop;
    this.rebuildPortHitboxes();
  }

  buildDmmWidget() {
    const dmm = document.createElement('div');
    dmm.className = 'workbench-dmm-hud';

    dmm.innerHTML = `
      <div class="dmm-bezel">
        <div class="dmm-brand">GAUSS-TECH 87V</div>
        <div class="dmm-lcd">
          <span class="dmm-digits">0.0</span>
          <span class="dmm-unit">V AC</span>
          <span class="dmm-heat-badge" style="display:none;position:absolute;top:2px;right:6px;font-size:9px;color:#ef4444;font-weight:bold;">🔥 OVERHEAT</span>
        </div>
        <div class="dmm-dial-row">
          <button class="dmm-dial-btn active" data-mode="VAC">V~</button>
          <button class="dmm-dial-btn" data-mode="VDC">V=</button>
          <button class="dmm-dial-btn" data-mode="AAC">A~</button>
          <button class="dmm-dial-btn" data-mode="WATT">W</button>
          <button class="dmm-dial-btn" data-mode="RES">Ω</button>
          <button class="dmm-dial-btn" data-mode="CONT">🔊</button>
        </div>
        <div class="dmm-probes-row">
          <div class="dmm-probe red-probe" title="${t('Click to attach Red (+) Probe to next clicked terminal')}">
            <span class="probe-pin"></span>
            <span class="probe-label">${t('Red: ')}<b class="red-target">${this.sim.dmm.red || t('None')}</b></span>
          </div>
          <div class="dmm-probe black-probe" title="${t('Click to attach Black (-) Probe to next clicked terminal')}">
            <span class="probe-pin"></span>
            <span class="probe-label">${t('Blk: ')}<b class="black-target">${this.sim.dmm.black || t('None')}</b></span>
          </div>
        </div>
      </div>
    `;

    // Dial mode switching
    const dialBtns = dmm.querySelectorAll('.dmm-dial-btn');
    dialBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        dialBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.sim.dmm.mode = btn.dataset.mode;
        circuitAudio.playButtonClick();
      });
    });

    // Probe arming buttons
    const redProbe = dmm.querySelector('.red-probe');
    redProbe.addEventListener('click', () => {
      this.selectedProbe = this.selectedProbe === 'red' ? null : 'red';
      redProbe.classList.toggle('armed', this.selectedProbe === 'red');
      dmm.querySelector('.black-probe').classList.remove('armed');
      this.app.toast?.(t('Click any terminal lug on the board to attach RED probe lead.'));
    });

    const blackProbe = dmm.querySelector('.black-probe');
    blackProbe.addEventListener('click', () => {
      this.selectedProbe = this.selectedProbe === 'black' ? null : 'black';
      blackProbe.classList.toggle('armed', this.selectedProbe === 'black');
      dmm.querySelector('.red-probe').classList.remove('armed');
      this.app.toast?.(t('Click any terminal lug on the board to attach BLACK probe lead.'));
    });

    return dmm;
  }

  updateHudReadouts() {
    if (!this.dmmWidget) return;
    const digits = this.dmmWidget.querySelector('.dmm-digits');
    const unit = this.dmmWidget.querySelector('.dmm-unit');
    const redTarget = this.dmmWidget.querySelector('.red-target');
    const blackTarget = this.dmmWidget.querySelector('.black-target');

    if (digits) digits.textContent = this.sim.dmm.reading;
    if (unit) unit.textContent = this.sim.dmm.unit;
    if (redTarget) redTarget.textContent = this.sim.dmm.red || t('None');
    if (blackTarget) blackTarget.textContent = this.sim.dmm.black || t('None');

    const heatBadge = this.dmmWidget.querySelector('.dmm-heat-badge');
    if (heatBadge) {
      heatBadge.style.display = this.sim.dmm.overheatWarning ? 'inline-block' : 'none';
    }

    // Update Oscilloscope Canvas if visible
    if (this.scopeVisible && this.scopeCtx) {
      this.renderOscilloscope();
    }
  }

  renderOscilloscope() {
    const ctx = this.scopeCtx;
    const w = this.scopeCanvas.width;
    const h = this.scopeCanvas.height;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += 20) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Center zero line
    ctx.strokeStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Draw Channel A (Yellow)
    const samples = this.sim.scope.historyA;
    if (samples.length > 1) {
      ctx.strokeStyle = '#ffd94a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < samples.length; i++) {
        const x = (i / this.sim.scope.maxSamples) * w;
        const y = h / 2 - (samples[i] / 400) * (h / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 960) * dpr;
    this.canvas.height = (rect.height || 540) * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.rebuildPortHitboxes();
  }

  rebuildPortHitboxes() {
    this.portHitboxes.clear();

    for (const comp of this.sim.components.values()) {
      const cx = comp.x;
      const cy = comp.y;

      if (comp.type === 'power_source_3p') {
        this.registerPort(`${comp.id}:L1`, cx + 20, cy + 20, 'L1');
        this.registerPort(`${comp.id}:L2`, cx + 50, cy + 20, 'L2');
        this.registerPort(`${comp.id}:L3`, cx + 80, cy + 20, 'L3');
        this.registerPort(`${comp.id}:N`, cx + 110, cy + 20, 'N');
        this.registerPort(`${comp.id}:PE`, cx + 140, cy + 20, 'PE');
      } else if (comp.type === 'breaker') {
        // 3P MCB: 1,3,5 at top; 2,4,6 at bottom
        this.registerPort(`${comp.id}:1`, cx + 25, cy + 20, '1');
        this.registerPort(`${comp.id}:3`, cx + 65, cy + 20, '3');
        this.registerPort(`${comp.id}:5`, cx + 105, cy + 20, '5');
        this.registerPort(`${comp.id}:2`, cx + 25, cy + 180, '2');
        this.registerPort(`${comp.id}:4`, cx + 65, cy + 180, '4');
        this.registerPort(`${comp.id}:6`, cx + 105, cy + 180, '6');
      } else if (comp.type === 'contactor') {
        // Coil A1, A2; Main 1,3,5 top / 2,4,6 bottom; Aux 13-14 NO, 21-22 NC
        this.registerPort(`${comp.id}:A1`, cx + 15, cy + 30, 'A1');
        this.registerPort(`${comp.id}:1`, cx + 45, cy + 20, '1');
        this.registerPort(`${comp.id}:3`, cx + 75, cy + 20, '3');
        this.registerPort(`${comp.id}:5`, cx + 105, cy + 20, '5');
        this.registerPort(`${comp.id}:13`, cx + 135, cy + 30, '13');

        this.registerPort(`${comp.id}:A2`, cx + 15, cy + 170, 'A2');
        this.registerPort(`${comp.id}:2`, cx + 45, cy + 180, '2');
        this.registerPort(`${comp.id}:4`, cx + 75, cy + 180, '4');
        this.registerPort(`${comp.id}:6`, cx + 105, cy + 180, '6');
        this.registerPort(`${comp.id}:14`, cx + 135, cy + 170, '14');
        this.registerPort(`${comp.id}:21`, cx + 15, cy + 100, '21');
        this.registerPort(`${comp.id}:22`, cx + 135, cy + 100, '22');
      } else if (comp.type === 'overload_relay') {
        // Main 1,3,5 top / 2,4,6 bottom; Aux NC 95-96, NO 97-98
        this.registerPort(`${comp.id}:1`, cx + 30, cy + 20, '1');
        this.registerPort(`${comp.id}:3`, cx + 65, cy + 20, '3');
        this.registerPort(`${comp.id}:5`, cx + 100, cy + 20, '5');
        this.registerPort(`${comp.id}:2`, cx + 30, cy + 180, '2');
        this.registerPort(`${comp.id}:4`, cx + 65, cy + 180, '4');
        this.registerPort(`${comp.id}:6`, cx + 100, cy + 180, '6');
        this.registerPort(`${comp.id}:95`, cx + 15, cy + 130, '95');
        this.registerPort(`${comp.id}:96`, cx + 45, cy + 130, '96');
        this.registerPort(`${comp.id}:97`, cx + 85, cy + 130, '97');
        this.registerPort(`${comp.id}:98`, cx + 115, cy + 130, '98');
      } else if (comp.type === 'motor') {
        this.registerPort(`${comp.id}:U1`, cx + 35, cy + 140, 'U1');
        this.registerPort(`${comp.id}:V1`, cx + 70, cy + 140, 'V1');
        this.registerPort(`${comp.id}:W1`, cx + 105, cy + 140, 'W1');
      } else if (comp.type === 'pushbutton') {
        if (comp.buttonType === 'stop') {
          this.registerPort(`${comp.id}:1`, cx + 25, cy + 30, '1');
          this.registerPort(`${comp.id}:2`, cx + 75, cy + 30, '2');
        } else {
          this.registerPort(`${comp.id}:3`, cx + 25, cy + 30, '3');
          this.registerPort(`${comp.id}:4`, cx + 75, cy + 30, '4');
        }
      } else if (comp.type === 'pilot_light') {
        this.registerPort(`${comp.id}:X1`, cx + 20, cy + 70, 'X1');
        this.registerPort(`${comp.id}:X2`, cx + 60, cy + 70, 'X2');
      }
    }
  }

  registerPort(id, x, y, label) {
    this.portHitboxes.set(id, { x, y, id, label });
  }

  // --- Interaction Event Handlers ---
  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // Magnetic port snapping detection (radius: 18px)
    this.hoveredPort = null;
    for (const port of this.portHitboxes.values()) {
      const dist = Math.hypot(port.x - this.mousePos.x, port.y - this.mousePos.y);
      if (dist <= 18) {
        this.hoveredPort = port;
        break;
      }
    }
  }

  onMouseDown(e) {
    if (e.button !== 0) return; // Left click only

    // 1. If a multimeter probe is armed, attach probe to clicked port
    if (this.selectedProbe && this.hoveredPort) {
      if (this.selectedProbe === 'red') {
        this.sim.dmm.red = this.hoveredPort.id;
      } else if (this.selectedProbe === 'black') {
        this.sim.dmm.black = this.hoveredPort.id;
      }
      this.selectedProbe = null;
      this.dmmWidget.querySelectorAll('.dmm-probe').forEach((p) => p.classList.remove('armed'));
      circuitAudio.playButtonClick();
      return;
    }

    // 2. Clicked on a terminal port: start pulling a wire
    if (this.hoveredPort) {
      this.activeWireSource = this.hoveredPort.id;
      return;
    }

    // 3. Clicked on a component interactable control (breaker lever, button, reset)
    for (const comp of this.sim.components.values()) {
      const cx = comp.x;
      const cy = comp.y;

      // Breaker lever click
      if (comp.type === 'breaker') {
        if (this.mousePos.x >= cx + 30 && this.mousePos.x <= cx + 100 &&
            this.mousePos.y >= cy + 80 && this.mousePos.y <= cy + 130) {
          comp.closed = !comp.closed;
          circuitAudio.playBreakerSnap();
          return;
        }
      }

      // Pushbutton click
      if (comp.type === 'pushbutton') {
        const btnDist = Math.hypot(this.mousePos.x - (cx + 50), this.mousePos.y - (cy + 75));
        if (btnDist <= 28) {
          comp.pressed = true;
          circuitAudio.playButtonClick();
          return;
        }
      }

      // Overload Relay Test & Reset buttons
      if (comp.type === 'overload_relay') {
        // Red Test button
        if (Math.hypot(this.mousePos.x - (cx + 40), this.mousePos.y - (cy + 75)) <= 12) {
          comp.tripped = true;
          circuitAudio.playBreakerSnap();
          this.app.toast?.(t('Thermal Overload Relay FR1 tripped (95-96 Open, 97-98 Closed).'));
          return;
        }
        // Blue Reset button
        if (Math.hypot(this.mousePos.x - (cx + 90), this.mousePos.y - (cy + 75)) <= 12) {
          comp.tripped = false;
          circuitAudio.playButtonClick();
          this.app.toast?.(t('Thermal Overload Relay FR1 reset.'));
          return;
        }
      }
    }
  }

  onMouseUp(e) {
    // 1. Release active wire dragging onto destination terminal
    if (this.activeWireSource) {
      if (this.hoveredPort && this.hoveredPort.id !== this.activeWireSource) {
        this.sim.addWire(this.activeWireSource, this.hoveredPort.id, this.wireColor);
        circuitAudio.playButtonClick();
      }
      this.activeWireSource = null;
    }

    // 2. Release pushbuttons (momentary actions)
    for (const comp of this.sim.components.values()) {
      if (comp.type === 'pushbutton' && comp.pressed) {
        comp.pressed = false;
      }
    }
  }

  onContextMenu(e) {
    e.preventDefault();
    // Right click on terminal port: disconnect all wires connected to this port
    if (this.hoveredPort) {
      const portId = this.hoveredPort.id;
      const initialCount = this.sim.wires.length;
      this.sim.wires = this.sim.wires.filter((w) => w.from !== portId && w.to !== portId);
      if (this.sim.wires.length < initialCount) {
        circuitAudio.playButtonClick();
        this.app.toast?.(t('Disconnected wires from terminal {port}', { port: portId }));
      }
    }
  }

  // --- Rendering Pipeline (Canvas 2D 60 FPS) ---
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    // 1. Industrial Backplate (Perforated Steel Din-Rail Bench)
    this.drawIndustrialBackplate(ctx, w, h);

    // 2. Render Components (2.5D SVG/Canvas)
    for (const comp of this.sim.components.values()) {
      this.drawComponent(ctx, comp);
    }

    // 3. Render Connecting Wires (Bézier Splines)
    this.drawWires(ctx);

    // 4. Render Active Dragging Wire
    if (this.activeWireSource) {
      const startPort = this.portHitboxes.get(this.activeWireSource);
      if (startPort) {
        const targetX = this.hoveredPort ? this.hoveredPort.x : this.mousePos.x;
        const targetY = this.hoveredPort ? this.hoveredPort.y : this.mousePos.y;
        this.drawSingleWire(ctx, startPort.x, startPort.y, targetX, targetY, this.wireColor, 0, true);
      }
    }

    // 5. Render Terminal Lugs & Snap Rings
    this.drawTerminalPorts(ctx);
  }

  drawIndustrialBackplate(ctx, w, h) {
    // Subtle perforated workbench pattern
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#0f172a';
    for (let x = 20; x < w; x += 25) {
      for (let y = 20; y < h; y += 25) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Dual DIN-Rails (Top & Bottom mounting rails)
    const rails = [150, 410];
    ctx.fillStyle = '#475569';
    rails.forEach((ry) => {
      ctx.fillRect(10, ry - 14, w - 20, 28);
      ctx.fillStyle = '#334155';
      ctx.fillRect(10, ry - 3, w - 20, 6);
      ctx.fillStyle = '#475569';
    });
  }

  drawComponent(ctx, comp) {
    const cx = comp.x;
    const cy = comp.y;

    ctx.save();
    switch (comp.type) {
      case 'power_source_3p':
        this.drawPowerSource(ctx, comp);
        break;
      case 'breaker':
        this.drawBreaker(ctx, comp);
        break;
      case 'contactor':
        this.drawContactor(ctx, comp);
        break;
      case 'overload_relay':
        this.drawOverloadRelay(ctx, comp);
        break;
      case 'motor':
        this.drawMotor(ctx, comp);
        break;
      case 'pushbutton':
        this.drawPushbutton(ctx, comp);
        break;
      case 'pilot_light':
        this.drawPilotLight(ctx, comp);
        break;
      default:
        break;
    }
    ctx.restore();
  }

  drawPowerSource(ctx, comp) {
    const cx = comp.x;
    const cy = comp.y;
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.roundRect(cx, cy, 160, 70, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('3Φ AC 400V GRID', cx + 18, cy + 55);
  }

  drawBreaker(ctx, comp) {
    const cx = comp.x;
    const cy = comp.y;

    // MCB Plastic Chassis
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.roundRect(cx, cy, 130, 200, 6);
    ctx.fill();
    ctx.stroke();

    // Front label
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('GAUSS C16 3P', cx + 18, cy + 60);

    // Mechanical Toggle Lever
    const leverY = comp.closed ? cy + 90 : cy + 120;
    ctx.fillStyle = comp.closed ? '#dc2626' : '#22c55e';
    ctx.roundRect(cx + 40, leverY, 50, 24, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(comp.closed ? 'ON [ I ]' : 'OFF [ O ]', cx + 43, leverY + 16);
  }

  drawContactor(ctx, comp) {
    const cx = comp.x;
    const cy = comp.y;

    // Contactor Body
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.roundRect(cx, cy, 150, 200, 8);
    ctx.fill();
    ctx.stroke();

    // Center Plunger Armature Window
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx + 45, cy + 70, 60, 60);

    // Moving Armature Indicator (sucks in when energized)
    const armColor = comp.energized ? '#ef4444' : '#64748b';
    const armInset = comp.energized ? 8 : 2;
    ctx.fillStyle = armColor;
    ctx.fillRect(cx + 45 + armInset, cy + 70 + armInset, 60 - armInset * 2, 60 - armInset * 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(comp.energized ? 'IN' : 'OUT', cx + 64, cy + 105);

    // Label
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('KM1 9A 230V', cx + 42, cy + 50);
  }

  drawOverloadRelay(ctx, comp) {
    const cx = comp.x;
    const cy = comp.y;

    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.roundRect(cx, cy, 130, 200, 6);
    ctx.fill();
    ctx.stroke();

    // Red Test Slide Button
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx + 40, cy + 75, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px sans-serif';
    ctx.fillText('TEST', cx + 30, cy + 78);

    // Blue Reset Plunger
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(cx + 90, cy + 75, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('RESET', cx + 78, cy + 78);

    // Status Indicator
    ctx.fillStyle = comp.tripped ? '#ef4444' : '#22c55e';
    ctx.fillRect(cx + 35, cy + 100, 60, 8);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('FR1 OVERLOAD', cx + 22, cy + 50);
  }

  drawMotor(ctx, comp) {
    const cx = comp.x;
    const cy = comp.y;

    // Motor Stator Housing
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.roundRect(cx, cy, 140, 160, 12);
    ctx.fill();
    ctx.stroke();

    // Rotating Shaft / Rotor
    ctx.save();
    ctx.translate(cx + 70, cy + 70);
    const angle = ((comp.rpm || 0) * this.sim.time * 0.05) % (Math.PI * 2);
    ctx.rotate(angle);

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();

    // Fan Blades
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-32, 0);
      ctx.lineTo(32, 0);
      ctx.stroke();
      ctx.rotate(Math.PI / 4);
    }
    ctx.restore();

    // Motor RPM Readout
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px monospace';
    const rpmText = `${Math.round(comp.rpm || 0)} RPM`;
    ctx.fillText(rpmText, cx + 42, cy + 125);
  }

  drawPushbutton(ctx, comp) {
    const cx = comp.x;
    const cy = comp.y;

    // Enclosure Box
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.roundRect(cx, cy, 100, 110, 8);
    ctx.fill();
    ctx.stroke();

    // 3D Bevel Button Head
    const isStop = comp.buttonType === 'stop';
    const baseColor = isStop ? '#dc2626' : '#16a34a';
    const pressedOffset = comp.pressed ? 3 : 0;

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(cx + 50, cy + 75, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(cx + 50 + pressedOffset, cy + 75 + pressedOffset, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(isStop ? 'O' : 'I', cx + 46, cy + 80);
  }

  drawPilotLight(ctx, comp) {
    const cx = comp.x;
    const cy = comp.y;

    ctx.fillStyle = '#334155';
    ctx.roundRect(cx, cy, 80, 100, 6);
    ctx.fill();

    // Glowing Halo when lit
    if (comp.lit) {
      const gradient = ctx.createRadialGradient(cx + 40, cy + 40, 6, cx + 40, cy + 40, 32);
      gradient.addColorStop(0, comp.color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx + 40, cy + 40, 32, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lens
    ctx.fillStyle = comp.lit ? comp.color : '#475569';
    ctx.beginPath();
    ctx.arc(cx + 40, cy + 40, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawWires(ctx) {
    for (const wire of this.sim.wires) {
      const p1 = this.portHitboxes.get(wire.from);
      const p2 = this.portHitboxes.get(wire.to);
      if (p1 && p2) {
        this.drawSingleWire(ctx, p1.x, p1.y, p2.x, p2.y, wire.color, wire.current, false);
      }
    }
  }

  drawSingleWire(ctx, x1, y1, x2, y2, color, current = 0, isDragging = false) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Cubic Bézier curve with vertical sag
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const sag = Math.min(dist * 0.25, 45);

    const cp1x = x1;
    const cp1y = y1 + (y2 >= y1 ? sag : -sag);
    const cp2x = x2;
    const cp2y = y2 + (y2 >= y1 ? sag : -sag);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    ctx.stroke();

    // Animated Current Flow Particles
    if (current > 0.05 && !isDragging) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 12]);
      const offset = (this.sim.time * 60) % 18;
      ctx.lineDashOffset = -offset;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawTerminalPorts(ctx) {
    for (const port of this.portHitboxes.values()) {
      const isHovered = this.hoveredPort && this.hoveredPort.id === port.id;
      const isRedProbe = this.sim.dmm.red === port.id;
      const isBlackProbe = this.sim.dmm.black === port.id;

      // Magnetic Glowing Target Ring on hover
      if (isHovered) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(port.x, port.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Terminal Screw Lug Body
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(port.x, port.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Brass center contact
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(port.x, port.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Multimeter Attached Probe Markers
      if (isRedProbe) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(port.x, port.y - 12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('+', port.x - 3, port.y - 9);
      }
      if (isBlackProbe) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(port.x, port.y - 12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('-', port.x - 2, port.y - 9);
      }
    }
  }

  /**
   * Stamp the current simulated workbench directly onto the GazBoard canvas
   */
  stampToWhiteboard() {
    if (!this.canvas || !this.app) return;

    try {
      const dataUrl = this.canvas.toDataURL('image/png');
      const cam = this.app.surface?.cam || { viewport: { x: 200, y: 200, w: 800, h: 600 }, z: 1 };
      const cx = (cam.viewport?.x || 200) + (cam.viewport?.w || 800) / 2 - 350;
      const cy = (cam.viewport?.y || 200) + (cam.viewport?.h || 600) / 2 - 200;

      const imgObj = {
        id: `c_wb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'image',
        x: cx,
        y: cy,
        w: 700,
        h: 400,
        src: dataUrl,
        title: t('Industrial Circuit Simulation Snapshot (v6.4.0)'),
        t: Date.now() // preserve p.t timestamp
      };

      this.app.store?.add(imgObj);
      this.app.saveSoon?.();
      this.app.surface?.render?.();
      this.app.toast?.(t('Circuit simulation snapshot stamped to whiteboard!'));
      this.close();
    } catch (e) {
      this.app.toast?.(t('Unable to stamp snapshot: {error}', { error: e.message }));
    }
  }

  /**
   * Export Bill of Materials & Ladder Logic Markdown note
   */
  exportBOM() {
    const bomMd = this.sim.generateBOM();
    const ladderPreset = LADDER_PRESETS[0];

    const noteText = `### ${t('Industrial Control Circuit Specification')}\n\n` +
      `#### ${t('Bill of Materials (BOM)')}\n${bomMd}\n\n` +
      `#### ${t('Relay Ladder Logic (RLL) Diagram')}\n\`\`\`text\n${ladderPreset.diagram}\n\`\`\``;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(noteText).then(() => {
        this.app.toast?.(t('Bill of Materials & Ladder Logic copied to clipboard!'));
      }).catch(() => {});
    }

    // Also add as note to canvas
    const cam = this.app.surface?.cam || { viewport: { x: 200, y: 200 } };
    const noteObj = {
      id: `c_bom_${Date.now()}`,
      type: 'text',
      x: (cam.viewport?.x || 200) + 50,
      y: (cam.viewport?.y || 200) + 50,
      text: noteText,
      t: Date.now()
    };
    this.app.store?.add(noteObj);
    this.app.saveSoon?.();
    this.app.surface?.render?.();
  }
}
