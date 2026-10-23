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
    // Run evaluation in isolated function
    const val = Function(`"use strict"; return (${s})`)();
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
