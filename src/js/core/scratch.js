import { dist, bboxOfPoints } from './util.js';

export const SCRATCH_MIN_REVERSALS = 5;       // Digits '2', '3' and letters 'w', 'm' have <= 3 reversals
export const SCRATCH_MAX_DURATION_MS = 3000;
export const SCRATCH_MIN_DENSITY = 3.0;         // Scribbles retrace densely over same space (L / diagonal >= 3.0)
export const SCRATCH_MAX_NET_PROGRESS = 0.45;   // Writing translates forward; scribbles stay in place

export function isScratchGesture(points) {
  if (!points || points.length < 10) return false;
  const first = points[0];
  const last = points[points.length - 1];
  if (first.t != null && last.t != null) {
    if (last.t - first.t > SCRATCH_MAX_DURATION_MS) return false;
  }

  // Count significant directional reversals along dominant and diagonal axes
  function countReversals(getCoord) {
    let reversals = 0;
    let lastSign = 0;
    let accumulated = 0;
    const MIN_DISPLACEMENT = 12; // At least 12px travel before turnaround

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
  // Real scribbles require at least 5 back-and-forth zig-zags
  if (maxReversals < SCRATCH_MIN_REVERSALS) return false;

  let totalPathLength = 0;
  for (let i = 1; i < points.length; i++) {
    totalPathLength += dist(points[i - 1], points[i]);
  }
  const bbox = bboxOfPoints(points);
  const diagonal = Math.hypot(bbox.w, bbox.h);
  if (diagonal < 12) return false;

  const density = totalPathLength / Math.max(1, diagonal);
  if (density < SCRATCH_MIN_DENSITY) return false;

  // Measure net spatial progression from start to end vs total path length
  // Handwriting moves forward across the word; scribbles stay centered over the ink being erased
  const netDisplacement = dist(first, last);
  if ((netDisplacement / totalPathLength) > SCRATCH_MAX_NET_PROGRESS) return false;

  return true;
}

export const detectScratchOut = isScratchGesture;
