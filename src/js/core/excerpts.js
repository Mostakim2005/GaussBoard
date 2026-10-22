import { uid } from './util.js';

export const EXCERPT_MIME = 'application/x-gazboard-excerpt+json';
export const EXCERPT_VERSION = 1;
export const MAX_EXCERPT_DATA_URL_LENGTH = 16 * 1024 * 1024;

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

/** Validate clipboard and drag payloads before they become persisted board data. */
export function validateExcerptPayload(value) {
  if (!value || typeof value !== 'object' || value.version !== EXCERPT_VERSION) return false;
  if (typeof value.dataUrl !== 'string'
      || value.dataUrl.length > MAX_EXCERPT_DATA_URL_LENGTH
      || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value.dataUrl)) return false;
  const source = value.source;
  const box = source?.bounds;
  if (!source || typeof source.boardId !== 'string' || !source.boardId || source.boardId.length > 128) return false;
  if (typeof source.boardName !== 'string' || source.boardName.length > 200) return false;
  if (!Number.isInteger(source.page) || source.page < 0 || source.page > 10000) return false;
  if (!box || !['x', 'y', 'w', 'h'].every((key) => finite(box[key]))) return false;
  if (box.w <= 0 || box.h <= 0 || box.w > 1e7 || box.h > 1e7) return false;
  if (!finite(value.width) || !finite(value.height) || value.width <= 0 || value.height <= 0
      || value.width > 1e5 || value.height > 1e5) return false;
  return true;
}
/** Make a persistent image object from a trusted excerpt payload. `at` is its centre. */
export function excerptImageObject(value, at, id = uid('img')) {
  if (!validateExcerptPayload(value) || !at || !finite(at.x) || !finite(at.y)) return null;
  const source = {
    boardId: value.source.boardId,
    boardName: value.source.boardName,
    page: value.source.page,
    bounds: { ...value.source.bounds }
  };
  return {
    id,
    type: 'image',
    x: at.x - value.width / 2,
    y: at.y - value.height / 2,
    w: value.width,
    h: value.height,
    rotation: 0,
    src: value.dataUrl,
    name: `Excerpt — ${source.boardName || 'Board'}`,
    excerptSource: source
  };
}
