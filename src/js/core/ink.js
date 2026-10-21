// Ink geometry.
//
// A stroke is drawn as ONE stroked path down its centreline, not as a filled
// outline. That matters:
//
//   * A single ctx.stroke() rasterises the whole stroke once, so a highlighter
//     that crosses itself composites once and cannot darken at the overlap -
//     the blotches that started this rewrite.
//   * Curving through the MIDPOINTS of the input points keeps every segment
//     inside its control triangle, so the path can never overshoot or loop.
//     Offsetting a centreline into a left/right outline has no such guarantee:
//     at a sharp turn the two sides cross and the fill throws out a spike,
//     which is what put barbs on the letters.
//
// Width used to be constant along a whole stroke: the mean pressure set one
// weight and that was that. It matched a felt pen, and it meant that pressing
// harder in the middle of a word did nothing whatsoever - which is not what
// anybody means by pressure sensitivity, and people said so.
//
// Varying it does NOT mean going back to offsetting an outline. The rule above
// still holds and is still why letters have no barbs. Instead a stroke is cut
// into RUNS of neighbouring points that want a similar width, and each run is
// stroked down its own centreline, the same way the whole stroke used to be.
// Runs overlap by a point and the caps are round, so the joins are invisible.
// Opaque ink over opaque ink of the same colour is the same colour, so nothing
// darkens - and the highlighter, which is translucent and WOULD darken at an
// overlap, keeps the single-path route it always had.

import { clamp, dist } from './util.js';

const PRESSURE_FLOOR = 0.82;   // stroke weight at the lightest touch
const PRESSURE_RANGE = 0.36;   // ... plus this much at the heaviest

/*
 * The same idea for a width that varies WITHIN a stroke, but with room to see.
 *
 * These two are chosen so that a middling press - 0.5, which is what a mouse,
 * a finger and every stroke drawn before this reports - lands on exactly 1.0,
 * the width the stroke would have had anyway. So a board full of old ink looks
 * the way it always did, and only genuine pen pressure moves the line.
 */
const VARY_FLOOR = 0.55;
const VARY_RANGE = 0.90;

/*
 * How many distinct widths a stroke is allowed.
 *
 * Seven was chosen for how it looked and without asking what it cost. A real
 * pen mark swells and fades, so it crossed nearly every step on the way up and
 * again on the way down: eleven runs for one stroke, where the old constant
 * width was one. On a board of 2688 strokes zoomed out - where nothing is
 * culled because everything is on screen - that is thirty thousand draw calls
 * a frame instead of three, and erasing crawled.
 *
 * Five is the same taper to look at. Below that a swell starts to read as
 * steps rather than a curve.
 */
const WIDTH_STEPS = 5;

/*
 * ...and none of them when the difference is too small to see.
 *
 * The whole range of a 4px pen is about 3.6px. Zoomed out to a fifth, that is
 * two thirds of one screen pixel from the thinnest part of a stroke to the
 * thickest - a difference nobody can see, being paid for five times over on
 * every object on the board. Under this many screen pixels of swing, a stroke
 * is drawn the old way: one width, one call.
 */
const VISIBLE_SWING_PX = 1.25;

/** Pressure jitters sample to sample; the width people SEE should not. */
function smoothPressure(pts) {
  const n = pts.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0, c = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) {
      sum += clamp(pts[j].p ?? 0.5, 0, 1); c++;
    }
    out[i] = sum / c;
  }
  return out;
}

/**
 * Does this stroke actually carry pressure, or is it all one number?
 *
 * A mouse reports nothing and gets 0.5 for every point; so does every stroke
 * saved before any of this existed. Those must keep taking the old single-path
 * route exactly as before - not because it is faster, though it is, but
 * because it is the only way to be certain a board drawn last year opens
 * looking the way its owner left it.
 */
export function hasPressureVariation(pts) {
  if (!pts || pts.length < 4) return false;
  let lo = 1, hi = 0;
  for (const q of pts) {
    const v = clamp(q.p ?? 0.5, 0, 1);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return hi - lo > 0.08;
}

/** Light moving average - removes sensor jitter without rounding letterforms. */
function smoothPath(pts, passes = 1) {
  if (pts.length < 3) return pts;
  let cur = pts;
  for (let k = 0; k < passes; k++) {
    const next = [cur[0]];
    for (let i = 1; i < cur.length - 1; i++) {
      next.push({
        ...cur[i],
        x: (cur[i - 1].x + cur[i].x * 2 + cur[i + 1].x) / 4,
        y: (cur[i - 1].y + cur[i].y * 2 + cur[i + 1].y) / 4,
      });
    }
    next.push(cur[cur.length - 1]);
    cur = next;
  }
  return cur;
}

/** Drop points that sit on top of each other; they only add noise. */
function dedupe(pts, min) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) if (dist(out[out.length - 1], pts[i]) >= min) out.push(pts[i]);
  out.push(pts[pts.length - 1]);
  return out;
}

/** Mean pressure over the stroke - sets its weight. */
export function strokeWeight(points, size, pressure = true) {
  if (!pressure || !points.length) return size;
  let sum = 0, n = 0;
  for (const p of points) { sum += clamp(p.p ?? 0.5, 0, 1); n++; }
  return size * (PRESSURE_FLOOR + (sum / n) * PRESSURE_RANGE);
}

/**
 * The centreline, curved through the midpoints of the samples.
 * @returns {Path2D}
 */
export function preparePoints(points, size) {
  return smoothPath(dedupe(points, Math.max(0.35, size * 0.08)), 1);
}

export const INK_ENGINES = {
  default: { id: 'default', label: 'GazBoard Default' },
  windowsInk: { id: 'windowsInk', label: 'Windows Ink (Velocity & Bezier)' },
  catmullRomBezier: { id: 'catmullRomBezier', label: 'Catmull–Rom Bézier' },
  perfectFreehand: { id: 'perfectFreehand', label: 'Perfect Freehand' }
};

let activeInkEngine = 'default';
export function setInkEngine(engine) {
  if (INK_ENGINES[engine]) activeInkEngine = engine;
}
export function getInkEngine() {
  return activeInkEngine;
}

// Centripetal Catmull–Rom converted to cubic Bézier controls. Chord-length
// spacing reduces loops and cusps around unevenly spaced pointer samples.
function catmullRomControls(p0, p1, p2, p3) {
  const d = (a, b) => Math.max(1e-3, Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)));
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const dt = t2 - t1;
  const tangent = (a, b, c, ta, tb, tc) => ({
    x: ((b.x - a.x) / (tb - ta) - (c.x - a.x) / (tc - ta) + (c.x - b.x) / (tc - tb)) * dt,
    y: ((b.y - a.y) / (tb - ta) - (c.y - a.y) / (tc - ta) + (c.y - b.y) / (tc - tb)) * dt
  });
  const m1 = tangent(p0, p1, p2, t0, t1, t2);
  const m2 = tangent(p1, p2, p3, t1, t2, t3);
  return [
    { x: p1.x + m1.x / 3, y: p1.y + m1.y / 3 },
    { x: p2.x - m2.x / 3, y: p2.y - m2.y / 3 }
  ];
}

function catmullRomPath(path, pts) {
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const [cp1, cp2] = catmullRomControls(p0, p1, p2, p3);
    path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
  }
  return path;
}

export function centrelinePath(points, size, engine = activeInkEngine) {
  const path = new Path2D();
  if (!points || !points.length) return path;

  const pts = preparePoints(points, size);

  if (pts.length === 1) {                       // a dot
    path.moveTo(pts[0].x + 0.01, pts[0].y);
    path.lineTo(pts[0].x, pts[0].y);
    return path;
  }

  path.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) { path.lineTo(pts[1].x, pts[1].y); return path; }

  if (engine === 'catmullRomBezier') return catmullRomPath(path, pts);

  if (engine === 'windowsInk') {
    // Windows Ink-style cubic Bezier spline with velocity-adaptive curvature
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    return path;
  }

  if (engine === 'perfectFreehand') {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = pts[i].x * 0.45 + pts[i + 1].x * 0.55;
      const my = pts[i].y * 0.45 + pts[i + 1].y * 0.55;
      path.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    path.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    return path;
  }

  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    path.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  path.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  return path;
}

/** One run's path, built exactly the way centrelinePath builds the whole one. */
function runPath(pts, engine = activeInkEngine) {
  const path = new Path2D();
  if (!pts.length) return path;
  path.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 1) { path.lineTo(pts[0].x + 0.01, pts[0].y); return path; }
  if (pts.length === 2) { path.lineTo(pts[1].x, pts[1].y); return path; }

  if (engine === 'catmullRomBezier') return catmullRomPath(path, pts);

  if (engine === 'windowsInk') {
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    return path;
  }

  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    path.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  path.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  return path;
}

/**
 * Closed ribbon envelope Path2D for a flat-chisel calligraphy nib.
 */
export function calligraphyEnvelope(points, size = 12, angleDeg = 35, flatness = 4) {
  const path = new Path2D();
  if (!points || !points.length) return path;

  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  if (points.length === 1) {
    const p = points[0];
    const w = (size * 0.5) * (0.6 + 0.8 * (p.p ?? 0.5));
    const h = Math.max(1, w / flatness);
    const dx = w * cos;
    const dy = w * sin;
    const px = -h * sin;
    const py = h * cos;
    path.moveTo(p.x - dx - px, p.y - dy - py);
    path.lineTo(p.x + dx - px, p.y + dy - py);
    path.lineTo(p.x + dx + px, p.y + dy + py);
    path.lineTo(p.x - dx + px, p.y - dy + py);
    path.closePath();
    return path;
  }

  const pts = dedupe(points, Math.max(0.3, size * 0.05));
  if (pts.length < 2) return path;

  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const steps = Math.max(1, Math.ceil(dist / 3));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      dense.push({
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
        p: (p0.p ?? 0.5) + ((p1.p ?? 0.5) - (p0.p ?? 0.5)) * t
      });
    }
  }
  dense.push(pts[pts.length - 1]);

  const left = [];
  const right = [];

  for (let i = 0; i < dense.length; i++) {
    const pt = dense[i];
    const pressure = pt.p ?? 0.5;
    const w = (size * 0.5) * (0.65 + 0.7 * pressure);
    const dx = w * cos;
    const dy = w * sin;
    left.push({ x: pt.x - dx, y: pt.y - dy });
    right.push({ x: pt.x + dx, y: pt.y + dy });
  }

  path.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) {
    path.lineTo(left[i].x, left[i].y);
  }
  path.lineTo(right[right.length - 1].x, right[right.length - 1].y);
  for (let i = right.length - 2; i >= 0; i--) {
    path.lineTo(right[i].x, right[i].y);
  }
  path.closePath();
  return path;
}

export function calligraphySvgPath(o) {
  const pts = o.points;
  if (!pts || !pts.length) return '';
  const size = o.width || 12;
  const angleDeg = o.angle ?? 35;
  const flatness = o.flatness ?? 4;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  if (pts.length === 1) {
    const p = pts[0];
    const w = (size * 0.5) * (0.6 + 0.8 * (p.p ?? 0.5));
    const h = Math.max(1, w / flatness);
    const dx = w * cos, dy = w * sin, px = -h * sin, py = h * cos;
    return `M${(p.x - dx - px).toFixed(1)} ${(p.y - dy - py).toFixed(1)} `
      + `L${(p.x + dx - px).toFixed(1)} ${(p.y + dy - py).toFixed(1)} `
      + `L${(p.x + dx + px).toFixed(1)} ${(p.y + dy + py).toFixed(1)} `
      + `L${(p.x - dx + px).toFixed(1)} ${(p.y - dy + py).toFixed(1)} Z`;
  }

  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i], p1 = pts[i + 1];
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const steps = Math.max(1, Math.ceil(dist / 4));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      dense.push({
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
        p: (p0.p ?? 0.5) + ((p1.p ?? 0.5) - (p0.p ?? 0.5)) * t
      });
    }
  }
  dense.push(pts[pts.length - 1]);

  const left = [], right = [];
  for (let i = 0; i < dense.length; i++) {
    const pt = dense[i];
    const w = (size * 0.5) * (0.65 + 0.7 * (pt.p ?? 0.5));
    left.push({ x: pt.x - w * cos, y: pt.y - w * sin });
    right.push({ x: pt.x + w * cos, y: pt.y + w * sin });
  }

  let d = `M${left[0].x.toFixed(1)} ${left[0].y.toFixed(1)}`;
  for (let i = 1; i < left.length; i++) d += ` L${left[i].x.toFixed(1)} ${left[i].y.toFixed(1)}`;
  d += ` L${right[right.length - 1].x.toFixed(1)} ${right[right.length - 1].y.toFixed(1)}`;
  for (let i = right.length - 2; i >= 0; i--) d += ` L${right[i].x.toFixed(1)} ${right[i].y.toFixed(1)}`;
  d += ' Z';
  return d;
}

export function brushRuns(points, size = 8, softness = 'medium', velocityThinning = true, scale = 1) {
  const pts = preparePoints(points, size);
  if (pts.length < 2) return [{ path: runPath(pts), width: size }];

  const mult = softness === 'strong' ? 2.5 : softness === 'light' ? 1.3 : 1.8;
  const baseFloor = softness === 'strong' ? 0.2 : softness === 'light' ? 0.45 : 0.3;
  const soft = smoothPressure(pts);
  const widths = [];

  for (let i = 0; i < pts.length; i++) {
    let pVal = soft[i] ?? 0.5;
    let w = size * (baseFloor + (pVal ** 1.5) * mult);

    if (velocityThinning && i > 0 && pts[i].t && pts[i - 1].t) {
      const dt = Math.max(1, pts[i].t - pts[i - 1].t);
      const dist = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      const vel = dist / dt;
      if (vel > 1.2) {
        const thin = Math.max(0.65, 1 - Math.min(0.35, (vel - 1.2) * 0.15));
        w *= thin;
      }
    }

    if (i === 0) w *= 0.35;
    else if (i === 1) w *= 0.65;
    if (i === pts.length - 1) w *= 0.25;
    else if (i === pts.length - 2) w *= 0.6;

    widths.push(w);
  }

  const steps = 10;
  const minW = size * baseFloor * 0.3;
  const maxW = size * (baseFloor + mult);
  const bucketFor = (w) => Math.round(clamp((w - minW) / (maxW - minW || 1), 0, 1) * (steps - 1));
  const widthFor = (b) => minW + (b / (steps - 1)) * (maxW - minW);

  const runs = [];
  let start = 0;
  let bucket = bucketFor(widths[0]);

  for (let i = 1; i <= pts.length; i++) {
    const here = i < pts.length ? bucketFor(widths[i]) : -1;
    if (here === bucket) continue;
    const from = Math.max(0, start - 1);
    const to = Math.min(pts.length, i + 1);
    runs.push({ path: runPath(pts.slice(from, to)), width: widthFor(bucket) });
    start = i;
    bucket = here;
  }
  return runs.length ? runs : [{ path: runPath(pts), width: size }];
}

export function fountainRuns(points, size = 4, slantDeg = 45, flex = 'normal', scale = 1) {
  const pts = preparePoints(points, size);
  if (pts.length < 2) return [{ path: runPath(pts), width: size }];

  const slantRad = (slantDeg * Math.PI) / 180;
  const flexMult = flex === 'expressive' ? 2.2 : flex === 'subtle' ? 1.1 : 1.6;
  const soft = smoothPressure(pts);
  const widths = [];

  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const dir = Math.atan2(dy, dx);
    const spread = Math.abs(Math.sin(dir - slantRad));
    const p = soft[i] ?? 0.5;
    let w = size * (0.35 + 0.65 * spread) * (0.5 + 0.9 * p * (flexMult / 1.6));

    if (i === 0) w *= 0.4;
    else if (i === 1) w *= 0.75;
    if (i === pts.length - 1) w *= 0.35;
    else if (i === pts.length - 2) w *= 0.7;

    widths.push(w);
  }

  const steps = 8;
  const minW = size * 0.2;
  const maxW = size * 1.8;
  const bucketFor = (w) => Math.round(clamp((w - minW) / (maxW - minW || 1), 0, 1) * (steps - 1));
  const widthFor = (b) => minW + (b / (steps - 1)) * (maxW - minW);

  const runs = [];
  let start = 0;
  let bucket = bucketFor(widths[0]);

  for (let i = 1; i <= pts.length; i++) {
    const here = i < pts.length ? bucketFor(widths[i]) : -1;
    if (here === bucket) continue;
    const from = Math.max(0, start - 1);
    const to = Math.min(pts.length, i + 1);
    runs.push({ path: runPath(pts.slice(from, to)), width: widthFor(bucket) });
    start = i;
    bucket = here;
  }
  return runs.length ? runs : [{ path: runPath(pts), width: size }];
}

/**
 * A stroke cut into runs of similar width, each with its own centreline.
 *
 * Widths are quantised to a few steps so that neighbouring samples that want
 * 4.31 and 4.34 pixels end up in one run rather than two; without that, a
 * stroke would be one draw call per point and a page of handwriting would
 * crawl. Each run reaches one point back into the run before it, so the round
 * cap of one lands inside the body of the next and there is no seam.
 *
 * @returns {Array<{path: Path2D, width: number}>}
 */
export function pressureRuns(points, size, scale = 1) {
  // Not worth splitting: at this size on this screen the whole swing is
  // narrower than a pixel or so, and one call draws it identically.
  if (size * VARY_RANGE * (scale || 1) < VISIBLE_SWING_PX) {
    return [{ path: centrelinePath(points, size),
      width: strokeWeight(points, size, true) }];
  }
  const pts = preparePoints(points, size);
  if (pts.length < 2) return [{ path: runPath(pts), width: size }];

  const soft = smoothPressure(pts);
  const step = (i) => {
    const w = VARY_FLOOR + soft[i] * VARY_RANGE;
    // Quantise in the 0..1 space, then turn back into a width, so the steps
    // are evenly spaced however thick the pen is.
    const t = clamp((w - VARY_FLOOR) / VARY_RANGE, 0, 1);
    return Math.round(t * (WIDTH_STEPS - 1));
  };

  const runs = [];
  let start = 0;
  let bucket = step(0);
  const widthFor = (b) => size * (VARY_FLOOR + (b / (WIDTH_STEPS - 1)) * VARY_RANGE);

  for (let i = 1; i <= pts.length; i++) {
    const here = i < pts.length ? step(i) : -1;
    if (here === bucket) continue;
    // One point of overlap on each side, so consecutive runs share geometry
    // and the joins disappear under the round caps.
    const from = Math.max(0, start - 1);
    const to = Math.min(pts.length, i + 1);
    runs.push({ path: runPath(pts.slice(from, to)), width: widthFor(bucket) });
    start = i;
    bucket = here;
  }
  return runs;
}

/* Paths are stable once a stroke is committed, so keep the last one. */
const cache = new WeakMap();
const runCache = new WeakMap();

/** The runs for a committed stroke, kept the same way inkPath keeps its path. */
export function inkRuns(stroke, scale = 1) {
  const pts = stroke.points;
  if (!pts || !pts.length) return null;
  const tool = stroke.tool || 'pen';
  const size = stroke.width || (tool === 'brush' ? 8 : tool === 'calligraphy' ? 12 : 4);
  const band = Math.round(Math.log2(Math.max(0.05, scale)) * 2);
  const engine = activeInkEngine;
  const key = `${size}_${tool}_${stroke.softness || ''}_${stroke.slant || ''}_${stroke.flex || ''}_${band}_${engine}`;
  const hit = runCache.get(pts);
  if (hit && hit.len === pts.length && hit.key === key) return hit.runs;
  let runs;
  if (tool === 'brush') {
    runs = brushRuns(pts, size, stroke.softness, stroke.velocityThinning, scale);
  } else if (tool === 'fountain') {
    runs = fountainRuns(pts, size, stroke.slant, stroke.flex, scale);
  } else {
    runs = pressureRuns(pts, size, scale);
  }
  runCache.set(pts, { len: pts.length, key, runs });
  return runs;
}

export function calligraphyPath(stroke) {
  const pts = stroke.points;
  if (!pts || !pts.length) return null;
  const size = stroke.width || 12;
  const angle = stroke.angle ?? 35;
  const flatness = stroke.flatness ?? 4;
  const key = `cal_${size}_${angle}_${flatness}`;
  const hit = cache.get(pts);
  if (hit && hit.len === pts.length && hit.key === key) return hit.path;
  const path = calligraphyEnvelope(pts, size, angle, flatness);
  cache.set(pts, { len: pts.length, key, path });
  return path;
}

export function inkPath(stroke) {
  const pts = stroke.points;
  if (!pts || !pts.length) return null;
  if (stroke.tool === 'calligraphy') return calligraphyPath(stroke);
  const size = stroke.width || 4;
  const engine = activeInkEngine;
  const hit = cache.get(pts);
  if (hit && hit.len === pts.length && hit.size === size && hit.engine === engine) return hit.path;
  const path = centrelinePath(pts, size);
  cache.set(pts, { len: pts.length, size, engine, path });
  return path;
}
