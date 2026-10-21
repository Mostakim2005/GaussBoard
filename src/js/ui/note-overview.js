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

      // Card thumbnail
      const thumbUrl = b.thumb || (isCurrent ? this.app?.boardPictureFor?.() : null);
      let thumb;
      if (thumbUrl) {
        thumb = h('div', {
          class: 'note-card-thumb',
          style: 'height:120px;border-radius:10px;background:var(--desk,#f0f0f4);border:1px solid var(--line,rgba(0,0,0,0.08));display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;'
        }, h('img', {
          src: thumbUrl,
          alt: title,
          style: 'width:100%;height:100%;object-fit:cover;display:block;'
        }));
      } else {
        thumb = h('div', {
          class: 'note-card-thumb',
          style: 'height:120px;border-radius:10px;background:var(--desk,#f0f0f4);border:1px solid var(--line,rgba(0,0,0,0.08));display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;'
        }, h('svg', {
          viewBox: '0 0 24 24', width: '36', height: '36', fill: 'none', stroke: 'rgba(128,128,128,0.5)', 'stroke-width': '1.5',
          html: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'
        }));
      }

      // Tag pills
      const tagPills = [];
      if (Array.isArray(b.tags)) {
        for (const tg of b.tags) {
          tagPills.push(h('span', {
            style: 'background:rgba(0,120,212,0.1);color:#0078d4;font-size:10.5px;font-weight:600;padding:2px 6px;border-radius:8px;margin-right:4px;'
          }, tg));
        }
      }

      // Alias pills
      const aliasPills = [];
      if (Array.isArray(b.aliases)) {
        for (const al of b.aliases) {
          aliasPills.push(h('span', {
            style: 'background:rgba(168,85,247,0.12);color:#9333ea;font-size:10.5px;font-weight:600;padding:2px 6px;border-radius:8px;margin-right:4px;'
          }, al));
        }
      }

      // Action buttons: Split View, Add Tag, Add Alias
      const btnSplit = h('button', {
        class: 'btn-note-split',
        title: t('Open in Split View'),
        style: 'background:var(--desk,#f0f0f4);border:1px solid var(--line,rgba(0,0,0,0.1));cursor:pointer;padding:3px 6px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:var(--text,inherit);transition:background 0.15s;',
        html: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>'
      });
      btnSplit.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.close();
        if (!this.app.splitWorkspace) return;
        if (!this.app.splitWorkspace.enabled) {
          this.app.splitWorkspace.enable();
        }
        if (typeof this.app.splitWorkspace.loadLeftBoard === 'function') {
          await this.app.splitWorkspace.loadLeftBoard(b.id);
        }
      });

      const btnTag = h('button', {
        class: 'btn-note-tag',
        title: t('Add Tag...'),
        style: 'background:rgba(0,120,212,0.1);border:1px solid rgba(0,120,212,0.25);cursor:pointer;padding:3px 6px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:#0078d4;font-size:11px;font-weight:700;transition:background 0.15s;',
        html: '<span style="font-size:12px;font-weight:800;line-height:1;">#</span>'
      });
      btnTag.addEventListener('click', (e) => {
        e.stopPropagation();
        this.addTagToBoard(b);
      });

      const btnAlias = h('button', {
        class: 'btn-note-alias',
        title: t('Add Alias...'),
        style: 'background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.25);cursor:pointer;padding:3px 6px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:#9333ea;font-size:11px;font-weight:700;transition:background 0.15s;',
        html: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>'
      });
      btnAlias.addEventListener('click', (e) => {
        e.stopPropagation();
        this.addAliasToBoard(b);
      });

      const actionsWrap = h('div', {
        class: 'note-card-actions',
        style: 'display:flex;align-items:center;gap:4px;'
      }, btnSplit, btnTag, btnAlias);

      const isLongName = (title || '').length > 18;
      const titleRow = isLongName
        ? h('div', { style: 'margin-top:8px;display:flex;flex-direction:column;gap:4px;' },
            h('div', { style: 'display:flex;align-items:center;justify-content:space-between;' },
              h('span', { style: 'font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;', title }, title),
              actionsWrap
            ),
            h('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-top:2px;' }, ...tagPills, ...aliasPills),
            h('span', { style: 'font-size:11px;color:var(--text-2,rgba(128,128,128,0.8));margin-top:2px;' }, dateStr)
          )
        : h('div', { style: 'margin-top:8px;display:flex;align-items:flex-start;justify-content:space-between;' },
            h('div', { style: 'display:flex;flex-direction:column;gap:2px;overflow:hidden;' },
              h('span', { style: 'font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;', title }, title),
              h('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-top:2px;' }, ...tagPills, ...aliasPills),
              h('span', { style: 'font-size:11px;color:var(--text-2,rgba(128,128,128,0.8));margin-top:2px;' }, dateStr)
            ),
            actionsWrap
          );

      const card = h('div', {
        class: 'note-overview-card',
        title: t('Double-click to open board'),
        style: `margin-bottom:16px;cursor:pointer;padding:8px;border-radius:12px;border:1.5px solid ${isCurrent ? '#0078d4' : 'transparent'};transition:background 0.15s, border-color 0.15s;`
      },
        thumb,
        titleRow
      );

      const openThisBoard = () => {
        this.close();
        if (!isCurrent) {
          if (typeof this.app?.openBoardRef === 'function') {
            this.app.openBoardRef({ id: b.id, name: b.name || b.title });
          } else if (typeof this.app?.openBoard === 'function') {
            this.app.openBoard(b.id);
          }
        }
      };

      card.addEventListener('mouseenter', () => { card.style.background = 'var(--desk,#f8f8fa)'; });
      card.addEventListener('mouseleave', () => { card.style.background = 'transparent'; });
      card.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openThisBoard();
      });

      this.cardsContainer.appendChild(card);
    }
  }

  showInputModal(title, placeholder, defaultValue = '') {
    return new Promise((resolve) => {
      const backdrop = h('div', {
        class: 'note-overview-modal-backdrop',
        style: 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;'
      });

      const input = h('input', {
        type: 'text',
        value: defaultValue,
        placeholder,
        style: 'width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--line,rgba(0,0,0,0.15));background:var(--desk,#f0f0f4);border-radius:8px;font-size:13px;color:var(--text,inherit);outline:none;margin-top:8px;'
      });

      const btnCancel = h('button', {
        class: 'btn',
        style: 'padding:5px 12px;font-size:12px;border-radius:8px;cursor:pointer;'
      }, t('Cancel'));

      const btnSubmit = h('button', {
        class: 'btn primary',
        style: 'padding:5px 14px;font-size:12px;border-radius:8px;cursor:pointer;'
      }, t('Add'));

      const finish = (val) => {
        backdrop.remove();
        resolve(val);
      };

      btnCancel.addEventListener('click', () => finish(null));
      btnSubmit.addEventListener('click', () => finish(input.value.trim()));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finish(input.value.trim());
        if (e.key === 'Escape') finish(null);
      });
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) finish(null);
      });

      const box = h('div', {
        style: 'width:320px;max-width:90vw;background:var(--surface,#ffffff);color:var(--text,#111111);border:1px solid var(--line,rgba(255,255,255,0.15));border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,0.3);padding:16px;display:flex;flex-direction:column;gap:10px;'
      },
        h('span', { style: 'font-weight:700;font-size:14px;' }, title),
        input,
        h('div', { style: 'display:flex;justify-content:flex-end;gap:8px;margin-top:4px;' }, btnCancel, btnSubmit)
      );

      backdrop.appendChild(box);
      document.body.appendChild(backdrop);
      setTimeout(() => input.focus(), 50);
    });
  }

  async addTagToBoard(board) {
    const tag = await this.showInputModal(t('Add tag to board'), t('Enter tag name (e.g. #study or #ai/llm)'));
    if (!tag || !tag.trim()) return;
    const cleaned = tag.trim().startsWith('#') ? tag.trim() : '#' + tag.trim();

    try {
      let raw = null;
      if (window.board?.boards?.load) {
        raw = await window.board.boards.load(board.id);
      }
      if (typeof raw === 'string') raw = JSON.parse(raw);
      if (!raw) return;

      raw.properties = raw.properties || {};
      raw.properties.tags = Array.isArray(raw.properties.tags) ? raw.properties.tags : [];
      if (!raw.properties.tags.includes(cleaned)) {
        raw.properties.tags.push(cleaned);
      }
      raw.tags = raw.properties.tags;

      if (window.board?.boards?.save) {
        await window.board.boards.save({ id: board.id, json: JSON.stringify(raw) });
      }
      if (this.app?.store?.doc?.id === board.id) {
        this.app.store.doc.properties = this.app.store.doc.properties || {};
        this.app.store.doc.properties.tags = raw.properties.tags;
        this.app.store.doc.tags = raw.tags;
        if (typeof this.app.persist === 'function') await this.app.persist();
        if (typeof this.app.updateTopProperties === 'function') this.app.updateTopProperties();
      }
      await this.loadBoards();
      this.filter();
      this.app?.toast?.(t('Tag {tag} added', { tag: cleaned }));
    } catch (err) {
      this.app?.toast?.(t('Failed to add tag: {msg}', { msg: err.message }));
    }
  }

  async addAliasToBoard(board) {
    const alias = await this.showInputModal(t('Add alias to board'), t('Enter alias for board (e.g. Lecture 4 Notes)'));
    if (!alias || !alias.trim()) return;
    const cleaned = alias.trim();

    try {
      let raw = null;
      if (window.board?.boards?.load) {
        raw = await window.board.boards.load(board.id);
      }
      if (typeof raw === 'string') raw = JSON.parse(raw);
      if (!raw) return;

      raw.properties = raw.properties || {};
      raw.properties.aliases = Array.isArray(raw.properties.aliases) ? raw.properties.aliases : [];
      if (!raw.properties.aliases.includes(cleaned)) {
        raw.properties.aliases.push(cleaned);
      }
      raw.aliases = raw.properties.aliases;

      if (window.board?.boards?.save) {
        await window.board.boards.save({ id: board.id, json: JSON.stringify(raw) });
      }
      if (this.app?.store?.doc?.id === board.id) {
        this.app.store.doc.properties = this.app.store.doc.properties || {};
        this.app.store.doc.properties.aliases = raw.properties.aliases;
        this.app.store.doc.aliases = raw.aliases;
        if (typeof this.app.persist === 'function') await this.app.persist();
        if (typeof this.app.updateTopProperties === 'function') this.app.updateTopProperties();
      }
      await this.loadBoards();
      this.filter();
      this.app?.toast?.(t('Alias “{alias}” added', { alias: cleaned }));
    } catch (err) {
      this.app?.toast?.(t('Failed to add alias: {msg}', { msg: err.message }));
    }
  }
}
