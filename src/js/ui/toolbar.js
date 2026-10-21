// Bottom tool pill + its option popovers, plus the top bar wiring.

import { icon } from './icons.js';
import { openPopover, closePopover, h, isOpen } from './popover.js';
import {
  PEN_COLORS, PEN_EFFECTS, HIGHLIGHTER_COLORS, NOTE_COLORS, TEXT_COLORS,
  SHAPE_STROKES, SHAPE_FILLS, SHAPES, SHAPE_LABELS, shapeIcon,
  PENS, penList, penById, rememberPen, heldPenId, penIcon, FONTS
} from './palettes.js';
import { EMOJI_GROUPS, searchEmoji } from '../core/emoji.js';
import { inkPaint } from '../core/render.js';
import { t } from '../i18n.js';

const TOOL_ICON = {
  select: 'select', lasso: 'lasso', pen: 'pen', highlighter: 'highlighter',
  eraser: 'eraser', note: 'note', text: 'text', shape: 'shapes', emoji: 'emoji'
};
const CMD_ICON = { undo: 'undo', redo: 'redo', insert: 'insert', ruler: 'ruler', more: 'more' };

export function isPhoneLayout() {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(pointer: coarse)').matches
    && (matchMedia('(max-width: 760px)').matches || matchMedia('(max-height: 460px)').matches);
}

/**
 * Wires the Markdown toggle badge (`M↓`) and Wikilink button (`[[]]`) into
 * `#textFormatBar` if present in the DOM.
 */
export function wireTextFormatBarMarkdown(app) {
  const fmtBar = document.getElementById('textFormatBar');
  if (!fmtBar || fmtBar.querySelector('[data-cmd="markdownToggle"]')) return;

  const mdBtn = h('button', {
    class: 'tool tool-sm md-toggle-btn',
    title: t('Markdown'),
    style: 'font-weight:700;font-size:12px;padding:0 6px;'
  }, 'M↓');
  mdBtn.dataset.cmd = 'markdownToggle';
  mdBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const target = app.textEditor?.target || (app.surface?.selection?.size === 1 ? app.store.get([...app.surface.selection][0]) : null);
    if (target && (target.type === 'text' || target.type === 'note')) {
      const next = target.markdown === false;
      app.store.update(target.id, { markdown: next }, 'markdown mode');
      mdBtn.classList.toggle('active', next);
      app.surface.invalidate();
    } else if (app.textEditor?.active) {
      app.textEditor.toggleLivePreview();
      mdBtn.classList.toggle('active', app.textEditor.previewMode);
    }
  });

  const wlBtn = h('button', {
    class: 'tool tool-sm',
    title: t('Insert Wikilink'),
    style: 'font-weight:600;font-size:11.5px;padding:0 5px;'
  }, '[[]]');
  wlBtn.dataset.cmd = 'insertWikilink';
  wlBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (app.textEditor?.active) {
      app.textEditor.insertWikilinkSyntax();
    } else {
      app.command?.('insert.boardlink');
    }
  });

  fmtBar.appendChild(mdBtn);
  fmtBar.appendChild(wlBtn);
}

export function initToolbar(app) {
  const bar = document.getElementById('toolbar');
  bar.innerHTML = '';
  wireTextFormatBarMarkdown(app);
  if (isPhoneLayout()) { initPhoneToolbar(app, bar); wireTopBar(app); return; }

  const sep = (dataSep) => {
    const s = h('div', { class: 'sep' });
    if (dataSep) s.dataset.sep = dataSep;
    bar.appendChild(s);
    return s;
  };

  const iconTool = (opts) => {
    const b = h('button', { class: 'tool', title: opts.title });
    if (opts.tool) b.dataset.tool = opts.tool;
    if (opts.cmd) b.dataset.cmd = opts.cmd;
    if (opts.pop) b.dataset.pop = opts.pop;
    if (opts.ribbonId) {
      b.dataset.ribbonId = opts.ribbonId;
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        moveRibbonToolToPlus(app, opts.ribbonId);
      });
    }
    b.innerHTML = icon(opts.icon, 20);
    if (opts.dot) b.appendChild(h('span', { class: 'dot' }));
    if (opts.key) b.appendChild(h('span', { class: 'kbd' }, opts.key));
    b.addEventListener('click', (e) => opts.onClick(e, b));
    bar.appendChild(b);
    return b;
  };
  const toggleTool = (tool) => (e, b) => {
    const was = app.tool === tool;
    app.setTool(tool);
    app.syncUI();
    if (was) openToolPopover(app, b, tool); else closePopover();
  };

  iconTool({ ribbonId: 'select', tool: 'select', icon: 'select', key: 'V', title: t('Select (V)'), onClick: () => app.setTool('select') });
  iconTool({ ribbonId: 'lasso', tool: 'lasso', icon: 'lasso', key: 'L', title: t('Lasso select (L)'), onClick: () => app.setTool('lasso') });
  iconTool({ ribbonId: 'pan', tool: 'pan', icon: 'hand', key: 'G', title: t('Pan the canvas (G) \u2014 drag to move around. Space, the middle mouse button and the scroll wheel do this too'),
    onClick: () => app.setTool('pan') });
  iconTool({ ribbonId: 'laser', tool: 'laser', icon: 'laser', key: 'X', title: t('Laser pointer (X) \u2014 leaves a trail that fades; nothing is saved'),
    onClick: () => app.setTool('laser') });
  sep('1');

  /* ---- the pen tray ---- */
  for (const pen of PENS) {
    const b = h('button', { class: 'pen', title: t('{pen} ({n}) \u2014 click again for thickness', { pen: pen.label, n: PENS.indexOf(pen) + 1 }) });
    b.dataset.pen = pen.id;
    b.dataset.ribbonId = 'pen';
    if (pen.id === 'black') b.dataset.tool = 'pen';
    const now = penById(app.settings, pen.id) || pen;
    b.innerHTML = penIcon(inkPaint(now.color), now.effect) + '<span class="size-dot"></span>'
      + `<span class="kbd">${PENS.indexOf(pen) + 1}</span>`;
    b.dataset.paint = now.color + '|' + now.effect;
    b.addEventListener('click', () => choosePen(app, pen.id, b));
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      moveRibbonToolToPlus(app, 'pen');
    });
    bar.appendChild(b);
  }

  const hl = h('button', { class: 'pen', title: t('Highlighter (H) \u2014 click again for options') });
  hl.dataset.tool = 'highlighter';
  hl.dataset.ribbonId = 'highlighter';
  hl.innerHTML = penIcon(app.settings.highlighterColor, 'none', 'highlighter') + '<span class="kbd">H</span>';
  hl.addEventListener('click', (e) => toggleTool('highlighter')(e, hl));
  hl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    moveRibbonToolToPlus(app, 'highlighter');
  });
  bar.appendChild(hl);
  iconTool({ ribbonId: 'tape', tool: 'tape', icon: 'curtain', title: t('Study Tape'),
    onClick: () => { app.setTool('tape'); app.syncUI(); closePopover(); } });

  const er = h('button', { class: 'pen', title: t('Eraser (E) \u2014 click again for options') });
  er.dataset.tool = 'eraser';
  er.dataset.ribbonId = 'eraser';
  er.innerHTML = penIcon('#f7a8c4', 'none', 'eraser') + '<span class="kbd">E</span>';
  er.addEventListener('click', (e) => toggleTool('eraser')(e, er));
  er.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    moveRibbonToolToPlus(app, 'eraser');
  });
  bar.appendChild(er);
  sep('2');

  iconTool({ ribbonId: 'ruler', cmd: 'ruler', icon: 'ruler', title: t('Ruler (Ctrl+R)'), onClick: () => app.command('ruler') });
  iconTool({ ribbonId: 'text', tool: 'text', dot: true, key: 'T', title: t('Text (T) \u2014 click again for font and size'),
    onClick: toggleTool('text') });
  iconTool({ ribbonId: 'note', tool: 'note', dot: true, key: 'N', title: t('Sticky note (N) \u2014 click again for colours'),
    onClick: toggleTool('note') });
  iconTool({ ribbonId: 'shape', tool: 'shape', icon: 'shapes', dot: true, key: 'S', title: t('Shapes (S)'),
    onClick: (e, b) => { app.setTool('shape'); app.syncUI(); openToolPopover(app, b, 'shape'); } });
  iconTool({ ribbonId: 'emoji', tool: 'emoji', icon: 'emoji', title: t('Emoji \u2014 pick one to stamp on the board'),
    onClick: (e, b) => { app.setTool('emoji'); app.syncUI(); openToolPopover(app, b, 'emoji'); } });

  const pinnedSlot = h('div', { id: 'pinnedToolsSlot', style: 'display:contents' });
  bar.appendChild(pinnedSlot);
  renderPinnedTools(app, pinnedSlot);

  iconTool({ cmd: 'insert', icon: 'insert', pop: 'insert', title: t('Insert document, table or template'),
    onClick: (e, b) => openInsertPopover(app, b) });
  sep('3');

  iconTool({ cmd: 'undo', icon: 'undo', title: t('Undo (Ctrl+Z)'), onClick: () => app.command('undo') });
  iconTool({ cmd: 'redo', icon: 'redo', title: t('Redo (Ctrl+Y)'), onClick: () => app.command('redo') });
  iconTool({ cmd: 'more', icon: 'more', pop: 'more', title: t('More'), onClick: (e, b) => openMorePopover(app, b) });

  wireTopBar(app);
  syncRibbonTools(app);
}

export function getPinMetadata(app) {
  return {
    'insert.image': { icon: 'image', title: t('Insert image'), onClick: () => app.command('insert.image') },
    'insert.audio': { icon: 'audio', title: t('Insert audio or recording'), onClick: () => app.command('insert.audio') },
    'insert.document': { icon: 'doc', title: t('Insert document'), onClick: () => app.command('insert.document') },
    'insert.table': { icon: 'table', title: t('Insert table'), onClick: () => app.command('insert.table') },
    'insert.math': { icon: 'maths', title: t('Insert maths formula'), onClick: () => app.command('insert.math') },
    'insert.curtain': { icon: 'curtain', title: t('Answer cover'), onClick: () => app.command('insert.curtain') },
    'insert.boardlink': { icon: 'link', title: t('Link to a board'), onClick: () => app.command('insert.boardlink') },
    'timer.open': { icon: 'timer', title: t('Class timer'), onClick: () => app.command('timer.open') },
    'view.present': { icon: 'present', title: t('Present'), onClick: () => app.command('view.present') },
    'panels.templates': { icon: 'template', title: t('Templates'), onClick: () => app.panels.templates() }
  };
}

export function renderPinnedTools(app, slot = document.getElementById('pinnedToolsSlot')) {
  if (!slot) return;
  slot.innerHTML = '';
  if (!Array.isArray(app.settings.pinnedTools)) {
    app.settings.pinnedTools = ['insert.image'];
  }
  const metaMap = getPinMetadata(app);
  for (const pid of app.settings.pinnedTools) {
    const meta = metaMap[pid];
    if (!meta) continue;
    const b = h('button', {
      class: 'tool',
      title: `${meta.title} — ${t('Right-click to unpin')}`
    });
    b.dataset.cmd = pid;
    b.innerHTML = icon(meta.icon, 20);
    b.addEventListener('click', (e) => meta.onClick(e, b));
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      app.settings.pinnedTools = app.settings.pinnedTools.filter((id) => id !== pid);
      app.saveSettings();
      renderPinnedTools(app, slot);
      app.toast(t('Unpinned from ribbon'));
    });
    slot.appendChild(b);
  }
}

export function syncRibbonTools(app) {
  const bar = document.getElementById('toolbar');
  if (!bar) return;
  const hidden = new Set(app.settings.hiddenRibbonTools || []);

  bar.querySelectorAll('[data-ribbon-id]').forEach((el) => {
    const id = el.dataset.ribbonId;
    el.style.display = hidden.has(id) ? 'none' : '';
  });

  const slot = document.getElementById('pinnedToolsSlot');
  if (slot) {
    renderPinnedTools(app, slot);
  }

  const group1 = ['select', 'lasso', 'pan', 'laser'].some((id) => !hidden.has(id));
  const sep1 = bar.querySelector('[data-sep="1"]');
  if (sep1) sep1.style.display = group1 ? '' : 'none';

  const group2 = ['pen', 'highlighter', 'tape', 'eraser'].some((id) => !hidden.has(id));
  const sep2 = bar.querySelector('[data-sep="2"]');
  if (sep2) sep2.style.display = group2 ? '' : 'none';
}

export function moveRibbonToolToPlus(app, ribbonId) {
  if (!Array.isArray(app.settings.hiddenRibbonTools)) {
    app.settings.hiddenRibbonTools = [];
  }
  if (!app.settings.hiddenRibbonTools.includes(ribbonId)) {
    app.settings.hiddenRibbonTools.push(ribbonId);
    app.saveSettings();
  }
  syncRibbonTools(app);
  app.toast(t('Moved to + menu'));
}

export function restoreRibbonToolFromPlus(app, ribbonId) {
  if (Array.isArray(app.settings.hiddenRibbonTools)) {
    app.settings.hiddenRibbonTools = app.settings.hiddenRibbonTools.filter((id) => id !== ribbonId);
    app.saveSettings();
  }
  syncRibbonTools(app);
  app.toast(t('Pinned to ribbon'));
}

const PHONE_PENS = ['black', 'red', 'blue'];

function initPhoneToolbar(app, bar) {
  bar.classList.add('phone');

  const btn = (cls, title, html) => {
    const b = h('button', { class: cls, title });
    b.innerHTML = html;
    bar.appendChild(b);
    return b;
  };
  const sep = () => bar.appendChild(h('div', { class: 'sep' }));

  const pickPen = (pen, b) => choosePen(app, pen.id, b);

  for (const id of PHONE_PENS) {
    const pen = PENS.find((p) => p.id === id);
    if (!pen) continue;
    const now = penById(app.settings, pen.id) || pen;
    const b = btn('pen', t('{pen} — tap again for thickness', { pen: pen.label }),
      penIcon(inkPaint(now.color), now.effect) + '<span class="size-dot"></span>');
    b.dataset.pen = pen.id;
    b.dataset.paint = now.color + '|' + now.effect;
    if (pen.id === 'black') b.dataset.tool = 'pen';
    b.addEventListener('click', () => pickPen(pen, b));
  }

  const rest = btn('tool tool-sm', t('More pens and the highlighter'), icon('chevronUp', 18));
  rest.dataset.pop = 'pens';
  rest.addEventListener('click', () => {
    const body = h('div', { class: 'menu' });
    for (const pen of PENS) {
      if (PHONE_PENS.includes(pen.id)) continue;
      const now = penById(app.settings, pen.id) || pen;
      const row = h('button', { class: 'menu-item' },
        h('span', { html: penIcon(inkPaint(now.color), now.effect), style: 'display:flex;width:17px' }),
        h('span', {}, pen.label));
      row.addEventListener('click', () => { closePopover(); pickPen(pen, null); });
      body.appendChild(row);
    }
    body.appendChild(h('div', { class: 'menu-sep' }));
    body.appendChild(menuItem(t('Highlighter'), 'highlighter', () => { app.setTool('highlighter'); app.syncUI(); }));
    body.appendChild(menuItem(t('Study Tape'), 'curtain', () => { app.setTool('tape'); app.syncUI(); }));
    openPopover(rest, body, { key: 'pens' });
  });

  const er = btn('pen', t('Eraser — tap again for options'),
    penIcon('#f7a8c4', 'none', 'eraser'));
  er.dataset.tool = 'eraser';
  er.addEventListener('click', () => {
    const was = app.tool === 'eraser';
    app.setTool('eraser');
    app.syncUI();
    if (was) openToolPopover(app, er, 'eraser'); else closePopover();
  });
  sep();

  const fingerBtn = btn('tool tool-sm', t('Finger draws or moves the board'), icon('hand', 18));
  fingerBtn.dataset.cmd = 'fingerInk';
  fingerBtn.addEventListener('click', () => { app.toggleFingerInk(); syncToolbar(app); });

  const un = btn('tool tool-sm', t('Undo'), icon('undo', 18));
  un.dataset.cmd = 'undo';
  un.addEventListener('click', () => app.command('undo'));
  const re = btn('tool tool-sm', t('Redo'), icon('redo', 18));
  re.dataset.cmd = 'redo';
  re.addEventListener('click', () => app.command('redo'));
  sep();

  const add = btn('tool tool-sm', t('Add a note, text, shape, ruler or picture'), icon('plus', 18));
  add.dataset.pop = 'add';
  add.addEventListener('click', () => {
    const pickTool = (t) => () => { app.setTool(t); app.syncUI(); };
    openPopover(add, h('div', { class: 'menu' },
      menuItem(t('Sticky note'), 'note', pickTool('note')),
      menuItem(t('Text'), 'text', pickTool('text')),
      menuItem(t('Study Tape'), 'curtain', pickTool('tape')),
      menuItem(t('Maths'), 'maths', () => app.command('insert.math')),
      menuItem(t('Emoji'), 'emoji', () => { app.setTool('emoji'); app.syncUI(); openToolPopover(app, add, 'emoji'); }),
      menuItem(t('Shape'), 'shapes', () => { app.setTool('shape'); app.syncUI(); openToolPopover(app, add, 'shape'); }),
      menuItem(t('Paste'), 'copy', () => app.pasteAt(null)),
      menuItem(app.ruler.visible ? t('Hide ruler') : t('Ruler'), 'ruler', () => app.command('ruler')),
      h('div', { class: 'menu-sep' }),
      menuItem(t('Picture…'), 'image', () => app.command('insert.image')),
      menuItem(t('Document (Word, PowerPoint, PDF)…'), 'doc', () => app.command('insert.document')),
      menuItem(t('Table'), 'table', () => app.command('insert.table')),
      menuItem(t('Answer cover'), 'curtain', () => app.command('insert.curtain')),
      menuItem(t('Link to a board…'), 'link', () => app.command('insert.boardlink'))
    ), { key: 'add' });
  });

  const more = btn('tool tool-sm', t('More'), icon('more', 18));
  more.dataset.pop = 'more';
  more.addEventListener('click', () => {
    const pickTool = (t) => () => { app.setTool(t); app.syncUI(); };
    openPopover(more, h('div', { class: 'menu' },
      menuItem(t('Select'), 'select', pickTool('select')),
      menuItem(t('Lasso select'), 'lasso', pickTool('lasso')),
      menuItem(t('Move the board'), 'hand', pickTool('pan')),
      menuItem(t('Laser pointer'), 'laser', pickTool('laser')),
      h('div', { class: 'menu-sep' }),
      ...teachingItems(app),
      h('div', { class: 'menu-sep' }),
      menuItem(t('Boards…'), 'board', () => app.panels.boards()),
      menuItem(t('Templates…'), 'template', () => app.panels.templates()),
      menuItem(t('Canvas…'), 'palette', () => app.panels.background()),
      menuItem(t('Select all'), 'select', () => app.command('edit.selectAll')),
      h('div', { class: 'menu-sep' }),
      menuItem(t('Export as PNG…'), 'export', () => app.command('export.png')),
      menuItem(t('Export as PDF…'), 'doc', () => app.command('export.pdf')),
      menuItem(t('Save a copy…'), 'doc', () => app.command('board.save')),
      menuItem(t('Open board…'), 'board', () => app.command('board.open')),
      h('div', { class: 'menu-sep' }),
      menuItem(t('Share on this network…'), 'share', () => app.panels.sharing()),
      menuItem(t('Settings'), 'settings', () => app.panels.settings()),
      menuItem(t('About GazBoard'), 'board', () => app.showAbout()),
      menuItem(t('Clear canvas'), 'trash', () => app.command('edit.clear'), { danger: true })
    ), { key: 'more' });
  });
}

/* ---- top bar and zoom controls ---- */
function wireTopBar(app) {
  const top = [
    ['btnBoards', 'board', () => app.panels.boards()],
    ['btnTemplates', 'template', () => app.panels.templates()],
    ['btnBackground', 'palette', () => app.panels.background()],
    ['btnExport', 'export', (e) => openExportPopover(app, e.currentTarget)],
    ['btnPresent', 'present', () => app.command('view.present')],
    ['btnShare', 'share', () => app.panels.sharing()],
    ['btnSettings', 'settings', () => app.panels.settings()],
    ['btnHelp', 'help', () => app.showShortcuts()]
  ];
  const labels = { btnBoards: t('Boards'), btnTemplates: t('Templates'), btnBackground: t('Canvas'), btnExport: t('Export'), btnPresent: t('Present') };
  for (const [id, ic, fn] of top) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.innerHTML = icon(ic, 18) + (labels[id] ? `<span>${labels[id]}</span>` : '');
    el.addEventListener('click', fn);
  }

  const btnProps = document.getElementById('btnProperties');
  if (btnProps) {
    btnProps.addEventListener('click', () => {
      if (!app.propertiesDialog) {
        import('./properties-dialog.js').then((m) => {
          app.propertiesDialog = new m.PropertiesDialog(app);
          app.propertiesDialog.toggle();
        });
      } else {
        app.propertiesDialog.toggle();
      }
    });
  }

  const btnOmni = document.getElementById('btnOmniSearch');
  if (btnOmni) {
    btnOmni.addEventListener('click', () => {
      if (typeof app.toggleSearchDialog === 'function') {
        app.toggleSearchDialog();
      }
    });
  }

  const btnTopRec = document.getElementById('btnTopRecord');
  const lblTopTime = document.getElementById('topRecTime');
  if (btnTopRec) {
    let recTimer = null;
    let recStartTime = 0;

    const updateRecState = (isRecording) => {
      if (isRecording) {
        btnTopRec.style.boxShadow = '0 0 10px #ff3344, inset 0 0 4px #ff3344';
        btnTopRec.style.borderColor = '#ff3344';
        btnTopRec.style.color = '#ff3344';
        if (!recTimer) {
          recStartTime = Date.now();
          recTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recStartTime) / 1000);
            const m = Math.floor(elapsed / 60);
            const s = String(elapsed % 60).padStart(2, '0');
            if (lblTopTime) lblTopTime.textContent = `${m}:${s}`;
          }, 500);
        }
      } else {
        btnTopRec.style.boxShadow = 'none';
        btnTopRec.style.borderColor = 'var(--line,rgba(0,0,0,0.15))';
        btnTopRec.style.color = 'inherit';
        if (recTimer) {
          clearInterval(recTimer);
          recTimer = null;
        }
        if (lblTopTime) lblTopTime.textContent = t('Record');
      }
    };

    btnTopRec.addEventListener('click', async () => {
      if (!app.audioRecorder) {
        const { AudioRecorder } = await import('../core/audio-recorder.js');
        app.audioRecorder = new AudioRecorder(app);
      }
      if (app.audioRecorder.state === 'recording') {
        const track = await app.audioRecorder.stop();
        if (track && track.assetId) {
          if (!Array.isArray(app.store.doc.audioTracks)) app.store.doc.audioTracks = [];
          app.store.doc.audioTracks.push(track);
          app.audioBar?.open(track);
          if (typeof app.persist === 'function') await app.persist();
          if (app.replayBar?.updateAudioUI) app.replayBar.updateAudioUI();
          if (app.audioBar?.syncUI) app.audioBar.syncUI();
        }
        updateRecState(false);
        app.toast?.(t('Recording stopped and saved to board'));
      } else {
        await app.audioRecorder.start();
        if (app.audioRecorder.state === 'recording') {
          updateRecState(true);
          app.toast?.(t('Recording started... Speak while you write!'));
        }
      }
    });
  }

  app.updateTopProperties = () => {
    const container = document.getElementById('topPropertiesChips');
    if (!container) return;
    container.innerHTML = '';
    const doc = app.store?.doc;
    if (!doc) return;
    const tags = Array.isArray(doc.properties?.tags) ? doc.properties.tags : (Array.isArray(doc.tags) ? doc.tags : []);
    const aliases = Array.isArray(doc.properties?.aliases) ? doc.properties.aliases : (Array.isArray(doc.aliases) ? doc.aliases : []);

    if (aliases.length > 0) {
      const al = aliases[0];
      const chip = h('span', {
        class: 'prop-chip top-alias-chip',
        title: t('Board alias (Click to edit)'),
        style: 'cursor:pointer;font-size:11px;padding:2px 7px;border-radius:10px;background:rgba(168,85,247,0.12);color:#9333ea;font-weight:600;display:inline-flex;align-items:center;gap:3px;'
      }, h('span', { style: 'opacity:0.75;font-weight:400;' }, 'alias:'), al + (aliases.length > 1 ? ` (+${aliases.length - 1})` : ''));
      chip.addEventListener('click', () => {
        if (!app.propertiesDialog) {
          import('./properties-dialog.js').then((m) => {
            app.propertiesDialog = new m.PropertiesDialog(app);
            app.propertiesDialog.open();
          });
        } else {
          app.propertiesDialog.open();
        }
      });
      container.appendChild(chip);
    }

    if (tags.length > 0) {
      const tg = tags[0];
      const chip = h('span', {
        class: 'prop-chip top-tag-chip',
        title: t('Board tag (Click to edit)'),
        style: 'cursor:pointer;font-size:11px;padding:2px 7px;border-radius:10px;background:rgba(0,120,212,0.1);color:#0078d4;font-weight:600;display:inline-flex;align-items:center;gap:3px;'
      }, h('span', { style: 'opacity:0.75;font-weight:400;' }, 'tag:'), tg + (tags.length > 1 ? ` (+${tags.length - 1})` : ''));
      chip.addEventListener('click', () => {
        if (!app.propertiesDialog) {
          import('./properties-dialog.js').then((m) => {
            app.propertiesDialog = new m.PropertiesDialog(app);
            app.propertiesDialog.open();
          });
        } else {
          app.propertiesDialog.open();
        }
      });
      container.appendChild(chip);
    }
  };
  setTimeout(() => app.updateTopProperties?.(), 100);

  document.getElementById('panelClose').innerHTML = icon('close', 18);

  for (const [sel, name] of [['[data-cmd="zoomOut"]', 'zoomOut'], ['[data-cmd="zoomIn"]', 'zoomIn'], ['[data-cmd="fit"]', 'fit']]) {
    const el = document.querySelector('#zoombar ' + sel);
    el.innerHTML = icon(name, 18);
    el.addEventListener('click', () => app.command(name));
  }
  const zoomLabel = document.getElementById('zoomLabel');
  let zoomHoverTimer = null;
  const showZoomMenu = () => openZoomPresetPopover(app, zoomLabel);
  zoomLabel.addEventListener('mouseenter', () => {
    zoomHoverTimer = setTimeout(showZoomMenu, 240);
  });
  zoomLabel.addEventListener('mouseleave', () => clearTimeout(zoomHoverTimer));
  zoomLabel.addEventListener('click', () => {
    clearTimeout(zoomHoverTimer);
    showZoomMenu();
  });

  initPagebar(app);
}

const ZOOM_PRESETS = [900, 400, 200, 100, 50, 25];
function loadStarredZooms() {
  try {
    return JSON.parse(localStorage.getItem('gazboard:starred_zooms') || '[100, 200, 50]');
  } catch { return [100, 200, 50]; }
}
function saveStarredZooms(list) {
  localStorage.setItem('gazboard:starred_zooms', JSON.stringify(list));
}

function openZoomPresetPopover(app, anchor) {
  const currentPct = Math.round((app.surface?.cam?.z || 1) * 100);
  let starred = loadStarredZooms();
  const wrap = h('div', { class: 'menu zoom-presets-menu' });

  const list = h('div', { class: 'zoom-preset-list' });
  for (const pct of ZOOM_PRESETS) {
    const isStarred = starred.includes(pct);
    const isCurrent = Math.abs(currentPct - pct) < 3;
    const item = h('div', { class: `zoom-preset-item${isStarred ? ' starred' : ''}${isCurrent ? ' active' : ''}` });

    const starBtn = h('button', {
      class: 'zoom-star-btn',
      title: isStarred ? t('Remove from favorites') : t('Add to favorites')
    }, isStarred ? '★' : '☆');

    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      starred = isStarred ? starred.filter((p) => p !== pct) : [...starred, pct];
      saveStarredZooms(starred);
      openZoomPresetPopover(app, anchor);
    });

    const labelBtn = h('button', { class: 'zoom-val-btn' }, `${pct}%`);
    labelBtn.addEventListener('click', () => {
      app.zoomTo(pct / 100);
      closePopover();
    });

    item.appendChild(starBtn);
    item.appendChild(labelBtn);
    list.appendChild(item);
  }
  wrap.appendChild(list);
  wrap.appendChild(h('div', { class: 'menu-sep' }));

  wrap.appendChild(menuItem(t('Fit width'), 'fitWidth', () => { app.fitWidth(); closePopover(); }));
  wrap.appendChild(menuItem(t('Fit height'), 'fitHeight', () => { app.fitHeight(); closePopover(); }));
  wrap.appendChild(menuItem(t('Fit to page'), 'fitPage', () => { app.command('view.fitPage'); closePopover(); }));
  wrap.appendChild(menuItem(t('Fit to board'), 'fit', () => { app.command('fit'); closePopover(); }));

  openPopover(anchor, wrap, { align: 'above-center' });
}

function initPagebar(app) {
  const bar = document.getElementById('pagebar');
  if (!bar) return;
  const btn = (k) => bar.querySelector(`[data-page="${k}"]`);
  btn('prev').innerHTML = icon('back', 18);
  btn('next').innerHTML = `<span style="display:flex;transform:rotate(180deg)">${icon('back', 18)}</span>`;
  btn('add').innerHTML = icon('insert', 18);
  btn('more').innerHTML = icon('more', 18);

  btn('prev').addEventListener('click', () => app.command('page.prev'));
  btn('next').addEventListener('click', () => app.command('page.next'));
  btn('add').addEventListener('click', () => app.command('page.add'));
  document.getElementById('pageLabel').addEventListener('click', () => app.command('view.fitPage'));

  btn('more').addEventListener('click', (e) => {
    const last = app.pageCount <= 1;
    openPopover(e.currentTarget, h('div', { class: 'menu' },
      menuItem(t('Add a page after this one'), 'insert', () => app.command('page.add')),
      menuItem(t('Duplicate this page'), 'duplicate', () => app.command('page.duplicate')),
      menuItem(t('Fit the whole pad in the window'), 'fit', () => app.command('view.fitAllPages')),
      menuItem(t('Fit everything onto the paper'), 'shapes', () => app.command('page.fitContent')),
      h('div', { class: 'menu-sep' }),
      menuItem(t('Delete this page'), 'trash', () => app.command('page.delete'), { danger: true, disabled: last })
    ), { align: 'end' });
  });
}

function syncPagebar(app) { app.syncPageLabel(); }

function markActive(wrap, el, cls = 'active') {
  for (const sib of wrap.children) sib.classList.remove(cls);
  el.classList.add(cls);
}

function swatchRow(colors, current, onPick, extra = []) {
  const wrap = h('div', { class: 'swatches' });
  for (const c of colors) {
    const b = h('button', { class: 'sw' + (c === current ? ' active' : ''), title: c, 'aria-label': c });
    const shown = inkPaint(c);
    b.style.background = shown;
    if (shown !== c) {
      b.classList.add('sw-adaptive');
      b.title = t('{c} — follows the board: light on dark, black on white and in exports', { c });
    }
    b.addEventListener('click', () => { markActive(wrap, b); onPick(c); });
    wrap.appendChild(b);
  }
  for (const e of extra) wrap.appendChild(e);
  return wrap;
}

function sizeRow(sizes, current, onPick, color = '#201f1e') {
  const wrap = h('div', { class: 'sizes' });
  const dotColor = inkPaint(color);
  for (const s of sizes) {
    const b = h('button', { class: 'size' + (s === current ? ' active' : ''), title: t('{s} px', { s }) });
    const dotSize = Math.max(4, Math.min(22, s));
    b.innerHTML = `<i style="width:${dotSize}px;height:${dotSize}px;background:${dotColor}"></i>`;
    b.addEventListener('click', () => { markActive(wrap, b); onPick(s); });
    wrap.appendChild(b);
  }
  return wrap;
}

function fontRow(fonts, current, onPick) {
  const wrap = h('div', { class: 'font-row' });
  for (const f of fonts) {
    const b = h('button', { class: 'font-opt' + (f.id === current ? ' active' : ''), title: f.label });
    b.innerHTML = `<span style="font-family:${f.stack}">Aa</span><small>${f.label}</small>`;
    b.addEventListener('click', () => { markActive(wrap, b); onPick(f.id); });
    wrap.appendChild(b);
  }
  return wrap;
}

function toggle(label, checked, onChange) {
  const input = h('input', { type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'toggle' }, input, h('span', {}, label));
}

function emojiPicker(app) {
  const s = app.settings;
  const results = h('div', { class: 'emoji-grid' });
  const sections = h('div', { class: 'emoji-sections' });

  const choose = (ch) => {
    app.rememberEmoji(ch);
    const swapped = app.applyToSelection({ ch }, 'emoji');
    if (!swapped) app.setTool('emoji');
    app.syncUI();
    closePopover();
  };

  const cell = (e) => {
    const b = h('button', { class: 'emoji-cell' + (e.ch === s.emojiChar ? ' active' : ''), title: e.name });
    b.textContent = e.ch;
    b.addEventListener('click', () => choose(e.ch));
    return b;
  };

  const search = h('input', {
    class: 'emoji-search', type: 'search', placeholder: t('Search \u2014 tick, arrow, idea\u2026'),
    autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false'
  });

  const render = () => {
    const q = search.value.trim();
    results.replaceChildren();
    if (!q) {
      results.style.display = 'none';
      sections.style.display = '';
      return;
    }
    sections.style.display = 'none';
    results.style.display = '';
    const found = searchEmoji(q);
    if (!found.length) {
      results.appendChild(h('div', { class: 'emoji-empty' }, t('Nothing matches \u201c{q}\u201d', { q })));
      return;
    }
    for (const e of found) results.appendChild(cell(e));
  };

  search.addEventListener('input', render);
  search.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closePopover(); }
  });
  search.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    const first = searchEmoji(search.value.trim(), 1)[0];
    if (first) { ev.preventDefault(); choose(first.ch); }
  });

  const recent = (s.emojiRecent || []).filter(Boolean);
  if (recent.length) {
    const row = h('div', { class: 'emoji-grid' });
    for (const ch of recent) row.appendChild(cell({ ch, name: t('Recently used') }));
    sections.appendChild(h('h4', {}, t('Recent')));
    sections.appendChild(row);
  }
  for (const g of EMOJI_GROUPS) {
    const row = h('div', { class: 'emoji-grid' });
    for (const e of g.items) row.appendChild(cell(e));
    sections.appendChild(h('h4', {}, g.label));
    sections.appendChild(row);
  }

  const body = h('div', { class: 'emoji-pop' }, search, results, sections);
  render();
  if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => search.focus(), 0);
  return body;
}

export function pickPenInk(app, c) {
  const s = app.settings;
  s.penColor = c; s.penEffect = 'none';
  const held = heldPenId(s);
  if (held) rememberPen(s, held, { color: c, effect: 'none' });
  app.saveSettings(); app.syncUI();
}

/* ------------------------------------------------------------------ */
export function openToolPopover(app, anchor, tool) {
  const s = app.settings;
  let body;

  if (tool === 'pen') {
    const effects = h('div', { class: 'row' },
      ...PEN_EFFECTS.map((e) => {
        const b = h('button', { class: 'btn' + (s.penEffect === e.id ? ' primary' : '') }, e.label);
        b.style.padding = '4px 10px';
        b.style.fontSize = '12.5px';
        b.addEventListener('click', () => {
          markActive(effects, b, 'primary');
          s.penEffect = e.id;
          const held = heldPenId(s);
          if (held) rememberPen(s, held, { color: s.penColor, effect: e.id });
          app.saveSettings();
          app.syncUI();
        });
        return b;
      })
    );
    const pickInk = (c) => pickPenInk(app, c);
    const customInk = h('label', { class: 'sw sw-custom', title: t('Any colour — used exactly as picked, whatever the theme') });
    const customInput = h('input', { type: 'color' });
    customInput.value = s.penColor || '#201f1e';
    customInput.addEventListener('input', () => { customInk.style.background = customInput.value; pickInk(customInput.value); });
    customInk.style.background = s.penColor || '#201f1e';
    customInk.appendChild(customInput);

    body = h('div', {},
      h('h4', {}, t('Ink colour')),
      swatchRow(PEN_COLORS, s.penEffect === 'none' ? s.penColor : null, (c) => {
        pickInk(c); closePopover();
      }, [customInk]),
      h('div', { class: 'row', style: 'margin-top:12px' }, h('label', {}, t('Effect'))),
      effects,
      h('h4', { style: 'margin-top:6px' }, t('Thickness')),
      sizeRow([2, 4, 7, 12, 20], s.penWidth, (v) => { s.penWidth = v; app.saveSettings(); app.syncUI(); }, s.penColor),
      h('div', { class: 'row', style: 'margin-top:12px' },
        toggle(t('Straighten shapes I draw'), s.inkToShape, (v) => {
          s.inkToShape = v;
          app.saveSettings();
          app.toast(v ? t('Hand-drawn shapes will be straightened') : t('Ink is left exactly as drawn'), 'pen');
        })),
      h('div', { class: 'row' },
        toggle(t('Ruler snapping'), app.ruler.snap, (v) => { app.ruler.snap = v; }))
    );
  } else if (tool === 'highlighter') {
    const curOpacity = Math.round(((s.highlighterOpacity ?? 0.5)) * 100);
    const opacityVal = h('span', { style: 'font-size:12px;font-weight:600;min-width:36px;text-align:right;' }, `${curOpacity}%`);
    const opacitySlider = h('input', {
      type: 'range', min: '10', max: '100', step: '5', value: String(curOpacity),
      style: 'flex:1;cursor:pointer;accent-color:var(--accent,#0078d4);'
    });
    opacitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      s.highlighterOpacity = val / 100;
      opacityVal.textContent = `${val}%`;
      app.saveSettings();
      app.syncUI();
    });

    const popToggle = toggle(t('Text color-popping'), s.highlighterColorPop !== false, (v) => {
      s.highlighterColorPop = v;
      app.saveSettings();
    });

    body = h('div', { style: 'min-width:240px' },
      h('h4', {}, t('Highlighter')),
      swatchRow(HIGHLIGHTER_COLORS, s.highlighterColor, (c) => { s.highlighterColor = c; app.saveSettings(); app.syncUI(); closePopover(); }),
      h('h4', { style: 'margin-top:12px' }, t('Thickness')),
      sizeRow([12, 20, 30, 44], s.highlighterWidth, (v) => { s.highlighterWidth = v; app.saveSettings(); app.syncUI(); }, s.highlighterColor),
      h('h4', { style: 'margin-top:12px' }, t('Opacity')),
      h('div', { style: 'display:flex;align-items:center;gap:10px;margin-top:4px;' }, opacitySlider, opacityVal),
      h('div', { style: 'margin-top:12px;' }, popToggle)
    );
  } else if (tool === 'eraser') {
    const mkMode = (id, label, hint) => {
      const b = h('button', { class: 'menu-item' + (s.eraserMode === id ? ' active-mode' : '') },
        h('span', { style: 'display:flex;flex-direction:column;gap:2px;text-align:left' },
          h('span', {}, label),
          h('small', { style: 'color:var(--text-2);font-size:11.5px' }, hint)),
        s.eraserMode === id ? h('span', { class: 'k', html: '&#10003;' }) : null);
      b.style.alignItems = 'flex-start';
      b.addEventListener('click', () => {
        if (id === 'all') { app.command('edit.clear'); closePopover(); return; }
        s.eraserMode = id; app.saveSettings(); openToolPopover(app, anchor, 'eraser');
      }, { once: false });
      return b;
    };
    body = h('div', { style: 'min-width:270px' },
      h('h4', {}, t('Eraser size')),
      sizeRow([10, 16, 30, 60], s.eraserSize, (v) => { s.eraserSize = v; app.saveSettings(); app.syncUI(); }),
      h('h4', { style: 'margin-top:14px' }, t('Mode')),
      h('div', { class: 'menu', style: 'padding:0' },
        mkMode('partial', t('Erase parts of ink'), t('Rubs strokes out where you drag')),
        mkMode('object', t('Erase whole strokes'), t('Removes a whole stroke in one touch')),
        mkMode('all', t('Erase everything'), t('Clears the canvas'))),
      h('h4', { style: 'margin-top:14px' }, t('Gesture scratch-out')),
      h('div', { style: 'display:flex;align-items:center;justify-content:space-between;padding:4px 0;' },
        h('span', { style: 'font-size:12.5px;' }, t('Scribble over ink to erase')),
        (() => {
          const active = s.scratchOut !== false;
          const toggleBtn = h('button', {
            class: 'btn' + (active ? ' primary' : ''),
            style: 'padding:3px 10px;font-size:11.5px;font-weight:600;'
          }, active ? t('ON') : t('OFF'));
          toggleBtn.addEventListener('click', () => {
            s.scratchOut = !(s.scratchOut !== false);
            app.saveSettings();
            if (app.replayBar?.updateScratchUI) app.replayBar.updateScratchUI();
            openToolPopover(app, anchor, 'eraser');
          });
          return toggleBtn;
        })()
      )
    );
  } else if (tool === 'note') {
    body = h('div', {},
      h('h4', {}, t('Note colour')),
      swatchRow(NOTE_COLORS, s.noteColor, (c) => { s.noteColor = c; app.saveSettings(); app.syncUI(); app.applyToSelection({ color: c }, 'note'); closePopover(); }),
      h('h4', { style: 'margin-top:12px' }, t('Size')),
      h('div', { class: 'row' }, ...[[t('Small'), 140], [t('Medium'), 200], [t('Large'), 280]].map(([l, v]) => {
        const b = h('button', { class: 'btn' + (s.noteSize === v ? ' primary' : '') }, l);
        b.style.fontSize = '12.5px';
        b.addEventListener('click', () => { markActive(b.parentNode, b, 'primary'); s.noteSize = v; app.saveSettings(); });
        return b;
      })),
      h('h4', { style: 'margin-top:12px' }, t('Font')),
      fontRow(FONTS, s.noteFont, (id) => {
        s.noteFont = id; app.saveSettings(); app.applyToSelection({ font: id }, 'note');
      }),
      h('div', { class: 'row', style: 'margin-top:12px' },
        toggle(t('Markdown'), s.noteMarkdown !== false, (v) => {
          s.noteMarkdown = v;
          app.saveSettings();
          app.applyToSelection({ markdown: v }, 'note');
          app.surface?.invalidate();
        })
      )
    );
  } else if (tool === 'text') {
    body = h('div', {},
      h('h4', {}, t('Text colour')),
      swatchRow(TEXT_COLORS, s.textColor, (c) => { s.textColor = c; app.saveSettings(); app.syncUI(); app.applyToSelection({ color: c }, 'text'); closePopover(); }),
      h('h4', { style: 'margin-top:12px' }, t('Size')),
      sizeRow([16, 24, 32, 48, 72], s.textSize, (v) => { s.textSize = v; app.saveSettings(); app.applyToSelection({ fontSize: v }, 'text'); }),
      h('h4', { style: 'margin-top:12px' }, t('Font')),
      fontRow(FONTS, s.textFont, (id) => {
        s.textFont = id; app.saveSettings(); app.applyToSelection({ font: id }, 'text');
      }),
      h('div', { class: 'row', style: 'margin-top:12px' },
        toggle(t('Markdown'), s.textMarkdown !== false, (v) => {
          s.textMarkdown = v;
          app.saveSettings();
          app.applyToSelection({ markdown: v }, 'text');
          app.surface?.invalidate();
        })
      )
    );
  } else if (tool === 'emoji') {
    body = emojiPicker(app);
  } else if (tool === 'shape') {
    const grid = h('div', { class: 'shape-grid' });
    for (const k of SHAPES) {
      const b = h('button', { class: 'shape-btn' + (s.shapeKind === k ? ' active' : ''), title: SHAPE_LABELS[k] });
      b.innerHTML = shapeIcon(k, 22);
      b.addEventListener('click', () => { markActive(grid, b); s.shapeKind = k; app.saveSettings(); app.setTool('shape'); app.syncUI(); });
      grid.appendChild(b);
    }
    const fills = h('div', { class: 'swatches' });
    for (const c of SHAPE_FILLS) {
      const b = h('button', { class: 'sw' + (c === s.shapeFill ? ' active' : ''), title: c === 'none' ? t('No fill') : c });
      b.style.background = c === 'none' ? 'repeating-linear-gradient(45deg,#fff,#fff 4px,#ddd 4px,#ddd 8px)' : c;
      b.addEventListener('click', () => { markActive(fills, b); s.shapeFill = c; app.saveSettings(); app.applyToSelection({ fill: c }, 'shape'); });
      fills.appendChild(b);
    }
    body = h('div', {},
      h('h4', {}, t('Shape')), grid,
      h('h4', { style: 'margin-top:12px' }, t('Outline')),
      swatchRow(SHAPE_STROKES, s.shapeStroke, (c) => { s.shapeStroke = c; app.saveSettings(); app.applyToSelection({ stroke: c }, 'shape'); }),
      h('h4', { style: 'margin-top:12px' }, t('Fill')), fills,
      h('h4', { style: 'margin-top:12px' }, t('Line width')),
      sizeRow([1, 2, 3, 5, 8], s.shapeLineWidth, (v) => { s.shapeLineWidth = v; app.saveSettings(); app.applyToSelection({ lineWidth: v }, 'shape'); }, s.shapeStroke)
    );
  }

  openPopover(anchor, body, { key: 'tool:' + tool });
}

/* ------------------------------------------------------------------ */
function menuItem(label, iconName, onClick, opts = {}) {
  let pinBtn = null;
  if (opts.pinKey) {
    pinBtn = h('span', {
      class: 'menu-pin' + (opts.isPinned ? ' pinned' : ''),
      title: opts.isPinned ? t('Unpin from ribbon') : t('Pin to ribbon'),
      style: `margin-left:auto;padding:2px 6px;cursor:pointer;opacity:${opts.isPinned ? '1' : '0.35'};font-size:13px;display:flex;align-items:center;transition:opacity .15s;`
    }, opts.isPinned ? '📌' : '📍');
    pinBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      opts.onTogglePin?.(pinBtn);
    });
  }

  const b = h('button', { class: 'menu-item' + (opts.danger ? ' danger' : '') },
    h('span', { html: icon(iconName, 17), style: 'display:flex' }),
    h('span', {}, label),
    opts.key ? h('span', { class: 'k' }, opts.key) : null,
    pinBtn
  );
  if (opts.disabled) b.setAttribute('disabled', '');
  b.addEventListener('click', (e) => {
    if (e.target.closest('.menu-pin')) return;
    closePopover();
    onClick();
  });
  return b;
}

function teachingItems(app) {
  const lifted = app.store.objects.some((o) => o.type === 'curtain' && o.revealed);
  return [
    menuItem(app.presenting ? t('Stop presenting') : t('Present'), 'present', () => app.command('view.present'), { key: app.presenting ? 'Esc' : 'F5' }),
    menuItem(app.timer?.visible ? t('Close the class timer') : t('Class timer'), 'timer', () => app.command('timer.open')),
    menuItem(t('Cover answers again'), 'curtain', () => app.command('curtain.coverAll'), { disabled: !lifted })
  ];
}

export function openInsertPopover(app, anchor) {
  if (!Array.isArray(app.settings.pinnedTools)) {
    app.settings.pinnedTools = ['insert.image'];
  }
  if (!Array.isArray(app.settings.hiddenRibbonTools)) {
    app.settings.hiddenRibbonTools = [];
  }
  const pinnedSet = new Set(app.settings.pinnedTools);
  const hiddenRibbonSet = new Set(app.settings.hiddenRibbonTools);

  const toggleInsertPin = (id, pinBtn) => {
    let isPinned;
    if (pinnedSet.has(id)) {
      pinnedSet.delete(id);
      isPinned = false;
    } else {
      pinnedSet.add(id);
      isPinned = true;
    }
    app.settings.pinnedTools = [...pinnedSet];
    app.saveSettings();

    pinBtn.textContent = isPinned ? '📌' : '📍';
    pinBtn.style.opacity = isPinned ? '1' : '0.35';
    pinBtn.classList.toggle('pinned', isPinned);
    pinBtn.title = isPinned ? t('Unpin from ribbon') : t('Pin to ribbon');

    renderPinnedTools(app);
    app.toast(isPinned ? t('Pinned to ribbon') : t('Unpinned from ribbon'));
  };

  const toggleRibbonToolPin = (id, pinBtn) => {
    let isPinned;
    if (hiddenRibbonSet.has(id)) {
      hiddenRibbonSet.delete(id);
      isPinned = true;
    } else {
      hiddenRibbonSet.add(id);
      isPinned = false;
    }
    app.settings.hiddenRibbonTools = [...hiddenRibbonSet];
    app.saveSettings();

    pinBtn.textContent = isPinned ? '📌' : '📍';
    pinBtn.style.opacity = isPinned ? '1' : '0.35';
    pinBtn.classList.toggle('pinned', isPinned);
    pinBtn.title = isPinned ? t('Unpin from ribbon') : t('Pin to ribbon');

    syncRibbonTools(app);
    app.toast(isPinned ? t('Pinned to ribbon') : t('Moved to + menu'));
  };

  const insertItem = (label, iconName, onClick, id, key = null) => {
    const isPinned = pinnedSet.has(id);
    return menuItem(label, iconName, onClick, {
      key,
      pinKey: id,
      isPinned,
      onTogglePin: (btn) => toggleInsertPin(id, btn)
    });
  };

  const ribbonToolItem = (label, iconName, onClick, id, key = null) => {
    const isPinned = !hiddenRibbonSet.has(id);
    return menuItem(label, iconName, onClick, {
      key,
      pinKey: id,
      isPinned,
      onTogglePin: (btn) => toggleRibbonToolPin(id, btn)
    });
  };

  const body = h('div', { class: 'menu', style: 'max-height:80vh;overflow-y:auto;' },
    h('div', { class: 'menu-title', style: 'padding:4px 8px;font-size:11px;font-weight:700;color:var(--text-3,rgba(0,0,0,0.5));text-transform:uppercase;letter-spacing:0.5px;' }, t('Insert objects')),
    insertItem(t('Image…'), 'image', () => app.command('insert.image'), 'insert.image'),
    insertItem(t('Audio / Recording…'), 'audio', () => app.command('insert.audio'), 'insert.audio'),
    insertItem(t('Document (Word, PowerPoint, PDF)…'), 'doc', () => app.command('insert.document'), 'insert.document'),
    insertItem(t('Table'), 'table', () => app.command('insert.table'), 'insert.table'),
    insertItem(t('Maths'), 'maths', () => app.command('insert.math'), 'insert.math'),
    insertItem(t('Answer cover'), 'curtain', () => app.command('insert.curtain'), 'insert.curtain'),
    insertItem(t('Link to a board…'), 'link', () => app.command('insert.boardlink'), 'insert.boardlink', '@'),
    insertItem(t('Class timer'), 'timer', () => app.command('timer.open'), 'timer.open'),
    insertItem(t('Present'), 'present', () => app.command('view.present'), 'view.present', 'F5'),
    insertItem(t('Templates…'), 'template', () => app.panels.templates(), 'panels.templates'),
    h('div', { class: 'menu-sep' }),
    menuItem(t('Paste from clipboard'), 'copy', () => app.command('edit.paste'), { key: 'Ctrl+V' }),
    h('div', { class: 'menu-sep' }),
    h('div', { class: 'menu-title', style: 'padding:4px 8px;font-size:11px;font-weight:700;color:var(--text-3,rgba(0,0,0,0.5));text-transform:uppercase;letter-spacing:0.5px;' }, t('Ribbon tools')),
    ribbonToolItem(t('Select'), 'select', () => app.setTool('select'), 'select', 'V'),
    ribbonToolItem(t('Lasso select'), 'lasso', () => app.setTool('lasso'), 'lasso', 'L'),
    ribbonToolItem(t('Pan canvas'), 'hand', () => app.setTool('pan'), 'pan', 'G'),
    ribbonToolItem(t('Laser pointer'), 'laser', () => app.setTool('laser'), 'laser', 'X'),
    ribbonToolItem(t('Pens'), 'pen', () => app.setTool('pen'), 'pen', '1-6'),
    ribbonToolItem(t('Highlighter'), 'highlighter', () => { app.setTool('highlighter'); app.syncUI(); }, 'highlighter', 'H'),
    ribbonToolItem(t('Study Tape'), 'curtain', () => { app.setTool('tape'); app.syncUI(); }, 'tape'),
    ribbonToolItem(t('Eraser'), 'eraser', () => { app.setTool('eraser'); app.syncUI(); }, 'eraser', 'E'),
    ribbonToolItem(t('Ruler'), 'ruler', () => app.command('ruler'), 'ruler', 'Ctrl+R'),
    ribbonToolItem(t('Text'), 'text', () => { app.setTool('text'); app.syncUI(); }, 'text', 'T'),
    ribbonToolItem(t('Sticky note'), 'note', () => { app.setTool('note'); app.syncUI(); }, 'note', 'N'),
    ribbonToolItem(t('Shapes'), 'shapes', () => { app.setTool('shape'); app.syncUI(); openToolPopover(app, anchor, 'shape'); }, 'shape', 'S'),
    ribbonToolItem(t('Emoji'), 'emoji', () => { app.setTool('emoji'); app.syncUI(); openToolPopover(app, anchor, 'emoji'); }, 'emoji')
  );
  openPopover(anchor, body, { key: 'insert' });
}

export function openMorePopover(app, anchor) {
  const body = h('div', { class: 'menu' },
    menuItem(t('Templates…'), 'template', () => app.panels.templates()),
    menuItem(t('Canvas…'), 'palette', () => app.panels.background()),
    menuItem(app.ruler.visible ? t('Hide ruler') : t('Show ruler'), 'ruler', () => app.command('ruler'), { key: 'Ctrl+R' }),
    h('div', { class: 'menu-sep' }),
    ...teachingItems(app),
    h('div', { class: 'menu-sep' }),
    menuItem(t('Select all'), 'select', () => app.command('edit.selectAll'), { key: 'Ctrl+A' }),
    menuItem(t('Export as PNG…'), 'export', () => app.command('export.png')),
    menuItem(t('Export as PDF…'), 'doc', () => app.command('export.pdf')),
    menuItem(t('Save a copy…'), 'doc', () => app.command('board.save'), { key: 'Ctrl+S' }),
    menuItem(t('Open board…'), 'board', () => app.command('board.open'), { key: 'Ctrl+O' }),
    h('div', { class: 'menu-sep' }),
    menuItem(t('Share on this network…'), 'share', () => app.panels.sharing()),
    menuItem(t('Settings'), 'settings', () => app.panels.settings()),
    menuItem(t('Keyboard shortcuts'), 'help', () => app.showShortcuts()),
    menuItem(t('Check for updates…'), 'update', () => app.checkForUpdates({ force: true })),
    menuItem(t('About GazBoard'), 'board', () => app.showAbout()),
    menuItem(t('Clear canvas'), 'trash', () => app.command('edit.clear'), { danger: true })
  );
  openPopover(anchor, body, { key: 'more' });
}

export function openExportPopover(app, anchor) {
  const body = h('div', { class: 'menu' },
    menuItem(t('Export board as PNG…'), 'image', () => app.command('export.png')),
    menuItem(t('Export selection as PNG…'), 'image', () => app.command('export.pngSelection'), { disabled: !app.surface.selection.size }),
    menuItem(t('Export as PDF…'), 'doc', () => app.command('export.pdf')),
    menuItem(t('Export as SVG…'), 'export', () => app.command('export.svg')),
    menuItem(t('Fit everything onto the paper'), 'shapes', () => app.command('page.fitContent'), { disabled: !app.store.pageCount }),
    h('div', { class: 'menu-sep' }),
    menuItem(t('Save a copy (.gazboard)…'), 'doc', () => app.command('board.save'), { key: 'Ctrl+S' }),
    menuItem(t('Open a board file…'), 'board', () => app.command('board.open'), { key: 'Ctrl+O' })
  );
  openPopover(anchor, body, { key: 'export', placement: 'bottom', align: 'end' });
}

export function choosePen(app, id, anchor) {
  const s = app.settings;
  const pen = penById(s, id);
  if (!pen) return;
  const held = app.tool === 'pen' && heldPenId(s) === id;
  s.activePen = id;
  s.penColor = pen.color;
  s.penEffect = pen.effect;
  app.saveSettings();
  app.setTool('pen');
  app.syncUI();
  if (held && anchor) openToolPopover(app, anchor, 'pen'); else closePopover();
}

export function syncToolbar(app) {
  const bar = document.getElementById('toolbar');
  const s = app.settings;

  wireTextFormatBarMarkdown(app);
  syncRibbonTools(app);
  syncPagebar(app);
  bar.classList.toggle('hide-keys', s.showToolKeys === false);

  const held = heldPenId(s);
  for (const b of bar.querySelectorAll('.pen[data-pen]')) {
    const pen = penById(s, b.dataset.pen);
    if (!pen) continue;
    b.classList.toggle('active', app.tool === 'pen' && held === pen.id);
    const paint = inkPaint(pen.color) + '|' + pen.effect;
    if (b.dataset.paint !== paint) {
      const kbd = b.querySelector('.kbd');
      const dot = b.querySelector('.size-dot');
      b.innerHTML = penIcon(inkPaint(pen.color), pen.effect);
      if (dot) b.appendChild(dot);
      if (kbd) b.appendChild(kbd);
      b.dataset.paint = paint;
    }
  }
  const hl = bar.querySelector('.pen[data-tool="highlighter"]');
  if (hl) {
    hl.classList.toggle('active', app.tool === 'highlighter');
    const want = penIcon(s.highlighterColor, 'none', 'highlighter') + '<span class="kbd">H</span>';
    if (hl.dataset.paint !== s.highlighterColor) { hl.innerHTML = want; hl.dataset.paint = s.highlighterColor; }
  }
  const er = bar.querySelector('.pen[data-tool="eraser"]');
  if (er) er.classList.toggle('active', app.tool === 'eraser');

  const fb = bar.querySelector('.tool[data-cmd="fingerInk"]');
  if (fb) {
    const offer = app.penSeenThisSession || s.inkWithFinger === 'no';
    fb.style.display = offer ? '' : 'none';
    const drawing = app.fingerInks;
    const want = drawing ? 'hand' : 'pen';
    if (fb.dataset.face !== want) { fb.innerHTML = icon(want, 18); fb.dataset.face = want; }
    fb.classList.toggle('active', !drawing);
    fb.title = drawing
      ? t('Your finger draws — tap to move the board with it instead')
      : t('Your finger moves the board — tap to draw with it instead');
  }

  for (const btn of bar.querySelectorAll('.tool')) {
    const t = btn.dataset.tool, c = btn.dataset.cmd;
    if (t) btn.classList.toggle('active', app.tool === t);
    if (c === 'ruler') btn.classList.toggle('active', app.ruler.visible);
    if (c === 'undo') btn.toggleAttribute('disabled', !app.store.canUndo);
    if (c === 'redo') btn.toggleAttribute('disabled', !app.store.canRedo);
    const dot = btn.querySelector('.dot');
    if (dot) dot.style.background = t === 'note' ? s.noteColor : t === 'text' ? s.textColor : s.shapeStroke;
  }
}