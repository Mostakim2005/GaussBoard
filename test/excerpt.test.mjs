import test from 'node:test';
import assert from 'node:assert/strict';
import { excerptImageObject, validateExcerptPayload } from '../src/js/core/excerpts.js';
import { linkedRefs, remapBoardIds, refSpans, refsToWikilinks, setBoardDirectory, setCurrentBoard, wikilinksToRefs } from '../src/js/core/boardrefs.js';

const payload = {
  version: 1,
  dataUrl: 'data:image/png;base64,aGVsbG8=',
  width: 320,
  height: 180,
  source: {
    boardId: 'source-board',
    boardName: 'Source Board',
    page: 3,
    bounds: { x: 100, y: 200, w: 500, h: 280 }
  }
};

test('excerpt payload validation rejects malformed image data and unsafe geometry', () => {
  assert.equal(validateExcerptPayload(payload), true);
  assert.equal(validateExcerptPayload({ ...payload, dataUrl: 'data:text/html;base64,PHNjcmlwdD4=' }), false);
  assert.equal(validateExcerptPayload({ ...payload, source: { ...payload.source, bounds: { ...payload.source.bounds, w: Infinity } } }), false);
  assert.equal(validateExcerptPayload({ ...payload, width: 0 }), false);
});

test('excerpt image retains its original board, page and source bounds', () => {
  const obj = excerptImageObject(payload, { x: 800, y: 600 }, 'excerpt-1');
  assert.equal(obj.type, 'image');
  assert.deepEqual({ x: obj.x, y: obj.y, w: obj.w, h: obj.h }, { x: 640, y: 510, w: 320, h: 180 });
  assert.deepEqual(obj.excerptSource, payload.source);
  assert.deepEqual(linkedRefs([obj]), [{ id: 'source-board', name: 'Source Board' }]);
});

test('copying a linked board bundle remaps excerpt source references', () => {
  const [copy] = remapBoardIds([{ id: 'excerpt-1', type: 'image', excerptSource: payload.source }], new Map([['source-board', 'copied-source']]));
  assert.equal(copy.excerptSource.boardId, 'copied-source');
  assert.equal(copy.excerptSource.boardName, 'Source Board');
  assert.deepEqual(copy.excerptSource.bounds, payload.source.bounds);
});

test('Obsidian heading and same-board links resolve to durable board references', () => {
  setBoardDirectory([{ id: 'target-board', name: 'Target Board' }]);
  setCurrentBoard('active-board', 'Active Board');
  const source = '[[Target Board#Important Section|Summary]] and [[#Local Heading]]';
  const native = wikilinksToRefs(source);
  assert.match(native, /@\[Summary\]\(b:target-board#h:Important%20Section\)/);
  assert.match(native, /@\[Active Board\]\(b:active-board#h:Local%20Heading\)/);
  const refs = refSpans(native);
  assert.deepEqual(refs.map(({ id, heading }) => ({ id, heading })), [
    { id: 'target-board', heading: 'Important Section' },
    { id: 'active-board', heading: 'Local Heading' }
  ]);
  assert.match(refsToWikilinks(native), /\[\[Target Board#Important Section\|Summary\]\]/);
});
