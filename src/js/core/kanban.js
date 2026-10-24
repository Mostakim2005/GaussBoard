/**
 * @file kanban.js
 * @description In-Canvas Interactive Kanban Board Component for GazBoard (Phase 9 / v6.9.0)
 *
 * Implements a rich 3-to-4 column Kanban board object (`type: 'kanban'`) directly on the
 * whiteboard canvas, featuring customizable columns, task creation, column state progression,
 * and persistent Store synchronization.
 */

import { t } from '../i18n.js';
import { uid } from './util.js';

export const DEFAULT_KANBAN_COLUMNS = [
  { id: 'todo', title: 'To Do', color: '#3b82f6' },
  { id: 'in_progress', title: 'In Progress', color: '#f59e0b' },
  { id: 'review', title: 'Review', color: '#a855f7' },
  { id: 'done', title: 'Done', color: '#10b981' }
];

export class KanbanManager {
  /**
   * Create an initial blank Kanban object schema for the board
   * @param {number} x
   * @param {number} y
   * @param {string} [title]
   * @returns {object} Kanban object
   */
  static createDefault(x = 100, y = 100, title = 'Project Sprint') {
    return {
      id: `kanban_${uid()}`,
      type: 'kanban',
      x,
      y,
      w: 640,
      h: 420,
      title: title || t('Sprint Kanban'),
      columns: [
        {
          id: 'todo',
          title: t('To Do'),
          color: '#3b82f6',
          cards: [
            { id: `c_${uid()}`, text: t('Define experiment parameters'), done: false },
            { id: `c_${uid()}`, text: t('Assemble circuit breadboard'), done: false }
          ]
        },
        {
          id: 'in_progress',
          title: t('In Progress'),
          color: '#f59e0b',
          cards: [
            { id: `c_${uid()}`, text: t('Run oscilloscope frequency response sweep'), done: false }
          ]
        },
        {
          id: 'done',
          title: t('Done'),
          color: '#10b981',
          cards: [
            { id: `c_${uid()}`, text: t('Formulate null hypothesis'), done: true }
          ]
        }
      ]
    };
  }

  /**
   * Add a new task card to a specific column
   * @param {object} kanbanObj
   * @param {string} colId
   * @param {string} text
   * @returns {boolean}
   */
  static addCard(kanbanObj, colId, text) {
    if (!kanbanObj || !kanbanObj.columns || !text) return false;
    const col = kanbanObj.columns.find((c) => c.id === colId);
    if (!col) return false;
    col.cards = col.cards || [];
    col.cards.push({
      id: `c_${uid()}`,
      text: text.trim(),
      done: colId === 'done',
      created: Date.now()
    });
    return true;
  }

  /**
   * Move card from one column to another
   * @param {object} kanbanObj
   * @param {string} cardId
   * @param {string} targetColId
   * @returns {boolean}
   */
  static moveCard(kanbanObj, cardId, targetColId) {
    if (!kanbanObj || !kanbanObj.columns) return false;
    let foundCard = null;

    for (const col of kanbanObj.columns) {
      const idx = (col.cards || []).findIndex((c) => c.id === cardId);
      if (idx !== -1) {
        foundCard = col.cards.splice(idx, 1)[0];
        break;
      }
    }

    if (!foundCard) return false;
    const targetCol = kanbanObj.columns.find((c) => c.id === targetColId);
    if (!targetCol) return false;

    foundCard.done = targetColId === 'done';
    targetCol.cards = targetCol.cards || [];
    targetCol.cards.push(foundCard);
    return true;
  }

  /**
   * Toggle task checkbox state
   * @param {object} kanbanObj
   * @param {string} cardId
   */
  static toggleCard(kanbanObj, cardId) {
    if (!kanbanObj || !kanbanObj.columns) return false;
    for (const col of kanbanObj.columns) {
      const card = (col.cards || []).find((c) => c.id === cardId);
      if (card) {
        card.done = !card.done;
        return true;
      }
    }
    return false;
  }

  /**
   * Render HTML DOM representation for the Kanban board
   * @param {object} kanbanObj
   * @returns {string} HTML string
   */
  static renderHtml(kanbanObj) {
    if (!kanbanObj || !Array.isArray(kanbanObj.columns)) return '';

    const colsHtml = kanbanObj.columns.map((col) => {
      const cardsHtml = (col.cards || []).map((card) => `
        <div class="kanban-item ${card.done ? 'done' : ''}" data-card-id="${card.id}" style="padding:6px 8px;margin-bottom:6px;background:rgba(255,255,255,0.08);border-radius:5px;font-size:12px;border-left:3px solid ${col.color || '#3b82f6'};display:flex;align-items:center;justify-content:space-between;gap:6px;">
          <span style="${card.done ? 'text-decoration:line-through;opacity:0.6;' : ''}">${escapeHtml(card.text)}</span>
          <button class="kanban-move-btn btn btn-ghost" data-action="next-col" style="padding:1px 4px;font-size:10px;opacity:0.75;" title="${t('Move to next column')}">→</button>
        </div>
      `).join('');

      return `
        <div class="kanban-column" data-col-id="${col.id}" style="flex:1;min-width:140px;background:rgba(0,0,0,0.25);border-radius:6px;padding:8px;display:flex;flex-direction:column;">
          <div class="kanban-col-head" style="font-weight:700;font-size:12px;color:${col.color || '#fff'};margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <span>${escapeHtml(col.title)}</span>
            <span class="kanban-count-pill" style="font-size:10px;background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:8px;">${(col.cards || []).length}</span>
          </div>
          <div class="kanban-cards-box" style="flex:1;overflow-y:auto;min-height:80px;">
            ${cardsHtml || `<div style="font-size:11px;color:rgba(255,255,255,0.4);text-align:center;padding:12px 0;">${t('No items')}</div>`}
          </div>
          <button class="kanban-add-task-btn btn btn-ghost" data-col-id="${col.id}" style="width:100%;margin-top:6px;font-size:11px;padding:3px;text-align:center;">+ ${t('Add item')}</button>
        </div>
      `;
    }).join('');

    return `
      <div class="kanban-board-container" style="width:100%;height:100%;display:flex;flex-direction:column;font-family:inherit;">
        <div class="kanban-header" style="font-weight:700;font-size:14px;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.1);color:#f8fafc;display:flex;align-items:center;gap:6px;">
          <span>📋</span>
          <span>${escapeHtml(kanbanObj.title || t('Kanban Board'))}</span>
        </div>
        <div class="kanban-columns-row" style="display:flex;gap:8px;flex:1;padding:8px;overflow-x:auto;">
          ${colsHtml}
        </div>
      </div>
    `;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
