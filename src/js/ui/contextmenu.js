// Right-click menu and the floating selection toolbar.

import { h, openPopover, closePopover } from './popover.js';
import { icon } from './icons.js';
import { t } from '../i18n.js';
import { PEN_COLORS, NOTE_COLORS, TEXT_COLORS, SHAPE_STROKES, SHAPE_FILLS } from './palettes.js';
import { inkPaint } from '../core/render.js';
import { boundsOf } from '../core/store.js';

// kinds whose default ink the board draws light on a dark theme (notes and tables keep their own dark ink)
const FOLLOWS_BOARD = new Set(['stroke', 'shape', 'text', 'math', 'connector']);

function item(label, iconName, onClick, opts = {}) {
  const b = h('button', { class: 'menu-item' + (opts.danger ? ' danger' : '') },
    h('span', { html: icon(iconName, 17), style: 'display:flex' }),
    h('span', {}, label),
    opts.key ? h('span', { class: 'k' }, opts.key) : null);
  if (opts.disabled) b.setAttribute('disabled', '');
  b.addEventListener('click', () => { closePopover(); onClick(); });
  return b;
}

export function showContextMenu(app, e, fromSelectionBar = false) {
  const ctxbar = document.getElementById('ctxbar');
  const sel = app.surface.selection;
  const wp = app.surface.toWorld(e);

  // right-clicking an unselected object selects it first
  const hit = fromSelectionBar ? null : app.pickAt(wp);
  if (hit && !sel.has(hit.id)) app.setSelection([hit.id]);

  // Keep selection bar visible if selection exists
  if (app.surface.selection.size > 0 && !app.textEditor?.active) {
    updateSelectionBar(app);
  }

  const has = app.surface.selection.size > 0;
  const one = app.surface.selection.size === 1 ? app.store.get([...app.surface.selection][0]) : null;
  const editable = one && ['note', 'text', 'shape', 'table'].includes(one.type);

  const popOpts = {
    key: 'ctx',
    onClose: () => {
      if (app.surface.selection.size > 0 && !app.textEditor?.active) {
        updateSelectionBar(app);
      }
    }
  };

  // Determine side-by-side coordinates to prevent overlapping ctxbar
  let posX = e.clientX;
  let posY = e.clientY;
  if (ctxbar && ctxbar.classList.contains('show')) {
    const cr = ctxbar.getBoundingClientRect();
    const menuWidth = 220;
    if (cr.right + 8 + menuWidth <= window.innerWidth) {
      posX = cr.right + 8;
      posY = Math.max(10, Math.min(cr.top, window.innerHeight - 380));
    } else if (cr.left - 8 - menuWidth >= 0) {
      posX = cr.left - 8 - menuWidth;
      posY = Math.max(10, Math.min(cr.top, window.innerHeight - 380));
    }
  }

  const menu = h('div', { class: 'menu' });
  const allLocked = has && app.selected.every((o) => o.locked);
  // Lifting a cover is the one thing a cover is for, so it leads - locked or not.
  if (has && app.selected.some((o) => o.type === 'curtain' && !o.revealed)) {
    menu.appendChild(item(t('Reveal'), 'eye', () => app.command('curtain.reveal')));
    menu.appendChild(h('div', { class: 'menu-sep' }));
  }

  if (allLocked) {
    menu.appendChild(item(t('Unlock'), 'unlock', () => app.command('edit.lock')));
    menu.appendChild(h('div', { class: 'menu-sep' }));
    menu.appendChild(item(t('Copy'), 'copy', () => app.command('edit.copy'), { key: 'Ctrl+C' }));
    menu.appendChild(item(t('Copy as picture'), 'image', () => app.command('edit.copyPicture')));
    menu.appendChild(item(t('Export selection as PNG…'), 'image', () => app.command('export.pngSelection')));
    openPopover({ x: posX, y: posY }, menu, popOpts);
    return;
  }

  if (has) {
    if (editable) menu.appendChild(item(t('Edit text'), 'text', () => app.beginTextEdit(one), { key: 'F2' }));
    menu.appendChild(item(t('Cut'), 'copy', () => app.command('edit.cut'), { key: 'Ctrl+X' }));
    menu.appendChild(item(t('Copy'), 'copy', () => app.command('edit.copy'), { key: 'Ctrl+C' }));
    // Out of the board and into another app. Ctrl+C above keeps objects in here.
    menu.appendChild(item(t('Copy as picture'), 'image', () => app.command('edit.copyPicture')));
    if (app.selected.some((o) => ['text', 'note', 'shape', 'table'].includes(o.type) && (o.text || (o.cells && Object.keys(o.cells).length))))
      menu.appendChild(item(t('Copy text'), 'text', () => app.command('edit.copyText')));
    menu.appendChild(item(t('Duplicate'), 'duplicate', () => app.command('edit.duplicate'), { key: 'Ctrl+D' }));
    menu.appendChild(h('div', { class: 'menu-sep' }));
    const grouped = app.selectedGroups().size > 0;
    if (app.surface.selection.size > 1 && !grouped) {
      menu.appendChild(item(t('Group'), 'group', () => app.command('edit.group'), { key: 'Ctrl+G' }));
    }
    if (grouped) {
      if (app.selectedGroups().size === 1) {
        const named = app.selected.find((o) => o.groupName)?.groupName;
        menu.appendChild(item(named ? t('Rename group ({name})', { name: named }) : t('Name this group…'), 'text',
          () => app.command('edit.nameGroup')));
      }
      menu.appendChild(item(t('Ungroup'), 'ungroup', () => app.command('edit.ungroup'), { key: 'Ctrl+Shift+G' }));
      if (app.surface.selection.size > 1) {
        menu.appendChild(item(t('Group again'), 'group', () => app.command('edit.group'), { key: 'Ctrl+G' }));
      }
    }
    if (grouped || app.surface.selection.size > 1) menu.appendChild(h('div', { class: 'menu-sep' }));
    menu.appendChild(item(t('Bring to front'), 'front', () => app.command('order.front'), { key: 'Ctrl+Shift+]' }));
    menu.appendChild(item(t('Send to back'), 'front', () => app.command('order.back'), { key: 'Ctrl+Shift+[' }));
    menu.appendChild(h('div', { class: 'menu-sep' }));
    const locked = [...app.surface.selection].every((id) => app.store.get(id)?.locked);
    menu.appendChild(item(locked ? t('Unlock') : t('Lock'), locked ? 'unlock' : 'lock', () => app.command('edit.lock')));
    menu.appendChild(item(t('Export selection as PNG…'), 'image', () => app.command('export.pngSelection')));
    menu.appendChild(h('div', { class: 'menu-sep' }));
    menu.appendChild(item(t('Delete'), 'trash', () => app.command('edit.delete'), { key: 'Del', danger: true }));
  } else {
    // Pasted where you pressed, not back where the originals were - which is
    // the whole point of asking for it at a particular spot.
    menu.appendChild(item(t('Paste'), 'copy', () => app.pasteAt(wp), { key: 'Ctrl+V' }));
    menu.appendChild(item(t('Select all'), 'select', () => app.command('edit.selectAll'), { key: 'Ctrl+A' }));
    menu.appendChild(h('div', { class: 'menu-sep' }));
    menu.appendChild(item(t('Sticky note here'), 'note', () => app.addNoteAt(wp)));
    menu.appendChild(item(t('Text here'), 'text', () => app.addTextAt(wp)));
    menu.appendChild(item(t('Insert image…'), 'image', () => app.command('insert.image')));
    menu.appendChild(item(t('Insert maths'), 'maths', () => app.command('insert.math')));
    menu.appendChild(item(t('Insert document…'), 'doc', () => app.command('insert.document')));
    menu.appendChild(h('div', { class: 'menu-sep' }));
    menu.appendChild(item(t('Templates…'), 'template', () => app.panels.templates()));
    menu.appendChild(item(t('Canvas…'), 'palette', () => app.panels.background()));
    menu.appendChild(item(t('Clear canvas'), 'trash', () => app.command('edit.clear'), { danger: true }));
  }
  openPopover({ x: posX, y: posY }, menu, popOpts);
}

/* ------------------------------------------------------------------ *
 *  Floating toolbar above the current selection
 * ------------------------------------------------------------------ */
export function updateSelectionBar(app, targetObj = null) {
  const bar = document.getElementById('ctxbar');
  if (!bar) return;

  if (!bar._hoverBound) {
    bar._hoverBound = true;
    bar.addEventListener('mouseenter', () => {
      clearTimeout(app._hoverBarTimer);
    });
    bar.addEventListener('mouseleave', () => {
      if (!app.surface?.selection?.size) {
        clearTimeout(app._hoverBarTimer);
        app._hoverBarTimer = setTimeout(() => {
          if (!bar.matches(':hover') && !app.surface?.selection?.size) {
            bar.classList.remove('show');
          }
        }, 250);
      }
    });
  }

  if (app.textEditor?.active) { formatBar(app, bar); return; }
  if (bar.dataset.mode === 'format') { bar.dataset.mode = ''; bar.onmousedown = null; bar.innerHTML = ''; }
  const sel = targetObj ? [targetObj] : [...app.surface.selection].map((id) => app.store.get(id)).filter(Boolean);
  if (!sel.length) { bar.classList.remove('show'); return; }

  let box = null;
  if (targetObj) {
    const obox = boundsOf(targetObj) || targetObj;
    box = app.surface.screenBoxFor(obox, 10);
  } else {
    box = app.surface.selectionScreenBox(10);
  }
  if (!box) { bar.classList.remove('show'); return; }

  bar.innerHTML = '';
  const types = new Set(sel.map((o) => o.type));
  const allLocked = sel.every((o) => o.locked);
  /*
   * An answer cover gets a Reveal button with its name on it rather than an
   * icon alone: it is pressed in front of a class, and a teacher hunting for
   * the right little eye is the pause this whole feature exists to remove.
   */
  const covers = sel.filter((o) => o.type === 'curtain' && !o.revealed);
  const revealBtn = () => {
    const b = h('button', { title: t('Reveal what is underneath'), class: 'reveal-btn', html: icon('eye', 17) });
    b.insertAdjacentHTML('beforeend', t('<span>Reveal</span>'));
    b.addEventListener('click', () => app.command('curtain.reveal'));
    return b;
  };

  if (allLocked) {
    const label = h('span', { style: 'display:flex;align-items:center;gap:6px;padding:0 8px;font-size:12.5px;color:var(--text-2)' },
      h('span', { html: icon('lock', 15), style: 'display:flex' }),
      h('span', {}, sel.length > 1 ? t('{n} locked', { n: sel.length }) : t('Locked')));
    bar.appendChild(label);
    const unlock = h('button', { title: t('Unlock'), html: icon('unlock', 17) });
    unlock.addEventListener('click', () => app.command('edit.lock'));
    unlock.style.cssText += 'width:auto;padding:0 10px;gap:6px;color:var(--accent-2)';
    unlock.insertAdjacentHTML('beforeend', t('<span style="font-size:12.5px">Unlock</span>'));
    unlock.style.display = 'flex';
    unlock.style.alignItems = 'center';
    bar.appendChild(unlock);
    if (covers.length) bar.appendChild(revealBtn());
    appendMoreActions(app, bar);
    placeBar(bar, box);
    return;
  }

  const mk = (title, iconName, fn) => {
    const b = h('button', { title, html: icon(iconName, 17) });
    b.addEventListener('click', fn);
    return b;
  };

  // colour control, only for the things that actually have a colour
  const COLOURABLE = new Set(['stroke', 'shape', 'note', 'text', 'table', 'math', 'connector']);
  if (types.size === 1 && COLOURABLE.has([...types][0])) {
    const type = [...types][0];
    const swatch = h('button', { class: 'colour-btn', title: t('Colour') });
    const dot = h('span', {});
    const currentColor = type === 'shape' || type === 'connector' ? sel[0].stroke : sel[0].color;
    // the dot shows the colour as it is drawn: default ink is light on a dark board, so the dot is too
    const shownColor = FOLLOWS_BOARD.has(type) ? inkPaint(currentColor) : (currentColor || '#201f1e');
    dot.style.cssText = `width:17px;height:17px;border-radius:50%;background:${shownColor};box-shadow:inset 0 0 0 1px rgba(128,128,128,.45)`;
    dot.dataset.colour = shownColor;
    swatch.appendChild(dot);
    swatch.addEventListener('click', () => openColorPopover(app, swatch, type, sel));
    bar.appendChild(swatch);
  }

  if (covers.length) bar.appendChild(revealBtn());

  // arrows & lines: straight, elbow or curved, heads (none, end, both), thickness, and arrowhead size
  const isLinearShape = (o) => o.type === 'shape' && ['line', 'arrow', 'doubleArrow'].includes(o.kind);
  const isConnector = (o) => o.type === 'connector';
  const allLinear = sel.length > 0 && sel.every((o) => isConnector(o) || isLinearShape(o));

  if (allLinear) {
    if (sel.every(isConnector)) {
      const now = sel.every((o) => o.route === sel[0].route) ? (sel[0].route || 'straight') : null;
      for (const [route, label, ic] of [['straight', t('Straight arrow'), 'arrowStraight'], ['elbow', t('Elbow arrow'), 'arrowElbow'], ['curved', t('Curved arrow'), 'arrowCurved']]) {
        const b = mk(label, ic, () => { app.command('arrow.' + route); updateSelectionBar(app); });
        b.dataset.route = route;
        if (now === route) b.classList.add('on');
        bar.appendChild(b);
      }
      bar.appendChild(h('span', { class: 'bar-sep' }));
    }

    // Heads: Plain line, Single arrow, Both ways arrow
    const currentHeads = sel[0].heads || (sel[0].kind === 'line' ? 'none' : sel[0].kind === 'doubleArrow' ? 'both' : 'end');
    const headsList = [
      ['none', t('Plain line'), 'line'],
      ['end', t('Single arrow'), 'arrowRight'],
      ['both', t('Both ways arrow'), 'arrowBoth']
    ];
    for (const [hVal, label, ic] of headsList) {
      const b = mk(label, ic, () => {
        app.setArrowHeads(hVal);
        updateSelectionBar(app);
      });
      if (currentHeads === hVal) b.classList.add('on');
      bar.appendChild(b);
    }
    bar.appendChild(h('span', { class: 'bar-sep' }));

    // Body thickness controls
    bar.appendChild(mk(t('Decrease thickness'), 'minus', () => {
      app.stepLineWidth(-1.5);
      updateSelectionBar(app);
    }));
    bar.appendChild(mk(t('Increase thickness'), 'plus', () => {
      app.stepLineWidth(1.5);
      updateSelectionBar(app);
    }));

    // Arrowhead size scale
    bar.appendChild(mk(t('Arrowhead size'), 'arrowSize', () => {
      app.cycleArrowScale();
      updateSelectionBar(app);
    }));
    bar.appendChild(h('span', { class: 'bar-sep' }));
  }

  if ([...types].every((t) => ['note', 'text', 'shape', 'table'].includes(t)) && sel.length === 1)
    bar.appendChild(mk(t('Edit text (F2)'), 'text', () => app.beginTextEdit(sel[0])));
  if (sel.length === 1 && sel[0].type === 'math')
    bar.appendChild(mk(t('Edit maths (F2)'), 'maths', () => app.beginMathEdit(sel[0])));
  // a card for another board: open it, or point it at a different one
  if (sel.length === 1 && sel[0].type === 'boardlink') {
    const card = sel[0];
    bar.appendChild(mk(t('Open the board'), 'board', () => app.openBoardRef(card.board)));
    bar.appendChild(mk(t('Link to a different board'), 'link', () => app.relinkBoardCard(card.id)));
    bar.appendChild(mk(card.showThumb !== false ? t('Hide thumbnail') : t('Show thumbnail'), 'image', () => {
      app.store.update(card.id, { showThumb: !(card.showThumb !== false) });
      app.store.commit('toggle thumbnail', [card.id]);
      app.surface.invalidate();
    }));
  }

  if (sel.length === 1 && sel[0].type === 'image') {
    const imgObj = sel[0];
    bar.appendChild(mk(t('Crop image'), 'crop', () => startImageCrop(app, imgObj)));
    bar.appendChild(mk(t('Annotate image'), 'pen', () => startImageAnnotate(app, imgObj)));
  }

  // a table gets its own row and column controls
  if (sel.length === 1 && sel[0].type === 'table') {
    const tbl = sel[0];
    bar.appendChild(h('span', { class: 'bar-sep' }));
    bar.appendChild(mk(t('Add row'), 'rowAdd', () => app.command('table.addRow')));
    const lessRow = mk(t('Remove row'), 'rowDel', () => app.command('table.removeRow'));
    if ((tbl.rows | 0) <= 1) lessRow.disabled = true;
    bar.appendChild(lessRow);
    bar.appendChild(mk(t('Add column'), 'colAdd', () => app.command('table.addCol')));
    const lessCol = mk(t('Remove column'), 'colDel', () => app.command('table.removeCol'));
    if ((tbl.cols | 0) <= 1) lessCol.disabled = true;
    bar.appendChild(lessCol);
    bar.appendChild(h('span', { class: 'bar-sep' }));
  }

  // Touchscreens have no Ctrl to hold, so gathering several up is a mode here.
  if (matchMedia('(pointer: coarse)').matches) {
    const more = mk(app.multiSelect ? t('Done adding') : t('Add more to the selection'),
      app.multiSelect ? 'check' : 'select', () => app.setMultiSelect(!app.multiSelect));
    if (app.multiSelect) more.classList.add('on');
    bar.appendChild(more);
  }

  const grouped = app.selectedGroups().size > 0;
  if (grouped && app.selectedGroups().size === 1) {
    bar.appendChild(mk(t('Name this group'), 'text', () => app.command('edit.nameGroup')));
  }
  if (grouped) bar.appendChild(mk(t('Ungroup (Ctrl+Shift+G)'), 'ungroup', () => app.command('edit.ungroup')));
  else if (sel.length > 1) bar.appendChild(mk(t('Group (Ctrl+G)'), 'group', () => app.command('edit.group')));
  bar.appendChild(mk(t('Duplicate (Ctrl+D)'), 'duplicate', () => app.command('edit.duplicate')));
  bar.appendChild(mk(t('Bring to front'), 'front', () => app.command('order.front')));
  bar.appendChild(mk(sel.every((o) => o.locked) ? t('Unlock') : t('Lock'), sel.every((o) => o.locked) ? 'unlock' : 'lock', () => app.command('edit.lock')));
  bar.appendChild(mk(t('Delete (Del)'), 'trash', () => app.command('edit.delete')));

  appendMoreActions(app, bar);

  placeBar(bar, box, !!app.interaction?.selectionHasDots?.());
}

function appendMoreActions(app, bar) {
  // Android still needs this route when a mouse changes the primary pointer.
  if (document.documentElement?.dataset.platform !== 'android'
      && !(typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)) return;
  const button = h('button', { title: t('More actions'), html: icon('more', 17) });
  button.addEventListener('click', () => {
    const r = bar.getBoundingClientRect();
    // This button acts on the selection, not an object behind the toolbar.
    showContextMenu(app, { clientX: r.left + r.width - 12, clientY: r.bottom + 4 }, true);
  });
  bar.appendChild(button);
}

/*
 * Above the selection, clear of its rotate handle - and, when the selection
 * has arrow dots, clear of the top dot too, which sits above that handle
 * (and of the bottom dot, when there is no room above and the bar goes below).
 */
function placeBar(bar, box, dots = false) {
  bar.classList.add('show');
  const stage = document.getElementById('stage').getBoundingClientRect();
  const w = bar.offsetWidth || 200;
  let left = box.x + box.w / 2 - w / 2;
  left = Math.max(8, Math.min(left, stage.width - w - 8));
  let top = box.y - bar.offsetHeight - (dots ? 66 : 44);
  if (top < 8) top = Math.min(box.y + box.h + (dots ? 34 : 12), stage.height - bar.offsetHeight - 80);
  top = Math.max(8, Math.min(top, stage.height - bar.offsetHeight - 8));
  bar.style.left = left + 'px';
  bar.style.top = top + 'px';
}

function openColorPopover(app, anchor, type, sel) {
  const colors = type === 'note' ? NOTE_COLORS : (type === 'text' || type === 'math') ? TEXT_COLORS : (type === 'shape' || type === 'connector') ? SHAPE_STROKES : PEN_COLORS;
  const grid = h('div', { class: 'swatches' });
  for (const c of colors) {
    const b = h('button', { class: 'sw', title: c });
    // same as the toolbar's own picker: the default ink is shown as it draws, ringed to say it follows the board
    const shown = FOLLOWS_BOARD.has(type) ? inkPaint(c) : c;
    b.style.background = shown;
    if (shown !== c) {
      b.classList.add('sw-adaptive');
      b.title = t('{c} — follows the board: light on dark, black on white and in exports', { c });
    }
    b.addEventListener('click', () => {
      const key = type === 'shape' || type === 'connector' ? 'stroke' : 'color';
      /*
       * Only the selection changes. Recolouring one sticky note, one line of
       * text or one stroke used to quietly become the colour of the NEXT one
       * too - and a recoloured stroke even changed the pen in your hand - so
       * fixing one word's colour left every later word that colour until you
       * noticed. What comes next is set where you choose what comes next: the
       * tool's own picker on the toolbar.
       */
      app.store.updateMany(sel.map((o) => o.id), { [key]: c }, 'recolour');
      closePopover();
      app.surface.invalidate();
      updateSelectionBar(app);
    });
    grid.appendChild(b);
  }
  const body = h('div', {}, h('h4', {}, type === 'shape' ? t('Outline') : t('Colour')), grid);

  if (type === 'shape') {
    const fills = h('div', { class: 'swatches' });
    for (const c of SHAPE_FILLS) {
      const b = h('button', { class: 'sw', title: c === 'none' ? t('No fill') : c });
      b.style.background = c === 'none' ? 'repeating-linear-gradient(45deg,#fff,#fff 4px,#ddd 4px,#ddd 8px)' : c;
      b.addEventListener('click', () => {
        app.store.updateMany(sel.map((o) => o.id), { fill: c }, 'fill');
        closePopover(); app.surface.invalidate();
      });
      fills.appendChild(b);
    }
    body.appendChild(h('h4', { style: 'margin-top:12px' }, t('Fill')));
    body.appendChild(fills);
  }
  openPopover(anchor, body, { key: 'selcolor' });
}

/* ------------------------------------------------------------------ *
 *  The same bar, while typing: bold, italic, underline and colour
 *
 *  One bar in one place. When a box is selected it does what it always did;
 *  the moment you are typing into it, it turns into the format bar, so a
 *  second bar never pops up over the words. Whatever is highlighted gets the
 *  style; with nothing highlighted, it is what the next letters come out as.
 *
 *  Nothing in it may take the focus: the box commits the moment it loses it.
 *  So every press is swallowed at mousedown and the work is done on click.
 * ------------------------------------------------------------------ */
function formatBar(app, bar) {
  const te = app.textEditor;
  const el = te.el;
  if (!el) { bar.classList.remove('show'); return; }
  if (bar.dataset.mode !== 'format' || bar._for !== el) {
    bar.dataset.mode = 'format';
    bar._for = el;
    bar.innerHTML = '';
    bar.onmousedown = (e) => e.preventDefault();
    if (!bar._fmtHooked) {
      bar._fmtHooked = true;
      bar.addEventListener('pointerdown', (e) => { if (bar.dataset.mode === 'format') e.preventDefault(); });
    }
    const mk = (kind, title, label, css) => {
      const b = h('button', { title, class: 'fmt-btn', 'data-fmt': kind });
      b.appendChild(h('span', { style: css }, label));
      b.addEventListener('click', () => { te.format(kind); syncFormat(app, bar); });
      return b;
    };
    const mod = /Mac|iPhone|iPad/.test(navigator.platform || '') ? 'Cmd' : 'Ctrl';
    bar.appendChild(mk('bold', t('Bold ({key})', { key: mod + '+B' }), 'B', 'font-weight:700;font-size:15px'));
    bar.appendChild(mk('italic', t('Italic ({key})', { key: mod + '+I' }), 'I', 'font-style:italic;font-family:Georgia,serif;font-size:16px'));
    bar.appendChild(mk('underline', t('Underline ({key})', { key: mod + '+U' }), 'U', 'text-decoration:underline;font-size:15px'));
    bar.appendChild(h('span', { class: 'bar-sep' }));
    const colours = h('span', { class: 'fmt-colours' });
    const auto = h('button', { class: 'sw fmt-sw', title: t('Automatic colour'), 'data-colour': '' });
    auto.style.background = 'linear-gradient(135deg, var(--text) 50%, var(--surface) 50%)';
    auto.addEventListener('click', () => { te.colour(null); syncFormat(app, bar); });
    colours.appendChild(auto);
    for (const c of TEXT_COLORS.slice(1)) {
      const b = h('button', { class: 'sw fmt-sw', title: c, 'data-colour': c });
      b.style.background = c;
      b.addEventListener('click', () => { te.colour(c); syncFormat(app, bar); });
      colours.appendChild(b);
    }
    bar.appendChild(colours);
    bar.appendChild(h('span', { class: 'bar-sep' }));
    const paste = h('button', { title: t('Paste with formatting'), 'data-paste': '1', html: icon('paste', 17) });
    paste.addEventListener('click', () => te.pasteFromClipboard());
    bar.appendChild(paste);
  }
  syncFormat(app, bar);
  const stage = document.getElementById('stage').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  placeBar(bar, { x: r.left - stage.left, y: r.top - stage.top + 36, w: r.width, h: r.height });
}

function syncFormat(app, bar) {
  for (const b of bar.querySelectorAll('[data-fmt]')) b.classList.toggle('on', app.textEditor.state(b.dataset.fmt));
}

export function startImageCrop(app, imgObj) {
  closePopover();
  document.getElementById('cropOverlay')?.remove();

  const cropModal = h('div', {
    id: 'cropOverlay',
    style: 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;background:var(--surface);border:1px solid var(--stroke);border-radius:12px;padding:14px 18px;box-shadow:var(--shadow-3);display:flex;flex-direction:column;gap:10px;min-width:320px;'
  });

  const title = h('div', { style: 'font-weight:700;font-size:14px;color:var(--text);display:flex;align-items:center;justify-content:space-between;' },
    h('span', {}, t('Crop image')),
    h('button', {
      style: 'background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-2);',
      onclick: () => cropModal.remove()
    }, '✕')
  );

  const curCrop = imgObj.crop || { sx: 0, sy: 0, sw: 1, sh: 1 };
  let topPct = Math.round(curCrop.sy * 100);
  let leftPct = Math.round(curCrop.sx * 100);
  let rightPct = Math.round((1 - (curCrop.sx + curCrop.sw)) * 100);
  let bottomPct = Math.round((1 - (curCrop.sy + curCrop.sh)) * 100);

  const makeSlider = (label, val, onChange) => {
    return h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;' },
      h('span', { style: 'width:60px;' }, label),
      h('input', {
        type: 'range', min: '0', max: '45', value: String(val), style: 'flex:1;cursor:pointer;',
        oninput: (e) => onChange(Number(e.target.value))
      })
    );
  };

  const previewCrop = () => {
    const sx = leftPct / 100;
    const sy = topPct / 100;
    const sw = Math.max(0.1, 1 - (leftPct + rightPct) / 100);
    const sh = Math.max(0.1, 1 - (topPct + bottomPct) / 100);
    imgObj.crop = { sx, sy, sw, sh };
    app.surface.invalidate();
  };

  const sliderT = makeSlider(t('Top'), topPct, (v) => { topPct = v; previewCrop(); });
  const sliderB = makeSlider(t('Bottom'), bottomPct, (v) => { bottomPct = v; previewCrop(); });
  const sliderL = makeSlider(t('Left'), leftPct, (v) => { leftPct = v; previewCrop(); });
  const sliderR = makeSlider(t('Right'), rightPct, (v) => { rightPct = v; previewCrop(); });

  const btnRow = h('div', { style: 'display:flex;gap:8px;justify-content:flex-end;margin-top:4px;' });
  const btnReset = h('button', { class: 'btn', style: 'padding:4px 10px;font-size:12px;' }, t('Reset'));
  btnReset.onclick = () => {
    delete imgObj.crop;
    app.store.update(imgObj.id, { crop: null });
    app.store.commit('reset crop', [imgObj.id]);
    app.surface.invalidate();
    cropModal.remove();
    app.toast(t('Crop reset'));
  };

  const btnApply = h('button', { class: 'btn primary', style: 'padding:4px 12px;font-size:12px;' }, t('Apply'));
  btnApply.onclick = () => {
    const sx = leftPct / 100;
    const sy = topPct / 100;
    const sw = Math.max(0.1, 1 - (leftPct + rightPct) / 100);
    const sh = Math.max(0.1, 1 - (topPct + bottomPct) / 100);
    app.store.update(imgObj.id, { crop: { sx, sy, sw, sh } });
    app.store.commit('crop image', [imgObj.id]);
    app.surface.invalidate();
    cropModal.remove();
    app.toast(t('Image cropped'));
  };

  btnRow.appendChild(btnReset);
  btnRow.appendChild(btnApply);

  cropModal.appendChild(title);
  cropModal.appendChild(sliderT);
  cropModal.appendChild(sliderB);
  cropModal.appendChild(sliderL);
  cropModal.appendChild(sliderR);
  cropModal.appendChild(btnRow);

  document.body.appendChild(cropModal);
}

export function startImageAnnotate(app, imgObj) {
  closePopover();
  app._annotatingImage = imgObj.id;
  app.setTool('pen');
  app.syncUI();

  document.getElementById('annotateHud')?.remove();

  const hud = h('div', {
    id: 'annotateHud',
    style: 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:9999;background:var(--accent,#0078d4);color:#ffffff;border-radius:20px;padding:6px 16px;box-shadow:var(--shadow-3);display:flex;align-items:center;gap:12px;font-size:13px;font-weight:600;'
  });

  hud.appendChild(h('span', {}, t('Annotating "{name}" — write directly on image', { name: imgObj.name || t('Image') })));

  const btnDone = h('button', {
    class: 'btn',
    style: 'background:#ffffff;color:var(--accent,#0078d4);border:none;border-radius:14px;padding:3px 10px;font-size:12px;font-weight:700;cursor:pointer;'
  }, t('Done Annotating'));

  btnDone.onclick = () => finishImageAnnotate(app, imgObj);
  hud.appendChild(btnDone);
  document.body.appendChild(hud);

  app.toast(t('Annotate mode active: pen ink will become part of the image'));
}

export function finishImageAnnotate(app, imgObj) {
  document.getElementById('annotateHud')?.remove();
  const hostId = app._annotatingImage || imgObj?.id;
  app._annotatingImage = null;
  if (!hostId) return;

  const target = app.store.get(hostId);
  if (!target) return;

  const annotations = app.store.objects.filter((o) => o.attachedTo === hostId);
  if (annotations.length > 0) {
    const gid = target.groupId || ('g_' + Date.now());
    const gName = target.name ? t('Annotated {name}', { name: target.name }) : t('Annotated Image');
    const allIds = [target.id, ...annotations.map((a) => a.id)];
    app.store.updateMany(allIds, { groupId: gid, groupName: gName, locked: true }, 'annotate image');
    app.surface.invalidate();
    app.toast(t('Image and {n} annotations grouped & locked together', { n: annotations.length }));
  } else {
    app.toast(t('Annotation mode finished'));
  }
}

