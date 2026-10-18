'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { isPathWithin } = require('../src/js/platform/path-security.cjs');

test('app protocol path check accepts files inside source', () => {
  assert.equal(isPathWithin(path.resolve('src'), path.resolve('src/js/app.js')), true);
});

test('app protocol path check rejects traversal and sibling-prefix paths', () => {
  const root = path.resolve('src');
  assert.equal(isPathWithin(root, path.resolve('src-secret/payload.js')), false);
  assert.equal(isPathWithin(root, path.resolve('secret/payload.js')), false);
});
