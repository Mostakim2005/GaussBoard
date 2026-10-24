/**
 * @file dataview.js
 * @description Lightweight Pure-JavaScript Dataview Query Engine for GazBoard
 *
 * Implements Obsidian Dataview-style tabular and list queries over whiteboard
 * objects, sticky notes, formulas, boards, and tags.
 *
 * Syntax Supported:
 *   TABLE [field1], [field2] ...
 *   [FROM #tag | "board"]
 *   [WHERE condition]
 *   [SORT field [ASC|DESC]]
 *   [LIMIT n]
 *
 * Example:
 *   TABLE id, type, text
 *   WHERE type = "note"
 *   SORT id DESC
 *   LIMIT 10
 */

import { t } from '../i18n.js';

export class DataviewEngine {
  /**
   * Parse and execute a Dataview query string against an object store or collection
   * @param {string} queryStr
   * @param {object} store The application store or { doc: { objects } }
   * @returns {{ ok: boolean, type: 'TABLE'|'LIST', columns?: string[], rows?: any[][], items?: any[], count: number, html: string, error?: string }}
   */
  static execute(queryStr, store) {
    if (!queryStr || typeof queryStr !== 'string') {
      return { ok: false, error: 'Empty query string', count: 0, html: '' };
    }

    try {
      const clean = queryStr.trim().replace(/^```(?:dataview)?\s*/i, '').replace(/```$/i, '').trim();
      let lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 1) {
        lines = lines[0].split(/\s+(?=WHERE\b|FROM\b|SORT\b|LIMIT\b)/i).map(l => l.trim()).filter(Boolean);
      }
      if (!lines.length) return { ok: false, error: 'Empty query lines', count: 0, html: '' };

      const firstLine = lines[0];
      const isTable = /^TABLE\b/i.test(firstLine);
      const isList = /^LIST\b/i.test(firstLine);

      if (!isTable && !isList) {
        return { ok: false, error: 'Query must begin with TABLE or LIST', count: 0, html: '' };
      }

      // 1. Parse Fields / Columns
      let columns = [];
      if (isTable) {
        const fieldStr = firstLine.replace(/^TABLE\s*/i, '').trim();
        columns = fieldStr ? fieldStr.split(',').map((f) => f.trim()).filter(Boolean) : ['id', 'type', 'text'];
      } else {
        const fieldStr = firstLine.replace(/^LIST\s*/i, '').trim();
        columns = fieldStr ? [fieldStr] : ['text'];
      }

      // 2. Parse Clauses: WHERE, SORT, LIMIT
      let whereClause = null;
      let sortField = null;
      let sortDir = 'ASC';
      let limit = 50;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^WHERE\s+/i.test(line)) {
          whereClause = line.replace(/^WHERE\s+/i, '').trim();
        } else if (/^SORT\s+/i.test(line)) {
          const sortParts = line.replace(/^SORT\s+/i, '').trim().split(/\s+/);
          sortField = sortParts[0];
          if (sortParts[1] && /^DESC$/i.test(sortParts[1])) sortDir = 'DESC';
        } else if (/^LIMIT\s+/i.test(line)) {
          const lNum = parseInt(line.replace(/^LIMIT\s+/i, '').trim(), 10);
          if (!isNaN(lNum) && lNum > 0) limit = lNum;
        }
      }

      // 3. Extract items from store
      const rawObjects = store?.doc?.objects ? Object.values(store.doc.objects) : (Array.isArray(store) ? store : []);
      let items = rawObjects.filter(Boolean);

      // 4. Apply WHERE filtering
      if (whereClause) {
        items = items.filter((item) => {
          return DataviewEngine.evaluateCondition(whereClause, item);
        });
      }

      // 5. Apply SORT
      if (sortField) {
        items.sort((a, b) => {
          const valA = DataviewEngine.resolveField(a, sortField);
          const valB = DataviewEngine.resolveField(b, sortField);
          if (valA === valB) return 0;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;
          const cmp = valA > valB ? 1 : -1;
          return sortDir === 'DESC' ? -cmp : cmp;
        });
      }

      // 6. Apply LIMIT
      const totalCount = items.length;
      items = items.slice(0, limit);

      // 7. Format Rows & HTML
      if (isTable) {
        const rows = items.map((item) => {
          return columns.map((col) => DataviewEngine.resolveField(item, col));
        });
        const html = DataviewEngine.renderTableHtml(columns, rows);
        return { ok: true, type: 'table', typeUpper: 'TABLE', columns, rows, count: totalCount, html };
      } else {
        const listItems = items.map((item) => DataviewEngine.resolveField(item, columns[0] || 'text'));
        const html = DataviewEngine.renderListHtml(listItems);
        return { ok: true, type: 'list', typeUpper: 'LIST', items: listItems, count: totalCount, html };
      }
    } catch (err) {
      return { ok: false, error: err.message, count: 0, html: '' };
    }
  }

  /**
   * Resolve field value from object (supports nested props e.g. 'card.stability')
   * Hardened against prototype pollution (__proto__, prototype, constructor).
   * @param {object} obj
   * @param {string} field
   */
  static resolveField(obj, field) {
    if (!obj || !field) return '';
    const cleanField = field.trim();
    const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
    if (BLOCKED_KEYS.has(cleanField)) return '';

    if (cleanField.includes('.')) {
      const parts = cleanField.split('.');
      let cur = obj;
      for (const p of parts) {
        if (BLOCKED_KEYS.has(p)) return '';
        if (cur && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, p)) {
          cur = cur[p];
        } else {
          return '';
        }
      }
      return cur !== undefined && cur !== null ? cur : '';
    }

    if (cleanField === 'tags') {
      if (Array.isArray(obj.tags)) return obj.tags.join(', ');
      if (typeof obj.text === 'string') {
        const matches = obj.text.match(/(?:^|\s)#([a-zA-Z0-9_\-]+)/g);
        return matches ? matches.map((m) => m.trim()).join(', ') : '';
      }
      return '';
    }

    if (!Object.prototype.hasOwnProperty.call(obj, cleanField)) return '';
    const val = obj[cleanField];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  }

  /**
   * Safely evaluate a basic WHERE condition without eval()
   * Supports: contains(tags, "val"), field CONTAINS "val", field = "val", field != "val", field > num, field < num, AND chaining
   */
  static evaluateCondition(clause, item) {
    const s = clause.trim();

    // Multi-clause conjunction (AND)
    if (/\s+AND\s+/i.test(s)) {
      const subClauses = s.split(/\s+AND\s+/i);
      return subClauses.every((sub) => DataviewEngine.evaluateCondition(sub.trim(), item));
    }

    // Infix: field CONTAINS "string" or field CONTAINS string
    const infixContainsMatch = s.match(/^([a-zA-Z0-9_.-]+)\s+contains\s+(?:["']([^"']+)["']|([a-zA-Z0-9_.-]+))$/i);
    if (infixContainsMatch) {
      const field = infixContainsMatch[1];
      const target = (infixContainsMatch[2] !== undefined ? infixContainsMatch[2] : infixContainsMatch[3]).toLowerCase();
      const val = String(DataviewEngine.resolveField(item, field)).toLowerCase();
      return val.includes(target);
    }

    // contains(field, "string")
    const containsMatch = s.match(/contains\(\s*([a-zA-Z0-9_.-]+)\s*,\s*["']([^"']+)["']\s*\)/i);
    if (containsMatch) {
      const field = containsMatch[1];
      const target = containsMatch[2].toLowerCase();
      const val = String(DataviewEngine.resolveField(item, field)).toLowerCase();
      return val.includes(target);
    }

    // field = "value" or field = value
    const eqMatch = s.match(/^([a-zA-Z0-9_.-]+)\s*=\s*(?:["']([^"']+)["']|([a-zA-Z0-9_.-]+))$/);
    if (eqMatch) {
      const field = eqMatch[1];
      const target = eqMatch[2] !== undefined ? eqMatch[2] : eqMatch[3];
      const val = String(DataviewEngine.resolveField(item, field));
      return val.toLowerCase() === target.toLowerCase();
    }

    // field != "value"
    const neqMatch = s.match(/^([a-zA-Z0-9_.-]+)\s*!=\s*(?:["']([^"']+)["']|([a-zA-Z0-9_.-]+))$/);
    if (neqMatch) {
      const field = neqMatch[1];
      const target = neqMatch[2] !== undefined ? neqMatch[2] : neqMatch[3];
      const val = String(DataviewEngine.resolveField(item, field));
      return val.toLowerCase() !== target.toLowerCase();
    }

    // field > number
    const gtMatch = s.match(/^([a-zA-Z0-9_.-]+)\s*>\s*([0-9.-]+)$/);
    if (gtMatch) {
      const field = gtMatch[1];
      const num = parseFloat(gtMatch[2]);
      const val = parseFloat(DataviewEngine.resolveField(item, field));
      return !isNaN(val) && val > num;
    }

    // field < number
    const ltMatch = s.match(/^([a-zA-Z0-9_.-]+)\s*<\s*([0-9.-]+)$/);
    if (ltMatch) {
      const field = ltMatch[1];
      const num = parseFloat(ltMatch[2]);
      const val = parseFloat(DataviewEngine.resolveField(item, field));
      return !isNaN(val) && val < num;
    }

    return true;
  }

  /**
   * Render table HTML
   */
  static renderTableHtml(columns, rows) {
    if (!rows.length) {
      return `<div class="dataview-empty">${t('Dataview: No matching records found.')}</div>`;
    }
    const ths = columns.map((col) => `<th>${col.toUpperCase()}</th>`).join('');
    const trs = rows.map((row) => {
      const tds = row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');

    return `
      <div class="dataview-table-wrapper" style="overflow-x:auto;max-height:360px;">
        <table class="dataview-table" style="width:100%;border-collapse:collapse;font-size:12px;font-family:inherit;">
          <thead><tr style="background:rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.12);text-align:left;">${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render list HTML
   */
  static renderListHtml(items) {
    if (!items.length) {
      return `<div class="dataview-empty">${t('Dataview: No matching records found.')}</div>`;
    }
    const lis = items.map((it) => `<li style="margin:4px 0;">${escapeHtml(String(it))}</li>`).join('');
    return `<ul class="dataview-list" style="margin:4px 0 4px 18px;font-size:12px;">${lis}</ul>`;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
