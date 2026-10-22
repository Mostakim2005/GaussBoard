/** The shared timestamp source for recording ink and ink added during replay. */
export function audioInkClock(app) {
  const recorder = app?.audioRecorder;
  if (recorder?.state === 'recording' && recorder.activeTrackId) {
    return { trackId: recorder.activeTrackId, timeMs: recorder.currentOffsetMs() };
  }
  const replay = app?.replayEngine;
  if (app?.settings?.audioInkSync !== false && replay?.track?.id
      && (replay.active || app?.audioBar?.visible)) {
    return { trackId: replay.track.id, timeMs: replay.currentTimeMs };
  }
  return null;
}

export function replayInkEnabled(settings) {
  return settings?.audioInkSync !== false;
}

export const REPLAY_DISPLAY_MODES = Object.freeze(['reveal', 'spotlight', 'static']);

/** Preserve the existing animated reveal when a board has no saved choice. */
export function replayDisplayMode(settings, explicitMode) {
  const mode = explicitMode ?? settings?.replayDisplayMode;
  return REPLAY_DISPLAY_MODES.includes(mode) ? mode : 'reveal';
}

/** Keep the user's future-stroke preview choice consistent in live and video replay. */
export function replayGhostMode(settings, explicitGhostMode, explicitDisplayMode) {
  if (replayDisplayMode(settings, explicitDisplayMode) === 'static') return 'hidden';
  return explicitGhostMode === 'hidden' ? 'hidden' : 'translucent';
}

/**
 * Return the frozen-scene filter for one replay pass.
 * Static mode deliberately leaves every session stroke in the cached scene;
 * animated modes move that session into the dynamic replay overlay.
 */
export function replaySceneFilter(trackId, settings, explicitMode) {
  if (!trackId || !replayInkEnabled(settings) || replayDisplayMode(settings, explicitMode) === 'static') return null;
  return (object) => object.audioId !== trackId;
}

const replayStrokesByStore = new WeakMap();

/** Cache track strokes by Store revision so live replay does not scan the board every frame. */
export function replayStrokesForTrack(store, trackId) {
  if (!store || !trackId) return [];
  const canCache = Number.isFinite(store.rev);
  let byTrack = replayStrokesByStore.get(store);
  if (canCache && !byTrack) {
    byTrack = new Map();
    replayStrokesByStore.set(store, byTrack);
  }
  const cached = canCache ? byTrack.get(trackId) : null;
  if (cached && cached.revision === store.rev) {
    byTrack.delete(trackId);
    byTrack.set(trackId, cached);
    return cached.strokes;
  }
  const doc = store.doc;
  const strokes = (doc?.order || []).map((id) => doc.objects?.[id])
    .filter((object) => object?.audioId === trackId && Array.isArray(object.points));
  if (canCache) {
    byTrack.set(trackId, { revision: store.rev, strokes });
    while (byTrack.size > 16) byTrack.delete(byTrack.keys().next().value);
  }
  return strokes;
}
