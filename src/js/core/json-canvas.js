/**
 * JSON Canvas 1.0 (https://jsoncanvas.org/spec/1.0/) Importer & Exporter for GazBoard.
 * Bidirectional translation between GazBoard objects and Obsidian .canvas files.
 */

import { uid } from './util.js';

/**
 * Maps GazBoard hex or name colors to Obsidian Canvas standard color integers ('1'..'6') or hex.
 * 1: red, 2: orange, 3: yellow, 4: green, 5: cyan/blue, 6: purple
 */
export function toCanvasColor(color) {
  if (!color || color === 'none' || color === 'transparent') return undefined;
  const c = String(color).toLowerCase();
  if (c.includes('#ff') && c.includes('4a')) return '3'; // yellow note
  if (c === '#e03131' || c.startsWith('#f03') || c.startsWith('#e03')) return '1';
  if (c === '#f76707' || c.startsWith('#f76')) return '2';
  if (c === '#fab005' || c.startsWith('#fa')) return '3';
  if (c === '#2f9e44' || c.startsWith('#2f9') || c.startsWith('#51c')) return '4';
  if (c === '#1971c2' || c.startsWith('#197') || c.startsWith('#00e')) return '5';
  if (c === '#9c36b5' || c.startsWith('#9c3')) return '6';
  return color;
}

/**
 * Maps Obsidian Canvas color ('1'..'6' or hex) to GazBoard hex colors.
 */
export function fromCanvasColor(color) {
  if (!color) return '#201f1e';
  switch (String(color)) {
    case '1': return '#e03131'; // red
    case '2': return '#f76707'; // orange
    case '3': return '#ffd94a'; // yellow
    case '4': return '#2f9e44'; // green
    case '5': return '#1971c2'; // blue/cyan
    case '6': return '#9c36b5'; // purple
    default: return color.startsWith('#') ? color : '#201f1e';
  }
}

/**
 * Converts GazBoard doc state into standard JSON Canvas 1.0 JSON object.
 * @param {Object} doc - GazBoard document state (doc.objects)
 * @param {Object} [options]
 * @returns {Object} { nodes: Array, edges: Array }
 */
export function exportToJsonCanvas(doc, options = {}) {
  const nodes = [];
  const edges = [];
  const objects = doc?.objects || {};

  // Process nodes
  for (const [id, o] of Object.entries(objects)) {
    if (!o || typeof o !== 'object') continue;

    const x = Math.round(o.x ?? 0);
    const y = Math.round(o.y ?? 0);
    const width = Math.round(o.w || o.width || 250);
    const height = Math.round(o.h || o.height || 180);
    const color = toCanvasColor(o.color || o.fill || o.stroke);

    switch (o.type) {
      case 'note':
      case 'text': {
        nodes.push({
          id,
          type: 'text',
          text: o.text || '',
          x, y, width, height,
          ...(color ? { color } : {})
        });
        break;
      }

      case 'image': {
        const isViz = o.subtype === 'visualization';
        if (isViz && o.vizSource) {
          // If it's a Mermaid or Chart visualization, export as markdown text node with code fence
          const lang = o.vizKind === 'mermaid' ? 'mermaid' : 'json';
          nodes.push({
            id,
            type: 'text',
            text: `\`\`\`${lang}\n${o.vizSource}\n\`\`\``,
            x, y, width, height,
            ...(color ? { color } : {})
          });
        } else {
          nodes.push({
            id,
            type: 'file',
            file: o.name || `asset-${id}.png`,
            x, y, width, height,
            ...(color ? { color } : {})
          });
        }
        break;
      }

      case 'video': {
        if (o.url) {
          nodes.push({
            id,
            type: 'link',
            url: o.url,
            x, y, width, height,
            ...(color ? { color } : {})
          });
        } else {
          nodes.push({
            id,
            type: 'file',
            file: o.name || `video-${id}.mp4`,
            x, y, width, height,
            ...(color ? { color } : {})
          });
        }
        break;
      }

      case 'shape': {
        if (o.shapeKind === 'rect' && !o.toId) {
          nodes.push({
            id,
            type: 'group',
            label: o.text || o.name || '',
            x, y, width, height,
            ...(color ? { color } : {})
          });
        }
        break;
      }

      default:
        break;
    }
  }

  // Process connectors / edges
  for (const [id, o] of Object.entries(objects)) {
    if (!o || o.type !== 'connector' || !o.fromId || !o.toId) continue;
    // Verify referenced nodes exist
    const hasFrom = nodes.some(n => n.id === o.fromId);
    const hasTo = nodes.some(n => n.id === o.toId);
    if (!hasFrom || !hasTo) continue;

    const edge = {
      id,
      fromNode: o.fromId,
      toNode: o.toId,
      fromSide: o.fromSide || 'right',
      toSide: o.toSide || 'left',
      toEnd: o.heads?.includes('end') !== false ? 'arrow' : 'none',
      ...(o.text ? { label: o.text } : {})
    };
    const color = toCanvasColor(o.stroke || o.color);
    if (color) edge.color = color;
    edges.push(edge);
  }

  return { nodes, edges };
}

/**
 * Imports JSON Canvas 1.0 JSON and converts it into GazBoard objects and operations.
 * @param {Object|string} canvasInput - JSON string or parsed JSON Canvas object
 * @param {Object} [options] - Placement offset { offsetX, offsetY }
 * @returns {{ objects: Object, count: number }}
 */
export function importFromJsonCanvas(canvasInput, options = {}) {
  let data = canvasInput;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (err) {
      throw new Error(`Invalid JSON Canvas payload: ${err.message}`);
    }
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Malformed JSON Canvas data');
  }

  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const edges = Array.isArray(data.edges) ? data.edges : [];
  const offsetX = options.offsetX || 0;
  const offsetY = options.offsetY || 0;

  const importedObjects = {};
  const idMap = new Map(); // maps canvas node id to gazboard uid

  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    const cid = String(node.id || uid('node'));
    const gid = uid(node.type === 'text' ? 'note' : node.type === 'link' ? 'video' : 'img');
    idMap.set(cid, gid);

    const x = (node.x || 0) + offsetX;
    const y = (node.y || 0) + offsetY;
    const w = node.width || 250;
    const h = node.height || 180;
    const color = fromCanvasColor(node.color);

    switch (node.type) {
      case 'text': {
        const text = node.text || '';
        // Detect if text contains a Mermaid diagram fence
        const isMermaid = text.trim().startsWith('```mermaid');
        if (isMermaid) {
          const vizSource = text.replace(/^```mermaid\s*\n?/, '').replace(/\n?```$/, '').trim();
          importedObjects[gid] = {
            id: gid,
            type: 'image',
            subtype: 'visualization',
            vizKind: 'mermaid',
            vizSource,
            name: 'Imported Mermaid Diagram',
            x, y, w, h,
            color
          };
        } else {
          importedObjects[gid] = {
            id: gid,
            type: 'note',
            text,
            x, y, w, h,
            color: node.color ? color : '#ffd94a',
            font: 'hand'
          };
        }
        break;
      }

      case 'file': {
        importedObjects[gid] = {
          id: gid,
          type: 'image',
          name: node.file || 'Canvas Asset',
          src: node.file || '',
          x, y, w, h,
          color
        };
        break;
      }

      case 'link': {
        importedObjects[gid] = {
          id: gid,
          type: 'video',
          url: node.url || '',
          name: node.url || 'Web Link',
          x, y, w, h,
          color
        };
        break;
      }

      case 'group': {
        importedObjects[gid] = {
          id: gid,
          type: 'shape',
          shapeKind: 'rect',
          text: node.label || '',
          x, y, w, h,
          stroke: color || '#201f1e',
          fill: 'none',
          lineWidth: 2,
          dash: [6, 6]
        };
        break;
      }

      default:
        break;
    }
  }

  // Import edges as connectors
  for (const edge of edges) {
    if (!edge || typeof edge !== 'object') continue;
    const fromGid = idMap.get(edge.fromNode);
    const toGid = idMap.get(edge.toNode);
    if (!fromGid || !toGid) continue;

    const edgeGid = uid('conn');
    const stroke = fromCanvasColor(edge.color);
    importedObjects[edgeGid] = {
      id: edgeGid,
      type: 'connector',
      fromId: fromGid,
      toId: toGid,
      fromSide: edge.fromSide || 'right',
      toSide: edge.toSide || 'left',
      heads: edge.toEnd === 'none' ? [] : ['end'],
      text: edge.label || '',
      stroke: stroke || '#201f1e',
      lineWidth: 2,
      route: 'curved'
    };
  }

  return {
    objects: importedObjects,
    count: Object.keys(importedObjects).length
  };
}
