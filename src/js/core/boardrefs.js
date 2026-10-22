// Links from one board to another (native @[Title](b:id#page), embeds @![Title](b:id#page),
// and Obsidian [[Board#Page|Alias]] / ![[Board#Page|Alias]] wikilinks).

import { t } from '../i18n.js';

export const EMBED_REF_RE = /@!\[([^\]\n]{1,200})\]\(b:([A-Za-z0-9_-]{1,128})(?:#([^\)\n]{1,200}))?\)/g;
export const REF_RE = /@\[([^\]\n]{1,200})\]\(b:([A-Za-z0-9_-]{1,128})(?:#([^\)\n]{1,200}))?\)/g;
export const EMBED_WIKILINK_RE = /!\[\[([^\]|#\n]*)(?:#([^\]|\n]+))?(?:\|([^\]\n]+))?\]\]/g;
export const WIKILINK_RE = /(?<!!)\[\[([^\]|#\n]*)(?:#([^\]|\n]+))?(?:\|([^\]\n]+))?\]\]/g;

const clean = (s) => String(s ?? '').replace(/[\]\n\r]/g, ' ').trim().slice(0, 200) || '?';

function nativeAnchor(ref) {
  if (Number.isInteger(ref?.page) && ref.page > 0) return String(Math.floor(ref.page));
  if (ref?.heading) return `h:${encodeURIComponent(String(ref.heading).slice(0, 160))}`;
  return '';
}

function parseNativeAnchor(raw) {
  if (!raw) return { page: 0, heading: '' };
  if (/^\d{1,4}$/.test(raw)) return { page: Number(raw), heading: '' };
  const encoded = raw.startsWith('h:') ? raw.slice(2) : raw;
  try { return { page: 0, heading: decodeURIComponent(encoded).slice(0, 160) }; }
  catch { return { page: 0, heading: encoded.slice(0, 160) }; }
}

function fallbackIdFromTitle(title) {
  const slug = String(title ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96);
  return 'wl_' + (slug || 'board');
}

/** The text form of a link, for putting into words. Supports `ref.embed` (`@![...](b:...)`). */
export function refToken(ref) {
  const anchor = nativeAnchor(ref);
  const page = anchor ? '#' + anchor : '';
  const prefix = ref.embed ? '@![' : '@[';
  const label = ref.alias || ref.name;
  return `${prefix}${clean(label)}](b:${ref.id}${page})`;
}

/** Format an Obsidian wikilink or embed (`[[Board#Page|Alias]]` or `![[Board#Page|Alias]]`). */
export function wikilinkToken(ref) {
  const b = lookupBoard(ref);
  const boardName = clean(ref.boardName || (b && b.name) || ref.name || (ref.id === current.id ? current.name : '') || '?');
  const pagePart = ref.page > 0 ? `#${Math.floor(ref.page)}` : ref.heading ? `#${String(ref.heading).slice(0, 160)}` : '';
  const alias = ref.alias ? clean(ref.alias) : (ref.name && ref.name !== boardName ? clean(ref.name) : '');
  const aliasPart = alias && alias !== boardName ? `|${alias}` : '';
  return `${ref.embed ? '!' : ''}[[${boardName}${pagePart}${aliasPart}]]`;
}

/**
 * Convert Obsidian-style `![[Board#Page|Alias]]` and `[[Board#Page|Alias]]`
 * into native `@![Label](b:boardId#page)` and `@[Label](b:boardId#page)` tokens.
 */
export function wikilinksToRefs(text) {
  let s = String(text ?? '');
  if (!s.includes('[[')) return s;

  const replaceFn = (isEmbed) => (whole, rawTitle, rawPage, rawAlias) => {
    const title = String(rawTitle || '').trim();
    const anchor = String(rawPage || '').trim();
    const { page, heading } = /^\d{1,4}$/.test(anchor) ? { page: Number(anchor), heading: '' } : { page: 0, heading: anchor };
    if (!title && !current.id) return whole;
    const alias = rawAlias ? String(rawAlias).trim() : '';
    const match = title ? lookupBoard({ name: title }) : lookupBoard({ id: current.id });
    const boardName = (match && match.name) || title || current.name;
    const id = match ? match.id : fallbackIdFromTitle(title);
    const displayName = alias || boardName;
    return refToken({ id, name: displayName, boardName, page, heading, embed: isEmbed });
  };

  s = s.replace(EMBED_WIKILINK_RE, replaceFn(true));
  s = s.replace(WIKILINK_RE, replaceFn(false));
  return s;
}

/**
 * Convert native `@![Label](b:boardId#page)` and `@[Label](b:boardId#page)` tokens
 * into Obsidian `![[Board Name#Page|Alias]]` and `[[Board Name#Page|Alias]]` syntax.
 */
export function refsToWikilinks(text) {
  let s = String(text ?? '');
  if (!s.includes('](b:')) return s;

  const toWl = (isEmbed) => (_, label, id, rawAnchor) => {
    const b = lookupBoard({ id, name: label });
    const boardName = (b && b.name) || label;
    const { page, heading } = parseNativeAnchor(rawAnchor);
    const pagePart = page ? `#${page}` : heading ? `#${heading}` : '';
    const aliasPart = label && label !== boardName ? `|${label}` : '';
    return `${isEmbed ? '!' : ''}[[${boardName}${pagePart}${aliasPart}]]`;
  };

  s = s.replace(EMBED_REF_RE, toWl(true));
  s = s.replace(REF_RE, toWl(false));
  return s;
}

/** Every link in a stretch of text: [{start, end, id, name, page, embed, alias}]. Pages count from 1. */
export function refSpans(text) {
  const out = [];
  const s = String(text ?? '');

  if (s.includes('](b:')) {
    EMBED_REF_RE.lastIndex = 0;
    let m;
    while ((m = EMBED_REF_RE.exec(s))) {
      const anchor = parseNativeAnchor(m[3]);
      out.push({ start: m.index, end: m.index + m[0].length, name: m[1], id: m[2], ...anchor, embed: true });
    }
    REF_RE.lastIndex = 0;
    while ((m = REF_RE.exec(s))) {
      const anchor = parseNativeAnchor(m[3]);
      out.push({ start: m.index, end: m.index + m[0].length, name: m[1], id: m[2], ...anchor, embed: false });
    }
  }

  if (s.includes('[[')) {
    const collectWl = (re, isEmbed) => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(s))) {
        const title = String(m[1] || '').trim();
        const rawAnchor = String(m[2] || '').trim();
        const { page, heading } = /^\d{1,4}$/.test(rawAnchor) ? { page: Number(rawAnchor), heading: '' } : { page: 0, heading: rawAnchor };
        const alias = m[3] ? String(m[3]).trim() : '';
        const found = title ? lookupBoard({ name: title }) : lookupBoard({ id: current.id });
        out.push({
          start: m.index,
          end: m.index + m[0].length,
          name: alias || title,
          boardName: title,
          alias,
          id: found ? found.id : fallbackIdFromTitle(title),
          page,
          heading,
          embed: isEmbed,
          wikilink: true
        });
      }
    };
    collectWl(EMBED_WIKILINK_RE, true);
    collectWl(WIKILINK_RE, false);
  }

  if (out.length > 1) out.sort((a, b) => a.start - b.start);
  return out;
}

export const hasRefs = (text) =>
  typeof text === 'string' && (text.includes('](b:') || text.includes('[[')) && refSpans(text).length > 0;

/** The words with every link written the way a person would: "@Week 5". For copying out to other apps. */
export function refsAsWords(text) {
  if (!hasRefs(text)) return String(text ?? '');
  const withRefs = wikilinksToRefs(text);
  const anchorWords = (raw) => {
    const anchor = parseNativeAnchor(raw);
    return anchor.page ? ' › ' + anchor.page : anchor.heading ? ' › ' + anchor.heading : '';
  };
  return String(withRefs)
    .replace(EMBED_REF_RE, (_, name, id, anchor) => '@!' + (directoryName(id) || name) + anchorWords(anchor))
    .replace(REF_RE, (_, name, id, anchor) => '@' + (directoryName(id) || name) + anchorWords(anchor));
}

/* ------------------------------------------------------------------ *
 *  What boards there are
 * ------------------------------------------------------------------ */

const byId = new Map();          // id -> { id, name, thumb, modified }
let known = false;
let current = { id: null, name: '' };
const listeners = new Set();

export function setBoardDirectory(list) {
  byId.clear();
  for (const b of list || []) if (b && b.id) byId.set(b.id, { id: b.id, name: b.name || '', thumb: b.thumb || null, modified: b.modified || 0, origin: b.origin || null });
  known = true;
  for (const fn of listeners) { try { fn(); } catch { /* a listener's problem is its own */ } }
}

export function setCurrentBoard(id, name) {
  current = { id, name: name || '' };
}

export const currentBoardId = () => current.id;
export const currentBoardName = () => current.name;
export const directoryKnown = () => known;
export function onDirectoryChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function allBoards() {
  const list = [...byId.values()];
  if (current.id && !byId.has(current.id)) list.push({ id: current.id, name: current.name, thumb: null, modified: Date.now() });
  return list.map((b) => (b.id === current.id ? { ...b, name: current.name || b.name } : b));
}

function directoryName(id) {
  if (id && id === current.id) return current.name;
  return byId.get(id)?.name || null;
}

export function lookupBoard(ref) {
  if (!ref) return null;
  if (ref.id && ref.id === current.id) return { id: current.id, name: current.name, thumb: byId.get(current.id)?.thumb || null };
  const e = ref.id && byId.get(ref.id);
  if (e) return e;
  if (ref.id) {
    const tail = '/' + ref.id;
    const came = [...byId.values()].filter((b) => typeof b.origin === 'string' && b.origin.startsWith('sync:') && b.origin.endsWith(tail));
    if (came.length === 1) return came[0];
  }
  const name = String(ref.boardName || ref.name || '').trim().toLowerCase();
  if (!name) return null;
  const same = allBoards().filter((b) => String(b.name || '').trim().toLowerCase() === name);
  return same.length === 1 ? same[0] : null;
}

export const refMissing = (ref) => known && !lookupBoard(ref);

export function refLabel(ref) {
  if (ref?.alias) return ref.page > 0 ? `${ref.alias} › ${ref.page}` : ref.alias;
  const b = lookupBoard(ref);
  const name = (b && b.name) || ref?.name || '?';
  return ref?.page > 0 ? `${name} › ${ref.page}` : ref?.heading ? `${name} › ${ref.heading}` : name;
}

export function linkedRefs(objects) {
  const seen = new Map();
  const add = (ref) => { if (ref && ref.id && !seen.has(ref.id)) seen.set(ref.id, { id: ref.id, name: ref.name || '' }); };
  const words = (s) => { for (const r of refSpans(s)) add(r); };
  const list = Array.isArray(objects) ? objects : Object.values(objects || {});
  for (const o of list) {
    if (!o) continue;
    if (o.type === 'boardlink') add(o.board);
    if (o.excerptSource?.boardId) add({ id: o.excerptSource.boardId, name: o.excerptSource.boardName || '' });
    if (typeof o.text === 'string') words(o.text);
    if (o.cells) for (const v of Object.values(o.cells)) words(v);
  }
  return [...seen.values()];
}

export function remapBoardIds(objects, map) {
  if (!map || !map.size) return objects;
  const swap = (s) => {
    if (typeof s !== 'string' || !s.includes('](b:')) return s;
    return s
      .replace(EMBED_REF_RE, (whole, name, id, anchor) => (map.has(id) ? `@![${name}](b:${map.get(id)}${anchor ? '#' + anchor : ''})` : whole))
      .replace(REF_RE, (whole, name, id, anchor) => (map.has(id) ? `@[${name}](b:${map.get(id)}${anchor ? '#' + anchor : ''})` : whole));
  };
  const runsFor = (runs, text) => {
    if (!Array.isArray(runs)) return runs;
    const next = runs.map((r) => ({ ...r, t: swap(r.t) }));
    return next.map((r) => r.t).join('') === text ? next : undefined;
  };
  const one = (o) => {
    if (!o || typeof o !== 'object') return o;
    const n = { ...o };
    if (n.type === 'boardlink' && n.board && map.has(n.board.id)) n.board = { ...n.board, id: map.get(n.board.id) };
    if (n.excerptSource?.boardId && map.has(n.excerptSource.boardId)) {
      n.excerptSource = { ...n.excerptSource, boardId: map.get(n.excerptSource.boardId) };
    }
    if (typeof n.text === 'string') {
      n.text = swap(n.text);
      if (n.runs) { const r = runsFor(n.runs, n.text); if (r) n.runs = r; else delete n.runs; }
    }
    if (n.cells) {
      n.cells = Object.fromEntries(Object.entries(n.cells).map(([k, v]) => [k, swap(v)]));
      if (n.cellRuns) {
        n.cellRuns = Object.fromEntries(Object.entries(n.cellRuns)
          .map(([k, r]) => [k, runsFor(r, n.cells[k])]).filter(([, r]) => r));
      }
    }
    return n;
  };
  return Array.isArray(objects) ? objects.map(one) : Object.fromEntries(Object.entries(objects || {}).map(([k, o]) => [k, one(o)]));
}

/* ------------------------------------------------------------------ *
 *  Settings-Driven Wikilink Actions & Link Editor Modal
 * ------------------------------------------------------------------ */

export function executeWikilinkAction(app, ref, action, ownerObj = null) {
  if (!app || !ref) return;
  switch (action) {
    case 'embed': {
      if (ownerObj && typeof ownerObj.text === 'string') {
        const nextRef = { ...ref, embed: !ref.embed };
        const oldTok = refToken(ref);
        const newTok = refToken(nextRef);
        const nextText = ownerObj.text.includes(oldTok)
          ? ownerObj.text.replace(oldTok, newTok)
          : ownerObj.text;
        app.store.update(ownerObj.id, { text: nextText }, 'toggle embed');
        app.surface?.invalidate();
      } else if (ownerObj && ownerObj.type === 'boardlink') {
        app.store.update(ownerObj.id, { showThumb: true, board: { ...ref, embed: true } }, 'embed board');
        app.surface?.invalidate();
      } else if (typeof app.openBoardLink === 'function') {
        app.openBoardLink(ref);
      }
      break;
    }
    case 'split': {
      if (app.splitWorkspace && typeof app.splitWorkspace.openBoardInSplit === 'function') {
        app.splitWorkspace.openBoardInSplit(ref);
      } else if (typeof app.openBoardInSplit === 'function') {
        app.openBoardInSplit(ref);
      } else if (typeof app.followBoardLink === 'function') {
        app.followBoardLink(ref);
      }
      break;
    }
    case 'edit': {
      openLinkEditorPopover(app, ref, null, ownerObj);
      break;
    }
    case 'navigate':
    default: {
      if (typeof app.followBoardLink === 'function') {
        app.followBoardLink(ref);
      } else if (typeof app.openBoard === 'function' && ref.id) {
        app.openBoard(ref.id, ref.page);
      }
      break;
    }
  }
}

export function handleWikilinkDoubleClick(app, ref, anchorPoint = null, ownerObj = null) {
  if (!app || !ref) return;
  const pref = app.settings?.wikilinkDblClick || 'ask';
  const showPop = app.settings?.quickActionPopovers !== false;

  if (pref !== 'ask') {
    executeWikilinkAction(app, ref, pref, ownerObj);
    return;
  }

  if (!showPop) {
    executeWikilinkAction(app, ref, 'split', ownerObj);
    return;
  }

  if (typeof document === 'undefined') return;
  document.querySelectorAll('.gb-wikilink-popover').forEach((el) => el.remove());

  const pop = document.createElement('div');
  pop.className = 'pop gb-wikilink-popover';
  const x = anchorPoint?.x ?? window.innerWidth / 2 - 130;
  const y = anchorPoint?.y ?? window.innerHeight / 2 - 90;
  pop.style.cssText = `position:fixed;left:${Math.max(12, Math.min(window.innerWidth - 260, x))}px;top:${Math.max(12, Math.min(window.innerHeight - 240, y))}px;z-index:9999;min-width:240px;padding:10px;border-radius:10px;background:var(--panel,#fff);box-shadow:0 8px 28px rgba(0,0,0,0.22);border:1px solid rgba(128,128,128,0.22);display:flex;flex-direction:column;gap:6px;`;

  const title = document.createElement('div');
  title.style.cssText = 'font-weight:700;font-size:12.5px;margin-bottom:4px;';
  title.textContent = t('Choose Action for {name}', { name: refLabel(ref) });
  pop.appendChild(title);

  let rememberChk = null;
  const runChoice = (act) => {
    if (rememberChk?.checked && app.settings) {
      app.settings.wikilinkDblClick = act;
      app.saveSettings?.();
    }
    pop.remove();
    executeWikilinkAction(app, ref, act, ownerObj);
  };

  const actions = [
    ['embed', t('Embed in Place (![[...]])')],
    ['split', t('Open in Split View')],
    ['navigate', t('Navigate to Board')],
    ['edit', t('Edit Link & Aliases...')]
  ];
  for (const [act, label] of actions) {
    const b = document.createElement('button');
    b.className = 'menu-item';
    b.style.cssText = 'text-align:left;padding:6px 8px;border-radius:6px;cursor:pointer;';
    b.textContent = label;
    b.addEventListener('click', () => runChoice(act));
    pop.appendChild(b);
  }

  const remLabel = document.createElement('label');
  remLabel.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11.5px;margin-top:4px;opacity:0.85;cursor:pointer;';
  rememberChk = document.createElement('input');
  rememberChk.type = 'checkbox';
  const remSpan = document.createElement('span');
  remSpan.textContent = t('Remember choice (changeable in Settings)');
  remLabel.append(rememberChk, remSpan);
  pop.appendChild(remLabel);

  document.body.appendChild(pop);
  const closeOnOutside = (ev) => {
    if (!pop.contains(ev.target)) {
      pop.remove();
      document.removeEventListener('pointerdown', closeOnOutside, true);
    }
  };
  setTimeout(() => document.addEventListener('pointerdown', closeOnOutside, true), 0);
}

/**
 * Opens the Link & Embed Editor popover for right-click or long-press on a wikilink/boardlink.
 */
export function openLinkEditorPopover(app, ref, anchorPoint = null, ownerObj = null, onSave = null) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.gb-link-editor-popover').forEach((el) => el.remove());

  const b = lookupBoard(ref);
  const pop = document.createElement('div');
  pop.className = 'pop gb-link-editor-popover';
  const x = anchorPoint?.x ?? window.innerWidth / 2 - 140;
  const y = anchorPoint?.y ?? window.innerHeight / 2 - 120;
  pop.style.cssText = `position:fixed;left:${Math.max(12, Math.min(window.innerWidth - 290, x))}px;top:${Math.max(12, Math.min(window.innerHeight - 280, y))}px;z-index:9999;width:270px;padding:12px;border-radius:10px;background:var(--panel,#fff);box-shadow:0 8px 28px rgba(0,0,0,0.24);border:1px solid rgba(128,128,128,0.24);display:flex;flex-direction:column;gap:8px;`;

  const header = document.createElement('div');
  header.style.cssText = 'font-weight:700;font-size:13px;';
  header.textContent = t('Edit Link / Embed');
  pop.appendChild(header);

  const mkInput = (labelText, initialValue, type = 'text', placeholder = '') => {
    const wrap = document.createElement('label');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;font-size:11.5px;';
    const lbl = document.createElement('span');
    lbl.textContent = labelText;
    const inp = document.createElement('input');
    inp.type = type;
    inp.value = initialValue ?? '';
    inp.placeholder = placeholder;
    inp.style.cssText = 'padding:5px 7px;border-radius:5px;border:1px solid rgba(128,128,128,0.35);font-size:12.5px;';
    wrap.append(lbl, inp);
    pop.appendChild(wrap);
    return inp;
  };

  const titleInput = mkInput(t('Target Board'), (b && b.name) || ref?.boardName || ref?.name || '', 'text', t('Board name'));
  const pageInput = mkInput(t('Page Number (optional)'), ref?.page > 0 ? String(ref.page) : '', 'number', '1');
  const aliasInput = mkInput(t('Display Alias (optional)'), ref?.alias || '', 'text', t('Custom label'));

  const embedWrap = document.createElement('label');
  embedWrap.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-top:2px;';
  const embedChk = document.createElement('input');
  embedChk.type = 'checkbox';
  embedChk.checked = !!ref?.embed;
  const embedLbl = document.createElement('span');
  embedLbl.textContent = t('Embed in place (![[...]])');
  embedWrap.append(embedChk, embedLbl);
  pop.appendChild(embedWrap);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;justify-content: flex-end;gap:6px;margin-top:6px;';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = t('Cancel');
  cancelBtn.addEventListener('click', () => pop.remove());

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn primary';
  saveBtn.textContent = t('Save');
  saveBtn.addEventListener('click', () => {
    const newBoardName = titleInput.value.trim() || '?';
    const newPage = Math.max(0, parseInt(pageInput.value, 10) || 0);
    const newAlias = aliasInput.value.trim();
    const isEmbed = embedChk.checked;
    const found = lookupBoard({ name: newBoardName });
    const updatedRef = {
      id: found ? found.id : (ref?.id || fallbackIdFromTitle(newBoardName)),
      name: newAlias || newBoardName,
      boardName: newBoardName,
      alias: newAlias,
      page: newPage,
      embed: isEmbed
    };

    if (typeof onSave === 'function') {
      onSave(updatedRef);
    } else if (ownerObj && app?.store) {
      if (ownerObj.type === 'boardlink') {
        app.store.update(ownerObj.id, { board: updatedRef }, 'edit link');
      } else if (typeof ownerObj.text === 'string') {
        const nextTok = refToken(updatedRef);
        const spans = refSpans(ownerObj.text);
        const targetSpan = spans.find((sp) => sp.id === ref.id || sp.name === ref.name);
        if (targetSpan) {
          const nextText = ownerObj.text.slice(0, targetSpan.start) + nextTok + ownerObj.text.slice(targetSpan.end);
          app.store.update(ownerObj.id, { text: nextText }, 'edit link');
        }
      }
      app.surface?.invalidate();
    }
    pop.remove();
  });

  btnRow.append(cancelBtn, saveBtn);
  pop.appendChild(btnRow);
  document.body.appendChild(pop);
  setTimeout(() => titleInput.focus(), 0);
}
