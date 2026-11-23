'use strict';

const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const { resolveEcosystemRegistry } = require('./global-resources.cjs');

function findFfmpegExecutable() {
  if (process.env.GAUSSBOARD_FFMPEG && fs.existsSync(process.env.GAUSSBOARD_FFMPEG)) {
    return process.env.GAUSSBOARD_FFMPEG;
  }
  const regFfmpeg = resolveEcosystemRegistry()?.data?.toolchains?.ffmpeg;
  if (typeof regFfmpeg === 'string' && regFfmpeg && fs.existsSync(regFfmpeg)) {
    return regFfmpeg;
  }
  const localBin = path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (fs.existsSync(localBin)) return localBin;
  return 'ffmpeg';
}

/**
 * Locate sibling subtitle files beside a local video file:
 * <stem>.srt, <stem>.vtt, <stem>.en.srt, <stem>.en.vtt
 */
async function findSiblingSubtitle(videoPath) {
  if (!videoPath || typeof videoPath !== 'string') return null;
  const dir = path.dirname(videoPath);
  const stem = path.basename(videoPath, path.extname(videoPath));
  const candidates = [
    path.join(dir, `${stem}.srt`),
    path.join(dir, `${stem}.vtt`),
    path.join(dir, `${stem}.en.srt`),
    path.join(dir, `${stem}.en.vtt`)
  ];
  for (const file of candidates) {
    try {
      const st = await fsp.stat(file);
      if (st.isFile() && st.size <= 5 * 1024 * 1024) {
        const text = await fsp.readFile(file, 'utf8');
        return { path: file, ext: path.extname(file).toLowerCase(), text };
      }
    } catch {}
  }
  return null;
}

/**
 * Instant stream-copy remux for non-web containers (.mkv) into a cached temp .mp4.
 */
function remuxToMp4(videoPath, { timeoutMs = 60000 } = {}) {
  return new Promise((resolve) => {
    if (!videoPath || !fs.existsSync(videoPath)) {
      resolve({ ok: false, error: 'Video file not found' });
      return;
    }
    const hash = crypto.createHash('sha1').update(path.resolve(videoPath)).digest('hex').slice(0, 12);
    const outPath = path.join(os.tmpdir(), `gaussboard_remux_${hash}.mp4`);
    if (fs.existsSync(outPath)) {
      resolve({ ok: true, mp4Path: outPath, cached: true });
      return;
    }
    const ffmpeg = findFfmpegExecutable();
    cp.execFile(
      ffmpeg,
      ['-y', '-i', videoPath, '-codec', 'copy', '-movflags', '+faststart', outPath],
      { timeout: timeoutMs },
      (err, _stdout, stderr) => {
        if (err) {
          resolve({ ok: false, error: err.code === 'ENOENT' ? 'FFmpeg not found' : (stderr || err.message) });
          return;
        }
        resolve({ ok: true, mp4Path: outPath, cached: false });
      }
    );
  });
}

module.exports = { findFfmpegExecutable, findSiblingSubtitle, remuxToMp4 };
