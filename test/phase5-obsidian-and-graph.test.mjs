import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { exportToJsonCanvas, importFromJsonCanvas, toCanvasColor, fromCanvasColor } from '../src/js/core/json-canvas.js';
import { generateMarkdownSidecar } from '../src/js/core/markdown-sidecar.js';

describe('Phase 5: JSON Canvas 1.0 and Obsidian Interoperability', () => {
  it('converts colors accurately between GazBoard hex and Canvas integers', () => {
    assert.equal(toCanvasColor('#ffd94a'), '3'); // yellow
    assert.equal(toCanvasColor('#e03131'), '1'); // red
    assert.equal(toCanvasColor('#1971c2'), '5'); // blue
    assert.equal(fromCanvasColor('1'), '#e03131');
    assert.equal(fromCanvasColor('3'), '#ffd94a');
    assert.equal(fromCanvasColor('5'), '#1971c2');
  });

  it('exports GazBoard doc objects into valid JSON Canvas 1.0 schema', () => {
    const mockDoc = {
      objects: {
        'n1': { id: 'n1', type: 'note', text: '# Idea Note\nSome content', x: 100, y: 150, w: 200, h: 120, color: '#ffd94a' },
        't1': { id: 't1', type: 'text', text: 'LaTeX equation: $x^2 + y^2 = r^2$', x: 350, y: 150, w: 220, h: 80 },
        'v1': { id: 'v1', type: 'video', url: 'https://youtube.com/watch?v=abc1234', x: 100, y: 350, w: 320, h: 180 },
        'img1': { id: 'img1', type: 'image', subtype: 'visualization', vizKind: 'mermaid', vizSource: 'graph TD\nA-->B', x: 450, y: 350, w: 300, h: 200 },
        'c1': { id: 'c1', type: 'connector', fromId: 'n1', toId: 't1', fromSide: 'right', toSide: 'left', heads: ['end'], text: 'causes' }
      }
    };

    const canvas = exportToJsonCanvas(mockDoc);
    assert.ok(Array.isArray(canvas.nodes), 'canvas.nodes must be an array');
    assert.ok(Array.isArray(canvas.edges), 'canvas.edges must be an array');

    assert.equal(canvas.nodes.length, 4, 'Should export 4 valid nodes');
    assert.equal(canvas.edges.length, 1, 'Should export 1 connector edge');

    const node1 = canvas.nodes.find(n => n.id === 'n1');
    assert.ok(node1);
    assert.equal(node1.type, 'text');
    assert.equal(node1.color, '3');

    const edge1 = canvas.edges.find(e => e.id === 'c1');
    assert.ok(edge1);
    assert.equal(edge1.fromNode, 'n1');
    assert.equal(edge1.toNode, 't1');
    assert.equal(edge1.label, 'causes');
    assert.equal(edge1.toEnd, 'arrow');
  });

  it('imports JSON Canvas 1.0 payload into GazBoard objects with connectors intact', () => {
    const canvasPayload = {
      nodes: [
        { id: 'node_a', type: 'text', text: 'First Concept', x: 50, y: 80, width: 220, height: 140, color: '4' },
        { id: 'node_b', type: 'text', text: '```mermaid\ngraph LR\nStart-->End\n```', x: 320, y: 80, width: 250, height: 150 },
        { id: 'node_c', type: 'link', url: 'https://youtu.be/test123', x: 50, y: 260, width: 300, height: 170 }
      ],
      edges: [
        { id: 'edge_ab', fromNode: 'node_a', toNode: 'node_b', label: 'leads to', toEnd: 'arrow' }
      ]
    };

    const { objects, count } = importFromJsonCanvas(canvasPayload, { offsetX: 10, offsetY: 20 });
    assert.equal(count, 4, 'Should create 3 nodes + 1 connector');

    const objList = Object.values(objects);
    const noteObj = objList.find(o => o.type === 'note');
    assert.ok(noteObj, 'Should import text node as note');
    assert.equal(noteObj.text, 'First Concept');
    assert.equal(noteObj.x, 60);

    const vizObj = objList.find(o => o.subtype === 'visualization');
    assert.ok(vizObj, 'Should detect and import mermaid fenced node as visualization');
    assert.equal(vizObj.vizKind, 'mermaid');
    assert.ok(vizObj.vizSource.includes('Start-->End'));

    const connObj = objList.find(o => o.type === 'connector');
    assert.ok(connObj, 'Should import edge as connector');
    assert.equal(connObj.text, 'leads to');
    assert.deepEqual(connObj.heads, ['end']);
  });
});

describe('Phase 5: Markdown Sidecar and Knowledge Graph Data', () => {
  it('generates clean Obsidian Markdown with YAML frontmatter and card sections', () => {
    const doc = {
      tags: ['calculus', 'physics'],
      aliases: ['MathLecture4'],
      objects: {
        'n1': { type: 'note', text: 'Fundamental theorem of calculus:\n$$\\int_a^b f(x) dx = F(b) - F(a)$$', color: '#ffd94a' },
        'v1': {
          type: 'video',
          url: 'https://youtube.com/watch?v=calc101',
          name: 'Calculus Lecture 1',
          bookmarks: [
            { time: 75, label: 'Integration by parts' },
            { time: 245, label: 'Substitution method' }
          ]
        },
        'd1': {
          type: 'image',
          subtype: 'visualization',
          vizKind: 'mermaid',
          name: 'Derivative Flowchart',
          vizSource: 'graph TD\nf(x)-->df/dx'
        }
      }
    };

    const md = generateMarkdownSidecar(doc, 'Calculus Notes');
    assert.ok(md.startsWith('---'), 'Should start with YAML frontmatter');
    assert.ok(md.includes('title: "Calculus Notes"'));
    assert.ok(md.includes('tags: ["calculus", "physics"]'));
    assert.ok(md.includes('aliases: ["MathLecture4"]'));
    assert.ok(md.includes('generator: GazBoard v5.9.0'));

    // Check notes and math
    assert.ok(md.includes('Fundamental theorem of calculus'));
    assert.ok(md.includes('$$\\int_a^b f(x) dx = F(b) - F(a)$$'));

    // Check video bookmarks
    assert.ok(md.includes('Calculus Lecture 1'));
    assert.ok(md.includes('`[01:15]` Integration by parts'));
    assert.ok(md.includes('`[04:05]` Substitution method'));

    // Check mermaid block
    assert.ok(md.includes('```mermaid'));
    assert.ok(md.includes('f(x)-->df/dx'));
  });
});
