// lib-loader.js — SharedLibraries-first dynamic script loader with on-demand download prompt.

const loadingCache = new Map();

/**
 * Load an external classic/UMD library script dynamically:
 * 1. Returns window[globalName] immediately if present.
 * 2. Tries local/desktop path (`vendorPath`, which Electron maps transparently to SharedLibraries).
 * 3. On Browser/PWA, checks Cache Storage (`caches.match(downloadUrl)`) if offline/downloaded.
 * 4. If missing everywhere, invokes interactive Library Inspector / Downloader if `app` is passed.
 */
export async function loadScriptLibrary({ id, globalName, vendorPath, sharedPath, downloadUrl, app = null, promptIfMissing = true } = {}) {
  if (typeof window !== 'undefined' && globalName && window[globalName]) {
    return window[globalName];
  }
  if (typeof document === 'undefined') return null;

  const cacheKey = `${id}:${globalName || vendorPath || downloadUrl}`;
  if (loadingCache.has(cacheKey)) return loadingCache.get(cacheKey);

  const loadViaTag = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve(globalName ? window[globalName] : true);
    s.onerror = () => reject(new Error(`Failed loading ${src}`));
    document.head.appendChild(s);
  });

  const attempt = async () => {
    const candidates = [vendorPath, sharedPath].filter(Boolean);
    for (const url of candidates) {
      try {
        const res = await loadViaTag(url);
        if (!globalName || res) return res;
      } catch {
        // try next source
      }
    }

    // Browser/PWA runtime cache fallback (when downloaded via Library Manager)
    if (downloadUrl && typeof caches !== 'undefined') {
      try {
        const cached = await caches.match(downloadUrl);
        if (cached) {
          const blob = await cached.blob();
          const objUrl = URL.createObjectURL(blob);
          try {
            const res = await loadViaTag(objUrl);
            if (!globalName || res) return res;
          } finally {
            setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
          }
        }
      } catch {}
    }

    return null;
  };

  const p = (async () => {
    const first = await attempt();
    if (first) return first;

    if (promptIfMissing && app) {
      try {
        const { promptMissingLibraries } = await import('../ui/library-inspector.js');
        const downloaded = await promptMissingLibraries(app, { highlightIds: [id], reasonLibrary: id });
        if (downloaded) {
          const second = await attempt();
          if (second) return second;
        }
      } catch {}
    }
    throw new Error(`${id || 'Library'} is not available locally. Open Runtime Libraries to download it.`);
  })();

  loadingCache.set(cacheKey, p);
  try {
    return await p;
  } catch (err) {
    loadingCache.delete(cacheKey);
    throw err;
  }
}
