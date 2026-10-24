/**
 * GazBoard - STEM Formula Relationship Encyclopedia & Interactive Solver
 * Curated knowledge base of Grade 11-12 Physics and Engineering formulas,
 * automatic single-variable algebraic solving, and 1-click whiteboard card generation.
 */

import { t } from '../i18n.js';
import { uid } from './util.js';

export const FORMULA_CATALOG = [
  {
    id: 'kinematics_v',
    category: 'Kinematics',
    name: 'Velocity-Time Relation',
    latex: 'v = u + at',
    variables: ['v', 'u', 'a', 't'],
    units: { v: 'm/s', u: 'm/s', a: 'm/s²', t: 's' },
    solve: (vars) => {
      const { v, u, a, t: time } = vars;
      if (v === undefined && u !== undefined && a !== undefined && time !== undefined) {
        return { target: 'v', value: u + a * time, unit: 'm/s', steps: 'v = u + a·t' };
      }
      if (u === undefined && v !== undefined && a !== undefined && time !== undefined) {
        return { target: 'u', value: v - a * time, unit: 'm/s', steps: 'u = v - a·t' };
      }
      if (a === undefined && v !== undefined && u !== undefined && time !== undefined) {
        return { target: 'a', value: (v - u) / time, unit: 'm/s²', steps: 'a = (v - u) / t' };
      }
      if (time === undefined && v !== undefined && u !== undefined && a !== undefined) {
        return { target: 't', value: (v - u) / a, unit: 's', steps: 't = (v - u) / a' };
      }
      return null;
    }
  },
  {
    id: 'kinematics_s',
    category: 'Kinematics',
    name: 'Displacement-Time Relation',
    latex: 's = ut + \\frac{1}{2}at^2',
    variables: ['s', 'u', 'a', 't'],
    units: { s: 'm', u: 'm/s', a: 'm/s²', t: 's' },
    solve: (vars) => {
      const { s, u, a, t: time } = vars;
      if (s === undefined && u !== undefined && a !== undefined && time !== undefined) {
        return { target: 's', value: u * time + 0.5 * a * time * time, unit: 'm', steps: 's = u·t + 0.5·a·t²' };
      }
      return null;
    }
  },
  {
    id: 'dynamics_newton',
    category: 'Dynamics',
    name: "Newton's Second Law",
    latex: 'F = ma',
    variables: ['F', 'm', 'a'],
    units: { F: 'N', m: 'kg', a: 'm/s²' },
    solve: (vars) => {
      const { F, m, a } = vars;
      if (F === undefined && m !== undefined && a !== undefined) return { target: 'F', value: m * a, unit: 'N', steps: 'F = m · a' };
      if (m === undefined && F !== undefined && a !== undefined) return { target: 'm', value: F / a, unit: 'kg', steps: 'm = F / a' };
      if (a === undefined && F !== undefined && m !== undefined) return { target: 'a', value: F / m, unit: 'm/s²', steps: 'a = F / m' };
      return null;
    }
  },
  {
    id: 'electricity_ohm',
    category: 'Circuits',
    name: "Ohm's Law",
    latex: 'V = IR',
    variables: ['V', 'I', 'R'],
    units: { V: 'V', I: 'A', R: 'Ω' },
    solve: (vars) => {
      const { V, I, R } = vars;
      if (V === undefined && I !== undefined && R !== undefined) return { target: 'V', value: I * R, unit: 'V', steps: 'V = I · R' };
      if (I === undefined && V !== undefined && R !== undefined) return { target: 'I', value: V / R, unit: 'A', steps: 'I = V / R' };
      if (R === undefined && V !== undefined && I !== undefined) return { target: 'R', value: V / I, unit: 'Ω', steps: 'R = V / I' };
      return null;
    }
  },
  {
    id: 'energy_kinetic',
    category: 'Energy',
    name: 'Kinetic Energy',
    latex: 'E_k = \\frac{1}{2}mv^2',
    variables: ['Ek', 'm', 'v'],
    units: { Ek: 'J', m: 'kg', v: 'm/s' },
    solve: (vars) => {
      const { Ek, m, v } = vars;
      if (Ek === undefined && m !== undefined && v !== undefined) return { target: 'Ek', value: 0.5 * m * v * v, unit: 'J', steps: 'Ek = 0.5 · m · v²' };
      if (m === undefined && Ek !== undefined && v !== undefined) return { target: 'm', value: (2 * Ek) / (v * v), unit: 'kg', steps: 'm = 2·Ek / v²' };
      if (v === undefined && Ek !== undefined && m !== undefined) return { target: 'v', value: Math.sqrt((2 * Ek) / m), unit: 'm/s', steps: 'v = √(2·Ek / m)' };
      return null;
    }
  },
  {
    id: 'waves_vfl',
    category: 'Waves',
    name: 'Wave Speed Equation',
    latex: 'v = f\\lambda',
    variables: ['v', 'f', 'lambda'],
    units: { v: 'm/s', f: 'Hz', lambda: 'm' },
    solve: (vars) => {
      const { v, f, lambda } = vars;
      if (v === undefined && f !== undefined && lambda !== undefined) return { target: 'v', value: f * lambda, unit: 'm/s', steps: 'v = f · λ' };
      if (f === undefined && v !== undefined && lambda !== undefined) return { target: 'f', value: v / lambda, unit: 'Hz', steps: 'f = v / λ' };
      if (lambda === undefined && v !== undefined && f !== undefined) return { target: 'lambda', value: v / f, unit: 'm', steps: 'λ = v / f' };
      return null;
    }
  }
];

/** Stamp a formula summary card onto the active canvas */
export function insertFormulaCard(app, formula) {
  const view = app.surface.cam.viewport(app.surface.width, app.surface.height);
  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;

  const cardText = `📐 **${formula.name}** (${formula.category})\n\n` +
    `**Formula**: \`${formula.latex}\`\n\n` +
    `**Variables**:\n` +
    formula.variables.map((v) => `• \`${v}\`: ${formula.units[v] || ''}`).join('\n');

  const note = {
    id: uid('txt'),
    type: 'text',
    x: cx - 140,
    y: cy - 90,
    w: 280,
    h: 180,
    text: cardText,
    size: 15,
    color: '#0f6cbd'
  };

  app.store.add(note, 'insert formula card');
  app.surface.selection?.clear?.();
  app.surface.selection?.add?.(note.id);
  app.surface.invalidate?.();
  app.toast?.(t('Inserted {formula} card to whiteboard.', { formula: formula.name }));
}
