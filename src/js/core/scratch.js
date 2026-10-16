import { dist, bboxOfPoints } from './util.js';

export const SCRATCH_MIN_REVERSALS = 4;
export const SCRATCH_MAX_DURATION_MS = 1200;
export const SCRATCH_MIN_DENSITY = 3.0;

export function isScratchGesture(points) {
  if (!points || points.length < 8) return false;
  const first = points[0];
  const last = points[points.length - 1];
  if (first.t != null && last.t != null) {
    if (last.t - first.t > SCRATCH_MAX_DURATION_MS) return false;
  }
  let reversalsX = 0;
  let reversalsY = 0;
  let totalPathLength = 0;
  for (let i = 2; i < points.length; i++) {
    const dx1 = points[i - 1].x - points[i - 2].x;
    const dx2 = points[i].x - points[i - 1].x;
    const dy1 = points[i - 1].y - points[i - 2].y;
    const dy2 = points[i].y - points[i - 1].y;
    totalPathLength += dist(points[i - 1], points[i]);
    if (Math.sign(dx1) !== Math.sign(dx2) && Math.abs(dx2) > 3) reversalsX++;
    if (Math.sign(dy1) !== Math.sign(dy2) && Math.abs(dy2) > 3) reversalsY++;
  }
  const reversals = Math.max(reversalsX, reversalsY);
  const bbox = bboxOfPoints(points);
  const diagonal = Math.hypot(bbox.w, bbox.h);
  const density = totalPathLength / Math.max(1, diagonal);
  return reversals >= SCRATCH_MIN_REVERSALS && density > SCRATCH_MIN_DENSITY;
}
