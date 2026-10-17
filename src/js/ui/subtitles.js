// Subtitle and caption parser & safe display engine.
// Parses .srt and .vtt subtitle formats and renders sanitized captions via textContent (preventing XSS).

/**
 * Convert time string (00:01:23,456 or 00:01:23.456 or 01:23.456) to milliseconds.
 */
export function parseTimecode(tc) {
  const parts = tc.trim().split(':');
  if (parts.length < 2) return 0;

  let h = 0, m = 0, s = 0, ms = 0;
  if (parts.length === 3) {
    h = parseInt(parts[0], 10) || 0;
    m = parseInt(parts[1], 10) || 0;
    const secParts = parts[2].split(/[,.]/);
    s = parseInt(secParts[0], 10) || 0;
    ms = parseInt((secParts[1] || '0').padEnd(3, '0').slice(0, 3), 10) || 0;
  } else {
    m = parseInt(parts[0], 10) || 0;
    const secParts = parts[1].split(/[,.]/);
    s = parseInt(secParts[0], 10) || 0;
    ms = parseInt((secParts[1] || '0').padEnd(3, '0').slice(0, 3), 10) || 0;
  }
  return h * 3600000 + m * 60000 + s * 1000 + ms;
}

/**
 * Parse standard SubRip (.srt) or WebVTT (.vtt) file content into timed cues.
 * @param {string} raw
 * @returns {Array<{ startMs: number, endMs: number, text: string }>}
 */
export function parseSubtitles(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cues = [];

  const timecodeRe = /(\d{1,2}:\d{2}:\d{2}[,.]\d{3}|\d{1,2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{3}|\d{1,2}:\d{2}[,.]\d{3})/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line.startsWith('WEBVTT') || line.startsWith('NOTE')) {
      i++;
      continue;
    }

    const match = timecodeRe.exec(line);
    if (match) {
      const startMs = parseTimecode(match[1]);
      const endMs = parseTimecode(match[2]);
      i++;

      const textLines = [];
      while (i < lines.length && lines[i].trim() !== '') {
        // Strip simple VTT formatting tags: <v Name>, <b>, </i> etc.
        const cleanLine = lines[i].replace(/<[^>]+>/g, '').trim();
        if (cleanLine) textLines.push(cleanLine);
        i++;
      }

      if (startMs < endMs && textLines.length > 0) {
        cues.push({
          startMs,
          endMs,
          text: textLines.join('\n')
        });
      }
    } else {
      i++;
    }
  }

  return cues.sort((a, b) => a.startMs - b.startMs);
}

/**
 * Binary search for active subtitle cue at a given timestamp.
 */
export function findActiveCue(cues, timeMs) {
  if (!cues || !cues.length) return null;
  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const cue = cues[mid];
    if (timeMs >= cue.startMs && timeMs <= cue.endMs) {
      return cue;
    }
    if (timeMs < cue.startMs) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return null;
}

/**
 * XSS-safe Subtitle display container.
 */
export class SubtitleDisplay {
  constructor(host = null) {
    this.host = host || (typeof document !== 'undefined' ? document.getElementById('stage') || document.body : null);
    this.el = null;
    this.cues = [];
  }

  load(rawText) {
    this.cues = parseSubtitles(rawText);
  }

  showText(text) {
    if (!this.el && typeof document !== 'undefined') {
      this.el = document.createElement('div');
      this.el.className = 'subtitle-banner';
      this.el.style.cssText = 'position:absolute;bottom:36px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.82);color:#ffffff;padding:8px 16px;border-radius:8px;font-size:15px;line-height:1.4;text-align:center;max-width:80%;pointer-events:none;z-index:900;display:none;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
      if (this.host) this.host.appendChild(this.el);
    }
    if (!this.el) return;

    if (text) {
      // CRITICAL SECURITY INVARIANT: textContent guarantees any HTML tags render as harmless literal text
      this.el.textContent = text;
      this.el.style.display = 'block';
    } else {
      this.el.textContent = '';
      this.el.style.display = 'none';
    }
  }

  update(timeMs) {
    const cue = findActiveCue(this.cues, timeMs);
    this.showText(cue ? cue.text : '');
  }

  close() {
    this.showText('');
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
      this.el = null;
    }
  }
}
