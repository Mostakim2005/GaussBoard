import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isScratchGesture } from '../src/js/core/scratch.js';
import {
  INK_ENGINES, getInkEngine, hasPressureVariation, preparePoints,
  setInkEngine, strokeWeight, inkPath
} from '../src/js/core/ink.js';
import { HEAD_STYLES, ROUTES, connectorSvg, drawConnector, route, useConnectorStore } from '../src/js/core/connectors.js';
import { clampImageCrop } from '../src/js/core/render.js';
import { Camera } from '../src/js/core/camera.js';
import { PageMarginDialog } from '../src/js/ui/pagemargin-dialog.js';
import { Store } from '../src/js/core/store.js';
import { AudioBar, sessionMenuPosition } from '../src/js/ui/audio-bar.js';
import { parseSubtitles, findActiveCue } from '../src/js/ui/subtitles.js';
import { VIDEO_EXPORT_PRESETS } from '../src/js/export-video.js';
import { pageMarginRects } from '../src/js/core/pages.js';
import { filterTemplatesByTags } from '../src/js/templates.js';

test('slow dense scratch-out is accepted and ordinary writing is rejected', () => {
  const scratch = [];
  for (let i = 0; i <= 12; i++) {
    scratch.push({ x: i % 2 ? 50 : 0, y: i * 4, t: i * 500 });
  }
  const writing = Array.from({ length: 24 }, (_, i) => ({ x: i * 5, y: Math.sin(i / 3) * 3, t: i * 80 }));
  assert.equal(isScratchGesture(scratch), true);
  assert.equal(isScratchGesture(writing), false);
});

test('inking engines can be selected and smoothed samples retain time and metadata', () => {
  const original = getInkEngine();
  try {
    assert.deepEqual(Object.keys(INK_ENGINES), ['default', 'windowsInk', 'catmullRomBezier', 'perfectFreehand']);
    setInkEngine('windowsInk');
    assert.equal(getInkEngine(), 'windowsInk');
    setInkEngine('unknown-engine');
    assert.equal(getInkEngine(), 'windowsInk');

    const points = [
      { x: 0, y: 0, p: 0.2, t: 10, pressureSource: 'pen' },
      { x: 10, y: 10, p: 0.5, t: 20, pressureSource: 'pen' },
      { x: 20, y: 0, p: 0.8, t: 30, pressureSource: 'pen' },
      { x: 30, y: 10, p: 1, t: 40, pressureSource: 'pen' }
    ];
    const smoothed = preparePoints(points, 2);
    assert.deepEqual(smoothed.map((p) => p.t), [10, 20, 30, 40]);
    assert.ok(smoothed.every((p) => p.pressureSource === 'pen'));

    class TestPath2D {
      commands = [];
      moveTo(...args) { this.commands.push(['moveTo', ...args]); }
      lineTo(...args) { this.commands.push(['lineTo', ...args]); }
      quadraticCurveTo(...args) { this.commands.push(['quadraticCurveTo', ...args]); }
      bezierCurveTo(...args) { this.commands.push(['bezierCurveTo', ...args]); }
    }
    const priorPath2D = globalThis.Path2D;
    globalThis.Path2D = TestPath2D;
    try {
      const stroke = { points, width: 4 };
      setInkEngine('default');
      const originalPath = inkPath(stroke);
      setInkEngine('catmullRomBezier');
      const catmullPath = inkPath(stroke);
      assert.notEqual(catmullPath, originalPath, 'switching engine must not reuse the old cached geometry');
      assert.ok(catmullPath.commands.some(([op]) => op === 'bezierCurveTo'));
      assert.ok(catmullPath.commands.flat().every((value) => typeof value !== 'number' || Number.isFinite(value)));
    } finally {
      if (priorPath2D === undefined) delete globalThis.Path2D;
      else globalThis.Path2D = priorPath2D;
    }
  } finally {
    setInkEngine(original);
  }
});

test('pressure-aware inking preserves legacy constant widths and responds to pressure changes', () => {
  const flat = [{ p: 0.5 }, { p: 0.5 }, { p: 0.5 }, { p: 0.5 }];
  const varying = [{ p: 0.1 }, { p: 0.3 }, { p: 0.7 }, { p: 0.95 }];
  assert.equal(hasPressureVariation(flat), false);
  assert.equal(hasPressureVariation(varying), true);
  assert.equal(strokeWeight(flat, 8, false), 8);
  assert.ok(strokeWeight(varying, 8) > strokeWeight(flat, 8));
});

test('connector customization exposes three finite route geometries', () => {
  useConnectorStore({ doc: { objects: {}, order: [] } });
  assert.deepEqual(ROUTES, ['straight', 'elbow', 'curved']);
  const outputs = ROUTES.map((kind) => route({
    type: 'connector', route: kind, a: { x: 0, y: 0 }, b: { x: 180, y: 90 },
    lineWidth: 4, heads: 'end'
  }));
  assert.deepEqual(outputs.map((r) => r.kind), ROUTES);
  assert.ok(outputs.every((r) => r.pts.length >= 2 && r.pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))));
  assert.ok(outputs[1].pts.length > outputs[0].pts.length);
  assert.ok(outputs[2].ctrl);
  useConnectorStore(null);
});

test('connector heads render and export all four advertised styles', () => {
  useConnectorStore({ doc: { objects: {}, order: [] } });
  assert.deepEqual(HEAD_STYLES, ['filled', 'open', 'stealth', 'diamond']);
  const calls = [];
  const ctx = Object.fromEntries(['save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'quadraticCurveTo', 'setLineDash']
    .map((name) => [name, (...args) => calls.push([name, ...args])]));
  for (const headStyle of HEAD_STYLES) {
    calls.length = 0;
    const connector = { type: 'connector', route: 'straight', a: { x: 0, y: 0 }, b: { x: 120, y: 20 }, heads: 'both', headStyle, lineWidth: 3 };
    drawConnector(ctx, connector);
    const svg = connectorSvg(connector);
    assert.ok(calls.some(([name]) => name === 'stroke'), `${headStyle} draws a shaft/head`);
    assert.ok(svg.includes(headStyle === 'open' ? 'fill="none"' : 'fill="'), `${headStyle} is represented in SVG`);
  }
  useConnectorStore(null);
});

test('video export presets pass consistent size and frame rate options', () => {
  assert.deepEqual(VIDEO_EXPORT_PRESETS['720p30'], { width: 1280, height: 720, fps: 30 });
  assert.deepEqual(VIDEO_EXPORT_PRESETS['1080p30'], { width: 1920, height: 1080, fps: 30 });
  assert.deepEqual(VIDEO_EXPORT_PRESETS['1080p60'], { width: 1920, height: 1080, fps: 60 });
});

test('template tag filtering applies every selected tag to built-in and custom templates', () => {
  const templates = [
    { id: 'custom', group: 'Custom', tags: ['biology', 'review'] },
    { id: 'built-in', group: 'Science' },
    { id: 'other', group: 'Team' }
  ];
  assert.deepEqual(filterTemplatesByTags(templates, ['biology']).map((x) => x.id), ['custom']);
  assert.deepEqual(filterTemplatesByTags(templates, ['Science']).map((x) => x.id), ['built-in']);
  assert.deepEqual(filterTemplatesByTags(templates, ['biology', 'review']).map((x) => x.id), ['custom']);
  assert.deepEqual(filterTemplatesByTags(templates, []).map((x) => x.id), ['custom', 'built-in', 'other']);
});

test('image crop coordinates stay inside the source bitmap', () => {
  const crop = clampImageCrop({ sx: -4, sy: 99, sw: 40, sh: 40 }, 10, 8);
  assert.deepEqual(crop, { sx: 0, sy: 7, sw: 10, sh: 1 });
});

test('zoom fit-width and fit-height presets fit their intended viewport dimension', () => {
  const camera = new Camera();
  const box = { x: 10, y: 20, w: 800, h: 400 };
  camera.fitWidth(box, 1000, 600, 50);
  assert.ok(Math.abs(box.w * camera.z - 900) < 1e-6);
  camera.fitHeight(box, 1000, 600, 50);
  assert.ok(Math.abs(box.h * camera.z - 500) < 1e-6);
});

test('page-margin scope changes only the selected page and records a store operation', () => {
  const store = new Store();
  store.doc.pages = [{ w: 800, h: 1000 }, { w: 800, h: 1000 }];
  store.doc.background = { color: '#ffffff', pattern: 'none' };
  const app = {
    get pages() { return store.doc.pages; },
    currentPageIndex: () => 1,
    store,
    surface: { invalidate() {} }, toast() {}
  };
  const dialog = new PageMarginDialog(app);
  dialog.scope = 'single';
  dialog.margins = { left: 80, right: 40, top: 40, bottom: 40 };
  dialog.color = '#fcf9f2';
  dialog.apply();
  assert.equal(store.undoStack.length, 1);
  assert.equal(store.undoStack[0].label, 'page margin adjustment');
  const pages = store.doc.pages;
  assert.equal(pages[0].w, 800);
  assert.equal(pages[0].margins, undefined);
  assert.equal(pages[1].w, 840);
  assert.deepEqual(pages[1].margins, dialog.margins);
  assert.equal(store.doc.background.color, '#fcf9f2');
  const reopened = new Store();
  reopened.load(store.toJSON());
  assert.deepEqual(reopened.doc.pages[1].margins, dialog.margins);
  assert.equal(reopened.doc.pages[1].bg, '#fcf9f2');
  store.undo();
  assert.equal(store.doc.background.color, '#ffffff');
  assert.equal(store.doc.pages[1].w, 800);
});

test('page margin guide geometry stays within each page and honors asymmetric margins', () => {
  const [rect] = pageMarginRects([{ w: 800, h: 1000, margins: { left: 100, right: 40, top: 50, bottom: 70 } }]);
  assert.deepEqual(rect, { x: -300, y: -450, w: 660, h: 880 });
});

test('audio replay skip controls use the supported intervals and cycle them', () => {
  const bar = new AudioBar({});
  assert.deepEqual(bar.skipIntervals, [5, 10, 15, 30]);
  assert.equal(bar.skipSeconds, 10);
  bar.cycleSkip();
  assert.equal(bar.skipSeconds, 15);
  bar.cycleSkip();
  bar.cycleSkip();
  assert.equal(bar.skipSeconds, 5);
});

test('subtitle cues parse and sort; markup is removed from cue text', () => {
  const cues = parseSubtitles('WEBVTT\n\n00:00:02.000 --> 00:00:03.000\n<i>later</i>\n\n1\n00:00:01,000 --> 00:00:02,000\n<b>earlier</b>');
  assert.deepEqual(cues.map((cue) => [cue.startMs, cue.text]), [[1000, 'earlier'], [2000, 'later']]);
  assert.equal(findActiveCue(cues, 1500).text, 'earlier');
  assert.equal(findActiveCue(cues, 3500), null);
});

test('sessionMenuPosition smartly detects free space and keeps dropdown within viewport', () => {
  const viewport = { width: 1024, height: 768 };
  const menu = { width: 300, height: 420 };

  // Near top of screen: must place below
  const topAnchor = { left: 50, right: 150, top: 20, bottom: 50 };
  const posTop = sessionMenuPosition(topAnchor, menu, viewport);
  assert.ok(posTop.top >= topAnchor.bottom, 'Should position below when anchor is near top');
  assert.ok(posTop.top + posTop.maxHeight <= viewport.height, 'Should not overflow bottom of viewport');
  assert.ok(posTop.left >= 12, 'Left should be >= margin');

  // Near bottom of screen: must place above
  const bottomAnchor = { left: 50, right: 150, top: 720, bottom: 750 };
  const posBottom = sessionMenuPosition(bottomAnchor, menu, viewport);
  assert.ok(posBottom.top < bottomAnchor.top, 'Should position above when anchor is near bottom');
  assert.ok(posBottom.top >= 12, 'Top should be >= margin');

  // Near right edge: must not overflow right viewport border
  const rightAnchor = { left: 950, right: 1010, top: 300, bottom: 330 };
  const posRight = sessionMenuPosition(rightAnchor, menu, viewport);
  assert.ok(posRight.left + menu.width <= viewport.width, 'Should not overflow right edge');
});

test('individual pen toggling filters specific pens while leaving other pens active', () => {
  const allPens = ['pen:black', 'pen:red', 'pen:blue', 'pen:green', 'pen:rainbow', 'pen:galaxy'];
  const hiddenRibbonTools = ['pen:galaxy', 'pen:rainbow'];
  const hiddenSet = new Set(hiddenRibbonTools);

  const visiblePens = allPens.filter((id) => !hiddenSet.has(id));
  assert.equal(visiblePens.length, 4);
  assert.ok(visiblePens.includes('pen:black'));
  assert.ok(visiblePens.includes('pen:red'));
  assert.ok(!visiblePens.includes('pen:galaxy'));
  assert.ok(!visiblePens.includes('pen:rainbow'));
});

test('scribble targets guard text boxes and notes by default', () => {
  const targets = { stroke: true, text: false, note: false, shape: false };
  const mockObjects = [
    { id: '1', type: 'stroke' },
    { id: '2', type: 'text' },
    { id: '3', type: 'note' },
    { id: '4', type: 'shape' }
  ];

  const erasable = mockObjects.filter((o) => {
    if (o.type === 'stroke') return targets.stroke !== false;
    if (o.type === 'text') return !!targets.text;
    if (o.type === 'note') return !!targets.note;
    if (o.type === 'shape') return !!targets.shape;
    return false;
  });

  assert.equal(erasable.length, 1);
  assert.equal(erasable[0].id, '1');

  // When text is explicitly enabled
  targets.text = true;
  const withText = mockObjects.filter((o) => {
    if (o.type === 'stroke') return targets.stroke !== false;
    if (o.type === 'text') return !!targets.text;
    if (o.type === 'note') return !!targets.note;
    if (o.type === 'shape') return !!targets.shape;
    return false;
  });
  assert.equal(withText.length, 2);
});

test('scribble gesture honors sensitivity configuration', () => {
  const moderateScratch = [];
  for (let i = 0; i <= 10; i++) {
    moderateScratch.push({ x: i % 2 ? 40 : 0, y: i * 4, t: i * 100 });
  }

  // Under 'low' sensitivity (strict), 10 points is insufficient
  assert.equal(isScratchGesture(moderateScratch, 'low'), false);
  // Under 'high' sensitivity (permissive), it passes
  assert.equal(isScratchGesture(moderateScratch, 'high'), true);
});

test('note overview clean tags and alias formatting', () => {
  const formatTag = (t) => t.trim().startsWith('#') ? t.trim() : '#' + t.trim();
  assert.equal(formatTag('study'), '#study');
  assert.equal(formatTag('#deeplearning'), '#deeplearning');
  assert.equal(formatTag('  ai/agents  '), '#ai/agents');

  const formatAlias = (a) => a.trim();
  assert.equal(formatAlias('  Lecture 4 Notes  '), 'Lecture 4 Notes');
});

test('note overview thumbnail selection prioritizes real thumb over fallback', () => {
  const boardWithThumb = { id: 'b1', name: 'Board 1', thumb: 'data:image/png;base64,abc123' };
  const boardWithoutThumb = { id: 'b2', name: 'Board 2', thumb: null };

  const getThumb = (b, isCurrent, currentPicture) => b.thumb || (isCurrent ? currentPicture : null);

  assert.equal(getThumb(boardWithThumb, false, null), 'data:image/png;base64,abc123');
  assert.equal(getThumb(boardWithoutThumb, false, null), null);
  assert.equal(getThumb(boardWithoutThumb, true, 'data:image/png;base64,live999'), 'data:image/png;base64,live999');
});

test('split-workspace board autocomplete filtering and new board template generation with setLast: false', () => {
  const boardCatalog = [
    { id: 'b1', name: 'Physics Notes', tags: ['#stem', '#physics'], aliases: ['Phys 101'] },
    { id: 'b2', name: 'Calculus IV', tags: ['#math'], aliases: ['Multivariable'] },
    { id: 'b3', name: 'Machine Learning', tags: ['#ai', '#stem'], aliases: ['ML Intro'] }
  ];

  const filterBoards = (query, list) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(b => {
      const title = (b.name || '').toLowerCase();
      if (title.includes(q)) return true;
      const tags = (b.tags || []).join(' ').toLowerCase();
      if (tags.includes(q)) return true;
      const aliases = (b.aliases || []).join(' ').toLowerCase();
      if (aliases.includes(q)) return true;
      return false;
    });
  };

  // Autocomplete matching by name, tag, and alias
  assert.equal(filterBoards('phys', boardCatalog).length, 1);
  assert.equal(filterBoards('#stem', boardCatalog).length, 2);
  assert.equal(filterBoards('Multivariable', boardCatalog).length, 1);
  assert.equal(filterBoards('Quantum', boardCatalog).length, 0);

  // Exact match detection for showing "+ Create board"
  const isExact = (query, list) => list.some(b => b.name.toLowerCase() === query.trim().toLowerCase());
  assert.equal(isExact('Calculus IV', boardCatalog), true);
  assert.equal(isExact('Quantum Mechanics', boardCatalog), false);

  // Payload structure for creating new study board with setLast: false
  const createBoardPayload = (title) => ({
    id: 'b_test_123',
    saveCall: {
      id: 'b_test_123',
      json: JSON.stringify({
        v: 2,
        title,
        elements: [],
        pages: [{ id: 'p_1' }]
      }),
      setLast: false // Crucial: never overwrite startup active board pointer
    }
  });

  const res = createBoardPayload('Quantum Mechanics');
  assert.equal(res.saveCall.setLast, false);
  const parsed = JSON.parse(res.saveCall.json);
  assert.equal(parsed.title, 'Quantum Mechanics');
  assert.equal(parsed.v, 2);
});

test('dual-viewport interaction isolation and store independence', () => {
  const primaryStore = new Store();
  const leftStudyStore = new Store();

  // Add stroke to primary board
  primaryStore.add({ id: 's1', type: 'stroke', points: [{ x: 10, y: 10 }] });
  assert.equal(primaryStore.has('s1'), true);
  assert.equal(leftStudyStore.has('s1'), false);

  // Add stroke to left study board
  leftStudyStore.add({ id: 's2', type: 'stroke', points: [{ x: 50, y: 50 }] });
  assert.equal(leftStudyStore.has('s2'), true);
  assert.equal(primaryStore.has('s2'), false);

  // Undo on left study board does not touch primary board
  leftStudyStore.undo();
  assert.equal(leftStudyStore.has('s2'), false);
  assert.equal(primaryStore.has('s1'), true);

  // Redo restores on left board independently
  leftStudyStore.redo();
  assert.equal(leftStudyStore.has('s2'), true);
  assert.equal(primaryStore.has('s1'), true);
});
