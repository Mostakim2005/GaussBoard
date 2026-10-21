// In-place text editing: a positioned editable box layered over the canvas.
//
// It was a <textarea>, which can only hold plain text. It is now an editable
// <div>, so a word can be bold or red while the rest is not (see richtext.js).
// The div still answers to .value, .selectionStart, .selectionEnd and
// setSelectionRange() exactly as the textarea did, in plain-text character
// offsets, so everything that used to talk to the textarea still can.

import { boundsOf } from '../core/store.js';
import { fitFontSize, readableText, wrapText, clamp } from '../core/util.js';
import { faceOf, noteTypeRange, inkPaint } from '../core/render.js';
import { objectRuns, normalizeRuns, layoutRich, fitRichSize, htmlToRuns, needsRich } from '../core/richtext.js';
import { refSpans, refToken, refLabel, refMissing, wikilinksToRefs } from '../core/boardrefs.js';
import { isMarkdown, renderMarkdownToHtml, toggleTaskAtLine } from '../core/markdown.js';
import { openBoardPicker } from './boardpicker.js';
import { updateSelectionBar } from './contextmenu.js';
import { t } from '../i18n.js';

/* ---------- the editable box <-> plain offsets and runs ---------- */

const BLOCK = new Set(['DIV', 'P', 'LI']);

/*
 * The box's contents as a flat list: each text node, each line break, and the
 * line break implied by a new block (the browser sometimes makes one). A line
 * break that is the very last thing in the box is the browser's placeholder
 * for an empty last line, not a character, so it is left out.
 */
function flatten(root, keepTail = false) {
  const items = [];
  let pos = 0;
  const walk = (node) => {
    for (const ch of node.childNodes) {
      if (ch.nodeType === 3) {
        if (ch.data) { items.push({ kind: 'text', node: ch, from: pos, to: pos + ch.data.length }); pos += ch.data.length; }
      } else if (ch.nodeType === 1) {
        // a link to a board is one piece, whatever its label says: its text is the link itself
        const ref = ch.getAttribute && ch.getAttribute('data-ref');
        if (ref) { items.push({ kind: 'ref', node: ch, token: ref, from: pos, to: pos + ref.length }); pos += ref.length; }
        else if (ch.tagName === 'BR') { items.push({ kind: 'br', node: ch, from: pos, to: pos + 1 }); pos += 1; }
        else {
          if (BLOCK.has(ch.tagName) && pos > 0 && items.length && items[items.length - 1].kind !== 'br') {
            items.push({ kind: 'block', node: ch, from: pos, to: pos + 1 }); pos += 1;
          }
          walk(ch);
        }
      }
    }
  };
  walk(root);
  const last = items[items.length - 1];
  if (!keepTail && last && last.kind === 'br') items.pop();
  return items;
}

function plainOf(root) {
  let s = '';
  for (const it of flatten(root)) s += it.kind === 'text' ? it.node.data : it.kind === 'ref' ? it.token : '\n';
  return s;
}

/** Plain-text offset of a DOM point inside the box. */
function offsetOf(root, container, offset) {
  const total = plainOf(root).length;
  if (!root.contains(container)) return total;
  const r = document.createRange();
  r.setStart(root, 0);
  try { r.setEnd(container, offset); } catch { return total; }
  const holder = document.createElement('div');
  holder.appendChild(r.cloneContents());
  let n = 0;
  for (const it of flatten(holder, true)) n = it.to;
  return Math.min(n, total);
}

/** The DOM point for a plain-text offset. */
function pointAt(root, n) {
  const items = flatten(root);
  for (const it of items) {
    if (it.kind === 'text' && n >= it.from && n <= it.to) return [it.node, n - it.from];
    if (it.kind !== 'text' && n === it.from) {
      const parent = it.node.parentNode;
      return [parent, Array.prototype.indexOf.call(parent.childNodes, it.node)];
    }
  }
  const tail = root.lastChild;
  if (tail && tail.nodeType === 1 && tail.tagName === 'BR' && !items.some((it) => it.node === tail)) {
    return [root, root.childNodes.length - 1];
  }
  return [root, root.childNodes.length];
}

const hex2 = (v) => Number(v).toString(16).padStart(2, '0');
function toHex(rgb) {
  const m = String(rgb).match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return m ? '#' + hex2(m[1]) + hex2(m[2]) + hex2(m[3]) : null;
}

function looksOf(el, root) {
  const cs = getComputedStyle(el);
  const w = parseInt(cs.fontWeight, 10) || (cs.fontWeight === 'bold' ? 700 : 400);
  let under = false;
  for (let n = el; n; n = n.parentElement) {
    if (n.tagName === 'U' || getComputedStyle(n).textDecorationLine.includes('underline')) { under = true; break; }
    if (n === root) break;
  }
  return { bold: w >= 600, italic: /italic|oblique/.test(cs.fontStyle), under, color: toHex(cs.color) };
}

function runsOf(root, paint = (c) => c) {
  const base = looksOf(root, root);
  const shown = String(paint('#201f1e'));
  const autoShown = (/^#[0-9a-f]{6}$/i.test(shown) ? shown.toLowerCase() : toHex(shown)) || '#201f1e';
  const runs = [];
  for (const it of flatten(root)) {
    if (it.kind !== 'text' && it.kind !== 'ref') { runs.push({ t: '\n' }); continue; }
    const l = looksOf(it.kind === 'ref' ? (it.node.parentElement || root) : it.node.parentElement, root);
    const r = { t: it.kind === 'ref' ? it.token : it.node.data };
    if (l.bold !== base.bold) r.b = l.bold ? 1 : 0;
    if (l.italic !== base.italic) r.i = l.italic ? 1 : 0;
    if (l.under !== base.under) r.u = l.under ? 1 : 0;
    if (l.color && l.color !== base.color) r.c = l.color === autoShown ? '#201f1e' : l.color;
    runs.push(r);
  }
  return normalizeRuns(runs);
}

/** Fill the box with runs (or plain text), the way it will be drawn. */
function fill(root, runs, text, paint = (c) => c) {
  root.textContent = '';
  const list = runs || [{ t: String(text ?? '') }];
  for (const r of list) {
    let into = root;
    if (r.b !== undefined || r.i !== undefined || r.u !== undefined || r.c) {
      into = document.createElement('span');
      if (r.b !== undefined) into.style.fontWeight = r.b ? '600' : '400';
      if (r.i !== undefined) into.style.fontStyle = r.i ? 'italic' : 'normal';
      if (r.u !== undefined) into.style.textDecorationLine = r.u ? 'underline' : 'none';
      if (r.c) into.style.color = paint(r.c);
      root.appendChild(into);
    }
    String(r.t).split('\n').forEach((piece, i) => {
      if (i) into.appendChild(document.createElement('br'));
      if (piece) appendWithLinks(into, piece);
    });
  }
  if (/\n$/.test(runsTextOf(list))) root.appendChild(document.createElement('br'));
}
const runsTextOf = (list) => list.map((r) => r.t).join('');

/** A link to a board as it sits among the words being typed: its name, as one piece. */
export function linkChip(ref) {
  const el = document.createElement('span');
  el.className = 'rt-ref' + (refMissing(ref) ? ' missing' : '');
  el.contentEditable = 'false';
  el.setAttribute('data-ref', refToken(ref));
  el.textContent = refLabel(ref);
  return el;
}

/** Words into the box, with each link in them made into one piece. */
function appendWithLinks(into, text) {
  let at = 0;
  for (const sp of refSpans(text)) {
    if (sp.start > at) into.appendChild(document.createTextNode(text.slice(at, sp.start)));
    into.appendChild(linkChip(sp));
    at = sp.end;
  }
  if (at < text.length) into.appendChild(document.createTextNode(text.slice(at)));
}

/** Make an editable div answer the questions a textarea used to. */
function textareaFace(el) {
  Object.defineProperty(el, 'value', {
    configurable: true,
    get: () => plainOf(el),
    set: (v) => { fill(el, null, v); el.dispatchEvent(new Event('input')); }
  });
  const sel = () => {
    const s = document.getSelection();
    if (!s || !s.rangeCount || !el.contains(s.getRangeAt(0).startContainer)) return null;
    return s.getRangeAt(0);
  };
  Object.defineProperty(el, 'selectionStart', {
    configurable: true,
    get: () => { const r = sel(); return r ? offsetOf(el, r.startContainer, r.startOffset) : plainOf(el).length; }
  });
  Object.defineProperty(el, 'selectionEnd', {
    configurable: true,
    get: () => { const r = sel(); return r ? offsetOf(el, r.endContainer, r.endOffset) : plainOf(el).length; }
  });
  el.setSelectionRange = (a, b = a) => {
    const len = plainOf(el).length;
    const r = document.createRange();
    const [sn, so] = pointAt(el, clamp(a, 0, len));
    const [en, eo] = pointAt(el, clamp(b, 0, len));
    r.setStart(sn, so); r.setEnd(en, eo);
    const s = document.getSelection();
    s.removeAllRanges(); s.addRange(r);
  };
  el.select = () => el.setSelectionRange(0, plainOf(el).length);
}

export class TextEditor {
  constructor(app) {
    this.app = app;
    this.layer = document.getElementById('editLayer');
    this.el = null;
    this.previewEl = null;
    this.previewMode = false;
    this.target = null;
    this.cell = null;
    this.measure = document.createElement('canvas').getContext('2d');
  }

  get active() { return !!this.el; }

  begin(obj, cell = null) {
    this.commit();
    const app = this.app;
    this.target = obj;
    this.cell = cell;
    this.previewMode = false;
    this.startH = obj.h;
    this.startW = obj.w;
    this.wrapW = obj.type === 'text'
      ? (obj.wrapW || Math.max(obj.w || 0, (obj.fontSize || 24) * 11.25)) : null;

    const ta = document.createElement('div');
    const isMd = !cell && obj.markdown !== false && (obj.type === 'text' || obj.type === 'note');
    ta.className = isMd ? 'rt markdown-mode' : 'rt';
    ta.contentEditable = 'true';
    ta.setAttribute('role', 'textbox');
    ta.setAttribute('aria-multiline', 'true');
    ta.spellcheck = true;
    ta.setAttribute('data-gramm', 'false');
    ta.setAttribute('data-gramm_editor', 'false');
    ta.setAttribute('data-enable-grammarly', 'false');
    textareaFace(ta);
    this.paint = !cell && (obj.type === 'text' || obj.type === 'shape') ? (c) => inkPaint(c) : (c) => c;
    fill(ta, objectRuns(obj, cell), cell ? (obj.cells?.[cell] || '') : (obj.text || ''), this.paint);
    this.el = ta;
    this.layer.appendChild(ta);

    const p = app.surface.cam.toScreen(obj.x + (obj.w || 200) / 2, obj.y + (obj.h || 100) / 2);
    const vh = window.visualViewport ? window.visualViewport.height : (window.innerHeight || 768);
    const touchFirst = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (p.y > vh * 0.65 && touchFirst) {
      app.surface.cam.panBy(0, -(p.y - vh * 0.38));
      app.surface.clampCamera();
      app.surface.invalidate();
    }

    app.surface.editing = { id: obj.id, cell };
    document.body.classList.add('typing');

    this.place();

    ta.addEventListener('input', () => { this.place(); app.surface.invalidate(); this.watchMention(); });

    const insertPlain = (text) => {
      const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
      lines.forEach((line, i) => {
        if (i) document.execCommand('insertLineBreak');
        if (line) document.execCommand('insertText', false, line);
      });
    };
    const insertRich = (runs) => {
      const s = document.getSelection();
      if (!s || !s.rangeCount || !ta.contains(s.getRangeAt(0).startContainer)) return false;
      const range = s.getRangeAt(0);
      range.deleteContents();
      const holder = document.createElement('div');
      fill(holder, runs, null, this.paint);
      const nodes = [...holder.childNodes];
      if (!nodes.length) return true;
      const frag = document.createDocumentFragment();
      for (const n of nodes) frag.appendChild(n);
      range.insertNode(frag);
      const after = document.createRange();
      after.setStartAfter(nodes[nodes.length - 1]);
      after.collapse(true);
      s.removeAllRanges(); s.addRange(after);
      ta.dispatchEvent(new Event('input'));
      return true;
    };
    this._insertRich = insertRich;
    this._insertPlain = insertPlain;
    ta.addEventListener('paste', (e) => {
      e.preventDefault();
      const plain = e.clipboardData?.getData('text/plain') || '';
      const html = this._plainPaste ? '' : (e.clipboardData?.getData('text/html') || '');
      this._plainPaste = false;
      if (html) {
        const got = htmlToRuns(html);
        if (got.runs && insertRich(got.runs)) return;
        if (!plain && got.text) { insertPlain(got.text); return; }
      }
      insertPlain(plain);
    });
    ta.addEventListener('drop', (e) => {
      e.preventDefault();
      insertPlain(e.dataTransfer?.getData('text/plain'));
    });
    ta.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (this.mention?.open && !e.isComposing && this.mention.key(e)) { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'V' || e.key === 'v')) this._plainPaste = true;
      if (e.key === 'F2') {
        e.preventDefault();
        this.toggleLivePreview();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        this.insertWikilinkSyntax();
        return;
      }
      if (isMd && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 'b' || e.key === 'B') {
          if (isMarkdown(ta.value)) {
            e.preventDefault();
            this.wrapMarkdownSelection('**', '**');
            return;
          }
        }
        if (e.key === 'i' || e.key === 'I') {
          if (isMarkdown(ta.value)) {
            e.preventDefault();
            this.wrapMarkdownSelection('*', '*');
            return;
          }
        }
      }
      if (e.key === 'Escape') { e.preventDefault(); this.cancel(); app.surface.canvas.focus(); }
      else if (e.key === 'Enter' && !(e.ctrlKey || e.metaKey) && !e.isComposing) {
        e.preventDefault();
        document.execCommand('insertLineBreak');
      }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.commit(); }
      else if (e.key === 'Tab' && cell) { e.preventDefault(); this.commit(); }
    });
    ta.addEventListener('blur', () => { if (!this._picking && !this.previewMode) this.commit(); });
    this._onSel = () => { if (this.el && document.activeElement === this.el) updateSelectionBar(app, true); };
    document.addEventListener('selectionchange', this._onSel);
    ta.addEventListener('pointerdown', (e) => e.stopPropagation());

    setTimeout(() => {
      ta.focus();
      const end = ta.value.length;
      ta.setSelectionRange(end, end);
    }, 0);
    app.surface.invalidate();
  }

  /**
   * Wraps the current selection in Markdown tokens (e.g. `**` for bold, `*` for italic).
   */
  wrapMarkdownSelection(prefix, suffix = prefix) {
    if (!this.el) return;
    const start = this.el.selectionStart;
    const end = this.el.selectionEnd;
    const val = this.el.value;
    const selected = val.slice(start, end);
    this._insertPlain?.(`${prefix}${selected}${suffix}`);
    if (!selected) {
      const caret = start + prefix.length;
      this.el.setSelectionRange(caret, caret);
    }
    this.place();
    this.app.surface.invalidate();
  }

  /**
   * Toggle between raw Markdown source editing and rendered Obsidian Live Preview.
   */
  toggleLivePreview() {
    if (!this.el || !this.target) return;
    this.previewMode = !this.previewMode;
    if (this.previewMode) {
      if (!this.previewEl) {
        const pv = document.createElement('div');
        pv.className = 'rt gb-markdown-body gb-live-preview';
        pv.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          const cb = e.target.closest('input.gb-task-checkbox');
          if (cb) {
            e.preventDefault();
            const lineIdx = Number(cb.getAttribute('data-line'));
            const toggled = toggleTaskAtLine(this.el.value, lineIdx);
            if (toggled.toggled) {
              this.el.value = toggled.text;
              this.renderPreviewDom();
            }
            return;
          }
          this.toggleLivePreview();
        });
        this.previewEl = pv;
        this.layer.appendChild(pv);
      }
      this.renderPreviewDom();
      this.el.style.display = 'none';
      this.previewEl.style.display = '';
    } else {
      if (this.previewEl) this.previewEl.style.display = 'none';
      this.el.style.display = '';
      this.el.focus();
    }
    this.place();
  }

  renderPreviewDom() {
    if (!this.previewEl || !this.el) return;
    this.previewEl.innerHTML = renderMarkdownToHtml(this.el.value);
  }

  /**
   * Inserts `[[board]]` or wraps current selection in `[[selection]]` on Ctrl+K.
   */
  insertWikilinkSyntax() {
    if (!this.el) return;
    if (document.activeElement !== this.el) this.el.focus();
    const a = this.el.selectionStart;
    const b = this.el.selectionEnd;
    const val = this.el.value;
    const selected = val.slice(a, b);
    if (selected) {
      this._insertPlain?.(`[[${selected}]]`);
    } else {
      this._insertPlain?.('[[');
      this.watchMention();
    }
  }

  place() {
    if (!this.el || !this.target) return;
    const app = this.app, cam = app.surface.cam, o = this.target;
    let box;
    if (this.cell) {
      const [r, c] = this.cell.split(',').map(Number);
      const cw = o.w / o.cols, ch = o.h / o.rows;
      box = { x: o.x + c * cw, y: o.y + r * ch, w: cw, h: ch };
    } else box = boundsOf(o);

    if (o.type === 'note' && !this.cell) {
      const base = this.startH != null ? this.startH : o.h;
      const want = Math.max(base, this.noteHeight(o, this.el.value, base, this.runs()));
      if (want !== o.h) { o.h = want; box = boundsOf(o); app.surface.touch?.(); }
    }

    if (o.type === 'text' && !this.cell && o.autoSize !== false) {
      const want = this.fitBox(o, this.el.value, this.wrapW, this.runs());
      if (want.h !== o.h || want.w !== o.w) { o.h = want.h; o.w = want.w; box = boundsOf(o); app.surface.touch?.(); }
    } else if (o.type === 'text' && !this.cell) {
      const want = this.fitBox(o, this.el.value, o.w, this.runs()).h;
      if (want !== o.h) { o.h = want; box = boundsOf(o); app.surface.touch?.(); }
    }

    const pad = o.type === 'note' ? Math.max(10, o.w * 0.08) : o.type === 'shape' ? 10 : 0;
    const wx = box.x + pad, wy = box.y + pad, ww = box.w - pad * 2, wh = box.h - pad * 2;
    const p = cam.toScreen(wx, wy);

    let size = o.fontSize || 0;
    const face = faceOf(o.font);
    if (!size) {
      this.measure.font = `16px ${face}`;
      const range = o.type === 'note' ? noteTypeRange(o) : { max: 72, min: 10 };
      const runs = this.runs();
      size = runs
        ? fitRichSize(this.measure, runs, ww, wh, this.richBase(o, face), range.max, range.min)
        : fitFontSize(this.measure, this.el.value || ' ', ww, wh, face, '400', range.max, range.min);
    }

    const applyBoxStyle = (domEl) => {
      if (!domEl) return;
      const s = domEl.style;
      s.left = p.x + 'px';
      s.top = p.y + 'px';
      s.width = Math.max(24, ww * cam.z) + 'px';
      s.height = Math.max(20, wh * cam.z) + 'px';
      s.fontSize = size * cam.z + 'px';
      s.lineHeight = 1.28;
      s.fontFamily = face;
      s.fontWeight = o.bold ? '600' : '400';
      s.fontStyle = o.italic ? 'italic' : 'normal';
      s.textDecorationLine = o.underline && !this.cell ? 'underline' : 'none';
      s.textAlign = this.cell ? 'center' : (o.align || (o.type === 'text' ? 'left' : 'center'));
      const ink = o.type === 'note' ? (o.textColor || readableText(o.color || '#ffd94a'))
        : inkPaint(o.color || o.textColor);
      s.color = ink;
      s.caretColor = ink;
      s.background = o.type === 'note' ? o.color
        : (!this.cell && o.background && o.background !== 'none' ? o.background : 'transparent');
      s.outlineColor = o.type === 'note' ? ink : 'rgba(0,0,0,.45)';
      s.transform = o.rotation ? `rotate(${o.rotation}rad)` : '';
      s.transformOrigin = '0 0';
      s.padding = '0';
      if (o.type === 'note' || o.type === 'shape' || this.cell) {
        const lines = this.el.value.split('\n').length;
        const contentH = lines * size * 1.28 * cam.z;
        s.paddingTop = Math.max(0, (wh * cam.z - contentH) / 2) + 'px';
      } else s.paddingTop = '0';
    };

    applyBoxStyle(this.el);
    applyBoxStyle(this.previewEl);

    if (document.activeElement === this.el) updateSelectionBar(app, true);
  }

  /** What is in the box right now, as runs - or null when it is all plain. */
  runs() {
    if (!this.el || !this.el.isConnected) return null;
    return runsOf(this.el, this.paint);
  }

  /** The box's own style, as the rich layout wants it. */
  richBase(o, face = faceOf(o.font), size = o.fontSize || 24) {
    return { family: face, weight: '400', bold: !!o.bold && !this.cell, italic: !!o.italic && !this.cell, underline: !!o.underline && !this.cell, color: '#000', size };
  }

  commit() {
    if (!this.el || !this.target) return;
    this.endMention();
    const rawValue = this.el.value;
    // Translate [[Target Board#Page|Alias]] wikilinks into native @[Label](b:boardId#page) tokens on commit
    const value = wikilinksToRefs(rawValue);
    const runs = value !== rawValue ? null : this.runs();
    const el = this.el;
    const pv = this.previewEl;
    this.stopWatching();
    this.el = null;
    this.previewEl = null;
    this.previewMode = false;
    const target = this.target;
    const cell = this.cell;
    this.target = null; this.cell = null;
    this.app.surface.editing = null;
    document.body.classList.remove('typing');
    el.remove();
    if (pv) pv.remove();

    const store = this.app.store;
    const same = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
    if (cell) {
      const cells = { ...(target.cells || {}) };
      const oldRuns = objectRuns(target, cell);
      if ((cells[cell] || '') !== value || !same(oldRuns, runs)) {
        if (value) cells[cell] = value; else delete cells[cell];
        const patch = { cells };
        if (runs || target.cellRuns) {
          const cellRuns = { ...(target.cellRuns || {}) };
          if (runs && value) cellRuns[cell] = runs; else delete cellRuns[cell];
          patch.cellRuns = Object.keys(cellRuns).length ? cellRuns : undefined;
        }
        store.update(target.id, patch, 'edit table');
      }
    } else if ((target.text || '') !== value || !same(objectRuns(target), runs)) {
      const patch = { text: value };
      if (runs || target.runs !== undefined) patch.runs = runs || undefined;
      if (target.type === 'text' && target.autoSize !== false) {
        if (this.startH != null) target.h = this.startH;
        if (this.startW != null) target.w = this.startW;
        Object.assign(patch, this.fitBox(target, value, this.wrapW, runs));
        patch.wrapW = this.wrapW;
      } else if (target.type === 'text') {
        if (this.startH != null) target.h = this.startH;
        const h = this.fitBox(target, value, target.w, runs).h;
        if (h !== target.h) patch.h = h;
      }
      if (target.type === 'note') {
        if (this.startH != null) target.h = this.startH;
        const base = target.h;
        const want = Math.max(base, this.noteHeight(target, value, base, runs));
        if (want !== target.h) patch.h = want;
      }
      store.update(target.id, patch, 'edit text');
      if (!value && target.type === 'text') store.remove([target.id], 'remove empty text');
    } else if (!value && target.type === 'text' && !target.text) {
      store.remove([target.id], 'remove empty text');
    } else if (this.startH != null && (target.type === 'note' || target.type === 'text')) {
      target.h = this.startH;
      if (target.type === 'text' && this.startW != null) target.w = this.startW;
    }
    this.startH = null; this.startW = null; this.wrapW = null;

    this.app.afterTextEdit();
    this.app.surface.invalidate();
    this.app.syncUI();
  }

  fitBox(o, value, wrapW = this.wrapW, runs = null) {
    if (!runs && needsRich(value)) runs = [{ t: value }];
    const size = o.fontSize || 24;
    const family = faceOf(o.font);
    this.measure.font = `${o.bold ? '600 ' : ''}${size}px ${family}`;
    const pad = size * 0.35;
    const limit = Math.max(40, wrapW || o.w);
    let lines, widest = 0;
    if (runs) {
      const laid = layoutRich(this.measure, runs, limit, this.richBase(o, family, size));
      lines = laid;
      for (const l of laid) widest = Math.max(widest, l.w);
    } else {
      lines = wrapText(this.measure, value, limit);
      for (const line of lines) widest = Math.max(widest, this.measure.measureText(line).width);
    }
    const mdActive = o.markdown !== false && !runs && isMarkdown(value);
    const lineMult = mdActive ? 1.48 : 1.28;
    const extraPad = mdActive ? size * 0.8 : pad * 0.4;
    return {
      w: clamp(widest + pad + (mdActive ? 20 : 0), size * 1.2, limit),
      h: Math.max(size * 1.3, lines.length * size * lineMult + extraPad)
    };
  }

  noteHeight(o, value, baseH = o.h, runs = null) {
    if (!runs && needsRich(value)) runs = [{ t: value }];
    const pad = Math.max(10, o.w * 0.08);
    const innerW = Math.max(8, o.w - pad * 2);
    const face = faceOf(o.font);
    const weight = o.bold ? '600' : '400';
    let size = o.fontSize;
    if (!size) {
      this.measure.font = `${weight} 16px ${face}`;
      const range = noteTypeRange(o);
      size = runs
        ? fitRichSize(this.measure, runs, innerW, Math.max(8, baseH - pad * 2), this.richBase(o, face), range.max, range.min)
        : fitFontSize(this.measure, value || ' ', innerW, Math.max(8, baseH - pad * 2), face, weight, range.max, range.min);
    }
    this.measure.font = `${weight} ${size}px ${face}`;
    const lines = runs ? layoutRich(this.measure, runs, innerW, this.richBase(o, face, size)) : wrapText(this.measure, value || ' ', innerW);
    return Math.ceil(lines.length * size * 1.28 + pad * 2);
  }

  cancel() {
    if (!this.el) return;
    this.endMention();
    const target = this.target;
    const el = this.el;
    const pv = this.previewEl;
    this.stopWatching();
    this.el = null; this.previewEl = null; this.previewMode = false; this.target = null; this.cell = null;
    this.app.surface.editing = null;
    document.body.classList.remove('typing');
    el.remove();
    if (pv) pv.remove();
    if (target && (target.type === 'note' || target.type === 'text') && this.startH != null) {
      target.h = this.startH;
      if (target.type === 'text' && this.startW != null) target.w = this.startW;
    }
    this.startH = null; this.startW = null; this.wrapW = null;
    if (target && target.type === 'text' && !target.text) this.app.store.remove([target.id], 'remove empty text');
    this.app.afterTextEdit();
    this.app.surface.invalidate();
    this.app.syncUI();
  }

  reposition() { if (this.el) this.place(); }

  /*
   * "@" or "[[" followed by a few words, right before the caret, is a search for a
   * board.
   */
  mentionQuery() {
    if (!this.el) return null;
    const s = document.getSelection();
    if (!s || !s.rangeCount || !s.isCollapsed) return null;
    const caret = this.el.selectionStart;
    const before = this.el.value.slice(0, caret);

    // Check Obsidian `[[` trigger first
    const wl = /\[\[([^\]\n]{0,40})$/.exec(before);
    if (wl) {
      return { at: caret - wl[1].length - 2, caret, query: wl[1], wikilink: true };
    }

    const m = /(^|[\s(\[{"'“‘])@([^@\n]{0,40})$/.exec(before);
    if (!m || /\s\s$/.test(m[2]) || /^[\s[]/.test(m[2])) return null;
    return { at: caret - m[2].length - 1, caret, query: m[2] };
  }

  watchMention() {
    const q = this.mentionQuery();
    if (!q) { this.endMention(); return; }
    this._mentionAt = q;
    if (this.mention?.open) { this.mention.setQuery(q.query); return; }
    const r = document.getSelection().getRangeAt(0).cloneRange();
    let box = r.getBoundingClientRect();
    if (!box || (!box.width && !box.height && !box.left)) box = this.el.getBoundingClientRect();
    this.app.refreshBoardDirectory?.();
    this.mention = openBoardPicker(this.app, {
      at: { x: box.left - 8, y: box.bottom + 6 },
      query: q.query,
      onPick: (ref) => this.pickMention(ref),
      onClose: () => { this.mention = null; }
    });
  }

  endMention() {
    const m = this.mention;
    this.mention = null;
    if (m?.open) m.close();
  }

  /** Swap the "@words" or "[[words" just typed for a link to the board chosen. */
  async pickMention(choice) {
    const at = this._mentionAt;
    this.mention = null;
    if (!this.el || !at) return;
    let ref = choice;
    if (choice.create) {
      this._picking = true;
      try { ref = await this.app.createLinkedBoard(choice.create); } finally { this._picking = false; }
      if (!ref || !this.el) return;
    }
    this.el.focus();
    const afterCaret = this.el.value.slice(at.caret);
    const extraClose = at.wikilink && afterCaret.startsWith(']]') ? 2 : 0;
    this.el.setSelectionRange(at.at, at.caret + extraClose);
    const sel = document.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const chip = linkChip(ref), space = document.createTextNode(' ');
    range.insertNode(space);
    range.insertNode(chip);
    const after = document.createRange();
    after.setStart(space, 1); after.collapse(true);
    sel.removeAllRanges(); sel.addRange(after);
    this.el.dispatchEvent(new Event('input'));
  }

  stopWatching() {
    if (this._onSel) document.removeEventListener('selectionchange', this._onSel);
    this._onSel = null;
  }

  format(kind) {
    if (!this.el) return;
    if (document.activeElement !== this.el) this.el.focus();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(kind);
    this.place();
    this.app.surface.invalidate();
  }

  colour(hex) {
    if (!this.el) return;
    if (document.activeElement !== this.el) this.el.focus();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, hex || getComputedStyle(this.el).color);
    this.place();
    this.app.surface.invalidate();
  }

  async pasteFromClipboard() {
    if (!this.el || !window.board?.clipboardRead) return false;
    let got = null;
    try { got = await window.board.clipboardRead(); } catch { got = null; }
    if (!this.el) return false;
    if (document.activeElement !== this.el) this.el.focus();
    const html = got && got.html ? String(got.html) : '';
    const text = got && got.text ? String(got.text) : '';
    if (html) {
      const r = htmlToRuns(html);
      if (r.runs && this._insertRich?.(r.runs)) return true;
      if (!text && r.text) { this._insertPlain?.(r.text); return true; }
    }
    if (text) { this._insertPlain?.(text); return true; }
    this.app.toast(t('There is nothing to paste'));
    return false;
  }

  state(kind) {
    try { return document.queryCommandState(kind); } catch { return false; }
  }
}