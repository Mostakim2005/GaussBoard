// Photo & Image Compression Dialog
// Offline downsampling, format conversion, and stream compression with instant savings readout.

import { h } from './popover.js';
import { t } from '../i18n.js';
import { compressImage } from '../core/compression.js';

function formatBytes(bytes) {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Open the interactive Image Compression Dialog.
 * @param {object} app Main application instance
 * @param {object} imgObj The image object to compress
 */
export function openImageCompressDialog(app, imgObj) {
  const existing = document.getElementById('imageCompressModal');
  if (existing) existing.remove();

  if (!imgObj || !imgObj.src) {
    app.toast(t('No image selected for compression'));
    return;
  }

  let quality = 0.75;
  let scale = 0.8;
  let format = 'image/jpeg';
  let compressedResult = null;

  const backdrop = h('div', {
    id: 'imageCompressModal',
    class: 'modal-backdrop',
    style: 'position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;'
  });

  const card = h('div', {
    class: 'compress-dialog-card',
    style: 'background:var(--surface,#ffffff);color:var(--text,#111111);border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,0.28);border:1px solid var(--line,rgba(0,0,0,0.12));width:92%;max-width:460px;padding:20px;display:flex;flex-direction:column;gap:14px;font-family:inherit;'
  });

  // Header
  const titleRow = h('div', { style: 'display:flex;align-items:center;justify-content:space-between;' },
    h('h3', { style: 'margin:0;font-size:16px;font-weight:700;' }, t('Compress Image')),
    h('button', {
      style: 'background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-2,rgba(128,128,128,0.8));',
      onclick: () => backdrop.remove()
    }, '✕')
  );

  // Stats badge row: Before -> After (Savings)
  const statsBox = h('div', {
    style: 'background:var(--surface-2,rgba(128,128,128,0.08));border-radius:10px;padding:12px;display:flex;align-items:center;justify-content:space-around;font-variant-numeric:tabular-nums;'
  });

  const origSizeEl = h('div', { style: 'text-align:center;' },
    h('small', { style: 'color:var(--text-2,rgba(128,128,128,0.8));display:block;font-size:11px;' }, t('Original Size')),
    h('b', { style: 'font-size:14px;' }, '...')
  );
  const arrowEl = h('span', { style: 'color:var(--text-2,rgba(128,128,128,0.5));font-size:16px;' }, '➔');
  const compSizeEl = h('div', { style: 'text-align:center;' },
    h('small', { style: 'color:var(--text-2,rgba(128,128,128,0.8));display:block;font-size:11px;' }, t('Compressed')),
    h('b', { style: 'font-size:14px;color:var(--accent,#0078d4);' }, '...')
  );
  const savingsBadge = h('div', {
    style: 'background:#107c41;color:#ffffff;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:700;'
  }, '0%');
  statsBox.appendChild(origSizeEl);
  statsBox.appendChild(arrowEl);
  statsBox.appendChild(compSizeEl);
  statsBox.appendChild(savingsBadge);

  // Quality slider control
  const qualityLabel = h('span', { style: 'font-size:12.5px;font-weight:600;' }, t('Quality: {percent}%', { percent: Math.round(quality * 100) }));
  const qualitySlider = h('input', {
    type: 'range',
    min: '15',
    max: '95',
    step: '5',
    value: String(Math.round(quality * 100)),
    style: 'width:100%;cursor:pointer;'
  });
  const qualityRow = h('div', { style: 'display:flex;flex-direction:column;gap:4px;' }, qualityLabel, qualitySlider);

  // Scale slider control
  const scaleLabel = h('span', { style: 'font-size:12.5px;font-weight:600;' }, t('Resolution Scale: {percent}%', { percent: Math.round(scale * 100) }));
  const scaleSlider = h('input', {
    type: 'range',
    min: '20',
    max: '100',
    step: '10',
    value: String(Math.round(scale * 100)),
    style: 'width:100%;cursor:pointer;'
  });
  const scaleRow = h('div', { style: 'display:flex;flex-direction:column;gap:4px;' }, scaleLabel, scaleSlider);

  // Format dropdown
  const formatSelect = h('select', {
    style: 'padding:6px 10px;border-radius:8px;border:1px solid var(--line,rgba(0,0,0,0.15));background:var(--surface-2,rgba(128,128,128,0.08));color:inherit;font-size:12.5px;outline:none;'
  },
    h('option', { value: 'image/jpeg' }, 'JPEG (High Compatibility)'),
    h('option', { value: 'image/webp' }, 'WebP (Maximum Compression)'),
    h('option', { value: 'image/png' }, 'PNG (Lossless)')
  );
  formatSelect.value = format;
  const formatRow = h('div', { style: 'display:flex;align-items:center;justify-content:space-between;' },
    h('span', { style: 'font-size:12.5px;font-weight:600;' }, t('Format')),
    formatSelect
  );

  let calcTimer = null;
  const runCalc = async () => {
    try {
      compressedResult = await compressImage(imgObj.src, { quality, scale, format });
      origSizeEl.querySelector('b').textContent = formatBytes(compressedResult.oldBytes);
      compSizeEl.querySelector('b').textContent = formatBytes(compressedResult.newBytes);
      savingsBadge.textContent = `-${compressedResult.savingsPercent}%`;
      savingsBadge.style.background = compressedResult.savingsPercent > 0 ? '#107c41' : '#656d76';
    } catch (e) {
      console.warn('Compression preview error:', e);
    }
  };

  const scheduleCalc = () => {
    if (calcTimer) clearTimeout(calcTimer);
    calcTimer = setTimeout(runCalc, 80);
  };

  qualitySlider.addEventListener('input', () => {
    quality = Number(qualitySlider.value) / 100;
    qualityLabel.textContent = t('Quality: {percent}%', { percent: qualitySlider.value });
    scheduleCalc();
  });

  scaleSlider.addEventListener('input', () => {
    scale = Number(scaleSlider.value) / 100;
    scaleLabel.textContent = t('Resolution Scale: {percent}%', { percent: scaleSlider.value });
    scheduleCalc();
  });

  formatSelect.addEventListener('change', () => {
    format = formatSelect.value;
    scheduleCalc();
  });

  // Action Buttons
  const btnCancel = h('button', {
    class: 'btn',
    style: 'padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;',
    onclick: () => backdrop.remove()
  }, t('Cancel'));

  const btnApply = h('button', {
    class: 'btn primary',
    style: 'padding:6px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;background:var(--accent,#0078d4);color:#ffffff;border:none;',
    onclick: async () => {
      if (!compressedResult) await runCalc();
      if (compressedResult && compressedResult.dataUrl) {
        app.store.update(imgObj.id, { src: compressedResult.dataUrl }, 'compress image');
        app.surface?.invalidate?.();
        backdrop.remove();
        app.toast(t('Image compressed! Saved {percent}% ({bytes})', {
          percent: compressedResult.savingsPercent,
          bytes: formatBytes(compressedResult.oldBytes - compressedResult.newBytes)
        }));
      }
    }
  }, t('Apply Compression'));

  const btnCompressAll = h('button', {
    class: 'btn',
    title: t('Compress all pictures on the current board'),
    style: 'padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;margin-right:auto;',
    onclick: async () => {
      const allImgs = (app.store?.objects || []).filter((o) => o.type === 'image' && o.src);
      if (!allImgs.length) {
        app.toast(t('No images found on board'));
        return;
      }
      let totalSaved = 0;
      let count = 0;
      for (const img of allImgs) {
        try {
          const res = await compressImage(img.src, { quality, scale, format });
          if (res && res.newBytes < res.oldBytes) {
            app.store.update(img.id, { src: res.dataUrl }, 'compress image');
            totalSaved += (res.oldBytes - res.newBytes);
            count++;
          }
        } catch { /* continue */ }
      }
      app.surface?.invalidate?.();
      backdrop.remove();
      app.toast(t('Compressed {count} images, saved {bytes} total', { count, bytes: formatBytes(totalSaved) }));
    }
  }, t('Compress All on Board'));

  const actionRow = h('div', { style: 'display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:6px;' },
    btnCompressAll, btnCancel, btnApply
  );

  card.appendChild(titleRow);
  card.appendChild(statsBox);
  card.appendChild(qualityRow);
  card.appendChild(scaleRow);
  card.appendChild(formatRow);
  card.appendChild(actionRow);
  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  // Initial calculation
  runCalc();
}
