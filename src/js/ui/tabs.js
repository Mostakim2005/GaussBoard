// tabs.js — Multi-Tab Browsing Strip & In-Memory Session Cache
import { t } from '../i18n.js';
import { openPopover, closePopover } from './popover.js';
import { allBoards } from '../core/boardrefs.js';

export class WorkspaceSessionManager {
  static STORAGE_KEY = 'gazboard_workspace_sessions';

  static listSessions() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(this.STORAGE_KEY) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // Anything corrupt in localStorage used to reach callers as-is: a
      // non-array made saveSession throw, and a tab entry that was not an
      // object broke tab rendering. Normalise to the expected shape.
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((s) => s && typeof s === 'object' && typeof s.name === 'string' && s.name)
        .slice(0, 50)
        .map((s) => ({
          name: String(s.name).slice(0, 200),
          savedAt: Number.isFinite(Number(s.savedAt)) ? Number(s.savedAt) : 0,
          tabs: (Array.isArray(s.tabs) ? s.tabs : [])
            .filter((tab) => tab && typeof tab === 'object' && typeof tab.id === 'string')
            .slice(0, 50)
            .map((tab) => ({ id: tab.id, title: typeof tab.title === 'string' ? tab.title : '' })),
          activeId: typeof s.activeId === 'string' ? s.activeId : null
        }));
    } catch {
      return [];
    }
  }

  static saveSession(name, tabs, activeId) {
    const sessions = this.listSessions();
    const cleanName = (name || `Session ${new Date().toLocaleDateString()}`).trim();
    const existingIdx = sessions.findIndex(s => s.name === cleanName);
    const sessionData = {
      name: cleanName,
      savedAt: Date.now(),
      tabs: (tabs || []).map(t => ({ id: t.id, title: t.title })),
      activeId: activeId || null
    };
    if (existingIdx >= 0) {
      sessions[existingIdx] = sessionData;
    } else {
      sessions.unshift(sessionData);
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions.slice(0, 30)));
      }
    } catch (e) {
      if (e?.name === 'QuotaExceededError' && typeof localStorage !== 'undefined') {
        console.warn('localStorage quota exceeded. Pruning older sessions...');
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions.slice(0, 5)));
        } catch {}
      } else {
        console.warn('Failed to persist workspace session:', e);
      }
    }
    return sessionData;
  }

  static deleteSession(name) {
    const sessions = this.listSessions().filter(s => s.name !== name);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      }
    } catch {}
    return sessions;
  }

  static getSession(name) {
    return this.listSessions().find(s => s.name === name) || null;
  }

}

export class TabBar {
  /**
   * Board content in the shape `Store.load()` expects.
   *
   * Accepts either a live store document (`objects` dictionary + `order`) or a
   * board-file payload (`objects` array). The tab cache keeps the former.
   */
  static docToPayload(doc) {
    if (!doc || typeof doc !== 'object') return null;
    if (Array.isArray(doc.objects)) return { ...doc };
    const objects = doc.objects && typeof doc.objects === 'object' ? doc.objects : {};
    const order = Array.isArray(doc.order) ? doc.order : Object.keys(objects);
    return {
      id: doc.id,
      name: doc.name,
      schema: doc.schema ?? 2,
      created: doc.created,
      modified: doc.modified,
      origin: doc.origin,
      pageDates: doc.pageDates,
      background: doc.background,
      pages: doc.pages,
      page: Array.isArray(doc.pages) ? (doc.pages[0] || null) : null,
      audioTracks: doc.audioTracks,
      camera: doc.camera,
      properties: doc.properties,
      objects: order.map((id) => objects[id]).filter(Boolean)
    };
  }

  constructor(app) {
    this.app = app;
    this.el = null;
    this.tabsListEl = null;
    this.tabs = [];
    this.activeId = null;
    this.cache = new Map(); // boardId -> { docSnapshot, undoStack, redoStack, camera, timestamp }
    this.maxCache = 8;
  }

  init() {
    if (this.el) return;

    this.el = document.createElement('div');
    this.el.id = 'tabBar';
    this.el.className = 'gb-tab-bar';
    this.el.setAttribute('role', 'tablist');
    this.el.setAttribute('aria-label', t('Open board tabs'));

    this.el.innerHTML = `
      <div class="gb-tab-scroller">
        <div class="gb-tab-list"></div>
      </div>
      <button class="gb-tab-add" id="btnTabAdd" title="${t('New tab (Ctrl+T)')}" aria-label="${t('New tab')}">
        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    `;

    const appContainer = document.getElementById('app');
    const topbar = document.getElementById('topbar');
    if (appContainer && topbar) {
      appContainer.insertBefore(this.el, topbar);
    } else if (appContainer) {
      appContainer.prepend(this.el);
    }

    this.tabsListEl = this.el.querySelector('.gb-tab-list');
    const addBtn = this.el.querySelector('#btnTabAdd');
    addBtn.addEventListener('click', () => this.newTab());

    // Hook board title edits
    const titleInput = document.getElementById('boardTitle');
    if (titleInput) {
      titleInput.addEventListener('input', () => {
        if (this.activeId) {
          this.onTitleChanged(this.activeId, titleInput.value || t('Untitled board'));
        }
      });
    }

    // Initialize with current board
    const currentId = this.app.store?.doc?.id || 'init-board';
    const currentName = this.app.store?.doc?.name || t('Untitled board');
    this.tabs = [{ id: currentId, title: currentName }];
    this.activeId = currentId;

    if (this.app.settings?.showTabBar === false) {
      this.el.style.display = 'none';
    }

    this.render();
  }

  cacheCurrentSession() {
    if (!this.activeId || !this.app.store?.doc) return;
    try {
      const docSnapshot = JSON.parse(JSON.stringify(this.app.store.doc));
      // Store keeps `undoStack`/`redoStack` (no underscore). Reading the wrong
      // names cached two empty arrays, so switching tabs silently discarded
      // the board's undo history.
      const undoStack = Array.isArray(this.app.store.undoStack) ? [...this.app.store.undoStack] : [];
      const redoStack = Array.isArray(this.app.store.redoStack) ? [...this.app.store.redoStack] : [];
      const camera = this.app.surface?.cam ? {
        x: this.app.surface.cam.x,
        y: this.app.surface.cam.y,
        z: this.app.surface.cam.z
      } : null;

      this.cache.set(this.activeId, {
        docSnapshot,
        undoStack,
        redoStack,
        camera,
        timestamp: Date.now()
      });

      // Trim LRU cache if exceeding max
      if (this.cache.size > this.maxCache) {
        let oldestKey = null, oldestTime = Infinity;
        for (const [k, v] of this.cache.entries()) {
          if (k !== this.activeId && v.timestamp < oldestTime) {
            oldestTime = v.timestamp;
            oldestKey = k;
          }
        }
        if (oldestKey) this.cache.delete(oldestKey);
      }
    } catch (e) {
      console.warn('[tabs] cache current session failed:', e);
    }
  }

  async newTab() {
    try {
      await this.app.saveBeforeLeaving();
    } catch (e) {
      console.warn('[tabs] save before new tab failed:', e);
    }

    this.cacheCurrentSession();

    // Create fresh board
    this.app.newBoard(true);

    const newId = this.app.store.doc.id;
    const newName = this.app.store.doc.name || t('Untitled board');

    this.tabs.push({ id: newId, title: newName });
    this.activeId = newId;
    this.render();
    this.scrollActiveIntoView();
  }

  switchTab(targetId) {
    if (!targetId) return Promise.resolve();
    /*
     * Serialise tab switches. Each one has awaits (save, asset resolution,
     * board load); clicking two tabs quickly used to run them concurrently,
     * so a later switch could cache the previous board's document under the
     * new tab's id - corrupting that tab's cached content for the session.
     */
    const run = (this._switchQueue || Promise.resolve())
      .catch(() => {})
      .then(() => this._switchTabNow(targetId));
    this._switchQueue = run;
    return run;
  }

  async _switchTabNow(targetId) {
    if (!targetId || targetId === this.activeId) return;

    try {
      await this.app.saveBeforeLeaving();
    } catch (e) {
      console.warn('[tabs] save before switch failed:', e);
    }

    this.cacheCurrentSession();
    this.activeId = targetId;

    const cached = this.cache.get(targetId);
    if (cached?.docSnapshot) {
      cached.timestamp = Date.now();
      try {
        /*
         * Load through the normal board path. Assigning `store.doc` directly
         * skipped the Store's own load (no revision bump, so rev-keyed caches
         * could still describe the previous board, and no normalisation of
         * pages/tags/audio) and left the app-level state - title, last-board
         * pointer, Recent, back pill - pointing at the tab we just left.
         */
        const payload = TabBar.docToPayload(cached.docSnapshot);
        if (!payload) throw new Error('empty tab snapshot');
        payload.camera = cached.camera || payload.camera;
        await this.app.loadBoard(payload, { silent: true, claimed: true });
        // loadBoard resets history; put this tab's own history back.
        if (Array.isArray(cached.undoStack)) this.app.store.undoStack = [...cached.undoStack];
        if (Array.isArray(cached.redoStack)) this.app.store.redoStack = [...cached.redoStack];
        this.app.surface?.damageAll?.();
        this.app.syncUI();
        this.render();
        this.scrollActiveIntoView();
        return;
      } catch (e) {
        console.warn('[tabs] restore from cache failed, falling back to disk:', e);
      }
    }

    // Disk fallback
    try {
      const data = await window.board?.boards?.load?.(targetId);
      if (data) {
        await this.app.loadBoard(data, { silent: true, claimed: true });
      } else {
        this.app.toast(t('Could not load board'));
      }
    } catch (e) {
      console.warn('[tabs] load board failed:', e);
      this.app.toast(t('Could not load board'));
    }

    this.render();
    this.scrollActiveIntoView();
  }

  async closeActiveTab() {
    if (this.activeId) await this.closeTab(this.activeId);
  }

  async closeTab(targetId, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const tabIndex = this.tabs.findIndex(t => t.id === targetId);
    if (tabIndex === -1) return;

    if (this.tabs.length <= 1) {
      // Closing only open tab: save and open My Boards gallery so user can choose
      try { await this.app.saveBeforeLeaving(); } catch {}
      this.cache.delete(targetId);
      this.tabs = [];
      this.activeId = null;
      this.render();
      this.app.panels?.boards?.();
      return;
    }

    // Multiple tabs:
    try {
      if (targetId === this.activeId) {
        await this.app.saveBeforeLeaving();
      }
    } catch {}

    this.cache.delete(targetId);
    this.tabs.splice(tabIndex, 1);

    if (targetId === this.activeId) {
      const nextIndex = Math.min(tabIndex, this.tabs.length - 1);
      const nextId = this.tabs[nextIndex].id;
      this.activeId = null; // force reload in switchTab
      await this.switchTab(nextId);
    } else {
      this.render();
    }
  }

  nextTab() {
    if (this.tabs.length <= 1) return;
    const idx = this.tabs.findIndex(t => t.id === this.activeId);
    const nextIdx = (idx + 1) % this.tabs.length;
    this.switchTab(this.tabs[nextIdx].id);
  }

  prevTab() {
    if (this.tabs.length <= 1) return;
    const idx = this.tabs.findIndex(t => t.id === this.activeId);
    const prevIdx = (idx - 1 + this.tabs.length) % this.tabs.length;
    this.switchTab(this.tabs[prevIdx].id);
  }

  onBoardLoaded(id, name) {
    if (!id) return;
    const existing = this.tabs.find(t => t.id === id);
    if (existing) {
      if (name) existing.title = name;
      this.activeId = id;
    } else {
      // Check if current tab is an untouched, empty untitled board
      const currentTab = this.tabs.find(t => t.id === this.activeId);
      const isCurrentEmpty = currentTab && (!this.app.store.doc.objects || Object.keys(this.app.store.doc.objects).length === 0) && (currentTab.title === t('Untitled board') || currentTab.title === 'Untitled board');

      if (isCurrentEmpty) {
        currentTab.id = id;
        currentTab.title = name || t('Untitled board');
        this.cache.delete(this.activeId);
        this.activeId = id;
      } else {
        this.tabs.push({ id, title: name || t('Untitled board') });
        this.activeId = id;
      }
    }
    this.render();
    this.scrollActiveIntoView();
  }

  onTitleChanged(id, newTitle) {
    const tab = this.tabs.find(t => t.id === id);
    if (tab) {
      tab.title = newTitle || t('Untitled board');
      const titleEl = this.tabsListEl?.querySelector(`[data-id="${id}"] .gb-tab-title`);
      if (titleEl) titleEl.textContent = tab.title;
    }
  }

  onBoardDeleted(id) {
    const idx = this.tabs.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.closeTab(id);
    }
  }

  scrollActiveIntoView() {
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
    raf(() => {
      const activeEl = this.tabsListEl?.querySelector('.gb-tab-item.active');
      if (activeEl) {
        activeEl.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    });
  }

  render() {
    if (!this.tabsListEl) return;
    this.tabsListEl.innerHTML = '';

    for (const tab of this.tabs) {
      const isActive = tab.id === this.activeId;
      const item = document.createElement('div');
      item.className = 'gb-tab-item' + (isActive ? ' active' : '');
      item.setAttribute('role', 'tab');
      item.setAttribute('aria-selected', isActive ? 'true' : 'false');
      item.setAttribute('data-id', tab.id);
      item.title = tab.title || t('Untitled board');

      item.innerHTML = `
        <span class="gb-tab-icon">
          <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
        </span>
        <span class="gb-tab-title">${escapeHtml(tab.title || t('Untitled board'))}</span>
        <button class="gb-tab-close" title="${t('Close tab (Ctrl+W)')}" aria-label="${t('Close tab')}">&times;</button>
      `;

      item.addEventListener('click', (e) => {
        if (!e.target.closest('.gb-tab-close')) {
          this.switchTab(tab.id);
        }
      });

      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showTabContextMenu(tab.id, e.clientX, e.clientY);
      });

      const closeBtn = item.querySelector('.gb-tab-close');
      closeBtn.addEventListener('click', (e) => this.closeTab(tab.id, e));

      this.tabsListEl.appendChild(item);
    }

    // Dynamic (+) button immediately following the latest tab
    const inlineAddBtn = document.createElement('button');
    inlineAddBtn.className = 'gb-tab-inline-add';
    inlineAddBtn.type = 'button';
    inlineAddBtn.title = t('New or open board');
    inlineAddBtn.setAttribute('aria-label', t('New or open board'));
    inlineAddBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    `;
    inlineAddBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openNewTabMenu(inlineAddBtn);
    });
    this.tabsListEl.appendChild(inlineAddBtn);
  }

  async openBoardInTab(targetId, boardTitle) {
    if (!targetId) return;
    const existing = this.tabs.find((t) => t.id === targetId);
    if (existing) {
      await this.switchTab(targetId);
      return;
    }
    try {
      await this.app.saveBeforeLeaving();
    } catch (e) {
      console.warn('[tabs] save before open board failed:', e);
    }
    this.cacheCurrentSession();
    try {
      await this.app.openBoard(targetId);
      const title = boardTitle || this.app.store?.doc?.name || t('Untitled board');
      this.tabs.push({ id: targetId, title });
      this.activeId = targetId;
      this.render();
      this.scrollActiveIntoView();
    } catch (e) {
      this.app.toast?.(t('Could not open that board'));
    }
  }

  openNewTabMenu(anchor) {
    if (typeof document === 'undefined') return;
    const pop = document.createElement('div');
    pop.className = 'gb-newtab-popover';

    const actionsRow = document.createElement('div');
    actionsRow.className = 'gb-newtab-actions';

    const btnNew = document.createElement('button');
    btnNew.type = 'button';
    btnNew.className = 'gb-newtab-btn';
    btnNew.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>${t('New Board')}</span>
    `;
    btnNew.onclick = () => {
      closePopover();
      this.newTab();
    };

    const btnOpen = document.createElement('button');
    btnOpen.type = 'button';
    btnOpen.className = 'gb-newtab-btn';
    btnOpen.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      <span>${t('Open Existing')}</span>
    `;
    btnOpen.onclick = () => {
      closePopover();
      this.app.panels?.boards?.();
    };

    actionsRow.appendChild(btnNew);
    actionsRow.appendChild(btnOpen);
    pop.appendChild(actionsRow);

    const searchRow = document.createElement('div');
    searchRow.className = 'gb-newtab-search';
    searchRow.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input type="text" placeholder="${t('Search existing boards…')}" spellcheck="false" />
    `;
    const searchInput = searchRow.querySelector('input');
    pop.appendChild(searchRow);

    const listEl = document.createElement('div');
    listEl.className = 'gb-newtab-list';
    pop.appendChild(listEl);

    const renderList = (filter = '') => {
      listEl.innerHTML = '';
      const boards = (typeof allBoards === 'function' ? allBoards() : [])
        .filter((b) => b && b.id !== this.activeId);
      const query = filter.trim().toLowerCase();
      const filtered = query
        ? boards.filter((b) => {
            const name = (b.name || '').toLowerCase();
            const tags = Array.isArray(b.tags) ? b.tags.join(' ').toLowerCase() : '';
            const aliases = Array.isArray(b.aliases) ? b.aliases.join(' ').toLowerCase() : '';
            return name.includes(query) || tags.includes(query) || aliases.includes(query);
          })
        : boards.slice(0, 10);

      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.style.padding = '8px';
        empty.style.fontSize = '12px';
        empty.style.color = 'var(--text-2)';
        empty.style.textAlign = 'center';
        empty.textContent = t('No matching boards');
        listEl.appendChild(empty);
        return;
      }

      for (const b of filtered) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'gb-newtab-item';
        item.innerHTML = `
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(b.name || t('Untitled board'))}</span>
        `;
        item.onclick = async () => {
          closePopover();
          await this.openBoardInTab(b.id, b.name);
        };
        listEl.appendChild(item);
      }
    };

    renderList();

    searchInput.addEventListener('input', () => {
      renderList(searchInput.value);
    });

    openPopover(anchor, pop, { key: 'newTabMenu', placement: 'bottom', align: 'start' });
    setTimeout(() => searchInput?.focus(), 50);
  }

  showTabContextMenu(tabId, x, y) {
    if (typeof document === 'undefined') return;
    document.querySelector('.gb-tab-context-menu')?.remove();

    const menu = document.createElement('div');
    menu.className = 'gb-tab-context-menu';
    const menuWidth = 220;
    const menuHeight = 135;
    const posX = typeof window !== 'undefined' ? Math.min(x, window.innerWidth - menuWidth - 10) : x;
    const posY = typeof window !== 'undefined' ? Math.min(y, window.innerHeight - menuHeight - 10) : y;
    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;

    menu.innerHTML = `
      <button class="gb-tab-menu-item" data-action="new-window">
        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none">
          <rect x="2" y="3" width="14" height="14" rx="2"></rect>
          <path d="M8 21h12a2 2 0 0 0 2-2V9"></path>
        </svg>
        <span>${t('Open in new window')}</span>
        <span class="shortcut">Ctrl+Shift+N</span>
      </button>
      <button class="gb-tab-menu-item" data-action="duplicate">
        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>${t('Duplicate tab')}</span>
      </button>
      <div class="gb-tab-menu-divider"></div>
      <button class="gb-tab-menu-item" data-action="save-session">
        <span>💾 ${t('Save workspace session…')}</span>
      </button>
      <button class="gb-tab-menu-item" data-action="restore-session">
        <span>📂 ${t('Restore workspace session…')}</span>
      </button>
      <div class="gb-tab-menu-divider"></div>
      <button class="gb-tab-menu-item" data-action="close-others">
        <span>${t('Close other tabs')}</span>
      </button>
      <button class="gb-tab-menu-item" data-action="close-all">
        <span>${t('Close all tabs')}</span>
      </button>
      <button class="gb-tab-menu-item" data-action="close">
        <span>${t('Close tab')}</span>
        <span class="shortcut">Ctrl+W</span>
      </button>
    `;

    document.body.appendChild(menu);

    const cleanup = () => {
      menu.remove();
      document.removeEventListener('pointerdown', onDocPointer);
    };
    const onDocPointer = (evt) => {
      if (!menu.contains(evt.target)) cleanup();
    };
    setTimeout(() => document.addEventListener('pointerdown', onDocPointer), 10);

    menu.addEventListener('click', async (e) => {
      const btn = e.target.closest('.gb-tab-menu-item');
      if (!btn) return;
      const action = btn.dataset.action;
      cleanup();
      if (action === 'new-window') {
        window.board?.newWindow?.({ boardId: tabId });
      } else if (action === 'duplicate') {
        await this.duplicateTab(tabId);
      } else if (action === 'save-session') {
        this.promptSaveSession();
      } else if (action === 'restore-session') {
        this.promptRestoreSession();
      } else if (action === 'close-others') {
        await this.closeOtherTabs(tabId);
      } else if (action === 'close-all') {
        await this.closeAllTabs();
      } else if (action === 'close') {
        await this.closeTab(tabId);
      }
    });
  }

  async duplicateTab(targetId) {
    const tab = this.tabs.find(t => t.id === targetId);
    if (!tab) return;
    try {
      if (targetId === this.activeId) {
        this.cacheCurrentSession();
      }
      const cached = this.cache.get(targetId);
      let docToCopy = null;
      if (cached?.docSnapshot) {
        docToCopy = JSON.parse(JSON.stringify(cached.docSnapshot));
      } else {
        const loaded = await window.board?.boards?.load?.(targetId);
        if (loaded) docToCopy = loaded;
      }
      if (docToCopy) {
        /*
         * Copy the whole board, not just its object dictionary. The old code
         * assigned `doc.objects` but never `doc.order` (and an on-disk payload
         * has `objects` as an ARRAY), so "Duplicate tab" produced a tab that
         * rendered as an empty board.
         */
        const payload = TabBar.docToPayload(docToCopy);
        if (!payload) return;
        this.app.newBoard(true);
        const newId = this.app.store.doc.id;
        const baseName = docToCopy.name || docToCopy.title || t('Untitled board');
        payload.id = newId;
        payload.name = `${baseName} (Copy)`;
        this.app.store.load(payload);
        const titleInput = typeof document !== 'undefined' ? document.getElementById('boardTitle') : null;
        if (titleInput) titleInput.value = this.app.store.doc.name;
        this.app.surface?.damageAll();
        this.app.syncUI();
        this.tabs.push({ id: newId, title: this.app.store.doc.name });
        this.activeId = newId;
        this.render();
        this.scrollActiveIntoView();
      }
    } catch (e) {
      console.warn('[tabs] duplicate tab failed:', e);
    }
  }

  async closeOtherTabs(keepId) {
    const toClose = this.tabs.filter(t => t.id !== keepId).map(t => t.id);
    for (const id of toClose) {
      this.cache.delete(id);
    }
    this.tabs = this.tabs.filter(t => t.id === keepId);
    if (this.activeId !== keepId) {
      await this.switchTab(keepId);
    } else {
      this.render();
    }
  }

  async closeAllTabs() {
    try { await this.app.saveBeforeLeaving(); } catch {}
    this.cache.clear();
    this.tabs = [];
    this.activeId = null;
    this.render();
    this.app.panels?.boards?.();
  }

  saveCurrentSession(name) {
    this.cacheCurrentSession();
    return WorkspaceSessionManager.saveSession(name, this.tabs, this.activeId);
  }

  async restoreSession(name) {
    const session = WorkspaceSessionManager.getSession(name);
    if (!session || !session.tabs.length) return false;
    this.tabs = session.tabs.map((tab) => ({ ...tab }));
    this.render();
    const activeExists = this.tabs.some((tab) => tab.id === session.activeId);
    const targetId = activeExists ? session.activeId : this.tabs[0].id;
    if (targetId) await this.switchTab(targetId);
    return true;
  }

  async promptSaveSession() {
    const fallback = `Session ${new Date().toLocaleDateString()}`;
    let name = null;
    try {
      if (typeof this.app?.askText === 'function') {
        name = await this.app.askText(t('Save workspace session'),
          t('Name for the open tabs:'), { value: fallback, ok: t('Save') });
      } else if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
        name = window.prompt(t('Enter session name to save open tabs:'), fallback);
      }
    } catch { name = null; }
    name = String(name || '').trim();
    if (!name) return;
    this.saveCurrentSession(name);
    this.app.toast?.(t('Workspace session saved: {name}', { name }));
  }

  async promptRestoreSession() {
    const sessions = WorkspaceSessionManager.listSessions();
    if (!sessions.length) {
      this.app.toast?.(t('No saved sessions found'));
      return;
    }
    const list = sessions.map((s) => s.name).join('\n');
    let chosen = null;
    try {
      if (typeof this.app?.askText === 'function') {
        // window.prompt is not available in Electron, which made session
        // restore unreachable from the tab menu; use the app's own dialog.
        chosen = await this.app.askText(t('Restore workspace session'), list,
          { value: sessions[0].name, ok: t('Restore') });
      } else if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
        chosen = window.prompt(t('Enter name of session to restore:\n\n{list}', { list }), sessions[0].name);
      }
    } catch { chosen = null; }
    chosen = String(chosen || '').trim();
    if (!chosen) return;
    const ok = await this.restoreSession(chosen);
    if (ok) this.app.toast?.(t('Restored session: {name}', { name: chosen }));
    else this.app.toast?.(t('Could not restore session'));
  }

  toggleVisibility(visible) {
    if (!this.el) return;
    this.el.style.display = visible ? 'flex' : 'none';
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}
