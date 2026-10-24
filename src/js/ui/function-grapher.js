/**
 * @file function-grapher.js
 * @description Dynamic 2D Mathematical Function Grapher & Calculus Visualizer (GazBoard Phase 5 / v6.5.0)
 *
 * Implements Document 6 Section 6.3.1:
 * - 2D Cartesian coordinate graphing system with pan and zoom
 * - Evaluates single-variable functions f(x), polynomials, trigonometric, and rational expressions
 * - Derivative f'(x) and tangent line visualizer with adjustable tangent point x₀ and slope m
 * - Definite integral visualizer with shaded area under curve ∫[a, b] f(x) dx
 * - Real-time roots and critical points markers
 * - 1-Click "Stamp Function Card to Canvas" preserving p.t timestamps
 * - 100% offline, pure JavaScript & Canvas 2D
 */

import { t } from '../i18n.js';
import { parseMathExpressionSafely } from '../core/scientific-math.js';

export const GRAPH_PRESETS = [
  { id: 'quadratic', name: 'Quadratic: f(x) = x² - 4', expr: 'x^2 - 4', domain: [-6, 6], a: -2, b: 2 },
  { id: 'sine', name: 'Sine Wave: f(x) = 2·sin(x)', expr: '2 * sin(x)', domain: [-8, 8], a: 0, b: 3.14159 },
  { id: 'cubic', name: 'Cubic: f(x) = x³ - 3x', expr: 'x^3 - 3*x', domain: [-4, 4], a: -1.73, b: 1.73 },
  { id: 'damped', name: 'Damped Oscillation: f(x) = e^(-0.2x)·cos(2x)', expr: 'exp(-0.2*x) * cos(2*x)', domain: [-2, 12], a: 0, b: 6 },
  { id: 'gaussian', name: 'Gaussian Bell: f(x) = 3·e^(-x²)', expr: '3 * exp(-x^2)', domain: [-4, 4], a: -1.5, b: 1.5 },
  { id: 'rational', name: 'Rational: f(x) = 4 / (x² + 1)', expr: '4 / (x^2 + 1)', domain: [-6, 6], a: -2, b: 2 }
];

export class FunctionGrapherModal {
  constructor(app) {
    this.app = app;
    this.modal = null;
    this.canvas = null;
    this.ctx = null;
    this.animFrameId = null;

    // Graph state
    this.expression = 'x^2 - 4';
    this.fn = this.compileExpression(this.expression);
    this.compareExpression = '';
    this.fn2 = null;
    this.showComparison = false;

    // View boundaries
    this.xMin = -6;
    this.xMax = 6;
    this.yMin = -6;
    this.yMax = 6;

    // Calculus parameters
    this.showDerivative = true;
    this.showIntegral = true;
    this.showTrace = true;
    this.showKeyPoints = true;
    this.tracePos = null;
    this.tangentX = 1.0;
    this.integralA = -2.0;
    this.integralB = 2.0;

    // Pan state
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.viewStart = { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };
  }

  show(presetId = null) {
    if (!this.modal) this.buildModal();
    if (presetId) {
      const p = GRAPH_PRESETS.find((item) => item.id === presetId);
      if (p) this.loadPreset(p);
    }
    this.modal.classList.add('visible');
    this.resizeCanvas();
    this.render();
  }

  close() {
    if (this.modal) this.modal.classList.remove('visible');
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  loadPreset(preset) {
    this.expression = preset.expr;
    this.xMin = preset.domain[0];
    this.xMax = preset.domain[1];
    this.integralA = preset.a;
    this.integralB = preset.b;
    this.fn = this.compileExpression(this.expression);

    const input = this.modal?.querySelector('.graph-expr-input');
    if (input) input.value = this.expression;
    this.render();
  }

  compileExpression(exprStr) {
    return (x) => {
      try {
        const val = parseMathExpressionSafely(exprStr, { x });
        return Number.isFinite(val) ? val : 0;
      } catch {
        return 0;
      }
    };
  }

  buildModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'function-grapher-backdrop';

    const container = document.createElement('div');
    container.className = 'function-grapher-modal glass-card';

    // Header
    const header = document.createElement('div');
    header.className = 'graph-header';

    const titleArea = document.createElement('div');
    titleArea.className = 'graph-title-area';
    titleArea.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 3v18h18M7 16l4-8 4 6 5-10"/>
      </svg>
      <h3>${t('Dynamic 2D Function Grapher & Calculus Visualizer')}</h3>
      <span class="graph-badge">v6.5.0 CAS</span>
    `;

    // Presets dropdown
    const presetSelect = document.createElement('select');
    presetSelect.className = 'graph-select';
    GRAPH_PRESETS.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      presetSelect.appendChild(opt);
    });
    presetSelect.addEventListener('change', (e) => {
      const p = GRAPH_PRESETS.find((item) => item.id === e.target.value);
      if (p) this.loadPreset(p);
    });

    // Expression input bar
    const exprInput = document.createElement('input');
    exprInput.className = 'graph-expr-input';
    exprInput.type = 'text';
    exprInput.value = this.expression;
    exprInput.placeholder = t('Enter function e.g. x^2 - 4, sin(x)...');
    exprInput.addEventListener('input', (e) => {
      this.expression = e.target.value.trim();
      this.fn = this.compileExpression(this.expression);
      this.render();
    });

    // Stamp button
    const btnStamp = document.createElement('button');
    btnStamp.className = 'graph-btn btn-primary';
    btnStamp.innerHTML = `<span>📸</span> ${t('Stamp to Board')}`;
    btnStamp.addEventListener('click', () => this.stampToCanvas());

    const btnClose = document.createElement('button');
    btnClose.className = 'graph-close-btn';
    btnClose.innerHTML = '&times;';
    btnClose.addEventListener('click', () => this.close());

    header.appendChild(titleArea);
    header.appendChild(presetSelect);
    header.appendChild(exprInput);
    header.appendChild(btnStamp);
    header.appendChild(btnClose);

    // Body: Canvas + Calculus sidebar
    const body = document.createElement('div');
    body.className = 'graph-body';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'graph-canvas';
    this.ctx = this.canvas.getContext('2d');

    // Pan & Zoom handlers
    this.canvas.addEventListener('mousedown', (e) => {
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.viewStart = { xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      const rect = this.canvas.getBoundingClientRect();
      const dxPx = e.clientX - this.panStart.x;
      const dyPx = e.clientY - this.panStart.y;
      const dxUnits = (dxPx / rect.width) * (this.viewStart.xMax - this.viewStart.xMin);
      const dyUnits = (dyPx / rect.height) * (this.viewStart.yMax - this.viewStart.yMin);

      this.xMin = this.viewStart.xMin - dxUnits;
      this.xMax = this.viewStart.xMax - dxUnits;
      this.yMin = this.viewStart.yMin + dyUnits;
      this.yMax = this.viewStart.yMax + dyUnits;
      this.render();
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isPanning) return;
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const w = rect.width;
      const x = this.xMin + (px / w) * (this.xMax - this.xMin);
      const y = this.fn(x);
      this.tracePos = { px, py, x, y };
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.tracePos = null;
      this.render();
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;
      const xMid = (this.xMin + this.xMax) / 2;
      const yMid = (this.yMin + this.yMax) / 2;
      const xSpan = (this.xMax - this.xMin) * zoomFactor;
      const ySpan = (this.yMax - this.yMin) * zoomFactor;

      this.xMin = xMid - xSpan / 2;
      this.xMax = xMid + xSpan / 2;
      this.yMin = yMid - ySpan / 2;
      this.yMax = yMid + ySpan / 2;
      this.render();
    }, { passive: false });

    // Sidebar: Calculus parameters & readouts
    const sidebar = document.createElement('aside');
    sidebar.className = 'graph-sidebar';
    sidebar.innerHTML = `
      <div class="calculus-section">
        <h5>📐 ${t('Differential Calculus')}</h5>
        <label class="graph-toggle-row">
          <input type="checkbox" id="chk-tangent" checked>
          <span>${t('Tangent Line & Derivative')}</span>
        </label>
        <div class="slider-group">
          <span>x₀: <b id="val-tangent-x">1.0</b></span>
          <input type="range" id="rng-tangent-x" min="-5" max="5" step="0.1" value="1.0">
        </div>
        <div class="calc-readout">
          <div>f(x₀) = <b id="read-fx">0.00</b></div>
          <div>f'(x₀) = <b id="read-dfx" style="color:#f59e0b;">0.00</b></div>
        </div>
      </div>

      <div class="calculus-section">
        <h5>∫ ${t('Integral Calculus')}</h5>
        <label class="graph-toggle-row">
          <input type="checkbox" id="chk-integral" checked>
          <span>${t('Shade Definite Integral')}</span>
        </label>
        <div class="slider-group">
          <span>[a, b]: [<b id="val-int-a">-2.0</b>, <b id="val-int-b">2.0</b>]</span>
          <div style="display:flex;gap:4px;">
            <input type="range" id="rng-int-a" min="-5" max="5" step="0.2" value="-2.0" style="flex:1;">
            <input type="range" id="rng-int-b" min="-5" max="5" step="0.2" value="2.0" style="flex:1;">
          </div>
        </div>
        <div class="calc-readout">
          <div>Area = <b id="read-area" style="color:#38bdf8;">0.00</b></div>
        </div>
      </div>

      <div class="calculus-section">
        <h5>📈 ${t('Curve Analysis & Comparison')}</h5>
        <label class="graph-toggle-row">
          <input type="checkbox" id="chk-compare">
          <span>${t('Overlay g(x)')}</span>
        </label>
        <input type="text" id="input-compare-expr" class="graph-expr-input" style="width:100%;margin-top:4px;" placeholder="e.g. cos(x), 2*x - 1" value="cos(x)">
        <label class="graph-toggle-row" style="margin-top:8px;">
          <input type="checkbox" id="chk-trace" checked>
          <span>${t('Live Curve Trace Cursor')}</span>
        </label>
        <label class="graph-toggle-row">
          <input type="checkbox" id="chk-keypoints" checked>
          <span>${t('Show Roots & Extrema')}</span>
        </label>
        <div style="display:flex;gap:8px;font-size:11px;margin-top:6px;">
          <span style="color:#10b981;">● ${t('Root (y=0)')}</span>
          <span style="color:#a855f7;">● ${t('Extrema (dy/dx=0)')}</span>
        </div>
      </div>
    `;

    // Bind sidebar controls
    const chkCompare = sidebar.querySelector('#chk-compare');
    const inputCompare = sidebar.querySelector('#input-compare-expr');
    chkCompare.addEventListener('change', (e) => {
      this.showComparison = e.target.checked;
      if (this.showComparison && !this.fn2) {
        this.compareExpression = inputCompare.value.trim();
        this.fn2 = this.compileExpression(this.compareExpression);
      }
      this.render();
    });
    inputCompare.addEventListener('input', (e) => {
      this.compareExpression = e.target.value.trim();
      this.fn2 = this.compileExpression(this.compareExpression);
      if (this.showComparison) this.render();
    });

    const chkTrace = sidebar.querySelector('#chk-trace');
    chkTrace.addEventListener('change', (e) => {
      this.showTrace = e.target.checked;
      if (!this.showTrace) this.tracePos = null;
      this.render();
    });

    const chkKeyPoints = sidebar.querySelector('#chk-keypoints');
    chkKeyPoints.addEventListener('change', (e) => {
      this.showKeyPoints = e.target.checked;
      this.render();
    });
    const chkTangent = sidebar.querySelector('#chk-tangent');
    chkTangent.addEventListener('change', (e) => {
      this.showDerivative = e.target.checked;
      this.render();
    });

    const rngTangentX = sidebar.querySelector('#rng-tangent-x');
    const valTangentX = sidebar.querySelector('#val-tangent-x');
    rngTangentX.addEventListener('input', (e) => {
      this.tangentX = parseFloat(e.target.value);
      valTangentX.textContent = this.tangentX.toFixed(1);
      this.render();
    });

    const chkIntegral = sidebar.querySelector('#chk-integral');
    chkIntegral.addEventListener('change', (e) => {
      this.showIntegral = e.target.checked;
      this.render();
    });

    const rngIntA = sidebar.querySelector('#rng-int-a');
    const rngIntB = sidebar.querySelector('#rng-int-b');
    const valIntA = sidebar.querySelector('#val-int-a');
    const valIntB = sidebar.querySelector('#val-int-b');

    rngIntA.addEventListener('input', (e) => {
      this.integralA = Math.min(parseFloat(e.target.value), this.integralB - 0.2);
      valIntA.textContent = this.integralA.toFixed(1);
      this.render();
    });

    rngIntB.addEventListener('input', (e) => {
      this.integralB = Math.max(parseFloat(e.target.value), this.integralA + 0.2);
      valIntB.textContent = this.integralB.toFixed(1);
      this.render();
    });

    body.appendChild(this.canvas);
    body.appendChild(sidebar);

    container.appendChild(header);
    container.appendChild(body);
    backdrop.appendChild(container);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    document.body.appendChild(backdrop);
    this.modal = backdrop;
    this.sidebar = sidebar;
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
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    // 1. Graph Background & Grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const toScreenX = (x) => ((x - this.xMin) / (this.xMax - this.xMin)) * w;
    const toScreenY = (y) => h - ((y - this.yMin) / (this.yMax - this.yMin)) * h;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.ceil(this.xMin); x <= Math.floor(this.xMax); x++) {
      const sx = toScreenX(x);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
    }
    for (let y = Math.ceil(this.yMin); y <= Math.floor(this.yMax); y++) {
      const sy = toScreenY(y);
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
    }
    ctx.stroke();

    // Coordinate Axes (X and Y)
    const originX = toScreenX(0);
    const originY = toScreenY(0);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // X Axis
    ctx.moveTo(0, originY);
    ctx.lineTo(w, originY);
    // Y Axis
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, h);
    ctx.stroke();

    // Axis Numbers
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    for (let x = Math.ceil(this.xMin); x <= Math.floor(this.xMax); x++) {
      if (x === 0) continue;
      ctx.fillText(String(x), toScreenX(x) - 4, originY + 14);
    }
    for (let y = Math.ceil(this.yMin); y <= Math.floor(this.yMax); y++) {
      if (y === 0) continue;
      ctx.fillText(String(y), originX + 6, toScreenY(y) + 3);
    }

    // 2. Definite Integral Shading
    let integralArea = 0;
    if (this.showIntegral) {
      const a = this.integralA;
      const b = this.integralB;
      const steps = 100;
      const dx = (b - a) / steps;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.moveTo(toScreenX(a), toScreenY(0));

      for (let i = 0; i <= steps; i++) {
        const x = a + i * dx;
        const y = this.fn(x);
        if (Number.isFinite(y)) {
          ctx.lineTo(toScreenX(x), toScreenY(y));
          if (i < steps) integralArea += y * dx;
        }
      }
      ctx.lineTo(toScreenX(b), toScreenY(0));
      ctx.closePath();
      ctx.fill();
    }

    // 3. Plot Function Curve f(x)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();

    let started = false;
    for (let px = 0; px <= w; px += 2) {
      const x = this.xMin + (px / w) * (this.xMax - this.xMin);
      const y = this.fn(x);

      if (Number.isFinite(y) && y >= this.yMin - 10 && y <= this.yMax + 10) {
        const py = toScreenY(y);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      } else {
        started = false;
      }
    }
    ctx.stroke();

    // 3b. Plot Comparison Curve g(x) if enabled
    if (this.showComparison && this.fn2) {
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let started2 = false;
      for (let px = 0; px <= w; px += 2) {
        const x = this.xMin + (px / w) * (this.xMax - this.xMin);
        const y = this.fn2(x);
        if (Number.isFinite(y) && y >= this.yMin - 10 && y <= this.yMax + 10) {
          const py = toScreenY(y);
          if (!started2) {
            ctx.moveTo(px, py);
            started2 = true;
          } else {
            ctx.lineTo(px, py);
          }
        } else {
          started2 = false;
        }
      }
      ctx.stroke();
    }

    // 3c. Roots and Extrema Detection & Markers
    if (this.showKeyPoints) {
      const samples = 120;
      const step = (this.xMax - this.xMin) / samples;
      let prevY = this.fn(this.xMin);
      let prevDy = (this.fn(this.xMin + 0.001) - prevY) / 0.001;

      for (let i = 1; i <= samples; i++) {
        const curX = this.xMin + i * step;
        const curY = this.fn(curX);
        const curDy = (this.fn(curX + 0.001) - curY) / 0.001;

        // Root detection (y sign change)
        if (Number.isFinite(prevY) && Number.isFinite(curY) && prevY * curY < 0) {
          const rootX = curX - curY * (step / (curY - prevY));
          const sx = toScreenX(rootX);
          const sy = toScreenY(0);
          if (sx >= 0 && sx <= w) {
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(sx, sy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // Extrema detection (derivative dy sign change)
        if (Number.isFinite(prevDy) && Number.isFinite(curDy) && prevDy * curDy < 0) {
          const extX = curX - curDy * (step / (curDy - prevDy));
          const extY = this.fn(extX);
          const sx = toScreenX(extX);
          const sy = toScreenY(extY);
          if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) {
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.arc(sx, sy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        prevY = curY;
        prevDy = curDy;
      }
    }

    // 4. Tangent Line & Derivative at x₀
    const x0 = this.tangentX;
    const y0 = this.fn(x0);
    const hDiff = 0.0001;
    const dy = this.fn(x0 + hDiff) - this.fn(x0 - hDiff);
    const slope = dy / (2 * hDiff);

    if (this.showDerivative && Number.isFinite(y0) && Number.isFinite(slope)) {
      const tX1 = x0 - 2.5;
      const tY1 = y0 - slope * 2.5;
      const tX2 = x0 + 2.5;
      const tY2 = y0 + slope * 2.5;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(toScreenX(tX1), toScreenY(tY1));
      ctx.lineTo(toScreenX(tX2), toScreenY(tY2));
      ctx.stroke();
      ctx.setLineDash([]);

      // Tangent contact dot
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(toScreenX(x0), toScreenY(y0), 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Live Curve Trace Crosshair & Coordinate Tooltip
    if (this.showTrace && this.tracePos && Number.isFinite(this.tracePos.y)) {
      const sx = toScreenX(this.tracePos.x);
      const sy = toScreenY(this.tracePos.y);

      // Dotted crosshair guides
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Glowing snap dot on curve
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tooltip Pill
      const label = `(${this.tracePos.x.toFixed(2)}, ${this.tracePos.y.toFixed(2)})`;
      ctx.font = 'bold 11px sans-serif';
      const textWidth = ctx.measureText(label).width;
      const boxW = textWidth + 14;
      const boxH = 22;
      const boxX = Math.min(w - boxW - 8, Math.max(8, sx + 10));
      const boxY = Math.min(h - boxH - 8, Math.max(8, sy - 28));

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(boxX, boxY, boxW, boxH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(label, boxX + 7, boxY + 15);
    }

    // Update Sidebar Readouts
    if (this.sidebar) {
      const readFx = this.sidebar.querySelector('#read-fx');
      const readDfx = this.sidebar.querySelector('#read-dfx');
      const readArea = this.sidebar.querySelector('#read-area');
      if (readFx) readFx.textContent = Number.isFinite(y0) ? y0.toFixed(2) : 'NaN';
      if (readDfx) readDfx.textContent = Number.isFinite(slope) ? slope.toFixed(2) : 'NaN';
      if (readArea) readArea.textContent = integralArea.toFixed(2);
    }
  }

  stampToCanvas() {
    if (!this.canvas || !this.app) return;
    try {
      const dataUrl = this.canvas.toDataURL('image/png');
      const cam = this.app.surface?.cam || { viewport: { x: 200, y: 200, w: 800, h: 600 } };
      const cx = (cam.viewport?.x || 200) + (cam.viewport?.w || 800) / 2 - 250;
      const cy = (cam.viewport?.y || 200) + (cam.viewport?.h || 600) / 2 - 180;

      const obj = {
        id: `graph_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'image',
        x: cx,
        y: cy,
        w: 520,
        h: 360,
        src: dataUrl,
        title: `Function Plot: f(x) = ${this.expression}`,
        t: Date.now()
      };

      this.app.store?.add(obj);
      this.app.saveSoon?.();
      this.app.surface?.render?.();
      this.app.toast?.(t('Function graph stamped to whiteboard!'));
      this.close();
    } catch (e) {
      this.app.toast?.(t('Unable to stamp graph: {error}', { error: e.message }));
    }
  }
}
