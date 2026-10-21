#!/usr/bin/env node
/*
 * Run the smoke suite on whatever machine you happen to be on.
 *
 * The suite needs a display. Linux build machines have none, so it is wrapped
 * in xvfb-run there - but xvfb-run is a Linux program, so hard-coding it into
 * the npm script made `npm test` fail on Windows and macOS, where there is a
 * display already and nothing to wrap. Contributors then had to know which of
 * several near-identical scripts was the one for their OS, which is not
 * something anyone should have to know.
 *
 * Each branch below is the exact command that platform is known to pass with.
 * Extra arguments are passed straight through:  npm test -- --headless
 */
'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const electron = require('electron');            // the binary, not the module
// --builtin stands in for GAZBOARD_DISABLE_LIBREOFFICE=1, because `VAR=1 cmd`
// is shell syntax that Windows does not have.
const argv = process.argv.slice(2);
const env = { ...process.env };
// Keep concurrent smoke runs isolated. A fixed userData directory cannot be
// removed while another Electron instance has it open on Windows.
let smokeUserData = null;
if (!env.GAZBOARD_USER_DATA) {
  smokeUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'gazboard-smoke-'));
  env.GAZBOARD_USER_DATA = smokeUserData;
}
if (argv.includes('--builtin')) env.GAZBOARD_DISABLE_LIBREOFFICE = '1';
if (argv.includes('--features-4.8.4.1')) env.GAZBOARD_TEST = './test/smoke-features-4.8.4.1.js';
if (argv.includes('--features-4.8.8')) env.GAZBOARD_TEST = './test/smoke-features-4.8.8.js';
const extra = argv.filter((a) => !['--builtin', '--features-4.8.4.1', '--features-4.8.8'].includes(a));

const onLinux = process.platform === 'linux';
const headless = onLinux && !process.env.DISPLAY;   // a build machine, or a bare shell

// macOS runners have a window server of their own, and need no --no-sandbox
const args = ['.', '--smoke', ...(process.platform === 'darwin' ? [] : ['--no-sandbox']), ...extra];

const run = headless
  ? spawnSync('xvfb-run', ['-a', electron, ...args], { stdio: 'inherit', env })
  : spawnSync(electron, args, { stdio: 'inherit', env });

if (run.error && run.error.code === 'ENOENT' && headless) {
  console.error('\nxvfb-run is not installed. On Debian or Ubuntu:  sudo apt install xvfb');
  if (smokeUserData) fs.rmSync(smokeUserData, { recursive: true, force: true });
  process.exit(1);
}
if (smokeUserData) {
  try { fs.rmSync(smokeUserData, { recursive: true, force: true }); } catch {}
}
process.exit(run.status === null ? 1 : run.status);
