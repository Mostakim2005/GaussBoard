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
  INLINE_MATH_RE,
  stripObsidianComments,
  parseMarkdownAST
} from '../src/js/core/markdown.js';

test('isMarkdown accurately detects GFM and Obsidian syntax', () => {
  assert.equal(isMarkdown('Plain text note without formatting'), false);
  assert.equal(isMarkdown('# Physics Notes & Derivation'), true);
  assert.equal(isMarkdown('> [!NOTE] Newtons Second Law'), true);
  assert.equal(isMarkdown('- [ ] Solve problem set 4'), true);
  assert.equal(isMarkdown('Reference: [[Classical Mechanics#2]]'), true);
  assert.equal(isMarkdown('Water is H~2~O and x^2^'), true);
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

test('renders heading wikilinks with a distinct anchor instead of a pad-page number', () => {
  const html = renderMarkdownToHtml('[[Target Board#Important Section|Open section]]', {
    resolveWikilink: (target, anchor, alias) => ({
      id: target === 'Target Board' ? 'board-1' : '',
      href: `b:board-1#h:${encodeURIComponent(anchor)}`,
      label: alias
    })
  });
  assert.match(html, /href="b:board-1#h:Important%20Section"/);
  assert.match(html, /data-anchor="Important Section"/);
  assert.match(html, />Open section<\/a>/);
});

test('Produces valid XHTML inside SVG <foreignObject> data URI', () => {
  const md = '# Heading\n- [ ] Task 1\n---\nLine 1\nLine 2';
  const uri = buildMarkdownSvgDataUri(md, { width: 400, height: 300 });
  assert.ok(uri.startsWith('data:image/svg+xml;charset=utf-8,'));

  const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;charset=utf-8,', ''));
  assert.match(decoded, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(decoded, /xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.doesNotMatch(decoded, /xmlns="\[/);
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

test('YAML frontmatter supports Obsidian block lists and quoted commas', () => {
  const md = `---
tags:
  - lecture
  - "math, physics"
aliases: ["Quantum, level 2", 'QM: advanced']
---
Body`;
  const { attributes, body } = parseFrontmatter(md);
  assert.deepEqual(attributes.tags, ['lecture', 'math, physics']);
  assert.deepEqual(attributes.aliases, ['Quantum, level 2', 'QM: advanced']);
  assert.deepEqual(countTags(md), { lecture: 1, 'math, physics': 1 });
  assert.equal(body, 'Body');
});

test('renders Obsidian highlight, subscript, superscript and footnotes safely', () => {
  const html = renderMarkdownToHtml('Water is H~2~O and x^2^; ==review this==[^source].\n\n[^source]: See **the source**.');
  assert.match(html, /<sub>2<\/sub>/);
  assert.match(html, /<sup>2<\/sup>/);
  assert.match(html, /<mark class="gb-md-highlight">review this<\/mark>/);
  assert.match(html, /class="gb-md-footnote-ref"><a href="#gb-footnote-source">1<\/a>/);
  assert.match(html, /<li id="gb-footnote-source" value="1">See <strong>the source<\/strong>\.<\/li>/);
});

test('Obsidian comments are omitted from rendered Markdown but kept in fenced code', () => {
  const source = 'Visible %%secret%% text.\n\n```txt\n%%literal code%%\n```';
  const html = renderMarkdownToHtml(source);
  assert.match(html, /Visible\s+\s+text\./);
  assert.doesNotMatch(html, /secret/);
  assert.match(html, /%%literal code%%/);
  assert.match(stripObsidianComments(source), /```txt\n%%literal code%%\n```/);
});

test('Obsidian block ids stay addressable in source without showing in the rendered note', () => {
  const html = renderMarkdownToHtml('A reusable definition. ^definition-1');
  assert.match(html, /class="gb-md-block-id" data-block-id="definition-1"/);
  assert.doesNotMatch(html, />\^definition-1</);
});

test('supports tilde fenced code blocks and keeps their contents out of Markdown parsing', () => {
  const ast = parseMarkdownAST('Text before the code.\n\n~~~js\nconst x = ==literal==;\n~~~\n\nAfter the code.');
  assert.equal(ast.length, 3);
  assert.equal(ast[1].type, 'codeblock');
  assert.equal(ast[1].lang, 'js');
  assert.equal(ast[1].code, 'const x = ==literal==;');
});
