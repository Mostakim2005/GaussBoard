// visualization-dialog.js — Interactive UI Diagram & Chart Studio for GazBoard
// Invariant: Pure portable JavaScript, offline-first, 100% i18n parity, zero native dependencies.

import { t } from '../i18n.js';
import {
  loadMermaid,
  loadChartJs,
  validateMermaid,
  validateChartConfig,
  renderMermaidSvg,
  renderChartDataUrl,
  validateFlowchartSteps,
  synthesizeFlowchartMermaid,
  synthesizeMindmapMermaid,
  validateChartBuilder,
  synthesizeChartConfig,
  getAiPromptTemplate
} from '../core/diagrams.js';

let activeStudio = null;

export const DIAGRAM_TEMPLATES = {
  flowchart_basic: {
    name: 'Flowchart: Process Flow',
    engine: 'mermaid',
    code: `flowchart TD
  start(["Start Action"]) --> step1["Validate Credentials"]
  step1 --> cond{"Authenticated?"}
  cond -- Yes --> dash["Load Whiteboard"]
  cond -- No --> err["Show Login Error"]
  err --> start
  dash --> done(["End Session"])`
  },
  decision_troubleshoot: {
    name: 'Decision Tree: Diagnostic Troubleshooting',
    engine: 'mermaid',
    code: `flowchart TD
  q1{"Device Powers On?"}
  q1 -- Yes --> q2{"Screen Displays Output?"}
  q1 -- No --> fix1["Check Power Cable & Adapter"]
  q2 -- Yes --> q3{"Connects to Local Network?"}
  q2 -- No --> fix2["Inspect Display HDMI/DP Cable"]
  q3 -- Yes --> success(["System Fully Operational"])
  q3 -- No --> fix3["Reboot Wi-Fi Router"]`
  },
  sequence_ipc: {
    name: 'Sequence Diagram: IPC Message Routing',
    engine: 'mermaid',
    code: `sequenceDiagram
  autonumber
  actor User
  participant UI as Renderer Window
  participant Main as Electron Main
  participant FS as Offline Storage
  User->>UI: Click Insert Diagram
  UI->>Main: IPC boards:save(boardDoc)
  Main->>FS: Atomic Write (tmp -> real)
  FS-->>Main: Write Succeeded
  Main-->>UI: Save OK Pill Feedback`
  },
  mindmap_arch: {
    name: 'Mind Map: Cognitive Learning Framework',
    engine: 'mermaid',
    code: `mindmap
  root(("GazBoard System"))
    Core Canvas
      Inking & Gestures
      Scene Partitioning
      Camera Transformation
    Diagram Studio
      Interactive Decision Trees
      Mermaid Flowcharts
      Chart.js Spider Radar
    Offline Storage
      Atomic File IO
      Central CommonLibraries`
  },
  radar_performance: {
    name: 'Radar: Performance & Capabilities',
    engine: 'chartjs',
    code: JSON.stringify({
      type: 'radar',
      data: {
        labels: ['Startup Speed', 'Inking Latency', 'Memory Footprint', 'Offline Security', 'Diagramming', 'Replay Sync'],
        datasets: [
          {
            label: 'GazBoard v5.7.0',
            data: [95, 98, 90, 100, 92, 96],
            backgroundColor: 'rgba(59, 130, 246, 0.25)',
            borderColor: '#3b82f6',
            borderWidth: 2,
            pointBackgroundColor: '#3b82f6'
          },
          {
            label: 'Baseline Standard',
            data: [70, 75, 65, 80, 60, 50],
            backgroundColor: 'rgba(168, 85, 247, 0.2)',
            borderColor: '#a855f7',
            borderWidth: 2,
            pointBackgroundColor: '#a855f7'
          }
        ]
      },
      options: {
        plugins: {
          title: { display: true, text: 'Architecture Performance Benchmark' }
        }
      }
    }, null, 2)
  },
  bar_features: {
    name: 'Bar Chart: Feature Velocity',
    engine: 'chartjs',
    code: JSON.stringify({
      type: 'bar',
      data: {
        labels: ['Phase 1', 'Phase 2 (Tabs)', 'Phase 2 (Windows)', 'Phase 3 (Diagrams)'],
        datasets: [
          {
            label: 'Automated Tests',
            data: [1180, 1210, 1240, 1250],
            backgroundColor: '#10b981'
          },
          {
            label: 'i18n Keys',
            data: [1540, 1572, 1594, 1630],
            backgroundColor: '#6366f1'
          }
        ]
      },
      options: {
        plugins: {
          title: { display: true, text: 'Release Growth Progression' }
        }
      }
    }, null, 2)
  },
  doughnut_storage: {
    name: 'Doughnut: Asset Footprint',
    engine: 'chartjs',
    code: JSON.stringify({
      type: 'doughnut',
      data: {
        labels: ['Mermaid Bundle', 'KaTeX Math', 'PDF Core', 'Chart.js Engine', 'Application UI'],
        datasets: [
          {
            data: [3335, 2400, 1720, 205, 1200],
            backgroundColor: ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6']
          }
        ]
      },
      options: {
        plugins: {
          title: { display: true, text: 'Offline Bundle Distribution (KB)' }
        }
      }
    }, null, 2)
  }
};

export class VisualizationDialog {
  constructor(app) {
    this.app = app;
    this.target = null; // target diagram object when editing
    this.overlay = null;
    this.dialog = null;
    this.activeTab = 'builder'; // 'builder' | 'code'
    this.builderKind = 'flowchart'; // 'flowchart' | 'mindmap' | 'radar'
    this.engine = 'mermaid'; // 'mermaid' | 'chartjs'
    this.cardStyle = app?.settings?.diagramCardStyle || 'white'; // 'white' | 'transparent'
    this.code = DIAGRAM_TEMPLATES.flowchart_basic.code;
    this.title = '';
    this.renderedDataUrl = '';
    this.renderedW = 600;
    this.renderedH = 400;
    this.zoom = 1;
    this.validation = { valid: true, error: null };
    this.debounceTimer = null;

    // Builder State
    this.builderState = {
      flowchart: {
        orientation: 'TD',
        steps: [
          { id: 'step_start', kind: 'start', text: 'Start Process', next: 'step_eval' },
          { id: 'step_eval', kind: 'decision', text: 'Input data verified?', yes: 'step_exec', no: 'step_retry' },
          { id: 'step_exec', kind: 'action', text: 'Execute Pipeline', next: 'step_finish' },
          { id: 'step_retry', kind: 'action', text: 'Prompt Error Correction', next: 'step_eval' },
          { id: 'step_finish', kind: 'end', text: 'Process Complete', next: null }
        ]
      },
      mindmap: {
        root: 'Core Project Goals',
        branches: [
          { level: 1, text: 'Performance' },
          { level: 2, text: 'Sub-millisecond Latency' },
          { level: 2, text: 'Zero GC Stalls' },
          { level: 1, text: 'User Experience' },
          { level: 2, text: 'Offline First' },
          { level: 2, text: 'Accessible UI' }
        ]
      },
      radar: {
        type: 'radar',
        title: 'System Evaluation',
        categories: ['Speed', 'Security', 'Reliability', 'Usability', 'Extensibility'],
        datasets: [
          { label: 'System Metric', color: '#2563eb', valuesStr: '92, 95, 88, 90, 85' }
        ]
      }
    };
  }

  get active() {
    return !!this.overlay;
  }

  /**
   * Open the studio.
   * @param {object|null} target diagram object if editing existing
   */
  open(target = null) {
    this.close();
    activeStudio = this;
    this.target = target;

    if (target) {
      this.engine = target.diagramType || 'mermaid';
      this.code = target.code || '';
      this.title = target.title || '';
      this.cardStyle = target.cardStyle || 'white';
      if (target.builderState) {
        this.builderState = JSON.parse(JSON.stringify(target.builderState));
        this.builderKind = target.subtype || 'flowchart';
        this.activeTab = 'builder';
      } else {
        this.activeTab = 'code';
      }
    } else {
      this.activeTab = 'builder';
      this.builderKind = 'flowchart';
      this.engine = 'mermaid';
      this.cardStyle = this.app?.settings?.diagramCardStyle || 'white';
      this.title = '';
      this.synthesizeFromBuilder();
    }

    this.createDom();
    this.render();
    this.triggerDebouncedUpdate();
  }

  close() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this._onKeyDown) {
      window.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.dialog = null;
    }
    if (activeStudio === this) activeStudio = null;
  }

  createDom() {
    const overlay = document.createElement('div');
    overlay.className = 'viz-studio-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', t('Diagram & Visualization Studio'));

    const dialog = document.createElement('div');
    dialog.className = 'viz-studio-dialog';
    dialog.tabIndex = -1;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) this.close();
    });

    this._onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    };
    window.addEventListener('keydown', this._onKeyDown);

    this.overlay = overlay;
    this.dialog = dialog;
  }

  render() {
    if (!this.dialog) return;

    this.dialog.innerHTML = `
      <div class="viz-header">
        <div class="viz-title-group">
          <div class="viz-icon-badge">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="6" height="6" rx="1"/>
              <rect x="15" y="15" width="6" height="6" rx="1"/>
              <circle cx="18" cy="6" r="3"/>
              <path d="M6 9v3a3 3 0 0 0 3 3h6"/>
            </svg>
          </div>
          <div>
            <div class="viz-title">${this.target ? t('Edit Diagram') : t('Diagram & Visualization Studio')}</div>
            <div class="viz-subtitle">${t('Interactive Decision Trees, Mind Maps, Flowcharts & Radar Charts')}</div>
          </div>
        </div>
        <div class="viz-header-meta">
          <span class="viz-lib-tag">${this.engine === 'chartjs' ? 'Chart.js v4.4.7' : 'Mermaid.js v10.9.1'} (${t('Offline')})</span>
          <button class="viz-close-btn" id="vizCloseBtn" title="${t('Close')}">&times;</button>
        </div>
      </div>

      <div class="viz-body">
        <!-- Left Column: Controls & Editors -->
        <div class="viz-left-col">
          <div class="viz-mode-tabs">
            <button class="viz-mode-btn ${this.activeTab === 'builder' ? 'active' : ''}" id="vizTabBuilder">
              <span>🛠️</span> ${t('Interactive UI Builder')}
            </button>
            <button class="viz-mode-btn ${this.activeTab === 'code' ? 'active' : ''}" id="vizTabCode">
              <span>💻</span> ${t('Code & AI Assistant')}
            </button>
          </div>

          <div class="viz-tab-panel" id="vizTabPanel">
            <!-- Dynamic Content Injected Here -->
          </div>

          <div class="viz-validation-bar" id="vizValidationBar">
            <div class="viz-val-pill ${this.validation.valid ? 'val-ok' : 'val-err'}">
              <span class="val-icon">${this.validation.valid ? '✓' : '✕'}</span>
              <span class="val-msg">${this.validation.valid ? t('Valid diagram syntax') : (this.validation.error || t('Syntax error'))}</span>
              ${this.validation.line ? `<code class="val-line">${t('Line {n}', { n: this.validation.line })}</code>` : ''}
            </div>
          </div>
        </div>

        <!-- Right Column: Live Interactive Preview -->
        <div class="viz-right-col">
          <div class="viz-preview-toolbar">
            <div class="viz-preview-title">${t('Live Preview')}</div>
            <div class="viz-toolbar-actions">
              <label class="viz-toggle-label" title="${t('Toggle transparent or solid card background')}">
                <input type="checkbox" id="vizBgToggle" ${this.cardStyle === 'white' ? 'checked' : ''}>
                <span>${t('White Card')}</span>
              </label>
              <div class="viz-zoom-controls">
                <button class="viz-zoom-btn" id="vizZoomOut" title="${t('Zoom out')}">-</button>
                <span class="viz-zoom-label" id="vizZoomLabel">${Math.round(this.zoom * 100)}%</span>
                <button class="viz-zoom-btn" id="vizZoomIn" title="${t('Zoom in')}">+</button>
                <button class="viz-zoom-btn" id="vizZoomReset" title="${t('Reset zoom')}">1:1</button>
              </div>
            </div>
          </div>

          <div class="viz-preview-stage" id="vizPreviewStage">
            <div class="viz-preview-viewport ${this.cardStyle === 'white' ? 'bg-card' : 'bg-transparent'}" id="vizViewport">
              <div class="viz-canvas-host" id="vizCanvasHost">
                <div class="viz-loading-spinner">${t('Compiling preview…')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="viz-footer">
        <div class="viz-footer-info">
          <input class="viz-title-input" id="vizTitleInput" placeholder="${t('Optional diagram title / caption…')}" value="${this.title}">
          <span class="viz-dim-readout" id="vizDimReadout">${this.renderedW} × ${this.renderedH} px</span>
        </div>
        <div class="viz-footer-actions">
          <button class="viz-btn viz-btn-secondary" id="vizCancelBtn">${t('Cancel')}</button>
          <button class="viz-btn viz-btn-primary" id="vizInsertBtn" ${this.validation.valid ? '' : 'disabled'}>
            ${this.target ? t('Update Diagram') : t('Insert onto Board')}
          </button>
        </div>
      </div>
    `;

    this.bindHeaderAndFooter();
    this.renderActivePanel();
  }

  bindHeaderAndFooter() {
    this.dialog.querySelector('#vizCloseBtn').addEventListener('click', () => this.close());
    this.dialog.querySelector('#vizCancelBtn').addEventListener('click', () => this.close());
    this.dialog.querySelector('#vizInsertBtn').addEventListener('click', () => this.finish());

    this.dialog.querySelector('#vizTitleInput').addEventListener('input', (e) => {
      this.title = e.target.value.trim();
    });

    this.dialog.querySelector('#vizTabBuilder').addEventListener('click', () => {
      this.activeTab = 'builder';
      this.render();
      this.synthesizeFromBuilder();
      this.triggerDebouncedUpdate();
    });

    this.dialog.querySelector('#vizTabCode').addEventListener('click', () => {
      this.activeTab = 'code';
      this.render();
      this.triggerDebouncedUpdate();
    });

    const bgToggle = this.dialog.querySelector('#vizBgToggle');
    bgToggle.addEventListener('change', () => {
      this.cardStyle = bgToggle.checked ? 'white' : 'transparent';
      const vp = this.dialog.querySelector('#vizViewport');
      if (vp) {
        vp.classList.toggle('bg-card', this.cardStyle === 'white');
        vp.classList.toggle('bg-transparent', this.cardStyle !== 'white');
      }
    });

    const zoomLabel = this.dialog.querySelector('#vizZoomLabel');
    const updateZoom = (z) => {
      this.zoom = Math.max(0.2, Math.min(3, z));
      zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`;
      const host = this.dialog.querySelector('#vizCanvasHost');
      if (host) host.style.transform = `scale(${this.zoom})`;
    };

    this.dialog.querySelector('#vizZoomIn').addEventListener('click', () => updateZoom(this.zoom + 0.15));
    this.dialog.querySelector('#vizZoomOut').addEventListener('click', () => updateZoom(this.zoom - 0.15));
    this.dialog.querySelector('#vizZoomReset').addEventListener('click', () => updateZoom(1));
  }

  renderActivePanel() {
    const container = this.dialog.querySelector('#vizTabPanel');
    if (!container) return;

    if (this.activeTab === 'builder') {
      this.renderBuilderPanel(container);
    } else {
      this.renderCodePanel(container);
    }
  }

  renderBuilderPanel(container) {
    container.innerHTML = `
      <div class="viz-builder-types">
        <button class="viz-btype-btn ${this.builderKind === 'flowchart' ? 'active' : ''}" data-kind="flowchart">
          <span>🌿</span> ${t('Decision Tree / Flowchart')}
        </button>
        <button class="viz-btype-btn ${this.builderKind === 'mindmap' ? 'active' : ''}" data-kind="mindmap">
          <span>🧠</span> ${t('Mind Map')}
        </button>
        <button class="viz-btype-btn ${this.builderKind === 'radar' ? 'active' : ''}" data-kind="radar">
          <span>🕸️</span> ${t('Radar & Statistics')}
        </button>
      </div>
      <div class="viz-builder-fields" id="vizBuilderFields"></div>
    `;

    container.querySelectorAll('.viz-btype-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.builderKind = btn.dataset.kind;
        this.engine = this.builderKind === 'radar' ? 'chartjs' : 'mermaid';
        this.renderBuilderPanel(container);
        this.synthesizeFromBuilder();
        this.triggerDebouncedUpdate();
      });
    });

    const fieldsHost = container.querySelector('#vizBuilderFields');
    if (this.builderKind === 'flowchart') {
      this.renderFlowchartBuilder(fieldsHost);
    } else if (this.builderKind === 'mindmap') {
      this.renderMindmapBuilder(fieldsHost);
    } else {
      this.renderRadarBuilder(fieldsHost);
    }
  }

  renderFlowchartBuilder(container) {
    const state = this.builderState.flowchart;
    const stepValidation = validateFlowchartSteps(state.steps);

    container.innerHTML = `
      <div class="viz-orient-row">
        <label>${t('Flow Direction:')}</label>
        <div class="viz-pill-group">
          <button class="viz-pill-btn ${state.orientation === 'TD' ? 'active' : ''}" data-dir="TD">${t('Top to Bottom (Vertical)')}</button>
          <button class="viz-pill-btn ${state.orientation === 'LR' ? 'active' : ''}" data-dir="LR">${t('Left to Right (Horizontal)')}</button>
        </div>
      </div>

      <div class="viz-steps-container" id="vizStepsContainer"></div>

      <button class="viz-add-step-btn" id="vizAddStepBtn">
        <span>+</span> ${t('Add Step / Decision')}
      </button>
    `;

    container.querySelectorAll('.viz-pill-btn').forEach(b => {
      b.addEventListener('click', () => {
        state.orientation = b.dataset.dir;
        this.renderFlowchartBuilder(container);
        this.synthesizeFromBuilder();
        this.triggerDebouncedUpdate();
      });
    });

    const stepsContainer = container.querySelector('#vizStepsContainer');
    this.renderFlowchartStepCards(stepsContainer, stepValidation);

    container.querySelector('#vizAddStepBtn').addEventListener('click', () => {
      const idx = state.steps.length + 1;
      const newId = 'step_' + Math.random().toString(36).slice(2, 6);
      state.steps.push({
        id: newId,
        kind: 'action',
        text: t('Step {n}', { n: idx }),
        next: '__end__'
      });
      this.renderFlowchartBuilder(container);
      this.synthesizeFromBuilder();
      this.triggerDebouncedUpdate();
    });
  }

  renderFlowchartStepCards(container, stepValidation) {
    const state = this.builderState.flowchart;
    const allStepIds = state.steps.map(s => s.id);

    container.innerHTML = '';
    state.steps.forEach((step, idx) => {
      const v = stepValidation.steps.find(s => s.id === step.id) || { valid: true, errors: [] };
      const card = document.createElement('div');
      card.className = `viz-step-card ${v.valid ? 'step-valid' : 'step-invalid'}`;

      const targets = [
        { id: '__end__', label: `(${t('End of process')})` },
        ...allStepIds.filter(id => id !== step.id).map(id => {
          const matched = state.steps.find(s => s.id === id);
          return { id, label: matched?.text ? `→ ${matched.text.slice(0, 24)}` : id };
        })
      ];

      card.innerHTML = `
        <div class="viz-step-header">
          <span class="viz-step-badge ${v.valid ? 'badge-ok' : 'badge-err'}">
            ${v.valid ? '✓' : '!'} #${idx + 1}
          </span>
          <select class="viz-kind-select" data-id="${step.id}">
            <option value="action" ${step.kind === 'action' ? 'selected' : ''}>${t('Action / Process')}</option>
            <option value="decision" ${step.kind === 'decision' ? 'selected' : ''}>${t('Decision / Condition ?')}</option>
            <option value="start" ${step.kind === 'start' ? 'selected' : ''}>${t('Start Node')}</option>
            <option value="end" ${step.kind === 'end' ? 'selected' : ''}>${t('End Node')}</option>
          </select>
          <div class="viz-step-actions">
            ${state.steps.length > 1 ? `<button class="viz-del-step-btn" data-id="${step.id}" title="${t('Remove step')}">&times;</button>` : ''}
          </div>
        </div>

        <div class="viz-step-body">
          <div class="viz-field-group">
            <label>${step.kind === 'decision' ? t('Question / Condition:') : t('Action / Step Description:')}</label>
            <input class="viz-input ${step.text ? 'input-valid' : 'input-invalid'}"
                   data-field="text" data-id="${step.id}"
                   placeholder="${t('e.g. Is input verified?')}"
                   value="${step.text || ''}">
            ${v.errors.length > 0 ? `<div class="viz-input-err-msg">${v.errors.join('; ')}</div>` : ''}
          </div>

          ${step.kind === 'decision' ? `
            <div class="viz-decision-routes">
              <div class="viz-route-row">
                <span class="route-tag tag-yes">${t('If Yes:')}</span>
                <select class="viz-route-select" data-field="yes" data-id="${step.id}">
                  ${targets.map(tOpt => `<option value="${tOpt.id}" ${step.yes === tOpt.id ? 'selected' : ''}>${tOpt.label}</option>`).join('')}
                </select>
              </div>
              <div class="viz-route-row">
                <span class="route-tag tag-no">${t('If No:')}</span>
                <select class="viz-route-select" data-field="no" data-id="${step.id}">
                  ${targets.map(tOpt => `<option value="${tOpt.id}" ${step.no === tOpt.id ? 'selected' : ''}>${tOpt.label}</option>`).join('')}
                </select>
              </div>
            </div>
          ` : (step.kind !== 'end' ? `
            <div class="viz-route-row">
              <span class="route-tag tag-next">${t('Next Step:')}</span>
              <select class="viz-route-select" data-field="next" data-id="${step.id}">
                ${targets.map(tOpt => `<option value="${tOpt.id}" ${step.next === tOpt.id ? 'selected' : ''}>${tOpt.label}</option>`).join('')}
              </select>
            </div>
          ` : '')}
        </div>
      `;

      // Event handlers
      card.querySelector('.viz-kind-select').addEventListener('change', (e) => {
        step.kind = e.target.value;
        if (step.kind === 'decision') {
          step.yes = targets[1]?.id || '__end__';
          step.no = targets[2]?.id || '__end__';
        } else if (step.kind === 'end') {
          step.next = null;
        } else {
          step.next = targets[1]?.id || '__end__';
        }
        this.renderFlowchartStepCards(container, validateFlowchartSteps(state.steps));
        this.synthesizeFromBuilder();
        this.triggerDebouncedUpdate();
      });

      const txtInput = card.querySelector('[data-field="text"]');
      txtInput.addEventListener('input', (e) => {
        step.text = e.target.value;
        this.synthesizeFromBuilder();
        this.triggerDebouncedUpdate();
      });

      card.querySelectorAll('.viz-route-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const field = sel.dataset.field;
          step[field] = e.target.value;
          this.synthesizeFromBuilder();
          this.triggerDebouncedUpdate();
        });
      });

      const delBtn = card.querySelector('.viz-del-step-btn');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          state.steps = state.steps.filter(s => s.id !== step.id);
          this.renderFlowchartBuilder(container.parentElement);
          this.synthesizeFromBuilder();
          this.triggerDebouncedUpdate();
        });
      }

      container.appendChild(card);
    });
  }

  renderMindmapBuilder(container) {
    const state = this.builderState.mindmap;

    container.innerHTML = `
      <div class="viz-field-group">
        <label>${t('Central Core Topic:')}</label>
        <input class="viz-input ${state.root ? 'input-valid' : 'input-invalid'}" id="vizMmRoot" value="${state.root}" placeholder="${t('e.g. Project Architecture')}">
      </div>

      <div class="viz-mm-branches-title">${t('Branches & Sub-topics:')}</div>
      <div class="viz-mm-list" id="vizMmList"></div>

      <button class="viz-add-step-btn" id="vizAddBranchBtn">
        <span>+</span> ${t('Add Branch Idea')}
      </button>
    `;

    container.querySelector('#vizMmRoot').addEventListener('input', (e) => {
      state.root = e.target.value;
      this.synthesizeFromBuilder();
      this.triggerDebouncedUpdate();
    });

    const listContainer = container.querySelector('#vizMmList');
    this.renderMindmapBranchRows(listContainer);

    container.querySelector('#vizAddBranchBtn').addEventListener('click', () => {
      state.branches.push({ level: 1, text: t('New Idea') });
      this.renderMindmapBranchRows(listContainer);
      this.synthesizeFromBuilder();
      this.triggerDebouncedUpdate();
    });
  }

  renderMindmapBranchRows(container) {
    const state = this.builderState.mindmap;
    container.innerHTML = '';

    state.branches.forEach((branch, idx) => {
      const row = document.createElement('div');
      row.className = 'viz-mm-row';
      row.style.paddingLeft = `${(branch.level - 1) * 20}px`;

      row.innerHTML = `
        <div class="viz-mm-indent-controls">
          <button class="viz-mm-level-btn" data-act="less" title="${t('Outdent')}">◀</button>
          <span class="viz-mm-level-label">L${branch.level}</span>
          <button class="viz-mm-level-btn" data-act="more" title="${t('Indent')}">▶</button>
        </div>
        <input class="viz-input ${branch.text ? 'input-valid' : 'input-invalid'}" value="${branch.text}" placeholder="${t('Idea description…')}">
        <button class="viz-del-step-btn" title="${t('Remove')}">&times;</button>
      `;

      const inp = row.querySelector('.viz-input');
      inp.addEventListener('input', (e) => {
        branch.text = e.target.value;
        this.synthesizeFromBuilder();
        this.triggerDebouncedUpdate();
      });

      row.querySelector('[data-act="less"]').addEventListener('click', () => {
        branch.level = Math.max(1, branch.level - 1);
        this.renderMindmapBranchRows(container);
        this.synthesizeFromBuilder();
        this.triggerDebouncedUpdate();
      });

      row.querySelector('[data-act="more"]').addEventListener('click', () => {
        branch.level = Math.min(4, branch.level + 1);
        this.renderMindmapBranchRows(container);
        this.synthesizeFromBuilder();
        this.triggerDebouncedUpdate();
      });

      row.querySelector('.viz-del-step-btn').addEventListener('click', () => {
        state.branches.splice(idx, 1);
        this.renderMindmapBranchRows(container);
        this.synthesizeFromBuilder();
        this.triggerDebouncedUpdate();
      });

      container.appendChild(row);
    });
  }

  renderRadarBuilder(container) {
    const state = this.builderState.radar;
    const validation = validateChartBuilder(state);

    container.innerHTML = `
      <div class="viz-field-group">
        <label>${t('Chart Type:')}</label>
        <select class="viz-route-select" id="vizChartTypeSelect">
          <option value="radar" ${state.type === 'radar' ? 'selected' : ''}>${t('Radar / Spider Chart')}</option>
          <option value="bar" ${state.type === 'bar' ? 'selected' : ''}>${t('Bar Chart')}</option>
          <option value="line" ${state.type === 'line' ? 'selected' : ''}>${t('Line Chart')}</option>
          <option value="doughnut" ${state.type === 'doughnut' ? 'selected' : ''}>${t('Doughnut Chart')}</option>
        </select>
      </div>

      <div class="viz-field-group">
        <label>${t('Categories / Axis Labels (comma separated):')}</label>
        <input class="viz-input ${state.categories.length > 0 ? 'input-valid' : 'input-invalid'}"
               id="vizCategoriesInput"
               value="${state.categories.join(', ')}"
               placeholder="${t('e.g. Speed, Accuracy, Quality, Security, Design')}">
        <div class="viz-cat-count-badge">
          ${t('{n} categories detected', { n: state.categories.length })}
        </div>
      </div>

      <div class="viz-datasets-title">${t('Datasets & Numeric Points:')}</div>
      <div class="viz-datasets-list" id="vizDatasetsList"></div>

      <button class="viz-add-step-btn" id="vizAddDatasetBtn">
        <span>+</span> ${t('Add Dataset')}
      </button>
    `;

    container.querySelector('#vizChartTypeSelect').addEventListener('change', (e) => {
      state.type = e.target.value;
      this.synthesizeFromBuilder();
      this.triggerDebouncedUpdate();
    });

    container.querySelector('#vizCategoriesInput').addEventListener('input', (e) => {
      state.categories = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
      this.renderRadarBuilder(container);
      this.synthesizeFromBuilder();
      this.triggerDebouncedUpdate();
    });

    const dsContainer = container.querySelector('#vizDatasetsList');
    this.renderDatasetRows(dsContainer, validation);

    container.querySelector('#vizAddDatasetBtn').addEventListener('click', () => {
      const colors = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
      const pickColor = colors[state.datasets.length % colors.length];
      state.datasets.push({
        label: t('Dataset {n}', { n: state.datasets.length + 1 }),
        color: pickColor,
        valuesStr: state.categories.map(() => 80).join(', ')
      });
      this.renderRadarBuilder(container);
      this.synthesizeFromBuilder();
      this.triggerDebouncedUpdate();
    });
  }

  renderDatasetRows(container, validation) {
    const state = this.builderState.radar;
    container.innerHTML = '';

    state.datasets.forEach((ds, idx) => {
      const v = validation.datasetResults[idx] || { valid: true, errors: [] };
      const row = document.createElement('div');
      row.className = `viz-dataset-card ${v.valid ? 'step-valid' : 'step-invalid'}`;

      row.innerHTML = `
        <div class="viz-ds-header">
          <input type="color" class="viz-color-picker" value="${ds.color || '#2563eb'}">
          <input class="viz-input viz-ds-name-input ${ds.label ? 'input-valid' : 'input-invalid'}"
                 value="${ds.label || ''}" placeholder="${t('Dataset name')}">
          ${state.datasets.length > 1 ? `<button class="viz-del-step-btn" title="${t('Remove')}">&times;</button>` : ''}
        </div>
        <div class="viz-field-group">
          <label>${t('Values (comma separated, matching {n} categories):', { n: state.categories.length })}</label>
          <input class="viz-input ${v.valid ? 'input-valid' : 'input-invalid'}"
                 data-field="values"
                 value="${ds.valuesStr || ''}"
                 placeholder="${t('e.g. 85, 90, 75, 80, 95')}">
          ${v.errors.length > 0 ? `<div class="viz-input-err-msg">${v.errors.join('; ')}</div>` : ''}
        </div>
      `;

      row.querySelector('.viz-color-picker').addEventListener('input', (e) => {
        ds.color = e.target.value;
        this.synthesizeFromBuilder();
        this.triggerDebouncedUpdate();
      });

      row.querySelector('.viz-ds-name-input').addEventListener('input', (e) => {
        ds.label = e.target.value;
        this.synthesizeFromBuilder();
        this.triggerDebouncedUpdate();
      });

      row.querySelector('[data-field="values"]').addEventListener('input', (e) => {
        ds.valuesStr = e.target.value;
        this.synthesizeFromBuilder();
        this.triggerDebouncedUpdate();
      });

      const delBtn = row.querySelector('.viz-del-step-btn');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          state.datasets.splice(idx, 1);
          this.renderRadarBuilder(container.parentElement);
          this.synthesizeFromBuilder();
          this.triggerDebouncedUpdate();
        });
      }

      container.appendChild(row);
    });
  }

  renderCodePanel(container) {
    container.innerHTML = `
      <div class="viz-code-toolbar">
        <div class="viz-field-group" style="margin-bottom:8px;">
          <label>${t('Diagram Engine:')}</label>
          <div class="viz-pill-group">
            <button class="viz-pill-btn ${this.engine === 'mermaid' ? 'active' : ''}" data-eng="mermaid">Mermaid.js</button>
            <button class="viz-pill-btn ${this.engine === 'chartjs' ? 'active' : ''}" data-eng="chartjs">Chart.js</button>
          </div>
        </div>

        <div class="viz-field-group" style="margin-bottom:8px;">
          <label>${t('Pre-built Templates:')}</label>
          <select class="viz-route-select" id="vizTemplateSelect">
            <option value="">${t('-- Select an example template --')}</option>
            ${Object.entries(DIAGRAM_TEMPLATES).map(([key, tpl]) => `
              <option value="${key}">${tpl.name} (${tpl.engine})</option>
            `).join('')}
          </select>
        </div>
      </div>

      <div class="viz-textarea-wrap">
        <textarea class="viz-code-textarea" id="vizCodeTextarea" spellcheck="false" placeholder="${t('Enter Mermaid diagram syntax or Chart.js JSON…')}">${this.code}</textarea>
      </div>

      <div class="viz-ai-card">
        <div class="viz-ai-header">
          <span class="viz-ai-badge">🤖 ${t('AI Prompt Assistant')}</span>
          <span class="viz-ai-hint">${t('Copy a ready-to-use prompt for ChatGPT, Claude, or Gemini')}</span>
        </div>
        <div class="viz-ai-row">
          <input class="viz-input viz-ai-topic" id="vizAiTopicInput"
                 placeholder="${t('Diagram topic, e.g. Payment Gateway or Team Workflow')}"
                 value="${this.title || 'Application Architecture Flow'}">
          <button class="viz-btn viz-ai-copy-btn" id="vizAiCopyBtn">
            <span>📋</span> ${t('Copy AI Prompt Template')}
          </button>
        </div>
      </div>
    `;

    container.querySelectorAll('[data-eng]').forEach(b => {
      b.addEventListener('click', () => {
        this.engine = b.dataset.eng;
        this.renderCodePanel(container);
        this.triggerDebouncedUpdate();
      });
    });

    const tplSelect = container.querySelector('#vizTemplateSelect');
    tplSelect.addEventListener('change', () => {
      const picked = DIAGRAM_TEMPLATES[tplSelect.value];
      if (picked) {
        this.engine = picked.engine;
        this.code = picked.code;
        this.renderCodePanel(container);
        this.triggerDebouncedUpdate();
      }
    });

    const textarea = container.querySelector('#vizCodeTextarea');
    textarea.addEventListener('input', (e) => {
      this.code = e.target.value;
      this.triggerDebouncedUpdate();
    });

    const copyBtn = container.querySelector('#vizAiCopyBtn');
    const topicInput = container.querySelector('#vizAiTopicInput');
    copyBtn.addEventListener('click', async () => {
      const topic = topicInput.value.trim() || 'Software Process Flow';
      const prompt = getAiPromptTemplate(this.engine, topic);
      try {
        await navigator.clipboard.writeText(prompt);
        copyBtn.textContent = '✓ ' + t('Copied!');
        setTimeout(() => {
          copyBtn.innerHTML = '<span>📋</span> ' + t('Copy AI Prompt Template');
        }, 2200);
        this.app?.toast?.(t('AI prompt template copied to clipboard!'));
      } catch (e) {
        this.app?.toast?.(t('Failed to copy to clipboard'));
      }
    });
  }

  synthesizeFromBuilder() {
    if (this.builderKind === 'flowchart') {
      this.engine = 'mermaid';
      this.code = synthesizeFlowchartMermaid(this.builderState.flowchart);
    } else if (this.builderKind === 'mindmap') {
      this.engine = 'mermaid';
      this.code = synthesizeMindmapMermaid(this.builderState.mindmap);
    } else if (this.builderKind === 'radar') {
      this.engine = 'chartjs';
      const cfg = synthesizeChartConfig(this.builderState.radar);
      this.code = JSON.stringify(cfg, null, 2);
    }
  }

  triggerDebouncedUpdate() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.updatePreviewAndValidate();
    }, 180);
  }

  async updatePreviewAndValidate() {
    const valBar = this.dialog?.querySelector('#vizValidationBar');
    const host = this.dialog?.querySelector('#vizCanvasHost');
    const insertBtn = this.dialog?.querySelector('#vizInsertBtn');
    const readout = this.dialog?.querySelector('#vizDimReadout');

    if (!host) return;

    // 1. Validation check
    let vRes = { valid: false, error: null };
    if (this.engine === 'mermaid') {
      vRes = await validateMermaid(this.code);
    } else {
      vRes = validateChartConfig(this.code);
    }
    this.validation = vRes;

    // Update validation bar
    if (valBar) {
      valBar.innerHTML = `
        <div class="viz-val-pill ${vRes.valid ? 'val-ok' : 'val-err'}">
          <span class="val-icon">${vRes.valid ? '✓' : '✕'}</span>
          <span class="val-msg">${vRes.valid ? t('Valid diagram syntax') : (vRes.error || t('Syntax error'))}</span>
          ${vRes.line ? `<code class="val-line">${t('Line {n}', { n: vRes.line })}</code>` : ''}
        </div>
      `;
    }

    if (insertBtn) {
      insertBtn.disabled = !vRes.valid;
    }

    if (!vRes.valid) {
      host.innerHTML = `
        <div class="viz-preview-err">
          <div class="viz-err-icon">⚠️</div>
          <div class="viz-err-title">${t('Diagram Compilation Error')}</div>
          <div class="viz-err-detail">${vRes.error}</div>
          ${vRes.line ? `<div class="viz-err-hint">${t('Check line {n} in the code editor', { n: vRes.line })}</div>` : ''}
        </div>
      `;
      return;
    }

    // 2. Render output
    try {
      if (this.engine === 'mermaid') {
        const renderRes = await renderMermaidSvg(this.code);
        this.renderedDataUrl = renderRes.dataUrl;
        this.renderedW = renderRes.w;
        this.renderedH = renderRes.h;
        host.innerHTML = renderRes.svg;
      } else {
        const cfg = vRes.config || JSON.parse(this.code);
        const renderRes = await renderChartDataUrl(cfg, 600, 420);
        this.renderedDataUrl = renderRes.dataUrl;
        this.renderedW = renderRes.w;
        this.renderedH = renderRes.h;
        host.innerHTML = `<img src="${renderRes.dataUrl}" alt="Chart preview" style="max-width:100%;height:auto;display:block;">`;
      }

      if (readout) {
        readout.textContent = `${this.renderedW} × ${this.renderedH} px`;
      }
    } catch (renderErr) {
      host.innerHTML = `
        <div class="viz-preview-err">
          <div class="viz-err-icon">⚠️</div>
          <div class="viz-err-title">${t('Rendering Failed')}</div>
          <div class="viz-err-detail">${renderErr.message || String(renderErr)}</div>
        </div>
      `;
    }
  }

  finish() {
    if (!this.validation.valid || !this.renderedDataUrl) {
      this.app?.toast?.(t('Please resolve syntax errors before inserting.'));
      return;
    }

    const app = this.app;
    const isEdit = !!this.target;

    // Viewport center in world coords for new objects
    const cam = app.surface?.cam;
    const screenW = app.surface?.canvas?.width || 1200;
    const screenH = app.surface?.canvas?.height || 800;
    const centerWorld = cam ? cam.toWorld(screenW / (2 * (cam.z || 1)), screenH / (2 * (cam.z || 1))) : { x: 200, y: 200 };

    const w = Math.min(800, Math.max(300, this.renderedW));
    const h = Math.min(600, Math.max(200, this.renderedH));

    if (isEdit) {
      const updates = {
        diagramType: this.engine,
        subtype: this.builderKind,
        code: this.code,
        builderState: this.activeTab === 'builder' ? JSON.parse(JSON.stringify(this.builderState)) : null,
        title: this.title,
        dataUrl: this.renderedDataUrl,
        cardStyle: this.cardStyle,
        w: Math.round(w),
        h: Math.round(h),
        updatedAt: Date.now()
      };
      app.store.update(this.target.id, updates, 'edit diagram');
      app.toast(t('Diagram updated'));
    } else {
      const newDiagram = {
        id: 'diag_' + Math.random().toString(36).slice(2, 10),
        type: 'diagram',
        diagramType: this.engine,
        subtype: this.builderKind,
        code: this.code,
        builderState: this.activeTab === 'builder' ? JSON.parse(JSON.stringify(this.builderState)) : null,
        title: this.title,
        dataUrl: this.renderedDataUrl,
        cardStyle: this.cardStyle,
        x: Math.round(centerWorld.x - w / 2),
        y: Math.round(centerWorld.y - h / 2),
        w: Math.round(w),
        h: Math.round(h),
        rotation: 0,
        createdAt: Date.now()
      };
      app.store.add(newDiagram, 'insert diagram');
      app.setSelection([newDiagram.id]);
      app.toast(t('Diagram inserted onto board'));
    }

    app.surface?.invalidate?.();
    this.close();
  }
}
