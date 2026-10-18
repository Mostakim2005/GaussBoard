import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioBar, trackMenuPosition } from '../src/js/ui/audio-bar.js';
import { uniqueExportSuffix, videoExportFilename } from '../src/js/export-video.js';

test('recording action menu chooses the side with enough visible space', () => {
  const nearTop = trackMenuPosition({ top: 35, bottom: 65, right: 300 },
    { width: 220, height: 190 }, { width: 800, height: 600 });
  assert.equal(nearTop.top, 69);
  assert.equal(nearTop.maxHeight, 190);
  const nearBottom = trackMenuPosition({ top: 520, bottom: 550, right: 790 },
    { width: 220, height: 190 }, { width: 800, height: 600 });
  assert.equal(nearBottom.top, 326);
  assert.equal(nearBottom.left, 570);
});

test('renaming a recording uses the app dialog and commits an undoable document update', async () => {
  const beforeTrack = { id: 'recording-1', assetId: 'asset-1', name: 'Old title', bookmarks: [{ id: 'b1', t: 100, name: 'Start' }] };
  const app = {
    askText: async () => 'New title',
    store: {
      doc: { audioTracks: [beforeTrack] },
      commit(label, ops) {
        assert.equal(label, 'rename recording');
        assert.equal(ops.length, 1);
        this.doc.audioTracks = ops[0].after.audioTracks;
      }
    },
    replayEngine: { track: beforeTrack }
  };
  const bar = new AudioBar(app);
  bar.track = beforeTrack;
  bar.syncUI = () => {};
  bar.closeSessionMenu = () => {};
  bar.toggleSessionMenu = () => {};
  await bar.renameTrack(beforeTrack);
  assert.equal(app.store.doc.audioTracks[0].name, 'New title');
  assert.equal(bar.track.name, 'New title');
  assert.equal(app.replayEngine.track.name, 'New title');
  assert.equal(app.store.doc.audioTracks[0].bookmarks[0].name, 'Start');
});

test('video export names are Windows-safe and unique to the export time', () => {
  const time = new Date('2026-10-18T12:34:56.789Z');
  const suffix = uniqueExportSuffix(time);
  assert.equal(suffix, '20261018T123456Z');
  assert.equal(videoExportFilename('Math: Chapter 2?', suffix, 'Lecture/One'),
    'Math_ Chapter 2_-Lecture_One-replay-20261018T123456Z.webm');
});
