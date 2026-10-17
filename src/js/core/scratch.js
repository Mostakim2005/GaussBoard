import { dist, bboxOfPoints } from './util.js';

export const SCRATCH_MIN_REVERSALS = 3;
export const SCRATCH_MAX_DURATION_MS = 3500;
export const SCRATCH_MIN_DENSITY = 1.6;

export function isScratchGesture(points) {
  if (!points || points.length < 6) return false;
  const first = points[0];
  const last = points[points.length - 1];
  if (first.t != null && last.t != null) {
    if (last.t - first.t > SCRATCH_MAX_DURATION_MS) return false;
  }

  // Count significant inflection points along axes
  function countReversals(getCoord) {
    let reversals = 0;
    let lastSign = 0;
    let accumulated = 0;
    const MIN_DISPLACEMENT = 10; // at least 10px travel before turnaround

    for (let i = 1; i < points.length; i++) {
      const delta = getCoord(points[i]) - getCoord(points[i - 1]);
      if (Math.abs(delta) < 0.5) continue;
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
  if (maxReversals < SCRATCH_MIN_REVERSALS) return false;

  let totalPathLength = 0;
  for (let i = 1; i < points.length; i++) {
    totalPathLength += dist(points[i - 1], points[i]);
  }
  const bbox = bboxOfPoints(points);
  const diagonal = Math.hypot(bbox.w, bbox.h);
  if (diagonal < 8) return false;
  const density = totalPathLength / Math.max(1, diagonal);

  return density >= SCRATCH_MIN_DENSITY;
}

export const detectScratchOut = isScratchGesture;
