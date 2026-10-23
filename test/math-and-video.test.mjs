import test from 'node:test';
import assert from 'node:assert/strict';
import {
  latexToSymPy,
  latexToMatlab,
  latexToWolfram,
  evalMathExpression,
  generateMatrixTex,
  generateCasesTex
} from '../src/js/core/scientific-math.js';
import {
  parseVideoUrl,
  formatTime,
  parseTimeString
} from '../src/js/ui/video-dialog.js';
import { pageRects, PAGE_GAP } from '../src/js/core/pages.js';

test('scientific math studio: latex converters to SymPy, MATLAB, and Wolfram', () => {
  const tex = '\\frac{a}{b} + x^2 + \\int_{0}^{1} x dx';

  const sympy = latexToSymPy(tex);
  assert.ok(sympy.includes('((a) / (b))'), 'SymPy handles fraction');
  assert.ok(sympy.includes('x**2'), 'SymPy handles power');
  assert.ok(sympy.includes('integrate(x, (x, 0, 1))'), 'SymPy handles definite integral');

  const matlab = latexToMatlab(tex);
  assert.ok(matlab.includes('((a) ./ (b))'), 'MATLAB handles fraction');
  assert.ok(matlab.includes('x.^2'), 'MATLAB handles elementwise power');
  assert.ok(matlab.includes('int(x, x, 0, 1)'), 'MATLAB handles integral');

  const wolfram = latexToWolfram(tex);
  assert.ok(wolfram.includes('integrate x with respect to x from 0 to 1'), 'Wolfram handles integral query');
});

test('scientific math studio: matrix and cases generators', () => {
  const m23 = generateMatrixTex(2, 3);
  assert.ok(m23.includes('\\begin{bmatrix}'), 'Includes bmatrix begin');
  assert.ok(m23.includes('\\end{bmatrix}'), 'Includes bmatrix end');
  assert.ok(m23.includes('&'), 'Contains row separators');

  const cases = generateCasesTex(2);
  assert.ok(cases.includes('\\begin{cases}'), 'Includes cases begin');
  assert.ok(cases.includes('\\end{cases}'), 'Includes cases end');
});

test('scientific math studio: safe offline quick math evaluator', () => {
  assert.deepEqual(evalMathExpression('2 + 3 * 4'), { ok: true, result: '14', numeric: 14 });
  assert.deepEqual(evalMathExpression('\\sqrt{64}'), { ok: true, result: '8', numeric: 8 });
  assert.deepEqual(evalMathExpression('\\frac{10}{2} + 5'), { ok: true, result: '10', numeric: 10 });
  assert.deepEqual(evalMathExpression('2^8'), { ok: true, result: '256', numeric: 256 });
  assert.deepEqual(evalMathExpression('\\sin(\\pi / 2)'), { ok: true, result: '1', numeric: 1 });
  assert.equal(evalMathExpression('badVariable + 1').ok, false, 'Rejects unknown variables');
  assert.equal(evalMathExpression('2**2**2**2').ok, false, 'Rejects dangerous chained power computations');
  assert.equal(evalMathExpression('1 + '.repeat(100) + '1').ok, false, 'Rejects expressions exceeding 256 characters');
});

test('video suite: URL parsing, time formatting, and seek parsers', () => {
  // YouTube URLs
  const yt1 = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(yt1.type, 'youtube');
  assert.equal(yt1.id, 'dQw4w9WgXcQ');
  assert.ok(yt1.embedUrl.includes('embed/dQw4w9WgXcQ'));

  const yt2 = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ?t=45');
  assert.equal(yt2.type, 'youtube');
  assert.equal(yt2.id, 'dQw4w9WgXcQ');

  // Direct video files
  const vid1 = parseVideoUrl('https://example.com/video.mp4');
  assert.equal(vid1.type, 'direct');
  assert.equal(vid1.url, 'https://example.com/video.mp4');

  // Time format
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(45), '00:45');
  assert.equal(formatTime(125), '02:05');
  assert.equal(formatTime(3665), '1:01:05');

  // Time parse
  assert.equal(parseTimeString('02:05'), 125);
  assert.equal(parseTimeString('1:01:05'), 3665);
  assert.equal(parseTimeString('45'), 45);
});

test('page layout: 2-page book spread layout kinematics', () => {
  const pages = [
    { w: 800, h: 1000 },
    { w: 800, h: 1000 },
    { w: 800, h: 1000 }
  ];

  // Vertical layout
  const vRects = pageRects(pages, 'vertical');
  assert.equal(vRects.length, 3);
  assert.equal(vRects[0].x, -400);
  assert.equal(vRects[1].x, -400);

  // Spread (2-page book spread) layout
  const sRects = pageRects(pages, 'spread');
  assert.equal(sRects.length, 3);
  // Page 0 sits on left of spread: x = -800 - PAGE_GAP/2
  assert.equal(sRects[0].x, -800 - PAGE_GAP / 2);
  // Page 1 sits on right of spread: x = PAGE_GAP/2, at same y as Page 0
  assert.equal(sRects[1].x, PAGE_GAP / 2);
  assert.equal(sRects[0].y, sRects[1].y);
  // Page 2 is odd/final page, centered
  assert.equal(sRects[2].x, -400);
});
