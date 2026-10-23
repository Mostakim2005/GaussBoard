#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const runs = [
  ['Node custom-feature checks', ['--test', 'test/custom-features.test.mjs']],
  ['Node Markdown extension checks', ['--test', 'test/markdown.test.mjs']],
  ['Node excerpt/link checks', ['--test', 'test/excerpt.test.mjs']],
  ['Node replay-camera checks', ['--test', 'test/replay-reading.test.mjs']],
  ['Node video-framing checks', ['--test', 'test/video-framing.test.mjs']],
  ['Node protocol path security checks', ['--test', 'test/path-security.test.cjs']],
  ['Node multi-tab & common library checks', ['--test', 'test/tabs-and-libraries.test.mjs']],
  ['Node multi-window & lease checks', ['--test', 'test/multi-window.test.mjs']],
  ['Electron 4.8.4.1 audit checks', ['scripts/smoke.js', '--features-4.8.4.1']],
  ['Electron 4.8.8 custom-feature checks', ['scripts/smoke.js', '--features-4.8.8']],
  ['Electron 5.0.0 replay-mode checks', ['scripts/smoke.js', '--features-5.0.0']],
  ['Electron 5.1.0 split/excerpt checks', ['scripts/smoke.js', '--features-5.1.0']]
];

for (const [label, args] of runs) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}
