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
