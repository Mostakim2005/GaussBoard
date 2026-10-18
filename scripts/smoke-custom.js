#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const runs = [
  ['Node custom-feature checks', ['--test', 'test/custom-features.test.mjs']],
  ['Node protocol path security checks', ['--test', 'test/path-security.test.cjs']],
  ['Electron 4.8.4.1 audit checks', ['scripts/smoke.js', '--features-4.8.4.1']],
  ['Electron 4.8.8 custom-feature checks', ['scripts/smoke.js', '--features-4.8.8']]
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
