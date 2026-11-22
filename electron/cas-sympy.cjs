'use strict';

const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveEcosystemRegistry } = require('./global-resources.cjs');

const SYMPY_SCRIPT = [
  'import json, sys',
  'import sympy as sp',
  'raw = sys.stdin.read()',
  'req = json.loads(raw) if raw.strip() else {}',
  'expr_str = str(req.get("expr") or "").strip()',
  'var_name = str(req.get("variable") or "x").strip() or "x"',
  'if not expr_str:',
  '    print(json.dumps({"ok": False, "error": "Empty expression"}))',
  '    sys.exit(0)',
  'v = sp.Symbol(var_name)',
  'locals_map = {var_name: v, "x": sp.Symbol("x"), "y": sp.Symbol("y"), "z": sp.Symbol("z"), "t": sp.Symbol("t"), "pi": sp.pi, "e": sp.E}',
  'parsed = sp.sympify(expr_str, locals=locals_map)',
  'simplified = sp.simplify(parsed)',
  'out = {',
  '    "ok": True,',
  '    "latex": sp.latex(simplified),',
  '    "simplified": str(simplified),',
  '    "derivative": sp.latex(sp.diff(parsed, v)),',
  '    "integral": sp.latex(sp.integrate(parsed, v))',
  '}',
  'try:',
  '    num = complex(simplified.evalf())',
  '    if abs(num.imag) < 1e-12:',
  '        out["numeric"] = float(num.real)',
  'except Exception:',
  '    pass',
  'print(json.dumps(out))'
].join('\n');

function findPythonExecutable() {
  if (process.env.GAUSSBOARD_PYTHON && fs.existsSync(process.env.GAUSSBOARD_PYTHON)) {
    return process.env.GAUSSBOARD_PYTHON;
  }
  const regPy = resolveEcosystemRegistry()?.data?.toolchains?.python;
  if (regPy && fs.existsSync(regPy)) {
    return regPy;
  }
  if (process.platform === 'win32') {
    const candidateWin = [
      path.join(os.homedir(), 'AppData', 'Local', 'Python', 'pythoncore-3.15-64', 'python.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python315', 'python.exe')
    ];
    for (const pyPath of candidateWin) {
      if (fs.existsSync(pyPath)) return pyPath;
    }
    return 'python';
  }
  return 'python3';
}

function evalSympy({ expr, variable = 'x', timeoutMs = 5000 } = {}) {
  return new Promise((resolve) => {
    const cleanExpr = String(expr || '').trim();
    if (!cleanExpr || cleanExpr.length > 1000) {
      resolve({ ok: false, available: true, error: 'Expression missing or too long' });
      return;
    }
    const py = findPythonExecutable();
    const child = cp.execFile(py, ['-c', SYMPY_SCRIPT], { timeout: timeoutMs, maxBuffer: 256 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const missing = err.code === 'ENOENT' || /No module named 'sympy'/i.test(stderr || '');
        resolve({ ok: false, available: !missing, error: missing ? 'Python/SymPy unavailable' : (stderr || err.message) });
        return;
      }
      try {
        const parsed = JSON.parse(String(stdout || '').trim());
        resolve({ available: true, ...parsed });
      } catch (parseErr) {
        resolve({ ok: false, available: true, error: parseErr.message });
      }
    });
    child.stdin.end(JSON.stringify({ expr: cleanExpr, variable }));
  });
}

module.exports = { findPythonExecutable, evalSympy };
