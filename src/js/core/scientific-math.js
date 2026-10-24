// Scientific Math Studio: LaTeX <-> SymPy, MATLAB, & Wolfram Alpha Syntax Converters,
// Interactive Matrix & Case Builders, and Offline Math Quick Evaluator.

/**
 * Convert a LaTeX math string into a Python/SymPy expression string.
 * @param {string} tex LaTeX math string
 * @returns {string} SymPy-compatible expression
 */
export function latexToSymPy(tex) {
  if (!tex || typeof tex !== 'string') return '';
  let s = tex.trim();

  // Strip math dollar signs
  s = s.replace(/^\$+|\$+$/g, '').trim();

  // Common operators and constants
  s = s.replace(/\\cdot/g, ' * ');
  s = s.replace(/\\times/g, ' * ');
  s = s.replace(/\\div/g, ' / ');
  s = s.replace(/\\pm/g, ' +- ');
  s = s.replace(/\\infty/g, 'oo');
  s = s.replace(/\\pi/g, 'pi');
  s = s.replace(/\\hbar/g, 'hbar');
  s = s.replace(/\\alpha/g, 'alpha');
  s = s.replace(/\\beta/g, 'beta');
  s = s.replace(/\\theta/g, 'theta');
  s = s.replace(/\\lambda/g, 'lamda');
  s = s.replace(/\\sigma/g, 'sigma');
  s = s.replace(/\\mu/g, 'mu');

  // Fractions: \frac{a}{b} -> (a)/(b)
  while (/\\frac\{([^{}]+)\}\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1) / ($2))');
  }

  // Integrals & Summations: run BEFORE power replacement so _{a}^{b} is captured
  s = s.replace(/\\int_\{([^{}]+)\}\^\{([^{}]+)\}\s*([^\\]+?)\s*(?:\\\,|\s*)?d([a-zA-Z])/g, 'integrate($3, ($4, $1, $2))');
  s = s.replace(/\\int\s*([^\\]+?)\s*(?:\\\,|\s*)?d([a-zA-Z])/g, 'integrate($1, $2)');
  s = s.replace(/\\sum_\{([a-zA-Z])=([^{}]+)\}\^\{([^{}]+)\}\s*([^\\]+)/g, 'Sum($4, ($1, $2, $3))');
  s = s.replace(/\\lim_\{([a-zA-Z])\s*\\to\s*([^{}]+)\}\s*([^\\]+)/g, 'limit($3, $1, $2)');

  // Roots: \sqrt[n]{x} -> (x)**(1/n), \sqrt{x} -> sqrt(x)
  s = s.replace(/\\sqrt\[([^{}]+)\]\{([^{}]+)\}/g, '(($2)**(1/($1)))');
  while (/\\sqrt\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)');
  }

  // Powers: x^{y} -> x**(y), x^2 -> x**2
  s = s.replace(/\^{([^{}]+)\}/g, '**($1)');
  s = s.replace(/\^([0-9a-zA-Z])/g, '**$1');

  // Subscripts: x_{i} -> x_i
  s = s.replace(/_\{([^{}]+)\}/g, '_$1');

  // Trig and standard functions
  s = s.replace(/\\sin\b/g, 'sin');
  s = s.replace(/\\cos\b/g, 'cos');
  s = s.replace(/\\tan\b/g, 'tan');
  s = s.replace(/\\sec\b/g, 'sec');
  s = s.replace(/\\csc\b/g, 'csc');
  s = s.replace(/\\cot\b/g, 'cot');
  s = s.replace(/\\arcsin\b/g, 'asin');
  s = s.replace(/\\arccos\b/g, 'acos');
  s = s.replace(/\\arctan\b/g, 'atan');
  s = s.replace(/\\sinh\b/g, 'sinh');
  s = s.replace(/\\cosh\b/g, 'cosh');
  s = s.replace(/\\tanh\b/g, 'tanh');
  s = s.replace(/\\exp\b/g, 'exp');
  s = s.replace(/\\ln\b/g, 'log');
  s = s.replace(/\\log_\{([^{}]+)\}/g, 'log_base_$1');
  s = s.replace(/\\log\b/g, 'log');

  // Matrices: \begin{bmatrix} a & b \\ c & d \end{bmatrix} -> Matrix([[a, b], [c, d]])
  if (/\\begin\{(?:bmatrix|pmatrix|matrix)\}/.test(s)) {
    s = s.replace(/\\begin\{(?:bmatrix|pmatrix|matrix)\}([\s\S]*?)\\end\{(?:bmatrix|pmatrix|matrix)\}/g, (_, inner) => {
      const rows = inner.trim().split(/\\\\/).map((row) => {
        const cols = row.trim().split(/&/).map((c) => c.trim()).filter(Boolean);
        return `[${cols.join(', ')}]`;
      }).filter((r) => r !== '[]');
      return `Matrix([${rows.join(', ')}])`;
    });
  }

  // Cleanup left/right brackets & backslashes
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  s = s.replace(/\\left\\\{/g, '{').replace(/\\right\\\}/g, '}');
  s = s.replace(/\\text\{([^{}]+)\}/g, '$1');
  s = s.replace(/\\,/g, ' ');
  s = s.replace(/\\;/g, ' ');
  s = s.replace(/\\quad/g, ' ');

  return s.trim();
}

/**
 * Convert a LaTeX math string into a MATLAB/Octave expression string.
 * @param {string} tex LaTeX math string
 * @returns {string} MATLAB-compatible expression
 */
export function latexToMatlab(tex) {
  if (!tex || typeof tex !== 'string') return '';
  let s = tex.trim();
  s = s.replace(/^\$+|\$+$/g, '').trim();

  // Basic operators
  s = s.replace(/\\cdot/g, ' .* ');
  s = s.replace(/\\times/g, ' .* ');
  s = s.replace(/\\div/g, ' ./ ');
  s = s.replace(/\\pi/g, 'pi');
  s = s.replace(/\\infty/g, 'Inf');

  // Fractions: \frac{a}{b} -> (a)./(b)
  while (/\\frac\{([^{}]+)\}\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1) ./ ($2))');
  }

  // Integrals & Derivatives in MATLAB Symbolic Toolbox format (run before power replacement)
  s = s.replace(/\\int_\{([^{}]+)\}\^\{([^{}]+)\}\s*([^\\]+?)\s*(?:\\\,|\s*)?d([a-zA-Z])/g, 'int($3, $4, $1, $2)');
  s = s.replace(/\\int\s*([^\\]+?)\s*(?:\\\,|\s*)?d([a-zA-Z])/g, 'int($1, $2)');
  s = s.replace(/\\frac\{d\}\{d([a-zA-Z])\}\s*([^\s]+)/g, 'diff($2, $1)');

  // Roots
  s = s.replace(/\\sqrt\[([^{}]+)\]\{([^{}]+)\}/g, 'nthroot($2, $1)');
  while (/\\sqrt\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)');
  }

  // Powers: elementwise .^
  s = s.replace(/\^{([^{}]+)\}/g, '.^($1)');
  s = s.replace(/\^([0-9a-zA-Z])/g, '.^$1');

  // Trig
  s = s.replace(/\\sin\b/g, 'sin');
  s = s.replace(/\\cos\b/g, 'cos');
  s = s.replace(/\\tan\b/g, 'tan');
  s = s.replace(/\\asin\b/g, 'asin');
  s = s.replace(/\\acos\b/g, 'acos');
  s = s.replace(/\\atan\b/g, 'atan');
  s = s.replace(/\\exp\b/g, 'exp');
  s = s.replace(/\\ln\b/g, 'log');
  s = s.replace(/\\log_\{10\}\b/g, 'log10');
  s = s.replace(/\\log_\{2\}\b/g, 'log2');
  s = s.replace(/\\log\b/g, 'log');

  // Matrices: \begin{bmatrix} a & b \\ c & d \end{bmatrix} -> [a, b; c, d]
  if (/\\begin\{(?:bmatrix|pmatrix|matrix)\}/.test(s)) {
    s = s.replace(/\\begin\{(?:bmatrix|pmatrix|matrix)\}([\s\S]*?)\\end\{(?:bmatrix|pmatrix|matrix)\}/g, (_, inner) => {
      const rows = inner.trim().split(/\\\\/).map((row) => {
        return row.trim().split(/&/).map((c) => c.trim()).filter(Boolean).join(', ');
      }).filter(Boolean);
      return `[${rows.join('; ')}]`;
    });
  }

  // Brackets cleanup
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  s = s.replace(/\\text\{([^{}]+)\}/g, '$1');
  s = s.replace(/\\,/g, ' ');

  return s.trim();
}

/**
 * Convert a LaTeX math string into a Wolfram Alpha natural query.
 * @param {string} tex LaTeX math string
 * @returns {string} Wolfram Alpha query string
 */
export function latexToWolfram(tex) {
  if (!tex || typeof tex !== 'string') return '';
  let s = tex.trim();
  s = s.replace(/^\$+|\$+$/g, '').trim();

  // Integrals: \int_{0}^{1} x^2 dx -> integrate x^2 from 0 to 1
  s = s.replace(/\\int_\{([^{}]+)\}\^\{([^{}]+)\}\s*([^\\]+?)\s*(?:\\\,|\s*)?d([a-zA-Z])/g, 'integrate $3 with respect to $4 from $1 to $2');
  s = s.replace(/\\int\s*([^\\]+?)\s*(?:\\\,|\s*)?d([a-zA-Z])/g, 'integrate $1 dx');

  // Derivatives: \frac{d}{dx} f -> derivative of f with respect to x
  s = s.replace(/\\frac\{d\}\{d([a-zA-Z])\}\s*([^\s]+)/g, 'derivative of $2 with respect to $1');
  s = s.replace(/\\frac\{\\partial\}\{\\partial\s*([a-zA-Z])\}\s*([^\s]+)/g, 'partial derivative of $2 with respect to $1');

  // Limits: \lim_{x \to 0} f -> limit f as x->0
  s = s.replace(/\\lim_\{([a-zA-Z])\s*\\to\s*([^{}]+)\}\s*([^\\]+)/g, 'limit $3 as $1->$2');

  // Summations: \sum_{i=1}^{n} i^2 -> sum i^2 from i=1 to n
  s = s.replace(/\\sum_\{([a-zA-Z])=([^{}]+)\}\^\{([^{}]+)\}\s*([^\\]+)/g, 'sum $4 from $1=$2 to $3');

  // Fractions: \frac{a}{b} -> (a)/(b)
  while (/\\frac\{([^{}]+)\}\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
  }

  // Roots
  s = s.replace(/\\sqrt\[([^{}]+)\]\{([^{}]+)\}/g, 'nth root($2, $1)');
  while (/\\sqrt\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)');
  }

  // Matrices: {{a, b}, {c, d}}
  if (/\\begin\{(?:bmatrix|pmatrix|matrix)\}/.test(s)) {
    s = s.replace(/\\begin\{(?:bmatrix|pmatrix|matrix)\}([\s\S]*?)\\end\{(?:bmatrix|pmatrix|matrix)\}/g, (_, inner) => {
      const rows = inner.trim().split(/\\\\/).map((row) => {
        const cols = row.trim().split(/&/).map((c) => c.trim()).filter(Boolean);
        return `{${cols.join(', ')}}`;
      }).filter((r) => r !== '{}');
      return `{${rows.join(', ')}}`;
    });
  }

  // General cleanups
  s = s.replace(/\\cdot/g, ' * ');
  s = s.replace(/\\times/g, ' * ');
  s = s.replace(/\\pi/g, 'pi');
  s = s.replace(/\\infty/g, 'infinity');
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  s = s.replace(/\\text\{([^{}]+)\}/g, '$1');
  s = s.replace(/\\,/g, ' ');

  return s.trim();
}

/**
 * Generate LaTeX for an MxN matrix.
 * @param {number} rows number of rows (e.g. 2, 3)
 * @param {number} cols number of columns (e.g. 2, 3)
 * @param {'bmatrix'|'pmatrix'|'vmatrix'} type matrix bracket style
 * @returns {string} LaTeX string
 */
export function generateMatrixTex(rows = 2, cols = 2, type = 'bmatrix') {
  const rCount = Math.max(1, Math.min(8, rows));
  const cCount = Math.max(1, Math.min(8, cols));
  const lines = [];
  for (let r = 0; r < rCount; r++) {
    const rowCells = [];
    for (let c = 0; c < cCount; c++) {
      rowCells.push(r === 0 && c === 0 ? '@' : '');
    }
    lines.push('  ' + rowCells.join(' & '));
  }
  return `\\begin{${type}}\n${lines.join(' \\\\\n')}\n\\end{${type}}`;
}

/**
 * Generate LaTeX for a piecewise / cases construct.
 * @param {number} count number of cases
 * @returns {string} LaTeX string
 */
export function generateCasesTex(count = 2) {
  const cCount = Math.max(2, Math.min(6, count));
  const lines = [];
  for (let i = 0; i < cCount; i++) {
    const cond = i === 0 ? '\\text{if } x > 0' : (i === cCount - 1 ? '\\text{otherwise}' : '\\text{if } x = 0');
    lines.push(`  ${i === 0 ? '@' : ''} & ${cond}`);
  }
  return `f(x) = \\begin{cases}\n${lines.join(' \\\\\n')}\n\\end{cases}`;
}

/**
 * Safe Pure Recursive Descent Expression Evaluator (Zero CSP eval / Function dependency)
 */
export function parseMathExpressionSafely(exprStr, vars = {}) {
  if (!exprStr || typeof exprStr !== 'string') return NaN;
  const tokens = [];
  const regex = /\s*([0-9]+\.?[0-9]*|[a-zA-Z_][a-zA-Z0-9_]*|\*\*|\+|-|\*|\/|\^|\(|\))\s*/g;
  let match;
  while ((match = regex.exec(exprStr)) !== null) {
    if (match[1]) tokens.push(match[1]);
  }
  let pos = 0;
  function peek() { return tokens[pos]; }
  function consume() { return tokens[pos++]; }
  function parseExpr() {
    let val = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const next = parseTerm();
      val = op === '+' ? val + next : val - next;
    }
    return val;
  }
  function parseTerm() {
    let val = parsePower();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const next = parsePower();
      val = op === '*' ? val * next : val / next;
    }
    return val;
  }
  function parsePower() {
    let val = parseUnary();
    if (peek() === '^' || peek() === '**') {
      consume();
      const next = parsePower();
      val = Math.pow(val, next);
    }
    return val;
  }
  function parseUnary() {
    if (peek() === '+') { consume(); return parseUnary(); }
    if (peek() === '-') { consume(); return -parseUnary(); }
    return parsePrimary();
  }
  function parsePrimary() {
    const tok = consume();
    if (!tok) return NaN;
    if (tok === '(') {
      const val = parseExpr();
      if (peek() === ')') consume();
      return val;
    }
    if (/^[0-9]/.test(tok)) return parseFloat(tok);
    const low = tok.toLowerCase();
    if (low === 'x') return typeof vars.x === 'number' ? vars.x : (typeof vars.x !== 'undefined' ? Number(vars.x) : 0);
    if (low === 'pi') return Math.PI;
    if (low === 'e') return Math.E;
    if (Object.prototype.hasOwnProperty.call(vars, tok)) return Number(vars[tok]);
    if (peek() === '(') {
      consume();
      const arg = parseExpr();
      if (peek() === ')') consume();
      if (low === 'sin') return Math.sin(arg);
      if (low === 'cos') return Math.cos(arg);
      if (low === 'tan') return Math.tan(arg);
      if (low === 'asin') return Math.asin(arg);
      if (low === 'acos') return Math.acos(arg);
      if (low === 'atan') return Math.atan(arg);
      if (low === 'sqrt') return Math.sqrt(arg);
      if (low === 'exp') return Math.exp(arg);
      if (low === 'log' || low === 'ln') return Math.log(arg);
      if (low === 'log10') return Math.log10(arg);
      if (low === 'abs') return Math.abs(arg);
    }
    return NaN;
  }
  return parseExpr();
}

/**
 * Safe offline arithmetic & elementary expression quick evaluator.
 * Evaluates basic numeric expressions (e.g. "2 + 3 * 4", "\sqrt{64}", "sin(\pi/2)", "2^8").
 * @param {string} tex LaTeX or expression string
 * @returns {{ ok: boolean, result?: string, numeric?: number }}
 */
export function evalMathExpression(tex) {
  if (!tex || typeof tex !== 'string') return { ok: false };
  let s = tex.trim();
  s = s.replace(/^\$+|\$+$/g, '').trim();

  // If it's an equation or assignment (e.g. f(x) = ... or x = ...), take right side
  if (s.includes('=')) {
    const parts = s.split('=');
    s = parts[parts.length - 1].trim();
  }

  // Preprocess LaTeX math into JS Math syntax
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, 'Math.sqrt($1)');
  s = s.replace(/\\sqrt\[([^{}]+)\]\{([^{}]+)\}/g, 'Math.pow($2, 1/($1))');
  s = s.replace(/\^{([^{}]+)\}/g, '**($1)');
  s = s.replace(/\^([0-9a-zA-Z])/g, '**$1');
  s = s.replace(/\\pi\b/g, 'Math.PI');
  s = s.replace(/\\cdot/g, '*');
  s = s.replace(/\\times/g, '*');
  s = s.replace(/\\div/g, '/');

  // Trig & functions
  s = s.replace(/\\sin\b/g, 'Math.sin');
  s = s.replace(/\\cos\b/g, 'Math.cos');
  s = s.replace(/\\tan\b/g, 'Math.tan');
  s = s.replace(/\\asin\b/g, 'Math.asin');
  s = s.replace(/\\acos\b/g, 'Math.acos');
  s = s.replace(/\\atan\b/g, 'Math.atan');
  s = s.replace(/\\exp\b/g, 'Math.exp');
  s = s.replace(/\\ln\b/g, 'Math.log');
  s = s.replace(/\\log_\{10\}\b/g, 'Math.log10');
  s = s.replace(/\\log_\{2\}\b/g, 'Math.log2');
  s = s.replace(/\\log\b/g, 'Math.log10');
  s = s.replace(/\\abs\{([^{}]+)\}/g, 'Math.abs($1)');

  // Clean brackets
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '(').replace(/\\right\]/g, ')');
  s = s.replace(/\\,/g, '');

  // Guard against excessive string length or exponential calculation loops
  if (s.length > 256 || /\*{2,}.*\*{2,}.*\*{2,}/.test(s)) {
    return { ok: false };
  }

  // Only permit safe arithmetic characters: digits, Math.*, + - * / ** ( ) . ,
  // Reject any variables, brackets, or code injection
  const stripped = s.replace(/Math\.(PI|sqrt|pow|sin|cos|tan|asin|acos|atan|exp|log|log10|log2|abs)/g, '');
  if (!/^[0-9+\-*/().,\s*]*$/.test(stripped)) {
    return { ok: false };
  }

  try {
    // Run evaluation via safe recursive descent parser (Zero CSP / Function dependency)
    const val = parseMathExpressionSafely(s);
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      return { ok: false };
    }
    // Clean format
    const formatted = Math.abs(val) < 1e-10 ? '0' : (Number.isInteger(val) ? String(val) : String(Math.round(val * 1000000) / 1000000));
    return { ok: true, result: formatted, numeric: val };
  } catch {
    return { ok: false };
  }
}

/**
 * Reactive Notebook Variable State Manager
 * Binds variables (e.g. V_supply = 48, R_1 = 12) across whiteboard notes
 */
export class NotebookVariables {
  constructor() {
    this.vars = new Map();
  }

  set(name, val) {
    if (!name || typeof name !== 'string') return;
    this.vars.set(name.trim(), Number(val));
  }

  get(name) {
    return this.vars.get(name?.trim());
  }

  has(name) {
    return this.vars.has(name?.trim());
  }

  clear() {
    this.vars.clear();
  }

  /**
   * Evaluates an algebraic expression substituting reactive variables
   * @param {string} expr e.g. "V_supply / R_1"
   * @returns {{ ok: boolean, result?: string, numeric?: number }}
   */
  evaluate(expr) {
    if (!expr || typeof expr !== 'string') return { ok: false };
    const varsObj = {};
    for (const [k, v] of this.vars.entries()) {
      varsObj[k] = v;
    }
    try {
      const val = parseMathExpressionSafely(expr, varsObj);
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        return { ok: false };
      }
      const formatted = Math.abs(val) < 1e-10 ? '0' : (Number.isInteger(val) ? String(val) : String(Math.round(val * 1000000) / 1000000));
      return { ok: true, result: formatted, numeric: val };
    } catch {
      return { ok: false };
    }
  }
}

export const notebookVars = new NotebookVariables();

/**
 * Lightweight Symbolic CAS Solver (Document 6 Section 4.1)
 * Evaluates symbolic derivatives, polynomial factoring, and linear equations.
 */
export class SymbolicCAS {
  /**
   * Solves linear equation e.g. "3x + 12 = 0" or "4x - 8 = 16"
   * @param {string} eqStr
   */
  static solveLinear(eqStr) {
    if (!eqStr || !eqStr.includes('=')) return null;
    const parts = eqStr.split('=').map((p) => p.trim());
    // Pattern: [a]x [+/-] [b] = [c]
    const left = parts[0].replace(/\s+/g, '');
    const right = parseFloat(parts[1]) || 0;

    const m = left.match(/^([+-]?\d*\.?\d*)x([+-]\d*\.?\d*)?$/i);
    if (!m) return null;

    let a = m[1] === '' || m[1] === '+' ? 1 : (m[1] === '-' ? -1 : parseFloat(m[1]));
    let b = m[2] ? parseFloat(m[2]) : 0;

    if (Math.abs(a) < 1e-12) return null;
    const xVal = (right - b) / a;
    const cleanX = Number.isInteger(xVal) ? String(xVal) : xVal.toFixed(3);

    return {
      equation: eqStr,
      root: xVal,
      latex: `${eqStr} \\implies x = ${cleanX}`
    };
  }

  /**
   * Symbolic polynomial derivative d/dx (powers, sin, cos, exp, ln)
   * @param {string} expr
   */
  static differentiate(expr) {
    if (!expr || typeof expr !== 'string') return null;
    const s = expr.trim();

    // Standard elementary patterns
    if (/^x\^(\d+)$/i.test(s)) {
      const p = parseInt(s.match(/\d+/)[0], 10);
      return p === 1 ? '1' : (p === 2 ? '2x' : `${p}x^{${p - 1}}`);
    }
    if (/^(\d+)x\^(\d+)$/i.test(s)) {
      const m = s.match(/^(\d+)x\^(\d+)$/i);
      const coeff = parseInt(m[1], 10);
      const p = parseInt(m[2], 10);
      return `${coeff * p}x^{${p - 1}}`;
    }
    if (/^sin\(x\)$/i.test(s)) return '\\cos(x)';
    if (/^cos\(x\)$/i.test(s)) return '-\\sin(x)';
    if (/^exp\(x\)$/i.test(s) || /^e\^x$/i.test(s)) return 'e^x';
    if (/^ln\(x\)$/i.test(s)) return '\\frac{1}{x}';

    return null;
  }

  /**
   * Quadratic root finding and factoring: ax^2 + bx + c = 0
   * @param {number} a
   * @param {number} b
   * @param {number} c
   */
  static factorQuadratic(a, b, c) {
    const disc = b * b - 4 * a * c;
    if (disc < 0) {
      // Complex roots
      const real = (-b / (2 * a)).toFixed(2);
      const imag = (Math.sqrt(-disc) / (2 * a)).toFixed(2);
      return {
        roots: [`${real} + ${imag}j`, `${real} - ${imag}j`],
        factored: 'Irreducible over ℝ (Complex Conjugate Pair)',
        discriminant: disc
      };
    }
    const r1 = (-b + Math.sqrt(disc)) / (2 * a);
    const r2 = (-b - Math.sqrt(disc)) / (2 * a);
    const s1 = r1 >= 0 ? `- ${r1.toFixed(2)}` : `+ ${Math.abs(r1).toFixed(2)}`;
    const s2 = r2 >= 0 ? `- ${r2.toFixed(2)}` : `+ ${Math.abs(r2).toFixed(2)}`;

    return {
      roots: [r1, r2],
      factored: `(x ${s1})(x ${s2})`,
      discriminant: disc
    };
  }

  /**
   * Solves quadratic equation string e.g. "x^2 - 5x + 6 = 0" or "2x^2 + 4x - 6 = 0"
   * @param {string} eqStr
   * @returns {{ ok: boolean, a: number, b: number, c: number, discriminant: number, roots: Array<number|string>, steps: string[], latex: string, error?: string }}
   */
  static solveQuadratic(eqStr) {
    if (!eqStr || typeof eqStr !== 'string') return { ok: false, error: 'Empty equation' };
    try {
      const parts = eqStr.split('=').map((p) => p.trim());
      const leftStr = parts[0] || '0';
      const rightStr = parts[1] || '0';

      const parsePoly = (str) => {
        let a = 0, b = 0, c = 0;
        const clean = str.replace(/\s+/g, '').replace(/-/g, '+-');
        const terms = clean.split('+').filter(Boolean);
        for (const t of terms) {
          if (/x\^2/i.test(t)) {
            const coeffStr = t.replace(/x\^2/i, '');
            const coeff = coeffStr === '' ? 1 : (coeffStr === '-' ? -1 : parseFloat(coeffStr));
            a += isNaN(coeff) ? 0 : coeff;
          } else if (/x/i.test(t)) {
            const coeffStr = t.replace(/x/i, '');
            const coeff = coeffStr === '' ? 1 : (coeffStr === '-' ? -1 : parseFloat(coeffStr));
            b += isNaN(coeff) ? 0 : coeff;
          } else {
            const val = parseFloat(t);
            c += isNaN(val) ? 0 : val;
          }
        }
        return { a, b, c };
      };

      const left = parsePoly(leftStr);
      const right = parsePoly(rightStr);
      const a = left.a - right.a;
      const b = left.b - right.b;
      const c = left.c - right.c;

      if (Math.abs(a) < 1e-12) {
        // Linear equation fallback: bx + c = 0
        if (Math.abs(b) < 1e-12) return { ok: false, error: 'Degenerate equation with no x terms' };
        const root = -c / b;
        return {
          ok: true,
          a: 0,
          b,
          c,
          discriminant: 0,
          roots: [root],
          steps: [`Linear equation: ${b}x + ${c} = 0`, `x = -(${c}) / ${b} = ${root}`],
          latex: `x = ${Number.isInteger(root) ? root : root.toFixed(3)}`
        };
      }

      const disc = b * b - 4 * a * c;
      const steps = [
        `Standard form: ${a}x^2 + ${b}x + ${c} = 0`,
        `Discriminant: \\Delta = b^2 - 4ac = (${b})^2 - 4(${a})(${c}) = ${disc}`
      ];

      if (disc > 0) {
        const r1 = (-b + Math.sqrt(disc)) / (2 * a);
        const r2 = (-b - Math.sqrt(disc)) / (2 * a);
        const r1Clean = Number.isInteger(r1) ? r1 : parseFloat(r1.toFixed(4));
        const r2Clean = Number.isInteger(r2) ? r2 : parseFloat(r2.toFixed(4));
        steps.push(`Two distinct real roots: x = \\frac{-(${b}) \\pm \\sqrt{${disc}}}{2(${a})}`);
        return {
          ok: true,
          a,
          b,
          c,
          discriminant: disc,
          roots: [r1Clean, r2Clean],
          steps,
          latex: `x_1 = ${r1Clean}, \\; x_2 = ${r2Clean}`
        };
      } else if (Math.abs(disc) < 1e-12) {
        const r = -b / (2 * a);
        const rClean = Number.isInteger(r) ? r : parseFloat(r.toFixed(4));
        steps.push(`Repeated real root: x = \\frac{-(${b})}{2(${a})} = ${rClean}`);
        return {
          ok: true,
          a,
          b,
          c,
          discriminant: 0,
          roots: [rClean],
          steps,
          latex: `x = ${rClean}`
        };
      } else {
        const real = -b / (2 * a);
        const imag = Math.sqrt(-disc) / (2 * a);
        const realStr = Number.isInteger(real) ? String(real) : real.toFixed(3);
        const imagStr = Number.isInteger(imag) ? String(imag) : imag.toFixed(3);
        steps.push(`Complex conjugate pair: x = ${realStr} \\pm ${imagStr}i`);
        return {
          ok: true,
          a,
          b,
          c,
          discriminant: disc,
          roots: [`${realStr} + ${imagStr}i`, `${realStr} - ${imagStr}i`],
          steps,
          latex: `x = ${realStr} \\pm ${imagStr}i`
        };
      }
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Compute exact determinant of an n x n numeric matrix
   * @param {number[][] | string} matrix
   * @returns {{ ok: boolean, determinant: number, dimension: number, latex: string, error?: string }}
   */
  static matrixDeterminant(matrix) {
    try {
      let m = matrix;
      if (typeof m === 'string') {
        m = JSON.parse(m);
      }
      if (!Array.isArray(m) || !m.length || !Array.isArray(m[0])) {
        return { ok: false, error: 'Invalid matrix array format' };
      }
      const n = m.length;
      if (!m.every((row) => Array.isArray(row) && row.length === n)) {
        return { ok: false, error: 'Matrix must be square (n x n)' };
      }

      function det(mat) {
        const dim = mat.length;
        if (dim === 1) return mat[0][0];
        if (dim === 2) return mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0];
        if (dim === 3) {
          return (
            mat[0][0] * (mat[1][1] * mat[2][2] - mat[1][2] * mat[2][1]) -
            mat[0][1] * (mat[1][0] * mat[2][2] - mat[1][2] * mat[2][0]) +
            mat[0][2] * (mat[1][0] * mat[2][1] - mat[1][1] * mat[2][0])
          );
        }
        let total = 0;
        for (let col = 0; col < dim; col++) {
          const sub = [];
          for (let row = 1; row < dim; row++) {
            sub.push(mat[row].filter((_, cIndex) => cIndex !== col));
          }
          const sign = col % 2 === 0 ? 1 : -1;
          total += sign * mat[0][col] * det(sub);
        }
        return total;
      }

      const dVal = det(m);
      const cleanVal = Number.isInteger(dVal) ? dVal : parseFloat(dVal.toFixed(4));
      return {
        ok: true,
        determinant: cleanVal,
        dimension: n,
        latex: `\\det(A) = ${cleanVal}`
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

/**
 * Atomic weights lookup dictionary for standard elements
 */
export const ATOMIC_WEIGHTS = {
  H: 1.008, He: 4.003, Li: 6.94, Be: 9.012, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Ne: 20.180,
  Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948, K: 39.098,
  Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693,
  Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.630, As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468,
  Sr: 87.62, Y: 88.906, Zr: 91.224, Nb: 92.906, Mo: 95.95, Tc: 98.0, Ru: 101.07, Rh: 102.91, Pd: 106.42,
  Ag: 107.87, Cd: 112.41, In: 114.82, Sn: 118.71, Sb: 121.76, Te: 127.60, I: 126.90, Xe: 131.29, Cs: 132.91,
  Ba: 137.33, La: 138.91, Ce: 140.12, Pr: 140.91, Nd: 144.24, Sm: 150.36, Eu: 151.96, Gd: 157.25, Tb: 158.93,
  Dy: 162.50, Ho: 164.93, Er: 167.26, Tm: 168.93, Yb: 173.05, Lu: 174.97, Hf: 178.49, Ta: 180.95, W: 183.84,
  Re: 186.21, Os: 190.23, Ir: 192.22, Pt: 195.08, Au: 196.97, Hg: 200.59, Tl: 204.38, Pb: 207.2, Bi: 208.98,
  Th: 232.04, Pa: 231.04, U: 238.03
};

/**
 * Parses a chemical formula (e.g. "Ca(OH)2", "C6H12O6", "K4[Fe(CN)6]", "CuSO4*5H2O")
 * and computes total molar mass and elemental mass percentages.
 * @param {string} formula
 * @returns {{ ok: boolean, molarMass: number, formula: string, composition: Array<{ elem: string, count: number, mass: number, percent: number }>, error?: string }}
 */
export function calculateMolarMass(formula) {
  if (!formula || typeof formula !== 'string') return { ok: false, error: 'Empty formula' };
  try {
    const clean = formula.trim().replace(/\s+/g, '');
    let hydrateMultiplier = 1;
    let mainPart = clean;
    let hydratePart = '';
    const hydrateMatch = clean.match(/[\*\.](?:(\d+))?([A-Za-z0-9\(\)\[\]]+)$/);
    if (hydrateMatch) {
      hydrateMultiplier = hydrateMatch[1] ? parseInt(hydrateMatch[1], 10) : 1;
      hydratePart = hydrateMatch[2];
      mainPart = clean.slice(0, hydrateMatch.index);
    }

    function parseGroup(str) {
      const counts = {};
      let i = 0;
      while (i < str.length) {
        if (str[i] === '(' || str[i] === '[') {
          const openChar = str[i];
          const closeChar = openChar === '(' ? ')' : ']';
          let depth = 1;
          let j = i + 1;
          while (j < str.length && depth > 0) {
            if (str[j] === openChar) depth++;
            else if (str[j] === closeChar) depth--;
            j++;
          }
          if (depth !== 0) throw new Error('Unbalanced brackets');
          const subCounts = parseGroup(str.slice(i + 1, j - 1));
          i = j;
          let numStr = '';
          while (i < str.length && /\d/.test(str[i])) {
            numStr += str[i];
            i++;
          }
          const mult = numStr ? parseInt(numStr, 10) : 1;
          for (const [elem, cnt] of Object.entries(subCounts)) {
            counts[elem] = (counts[elem] || 0) + cnt * mult;
          }
        } else if (/[A-Z]/.test(str[i])) {
          let elem = str[i];
          i++;
          if (i < str.length && /[a-z]/.test(str[i])) {
            elem += str[i];
            i++;
          }
          let numStr = '';
          while (i < str.length && /\d/.test(str[i])) {
            numStr += str[i];
            i++;
          }
          const cnt = numStr ? parseInt(numStr, 10) : 1;
          counts[elem] = (counts[elem] || 0) + cnt;
        } else {
          i++;
        }
      }
      return counts;
    }

    const totalCounts = parseGroup(mainPart);
    if (hydratePart) {
      const hydCounts = parseGroup(hydratePart);
      for (const [elem, cnt] of Object.entries(hydCounts)) {
        totalCounts[elem] = (totalCounts[elem] || 0) + cnt * hydrateMultiplier;
      }
    }

    let totalMass = 0;
    const composition = [];
    for (const [elem, count] of Object.entries(totalCounts)) {
      const weight = ATOMIC_WEIGHTS[elem] || 0;
      if (!weight) throw new Error(`Unknown element: ${elem}`);
      const mass = weight * count;
      totalMass += mass;
      composition.push({ elem, count, mass });
    }

    composition.forEach((item) => {
      item.percent = Math.round((item.mass / totalMass) * 10000) / 100;
    });

    return {
      ok: true,
      formula: clean,
      molarMass: Math.round(totalMass * 1000) / 1000,
      composition: composition.sort((a, b) => b.percent - a.percent)
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Converts natural conversational math phrasing into standardized LaTeX
 * Supports integrals, derivatives, limits, summations, roots, fractions, and matrices.
 * @param {string} text
 * @returns {string} LaTeX expression
 */
export function naturalMathToLaTeX(text) {
  if (!text || typeof text !== 'string') return '';
  let s = text.trim();

  // Strip math dollar delimiters if present
  s = s.replace(/^\$+|\$+$/g, '').trim();

  // 1. Integrals: definite and indefinite
  s = s.replace(/\bintegral\s+of\s+(.+?)\s+from\s+([^\s]+)\s+to\s+([^\s]+)(?:\s+(?:with\s+respect\s+to|d([a-zA-Z])))?/gi, (_, expr, a, b, v) => {
    const varName = v || 'x';
    return `\\int_{${a}}^{${b}} ${expr.trim()} \\, d${varName}`;
  });
  s = s.replace(/\bintegral\s+of\s+(.+?)(?:\s+with\s+respect\s+to\s+([a-zA-Z])|\s+d([a-zA-Z]))?$/gi, (_, expr, v1, v2) => {
    const varName = v1 || v2 || 'x';
    let cleanExpr = expr.trim();
    if (cleanExpr.endsWith(`d${varName}`)) cleanExpr = cleanExpr.slice(0, -(`d${varName}`.length)).trim();
    return `\\int ${cleanExpr} \\, d${varName}`;
  });

  // 2. Derivatives & partials
  s = s.replace(/\bpartial\s+derivative\s+of\s+(.+?)\s+with\s+respect\s+to\s+([a-zA-Z])/gi, (_, expr, v) => {
    return `\\frac{\\partial}{\\partial ${v}}\\left[ ${expr.trim()} \\right]`;
  });
  s = s.replace(/\bderivative\s+of\s+(.+?)(?:\s+with\s+respect\s+to\s+([a-zA-Z]))?$/gi, (_, expr, v) => {
    const varName = v || 'x';
    return `\\frac{d}{d${varName}}\\left[ ${expr.trim()} \\right]`;
  });

  // 3. Limits
  s = s.replace(/\blimit\s+of\s+(.+?)\s+as\s+([a-zA-Z])\s*(?:approaches|->|to)\s*([^\s]+)/gi, (_, expr, v, target) => {
    const cleanTarget = target.toLowerCase() === 'infinity' || target === 'oo' ? '\\infty' : target;
    return `\\lim_{${v} \\to ${cleanTarget}} ${expr.trim()}`;
  });

  // 4. Summations and Products
  s = s.replace(/\bsum\s+of\s+(.+?)\s+from\s+(?:([a-zA-Z])\s*=\s*)?([^\s]+)\s+to\s+([^\s]+)/gi, (_, expr, v, fromVal, toVal) => {
    const varName = v || 'n';
    const cleanTo = toVal.toLowerCase() === 'infinity' || toVal === 'oo' ? '\\infty' : toVal;
    return `\\sum_{${varName}=${fromVal}}^{${cleanTo}} ${expr.trim()}`;
  });
  s = s.replace(/\bproduct\s+of\s+(.+?)\s+from\s+(?:([a-zA-Z])\s*=\s*)?([^\s]+)\s+to\s+([^\s]+)/gi, (_, expr, v, fromVal, toVal) => {
    const varName = v || 'n';
    const cleanTo = toVal.toLowerCase() === 'infinity' || toVal === 'oo' ? '\\infty' : toVal;
    return `\\prod_{${varName}=${fromVal}}^{${cleanTo}} ${expr.trim()}`;
  });

  // 5. Roots
  s = s.replace(/\b(?:square\s+root\s+of|sqrt\s+of)\s+([a-zA-Z0-9^_+*/.-]+|\([^)]+\))/gi, '\\sqrt{$1}');
  s = s.replace(/\bsqrt\(([^()]+)\)/gi, '\\sqrt{$1}');
  s = s.replace(/\bcube\s+root\s+of\s+([a-zA-Z0-9^_+*/.-]+|\([^)]+\))/gi, '\\sqrt[3]{$1}');
  s = s.replace(/\broot\s+(\d+|[a-zA-Z])\s+of\s+([a-zA-Z0-9^_+*/.-]+|\([^)]+\))/gi, '\\sqrt[$1]{$2}');

  // 6. Fractions
  s = s.replace(/\b([a-zA-Z0-9()]+)\s+over\s+([a-zA-Z0-9()]+)\b/gi, '\\frac{$1}{$2}');

  // 7. Matrices: matrix [[1, 2], [3, 4]]
  if (/\[\[[\s\S]*?\]\]/.test(s)) {
    s = s.replace(/matrix\s*\[\[([\s\S]*?)\]\]/gi, (_, inner) => {
      const rows = inner.split(/\],\s*\[/).map((r) => {
        const cleanRow = r.replace(/[\[\]]/g, '').trim();
        return cleanRow.split(/[\s,]+/).filter(Boolean).join(' & ');
      });
      return `\\begin{pmatrix} ${rows.join(' \\\\ ')} \\end{pmatrix}`;
    });
  }

  // 8. Elementary symbols & operators
  s = s.replace(/\bplus\s+or\s+minus\b|\+\/-/gi, '\\pm');
  s = s.replace(/\btimes\b|\s\*\s/g, ' \\cdot ');
  s = s.replace(/\bdivided\s+by\b/gi, ' / ');
  s = s.replace(/\binfinity\b|\boo\b/gi, '\\infty');
  s = s.replace(/\bpi\b/gi, '\\pi');
  s = s.replace(/\btheta\b/gi, '\\theta');
  s = s.replace(/\balpha\b/gi, '\\alpha');
  s = s.replace(/\bbeta\b/gi, '\\beta');
  s = s.replace(/\bgamma\b/gi, '\\gamma');
  s = s.replace(/\bdelta\b/gi, '\\delta');
  s = s.replace(/\blambda\b/gi, '\\lambda');
  s = s.replace(/\bsigma\b/gi, '\\sigma');
  s = s.replace(/<=/g, '\\le');
  s = s.replace(/>=/g, '\\ge');
  s = s.replace(/!=/g, '\\ne');
  s = s.replace(/\^([a-zA-Z0-9]+)/g, '^{$1}');

  return s;
}


