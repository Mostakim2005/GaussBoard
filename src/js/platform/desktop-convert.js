import { pptxToSlides } from '../importers/pptx.js';

const SAFE_IMAGE_MIME = /^image\/(png|jpeg|jpg|gif|webp|bmp)$/i;

const q = new URLSearchParams(location.search);
const token = q.get('token');
const kind = q.get('kind');
const file = q.get('file');

const fail = (e) => window.board.convertError({ token, message: (e && e.message) || String(e) });

async function waitForAssets() {
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch {} }
  const imgs = [...document.images].filter((i) => !i.complete);
  await Promise.all(imgs.map((i) => new Promise((res) => { i.onload = i.onerror = res; })));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

function sanitizeConvertedDom(root) {
  for (const bad of root.querySelectorAll('script, iframe, object, embed, link, meta, base, form, svg')) {
    bad.remove();
  }
  for (const el of root.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const val = String(attr.value || '').trim();
      if (name.startsWith('on') || name === 'srcdoc' || name === 'xlink:href' || name === 'poster' || name === 'background') {
        el.removeAttribute(attr.name);
        continue;
      }
      if ((name === 'href' || name === 'src') && !/^(data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,|blob:|#)/i.test(val)) {
        el.removeAttribute(attr.name);
      }
    }
  }
}

try {
  const buf = await window.board.readFile(file);
  const root = document.getElementById('root');

  if (kind === 'txt') {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const pre = document.createElement('pre');
    pre.className = 'doc';
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordBreak = 'break-word';
    pre.textContent = text;
    root.appendChild(pre);
    const st = document.createElement('style');
    st.textContent = '@page { size: A4; margin: 0; }';
    document.head.appendChild(st);
    await waitForAssets();
    window.board.convertReady({ token, widthMm: 210, heightMm: 297 });
  } else if (kind === 'word') {
    const res = await window.mammoth.convertToHtml(
      { arrayBuffer: buf },
      {
        convertImage: window.mammoth.images.imgElement((image) =>
          image.read('base64').then((b64) => {
            const mime = SAFE_IMAGE_MIME.test(String(image.contentType || '')) ? image.contentType : 'image/png';
            return { src: `data:${mime};base64,${b64}` };
          })
        )
      }
    );
    root.innerHTML = `<div class="doc">${res.value || '<p><em>(empty document)</em></p>'}</div>`;
    sanitizeConvertedDom(root);
    const st = document.createElement('style');
    st.textContent = '@page { size: A4; margin: 0; }';
    document.head.appendChild(st);
    await waitForAssets();
    window.board.convertReady({ token, widthMm: 210, heightMm: 297 });
  } else {
    const { widthPx, heightPx, slides } = await pptxToSlides(buf, { finalLook: q.get('finalLook') !== '0' });
    root.innerHTML = slides.join('');
    sanitizeConvertedDom(root);
    for (const el of root.querySelectorAll('.slide')) {
      el.style.width = widthPx + 'px';
      el.style.height = (heightPx - 1) + 'px';
    }
    const st = document.createElement('style');
    st.textContent = `@page { size: ${widthPx / 96}in ${heightPx / 96}in; margin: 0; }`;
    document.head.appendChild(st);
    await waitForAssets();
    window.board.convertReady({ token, widthMm: (widthPx / 96) * 25.4, heightMm: (heightPx / 96) * 25.4 });
  }
} catch (e) {
  fail(e);
}
