import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMarkdown,
  renderMarkdownToHtml,
  toggleTaskAtLine,
  extractTaskItems,
  buildMarkdownSvgDataUri,
  parseFrontmatter,
  countTags,
  INLINE_MATH_RE
} from '../src/js/core/markdown.js';

test('isMarkdown accurately detects GFM and Obsidian syntax', () => {
  assert.equal(isMarkdown('Plain text note without formatting'), false);
  assert.equal(isMarkdown('# Physics Notes & Derivation'), true);
  assert.equal(isMarkdown('> [!NOTE] Newtons Second Law'), true);
  assert.equal(isMarkdown('- [ ] Solve problem set 4'), true);
  assert.equal(isMarkdown('Reference: [[Classical Mechanics#2]]'), true);
  assert.equal(isMarkdown('Inline formula $E = mc^2$ here'), true);
});

test('Renders headings, bold, italic, strikethrough, underline, and inline code', () => {
  const md = '# Title\n**bold** *italic* ~~strike~~ <u>under</u> `const x = 1`';
  const html = renderMarkdownToHtml(md);

  assert.match(html, /<h1 class="gb-md-h gb-md-h1" data-line="0">Title<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<del>strike<\/del>/);
  assert.match(html, /<u>under<\/u>/);
  assert.match(html, /<code class="gb-inline-code">const x = 1<\/code>/);
});

test('Renders Obsidian callout blocks with type and title', () => {
  const md = [
    '> [!WARNING] High Voltage',
    '> Disconnect power before servicing.'
  ].join('\n');

  const html = renderMarkdownToHtml(md);
  assert.match(html, /class="callout callout-warning"/);
  assert.match(html, /High Voltage/);
  assert.match(html, /Disconnect power before servicing\./);
});

test('Renders interactive task checklists with strict XHTML self-closing inputs', () => {
  const md = [
    '- [x] Review lecture slides',
    '- [ ] Solve problem set 4'
  ].join('\n');

  const html = renderMarkdownToHtml(md);
  assert.match(html, /<input type="checkbox" class="gb-task-checkbox" data-line="0" checked="checked" \/>/);
  assert.match(html, /<input type="checkbox" class="gb-task-checkbox" data-line="1" \/>/);

  const tasks = extractTaskItems(md);
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].checked, true);
  assert.equal(tasks[1].checked, false);

  const toggled = toggleTaskAtLine(md, 1);
  assert.equal(toggled.toggled, true);
  assert.equal(toggled.checked, true);
  assert.match(toggled.text, /- \[x\] Solve problem set 4/);
});

test('Renders GFM tables with column alignments', () => {
  const md = [
    '| Feature | Status |',
    '| :--- | :---: |',
    '| Tables | Done |'
  ].join('\n');

  const html = renderMarkdownToHtml(md);
  assert.match(html, /<table class="gb-md-table" data-line="0">/);
  assert.match(html, /<th style="text-align:left">Feature<\/th>/);
  assert.match(html, /<td style="text-align:center">Done<\/td>/);
});

test('Renders Obsidian wikilinks, piped aliases, and obsidian:// URIs', () => {
  const md = 'See [[Classical Mechanics#2|Chapter 2]] and [Vault](obsidian://open?vault=Notes)';
  const html = renderMarkdownToHtml(md);

  assert.match(html, /class="gb-wikilink" href="b:Classical Mechanics#2" data-wikilink="Classical Mechanics" data-anchor="2">Chapter 2<\/a>/);
  assert.match(html, /class="gb-obsidian-uri" href="obsidian:\/\/open\?vault=Notes">Vault<\/a>/);
});

test('Produces valid XHTML inside SVG <foreignObject> data URI', () => {
  const md = '# Heading\n- [ ] Task 1\n---\nLine 1\nLine 2';
  const uri = buildMarkdownSvgDataUri(md, { width: 400, height: 300 });
  assert.ok(uri.startsWith('data:image/svg+xml;charset=utf-8,'));

  const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;charset=utf-8,', ''));
  assert.match(decoded, /<foreignObject width="100%" height="100%">/);
  assert.match(decoded, /<hr class="gb-md-hr" data-line="2" \/>/);
  assert.match(decoded, /<br \/>/);
});

test('Inline math discriminates genuine formulas from currency prices', () => {
  const currencyText = 'This laptop costs $500 and that monitor is $250.';
  const mathMatches = currencyText.match(INLINE_MATH_RE);
  assert.equal(mathMatches, null, 'Currency prices must not be parsed as LaTeX math');

  const formulaText = 'Einstein derived $E = mc^2$ and momentum $p = mv$.';
  const formulaMatches = formulaText.match(INLINE_MATH_RE);
  assert.deepEqual(formulaMatches, ['$E = mc^2$', '$p = mv$']);
});

test('YAML frontmatter metadata is extracted cleanly without polluting card body', () => {
  const md = `---
title: Quantum Mechanics
tags: [physics, modern-physics, lecture-3]
aliases: [QM L3]
---
# Lecture 3
Wave functions and probability density.`;

  const { attributes, body } = parseFrontmatter(md);
  assert.equal(attributes.title, 'Quantum Mechanics');
  assert.deepEqual(attributes.tags, ['physics', 'modern-physics', 'lecture-3']);
  assert.deepEqual(attributes.aliases, ['QM L3']);
  assert.ok(body.startsWith('# Lecture 3'));

  const tags = countTags(md);
  assert.equal(tags['physics'], 1);
  assert.equal(tags['modern-physics'], 1);
  assert.equal(tags['lecture-3'], 1);

  const html = renderMarkdownToHtml(md);
  assert.match(html, /<h1 class="gb-md-h gb-md-h1" data-line="0">Lecture 3<\/h1>/);
  assert.ok(!html.includes('title: Quantum Mechanics'));
});