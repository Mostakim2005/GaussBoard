import { test } from 'node:test';
import assert from 'node:assert/strict';

test('Multi-Window Lease Locking state machine transitions', () => {
  // Mock app environment
  const mockApp = {
    readingMode: false,
    _forcedLeaseReadOnly: false,
    isWindowLeaseEditor: true,
    windowCount: 1,
    windowModeBadgeEl: null,
    setReadingMode(enabled) {
      this.readingMode = !!enabled;
    },
    ensureWindowModeBadge() {},
    updateWindowModeBadge(mode) {
      this._lastBadgeMode = mode;
    }
  };

  // Import handleLeaseStateChange logic
  function handleLeaseStateChange(app, state) {
    if (!state) return;
    app.windowCount = state.windowCount || 1;
    const isEditor = !!state.isEditor;
    app.isWindowLeaseEditor = isEditor;

    app.ensureWindowModeBadge();

    if (app.windowCount <= 1) {
      if (app._forcedLeaseReadOnly) {
        app._forcedLeaseReadOnly = false;
        app.setReadingMode(false);
      }
      return;
    }

    if (isEditor) {
      if (app._forcedLeaseReadOnly) {
        app._forcedLeaseReadOnly = false;
        app.setReadingMode(false);
      }
      app.updateWindowModeBadge('editor');
    } else {
      app._forcedLeaseReadOnly = true;
      app.setReadingMode(true);
      app.updateWindowModeBadge('readonly');
    }
  }

  // 1. Initial single window state
  assert.equal(mockApp.isWindowLeaseEditor, true);
  assert.equal(mockApp.readingMode, false);

  // 2. Secondary window opened; this window loses active editor lease
  handleLeaseStateChange(mockApp, { isEditor: false, windowCount: 2 });
  assert.equal(mockApp.isWindowLeaseEditor, false);
  assert.equal(mockApp.readingMode, true);
  assert.equal(mockApp._forcedLeaseReadOnly, true);
  assert.equal(mockApp._lastBadgeMode, 'readonly');

  // 3. User clicks "Take over editing" in this window -> gains lease
  handleLeaseStateChange(mockApp, { isEditor: true, windowCount: 2 });
  assert.equal(mockApp.isWindowLeaseEditor, true);
  assert.equal(mockApp.readingMode, false);
  assert.equal(mockApp._forcedLeaseReadOnly, false);
  assert.equal(mockApp._lastBadgeMode, 'editor');

  // 4. Secondary window closed -> single window restored
  handleLeaseStateChange(mockApp, { isEditor: true, windowCount: 1 });
  assert.equal(mockApp.windowCount, 1);
  assert.equal(mockApp.isWindowLeaseEditor, true);
  assert.equal(mockApp.readingMode, false);
});

test('TabBar context menu closeOtherTabs and tab management', async () => {
  const { TabBar } = await import('../src/js/ui/tabs.js');

  const mockApp = {
    store: {
      doc: { id: 'tab-1', name: 'Board One', objects: {} },
      reset() {}
    },
    surface: {
      cam: { x: 0, y: 0, z: 1 },
      selection: { clear() {} },
      damageAll() {}
    },
    saveBeforeLeaving: async () => {},
    syncUI() {}
  };

  const tabBar = new TabBar(mockApp);
  tabBar.tabs = [
    { id: 'tab-1', title: 'Board One' },
    { id: 'tab-2', title: 'Board Two' },
    { id: 'tab-3', title: 'Board Three' }
  ];
  tabBar.activeId = 'tab-2';

  // Cache some tab sessions
  tabBar.cache.set('tab-1', { timestamp: 1 });
  tabBar.cache.set('tab-2', { timestamp: 2 });
  tabBar.cache.set('tab-3', { timestamp: 3 });

  // Close other tabs keeping tab-2
  await tabBar.closeOtherTabs('tab-2');

  assert.equal(tabBar.tabs.length, 1);
  assert.equal(tabBar.tabs[0].id, 'tab-2');
  assert.equal(tabBar.activeId, 'tab-2');
  assert.equal(tabBar.cache.has('tab-1'), false);
  assert.equal(tabBar.cache.has('tab-3'), false);
  assert.equal(tabBar.cache.has('tab-2'), true);
});

test('Multi-window IPC interface verification in preload', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const content = fs.readFileSync(path.resolve('preload.js'), 'utf8');

  assert.ok(content.includes('newWindow:'), 'newWindow exposed in preload');
  assert.ok(content.includes('claimLease:'), 'claimLease exposed in preload');
  assert.ok(content.includes('getLeaseState:'), 'getLeaseState exposed in preload');
  assert.ok(content.includes('onLeaseChanged:'), 'onLeaseChanged exposed in preload');
  assert.ok(content.includes('onBoardExternalUpdate:'), 'onBoardExternalUpdate exposed in preload');
  assert.ok(content.includes('onOpenBoardById:'), 'onOpenBoardById exposed in preload');
});
