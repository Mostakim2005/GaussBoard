// Hit testing: which object is under the pointer, what falls inside a
// marquee or lasso, and which stroke a point eraser touches.

import { boundsOf, worldBounds, WINDOW_HEADER_H } from './store.js';
import { distToSegment, pointInBox, pointInPolygon, rotatePoint, boxesIntersect, boxContains } from './util.js';
import { shapePath, noteTypeRange } from './render.js';
import { hitConnector } from './connectors.js';
import { TASK_LINE_RE, toggleTaskAtLine } from './markdown.js';

const scratch = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;

/** Map a world point into an object's un-rotated local space. */
export function toLocal(o, p) {
  if (!o.rotation) return p;
  const b = boundsOf(o);
  return rotatePoint(p.x, p.y, b.x + b.w / 2, b.y + b.h / 2, -o.rotation);
}

export const ghost = (o) => !!o && !!o.hidden;

export function hitObject(o, p, tol = 6) {
  if (ghost(o)) return false;
  const lp = toLocal(o, p);
  const b = boundsOf(o);

  if (o.type === 'connector') {
    if (!pointInBox(p, { x: b.x - tol, y: b.y - tol, w: b.w + tol * 2, h: b.h + tol * 2 })) return false;
    return hitConnector(o, p, tol);
  }

  if (o.type === 'stroke' || (o.type === 'curtain' && Array.isArray(o.points))) {
    if (!pointInBox(lp, { x: b.x - tol, y: b.y - tol, w: b.w + tol * 2, h: b.h + tol * 2 })) return false;
    const r = Math.max(tol, (o.width || 32) / 2 + 2);
    const pts = o.points;
    if (pts.length === 1) return Math.hypot(pts[0].x - lp.x, pts[0].y - lp.y) <= r;
    for (let i = 1; i < pts.length; i++) if (distToSegment(lp, pts[i - 1], pts[i]) <= r) return true;
    return false;
  }

  if (o.type === 'shape' && scratch) {
    if (!pointInBox(lp, { x: b.x - tol, y: b.y - tol, w: b.w + tol * 2, h: b.h + tol * 2 })) return false;
    const filled = o.fill && o.fill !== 'none';
    scratch.save();
    shapePath(scratch, o.kind, o.x, o.y, o.w, o.h);
    let hit = false;
    if (filled && o.kind !== 'line' && o.kind !== 'arrow' && o.kind !== 'doubleArrow') hit = scratch.isPointInPath(lp.x, lp.y);
    if (!hit) {
      scratch.lineWidth = Math.max((o.lineWidth || 3) + tol * 1.4, 8);
      hit = scratch.isPointInStroke(lp.x, lp.y);
    }
    scratch.restore();
    return hit;
  }

  // Include 12px card padding when text object uses a visible card container
  const cardPad = (o.type === 'text' && o.markdown !== false && o.cardStyle !== 'transparent') ? 12 : 0;
  return pointInBox(lp, {
    x: b.x - cardPad - tol / 2,
    y: b.y - cardPad - tol / 2,
    w: b.w + cardPad * 2 + tol,
    h: b.h + cardPad * 2 + tol
  });
}

/**
 * Tests whether world point `p` lands on the collapse/expand toggle button (`▲` / `▼`)
 * of an Obsidian `'window'` style Markdown card.
 */
export function hitWindowHeaderCollapse(o, p) {
  if (!o || ghost(o) || o.type !== 'text' || o.markdown === false || o.cardStyle !== 'window') return null;
  const lp = toLocal(o, p);
  const pad = 12;
  const hx = o.x - pad;
  const hy = o.y - pad;
  const hw = o.w + pad * 2;
  if (
    lp.x >= hx + hw - 34 &&
    lp.x <= hx + hw &&
    lp.y >= hy &&
    lp.y <= hy + WINDOW_HEADER_H
  ) {
    return { obj: o, collapsed: !o.collapsed };
  }
  return null;
}

/**
 * Toggles collapse state if `p` lands on a `'window'` card's header toggle button.
 */
export function toggleCardCollapseAtPoint(store, p, tol = 6) {
  const order = store.doc.order;
  for (let i = order.length - 1; i >= 0; i--) {
    const o = store.doc.objects[order[i]];
    if (!o || o.locked || ghost(o)) continue;
    if (!hitObject(o, p, tol)) continue;
    const hit = hitWindowHeaderCollapse(o, p);
    if (hit) {
      store.update(o.id, { collapsed: hit.collapsed }, 'toggle card collapse');
      return true;
    }
    if (o.type !== 'stroke') return false;
  }
  return false;
}

/**
 * Tests whether a world point `p` lands on an interactive Markdown task
 * checkbox (`- [ ]` or `- [x]`) inside a text or note object `o`.
 */
export function hitTaskCheckbox(o, p) {
  if (!o || ghost(o) || o.markdown === false) return null;
  if (o.type !== 'text' && o.type !== 'note') return null;
  if (o.type === 'text' && o.cardStyle === 'window' && o.collapsed) return null;
  if (typeof o.text !== 'string' || !/[-*+]\s+\[[ xX]\]/.test(o.text)) return null;

  const lp = toLocal(o, p);
  const b = boundsOf(o);
  if (!pointInBox(lp, b)) return null;

  const isNote = o.type === 'note';
  const isWindow = o.type === 'text' && o.cardStyle === 'window';
  const padX = isNote ? Math.max(10, o.w * 0.08) + 10 : 10;
  const padY = (isNote ? Math.max(10, o.w * 0.08) + 8 : 8) + (isWindow ? WINDOW_HEADER_H - 6 : 0);
  const fontSize = o.fontSize || (isNote ? Math.min(24, noteTypeRange(o).max) : 24);
  const lineH = fontSize * 1.45;

  const lines = o.text.replace(/\r\n?/g, '\n').split('\n');
  let curY = b.y + padY;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hMatch = line.match(/^\s*(#{1,6})\s+/);
    const rowH = hMatch ? lineH * (1.45 - hMatch[1].length * 0.06) : lineH;
    const tMatch = line.match(TASK_LINE_RE);

    if (tMatch) {
      const indentPx = tMatch[1].length * (fontSize * 0.5);
      const boxSize = Math.max(16, fontSize * 1.15);
      const boxX = b.x + padX + indentPx - 4;
      const boxY = curY;
      if (
        lp.x >= boxX &&
        lp.x <= boxX + boxSize + 8 &&
        lp.y >= boxY - 2 &&
        lp.y <= boxY + rowH + 2
      ) {
        return {
          obj: o,
          line: i,
          checked: tMatch[2].toLowerCase() === 'x'
        };
      }
    }
    curY += rowH;
  }
  return null;
}

/**
 * Topmost interactive Markdown task checkbox at world point `p`, or null.
 */
export function taskCheckboxAt(store, p, tol = 6) {
  const order = store.doc.order;
  for (let i = order.length - 1; i >= 0; i--) {
    const o = store.doc.objects[order[i]];
    if (!o || o.locked || ghost(o)) continue;
    if (!hitObject(o, p, tol)) continue;
    const hit = hitTaskCheckbox(o, p);
    if (hit) return hit;
    if (o.type !== 'stroke') return null;
  }
  return null;
}

/**
 * Convenience helper: if `p` hits a Markdown task checkbox on the canvas,
 * toggles `- [ ]` <-> `- [x]` directly in `store` as an undoable transaction.
 */
export function toggleTaskAtPoint(store, p, tol = 6) {
  const hit = taskCheckboxAt(store, p, tol);
  if (!hit) return false;
  const res = toggleTaskAtLine(hit.obj.text, hit.line);
  if (!res.toggled) return false;
  store.update(hit.obj.id, { text: res.text }, 'toggle task');
  return true;
}

export function pick(store, p, tol = 6, { includeLocked = true } = {}) {
  const order = store.doc.order;
  for (let i = order.length - 1; i >= 0; i--) {
    const o = store.doc.objects[order[i]];
    if (!o || (o.locked && !includeLocked)) continue;
    if (hitObject(o, p, tol)) return o;
  }
  return null;
}

export function pickAll(store, p, tol = 6, { includeLocked = true } = {}) {
  const out = [];
  for (const o of store.objects) if (o && (includeLocked || !o.locked) && hitObject(o, p, tol)) out.push(o);
  return out.reverse();
}

export function inBox(store, box, contain = false) {
  const b = normalizeBox(box);
  return store.objects.filter((o) => {
    if (!o || o.locked || ghost(o)) return false;
    const ob = worldBounds(o);
    return contain ? boxContains(b, ob) : boxesIntersect(b, ob);
  });
}

export function inLasso(store, poly) {
  if (poly.length < 3) return [];
  return store.objects.filter((o) => {
    if (!o || o.locked || ghost(o)) return false;
    if (o.type === 'stroke') {
      let inside = 0;
      const step = Math.max(1, Math.floor(o.points.length / 12));
      for (let i = 0; i < o.points.length; i += step) if (pointInPolygon(o.points[i], poly)) inside++;
      return inside >= Math.max(1, Math.ceil(o.points.length / step / 2));
    }
    const b = worldBounds(o);
    const corners = [
      { x: b.x, y: b.y }, { x: b.x + b.w, y: b.y }, { x: b.x + b.w, y: b.y + b.h }, { x: b.x, y: b.y + b.h },
      { x: b.x + b.w / 2, y: b.y + b.h / 2 }
    ];
    return corners.filter((c) => pointInPolygon(c, poly)).length >= 3;
  });
}

export function curtainAt(store, p, tol = 6) {
  const order = store.doc.order;
  for (let i = order.length - 1; i >= 0; i--) {
    const o = store.doc.objects[order[i]];
    if (!o || o.type === 'stroke' || ghost(o)) continue;
    if (!hitObject(o, p, tol)) continue;
    return o.type === 'curtain' ? o : null;
  }
  return null;
}

export function strokesAlong(store, a, b, radius) {
  const hits = [];
  const box = normalizeBox({ x: Math.min(a.x, b.x) - radius, y: Math.min(a.y, b.y) - radius, w: Math.abs(a.x - b.x) + radius * 2, h: Math.abs(a.y - b.y) + radius * 2 });
  const objs = store.doc.objects;
  for (const id of store.doc.order) {
    const o = objs[id];
    if (!o || o.locked) continue;
    const ob = worldBounds(o);
    if (!boxesIntersect(box, ob)) continue;
    const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(2, radius / 2)));
    for (let i = 0; i <= steps; i++) {
      const p = { x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps };
      if (hitObject(o, p, radius)) { hits.push(o); break; }
    }
  }
  return hits;
}

export function normalizeBox(b) {
  return { x: b.w < 0 ? b.x + b.w : b.x, y: b.h < 0 ? b.y + b.h : b.y, w: Math.abs(b.w), h: Math.abs(b.h) };
}