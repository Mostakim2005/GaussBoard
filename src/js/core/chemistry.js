/**
 * GazBoard - Chemical Equation Balancer & Stoichiometry Engine
 * Pure JavaScript Gaussian elimination solver, IUPAC atomic weights table,
 * molar mass calculator, and Grade 11-12 reaction type classifier.
 */

import { t } from '../i18n.js';
import { uid } from './util.js';

/** Standard IUPAC Atomic Weights (g/mol) */
export const ATOMIC_WEIGHTS = Object.freeze({
  H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999,
  F: 18.998, Ne: 20.180, Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06,
  Cl: 35.45, Ar: 39.948, K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996,
  Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.630,
  As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224,
  Nb: 92.906, Mo: 95.95, Tc: 98, Ru: 101.07, Rh: 102.91, Pd: 106.42, Ag: 107.87, Cd: 112.41,
  In: 114.82, Sn: 118.71, Sb: 121.76, Te: 127.60, I: 126.90, Xe: 131.29, Cs: 132.91, Ba: 137.33,
  La: 138.91, Ce: 140.12, Pr: 140.91, Nd: 144.24, Pm: 145, Sm: 150.36, Eu: 151.96, Gd: 157.25,
  Tb: 158.93, Dy: 162.50, Ho: 164.93, Er: 167.26, Tm: 168.93, Yb: 173.05, Lu: 174.97, Hf: 178.49,
  Ta: 180.95, W: 183.84, Re: 186.21, Os: 190.23, Ir: 192.22, Pt: 195.08, Au: 196.97, Hg: 200.59,
  Tl: 204.38, Pb: 207.2, Bi: 208.98, Th: 232.04, Pa: 231.04, U: 238.03
});

/** Parse a chemical formula into an element count dictionary, supporting parentheses */
export function parseFormula(formula) {
  const regex = /([A-Z][a-z]*)(\d*)|(\()|(\))(\d*)/g;
  const stack = [{}];
  let match;
  while ((match = regex.exec(formula)) !== null) {
    const [, elem, count, openParen, closeParen, parenCount] = match;
    if (openParen) {
      stack.push({});
    } else if (closeParen) {
      const top = stack.pop();
      const mult = parenCount ? parseInt(parenCount, 10) : 1;
      const current = stack[stack.length - 1];
      for (const [e, c] of Object.entries(top)) {
        current[e] = (current[e] || 0) + c * mult;
      }
    } else if (elem) {
      const c = count ? parseInt(count, 10) : 1;
      const current = stack[stack.length - 1];
      current[elem] = (current[elem] || 0) + c;
    }
  }
  return stack[0] || {};
}

/** Calculate molar mass of a chemical formula */
export function calculateMolarMass(formula) {
  const counts = parseFormula(formula);
  let mass = 0;
  for (const [elem, count] of Object.entries(counts)) {
    const w = ATOMIC_WEIGHTS[elem] || 0;
    mass += w * count;
  }
  return Number(mass.toFixed(3));
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

class Fraction {
  constructor(n, d = 1) {
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    this.n = n / g;
    this.d = d / g;
  }
  add(f) { return new Fraction(this.n * f.d + f.n * this.d, this.d * f.d); }
  sub(f) { return new Fraction(this.n * f.d - f.n * this.d, this.d * f.d); }
  mul(f) { return new Fraction(this.n * f.n, this.d * f.d); }
  div(f) { return new Fraction(this.n * f.d, this.d * f.n); }
  isZero() { return this.n === 0; }
}

/**
 * Balance a chemical equation string using exact Gaussian elimination
 */
export function balanceChemicalEquation(equationStr) {
  const clean = equationStr.replace(/→/g, '->').replace(/-->/g, '->');
  const sides = clean.split('->');
  if (sides.length !== 2) {
    throw new Error(t('Equation must contain a reaction arrow (->) separating reactants and products.'));
  }

  const reactants = sides[0].split('+').map((s) => s.trim()).filter(Boolean);
  const products = sides[1].split('+').map((s) => s.trim()).filter(Boolean);

  if (!reactants.length || !products.length) {
    throw new Error(t('Please provide both reactants and products.'));
  }

  const parsedReactants = reactants.map(parseFormula);
  const parsedProducts = products.map(parseFormula);

  const allElements = new Set();
  parsedReactants.forEach((p) => Object.keys(p).forEach((e) => allElements.add(e)));
  parsedProducts.forEach((p) => Object.keys(p).forEach((e) => allElements.add(e)));
  const elements = Array.from(allElements);

  const numMolecules = reactants.length + products.length;
  const numElements = elements.length;

  const matrix = elements.map((elem) => {
    const row = [];
    for (let i = 0; i < reactants.length; i++) {
      row.push(new Fraction(parsedReactants[i][elem] || 0));
    }
    for (let i = 0; i < products.length; i++) {
      row.push(new Fraction(-(parsedProducts[i][elem] || 0)));
    }
    return row;
  });

  let lead = 0;
  for (let r = 0; r < numElements; r++) {
    if (lead >= numMolecules - 1) break;
    let i = r;
    while (matrix[i][lead].isZero()) {
      i++;
      if (i === numElements) {
        i = r;
        lead++;
        if (lead === numMolecules - 1) break;
      }
    }
    if (lead === numMolecules - 1) break;

    const temp = matrix[i];
    matrix[i] = matrix[r];
    matrix[r] = temp;

    const val = matrix[r][lead];
    for (let c = 0; c < numMolecules; c++) {
      matrix[r][c] = matrix[r][c].div(val);
    }

    for (let row = 0; row < numElements; row++) {
      if (row !== r) {
        const factor = matrix[row][lead];
        for (let c = 0; c < numMolecules; c++) {
          matrix[row][c] = matrix[row][c].sub(factor.mul(matrix[r][c]));
        }
      }
    }
    lead++;
  }

  const coeffs = new Array(numMolecules).fill(null);
  coeffs[numMolecules - 1] = new Fraction(1);

  for (let r = numElements - 1; r >= 0; r--) {
    let pCol = -1;
    for (let c = 0; c < numMolecules; c++) {
      if (!matrix[r][c].isZero()) {
        pCol = c;
        break;
      }
    }
    if (pCol === -1 || pCol === numMolecules - 1) continue;

    let sum = new Fraction(0);
    for (let c = pCol + 1; c < numMolecules; c++) {
      if (coeffs[c]) sum = sum.add(matrix[r][c].mul(coeffs[c]));
    }
    coeffs[pCol] = new Fraction(0).sub(sum);
  }

  for (let i = 0; i < numMolecules; i++) {
    if (!coeffs[i]) coeffs[i] = new Fraction(1);
  }

  let totalLcm = 1;
  coeffs.forEach((f) => {
    totalLcm = lcm(totalLcm, f.d);
  });

  const intCoeffs = coeffs.map((f) => Math.round((f.n * totalLcm) / f.d));

  // Determine reaction classification
  const reactionType = classifyReaction(reactants, products, intCoeffs);

  // Molar masses
  const reactantDetails = reactants.map((r, i) => ({
    formula: r,
    coeff: intCoeffs[i],
    molarMass: calculateMolarMass(r)
  }));
  const productDetails = products.map((p, i) => ({
    formula: p,
    coeff: intCoeffs[reactants.length + i],
    molarMass: calculateMolarMass(p)
  }));

  const balancedReactants = reactantDetails.map((d) => (d.coeff === 1 ? '' : d.coeff + ' ') + d.formula).join(' + ');
  const balancedProducts = productDetails.map((d) => (d.coeff === 1 ? '' : d.coeff + ' ') + d.formula).join(' + ');
  const balancedString = `${balancedReactants} → ${balancedProducts}`;

  return {
    balancedString,
    reactants: reactantDetails,
    products: productDetails,
    reactionType
  };
}

/** Classify reaction type based on Grade 11-12 curriculum */
function classifyReaction(reactants, products, coeffs) {
  const rCount = reactants.length;
  const pCount = products.length;

  const isElement = (f) => Object.keys(parseFormula(f)).length === 1;

  if (rCount >= 2 && pCount === 1) {
    return {
      type: t('Synthesis / Combination'),
      description: t('Two or more reactants combine to form a single chemical product (A + B → AB).')
    };
  }
  if (rCount === 1 && pCount >= 2) {
    return {
      type: t('Decomposition'),
      description: t('A single compound breaks down into two or more simpler substances (AB → A + B).')
    };
  }
  if (reactants.some((r) => r === 'O2') && products.some((p) => p === 'CO2') && products.some((p) => p === 'H2O')) {
    return {
      type: t('Hydrocarbon Combustion'),
      description: t('Hydrocarbon fuel vigorously oxidizes with O₂ releasing heat, CO₂, and H₂O.')
    };
  }
  if (rCount === 2 && pCount === 2) {
    const rHasElem = reactants.some(isElement);
    const pHasElem = products.some(isElement);
    if (rHasElem && pHasElem) {
      return {
        type: t('Single Replacement'),
        description: t('A more active element displaces an element from a compound (A + BC → AC + B).')
      };
    }
    const hasWater = products.some((p) => p === 'H2O');
    const hasAcid = reactants.some((r) => r.startsWith('H') || r.includes('HCl') || r.includes('HNO3') || r.includes('H2SO4'));
    const hasBase = reactants.some((r) => r.includes('OH'));
    if (hasWater && (hasAcid || hasBase)) {
      return {
        type: t('Acid-Base Neutralization'),
        description: t('An acid reacts with a base yielding a neutral salt and water.')
      };
    }
    return {
      type: t('Double Replacement (Metathesis)'),
      description: t('Positive and negative ions exchange partners to produce an insoluble precipitate, gas, or weak electrolyte.')
    };
  }

  return {
    type: t('Redox Reaction'),
    description: t('Oxidation-reduction process involving formal electron transfer between species.')
  };
}

/** Stamp balanced reaction card onto the active whiteboard canvas */
export function insertReactionCard(app, result) {
  const view = app.surface.cam.viewport(app.surface.width, app.surface.height);
  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;

  const rLines = result.reactants.map((r) => `• ${r.coeff} mol ${r.formula} (${r.molarMass} g/mol)`).join('\n');
  const pLines = result.products.map((p) => `• ${p.coeff} mol ${p.formula} (${p.molarMass} g/mol)`).join('\n');

  const cardText = `⚗️ **${result.balancedString}**\n\n` +
    `**${t('Type')}**: ${result.reactionType.type}\n` +
    `*${result.reactionType.description}*\n\n` +
    `**${t('Reactants')}**:\n${rLines}\n\n` +
    `**${t('Products')}**:\n${pLines}`;

  const note = {
    id: uid('txt'),
    type: 'text',
    x: cx - 180,
    y: cy - 120,
    w: 360,
    h: 220,
    text: cardText,
    size: 16,
    color: '#0f6cbd'
  };

  app.store.add(note, 'insert balanced reaction card');
  app.surface.selection?.clear?.();
  app.surface.selection?.add?.(note.id);
  app.surface.invalidate?.();
  app.toast?.(t('Inserted balanced reaction card to whiteboard.'));
}
