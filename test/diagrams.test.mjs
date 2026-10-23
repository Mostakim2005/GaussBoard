import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateChartConfig,
  validateFlowchartSteps,
  synthesizeFlowchartMermaid,
  synthesizeMindmapMermaid,
  validateChartBuilder,
  synthesizeChartConfig,
  getAiPromptTemplate
} from '../src/js/core/diagrams.js';

test('validateChartConfig accepts valid radar and bar chart configs and rejects malformed schemas', () => {
  const validRadar = {
    type: 'radar',
    data: {
      labels: ['Speed', 'Accuracy', 'Endurance', 'Flexibility', 'Strength'],
      datasets: [
        { label: 'Athlete A', data: [85, 90, 75, 80, 95] }
      ]
    }
  };
  const r1 = validateChartConfig(validRadar);
  assert.equal(r1.valid, true);
  assert.equal(r1.error, null);

  const validJson = JSON.stringify(validRadar);
  const r2 = validateChartConfig(validJson);
  assert.equal(r2.valid, true);
  assert.equal(r2.config.type, 'radar');

  const invalidType = { type: 'unknown_type', data: { labels: ['A'], datasets: [{ data: [1] }] } };
  const r3 = validateChartConfig(invalidType);
  assert.equal(r3.valid, false);
  assert.match(r3.error, /Chart type must be one of/);

  const missingLabels = { type: 'bar', data: { datasets: [{ data: [1] }] } };
  const r4 = validateChartConfig(missingLabels);
  assert.equal(r4.valid, false);
  assert.match(r4.error, /labels/);

  const invalidJson = '{ "type": "bar", broken ';
  const r5 = validateChartConfig(invalidJson);
  assert.equal(r5.valid, false);
  assert.match(r5.error, /Invalid JSON format/);
});

test('validateFlowchartSteps detects valid vs invalid input points in decision trees', () => {
  const steps = [
    { id: 'step_start', kind: 'start', text: 'App Start', next: 'step_check' },
    { id: 'step_check', kind: 'decision', text: 'Is Authenticated?', yes: 'step_dashboard', no: 'step_nonexistent' },
    { id: 'step_dashboard', kind: 'action', text: '', next: '__end__' }
  ];

  const validation = validateFlowchartSteps(steps);
  assert.equal(validation.valid, false, 'Overall should be invalid due to missing text and nonexistent target');
  assert.equal(validation.steps.length, 3);

  // step_start is valid
  assert.equal(validation.steps[0].valid, true);
  assert.equal(validation.steps[0].errors.length, 0);

  // step_check has nonexistent "no" target
  assert.equal(validation.steps[1].valid, false);
  assert.ok(validation.steps[1].errors.some(e => e.includes('step_nonexistent')));

  // step_dashboard has empty text
  assert.equal(validation.steps[2].valid, false);
  assert.equal(validation.steps[2].textValid, false);
  assert.ok(validation.steps[2].errors.some(e => e.includes('Missing step label')));
});

test('synthesizeFlowchartMermaid generates clean valid Mermaid syntax with semantic shapes', () => {
  const data = {
    orientation: 'TD',
    steps: [
      { id: 's1', kind: 'start', text: 'Begin', next: 's2' },
      { id: 's2', kind: 'decision', text: 'Pass exam?', yes: 's3', no: 's4' },
      { id: 's3', kind: 'action', text: 'Issue Diploma', next: 's5' },
      { id: 's4', kind: 'action', text: 'Retake Course', next: 's5' },
      { id: 's5', kind: 'end', text: 'Finished', next: null }
    ]
  };

  const mermaid = synthesizeFlowchartMermaid(data);
  assert.ok(mermaid.startsWith('flowchart TD'));
  assert.ok(mermaid.includes('s1(["Begin"])'));
  assert.ok(mermaid.includes('s2{"Pass exam?"}'));
  assert.ok(mermaid.includes('s2 -- Yes --> s3'));
  assert.ok(mermaid.includes('s2 -- No --> s4'));
  assert.ok(mermaid.includes('s3 --> s5'));
});

test('synthesizeMindmapMermaid produces nested indentation outline', () => {
  const data = {
    root: 'Whiteboard Architecture',
    branches: [
      { level: 1, text: 'Core Engine' },
      { level: 2, text: 'Store & Invariants' },
      { level: 2, text: 'Surface & Cameras' },
      { level: 1, text: 'UI Studio' },
      { level: 2, text: 'Mermaid Diagrams' },
      { level: 2, text: 'Chart.js Radar' }
    ]
  };

  const code = synthesizeMindmapMermaid(data);
  assert.ok(code.startsWith('mindmap'));
  assert.ok(code.includes('root(("Whiteboard Architecture"))'));
  assert.ok(code.includes('    Core Engine'));
  assert.ok(code.includes('      Store & Invariants'));
});

test('validateChartBuilder and synthesizeChartConfig enforce category and dataset alignment', () => {
  const validData = {
    type: 'radar',
    title: 'Performance Overview',
    categories: ['Speed', 'Memory', 'CPU', 'Battery', 'Network'],
    datasets: [
      { label: 'Version A', color: '#10b981', valuesStr: '80, 85, 90, 75, 95' },
      { label: 'Version B', color: '#6366f1', valuesStr: '90, 70, 85, 80, 88' }
    ]
  };

  const val1 = validateChartBuilder(validData);
  assert.equal(val1.valid, true);
  assert.equal(val1.errors.length, 0);

  const cfg = synthesizeChartConfig(validData);
  assert.equal(cfg.type, 'radar');
  assert.equal(cfg.data.labels.length, 5);
  assert.equal(cfg.data.datasets.length, 2);
  assert.deepEqual(cfg.data.datasets[0].data, [80, 85, 90, 75, 95]);
  assert.equal(cfg.options.plugins.title.text, 'Performance Overview');

  // Mismatch test: only 4 numbers for 5 categories
  const invalidData = {
    type: 'radar',
    categories: ['A', 'B', 'C', 'D', 'E'],
    datasets: [
      { label: 'Mismatch', color: '#ff0000', valuesStr: '1, 2, 3, 4' }
    ]
  };
  const val2 = validateChartBuilder(invalidData);
  assert.equal(val2.valid, false);
  assert.ok(val2.datasetResults[0].errors[0].includes('does not match categories count'));
});

test('getAiPromptTemplate produces actionable prompts with code fencing instructions', () => {
  const p1 = getAiPromptTemplate('flowchart', 'Payment Gateway Integration');
  assert.ok(p1.includes('Mermaid.js flowchart'));
  assert.ok(p1.includes('Payment Gateway Integration'));
  assert.ok(p1.includes('```mermaid'));

  const p2 = getAiPromptTemplate('chartjs', 'Quarterly Cloud Costs');
  assert.ok(p2.includes('Chart.js configuration JSON'));
  assert.ok(p2.includes('```json'));
});

test('Store serializes and restores diagram objects and boundsOf returns bounding box', async () => {
  const { Store, boundsOf } = await import('../src/js/core/store.js');

  const store = new Store();
  const diagramObj = {
    id: 'diag_test_1',
    type: 'diagram',
    diagramType: 'mermaid',
    subtype: 'flowchart',
    code: 'flowchart TD\n  A --> B',
    builderState: { orientation: 'TD', steps: [] },
    title: 'Architecture Overview',
    dataUrl: 'data:image/svg+xml;utf8,<svg></svg>',
    cardStyle: 'white',
    x: 150,
    y: 200,
    w: 500,
    h: 350
  };

  store.add(diagramObj, 'add diagram');
  assert.equal(store.objects.length, 1);
  assert.equal(store.get('diag_test_1').type, 'diagram');
  assert.equal(store.get('diag_test_1').title, 'Architecture Overview');

  const bounds = boundsOf(diagramObj);
  assert.equal(bounds.x, 150);
  assert.equal(bounds.y, 200);
  assert.equal(bounds.w, 500);
  assert.equal(bounds.h, 350);

  // Undo / Redo round-trip
  store.undo();
  assert.equal(store.objects.length, 0);

  store.redo();
  assert.equal(store.objects.length, 1);
  assert.equal(store.get('diag_test_1').id, 'diag_test_1');
});
