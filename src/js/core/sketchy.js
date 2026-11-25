// sketchy.js — Rough.js-backed sketchy shape rendering with deterministic pure-JS fallback.
import { loadScriptLibrary } from './lib-loader.js';

let roughLoadPromise = null;

/**
 * Trigger loading full Rough.js from SharedLibraries / browser cache when enabled.
 * Safe non-blocking: returns null immediately if offline/not yet downloaded.
 */
export function ensureRoughLoaded(app = null, promptIfMissing = false) {
  if (typeof window !== 'undefined' && window.rough) return Promise.resolve(window.rough);
  if (typeof document === 'undefined') return Promise.resolve(null);
  if (!roughLoadPromise) {
    roughLoadPromise = loadScriptLibrary({
      id: 'roughjs',
      globalName: 'rough',
      vendorPath: './vendor/rough.js',
      sharedPath: './shared-lib/roughjs/rough.js',
      downloadUrl: 'https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js',
      app: app || (typeof window !== 'undefined' ? window.app : null),
      promptIfMissing
    }).catch(() => {
      roughLoadPromise = null;
      return null;
    });
  }
  return roughLoadPromise;
}

/** Deterministic PRNG (Mulberry32) so Smart Slicing frames never jitter. */
function makeRng(seed) {
  let a = (seed >>> 0) || 1337;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shapeToSvgPathD(o) {
  const { x, y, w, h } = o;
  const cx = x + w / 2, cy = y + h / 2;
  const f = (n) => Number(n).toFixed(2);
  switch (o.kind) {
    case 'triangle':
      return `M${f(cx)} ${f(y)} L${f(x + w)} ${f(y + h)} L${f(x)} ${f(y + h)} Z`;
    case 'rightTriangle':
      return `M${f(x)} ${f(y)} L${f(x + w)} ${f(y + h)} L${f(x)} ${f(y + h)} Z`;
    case 'diamond':
      return `M${f(cx)} ${f(y)} L${f(x + w)} ${f(cy)} L${f(cx)} ${f(y + h)} L${f(x)} ${f(cy)} Z`;
    case 'line': case 'arrow': case 'doubleArrow':
      return `M${f(x)} ${f(y)} L${f(x + w)} ${f(y + h)}`;
    case 'pentagon': case 'hexagon': case 'octagon': {
      const n = o.kind === 'pentagon' ? 5 : o.kind === 'hexagon' ? 6 : 8;
      const start = o.kind === 'pentagon' ? -Math.PI / 2 : o.kind === 'hexagon' ? 0 : Math.PI / 8;
      const segs = [];
      for (let i = 0; i < n; i++) {
        const a = start + (i * Math.PI * 2) / n;
        segs.push(`${i ? 'L' : 'M'}${f(cx + Math.cos(a) * (w / 2))} ${f(cy + Math.sin(a) * (h / 2))}`);
      }
      return segs.join(' ') + ' Z';
    }
    case 'star': {
      const segs = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 0.42 : 1;
        segs.push(`${i ? 'L' : 'M'}${f(cx + Math.cos(a) * (w / 2) * r)} ${f(cy + Math.sin(a) * (h / 2) * r)}`);
      }
      return segs.join(' ') + ' Z';
    }
    default:
      return null;
  }
}

function buildRoughOptions(o, strokeColor) {
  return {
    seed: Number.isFinite(o.roughSeed) ? (o.roughSeed >>> 0) : 1337,
    roughness: Number.isFinite(o.roughness) ? o.roughness : 1.4,
    bowing: 1.1,
    stroke: (o.stroke && o.stroke !== 'none') ? strokeColor : 'none',
    strokeWidth: o.lineWidth || 3,
    fill: (o.fill && o.fill !== 'none') ? o.fill : undefined,
    fillStyle: 'hachure',
    fillWeight: Math.max(0.8, (o.lineWidth || 3) * 0.45),
    hachureGap: Math.max(6, (o.lineWidth || 3) * 2.6)
  };
}

/**
 * Draw sketchy shape onto Canvas 2D using loaded `window.rough` when available,
 * or deterministic double-pass hand-drawn jitter fallback otherwise.
 */
export function drawSketchyShapeCanvas(ctx, o, strokeColor, drawArrowheadFn) {
  const { x, y, w, h } = o;
  const roughness = Number.isFinite(o.roughness) ? o.roughness : 1.4;
  const seed = Number.isFinite(o.roughSeed) ? (o.roughSeed >>> 0) : 1337;
  const roughLib = typeof window !== 'undefined' ? window.rough : null;

  if (roughLib && typeof roughLib.generator === 'function') {
    try {
      const gen = roughLib.generator();
      const opts = buildRoughOptions(o, strokeColor);
      let drawable = null;
      if (o.kind === 'rect' || o.kind === 'roundRect') {
        drawable = gen.rectangle(x, y, w, h, opts);
      } else if (o.kind === 'ellipse' || o.kind === 'circle') {
        drawable = gen.ellipse(x + w / 2, y + h / 2, Math.abs(w), Math.abs(h), opts);
      } else if (o.kind === 'line' || o.kind === 'arrow' || o.kind === 'doubleArrow') {
        drawable = gen.line(x, y, x + w, y + h, opts);
      } else {
        const d = shapeToSvgPathD(o);
        if (d) drawable = gen.path(d, opts);
      }
      if (drawable) {
        const ops = gen.toPaths(drawable);
        for (const info of ops) {
          ctx.save();
          const path = new Path2D(info.d);
          if (info.fill && info.fill !== 'none') {
            ctx.fillStyle = info.fill;
            ctx.fill(path);
          }
          if (info.stroke && info.stroke !== 'none') {
            ctx.strokeStyle = info.stroke;
            ctx.lineWidth = info.strokeWidth || (o.lineWidth || 3);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke(path);
          }
          ctx.restore();
        }
        if ((o.kind === 'arrow' || o.kind === 'doubleArrow') && o.stroke && o.stroke !== 'none' && drawArrowheadFn) {
          const size = (o.lineWidth || 3) * 3.6 * (o.arrowScale || 1.0);
          ctx.fillStyle = strokeColor;
          ctx.strokeStyle = strokeColor;
          drawArrowheadFn(ctx, { x, y }, { x: x + w, y: y + h }, size, o.headStyle || 'filled');
          if (o.kind === 'doubleArrow') drawArrowheadFn(ctx, { x: x + w, y: y + h }, { x, y }, size, o.headStyle || 'filled');
        }
        return true;
      }
    } catch {
      // fall back cleanly to deterministic pure-JS sketch
    }
  }

  // Deterministic double-stroke sketchy fallback
  const rng = makeRng(seed);
  const segs = pureSketchySegments(o, rng, roughness);
  if (!segs.length) return false;

  if (o.fill && o.fill !== 'none' && o.kind !== 'line' && o.kind !== 'arrow' && o.kind !== 'doubleArrow') {
    ctx.save();
    ctx.fillStyle = o.fill;
    ctx.beginPath();
    segs[0].forEach((p, idx) => (idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    if (!['line', 'arrow', 'doubleArrow'].includes(o.kind)) ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  if (o.stroke && o.stroke !== 'none') {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = o.lineWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const poly of segs) {
      ctx.beginPath();
      poly.forEach((p, idx) => (idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    if (o.kind === 'arrow' || o.kind === 'doubleArrow') {
      const size = (o.lineWidth || 3) * 3.6 * (o.arrowScale || 1.0);
      ctx.fillStyle = strokeColor;
      if (drawArrowheadFn) {
        drawArrowheadFn(ctx, { x, y }, { x: x + w, y: y + h }, size, o.headStyle || 'filled');
        if (o.kind === 'doubleArrow') drawArrowheadFn(ctx, { x: x + w, y: y + h }, { x, y }, size, o.headStyle || 'filled');
      }
    }
    ctx.restore();
  }
  return true;
}

function jitterLine(a, b, rng, amp) {
  const midX = (a.x + b.x) / 2 + (rng() - 0.5) * amp;
  const midY = (a.y + b.y) / 2 + (rng() - 0.5) * amp;
  return [
    { x: a.x + (rng() - 0.5) * amp * 0.6, y: a.y + (rng() - 0.5) * amp * 0.6 },
    { x: midX, y: midY },
    { x: b.x + (rng() - 0.5) * amp * 0.6, y: b.y + (rng() - 0.5) * amp * 0.6 }
  ];
}

function pureSketchySegments(o, rng, roughness = 1.4) {
  const { x, y, w, h } = o;
  const amp = Math.max(1.2, Math.min(5, Math.min(Math.abs(w), Math.abs(h)) * 0.025 * roughness));
  const cornersFor = () => {
    const cx = x + w / 2, cy = y + h / 2;
    switch (o.kind) {
      case 'triangle': return [{ x: cx, y }, { x: x + w, y: y + h }, { x, y: y + h }];
      case 'rightTriangle': return [{ x, y }, { x: x + w, y: y + h }, { x, y: y + h }];
      case 'diamond': return [{ x: cx, y }, { x: x + w, y: cy }, { x: cx, y: y + h }, { x, y: cy }];
      case 'line': case 'arrow': case 'doubleArrow': return [{ x, y }, { x: x + w, y: y + h }];
      case 'ellipse': case 'circle': {
        const pts = [];
        for (let i = 0; i <= 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          pts.push({ x: cx + Math.cos(a) * (w / 2) + (rng() - 0.5) * amp, y: cy + Math.sin(a) * (h / 2) + (rng() - 0.5) * amp });
        }
        return pts;
      }
      case 'pentagon': case 'hexagon': case 'octagon': {
        const n = o.kind === 'pentagon' ? 5 : o.kind === 'hexagon' ? 6 : 8;
        const start = o.kind === 'pentagon' ? -Math.PI / 2 : o.kind === 'hexagon' ? 0 : Math.PI / 8;
        const pts = [];
        for (let i = 0; i < n; i++) {
          const a = start + (i * Math.PI * 2) / n;
          pts.push({ x: cx + Math.cos(a) * (w / 2), y: cy + Math.sin(a) * (h / 2) });
        }
        return pts;
      }
      case 'star': {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const r = i % 2 ? 0.42 : 1;
          pts.push({ x: cx + Math.cos(a) * (w / 2) * r, y: cy + Math.sin(a) * (h / 2) * r });
        }
        return pts;
      }
      default:
        return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
    }
  };

  const isLinear = ['line', 'arrow', 'doubleArrow'].includes(o.kind);
  const isEll = o.kind === 'ellipse' || o.kind === 'circle';
  if (isEll) {
    return [cornersFor(), cornersFor()];
  }
  const base = cornersFor();
  const makePass = () => {
    const out = [];
    const n = isLinear ? base.length - 1 : base.length;
    for (let i = 0; i < n; i++) {
      const p0 = base[i], p1 = base[(i + 1) % base.length];
      const seg = jitterLine(p0, p1, rng, amp);
      if (i === 0) out.push(seg[0]);
      out.push(seg[1], seg[2]);
    }
    return out;
  };
  return [makePass(), makePass()];
}

/** Generate SVG markup for a sketchy shape (deterministic fallback matches Canvas paths). */
export function shapeRoughSvg(o, rot = '', svgArrowHeadFn = null) {
  const { x, y, w, h } = o;
  const stroke = o.stroke && o.stroke !== 'none' ? o.stroke : 'none';
  const fill = o.fill && o.fill !== 'none' ? o.fill : 'none';
  const sw = o.lineWidth || 3;
  const rng = makeRng(Number.isFinite(o.roughSeed) ? (o.roughSeed >>> 0) : 1337);
  const segs = pureSketchySegments(o, rng, Number.isFinite(o.roughness) ? o.roughness : 1.4);
  const f = (n) => Number(n).toFixed(1);
  const toD = (poly, close) => poly.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join(' ') + (close ? ' Z' : '');
  const isLinear = ['line', 'arrow', 'doubleArrow'].includes(o.kind);
  const parts = [`<g${rot}>`];
  if (fill !== 'none' && !isLinear && segs[0]) {
    parts.push(`<path d="${toD(segs[0], true)}" fill="${fill}" stroke="none"/>`);
  }
  if (stroke !== 'none') {
    for (const poly of segs) {
      parts.push(`<path d="${toD(poly, !isLinear)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    if ((o.kind === 'arrow' || o.kind === 'doubleArrow') && svgArrowHeadFn) {
      const size = sw * 3.6 * (o.arrowScale || 1);
      const style = ['filled', 'open', 'stealth', 'diamond'].includes(o.headStyle) ? o.headStyle : 'filled';
      parts.push(svgArrowHeadFn({ x, y }, { x: x + w, y: y + h }, size, style, stroke, sw));
      if (o.kind === 'doubleArrow') {
        parts.push(svgArrowHeadFn({ x: x + w, y: y + h }, { x, y }, size, style, stroke, sw));
      }
    }
  }
  parts.push('</g>');
  return parts.join('');
}
