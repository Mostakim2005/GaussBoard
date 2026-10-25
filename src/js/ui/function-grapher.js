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

/* Zoom is bounded: an unbounded wheel could drive the span to Infinity, and
 * the integer grid loop then had no way to finish (the page froze outright). */
const MIN_VIEW_SPAN = 1e-4;
const MAX_VIEW_SPAN = 1e6;

/** A 1/2/5×10ⁿ grid step no smaller than `raw`. */
function niceStep(raw) {
  const value = Math.abs(Number(raw));
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / power;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return mult * power;
}

/** Axis tick text without trailing float noise ("0.30000000000000004"). */
function formatTick(value, step) {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs >= 1e5 || (abs > 0 && abs < 1e-4)) return value.toExponential(0);
  const decimals = step >= 1 ? 0 : Math.min(6, Math.ceil(-Math.log10(step)));
  const text = value.toFixed(decimals);
  return text === '-0' ? '0' : text;
}

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

    // Multi-Mode Graphing State (2D, 3D Surface, Polar)
    this.graphMode = '2d'; // '2d' | '3d' | 'polar'
    this.expr3D = 'sin(x) * cos(y)';
    this.rotX = 55; // Elevation
    this.rotZ = 45; // Azimuth
    this.zoom3D = 1.0;
    this.isOrbiting = false;
    this.orbitStart = { x: 0, y: 0 };
    this.exprPolar = '2 * (1 + cos(t))';

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
        // Keep NaN/Infinity instead of flattening them to 0: the point of the
        // asymptote/domain guards downstream is to SEE those values. Turning
        // them into zero drew sqrt(x) as a line along y=0 for x<0 and hid
        // every pole behind a fake value.
        return typeof val === 'number' ? val : NaN;
      } catch {
        return NaN;
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

    // Mode Switcher Tabs
    const modeTabs = document.createElement('div');
    modeTabs.className = 'graph-mode-tabs';
    modeTabs.style.cssText = 'display:inline-flex;gap:4px;margin:0 8px;background:#1e293b;padding:3px;border-radius:6px;';
    modeTabs.innerHTML = `
      <button class="mode-tab-btn active" data-mode="2d" style="padding:3px 8px;border:none;border-radius:4px;background:#38bdf8;color:#0f172a;font-weight:bold;font-size:11px;cursor:pointer;">📈 ${t('2D')}</button>
      <button class="mode-tab-btn" data-mode="3d" style="padding:3px 8px;border:none;border-radius:4px;background:transparent;color:#94a3b8;font-weight:bold;font-size:11px;cursor:pointer;">🌐 ${t('3D Surface')}</button>
      <button class="mode-tab-btn" data-mode="polar" style="padding:3px 8px;border:none;border-radius:4px;background:transparent;color:#94a3b8;font-weight:bold;font-size:11px;cursor:pointer;">🌀 ${t('Polar')}</button>
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
      if (this.graphMode === '3d') {
        this.expr3D = e.target.value.trim() || 'x^2 - y^2';
      } else if (this.graphMode === 'polar') {
        this.exprPolar = e.target.value.trim() || '2 * (1 + cos(t))';
      } else {
        this.expression = e.target.value.trim();
        this.fn = this.compileExpression(this.expression);
      }
      this.render();
    });

    modeTabs.querySelectorAll('.mode-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modeTabs.querySelectorAll('.mode-tab-btn').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = '#94a3b8';
        });
        btn.style.background = '#38bdf8';
        btn.style.color = '#0f172a';
        this.graphMode = btn.dataset.mode;
        if (this.graphMode === '3d') {
          exprInput.value = this.expr3D;
          exprInput.placeholder = t('z = f(x, y), e.g. sin(x)*cos(y), x^2 - y^2');
        } else if (this.graphMode === 'polar') {
          exprInput.value = this.exprPolar;
          exprInput.placeholder = t('r = f(t), e.g. 2*(1 + cos(t)), sin(4*t)');
        } else {
          exprInput.value = this.expression;
          exprInput.placeholder = t('Enter function e.g. x^2 - 4, sin(x)...');
        }
        this.render();
      });
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
    header.appendChild(modeTabs);
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
      if (this.graphMode === '3d') {
        this.isOrbiting = true;
        this.orbitStart = { x: e.clientX, y: e.clientY };
      } else {
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.viewStart = { xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax };
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.graphMode === '3d' && this.isOrbiting) {
        const dx = e.clientX - this.orbitStart.x;
        const dy = e.clientY - this.orbitStart.y;
        this.rotZ += dx * 0.6;
        this.rotX = Math.max(15, Math.min(85, this.rotX + dy * 0.5));
        this.orbitStart = { x: e.clientX, y: e.clientY };
        this.render();
        return;
      }
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
      this.isOrbiting = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isPanning || this.isOrbiting || this.graphMode !== '2d') return;
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
      if (this.graphMode === '3d') {
        this.zoom3D = Math.max(0.4, Math.min(2.5, this.zoom3D * (e.deltaY < 0 ? 1.1 : 0.9)));
      } else {
        const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;
        const xMid = (this.xMin + this.xMax) / 2;
        const yMid = (this.yMin + this.yMax) / 2;
        const clampSpan = (span) => {
          if (!Number.isFinite(span) || span <= 0) return 12;
          return Math.max(MIN_VIEW_SPAN, Math.min(MAX_VIEW_SPAN, span));
        };
        const xSpan = clampSpan((this.xMax - this.xMin) * zoomFactor);
        const ySpan = clampSpan((this.yMax - this.yMin) * zoomFactor);

        this.xMin = xMid - xSpan / 2;
        this.xMax = xMid + xSpan / 2;
        this.yMin = yMid - ySpan / 2;
        this.yMax = yMid + ySpan / 2;
      }
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
    if (this.graphMode === '3d') {
      this.render3DSurface();
      return;
    }
    if (this.graphMode === 'polar') {
      this.renderPolar();
      return;
    }
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    // 1. Graph Background & Grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const toScreenX = (x) => ((x - this.xMin) / (this.xMax - this.xMin)) * w;
    const toScreenY = (y) => h - ((y - this.yMin) / (this.yMax - this.yMin)) * h;

    // Grid lines. The step follows the pixels available, so zooming out shows
    // fewer, wider-spaced lines instead of millions of integer rules.
    const xStep = niceStep((this.xMax - this.xMin) / Math.max(4, w / 60));
    const yStep = niceStep((this.yMax - this.yMin) / Math.max(4, h / 45));
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const xStart = Math.ceil(this.xMin / xStep);
    const xEnd = Math.floor(this.xMax / xStep);
    for (let i = xStart; i <= xEnd && i - xStart <= 400; i++) {
      const sx = toScreenX(i * xStep);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
    }
    const yStart = Math.ceil(this.yMin / yStep);
    const yEnd = Math.floor(this.yMax / yStep);
    for (let i = yStart; i <= yEnd && i - yStart <= 400; i++) {
      const sy = toScreenY(i * yStep);
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
    for (let i = xStart; i <= xEnd && i - xStart <= 400; i++) {
      const value = i * xStep;
      if (Math.abs(value) < xStep * 0.001) continue;
      ctx.fillText(formatTick(value, xStep), toScreenX(value) - 4, originY + 14);
    }
    for (let i = yStart; i <= yEnd && i - yStart <= 400; i++) {
      const value = i * yStep;
      if (Math.abs(value) < yStep * 0.001) continue;
      ctx.fillText(formatTick(value, yStep), originX + 6, toScreenY(value) + 3);
    }

    // 2. Definite Integral Shading
    let integralArea = 0;
    let integralUndefined = false;
    if (this.showIntegral) {
      const a = this.integralA;
      const b = this.integralB;
      const steps = 100;
      const dx = (b - a) / steps;
      const poleLimit = Math.abs(this.yMax - this.yMin) * 100 + 100;
      const jumpLimit = Math.abs(this.yMax - this.yMin) * 10 + 10;
      let prevSample = null;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.moveTo(toScreenX(a), toScreenY(0));

      for (let i = 0; i <= steps; i++) {
        const x = a + i * dx;
        const y = this.fn(x);
        // A pole inside [a,b] makes the Riemann sum meaningless: report O.L
        // rather than a plausible-looking number made of skipped samples.
        if (!Number.isFinite(y) || Math.abs(y) > poleLimit) integralUndefined = true;
        else if (prevSample != null && Math.sign(y) !== Math.sign(prevSample) && Math.abs(y - prevSample) > jumpLimit) integralUndefined = true;
        if (Number.isFinite(y) && Math.abs(y) <= poleLimit) {
          ctx.lineTo(toScreenX(x), toScreenY(y));
          if (i < steps) integralArea += y * dx;
          prevSample = y;
        } else {
          prevSample = null;
        }
      }
      ctx.lineTo(toScreenX(b), toScreenY(0));
      ctx.closePath();
      ctx.fill();
    }
    if (integralUndefined) integralArea = NaN;

    // 3. Plot Function Curve f(x)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();

    let started = false;
    let lastY = null;
    const ySpan = Math.abs(this.yMax - this.yMin) || 10;
    const maxJump = ySpan * 0.7;

    for (let px = 0; px <= w; px += 2) {
      const x = this.xMin + (px / w) * (this.xMax - this.xMin);
      const y = this.fn(x);

      if (Number.isFinite(y) && y >= this.yMin - 10 && y <= this.yMax + 10) {
        // Asymptote discontinuity guard: break path across opposing infinities
        if (started && lastY !== null && Math.abs(y - lastY) > maxJump && Math.sign(y) !== Math.sign(lastY)) {
          started = false;
        }

        const py = toScreenY(y);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
        lastY = y;
      } else {
        started = false;
        lastY = null;
      }
    }
    ctx.stroke();

    // 3b. Plot Comparison Curve g(x) if enabled
    if (this.showComparison && this.fn2) {
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let started2 = false;
      let lastY2 = null;
      for (let px = 0; px <= w; px += 2) {
        const x = this.xMin + (px / w) * (this.xMax - this.xMin);
        const y = this.fn2(x);
        if (Number.isFinite(y) && y >= this.yMin - 10 && y <= this.yMax + 10) {
          if (started2 && lastY2 !== null && Math.abs(y - lastY2) > maxJump && Math.sign(y) !== Math.sign(lastY2)) {
            started2 = false;
          }
          const py = toScreenY(y);
          if (!started2) {
            ctx.moveTo(px, py);
            started2 = true;
          } else {
            ctx.lineTo(px, py);
          }
          lastY2 = y;
        } else {
          started2 = false;
          lastY2 = null;
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

        // Root detection (y sign change). A sign flip across a pole is not a
        // root: require the values to move gently, not jump by a window.
        if (Number.isFinite(prevY) && Number.isFinite(curY) && prevY * curY < 0
            && Math.abs(curY - prevY) < (this.yMax - this.yMin)) {
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
      if (readArea) readArea.textContent = Number.isFinite(integralArea) ? integralArea.toFixed(2) : 'O.L';
    }
  }

  render3DSurface() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const radZ = (this.rotZ * Math.PI) / 180;
    const radX = (this.rotX * Math.PI) / 180;
    const scale = 38 * this.zoom3D;

    const project = (x, y, z) => {
      const x1 = x * Math.cos(radZ) - y * Math.sin(radZ);
      const y1 = x * Math.sin(radZ) + y * Math.cos(radZ);
      const z1 = z;
      const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
      const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);
      return {
        sx: cx + x1 * scale,
        sy: cy - z2 * scale + y2 * 0.18,
        depth: y2,
        z: z
      };
    };

    const N = 24;
    const minCoord = -3.5, maxCoord = 3.5;
    const step = (maxCoord - minCoord) / N;

    // Evaluate points matrix
    const grid = [];
    for (let i = 0; i <= N; i++) {
      grid[i] = [];
      const x = minCoord + i * step;
      for (let j = 0; j <= N; j++) {
        const y = minCoord + j * step;
        let z = 0;
        try {
          const val = parseMathExpressionSafely(this.expr3D, { x, y });
          z = Number.isFinite(val) ? Math.max(-4, Math.min(4, val)) : 0;
        } catch {
          z = 0;
        }
        grid[i][j] = project(x, y, z);
      }
    }

    // Generate Quads
    const quads = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const p1 = grid[i][j];
        const p2 = grid[i + 1][j];
        const p3 = grid[i + 1][j + 1];
        const p4 = grid[i][j + 1];
        const avgDepth = (p1.depth + p2.depth + p3.depth + p4.depth) / 4;
        const avgZ = (p1.z + p2.z + p3.z + p4.z) / 4;
        quads.push({ p1, p2, p3, p4, depth: avgDepth, z: avgZ });
      }
    }

    // Sort quads by depth descending (painter's algorithm)
    quads.sort((a, b) => b.depth - a.depth);

    // Draw quads
    for (const q of quads) {
      const normZ = Math.max(0, Math.min(1, (q.z + 3) / 6));
      const hue = (1 - normZ) * 240; // blue to red
      ctx.fillStyle = `hsl(${hue}, 80%, 48%)`;
      ctx.strokeStyle = `hsl(${hue}, 85%, 26%)`;
      ctx.lineWidth = 0.8;

      ctx.beginPath();
      ctx.moveTo(q.p1.sx, q.p1.sy);
      ctx.lineTo(q.p2.sx, q.p2.sy);
      ctx.lineTo(q.p3.sx, q.p3.sy);
      ctx.lineTo(q.p4.sx, q.p4.sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // HUD Label
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`z = f(x, y) = ${this.expr3D}`, 16, 24);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Elevation: ${Math.round(this.rotX)}° | Azimuth: ${Math.round(this.rotZ)}° (Drag to rotate, Wheel to zoom)`, 16, 42);
  }

  renderPolar() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Polar Grid (Concentric Circles)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const maxR = 6;
    const scale = (Math.min(w, h) * 0.42) / maxR;

    for (let r = 1; r <= maxR; r++) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Radial Rays
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rad) * maxR * scale, cy + Math.sin(rad) * maxR * scale);
      ctx.stroke();
    }

    // Plot Polar Curve r = f(theta)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    const steps = 360;
    let started = false;
    for (let i = 0; i <= steps * 2; i++) {
      const theta = (i * Math.PI) / 180;
      let r = NaN;
      try {
        const val = parseMathExpressionSafely(this.exprPolar, { t: theta, theta });
        r = typeof val === 'number' ? val : NaN;
      } catch {
        r = NaN;
      }
      // Undefined radius (a pole, a negative sqrt, ...) is a GAP in the curve,
      // not a point at the origin: plotting it as 0 drew spokes to the centre.
      if (!Number.isFinite(r)) {
        started = false;
        continue;
      }
      const sx = cx + r * Math.cos(theta) * scale;
      const sy = cy - r * Math.sin(theta) * scale;

      if (!started) {
        ctx.moveTo(sx, sy);
        started = true;
      } else {
        ctx.lineTo(sx, sy);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // HUD Label
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`r(θ) = ${this.exprPolar}`, 16, 24);
  }

  stampToCanvas() {
    if (!this.canvas || !this.app) return;
    try {
      const dataUrl = this.canvas.toDataURL('image/png');
      const w = 520;
      const h = 360;
      const cam = this.app.surface?.cam;
      const sw = this.app.surface?.canvas?.width || 1200;
      const sh = this.app.surface?.canvas?.height || 800;
      const vp = (cam && typeof cam.viewport === 'function') ? cam.viewport(sw, sh) : (cam?.viewport || { x: 100, y: 100, w: 1000, h: 700 });
      const cx = (vp.x || 0) + (vp.w || 1000) / 2 - w / 2;
      const cy = (vp.y || 0) + (vp.h || 700) / 2 - h / 2;

      const obj = {
        id: `graph_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'image',
        x: cx,
        y: cy,
        w: w,
        h: h,
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

  destroy() {
    this.close();
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
      this.modal = null;
    }
  }
}
