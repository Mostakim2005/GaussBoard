// Note Overview Drawer & Document Outline.
// Shows note previews, tags, aliases, and quick actions (Open, Split View, Create Quick Note).

import { h } from './popover.js';
import { icon } from './icons.js';
import { t } from '../i18n.js';

export class NoteOverviewDrawer {
  constructor(app) {
    this.app = app;
    this.el = null;
    this.visible = false;
    this.boards = [];
    this.cardsContainer = null;
    this.searchInput = null;
  }

  async loadBoards() {
    try {
      if (window.board?.boards?.list) {
        this.boards = await window.board.boards.list();
      }
    } catch {
      this.boards = [];
    }
  }

  build() {
    if (this.el) return;

    // Header
    const title = h('span', { style: 'font-weight:700;font-size:16px;' }, t('Note overview'));
    const btnClose = h('button', {
      style: 'background:none;border:none;cursor:pointer;padding:4px;color:var(--text-2,rgba(128,128,128,0.8));display:flex;',
      html: icon('close', 18)
    });
    btnClose.addEventListener('click', () => this.close());

    const header = h('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid var(--line,rgba(0,0,0,0.08));'
    }, title, btnClose);

    // Search bar
    this.searchInput = h('input', {
      type: 'text',
      placeholder: t('Search notes, tags, aliases...'),
      style: 'width:100%;box-sizing:border-box;padding:10px 14px 10px 36px;border:none;background:var(--desk,#f0f0f4);border-radius:10px;font-size:13.5px;color:var(--text,#111111);outline:none;'
    });
    const searchIcon = h('span', {
      style: 'position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-2,rgba(128,128,128,0.7));display:flex;pointer-events:none;',
      html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    });
    const searchWrap = h('div', {
      style: 'position:relative;padding:12px 20px 8px;'
    }, searchIcon, this.searchInput);

    this.searchInput.addEventListener('input', () => this.filter());

    // Scrollable Cards List
    this.cardsContainer = h('div', {
      class: 'note-overview-cards',
      style: 'flex:1;overflow-y:auto;padding:8px 20px;'
    });

    // Footer: Create Quick Note
    const btnCreate = h('button', {
      class: 'btn-create-quick-note',
      style: 'width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border:none;background:none;cursor:pointer;color:var(--accent,#0078d4);font-weight:600;font-size:14px;border-top:1px solid var(--line,rgba(0,0,0,0.08));'
    }, h('svg', {
      viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none', stroke: 'currentColor', 'stroke-width': '2'
    }), h('span', {}, t('Create quick note')));

    btnCreate.addEventListener('click', () => {
      this.close();
      if (this.app?.newBoard) {
        this.app.newBoard();
      }
    });

    // Slide-out Drawer Panel
    const drawer = h('div', {
      class: 'note-overview-drawer',
      style: 'position:absolute;top:0;left:0;bottom:0;width:340px;max-width:85vw;background:var(--surface,#ffffff);box-shadow:6px 0 24px rgba(0,0,0,0.18);z-index:9500;display:flex;flex-direction:column;border-right:1px solid var(--line,rgba(0,0,0,0.12));'
    }, header, searchWrap, this.cardsContainer, btnCreate);

    // Backdrop
    this.el = h('div', {
      id: 'noteOverviewBackdrop',
      style: 'position:fixed;inset:0;z-index:9400;background:rgba(0,0,0,0.3);backdrop-filter:blur(3px);display:none;'
    }, drawer);

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });

    document.body.appendChild(this.el);
  }

  async open() {
    this.build();
    await this.loadBoards();
    this.visible = true;
    this.el.style.display = 'block';
    this.filter();
  }

  close() {
    if (!this.visible) return;
    this.visible = false;
    if (this.el) this.el.style.display = 'none';
  }

  toggle() {
    if (this.visible) this.close();
    else this.open();
  }

  filter() {
    const q = (this.searchInput?.value || '').trim().toLowerCase();
    this.renderCards(q);
  }

  renderCards(q) {
    if (!this.cardsContainer) return;
    this.cardsContainer.innerHTML = '';

    const currentDoc = this.app?.store?.doc;
    const currentId = currentDoc?.id;

    const matched = this.boards.filter((b) => {
      if (!q) return true;
      const titleMatch = (b.name || b.title || '').toLowerCase().includes(q);
      const aliasMatch = Array.isArray(b.aliases) && b.aliases.some((a) => a.toLowerCase().includes(q));
      const tagMatch = Array.isArray(b.tags) && b.tags.some((t) => t.toLowerCase().includes(q));
      return titleMatch || aliasMatch || tagMatch;
    });

    if (matched.length === 0) {
      this.cardsContainer.appendChild(h('div', {
        style: 'text-align:center;padding:30px 10px;color:var(--text-2,rgba(128,128,128,0.8));font-size:13px;'
      }, t('No notes found')));
      return;
    }

    for (const b of matched) {
      const isCurrent = b.id === currentId;
      const title = b.name || b.title || t('Untitled');
      const dateStr = b.updated ? new Date(b.updated).toLocaleDateString() : '';

      // Card thumbnail placeholder / icon
      const thumb = h('div', {
        class: 'note-card-thumb',
        style: 'height:120px;border-radius:10px;background:var(--desk,#f0f0f4);border:1px solid var(--line,rgba(0,0,0,0.08));display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;'
      }, h('svg', {
        viewBox: '0 0 24 24', width: '36', height: '36', fill: 'none', stroke: 'rgba(128,128,128,0.5)', 'stroke-width': '1.5',
        html: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'
      }));

      // Tag pills
      const tagPills = [];
      if (Array.isArray(b.tags)) {
        for (const tg of b.tags) {
          tagPills.push(h('span', {
            style: 'background:rgba(0,120,212,0.1);color:#0078d4;font-size:10.5px;font-weight:600;padding:2px 6px;border-radius:8px;margin-right:4px;'
          }, tg));
        }
      }

      // Context menu (...) button
      const btnMore = h('button', {
        class: 'btn-note-more',
        style: 'background:none;border:none;cursor:pointer;padding:4px;color:var(--text-2,rgba(128,128,128,0.7));',
        html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>'
      });

      btnMore.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openContextMenu(e, b);
      });

      const card = h('div', {
        class: 'note-overview-card',
        style: `margin-bottom:16px;cursor:pointer;padding:8px;border-radius:12px;border:1.5px solid ${isCurrent ? '#0078d4' : 'transparent'};transition:background 0.15s, border-color 0.15s;`
      },
        thumb,
        h('div', { style: 'margin-top:8px;display:flex;align-items:flex-start;justify-content:space-between;' },
          h('div', { style: 'display:flex;flex-direction:column;gap:2px;overflow:hidden;' },
            h('span', { style: 'font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' }, title),
            h('div', { style: 'display:flex;align-items:center;margin-top:2px;' }, ...tagPills),
            h('span', { style: 'font-size:11px;color:var(--text-2,rgba(128,128,128,0.8));margin-top:2px;' }, dateStr)
          ),
          btnMore
        )
      );

      card.addEventListener('mouseenter', () => { card.style.background = 'var(--desk,#f8f8fa)'; });
      card.addEventListener('mouseleave', () => { card.style.background = 'transparent'; });
      card.addEventListener('click', () => {
        this.close();
        if (!isCurrent && this.app?.openBoard) {
          this.app.openBoard(b.id);
        }
      });

      this.cardsContainer.appendChild(card);
    }
  }

  openContextMenu(e, board) {
    const existing = document.getElementById('noteOverviewMenu');
    if (existing) existing.remove();

    const menu = h('div', {
      id: 'noteOverviewMenu',
      style: `position:fixed;left:${e.clientX}px;top:${e.clientY}px;background:var(--surface,#ffffff);border:1px solid var(--line,rgba(0,0,0,0.12));border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.18);z-index:99999;padding:6px;min-width:160px;font-size:13px;`
    });

    const mkItem = (label, action) => {
      const it = h('div', {
        style: 'padding:8px 12px;cursor:pointer;border-radius:8px;font-weight:500;'
      }, label);
      it.addEventListener('mouseenter', () => { it.style.background = 'var(--desk,#f0f0f4)'; });
      it.addEventListener('mouseleave', () => { it.style.background = 'transparent'; });
      it.addEventListener('click', () => {
        menu.remove();
        action();
      });
      return it;
    };

    menu.appendChild(mkItem(t('Open Board'), () => {
      this.close();
      this.app?.openBoard?.(board.id);
    }));

    menu.appendChild(mkItem(t('Open in Split View'), async () => {
      this.close();
      if (!this.app.splitWorkspace) return;
      if (!this.app.splitWorkspace.active) {
        this.app.splitWorkspace.enable();
      }
      if (typeof this.app.splitWorkspace.loadLeftBoard === 'function') {
        this.app.splitWorkspace.loadLeftBoard(board.id);
      }
    }));

    menu.appendChild(mkItem(t('Add Tag...'), async () => {
      const tag = prompt(t('Enter tag name (e.g. #study):'));
      if (tag && window.board?.boards?.setProperties) {
        const cleaned = tag.startsWith('#') ? tag : '#' + tag;
        await window.board.boards.setProperties(board.id, {
          tags: [...(board.tags || []), cleaned]
        });
        await this.loadBoards();
        this.filter();
      }
    }));

    document.body.appendChild(menu);
    const closeMenu = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.remove();
        window.removeEventListener('pointerdown', closeMenu);
      }
    };
    setTimeout(() => window.addEventListener('pointerdown', closeMenu), 50);
  }
}
