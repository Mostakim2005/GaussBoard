import test from 'node:test';
import assert from 'node:assert/strict';
import security from '../src/js/platform/security.cjs';

test('external links accept web URLs only', () => {
  assert.equal(security.safeExternalUrl('https://example.com/path'), 'https://example.com/path');
  assert.equal(security.safeExternalUrl('http://example.com/'), 'http://example.com/');
  for (const value of [
    'javascript:alert(1)', 'file:///C:/Windows/win.ini', 'ms-settings:',
    'https://user:pass@example.com/', ' https://example.com/', 'https://example.com/\n'
  ]) assert.equal(security.safeExternalUrl(value), null, value);
});

test('release links are confined to the configured GitHub releases route', () => {
  const base = 'https://github.com/Mostakim2005/GaussBoard/releases';
  assert.equal(security.isReleaseUrl(base, base), true);
  assert.equal(security.isReleaseUrl(`${base}/tag/v4.8.20`, base), true);
  for (const value of [
    `${base}.attacker.invalid`, 'https://github.com.evil.invalid/Mostakim2005/GazBoard/releases',
    'https://github.com/Mostakim2005/GazBoard/releases?redirect=attacker',
    'https://user@github.com/Mostakim2005/GazBoard/releases'
  ]) assert.equal(security.isReleaseUrl(value, base), false, value);
});
