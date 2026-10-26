// In-App Video & YouTube Player Suite
// Supports YouTube embedding, direct video files/URLs, full-resolution frame screenshot extraction,
// instant timestamp bookmarking, timing tags, and clickable canvas bookmark cards.

import { h } from './popover.js';
import { t } from '../i18n.js';
import { centerOf, boundsOf } from '../core/store.js';

/**
 * Parse any video URL into a type, ID, and embed/thumbnail sources.
 * @param {string} rawUrl
 * @returns {{ type: 'youtube'|'direct'|'unknown', id?: string, embedUrl?: string, thumbUrl?: string, url: string }}
 */
export function parseVideoUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return { type: 'unknown', url: '' };
  const str = rawUrl.trim();

  // Block dangerous schemes strictly (XSS / protocol injection safeguard)
  if (/^(?:javascript|data:(?!video\/)|vbscript):/i.test(str)) {
    return { type: 'unknown', url: '' };
  }

  // YouTube matchers (standard watch?v=, watch?...&v=, embed/, v/, shorts/, live/, youtu.be/, m.youtube.com, music.youtube.com)
  const ytMatch = str.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch) {
    const id = ytMatch[1];
    let startTime = 0;
    const timeMatch = str.match(/[?&](?:t|start)=([0-9mh]+s?|[0-9]+)/i);
    if (timeMatch) {
      const rawTime = timeMatch[1];
      if (/^\d+$/.test(rawTime)) {
        startTime = parseInt(rawTime, 10);
      } else {
        const mMatch = rawTime.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
        if (mMatch) {
          const h = parseInt(mMatch[1] || '0', 10);
          const m = parseInt(mMatch[2] || '0', 10);
          const s = parseInt(mMatch[3] || '0', 10);
          startTime = h * 3600 + m * 60 + s;
        }
      }
    }
    const startParam = startTime > 0 ? `&start=${startTime}` : '';
    return {
      type: 'youtube',
      id,
      url: str,
      startTime,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&autoplay=1${startParam}`,
      thumbUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      maxThumbUrl: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
    };
  }

  // Direct video files or blob/file streams
  if (/\.(mp4|webm|ogv|mov|mkv)(\?.*)?$/i.test(str) || /^blob:|^file:|^data:video\//i.test(str)) {
    return {
      type: 'direct',
      url: str,
      thumbUrl: null
    };
  }

  // General web URL fallback - only if it is a valid HTTP/HTTPS URL
  if (/^https?:\/\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+$/i.test(str)) {
    return {
      type: 'direct',
      url: str,
      thumbUrl: null
    };
  }

  return { type: 'unknown', url: str };
}

/** Format seconds into mm:ss or hh:mm:ss string */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** Parse mm:ss or hh:mm:ss or raw seconds into integer seconds */
export function parseTimeString(str) {
  if (typeof str === 'number') return Math.max(0, str);
  if (!str || typeof str !== 'string') return 0;
  const parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

/**
 * Open the Insert Video / YouTube Dialog.
 * @param {object} app
 */
export function openVideoInsertDialog(app) {
  const existing = document.getElementById('videoInsertModal');
  if (existing) existing.remove();

  const backdrop = h('div', {
    id: 'videoInsertModal',
    class: 'modal-backdrop',
    style: 'position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;'
  });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  const card = h('div', {
    class: 'video-insert-card',
    style: 'background:var(--surface,#ffffff);color:var(--text,#111111);border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,0.3);border:1px solid var(--line,rgba(0,0,0,0.12));width:92%;max-width:480px;padding:20px;display:flex;flex-direction:column;gap:14px;font-family:inherit;'
  });

  const titleRow = h('div', { style: 'display:flex;align-items:center;justify-content:space-between;' },
    h('h3', { style: 'margin:0;font-size:16px;font-weight:700;' }, t('Insert Video / YouTube')),
    h('button', {
      style: 'background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-2,rgba(128,128,128,0.8));',
      onclick: () => backdrop.remove()
    }, '✕')
  );

  const urlInput = h('input', {
    type: 'text',
    placeholder: t('Paste YouTube link or direct video URL (e.g. https://youtu.be/...)'),
    style: 'width:100%;box-sizing:border-box;padding:8px 12px;border-radius:8px;border:1px solid var(--line,rgba(0,0,0,0.2));background:var(--surface-2,rgba(128,128,128,0.06));color:inherit;font-size:13px;outline:none;'
  });

  const titleInput = h('input', {
    type: 'text',
    placeholder: t('Video title (optional)'),
    style: 'width:100%;box-sizing:border-box;padding:8px 12px;border-radius:8px;border:1px solid var(--line,rgba(0,0,0,0.2));background:var(--surface-2,rgba(128,128,128,0.06));color:inherit;font-size:13px;outline:none;'
  });

  const previewBox = h('div', {
    style: 'height:160px;background:var(--surface-2,rgba(128,128,128,0.08));border-radius:10px;border:1px dashed var(--line,rgba(0,0,0,0.15));display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;'
  }, h('span', { style: 'color:var(--text-2,rgba(128,128,128,0.7));font-size:12.5px;' }, t('Preview will appear here')));

  let currentParsed = null;

  const updatePreview = () => {
    const parsed = parseVideoUrl(urlInput.value);
    currentParsed = parsed;
    const oldVid = previewBox.querySelector('video');
    if (oldVid) { try { oldVid.pause(); oldVid.removeAttribute('src'); oldVid.load(); } catch (_) {} }
    previewBox.innerHTML = '';
    if (parsed.type === 'youtube') {
      const img = h('img', {
        src: parsed.thumbUrl,
        style: 'width:100%;height:100%;object-fit:cover;'
      });
      const badge = h('div', {
        style: 'position:absolute;top:8px;left:8px;background:#ff0000;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;'
      }, 'YouTube');
      previewBox.appendChild(img);
      previewBox.appendChild(badge);
    } else if (parsed.type === 'direct') {
      const vid = h('video', {
        src: parsed.url,
        style: 'width:100%;height:100%;object-fit:contain;',
        muted: true
      });
      previewBox.appendChild(vid);
    } else {
      previewBox.appendChild(h('span', { style: 'color:var(--text-2,rgba(128,128,128,0.7));font-size:12.5px;' }, t('Enter a valid YouTube or video link')));
    }
  };

  urlInput.addEventListener('input', updatePreview);

  const btnCancel = h('button', {
    class: 'btn',
    style: 'padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;',
    onclick: () => backdrop.remove()
  }, t('Cancel'));

  const btnInsert = h('button', {
    class: 'btn primary',
    style: 'padding:6px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;background:var(--accent,#0078d4);color:#ffffff;border:none;',
    onclick: () => {
      const parsed = currentParsed || parseVideoUrl(urlInput.value);
      if (!parsed || parsed.type === 'unknown' || !urlInput.value.trim()) {
        app.toast?.(t('Enter a valid YouTube or video link'));
        urlInput.focus();
        return;
      }

      const title = titleInput.value.trim() || (parsed.type === 'youtube' ? t('YouTube Video') : t('Video'));
      const center = app.surface?.cam ? app.surface.cam.toWorld(window.innerWidth / 2, window.innerHeight / 2) : { x: 0, y: 0 };
      const w = 440, h = 270;
      const x = Math.round(center.x - w / 2);
      const y = Math.round(center.y - h / 2);

      const videoObj = {
        id: 'v_' + Math.random().toString(36).slice(2, 10),
        type: 'video',
        x, y, w, h,
        url: urlInput.value.trim(),
        videoType: parsed.type,
        videoId: parsed.id || null,
        title,
        currentTime: parsed.startTime || 0,
        bookmarks: [],
        thumb: parsed.thumbUrl || null
      };

      app.store.add(videoObj, 'insert video');
      app.surface?.invalidate?.();
      backdrop.remove();
      app.toast(t('Video added to board'));
    }
  }, t('Insert on Board'));

  const actions = h('div', { style: 'display:flex;justify-content:flex-end;gap:8px;margin-top:6px;' },
    btnCancel, btnInsert
  );

  card.appendChild(titleRow);
  card.appendChild(urlInput);
  card.appendChild(titleInput);
  card.appendChild(previewBox);
  card.appendChild(actions);
  backdrop.appendChild(card);
  document.body.appendChild(backdrop);
  setTimeout(() => urlInput.focus(), 50);
}

/**
 * Interactive Video Player Dialog with Full-Res Screenshot & Timestamp Bookmarking
 */
export class VideoPlayerDialog {
  constructor(app, videoObj) {
    this.app = app;
    this.videoObj = videoObj;
    this.el = null;
    this.videoEl = null;
    this.parsed = parseVideoUrl(videoObj.url);
    this.currentTime = 0;
  }

  open() {
    this.close();
    const parsed = this.parsed;

    const backdrop = h('div', {
      id: 'videoPlayerModal',
      class: 'modal-backdrop',
      style: 'position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,0.65);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;'
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    const card = h('div', {
      class: 'video-player-card',
      style: 'background:var(--surface,#1e2227);color:var(--text,#f0f6fc);border-radius:18px;box-shadow:0 16px 48px rgba(0,0,0,0.5);border:1px solid var(--line,rgba(255,255,255,0.12));width:92%;max-width:820px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;font-family:inherit;'
    });

    // 1. Header Bar
    const titleEl = h('b', { style: 'font-size:14.5px;max-width:600px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' },
      this.videoObj.title || t('Video Player')
    );
    const btnClose = h('button', {
      style: 'background:none;border:none;color:inherit;font-size:20px;cursor:pointer;padding:2px 8px;',
      onclick: () => this.close()
    }, '✕');
    const headBar = h('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid var(--line,rgba(255,255,255,0.08));background:rgba(0,0,0,0.15);'
    }, titleEl, btnClose);
    card.appendChild(headBar);

    // 2. Video Player Frame Container
    const playerContainer = h('div', {
      style: 'position:relative;width:100%;height:440px;background:#000000;display:flex;align-items:center;justify-content:center;'
    });

    if (parsed.type === 'youtube') {
      const iframe = h('iframe', {
        src: parsed.embedUrl,
        style: 'width:100%;height:100%;border:none;',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        allowfullscreen: 'true',
        sandbox: 'allow-scripts allow-same-origin allow-presentation allow-forms allow-popups',
        referrerpolicy: 'no-referrer-when-downgrade'
      });
      playerContainer.appendChild(iframe);
      this.iframe = iframe;

      this._onWindowMessage = (e) => {
        try {
          const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (data && data.event === 'infoDelivery' && data.info?.currentTime != null) {
            this.currentTime = data.info.currentTime;
            if (timeDisplay) timeDisplay.textContent = formatTime(this.currentTime);
          }
        } catch (_) {}
      };
      window.addEventListener('message', this._onWindowMessage);
    } else if (parsed.type === 'direct') {
      const vid = h('video', {
        src: parsed.url,
        controls: true,
        autoplay: true,
        crossOrigin: 'anonymous',
        style: 'width:100%;height:100%;object-fit:contain;'
      });
      vid.addEventListener('timeupdate', () => {
        this.currentTime = vid.currentTime;
        if (timeDisplay) timeDisplay.textContent = formatTime(vid.currentTime);
      });
      vid.addEventListener('error', () => {
        playerContainer.innerHTML = '';
        playerContainer.appendChild(h('div', {
          style: 'color:#ff6b6b;font-size:13px;display:flex;align-items:center;gap:8px;'
        }, '⚠️ ' + t('Enter a valid YouTube or video link')));
      });
      playerContainer.appendChild(vid);
      this.videoEl = vid;
    } else {
      playerContainer.appendChild(h('div', {
        style: 'color:var(--text-2,rgba(255,255,255,0.7));font-size:13px;display:flex;flex-direction:column;align-items:center;gap:8px;'
      },
        h('span', { style: 'font-size:24px;' }, '⚠️'),
        h('span', {}, t('Enter a valid YouTube or video link')),
        h('span', { style: 'font-size:11.5px;opacity:0.6;' }, this.videoObj.url || '')
      ));
    }
    card.appendChild(playerContainer);

    // 3. Action Toolbar: Full-Res Screenshot & Timestamp Bookmarking
    const actionToolbar = h('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:rgba(0,0,0,0.2);border-bottom:1px solid var(--line,rgba(255,255,255,0.08));flex-wrap:wrap;gap:8px;'
    });

    const timeDisplay = h('span', {
      style: 'font-size:13px;font-variant-numeric:tabular-nums;color:var(--accent,#00e5ff);font-weight:600;min-width:55px;'
    }, formatTime(this.currentTime));

    // Full-Res Screenshot Button
    const btnScreenshot = h('button', {
      class: 'btn',
      title: t('Extract full-resolution native frame screenshot onto whiteboard'),
      style: 'display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,0.18));background:rgba(255,255,255,0.06);color:inherit;cursor:pointer;font-size:12.5px;font-weight:600;',
      onclick: () => this.extractScreenshot()
    }, '📷 ' + t('Full-Res Screenshot'));

    // Bookmark Timestamp Button
    const btnBookmark = h('button', {
      class: 'btn',
      title: t('Bookmark current video timestamp'),
      style: 'display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,0.18));background:rgba(255,255,255,0.06);color:inherit;cursor:pointer;font-size:12.5px;font-weight:600;',
      onclick: () => this.addTimestampBookmark()
    }, '🔖 ' + t('Bookmark Timestamp'));

    // Copy Markdown Timestamp Link
    const btnCopyMarkdown = h('button', {
      class: 'btn',
      title: t('Copy Markdown timestamp link to clipboard'),
      style: 'display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,0.18));background:rgba(255,255,255,0.06);color:inherit;cursor:pointer;font-size:12.5px;font-weight:600;',
      onclick: () => this.copyMarkdownTimestamp()
    }, '📋 ' + t('Copy Markdown Link'));

    // Stamp Bookmark Card on Board
    const btnStampCard = h('button', {
      class: 'btn',
      title: t('Place clickable timestamp card onto the board'),
      style: 'display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,0.18));background:rgba(255,255,255,0.06);color:inherit;cursor:pointer;font-size:12.5px;font-weight:600;',
      onclick: () => this.stampBookmarkCard()
    }, '📌 ' + t('Stamp Card on Board'));

    actionToolbar.appendChild(h('div', { style: 'display:flex;align-items:center;gap:8px;' }, timeDisplay, btnBookmark, btnScreenshot));
    actionToolbar.appendChild(h('div', { style: 'display:flex;align-items:center;gap:8px;' }, btnCopyMarkdown, btnStampCard));
    card.appendChild(actionToolbar);

    // 4. Bookmarks & Timing Tags Drawer
    const bookmarkSection = h('div', {
      style: 'padding:12px 18px;max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;'
    });
    this.bookmarkListEl = h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;' });
    bookmarkSection.appendChild(h('span', { style: 'font-size:12px;font-weight:600;color:var(--text-2,rgba(255,255,255,0.6));' }, t('Timestamp Bookmarks (Click to seek):')));
    bookmarkSection.appendChild(this.bookmarkListEl);
    card.appendChild(bookmarkSection);

    this.renderBookmarks();

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    this.el = backdrop;

    this._onKeyDown = (e) => {
      if (e.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', this._onKeyDown);
  }

  close() {
    if (this._onKeyDown) {
      window.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
    if (this._onWindowMessage) {
      window.removeEventListener('message', this._onWindowMessage);
      this._onWindowMessage = null;
    }
    if (this.videoEl) {
      try {
        this.videoEl.pause();
        this.videoEl.removeAttribute('src');
        this.videoEl.load();
      } catch (_) {}
      this.videoEl = null;
    }
    if (this.iframe) {
      try {
        this.iframe.src = 'about:blank';
        this.iframe.remove();
      } catch (_) {}
      this.iframe = null;
    }
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }

  renderBookmarks() {
    if (!this.bookmarkListEl) return;
    this.bookmarkListEl.innerHTML = '';
    const bookmarks = Array.isArray(this.videoObj.bookmarks) ? this.videoObj.bookmarks : [];
    if (!bookmarks.length) {
      this.bookmarkListEl.appendChild(h('small', { style: 'color:var(--text-2,rgba(255,255,255,0.45));font-style:italic;' }, t('No bookmarks added yet. Press "Bookmark Timestamp" while playing.')));
      return;
    }

    for (let i = 0; i < bookmarks.length; i++) {
      const bm = bookmarks[i];
      const pill = h('div', {
        style: 'display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.14);border-radius:20px;padding:3px 10px;font-size:12px;cursor:pointer;transition:background 0.15s ease;'
      });
      const tag = h('span', {
        style: 'font-weight:700;color:var(--accent,#00e5ff);',
        onclick: () => this.seekTo(bm.time)
      }, `[${formatTime(bm.time)}]`);
      const label = h('span', {
        onclick: () => this.seekTo(bm.time)
      }, bm.label || t('Bookmark'));
      const btnDel = h('button', {
        style: 'background:none;border:none;color:rgba(255,255,255,0.5);font-size:12px;cursor:pointer;padding:0 2px;',
        title: t('Delete bookmark'),
        onclick: (e) => {
          e.stopPropagation();
          this.removeBookmark(i);
        }
      }, '✕');

      pill.appendChild(tag);
      pill.appendChild(label);
      pill.appendChild(btnDel);
      this.bookmarkListEl.appendChild(pill);
    }
  }

  seekTo(seconds) {
    if (this.videoEl) {
      this.videoEl.currentTime = seconds;
      this.videoEl.play?.();
    } else if (this.iframe && this.parsed.id) {
      let posted = false;
      try {
        if (this.iframe.contentWindow) {
          this.iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [seconds, true]
          }), '*');
          posted = true;
        }
      } catch (_) {}
      if (!posted) {
        this.iframe.src = `https://www.youtube-nocookie.com/embed/${this.parsed.id}?enablejsapi=1&autoplay=1&start=${Math.floor(seconds)}`;
      }
    }
    this.currentTime = seconds;
  }

  addTimestampBookmark() {
    let tSec = Math.floor(this.currentTime);
    if (this.parsed.type === 'youtube' && tSec === 0) {
      const ask = prompt(t('Enter timestamp in seconds or mm:ss:'), '01:00');
      if (ask) tSec = parseTimeString(ask);
    }
    const label = prompt(t('Bookmark label:'), t('Moment at {time}', { time: formatTime(tSec) }));
    if (label == null) return;

    if (!Array.isArray(this.videoObj.bookmarks)) this.videoObj.bookmarks = [];
    this.videoObj.bookmarks.push({ time: tSec, label: label.trim() });
    this.videoObj.bookmarks.sort((a, b) => a.time - b.time);

    // Save to store
    this.app.store.update(this.videoObj.id, { bookmarks: [...this.videoObj.bookmarks] }, 'add bookmark');
    this.renderBookmarks();
    this.app.toast(t('Bookmark added: [{time}]', { time: formatTime(tSec) }));
    this.app.surface?.invalidate?.();
  }

  removeBookmark(idx) {
    if (!Array.isArray(this.videoObj.bookmarks)) return;
    this.videoObj.bookmarks.splice(idx, 1);
    this.app.store.update(this.videoObj.id, { bookmarks: [...this.videoObj.bookmarks] }, 'remove bookmark');
    this.renderBookmarks();
    this.app.surface?.invalidate?.();
  }

  copyMarkdownTimestamp() {
    const tSec = Math.floor(this.currentTime);
    const timeStr = formatTime(tSec);
    let mdLink = '';
    if (this.parsed.type === 'youtube') {
      mdLink = `[${timeStr} - ${this.videoObj.title || 'Video'}](https://youtu.be/${this.parsed.id}?t=${tSec})`;
    } else {
      mdLink = `[${timeStr} - ${this.videoObj.title || 'Video'}](video://${this.videoObj.id}?t=${tSec})`;
    }
    navigator.clipboard?.writeText?.(mdLink);
    this.app.toast(t('Markdown link copied: {link}', { link: mdLink }));
  }

  stampBookmarkCard() {
    const tSec = Math.floor(this.currentTime);
    const timeStr = formatTime(tSec);
    const b = boundsOf(this.videoObj) || this.videoObj;
    const bmCount = (this.videoObj.bookmarks || []).length;
    const cardX = b.x + b.w + 24;
    const cardY = b.y + bmCount * 46;

    const noteObj = {
      id: 'n_' + Math.random().toString(36).slice(2, 10),
      type: 'note',
      x: cardX,
      y: cardY,
      w: 220,
      h: 80,
      color: '#fff3b0',
      text: `📌 **[${timeStr}]** ${this.videoObj.title || 'Video'}\n[Jump to time](video://${this.videoObj.id}?t=${tSec})`
    };

    this.app.store.add(noteObj, 'stamp bookmark card');
    this.app.surface?.invalidate?.();
    this.app.toast(t('Bookmark card dropped onto board at [{time}]', { time: timeStr }));
  }

  async extractScreenshot() {
    if (!this.el) return;
    if (this.videoEl && this.videoEl.videoWidth > 0) {
      // Direct HTML5 video element: capture native uncompressed frame resolution!
      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = this.videoEl.videoWidth;
        offCanvas.height = this.videoEl.videoHeight;
        const ctx = offCanvas.getContext('2d');
        ctx.drawImage(this.videoEl, 0, 0, offCanvas.width, offCanvas.height);
        const dataUrl = offCanvas.toDataURL('image/jpeg', 0.95);

        this.insertScreenshotOnBoard(dataUrl, offCanvas.width, offCanvas.height);
        return;
      } catch (err) {
        console.warn('Direct canvas draw error:', err);
      }
    }

    // YouTube or fallback: fetch high-res thumbnail frame
    if (this.parsed.type === 'youtube' && this.parsed.id) {
      const maxUrl = `https://img.youtube.com/vi/${this.parsed.id}/maxresdefault.jpg`;
      const hqUrl = `https://img.youtube.com/vi/${this.parsed.id}/hqdefault.jpg`;

      // Try fetching maxres image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!this.el) return;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.naturalWidth || 1280;
        offCanvas.height = img.naturalHeight || 720;
        const ctx = offCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = offCanvas.toDataURL('image/jpeg', 0.92);
        this.insertScreenshotOnBoard(dataUrl, offCanvas.width, offCanvas.height);
      };
      img.onerror = () => {
        if (!this.el) return;
        // Fallback to hqUrl
        const img2 = new Image();
        img2.crossOrigin = 'anonymous';
        img2.onload = () => {
          if (!this.el) return;
          const offCanvas = document.createElement('canvas');
          offCanvas.width = img2.naturalWidth || 480;
          offCanvas.height = img2.naturalHeight || 360;
          const ctx = offCanvas.getContext('2d');
          ctx.drawImage(img2, 0, 0);
          this.insertScreenshotOnBoard(offCanvas.toDataURL('image/jpeg', 0.92), offCanvas.width, offCanvas.height);
        };
        img2.src = hqUrl;
      };
      img.src = maxUrl;
      return;
    }

    this.app.toast(t('Could not capture frame at this time'));
  }

  insertScreenshotOnBoard(dataUrl, nativeW, nativeH) {
    const b = boundsOf(this.videoObj) || this.videoObj;
    const targetW = 380;
    const targetH = Math.round(targetW * (nativeH / nativeW));
    const targetX = b.x + b.w + 20;
    const targetY = b.y;

    const imgObj = {
      id: 'img_' + Math.random().toString(36).slice(2, 10),
      type: 'image',
      x: targetX,
      y: targetY,
      w: targetW,
      h: targetH,
      src: dataUrl,
      name: `${this.videoObj.title || 'Video'} - [${formatTime(this.currentTime)}]`
    };

    this.app.store.add(imgObj, 'video screenshot');
    this.app.surface?.invalidate?.();
    this.app.toast(t('Full-res screenshot ({width}×{height}) placed on board', { width: nativeW, height: nativeH }));
  }
}
