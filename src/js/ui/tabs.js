// tabs.js — Multi-Tab Browsing Strip & In-Memory Session Cache
import { t } from '../i18n.js';

export class TabBar {
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
      const undoStack = this.app.store._undoStack ? [...this.app.store._undoStack] : [];
      const redoStack = this.app.store._redoStack ? [...this.app.store._redoStack] : [];
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

  async switchTab(targetId) {
    if (!targetId || targetId === this.activeId) return;

    try {
      await this.app.saveBeforeLeaving();
    } catch (e) {
      console.warn('[tabs] save before switch failed:', e);
    }

    this.cacheCurrentSession();
    this.activeId = targetId;

    const cached = this.cache.get(targetId);
    if (cached) {
      cached.timestamp = Date.now();
      try {
        this.app.store.reset();
        this.app.store.doc = JSON.parse(JSON.stringify(cached.docSnapshot));
        if (cached.undoStack) this.app.store._undoStack = [...cached.undoStack];
        if (cached.redoStack) this.app.store._redoStack = [...cached.redoStack];
        if (cached.camera && this.app.surface?.cam) {
          this.app.surface.cam.x = cached.camera.x;
          this.app.surface.cam.y = cached.camera.y;
          this.app.surface.cam.z = cached.camera.z;
        }
        const titleInput = typeof document !== 'undefined' ? document.getElementById('boardTitle') : null;
        if (titleInput) titleInput.value = this.app.store.doc.name || t('Untitled board');

        this.app.surface.selection.clear();
        this.app.surface.damageAll();
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

    if (this.tabs.length === 1) {
      // Closing only open tab: save and make a fresh new tab
      try { await this.app.saveBeforeLeaving(); } catch {}
      this.cache.delete(targetId);
      this.app.newBoard(true);
      const newId = this.app.store.doc.id;
      const newName = this.app.store.doc.name || t('Untitled board');
      this.tabs = [{ id: newId, title: newName }];
      this.activeId = newId;
      this.render();
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

      const closeBtn = item.querySelector('.gb-tab-close');
      closeBtn.addEventListener('click', (e) => this.closeTab(tab.id, e));

      this.tabsListEl.appendChild(item);
    }
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
