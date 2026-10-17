// Board Properties Dialog (Obsidian-style tags & aliases manager).
// Allows viewing and editing tags, hierarchical tags (#main/sub/sub2), aliases, and metadata.

import { h } from './popover.js';
import { icon } from './icons.js';
import { t } from '../i18n.js';

export class PropertiesDialog {
  constructor(app) {
    this.app = app;
    this.el = null;
    this.visible = false;
    this.tagListEl = null;
    this.aliasListEl = null;
    this.inputTag = null;
    this.inputAlias = null;
  }

  build() {
    if (this.el) return;

    const title = h('span', { style: 'font-weight:700;font-size:15px;' }, t('Board Properties'));
    const btnClose = h('button', {
      style: 'background:none;border:none;cursor:pointer;padding:4px;color:var(--text-2,rgba(128,128,128,0.8));display:flex;',
      html: icon('close', 18)
    });
    btnClose.addEventListener('click', () => this.close());

    const header = h('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--line,rgba(0,0,0,0.08));'
    }, title, btnClose);

    // Section 1: Tags
    this.tagListEl = h('div', {
      style: 'display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;'
    });

    this.inputTag = h('input', {
      type: 'text',
      placeholder: t('Add tag (e.g. #study, #AI/ML)...'),
      style: 'width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--line,rgba(0,0,0,0.15));border-radius:10px;font-size:13px;background:var(--desk,#f5f5f7);color:inherit;outline:none;'
    });
    this.inputTag.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTag(this.inputTag.value);
        this.inputTag.value = '';
      }
    });

    const secTags = h('div', { style: 'margin-top:14px;' },
      h('div', { style: 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-2,rgba(128,128,128,0.85));' }, t('Tags')),
      this.tagListEl,
      this.inputTag
    );

    // Section 2: Aliases
    this.aliasListEl = h('div', {
      style: 'display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;'
    });

    this.inputAlias = h('input', {
      type: 'text',
      placeholder: t('Add alias (e.g. Lecture 4 Notes)...'),
      style: 'width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--line,rgba(0,0,0,0.15));border-radius:10px;font-size:13px;background:var(--desk,#f5f5f7);color:inherit;outline:none;'
    });
    this.inputAlias.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addAlias(this.inputAlias.value);
        this.inputAlias.value = '';
      }
    });

    const secAliases = h('div', { style: 'margin-top:16px;' },
      h('div', { style: 'font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-2,rgba(128,128,128,0.85));' }, t('Aliases')),
      this.aliasListEl,
      this.inputAlias
    );

    // Section 3: Metadata Info
    this.metaEl = h('div', {
      style: 'margin-top:16px;padding-top:12px;border-top:1px solid var(--line,rgba(0,0,0,0.08));font-size:11.5px;color:var(--text-2,rgba(128,128,128,0.8));display:flex;flex-direction:column;gap:4px;'
    });

    const card = h('div', {
      class: 'properties-card',
      style: 'position:relative;width:400px;max-width:90vw;background:var(--surface,#ffffff);border-radius:18px;box-shadow:0 16px 36px rgba(0,0,0,0.2);border:1px solid var(--line,rgba(0,0,0,0.12));padding:18px 20px;'
    }, header, secTags, secAliases, this.metaEl);

    this.el = h('div', {
      id: 'propertiesModal',
      style: 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:none;align-items:flex-start;justify-content:center;padding-top:12vh;'
    }, card);

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });

    document.body.appendChild(this.el);
  }

  sync() {
    if (!this.tagListEl || !this.aliasListEl) return;
    const doc = this.app?.store?.doc;
    if (!doc) return;

    doc.properties = doc.properties || {};
    const tags = Array.isArray(doc.properties.tags) ? doc.properties.tags : (Array.isArray(doc.tags) ? doc.tags : []);
    const aliases = Array.isArray(doc.properties.aliases) ? doc.properties.aliases : (Array.isArray(doc.aliases) ? doc.aliases : []);

    // Render tags
    this.tagListEl.innerHTML = '';
    if (tags.length === 0) {
      this.tagListEl.appendChild(h('span', { style: 'font-size:12px;color:var(--text-2,rgba(128,128,128,0.6));font-style:italic;' }, t('No tags yet')));
    } else {
      for (const tg of tags) {
        const removeBtn = h('span', {
          style: 'cursor:pointer;margin-left:4px;font-weight:700;opacity:0.7;',
          title: t('Remove')
        }, '×');
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeTag(tg);
        });

        const pill = h('span', {
          style: 'display:inline-flex;align-items:center;background:rgba(0,120,212,0.1);color:#0078d4;font-size:12px;font-weight:600;padding:3px 8px;border-radius:12px;'
        }, tg, removeBtn);
        this.tagListEl.appendChild(pill);
      }
    }

    // Render aliases
    this.aliasListEl.innerHTML = '';
    if (aliases.length === 0) {
      this.aliasListEl.appendChild(h('span', { style: 'font-size:12px;color:var(--text-2,rgba(128,128,128,0.6));font-style:italic;' }, t('No aliases yet')));
    } else {
      for (const al of aliases) {
        const removeBtn = h('span', {
          style: 'cursor:pointer;margin-left:4px;font-weight:700;opacity:0.7;',
          title: t('Remove')
        }, '×');
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeAlias(al);
        });

        const pill = h('span', {
          style: 'display:inline-flex;align-items:center;background:rgba(168,85,247,0.12);color:#9333ea;font-size:12px;font-weight:600;padding:3px 8px;border-radius:12px;'
        }, al, removeBtn);
        this.aliasListEl.appendChild(pill);
      }
    }

    // Metadata
    const tracks = doc.audioTracks?.length || 0;
    this.metaEl.innerHTML = `
      <div><strong>${t('Board ID')}:</strong> ${doc.id || 'N/A'}</div>
      <div><strong>${t('Audio Recordings')}:</strong> ${tracks} track${tracks === 1 ? '' : 's'}</div>
    `;
  }

  async addTag(raw) {
    if (!raw || !raw.trim()) return;
    const tag = raw.trim().startsWith('#') ? raw.trim() : '#' + raw.trim();
    const doc = this.app?.store?.doc;
    if (!doc) return;

    doc.properties = doc.properties || {};
    doc.properties.tags = Array.isArray(doc.properties.tags) ? doc.properties.tags : [];
    if (!doc.properties.tags.includes(tag)) {
      doc.properties.tags.push(tag);
      doc.tags = doc.properties.tags;
      await this.save();
    }
  }

  async removeTag(tag) {
    const doc = this.app?.store?.doc;
    if (!doc || !doc.properties?.tags) return;
    doc.properties.tags = doc.properties.tags.filter((t) => t !== tag);
    doc.tags = doc.properties.tags;
    await this.save();
  }

  async addAlias(raw) {
    if (!raw || !raw.trim()) return;
    const alias = raw.trim();
    const doc = this.app?.store?.doc;
    if (!doc) return;

    doc.properties = doc.properties || {};
    doc.properties.aliases = Array.isArray(doc.properties.aliases) ? doc.properties.aliases : [];
    if (!doc.properties.aliases.includes(alias)) {
      doc.properties.aliases.push(alias);
      doc.aliases = doc.properties.aliases;
      await this.save();
    }
  }

  async removeAlias(alias) {
    const doc = this.app?.store?.doc;
    if (!doc || !doc.properties?.aliases) return;
    doc.properties.aliases = doc.properties.aliases.filter((a) => a !== alias);
    doc.aliases = doc.properties.aliases;
    await this.save();
  }

  async save() {
    this.sync();
    try {
      if (typeof this.app?.persist === 'function') {
        await this.app.persist();
      }
      this.app?.toast?.(t('Properties saved'));
    } catch (err) {
      this.app?.toast?.(t('Failed to save properties: {msg}', { msg: err.message }));
    }
  }

  open() {
    this.build();
    this.sync();
    this.visible = true;
    this.el.style.display = 'flex';
    setTimeout(() => this.inputTag?.focus(), 50);
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
}
