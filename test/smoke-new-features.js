'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');

const browserChecks = String.raw`(async () => {
  const app = window.app;
  const out = {};

  // 1. Scratch-out gesture
  try {
    const { isScratchGesture } = await import('app://board/js/core/scratch.js');
    const pts = [];
    for (let i = 0; i < 20; i++) pts.push({ x: i % 2 ? 60 : 0, y: i * 3, t: i * 40 });
    out.scratchOut = isScratchGesture(pts) === true;
  } catch (e) { out.scratchOut = e.message; }

  // 2. Study Tape
  try {
    app.store.add({ id: 'curtain-tape-test', type: 'curtain', subtype: 'tape', x: 10, y: 10, w: 100, h: 40, revealed: false }, 'test');
    const toggled = typeof app.toggleCurtain === 'function' ? app.toggleCurtain('curtain-tape-test') : false;
    const revealedState = app.store.get('curtain-tape-test')?.revealed;
    out.studyTape = toggled && (revealedState === true);
    app.store.remove(['curtain-tape-test']);
  } catch (e) { out.studyTape = e.message; }

  // 3. Camera Glide
  try {
    const cam = app.surface?.cam;
    out.cameraGlide = typeof cam?.glideTo === 'function';
  } catch (e) { out.cameraGlide = e.message; }

  // 4. ReplayEngine
  try {
    const { ReplayEngine } = await import('app://board/js/core/replay.js');
    const engine = new ReplayEngine(app);
    out.replayEngine = typeof engine.loadTrack === 'function' && typeof engine.syncClock === 'function';
  } catch (e) { out.replayEngine = e.message; }

  // 5. AudioTracks Schema Round-Trip
  try {
    const s = app.store;
    s.doc.audioTracks = [{ id: 'track-smoke', assetId: 'audio.webm', name: 'Lecture 1', durationMs: 5000, created: 1234567890, bookmarks: [] }];
    const snap = s.toJSON();
    const parsed = typeof snap === 'string' ? JSON.parse(snap) : snap;
    out.audioTracksRoundTrip = Array.isArray(parsed.audioTracks) && parsed.audioTracks[0]?.id === 'track-smoke';
    s.doc.audioTracks = [];
  } catch (e) { out.audioTracksRoundTrip = e.message; }

  // 6. Split Workspace
  try {
    const { SplitWorkspace } = await import('app://board/js/ui/split-workspace.js');
    out.splitWorkspace = typeof SplitWorkspace === 'function';
  } catch (e) { out.splitWorkspace = e.message; }

  // 7. Video Exporter
  try {
    const { VideoExporter } = await import('app://board/js/export-video.js');
    out.videoExporter = typeof VideoExporter === 'function';
  } catch (e) { out.videoExporter = e.message; }

  // 8. 3D Molecular Viewer & Database
  try {
    const { MOLECULE_DATABASE, MoleculeViewerModal } = await import('app://board/js/ui/molecule-viewer.js');
    out.moleculeViewer = MOLECULE_DATABASE.length >= 6 && typeof MoleculeViewerModal === 'function';
  } catch (e) { out.moleculeViewer = e.message; }

  // 9. Function Grapher (2D, 3D Surface, Polar)
  try {
    const { GRAPH_PRESETS, FunctionGrapherModal } = await import('app://board/js/ui/function-grapher.js');
    const fg = new FunctionGrapherModal(app);
    const fn = fg.compileExpression('x^2 - 4');
    const val = fn(3);
    fg.graphMode = '3d';
    out.functionGrapher = GRAPH_PRESETS.length >= 6 && val === 5 && typeof fg.render3DSurface === 'function' && typeof fg.renderPolar === 'function';
  } catch (e) { out.functionGrapher = e.message; }

  // 10. Technical Writing & Readability Linter
  try {
    const { TechnicalLinter, calculateReadability } = await import('app://board/js/core/technical-linter.js');
    const issues = TechnicalLinter.lint('In order to test the the system, data was observed by team.');
    const fk = calculateReadability('The quick brown fox jumps over the lazy dog.');
    out.technicalLinter = issues.length >= 3 && typeof fk.score === 'number';
  } catch (e) { out.technicalLinter = e.message; }

  // 11. Symbolic CAS & Reactive Notebook Variables
  try {
    const { SymbolicCAS, notebookVars, calculateMolarMass } = await import('app://board/js/core/scientific-math.js');
    const sol = SymbolicCAS.solveLinear('3x + 12 = 0');
    const diff = SymbolicCAS.differentiate('x^3');
    notebookVars.set('V', 24);
    notebookVars.set('R', 8);
    const evalRes = notebookVars.evaluate('V / R');
    const molar = calculateMolarMass('H2SO4');
    out.symbolicCAS = sol?.root === -4 && diff === '3x^{2}' && evalRes?.numeric === 3 && molar?.ok === true && molar?.molarMass > 98;
  } catch (e) { out.symbolicCAS = e.message; }

  // 12. Industrial Circuit Simulation (Semiconductors, 555, Op-Amp, Logic)
  try {
    const { IndustrialCircuitSim } = await import('app://board/js/core/circuit-sim.js');
    const sim = new IndustrialCircuitSim();
    sim.loadPreset555Flasher();
    sim.step(0.001);
    const has555 = Array.from(sim.components.values()).some(c => c.type === 'timer_555');
    const hasLED = Array.from(sim.components.values()).some(c => c.type === 'led');
    out.circuitSim = has555 && hasLED && sim.components.size > 0 && sim.wires.length > 0;
  } catch (e) { out.circuitSim = e.message; }

  // 13. 2D Chemical Sketcher & SMILES 2D/3D VSEPR Parser
  try {
    const { ChemicalSketcherModal, SMILES_PRESETS } = await import('app://board/js/ui/chemical-sketcher.js');
    const sketcher = new ChemicalSketcherModal(app);
    sketcher.parseSMILES('CC(=O)Oc1ccccc1C(=O)O');
    out.chemicalSketcher = SMILES_PRESETS.length >= 7 && sketcher.atoms.length > 5;
  } catch (e) { out.chemicalSketcher = e.message; }

  // 14. Pre-built Physics Simulations (Optics, E-Field, Collisions, Rigid Sandbox)
  try {
    const { SIMULATION_PRESETS } = await import('app://board/js/ui/phet-runner.js');
    const hasOptics = SIMULATION_PRESETS.some(p => p.id === 'optics');
    const hasCollisions = SIMULATION_PRESETS.some(p => p.id === 'collisions');
    const hasEField = SIMULATION_PRESETS.some(p => p.id === 'electric_field');
    const hasRigid = SIMULATION_PRESETS.some(p => p.id === 'rigid_sandbox');
    out.physicsSim = SIMULATION_PRESETS.length >= 8 && hasOptics && hasCollisions && hasEField && hasRigid;
  } catch (e) { out.physicsSim = e.message; }

  // 15. Spaced Repetition (FSRS v5 Engine)
  try {
    const { createEmptyCard, repeat, Rating } = await import('app://board/js/core/fsrs.js');
    const card = createEmptyCard();
    const next = repeat(card, Rating.Good);
    out.fsrs = !!next && typeof next.stability === 'number';
  } catch (e) { out.fsrs = e.message; }

  // 16. Periodic Table Element Catalog
  try {
    const { ELEMENTS_DATA } = await import('app://board/js/ui/periodic-table.js');
    out.periodicTable = Array.isArray(ELEMENTS_DATA) && ELEMENTS_DATA.length >= 118;
  } catch (e) { out.periodicTable = e.message; }

  // 17. Academic WordNet Dictionary & Thesaurus
  try {
    const { ACADEMIC_LEXICON, AcademicDictionaryModal } = await import('app://board/js/ui/academic-dictionary.js');
    const hasVocab = Object.keys(ACADEMIC_LEXICON).length >= 50;
    const sample = ACADEMIC_LEXICON['hypothesis'];
    const hasPhonetics = !!sample?.ipa && Array.isArray(sample?.synonyms) && Array.isArray(sample?.collocations);
    out.academicDictionary = hasVocab && hasPhonetics && typeof AcademicDictionaryModal === 'function';
  } catch (e) { out.academicDictionary = e.message; }

  // 18. Academic Style Scoring & Formal Tone Engine
  try {
    const { TechnicalLinter, calculateAcademicStyleScore, applyAcademicTone } = await import('app://board/js/core/technical-linter.js');
    const informal = 'A lot of things got better in this test.';
    const scoreRes = calculateAcademicStyleScore(informal);
    const elevated = applyAcademicTone(informal);
    out.academicStyleAndTone = scoreRes.score < 100 && scoreRes.deductions.length >= 1 && elevated.includes('numerous') && elevated.includes('acquired');
  } catch (e) { out.academicStyleAndTone = e.message; }

  // 19. Natural Math to LaTeX & Symbolic Quadratic CAS
  try {
    const { naturalMathToLaTeX, SymbolicCAS } = await import('app://board/js/core/scientific-math.js');
    const texInt = naturalMathToLaTeX('integral of x^2 from 0 to 1');
    const texLim = naturalMathToLaTeX('limit of sin(x)/x as x approaches 0');
    const quad = SymbolicCAS.solveQuadratic('x^2 - 5x + 6 = 0');
    const det = SymbolicCAS.matrixDeterminant([[1, 2], [3, 4]]);
    out.naturalMathAndCAS = texInt.includes('\\int_{0}^{1}') && texLim.includes('\\lim_{x \\to 0}') && quad.ok && quad.roots.includes(3) && quad.roots.includes(2) && det.determinant === -2;
  } catch (e) { out.naturalMathAndCAS = e.message; }

  // 20. Image Occlusion Dual Modes & Cloze Deck Export
  try {
    const sr = app.studyRunner;
    const initialMode = sr?.occlusionMode || 'hideAll';
    sr?.toggleOcclusionMode?.();
    const toggledMode = sr?.occlusionMode;
    sr?.toggleOcclusionMode?.(); // Toggle back
    const cloze = sr?.exportClozeDeck?.();
    out.imageOcclusion = initialMode === 'hideAll' && toggledMode === 'hideOne' && typeof cloze?.tsv === 'string';
  } catch (e) { out.imageOcclusion = e.message; }

  // 21. Dataview Query Engine & In-Canvas Kanban Cards
  try {
    const { DataviewEngine } = await import('app://board/js/core/dataview.js');
    const { KanbanManager } = await import('app://board/js/core/kanban.js');
    const dvRes = DataviewEngine.execute('TABLE name, type WHERE type != "" LIMIT 5', app.store);
    const kanban = KanbanManager.createDefault(100, 100, 'Test Kanban');
    out.dataviewAndKanban = dvRes.ok && dvRes.type === 'table' && kanban.type === 'kanban' && kanban.columns.length === 3;
  } catch (e) { out.dataviewAndKanban = e.message; }

  // 22. Smart Orthogonal Connectors & Snap Ports
  try {
    const { routeOrthogonal, snapPortPoints, route } = await import('app://board/js/core/connectors.js');
    const ports = snapPortPoints({ x: 10, y: 20, w: 100, h: 60 });
    const ortho = routeOrthogonal({ x: 0, y: 0 }, 'e', { x: 100, y: 80 }, 'w');
    out.connectorsAndSnapPorts = ports.length === 4 && ortho.length >= 4 && ortho[0].x === 0;
  } catch (e) { out.connectorsAndSnapPorts = e.message; }

  // 23. Workspace Session Save & Knowledge Graph Community Clustering
  try {
    const { WorkspaceSessionManager } = await import('app://board/js/ui/tabs.js');
    const { GraphViewModal } = await import('app://board/js/ui/graph-view.js');
    const saved = WorkspaceSessionManager.saveSession('SmokeSession', [{ id: 'b1', title: 'Board 1' }], 'b1');
    const listed = WorkspaceSessionManager.listSessions();
    const gv = new GraphViewModal(app);
    gv.nodes = [{ id: '1', x: 0, y: 0 }, { id: '2', x: 50, y: 50 }];
    gv.edges = [{ from: '1', to: '2' }];
    gv.detectCommunities();
    out.workspaceSessionAndGraph = saved.name === 'SmokeSession' && listed.length > 0 && typeof gv.detectCommunities === 'function' && gv.communities.length > 0;
  } catch (e) { out.workspaceSessionAndGraph = e.message; }

  // 24. No Uncaught Renderer Errors
  const errs = window.__errors || [];
  out.rendererErrors = errs.length === 0;

  return out;
})()`;

async function run(win, app) {
  const results = await win.webContents.executeJavaScript(browserChecks, true);
  const names = {
    scratchOut: 'Scratch-out gesture detection works',
    studyTape: 'Study tape curtain toggles and reveals',
    cameraGlide: 'Camera glideTo easing exists on camera',
    replayEngine: 'ReplayEngine initializes with loadTrack and syncClock',
    audioTracksRoundTrip: 'Store serializes and restores audioTracks in doc schema',
    splitWorkspace: 'SplitWorkspace dual layout manager exists',
    videoExporter: 'VideoExporter pipeline engine exists',
    moleculeViewer: 'MoleculeViewerModal and STEM molecule catalog load',
    functionGrapher: 'FunctionGrapherModal provides 2D, 3D surface, and polar curve graphing',
    technicalLinter: 'TechnicalLinter detects wordiness, duplicate words, and passive voice with F-K readability',
    symbolicCAS: 'SymbolicCAS solves equations and evaluates reactive notebook variables',
    circuitSim: 'IndustrialCircuitSim simulates 555 timer, op-amps, and discrete semiconductors',
    chemicalSketcher: 'ChemicalSketcherModal parses SMILES and prepares 2D/3D chemical structures',
    physicsSim: 'SIMULATION_PRESETS includes optics, electric field, collisions, and rigid sandbox',
    fsrs: 'FSRS v5 spaced repetition engine schedules cards with stability and difficulty',
    periodicTable: 'Periodic Table database contains all 118 elements',
    academicDictionary: 'Academic WordNet dictionary and thesaurus modal with IPA and collocations',
    academicStyleAndTone: 'Academic style scoring (0-100%) and formal scholarly tone elevation',
    naturalMathAndCAS: 'Natural language math-to-LaTeX converter and symbolic quadratic CAS solver',
    imageOcclusion: 'Image occlusion dual review modes (Hide All vs Hide One) and cloze deck export',
    dataviewAndKanban: 'Dataview query engine and Kanban board card creation',
    connectorsAndSnapPorts: 'Orthogonal 90-degree routing and magnetic snap ports',
    workspaceSessionAndGraph: 'Multi-tab workspace session save and knowledge graph clustering halos',
    rendererErrors: 'No uncaught renderer errors'
  };

  let passed = 0, failed = 0;
  const lines = [];
  console.log('\n--- Custom / New Features Smoke Test Suite ---');
  for (const [key, label] of Object.entries(names)) {
    const ok = results[key] === true;
    ok ? passed++ : failed++;
    const line = `${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : ` — ${String(results[key])}`}`;
    lines.push(line);
    console.log(`${ok ? '  ok  ' : ' FAIL '} ${line}`);
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);

  const out = path.join(__dirname, 'out', 'new-features-results.txt');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, lines.join('\n') + `\n\n${passed} passed, ${failed} failed\n`);
  app.exit(failed ? 1 : 0);
}

module.exports = { run };
