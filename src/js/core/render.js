// Canvas painting: backgrounds, every object type, and the selection chrome.

import { boundsOf, worldBounds, WINDOW_HEADER_H } from './store.js';
import { pageRects as worldPageRects } from './pages.js';
import { hexToRgba, readableText, wrapText, fitFontSize, clamp, bboxOfPoints } from './util.js';
import { inkPath, inkRuns, strokeWeight, hasPressureVariation } from './ink.js';
import { objectRuns, layoutRich, fitRichSize, drawRichLines, needsRich, watchChips } from './richtext.js';
import { mathEntry, hasMaths } from './maths.js';
import { drawArrowhead, drawConnector } from './connectors.js';
import { lookupBoard, refLabel, refMissing } from './boardrefs.js';
import { isMarkdown, buildMarkdownSvgDataUri } from './markdown.js';

import { fontStack } from '../ui/palettes.js';
import { t, currentLanguage, direction } from '../i18n.js';

export const FONT = fontStack('ui');
export const HAND_FONT = fontStack('hand');

/** Resolve an object's font id to a CSS stack. */
export const faceOf = (id) => fontStack(id || 'ui');

/* ---------- image cache ---------- */
const imgCache = new Map();
export function getImage(src, onload) {
  if (!src) return null;
  let rec = imgCache.get(src);
  if (!rec) {
    const img = new Image();
    rec = { img, ready: false };
    imgCache.set(src, rec);
    img.onload = () => { rec.ready = true; onload && onload(); };
    img.onerror = () => { rec.error = true; };
    img.src = src;
  }
  return rec.ready ? rec.img : null;
}

/* ---------- Markdown SVG <foreignObject> cache ---------- */
const mdSvgCache = new Map();
const MAX_MD_CACHE = 250;

function resolveWikilinkForRender(target, anchor, alias) {
  const page = anchor && /^\d+$/.test(anchor) ? Number(anchor) : 0;
  const b = lookupBoard({ name: target });
  const label = alias || refLabel({ id: b?.id, name: target, page });
  return {
    id: b?.id || '',
    href: `b:${b?.id || target}${anchor ? '#' + anchor : ''}`,
    label
  };
}

/**
 * Draws the toggleable Obsidian Card Window container around a Markdown text object.
 * Supports 4 models: 'canvas' | 'window' | 'minimal' | 'transparent'.
 */
export function drawMarkdownCardContainer(ctx, o, isDark = darkBoard) {
  const style = o.cardStyle || (o.background && o.background !== 'none' ? 'canvas' : 'canvas');
  if (style === 'transparent') {
    if (o.background && o.background !== 'none') {
      ctx.save();
      ctx.fillStyle = o.background;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(o.x - 4, o.y - 4, o.w + 8, o.h + 8, 4);
      else ctx.rect(o.x - 4, o.y - 4, o.w + 8, o.h + 8);
      ctx.fill();
      ctx.restore();
    }
    return;
  }

  const pad = 12;
  const x = o.x - pad;
  const y = o.y - pad;
  const w = o.w + pad * 2;
  const h = (style === 'window' && o.collapsed ? WINDOW_HEADER_H : o.h) + pad * 2;
  const r = 10;

  ctx.save();

  // 1. Background fill
  ctx.fillStyle = o.background && o.background !== 'none'
    ? o.background
    : (isDark ? '#23252a' : '#ffffff');

  // 2. Card Shadow (for 'canvas' and 'window' styles)
  if (style === 'canvas' || style === 'window') {
    ctx.shadowColor = isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
  }

  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // 3. Border stroke
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  ctx.stroke();

  // 4. Style-specific Header / Badge decorations
  if (style === 'window') {
    const headerH = WINDOW_HEADER_H;
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, headerH, o.collapsed ? r : [r, r, 0, 0]);
    else ctx.rect(x, y, w, headerH);
    ctx.fill();

    if (!o.collapsed) {
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
      ctx.beginPath();
      ctx.moveTo(x, y + headerH);
      ctx.lineTo(x + w, y + headerH);
      ctx.stroke();
    }

    ctx.font = `600 11px ${FONT}`;
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.72)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const rawFirst = o.title || (o.text ? o.text.split('\n')[0].replace(/^#+\s*/, '').trim() : '');
    const titleText = (rawFirst || t('Markdown')).slice(0, 28);
    ctx.fillText(titleText, x + 12, y + headerH / 2);

    ctx.textAlign = 'right';
    ctx.fillText(o.collapsed ? '▼' : '▲', x + w - 12, y + headerH / 2);
  } else if (style === 'canvas') {
    const pillW = 28, pillH = 14;
    const px = x + w - pillW - 8;
    const py = y + 6;
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,120,212,0.1)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, pillW, pillH, 4);
    else ctx.rect(px, py, pillW, pillH);
    ctx.fill();

    ctx.font = `600 9px ${FONT}`;
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,120,212,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MD', px + pillW / 2, py + pillH / 2);
  }

  ctx.restore();
}

/**
 * Renders an Obsidian/GFM Markdown block onto the Canvas2D context using an
 * off-screen SVG <foreignObject> image cache for vector sharpness at any zoom.
 */
export function drawMarkdownBlock(ctx, o, hideText = false, onload = null, boxOverride = null) {
  if (hideText || !o || !o.text) return;
  const isWindow = o.type === 'text' && o.cardStyle === 'window';
  if (isWindow && o.collapsed) return;

  const headerOffset = isWindow ? WINDOW_HEADER_H - 6 : 0;
  const x = boxOverride ? boxOverride.x : o.x;
  const y = (boxOverride ? boxOverride.y : o.y) + headerOffset;
  const w = Math.max(24, boxOverride ? boxOverride.w : (o.w || 200));
  const h = Math.max(20, (boxOverride ? boxOverride.h : (o.h || 80)) - headerOffset);

  const isNote = o.type === 'note';
  const color = isNote
    ? (o.textColor || readableText(o.color || '#ffd94a'))
    : inkPaint(o.color);
  const fontSize = o.fontSize || (isNote ? Math.min(24, noteTypeRange(o).max) : 24);
  const fontFamily = faceOf(o.font);
  const align = o.align || 'left';

  const key = `${o.text}\u0000${Math.round(w)}\u0000${Math.round(h)}\u0000${color}\u0000${fontSize}\u0000${fontFamily}\u0000${align}`;
  let entry = mdSvgCache.get(key);

  if (!entry && typeof Image !== 'undefined') {
    if (mdSvgCache.size >= MAX_MD_CACHE) {
      const oldestKey = mdSvgCache.keys().next().value;
      mdSvgCache.delete(oldestKey);
    }
    const uri = buildMarkdownSvgDataUri(o.text, {
      width: w,
      height: h,
      color,
      fontSize,
      fontFamily,
      align,
      resolveWikilink: resolveWikilinkForRender
    });
    const img = new Image();
    entry = { img, ready: false, error: false };
    mdSvgCache.set(key, entry);
    img.onload = () => {
      entry.ready = true;
      if (onload) onload();
    };
    img.onerror = () => {
      entry.error = true;
    };
    img.src = uri;
  }

  if (entry && entry.ready && entry.img) {
    ctx.drawImage(entry.img, x, y, w, h);
    return;
  }

  drawTextBlock(ctx, o.text, x, y, w, h, {
    runs: objectRuns(o),
    paint: isNote ? undefined : (c) => inkPaint(c),
    ownInk: isNote,
    color,
    size: fontSize,
    align,
    valign: isNote ? 'middle' : (o.valign || 'top'),
    family: fontFamily,
    weight: o.bold ? '600' : '400',
    italic: o.italic,
    underline: o.underline,
    onload
  });
}

/* =================================================================== *
 *  Backgrounds
 * =================================================================== */
export function pageRects(pages, cam) {
  return worldPageRects(pages).map((r) => ({
    x: r.x * cam.z + cam.x, y: r.y * cam.z + cam.y, w: r.w * cam.z, h: r.h * cam.z
  }));
}

export function pageRect(pages, cam) {
  return pageRects(pages, cam)[0] || null;
}

const lineFrom = (origin, step, from) => origin + Math.ceil((from - origin) / step) * step;

export const PATTERN_SPACINGS = [19, 28, 40, 56];

export const NOTEBOOK = { line: '#8db6e2', margin: '#e0707f', date: '#8a8886', marginMm: 25, headMm: 22, dateMm: 3.8, edgeMm: 15 };
const MM = 96 / 25.4;

export function notebookLayout(sheet, base, z, rtl = false) {
  const head = Math.max(3 * base, NOTEBOOK.headMm * MM) * z;
  const top = sheet.y + head;
  const marginX = sheet.x + NOTEBOOK.marginMm * MM * z;
  const fontPx = NOTEBOOK.dateMm * MM * z;
  const baseline = top - Math.max(0.3 * base, 2.5 * MM) * z;
  const dateX = rtl ? marginX + 5 * MM * z : sheet.x + sheet.w - NOTEBOOK.edgeMm * MM * z;
  return { top, marginX, fontPx, baseline, dateX, align: rtl ? 'left' : 'right' };
}

const LOCALE_FOR = { en: null, bn: 'bn-BD', ar: 'ar-u-nu-arab', 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW', es: 'es', 'pt-BR': 'pt-BR' };
const dateFormats = new Map();

export function formatPageDate(iso, lang = currentLanguage()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  let loc = LOCALE_FOR[lang];
  if (loc === undefined) loc = lang;
  if (loc === null) {
    const sys = (typeof navigator !== 'undefined' && navigator.language) || 'en';
    loc = /^en\b/i.test(sys) ? sys : 'en';
  }
  let f = dateFormats.get(loc);
  if (!f) {
    try { f = new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); }
    catch { f = new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); }
    dateFormats.set(loc, f);
  }
  return f.format(new Date(+m[1], +m[2] - 1, +m[3], 12));
}

function drawNotebook(ctx, bg, cam, base, step, anchor, bounds, page, x0, y0, x1, y1) {
  const z = cam.z;
  ctx.strokeStyle = NOTEBOOK.line;
  ctx.globalAlpha = 0.9;
  if (!anchor) {
    const oy = ((cam.y % step) + step) % step;
    ctx.beginPath();
    for (let y = lineFrom(oy, step, y0); y < y1; y += step) { ctx.moveTo(x0, Math.round(y) + 0.5); ctx.lineTo(x1, Math.round(y) + 0.5); }
    ctx.stroke();
    return;
  }
  const rtl = direction() === 'rtl';
  const L = notebookLayout(bounds || { x: anchor.x, y: anchor.y, w: x1 - anchor.x, h: y1 - anchor.y }, base, z, rtl);
  ctx.beginPath();
  for (let y = lineFrom(L.top, step, Math.max(y0, L.top)); y < y1; y += step) { ctx.moveTo(x0, Math.round(y) + 0.5); ctx.lineTo(x1, Math.round(y) + 0.5); }
  ctx.stroke();

  ctx.strokeStyle = NOTEBOOK.margin;
  ctx.lineWidth = clamp(0.3 * MM * z, 1, 2.5);
  ctx.beginPath();
  ctx.moveTo(L.marginX, y0); ctx.lineTo(L.marginX, y1);
  ctx.stroke();

  if (bg.pageDate === false || !page?.date || L.fontPx < 6) return;
  const text = formatPageDate(page.date);
  if (!text) return;
  ctx.globalAlpha = 1;
  ctx.fillStyle = NOTEBOOK.date;
  ctx.font = `${L.fontPx.toFixed(2)}px ${FONT}`;
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = L.align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, L.dateX, L.baseline);
}

function drawPattern(ctx, bg, cam, w, h, anchor, bounds, page, exact = false) {
  const pattern = bg.pattern || 'none';
  if (pattern === 'none') return;

  const base = PATTERN_SPACINGS.includes(bg.spacing) ? bg.spacing : 40;
  let step = base * cam.z;
  if (anchor || exact) {
    while (step < 6) step *= 2;
  } else {
    while (step < 14) step *= 2;
    while (step > 120) step /= 2;
  }
  const ax = anchor ? anchor.x : cam.x;
  const ay = anchor ? anchor.y : cam.y;
  const ox = ((ax % step) + step) % step;
  const oy = ((ay % step) + step) % step;
  const color = bg.patternColor || '#c8c6c4';

  const x0 = bounds ? Math.max(0, bounds.x) : 0;
  const y0 = bounds ? Math.max(0, bounds.y) : 0;
  const x1 = bounds ? Math.min(w, bounds.x + bounds.w) : w;
  const y1 = bounds ? Math.min(h, bounds.y + bounds.h) : h;
  if (x1 <= x0 || y1 <= y0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;

  if (pattern === 'notebook') {
    drawNotebook(ctx, bg, cam, base, step, anchor, bounds, page, x0, y0, x1, y1);
  } else if (pattern === 'grid' || pattern === 'lines' || pattern === 'columns') {
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    if (pattern !== 'lines') for (let x = lineFrom(ox, step, x0); x < x1; x += step) { ctx.moveTo(Math.round(x) + 0.5, y0); ctx.lineTo(Math.round(x) + 0.5, y1); }
    if (pattern !== 'columns') for (let y = lineFrom(oy, step, y0); y < y1; y += step) { ctx.moveTo(x0, Math.round(y) + 0.5); ctx.lineTo(x1, Math.round(y) + 0.5); }
    ctx.stroke();
  } else if (pattern === 'dots') {
    ctx.globalAlpha = 0.8;
    const r = clamp(step / 22, 0.8, 2.4);
    for (let x = lineFrom(ox, step, x0); x < x1; x += step) for (let y = lineFrom(oy, step, y0); y < y1; y += step) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  } else if (pattern === 'graph') {
    ctx.globalAlpha = 0.3;
    const small = step / 4;
    const sox = ((ax % small) + small) % small, soy = ((ay % small) + small) % small;
    ctx.beginPath();
    for (let x = lineFrom(sox, small, x0); x < x1; x += small) { ctx.moveTo(Math.round(x) + 0.5, y0); ctx.lineTo(Math.round(x) + 0.5, y1); }
    for (let y = lineFrom(soy, small, y0); y < y1; y += small) { ctx.moveTo(x0, Math.round(y) + 0.5); ctx.lineTo(x1, Math.round(y) + 0.5); }
    ctx.stroke();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (let x = lineFrom(ox, step, x0); x < x1; x += step) { ctx.moveTo(Math.round(x) + 0.5, y0); ctx.lineTo(Math.round(x) + 0.5, y1); }
    for (let y = lineFrom(oy, step, y0); y < y1; y += step) { ctx.moveTo(x0, Math.round(y) + 0.5); ctx.lineTo(x1, Math.round(y) + 0.5); }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBackground(ctx, bg, cam, w, h, pages = null) {
  ctx.save();

  const sheets = pages && pages.length ? pageRects(pages, cam) : [];
  if (!sheets.length) {
    ctx.fillStyle = boardPaint(bg.color);
    ctx.fillRect(0, 0, w, h);
    drawPattern(ctx, bg, cam, w, h, null);
    ctx.restore();
    return;
  }

  ctx.fillStyle = shadeOf(boardPaint(bg.color));
  ctx.fillRect(0, 0, w, h);

  sheets.forEach((sheet, i) => {
    if (sheet.x > w || sheet.y > h || sheet.x + sheet.w < 0 || sheet.y + sheet.h < 0) return;
    const pg = pages[i] || {};
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.20)';
    ctx.shadowBlur = Math.min(26, 10 + cam.z * 8);
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = pg.bg ? boardPaint(pg.bg) : boardPaint(bg.color);
    ctx.fillRect(sheet.x, sheet.y, sheet.w, sheet.h);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(sheet.x, sheet.y, sheet.w, sheet.h);
    ctx.clip();
    drawPattern(ctx, bg, cam, w, h, { x: sheet.x, y: sheet.y }, sheet, pg);

    // Draw custom page margin guides if defined on the page
    if (pg.margins) {
      const m = pg.margins;
      const mx = sheet.x + (m.left || 0) * cam.z;
      const my = sheet.y + (m.top || 0) * cam.z;
      const mw = Math.max(0, sheet.w - ((m.left || 0) + (m.right || 0)) * cam.z);
      const mh = Math.max(0, sheet.h - ((m.top || 0) + (m.bottom || 0)) * cam.z);
      if (mw > 0 && mh > 0) {
        ctx.strokeStyle = 'rgba(0, 120, 212, 0.28)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(mx + 0.5, my + 0.5, mw, mh);
        ctx.setLineDash([]);
      }
    }
    ctx.restore();

    strokePageEdge(ctx, sheet);
  });
  ctx.restore();
}

export function drawRuling(ctx, bg, cam, w, h, pages = null) {
  if (!bg || !bg.pattern || bg.pattern === 'none') return;
  ctx.save();
  const sheets = pages && pages.length ? pageRects(pages, cam) : [];
  if (!sheets.length) drawPattern(ctx, bg, cam, w, h, null, null, null, true);
  else sheets.forEach((sheet, i) => {
    if (sheet.x > w || sheet.y > h || sheet.x + sheet.w < 0 || sheet.y + sheet.h < 0) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(sheet.x, sheet.y, sheet.w, sheet.h); ctx.clip();
    drawPattern(ctx, bg, cam, w, h, { x: sheet.x, y: sheet.y }, sheet, pages[i]);
    ctx.restore();
  });
  ctx.restore();
}

/* =================================================================== *
 *  Light and dark
 * =================================================================== */

const DEFAULT_INK = '#201f1e';
const DARK_INK = '#f3f2f1';
const DARK_BOARD = '#1f1e1d';

let darkBoard = false;

export function setDarkBoard(on) { darkBoard = !!on; }
export function isDarkBoard() { return darkBoard; }

export function inkPaint(color, fallback = DEFAULT_INK) {
  const c = color || fallback;
  if (!darkBoard) return c;
  return String(c).toLowerCase() === DEFAULT_INK ? DARK_INK : c;
}

export function boardPaint(color) {
  const c = color || '#ffffff';
  if (!darkBoard) return c;
  return String(c).toLowerCase() === '#ffffff' ? DARK_BOARD : c;
}

/* =================================================================== *
 *  Ink
 * =================================================================== */
function inkStyle(ctx, o) {
  if (!o.effect || o.effect === 'none') return inkPaint(o.color);
  const pts = o.points;
  const a = pts[0], b = pts[pts.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const g = len < 1
    ? ctx.createLinearGradient(a.x - 20, a.y, a.x + 20, a.y)
    : ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  const hue = o.hue || 0;
  const stops = 12;
  for (let i = 0; i <= stops; i++) {
    const t = i / stops;
    g.addColorStop(t,
      o.effect === 'rainbow'
        ? `hsl(${(hue + t * 320) % 360} 88% 54%)`
        : `hsl(${250 + Math.sin(t * Math.PI * 2 + hue) * 55} 72% ${38 + Math.sin(t * 6) * 9}%)`);
  }
  return g;
}

export function drawStroke(ctx, o) {
  const pts = o.points;
  if (!pts || !pts.length) return;
  const path = inkPath(o);
  if (!path) return;
  const highlighter = o.tool === 'highlighter';

  ctx.save();
  if (highlighter) {
    ctx.globalAlpha = o.opacity ?? 0.5;
    ctx.globalCompositeOperation = (o.colorPop !== false) ? 'multiply' : 'source-over';
  } else if (o.opacity != null && o.opacity < 1) {
    ctx.globalAlpha = o.opacity;
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = inkStyle(ctx, o);

  const varying = !highlighter && o.pressure !== false && hasPressureVariation(pts);
  if (varying) {
    let scale = 1;
    try {
      const m = ctx.getTransform();
      scale = Math.hypot(m.a, m.b) || 1;
    } catch { scale = 1; }
    const runs = inkRuns(o, scale);
    for (const r of runs) { ctx.lineWidth = r.width; ctx.stroke(r.path); }
  } else {
    ctx.lineWidth = highlighter ? (o.width || 20) : strokeWeight(pts, o.width || 4, o.pressure !== false);
    ctx.stroke(path);
  }

  if (o.effect === 'galaxy') {
    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.lineWidth = Math.max(1, (o.width || 4) * 0.22);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.setLineDash([1, (o.width || 4) * 1.6]);
    ctx.stroke(path);
    ctx.restore();
  }
  ctx.restore();
}

/* =================================================================== *
 *  Shapes
 * =================================================================== */
export function shapePath(ctx, kind, x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
  ctx.beginPath();
  switch (kind) {
    case 'rect': ctx.rect(x, y, w, h); break;
    case 'roundRect': {
      const r = Math.min(Math.abs(w), Math.abs(h)) * 0.16;
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
      break;
    }
    case 'ellipse': ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2); break;
    case 'circle': { const r = Math.min(Math.abs(rx), Math.abs(ry)); ctx.arc(cx, cy, r, 0, Math.PI * 2); break; }
    case 'triangle': ctx.moveTo(cx, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); break;
    case 'rightTriangle': ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.closePath(); break;
    case 'diamond': ctx.moveTo(cx, y); ctx.lineTo(x + w, cy); ctx.lineTo(cx, y + h); ctx.lineTo(x, cy); ctx.closePath(); break;
    case 'pentagon': polygon(ctx, cx, cy, rx, ry, 5, -Math.PI / 2); break;
    case 'hexagon': polygon(ctx, cx, cy, rx, ry, 6, 0); break;
    case 'octagon': polygon(ctx, cx, cy, rx, ry, 8, Math.PI / 8); break;
    case 'star': {
      const n = 5;
      for (let i = 0; i < n * 2; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / n;
        const f = i % 2 ? 0.42 : 1;
        const px = cx + Math.cos(ang) * rx * f, py = cy + Math.sin(ang) * ry * f;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'cloud': cloud(ctx, x, y, w, h); break;
    case 'line': ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); break;
    case 'arrow': case 'doubleArrow': {
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
      break;
    }
    default: ctx.rect(x, y, w, h);
  }
}

function cloud(ctx, x, y, w, h) {
  const aw = Math.abs(w), ah = Math.abs(h);
  if (aw < 1 || ah < 1) return;
  const ox = w < 0 ? x + w : x, oy = h < 0 ? y + h : y;
  const cx = ox + aw / 2, cy = oy + ah / 2;
  const SPEC = [
    [0.20, 0.58, 1.15], [0.35, 0.36, 1.30], [0.58, 0.32, 1.35], [0.78, 0.50, 1.20],
    [0.84, 0.70, 0.92], [0.62, 0.78, 1.00], [0.38, 0.80, 0.98], [0.16, 0.72, 0.90]
  ];
  const n = SPEC.length;
  const c = SPEC.map(([fx, fy]) => ({ x: ox + aw * fx, y: oy + ah * fy, r: 0 }));
  for (let i = 0; i < n; i++) {
    const p = c[(i - 1 + n) % n], q = c[(i + 1) % n];
    const gap = (Math.hypot(c[i].x - p.x, c[i].y - p.y) + Math.hypot(c[i].x - q.x, c[i].y - q.y)) / 2;
    c[i].r = gap * 0.66 * SPEC[i][2];
  }
  const seam = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (!d || d >= a.r + b.r || d <= Math.abs(a.r - b.r)) return null;
    const t = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
    const k = Math.sqrt(Math.max(0, a.r * a.r - t * t));
    const mx = a.x + (dx * t) / d, my = a.y + (dy * t) / d;
    const p1 = { x: mx + (k * dy) / d, y: my - (k * dx) / d };
    const p2 = { x: mx - (k * dy) / d, y: my + (k * dx) / d };
    return Math.hypot(p1.x - cx, p1.y - cy) > Math.hypot(p2.x - cx, p2.y - cy) ? p1 : p2;
  };
  const seams = [];
  for (let i = 0; i < n; i++) seams.push(seam(c[i], c[(i + 1) % n]));
  let open = false;
  for (let i = 0; i < n; i++) {
    const back = seams[(i - 1 + n) % n], fwd = seams[i], b = c[i];
    if (!back || !fwd) {
      ctx.moveTo(b.x + b.r, b.y);
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      open = false;
      continue;
    }
    if (!open) { ctx.moveTo(back.x, back.y); open = true; }
    ctx.arc(b.x, b.y, b.r, Math.atan2(back.y - b.y, back.x - b.x), Math.atan2(fwd.y - b.y, fwd.x - b.x));
  }
  if (open) ctx.closePath();
}

function polygon(ctx, cx, cy, rx, ry, n, rot) {
  for (let i = 0; i < n; i++) {
    const a = rot + (i * Math.PI * 2) / n;
    const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

export function drawShape(ctx, o, hideText = false) {
  const { x, y, w, h } = o;
  ctx.save();
  if (o.fill && o.fill !== 'none') {
    ctx.fillStyle = o.fill;
    shapePath(ctx, o.kind, x, y, w, h);
    ctx.fill(o.kind === 'cloud' ? 'nonzero' : 'nonzero');
  }
  if (o.stroke && o.stroke !== 'none') {
    const outline = inkPaint(o.stroke);
    ctx.strokeStyle = outline;
    ctx.lineWidth = o.lineWidth || 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash === 'dot' ? [1, ctx.lineWidth * 2.2] : [ctx.lineWidth * 3, ctx.lineWidth * 2.2]);
    shapePath(ctx, o.kind, x, y, w, h);
    ctx.stroke();
    ctx.setLineDash([]);
    if (o.kind === 'arrow' || o.kind === 'doubleArrow') {
      const scale = o.arrowScale || 1.0;
      const size = (o.lineWidth || 3) * 3.6 * scale;
      ctx.fillStyle = outline;
      ctx.strokeStyle = outline;
      drawArrowhead(ctx, { x, y }, { x: x + w, y: y + h }, size, o.headStyle || 'filled');
      if (o.kind === 'doubleArrow') drawArrowhead(ctx, { x: x + w, y: y + h }, { x, y }, size, o.headStyle || 'filled');
    }
  }
  if (o.text && !hideText) {
    const pad = 10;
    const papered = !!o.fill && o.fill !== 'none';
    drawTextBlock(ctx, o.text, x + pad, y + pad, w - pad * 2, h - pad * 2, {
      runs: objectRuns(o), paint: papered ? (c) => c || '#201f1e' : (c) => inkPaint(c), ownInk: papered,
      color: papered ? (o.textColor || '#201f1e') : inkPaint(o.textColor), size: o.fontSize || 0, align: 'center', valign: 'middle',
      family: faceOf(o.font), weight: o.bold ? '600' : '400', italic: o.italic
    });
  }
  ctx.restore();
}

/* =================================================================== *
 *  Text blocks (shared by text boxes, notes, shapes, tables)
 * =================================================================== */
export function drawTextBlock(ctx, text, x, y, w, h, opt = {}) {
  if (!text) return;
  const family = opt.family || FONT;
  const weight = opt.weight || '400';
  const runs = opt.runs || (needsRich(text) ? [{ t: text }] : null);
  if (runs) {
    const base = { family, weight: '400', bold: weight === '600', italic: !!opt.italic, underline: !!opt.underline, color: opt.color, size: opt.size,
      onload: opt.onload, lineHeight: opt.lineHeight };
    if (!base.size) base.size = fitRichSize(ctx, runs, w, h, base, opt.maxSize || 72, opt.minSize || 10);
    const lines = layoutRich(ctx, runs, w, base);
    drawRichLines(ctx, lines, x, y, w, h, base, { align: opt.align, valign: opt.valign, lineHeight: opt.lineHeight,
      paint: opt.paint || (opt.runs || opt.ownInk ? undefined : (c) => inkPaint(c)), onload: opt.onload, paper: !!opt.ownInk });
    return;
  }
  const italic = opt.italic ? 'italic ' : '';
  let size = opt.size;
  if (!size) size = fitFontSize(ctx, text, w, h, family, weight, opt.maxSize || 72, opt.minSize || 10);
  ctx.save();
  ctx.font = `${italic}${weight} ${size}px ${family}`;
  ctx.fillStyle = opt.ownInk ? (opt.color || '#201f1e') : inkPaint(opt.color);
  ctx.textBaseline = 'top';
  const lines = wrapText(ctx, text, w);
  const lh = size * (opt.lineHeight || 1.28);
  const total = lines.length * lh;
  let ty = y;
  if (opt.valign === 'middle') ty = y + (h - total) / 2;
  else if (opt.valign === 'bottom') ty = y + h - total;
  const align = opt.align || 'left';
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  const tx = align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
  for (const line of lines) {
    if (ty > y + h + lh) break;
    ctx.fillText(line, tx, ty);
    if (opt.underline) {
      const m = ctx.measureText(line);
      const lw = m.width;
      const lx = align === 'center' ? tx - lw / 2 : align === 'right' ? tx - lw : tx;
      ctx.fillRect(lx, ty + size * 1.05, lw, Math.max(1, size / 16));
    }
    ty += lh;
  }
  ctx.restore();
}

/* =================================================================== *
 *  Notes / text / images / tables
 * =================================================================== */
export function noteTypeRange(o) {
  const w = Math.max(40, o.w || 200);
  return { max: Math.max(12, w * (46 / 200)), min: Math.max(6, w * (10 / 200)) };
}

export function drawNote(ctx, o, hideText = false, onload = null) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = o.color || '#ffd94a';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(o.x, o.y, o.w, o.h, 4); else ctx.rect(o.x, o.y, o.w, o.h);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  const g = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
  g.addColorStop(0, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(0,0,0,0.05)');
  ctx.fillStyle = g;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(o.x, o.y, o.w, o.h, 4); else ctx.rect(o.x, o.y, o.w, o.h);
  ctx.fill();

  const pad = Math.max(10, o.w * 0.08);
  if (o.markdown !== false && !o.runs && isMarkdown(o.text)) {
    drawMarkdownBlock(ctx, o, hideText, onload, {
      x: o.x + pad,
      y: o.y + pad,
      w: o.w - pad * 2,
      h: o.h - pad * 2
    });
    ctx.restore();
    return;
  }

  const type = noteTypeRange(o);
  drawTextBlock(ctx, hideText ? '' : o.text, o.x + pad, o.y + pad, o.w - pad * 2, o.h - pad * 2, {
    runs: objectRuns(o),
    color: o.textColor || readableText(o.color || '#ffd94a'), ownInk: true,
    size: o.fontSize || 0, maxSize: type.max, minSize: type.min,
    align: o.align || 'center', valign: 'middle',
    family: faceOf(o.font),
    weight: o.bold ? '600' : '400', italic: o.italic, underline: o.underline,
    onload
  });
  ctx.restore();
}

export function drawText(ctx, o, hideText = false, onload = null) {
  if (o.markdown !== false) {
    drawMarkdownCardContainer(ctx, o, darkBoard);
    if (o.cardStyle === 'window' && o.collapsed) return;
  } else if (o.background && o.background !== 'none') {
    ctx.save();
    ctx.fillStyle = o.background;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(o.x - 4, o.y - 4, o.w + 8, o.h + 8, 4); else ctx.rect(o.x - 4, o.y - 4, o.w + 8, o.h + 8);
    ctx.fill();
    ctx.restore();
  }

  if (o.markdown !== false && !o.runs && isMarkdown(o.text)) {
    drawMarkdownBlock(ctx, o, hideText, onload);
    return;
  }

  const isWindow = o.markdown !== false && o.cardStyle === 'window';
  const yOff = isWindow ? WINDOW_HEADER_H - 6 : 0;
  drawTextBlock(ctx, hideText ? '' : o.text, o.x, o.y + yOff, o.w, Math.max(10, o.h - yOff), {
    runs: objectRuns(o), paint: (c) => inkPaint(c),
    color: inkPaint(o.color), size: o.fontSize || 24,
    align: o.align || 'left', valign: o.valign || 'top',
    family: faceOf(o.font),
    weight: o.bold ? '600' : '400', italic: o.italic, underline: o.underline,
    onload
  });
}

const EMOJI_FONT = '"GazBoard Emoji","Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla","EmojiOne Color",sans-serif';
const EMOJI_BASE = 100;
const emojiInk = new Map();
let emojiRuler = null;

export function emojiInkSize(ch) {
  const key = ch || '';
  const hit = emojiInk.get(key);
  if (hit) return hit;
  let out = { w: EMOJI_BASE, h: EMOJI_BASE };
  try {
    if (!emojiRuler && typeof document !== 'undefined') {
      emojiRuler = document.createElement('canvas').getContext('2d');
    }
    if (emojiRuler) {
      emojiRuler.font = `${EMOJI_BASE}px ${EMOJI_FONT}`;
      emojiRuler.textAlign = 'center';
      emojiRuler.textBaseline = 'alphabetic';
      const m = emojiRuler.measureText(key);
      const left = m.actualBoundingBoxLeft, right = m.actualBoundingBoxRight;
      const w = (left != null && right != null) ? left + right : m.width;
      const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
      const h = (asc != null && desc != null) ? asc + desc : EMOJI_BASE;
      if (w > 1 && h > 1) out = { w, h, asc, desc };
    }
  } catch { /* no canvas, no measurement, square it is */ }
  emojiInk.set(key, out);
  return out;
}

export function forgetEmojiMetrics() {
  emojiInk.clear();
  emojiRuler = null;
}

export function emojiAspect(ch) {
  const { w, h } = emojiInkSize(ch);
  return w / h;
}

export function drawEmoji(ctx, o) {
  const ch = o.ch || '\u{1F642}';
  const aw = Math.abs(o.w), ah = Math.abs(o.h);
  if (aw < 1 || ah < 1) return;
  const x = o.w < 0 ? o.x + o.w : o.x, y = o.h < 0 ? o.y + o.h : o.y;
  const ink = emojiInkSize(ch);
  const asc = ink.asc ?? EMOJI_BASE * 0.78;
  const desc = ink.desc ?? EMOJI_BASE * 0.08;
  const k = Math.min(aw / ink.w, ah / ink.h);
  ctx.save();
  ctx.font = `${EMOJI_BASE}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.translate(x + aw / 2, y + ah / 2);
  ctx.scale(k, k);
  ctx.fillText(ch, 0, (asc - desc) / 2);
  ctx.restore();
}

export function drawMath(ctx, o, onload) {
  const aw = Math.abs(o.w), ah = Math.abs(o.h);
  if (aw < 1 || ah < 1) return;
  const x = o.w < 0 ? o.x + o.w : o.x, y = o.h < 0 ? o.y + o.h : o.y;
  const e = mathEntry(o.tex, inkPaint(o.color), onload);
  if (e.status === 'ready' && e.img) {
    const k = Math.min(aw / e.w, ah / e.h);
    const dw = e.w * k, dh = e.h * k;
    ctx.drawImage(e.img, x + (aw - dw) / 2, y + (ah - dh) / 2, dw, dh);
    return;
  }
  ctx.save();
  ctx.strokeStyle = 'rgba(128,128,128,.45)';
  ctx.lineWidth = Math.max(1, Math.min(aw, ah) / 80);
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, aw, ah);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(128,128,128,.8)';
  const size = Math.max(6, Math.min(ah * 0.4, aw / Math.max(4, String(o.tex || '').length * 0.6)));
  ctx.font = `${size}px ui-monospace, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(o.tex || ''), x + aw / 2, y + ah / 2, aw);
  ctx.restore();
}

export function clampImageCrop(crop, iw, ih) {
  const norm = crop.sx <= 1 && crop.sy <= 1 && crop.sw <= 1 && crop.sh <= 1;
  let sx = norm ? crop.sx * iw : crop.sx;
  let sy = norm ? crop.sy * ih : crop.sy;
  let sw = norm ? crop.sw * iw : crop.sw;
  let sh = norm ? crop.sh * ih : crop.sh;
  sx = Math.max(0, Math.min(iw - 1, sx));
  sy = Math.max(0, Math.min(ih - 1, sy));
  sw = Math.max(1, Math.min(iw - sx, sw));
  sh = Math.max(1, Math.min(ih - sy, sh));
  return { sx, sy, sw, sh };
}

export function drawImage(ctx, o, onload) {
  const img = getImage(o.src, onload);
  ctx.save();
  if (o.kind === 'page') {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.shadowColor = 'transparent';
  }
  if (img) {
    if (o.crop && typeof o.crop.sw === 'number' && typeof o.crop.sh === 'number') {
      const iw = img.naturalWidth || img.width || o.w;
      const ih = img.naturalHeight || img.height || o.h;
      const { sx, sy, sw, sh } = clampImageCrop(o.crop, iw, ih);
      ctx.drawImage(img, sx, sy, sw, sh, o.x, o.y, o.w, o.h);
    } else {
      ctx.drawImage(img, o.x, o.y, o.w, o.h);
    }
  } else if (o.missing) {
    ctx.fillStyle = '#faf9f8';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = '#c8c6c4';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
    ctx.setLineDash([]);
    ctx.fillStyle = '#a19f9d';
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(t('Picture not found'), o.x + o.w / 2, o.y + o.h / 2);
  } else {
    ctx.fillStyle = '#edebe9';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#a19f9d';
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(t('Loading…'), o.x + o.w / 2, o.y + o.h / 2);
  }
  if (o.kind === 'page') {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
    if (o.label) {
      ctx.fillStyle = '#605e5c';
      ctx.font = `${Math.max(11, o.w * 0.022)}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(o.label, o.x, o.y - 8);
    }
  }
  ctx.restore();
}

export function drawTable(ctx, o, hideCell = null) {
  const cols = o.cols || 3, rows = o.rows || 3;
  const cw = o.w / cols, ch = o.h / rows;
  ctx.save();
  ctx.fillStyle = o.fill || '#ffffff';
  ctx.fillRect(o.x, o.y, o.w, o.h);
  if (o.headerRow) {
    ctx.fillStyle = o.headerColor || '#f3f2f1';
    ctx.fillRect(o.x, o.y, o.w, ch);
  }
  ctx.strokeStyle = o.stroke || '#605e5c';
  ctx.lineWidth = o.lineWidth || 2;
  ctx.beginPath();
  for (let c = 0; c <= cols; c++) { ctx.moveTo(o.x + c * cw, o.y); ctx.lineTo(o.x + c * cw, o.y + o.h); }
  for (let r = 0; r <= rows; r++) { ctx.moveTo(o.x, o.y + r * ch); ctx.lineTo(o.x + o.w, o.y + r * ch); }
  ctx.stroke();
  const cells = o.cells || {};
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const key = r + ',' + c;
    const t = cells[key];
    if (!t || key === hideCell) continue;
    drawTextBlock(ctx, t, o.x + c * cw + 6, o.y + r * ch + 6, cw - 12, ch - 12, {
      runs: objectRuns(o, key),
      color: o.textColor || '#201f1e', ownInk: true, size: o.fontSize || 0, maxSize: 26,
      align: 'center', valign: 'middle', family: FONT, weight: o.headerRow && r === 0 ? '600' : '400'
    });
  }
  ctx.restore();
}

/* =================================================================== *
 *  Answer covers
 * =================================================================== */
export const CURTAIN_COLOR = '#5b5fc7';
export const CURTAIN_LABEL = t('Tap to reveal');

export function drawCurtain(ctx, o) {
  if (Array.isArray(o.points) && o.points.length >= 2) {
    const pts = o.points;
    const w = o.width || 34;
    const tapeColor = o.color || '#a855f7';
    const neonOutline = o.neonColor || '#c084fc';

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (o.revealed) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.lineWidth = w;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.stroke();

      ctx.lineWidth = w + 2;
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.55)';
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineWidth = w;
    ctx.strokeStyle = tapeColor;
    ctx.stroke();

    const b = bboxOfPoints(pts);
    const pad = w / 2;
    const minX = b.x - pad, minY = b.y - pad, bw = b.w + pad * 2, bh = b.h + pad * 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineWidth = w - 1;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3.5;
    const gap = 12;
    ctx.beginPath();
    for (let d = -bh; d < bw; d += gap) {
      ctx.moveTo(minX + d, minY + bh);
      ctx.lineTo(minX + d + bh, minY);
    }
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineWidth = w + 1.5;
    ctx.strokeStyle = neonOutline;
    ctx.globalAlpha = 0.85;
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (o.revealed) {
    const { x, y, w, h } = o;
    const r = Math.min(Math.abs(w), Math.abs(h)) * 0.13;
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.035)';
    ctx.fill();
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = o.subtype === 'tape' ? 1.5 : 2;
    ctx.strokeStyle = o.color || '#a855f7';
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }

  const { x, y, w, h } = o;
  const aw = Math.abs(w), ah = Math.abs(h);
  const unit = Math.min(aw, ah);
  const r = unit * 0.13;
  const isTape = o.subtype === 'tape';
  const baseColor = o.color || (isTape ? '#a855f7' : CURTAIN_COLOR);

  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.fillStyle = baseColor;
  ctx.fill();
  ctx.clip();

  ctx.strokeStyle = isTape ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.09)';
  ctx.lineWidth = isTape ? Math.max(3, unit * 0.08) : unit * 0.09;
  const gap = isTape ? Math.max(8, unit * 0.2) : Math.max(1e-6, unit * 0.25);
  ctx.beginPath();
  for (let d = -ah; d < aw; d += gap) { ctx.moveTo(x + d, y + ah); ctx.lineTo(x + d + ah, y); }
  ctx.stroke();

  if (isTape) {
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#c084fc';
    ctx.stroke();
    ctx.restore();
    return;
  }

  const label = o.label ?? CURTAIN_LABEL;
  if (label) {
    const size = curtainLabelSize(ctx, o, label);
    ctx.font = `600 ${size}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }
  ctx.restore();
}

export function curtainLabelSize(ctx, o, label = o.label ?? CURTAIN_LABEL) {
  const aw = Math.abs(o.w), ah = Math.abs(o.h);
  let size = ah * 0.3;
  if (!label || !(size > 0)) return size;
  ctx.save();
  ctx.font = `600 ${size}px ${FONT}`;
  const wide = ctx.measureText(label).width;
  ctx.restore();
  if (wide > aw * 0.86) size *= (aw * 0.86) / wide;
  return size;
}

/* =================================================================== *
 *  Dispatch
 * =================================================================== */
export function drawObject(ctx, o, onload, editing = null) {
  if (o.hidden) return;
  const mine = !!editing && editing.id === o.id;
  const hideText = mine && !editing.cell;
  const hideCell = mine ? (editing.cell || null) : null;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  if (o.rotation) {
    const b = boundsOf(o);
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    ctx.rotate(o.rotation);
    ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
  }
  switch (o.type) {
    case 'stroke': drawStroke(ctx, o); break;
    case 'shape': drawShape(ctx, o, hideText); break;
    case 'note': drawNote(ctx, o, hideText, onload); break;
    case 'text': drawText(ctx, o, hideText, onload); break;
    case 'image': drawImage(ctx, o, onload); break;
    case 'emoji': drawEmoji(ctx, o); break;
    case 'math': drawMath(ctx, o, onload); break;
    case 'table': drawTable(ctx, o, hideCell); break;
    case 'curtain': drawCurtain(ctx, o); break;
    case 'connector': drawConnector(ctx, o, (c) => inkPaint(c)); break;
    case 'boardlink': drawBoardLink(ctx, o, onload); break;
    case 'audio': drawAudioCard(ctx, o); break;
  }
  ctx.restore();
}

/* =================================================================== *
 *  Links to other boards
 * =================================================================== */
export function drawBoardLink(ctx, o, onload) {
  const ref = o.board || {};
  const b = lookupBoard(ref);
  const missing = refMissing(ref);
  const dark = darkBoard;
  const { x, y, w, h } = o;
  const r = Math.min(12, w * 0.06, h * 0.06);
  const pad = Math.max(4, Math.min(w, h) * 0.04);
  const showThumb = o.showThumb !== false;
  const labelH = showThumb ? Math.max(18, Math.min(h * 0.24, 44)) : (h - pad * 2);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.16)';
  ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  ctx.fillStyle = dark ? '#2d2c2b' : '#ffffff';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = missing ? (dark ? '#605e5c' : '#a19f9d') : (dark ? '#4a6f94' : '#9cc3e8');
  if (missing) ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  if (showThumb) {
    const px = x + pad, py = y + pad, pw = Math.max(1, w - pad * 2), ph = Math.max(1, h - pad * 2 - labelH);
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, Math.max(2, r - pad / 2)); else ctx.rect(px, py, pw, ph);
    ctx.clip();
    ctx.fillStyle = missing ? (dark ? '#3b3a39' : '#edebe9') : '#f3f2f1';
    ctx.fillRect(px, py, pw, ph);
    const img = !missing && b && b.thumb ? getImage(b.thumb, onload) : null;
    if (img) {
      const k = Math.max(pw / img.width, ph / img.height);
      const dw = img.width * k, dh = img.height * k;
      ctx.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = missing ? (dark ? '#a19f9d' : '#8a8886') : '#a19f9d';
      const fs = Math.max(8, Math.min(ph * 0.14, pw * 0.07));
      ctx.font = `400 ${fs}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(missing ? t('Not on this computer') : t('No picture yet'), px + pw / 2, py + ph / 2, pw - 8);
    }
    ctx.restore();
    ctx.lineWidth = 1;
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px + 0.5, py + 0.5, pw - 1, ph - 1, Math.max(2, r - pad / 2)); else ctx.rect(px + 0.5, py + 0.5, pw - 1, ph - 1);
    ctx.stroke();
  }
  const fs = Math.max(8, Math.min(labelH * 0.46, 16));
  const ly = showThumb ? (y + h - pad - labelH / 2) : (y + h / 2);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const ink = missing ? (dark ? '#a19f9d' : '#8a8886') : (dark ? '#8ccbff' : '#0f6cbd');
  ctx.fillStyle = ink; ctx.strokeStyle = ink;
  const ax = x + pad + fs * 0.15, ay = ly, as = fs * 0.62;
  ctx.lineWidth = Math.max(1, fs / 9); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay + as / 2); ctx.lineTo(ax + as, ay - as / 2);
  ctx.moveTo(ax + as * 0.35, ay - as / 2); ctx.lineTo(ax + as, ay - as / 2); ctx.lineTo(ax + as, ay + as * 0.15);
  ctx.stroke();
  ctx.font = `600 ${fs}px ${FONT}`;
  const tx = ax + as + fs * 0.45, room = x + w - pad - tx;
  let label = refLabel(ref);
  if (ctx.measureText(label).width > room) {
    while (label.length > 1 && ctx.measureText(label + '…').width > room) label = label.slice(0, -1);
    label += '…';
  }
  ctx.fillText(label, tx, ly);
  if (missing) ctx.fillRect(tx, ly, Math.min(room, ctx.measureText(label).width), Math.max(1, fs / 14));
  ctx.restore();
}

export function drawAudioCard(ctx, o) {
  const { x, y, w, h } = o;
  const dark = darkBoard;
  const r = Math.min(16, h * 0.35);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.14)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = dark ? '#22272e' : '#ffffff';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = dark ? '#00e5ff' : '#0078d4';
  ctx.stroke();

  const cx = x + 30, cy = y + h / 2, cr = 16;
  ctx.fillStyle = dark ? '#00e5ff' : '#0078d4';
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = dark ? '#000000' : '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 7);
  ctx.lineTo(cx + 7, cy);
  ctx.lineTo(cx - 3, cy + 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = dark ? '#f0f6fc' : '#1f2328';
  ctx.font = `600 13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const name = o.name || 'Audio Recording';
  ctx.fillText(name, x + 56, y + h / 2 - 8, Math.max(20, w - 66));

  ctx.fillStyle = dark ? '#8b949e' : '#656d76';
  ctx.font = `500 11.5px ${FONT}`;
  const totalSec = Math.floor((o.durationMs || 0) / 1000);
  const m = Math.floor(totalSec / 60), s = totalSec % 60;
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  ctx.fillText(`🎙️ ${timeStr}`, x + 56, y + h / 2 + 10);

  ctx.restore();
}

let probe = null;
export function linkRectsOf(o) {
  if (!o || o.hidden) return [];
  if (o.type === 'boardlink') {
    const b = boundsOf(o);
    const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }, a = o.rotation || 0;
    const turn = (px, py) => (a ? { x: c.x + (px - c.x) * Math.cos(a) - (py - c.y) * Math.sin(a), y: c.y + (px - c.x) * Math.sin(a) + (py - c.y) * Math.cos(a) } : { x: px, y: py });
    return [{ ref: o.board, quad: [turn(b.x, b.y), turn(b.x + b.w, b.y), turn(b.x + b.w, b.y + b.h), turn(b.x, b.y + b.h)] }];
  }
  const has = (v) => typeof v === 'string' && (v.includes('](b:') || v.includes('[['));
  if (!has(o.text) && !(o.cells && Object.values(o.cells).some(has))) return [];
  if (typeof document === 'undefined') return [];
  probe = probe || document.createElement('canvas').getContext('2d');
  probe.setTransform(1, 0, 0, 1, 0, 0);
  const list = [];
  watchChips(list);
  try {
    const prevMd = o.markdown;
    o.markdown = false;
    try { drawObject(probe, o, null, null); } finally { o.markdown = prevMd; }
  } finally { watchChips(null); }
  return list;
}

export function inQuad(q, p) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross !== 0) { const s = Math.sign(cross); if (sign && s !== sign) return false; sign = s; }
  }
  return true;
}

/* =================================================================== *
 *  Selection chrome (drawn in screen space)
 * =================================================================== */
export const HANDLE = 9;
export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function handlePositions(box) {
  const { x, y, w, h } = box;
  return {
    nw: { x, y }, n: { x: x + w / 2, y }, ne: { x: x + w, y },
    e: { x: x + w, y: y + h / 2 }, se: { x: x + w, y: y + h },
    s: { x: x + w / 2, y: y + h }, sw: { x, y: y + h }, w: { x, y: y + h / 2 },
    rot: { x: x + w / 2, y: y - 28 }
  };
}

function strokePageEdge(ctx, sheet) {
  ctx.save();
  ctx.strokeStyle = 'rgba(32,31,30,.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(sheet.x) + 0.5, Math.round(sheet.y) + 0.5, Math.round(sheet.w), Math.round(sheet.h));
  ctx.restore();
}

function shadeOf(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(hex).trim());
  if (!m) return '#e8e6e3';
  const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16));
  const mix = (c) => Math.round(c * 0.90);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export function drawSelection(ctx, screenBox, opts = {}) {
  const { x, y, w, h } = screenBox;
  ctx.save();
  ctx.strokeStyle = '#0078d4';
  ctx.lineWidth = 1.5;
  ctx.setLineDash(opts.dashed ? [5, 4] : []);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  if (opts.handles !== false) {
    const pos = handlePositions(screenBox);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0078d4';
    ctx.lineWidth = 1.5;
    for (const k of HANDLES) {
      const p = pos[k];
      ctx.beginPath();
      ctx.arc(p.x, p.y, HANDLE / 2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    if (opts.rotate !== false) {
      const p = pos.rot;
      ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, HANDLE / 2 + 1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawGroupHint(ctx, cam, b, active = true, name = '') {
  const p = cam.toScreen(b.x, b.y);
  const w = b.w * cam.z, h = b.h * cam.z;
  ctx.save();
  ctx.strokeStyle = active ? 'rgba(0, 120, 212, 0.55)' : 'rgba(0, 120, 212, 0.22)';
  ctx.lineWidth = active ? 1.5 : 1;
  ctx.setLineDash(active ? [7, 5] : [4, 6]);
  const x = p.x - 7, y = p.y - 7, rw = w + 14, rh = h + 14;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, rw, rh, 9);
  else ctx.rect(x, y, rw, rh);
  ctx.stroke();
  ctx.setLineDash([]);
  if (name && rw > 54) {
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    let label = name;
    if (ctx.measureText(label).width > rw - 12) {
      while (label.length > 1 && ctx.measureText(label + '\u2026').width > rw - 12) label = label.slice(0, -1);
      label += '\u2026';
    }
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillRect(x + 6, y - 8, tw + 8, 15);
    ctx.fillStyle = active ? 'rgba(0, 90, 158, 0.95)' : 'rgba(0, 90, 158, 0.6)';
    ctx.fillText(label, x + 10, y + 3.5);
  }
  ctx.restore();
}

export function drawLockedOutline(ctx, cam, o) {
  const b = worldBounds(o);
  const p = cam.toScreen(b.x, b.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(96, 94, 92, 0.55)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.strokeRect(p.x - 3, p.y - 3, b.w * cam.z + 6, b.h * cam.z + 6);
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawLockBadge(ctx, cam, o) {
  const b = worldBounds(o);
  const p = cam.toScreen(b.x, b.y);
  const s = 15;
  const x = p.x + 4, y = p.y + 4;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(32,31,30,0.72)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, s + 7, s + 5, 4); else ctx.rect(x, y, s + 7, s + 5);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  const cx = x + (s + 7) / 2, cy = y + (s + 5) / 2;
  ctx.beginPath();
  ctx.arc(cx, cy - 1.2, 3, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cx - 4.5, cy - 1, 9, 6.5, 1.4); else ctx.rect(cx - 4.5, cy - 1, 9, 6.5);
  ctx.fill();
  ctx.restore();
}

export function drawMemberOutline(ctx, cam, o) {
  const b = worldBounds(o);
  const p = cam.toScreen(b.x, b.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(0,120,212,0.55)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(p.x, p.y, b.w * cam.z, b.h * cam.z);
  ctx.restore();
}