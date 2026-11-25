// splines.js — Editable multi-segment cubic Bezier splines (anchors + tangent handles).

import { distToSegment, pointInPolygon, rotatePoint, bboxOfPoints } from './util.js';

/** Normalize knot structure ensuring numeric x, y and optional cubic tangent handles hIn/hOut. */
export function normalizeKnot(k) {
  const x = +k.x || 0, y = +k.y || 0;
  const out = { x, y, smooth: k.smooth !== false };
  if (k.hIn && Number.isFinite(k.hIn.x) && Number.isFinite(k.hIn.y)) out.hIn = { x: +k.hIn.x, y: +k.hIn.y };
  if (k.hOut && Number.isFinite(k.hOut.x) && Number.isFinite(k.hOut.y)) out.hOut = { x: +k.hOut.x, y: +k.hOut.y };
  return out;
}

/** Evaluate cubic Bezier point at parameter t in [0, 1]. */
export function cubicAt(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const uu = u * u, tt = t * t;
  const uuu = uu * u, ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  };
}

/** Flatten all cubic segments into a polyline for fast bounding boxes & hit testing. */
export function sampleSpline(o, stepsPerSeg = 14) {
  const knots = o?.knots || [];
  if (!knots.length) return [];
  if (knots.length === 1) return [{ x: knots[0].x, y: knots[0].y }];
  const pts = [{ x: knots[0].x, y: knots[0].y }];
  const count = o.closed ? knots.length : knots.length - 1;
  for (let i = 0; i < count; i++) {
    const k0 = knots[i];
    const k1 = knots[(i + 1) % knots.length];
    const c1 = k0.hOut || k0;
    const c2 = k1.hIn || k1;
    const straight = (!k0.hOut && !k1.hIn);
    if (straight) {
      pts.push({ x: k1.x, y: k1.y });
    } else {
      for (let s = 1; s <= stepsPerSeg; s++) {
        pts.push(cubicAt(k0, c1, c2, k1, s / stepsPerSeg));
      }
    }
  }
  return pts;
}

/** Compute bounding box of spline in local unrotated space. */
export function splineBounds(o) {
  const pts = sampleSpline(o, 12);
  if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
  const b = bboxOfPoints(pts);
  const pad = Math.max(1, (o.lineWidth || 3) / 2);
  return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
}

/** Draw spline object onto 2D canvas context. */
export function drawSpline(ctx, o, paintFn = (c) => c) {
  const knots = o?.knots || [];
  if (knots.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(knots[0].x, knots[0].y);
  const count = o.closed ? knots.length : knots.length - 1;
  for (let i = 0; i < count; i++) {
    const k0 = knots[i];
    const k1 = knots[(i + 1) % knots.length];
    const c1 = k0.hOut || k0;
    const c2 = k1.hIn || k1;
    if (!k0.hOut && !k1.hIn) ctx.lineTo(k1.x, k1.y);
    else ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, k1.x, k1.y);
  }
  if (o.closed) {
    ctx.closePath();
    if (o.fill && o.fill !== 'none') {
      ctx.fillStyle = o.fill;
      ctx.fill();
    }
  }
  if (o.stroke !== 'none') {
    ctx.strokeStyle = paintFn(o.stroke || '#201f1e');
    ctx.lineWidth = o.lineWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (o.dash) {
      ctx.setLineDash(o.dash === 'dot' ? [1, ctx.lineWidth * 2.2] : [ctx.lineWidth * 3, ctx.lineWidth * 2.2]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** Build SVG <path> string for spline export. */
export function splineSvg(o, rotAttr = '') {
  const knots = o?.knots || [];
  if (knots.length < 2) return '';
  const f = (n) => Number(n).toFixed(1);
  const parts = [`M${f(knots[0].x)} ${f(knots[0].y)}`];
  const count = o.closed ? knots.length : knots.length - 1;
  for (let i = 0; i < count; i++) {
    const k0 = knots[i];
    const k1 = knots[(i + 1) % knots.length];
    if (!k0.hOut && !k1.hIn) {
      parts.push(`L${f(k1.x)} ${f(k1.y)}`);
    } else {
      const c1 = k0.hOut || k0;
      const c2 = k1.hIn || k1;
      parts.push(`C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(k1.x)} ${f(k1.y)}`);
    }
  }
  if (o.closed) parts.push('Z');
  const fill = (o.closed && o.fill && o.fill !== 'none') ? o.fill : 'none';
  const stroke = (o.stroke && o.stroke !== 'none') ? o.stroke : 'none';
  const op = o.opacity != null && o.opacity < 1 ? ` opacity="${o.opacity}"` : '';
  return `<path d="${parts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${o.lineWidth || 3}" stroke-linecap="round" stroke-linejoin="round"${op}${rotAttr}/>`;
}

/** Hit-test local-space point against spline fill or stroke. */
export function hitSpline(o, lp, tol = 6) {
  const pts = sampleSpline(o, 14);
  if (pts.length < 2) return false;
  if (o.closed && o.fill && o.fill !== 'none' && pointInPolygon(lp, pts)) return true;
  const r = Math.max(tol, (o.lineWidth || 3) / 2 + 4);
  for (let i = 1; i < pts.length; i++) {
    if (distToSegment(lp, pts[i - 1], pts[i]) <= r) return true;
  }
  return false;
}

/** Translate spline knots & tangent handles in place. */
export function translateSpline(o, dx, dy) {
  for (const k of o.knots || []) {
    k.x += dx; k.y += dy;
    if (k.hIn) { k.hIn.x += dx; k.hIn.y += dy; }
    if (k.hOut) { k.hOut.x += dx; k.hOut.y += dy; }
  }
}

/** Scale spline knots & tangent handles in place around (ox, oy). */
export function scaleSpline(o, sx, sy, ox, oy) {
  for (const k of o.knots || []) {
    k.x = ox + (k.x - ox) * sx;
    k.y = oy + (k.y - oy) * sy;
    if (k.hIn) {
      k.hIn.x = ox + (k.hIn.x - ox) * sx;
      k.hIn.y = oy + (k.hIn.y - oy) * sy;
    }
    if (k.hOut) {
      k.hOut.x = ox + (k.hOut.x - ox) * sx;
      k.hOut.y = oy + (k.hOut.y - oy) * sy;
    }
  }
}

/** Rotate spline knots & handles cleanly around (cx, cy) via world point helpers. */
export function splineHandleScreenMap(o, cam) {
  const map = {};
  const b = splineBounds(o);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const toWorldPt = (pt) => o.rotation ? rotatePoint(pt.x, pt.y, cx, cy, o.rotation) : pt;
  const knots = o.knots || [];
  for (let i = 0; i < knots.length; i++) {
    const k = knots[i];
    const kw = toWorldPt(k);
    map[`sk:${i}`] = cam.toScreen(kw.x, kw.y);
    if (k.hIn) {
      const iw = toWorldPt(k.hIn);
      map[`si:${i}`] = cam.toScreen(iw.x, iw.y);
    }
    if (k.hOut) {
      const ow = toWorldPt(k.hOut);
      map[`so:${i}`] = cam.toScreen(ow.x, ow.y);
    }
  }
  return map;
}
