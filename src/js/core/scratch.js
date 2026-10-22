import { dist, bboxOfPoints } from './util.js';

export const SCRATCH_MIN_REVERSALS = 5;       // Digits '2', '3' and letters 'w', 'm' have <= 3 reversals
export const SCRATCH_MIN_DENSITY = 3.5;         // Scribbles retrace densely over same space (L / diagonal >= 3.5)
export const SCRATCH_MAX_NET_PROGRESS = 0.35;   // Writing translates forward; scribbles stay in place
export const SCRATCH_SAMPLE_SPACING = 3;

/** Reduce redundant high-PPS pointer samples for classification only. */
export function resampleScratchPoints(points, spacing = SCRATCH_SAMPLE_SPACING) {
  if (!Array.isArray(points)) return [];
  const valid = points.filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y));
  if (valid.length < 2 || !(spacing > 0)) return valid;
  const axes = [
    (point) => point.x,
    (point) => point.y,
    (point) => (point.x + point.y) * 0.7071,
    (point) => (point.x - point.y) * 0.7071
  ];
  const isTurn = (before, point, after) => axes.some((axis) => {
    const incoming = axis(point) - axis(before);
    const outgoing = axis(after) - axis(point);
    return incoming * outgoing < 0 && Math.abs(incoming) + Math.abs(outgoing) >= spacing * 0.5;
  });
  const sampled = [valid[0]];
  let anchor = valid[0];
  for (let i = 1; i < valid.length - 1; i++) {
    if (dist(anchor, valid[i]) >= spacing || isTurn(valid[i - 1], valid[i], valid[i + 1])) {
      sampled.push(valid[i]);
      anchor = valid[i];
    }
  }
  const end = valid[valid.length - 1];
  if (sampled[sampled.length - 1] !== end) sampled.push(end);
  return sampled;
}

export function isScratchGesture(points, sensitivity = 'medium') {
  if (!Array.isArray(points)) return false;

  let minReversals = SCRATCH_MIN_REVERSALS; // 5
  let minDensity = SCRATCH_MIN_DENSITY;     // 3.5
  let minPoints = 12;

  if (sensitivity === 'low') {
    minReversals = 7;
    minDensity = 4.5;
    minPoints = 15;
  } else if (sensitivity === 'high') {
    minReversals = 4;
    minDensity = 2.8;
    minPoints = 10;
  }

  points = resampleScratchPoints(points);
  if (points.length < minPoints) return false;
  const first = points[0];
  const last = points[points.length - 1];

  // Note: No time-limit cutoff — deliberate and slow scribbling is supported.

  // Count significant directional reversals along dominant and diagonal axes
  function countReversals(getCoord) {
    let reversals = 0;
    let lastSign = 0;
    let accumulated = 0;
    const MIN_DISPLACEMENT = 10; // At least 10px travel before turnaround

    for (let i = 1; i < points.length; i++) {
      const delta = getCoord(points[i]) - getCoord(points[i - 1]);
      if (Math.abs(delta) < 0.6) continue;
      const sign = Math.sign(delta);

      if (sign === lastSign || lastSign === 0) {
        accumulated += Math.abs(delta);
        lastSign = sign;
      } else {
        if (accumulated >= MIN_DISPLACEMENT) {
          reversals++;
          accumulated = Math.abs(delta);
          lastSign = sign;
        } else {
          accumulated += delta * lastSign;
          if (accumulated < 0) {
            lastSign = sign;
            accumulated = Math.abs(accumulated);
          }
        }
      }
    }
    return reversals;
  }

  const revX = countReversals((p) => p.x);
  const revY = countReversals((p) => p.y);
  const revD1 = countReversals((p) => (p.x + p.y) * 0.7071);
  const revD2 = countReversals((p) => (p.x - p.y) * 0.7071);

  const maxReversals = Math.max(revX, revY, revD1, revD2);
  // Real scribbles require back-and-forth zig-zags based on sensitivity
  if (maxReversals < minReversals) return false;

  let totalPathLength = 0;
  for (let i = 1; i < points.length; i++) {
    totalPathLength += dist(points[i - 1], points[i]);
  }
  const bbox = bboxOfPoints(points);
  const diagonal = Math.hypot(bbox.w, bbox.h);
  if (diagonal < 14 || totalPathLength <= 0) return false;

  const density = totalPathLength / Math.max(1, diagonal);
  if (density < minDensity) return false;

  // Measure net spatial progression from start to end vs total path length
  // Handwriting moves forward across the word; scribbles stay centered over the ink being erased
  const netDisplacement = dist(first, last);
  if ((netDisplacement / totalPathLength) > SCRATCH_MAX_NET_PROGRESS) return false;

  // Spatial confinement check: In writing (like '2 3 2' or 'WRM'), the start half
  // and the end half of the points are spatially separated along the baseline.
  // In scribbling, the first half and second half bounding boxes strongly overlap along the dominant reversal axis.
  const mid = Math.floor(points.length / 2);
  const box1 = bboxOfPoints(points.slice(0, mid));
  const box2 = bboxOfPoints(points.slice(mid));
  const overlapW = Math.max(0, Math.min(box1.x + box1.w, box2.x + box2.w) - Math.max(box1.x, box2.x));
  const overlapH = Math.max(0, Math.min(box1.y + box1.h, box2.y + box2.h) - Math.max(box1.y, box2.y));
  const minW = Math.min(box1.w, box2.w);
  const minH = Math.min(box1.h, box2.h);
  const overlapRatioX = minW > 15 ? overlapW / minW : 1.0;
  const overlapRatioY = minH > 15 ? overlapH / minH : 1.0;
  if (overlapRatioX < 0.25 && overlapRatioY < 0.25) return false;

  return true;
}

export const detectScratchOut = isScratchGesture;
