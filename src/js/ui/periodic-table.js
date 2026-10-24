/**
 * GazBoard - Interactive Periodic Table Dock & Element Inspector
 * High-density vector SVG/HTML5 grid of all 118 chemical elements (H to Og),
 * category color filters, live search, and 1-click whiteboard element card stamp.
 */

import { t } from '../i18n.js';
import { uid } from '../core/util.js';
import { calculateMolarMass } from '../core/scientific-math.js';

export function getBohrShells(z) {
  if (!z || z <= 0) return [0];
  const shellPresets = {
    1: [1], 2: [2], 3: [2, 1], 4: [2, 2], 5: [2, 3], 6: [2, 4], 7: [2, 5], 8: [2, 6], 9: [2, 7], 10: [2, 8],
    11: [2, 8, 1], 12: [2, 8, 2], 13: [2, 8, 3], 14: [2, 8, 4], 15: [2, 8, 5], 16: [2, 8, 6], 17: [2, 8, 7], 18: [2, 8, 8],
    19: [2, 8, 8, 1], 20: [2, 8, 8, 2], 26: [2, 8, 14, 2], 29: [2, 8, 18, 1], 30: [2, 8, 18, 2],
    47: [2, 8, 18, 18, 1], 79: [2, 8, 18, 32, 18, 1], 80: [2, 8, 18, 32, 18, 2], 82: [2, 8, 18, 32, 18, 4], 92: [2, 8, 18, 32, 21, 9, 2]
  };
  if (shellPresets[z]) return shellPresets[z];
  const capacities = [2, 8, 18, 32, 32, 18, 8];
  const shells = [];
  let remaining = z;
  for (const cap of capacities) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, cap);
    shells.push(take);
    remaining -= take;
  }
  return shells;
}

export const ELEMENTS_DATA = [
  { z: 1, s: 'H', n: 'Hydrogen', w: 1.008, g: 1, p: 1, cat: 'nonmetal', conf: '1s¹', en: 2.20 },
  { z: 2, s: 'He', n: 'Helium', w: 4.003, g: 18, p: 1, cat: 'noble', conf: '1s²', en: null },
  { z: 3, s: 'Li', n: 'Lithium', w: 6.94, g: 1, p: 2, cat: 'alkali', conf: '[He] 2s¹', en: 0.98 },
  { z: 4, s: 'Be', n: 'Beryllium', w: 9.012, g: 2, p: 2, cat: 'alkaline', conf: '[He] 2s²', en: 1.57 },
  { z: 5, s: 'B', n: 'Boron', w: 10.81, g: 13, p: 2, cat: 'metalloid', conf: '[He] 2s² 2p¹', en: 2.04 },
  { z: 6, s: 'C', n: 'Carbon', w: 12.011, g: 14, p: 2, cat: 'nonmetal', conf: '[He] 2s² 2p²', en: 2.55 },
  { z: 7, s: 'N', n: 'Nitrogen', w: 14.007, g: 15, p: 2, cat: 'nonmetal', conf: '[He] 2s² 2p³', en: 3.04 },
  { z: 8, s: 'O', n: 'Oxygen', w: 15.999, g: 16, p: 2, cat: 'nonmetal', conf: '[He] 2s² 2p⁴', en: 3.44 },
  { z: 9, s: 'F', n: 'Fluorine', w: 18.998, g: 17, p: 2, cat: 'halogen', conf: '[He] 2s² 2p⁵', en: 3.98 },
  { z: 10, s: 'Ne', n: 'Neon', w: 20.180, g: 18, p: 2, cat: 'noble', conf: '[He] 2s² 2p⁶', en: null },
  { z: 11, s: 'Na', n: 'Sodium', w: 22.990, g: 1, p: 3, cat: 'alkali', conf: '[Ne] 3s¹', en: 0.93 },
  { z: 12, s: 'Mg', n: 'Magnesium', w: 24.305, g: 2, p: 3, cat: 'alkaline', conf: '[Ne] 3s²', en: 1.31 },
  { z: 13, s: 'Al', n: 'Aluminium', w: 26.982, g: 13, p: 3, cat: 'post-transition', conf: '[Ne] 3s² 3p¹', en: 1.61 },
  { z: 14, s: 'Si', n: 'Silicon', w: 28.085, g: 14, p: 3, cat: 'metalloid', conf: '[Ne] 3s² 3p²', en: 1.90 },
  { z: 15, s: 'P', n: 'Phosphorus', w: 30.974, g: 15, p: 3, cat: 'nonmetal', conf: '[Ne] 3s² 3p³', en: 2.19 },
  { z: 16, s: 'S', n: 'Sulfur', w: 32.06, g: 16, p: 3, cat: 'nonmetal', conf: '[Ne] 3s² 3p⁴', en: 2.58 },
  { z: 17, s: 'Cl', n: 'Chlorine', w: 35.45, g: 17, p: 3, cat: 'halogen', conf: '[Ne] 3s² 3p⁵', en: 3.16 },
  { z: 18, s: 'Ar', n: 'Argon', w: 39.948, g: 18, p: 3, cat: 'noble', conf: '[Ne] 3s² 3p⁶', en: null },
  { z: 19, s: 'K', n: 'Potassium', w: 39.098, g: 1, p: 4, cat: 'alkali', conf: '[Ar] 4s¹', en: 0.82 },
  { z: 20, s: 'Ca', n: 'Calcium', w: 40.078, g: 2, p: 4, cat: 'alkaline', conf: '[Ar] 4s²', en: 1.00 },
  { z: 21, s: 'Sc', n: 'Scandium', w: 44.956, g: 3, p: 4, cat: 'transition', conf: '[Ar] 3d¹ 4s²', en: 1.36 },
  { z: 22, s: 'Ti', n: 'Titanium', w: 47.867, g: 4, p: 4, cat: 'transition', conf: '[Ar] 3d² 4s²', en: 1.54 },
  { z: 23, s: 'V', n: 'Vanadium', w: 50.942, g: 5, p: 4, cat: 'transition', conf: '[Ar] 3d³ 4s²', en: 1.63 },
  { z: 24, s: 'Cr', n: 'Chromium', w: 51.996, g: 6, p: 4, cat: 'transition', conf: '[Ar] 3d⁵ 4s¹', en: 1.66 },
  { z: 25, s: 'Mn', n: 'Manganese', w: 54.938, g: 7, p: 4, cat: 'transition', conf: '[Ar] 3d⁵ 4s²', en: 1.55 },
  { z: 26, s: 'Fe', n: 'Iron', w: 55.845, g: 8, p: 4, cat: 'transition', conf: '[Ar] 3d⁶ 4s²', en: 1.83 },
  { z: 27, s: 'Co', n: 'Cobalt', w: 58.933, g: 9, p: 4, cat: 'transition', conf: '[Ar] 3d⁷ 4s²', en: 1.88 },
  { z: 28, s: 'Ni', n: 'Nickel', w: 58.693, g: 10, p: 4, cat: 'transition', conf: '[Ar] 3d⁸ 4s²', en: 1.91 },
  { z: 29, s: 'Cu', n: 'Copper', w: 63.546, g: 11, p: 4, cat: 'transition', conf: '[Ar] 3d¹⁰ 4s¹', en: 1.90 },
  { z: 30, s: 'Zn', n: 'Zinc', w: 65.38, g: 12, p: 4, cat: 'transition', conf: '[Ar] 3d¹⁰ 4s²', en: 1.65 },
  { z: 31, s: 'Ga', n: 'Gallium', w: 69.723, g: 13, p: 4, cat: 'post-transition', conf: '[Ar] 3d¹⁰ 4s² 4p¹', en: 1.81 },
  { z: 32, s: 'Ge', n: 'Germanium', w: 72.630, g: 14, p: 4, cat: 'metalloid', conf: '[Ar] 3d¹⁰ 4s² 4p²', en: 2.01 },
  { z: 33, s: 'As', n: 'Arsenic', w: 74.922, g: 15, p: 4, cat: 'metalloid', conf: '[Ar] 3d¹⁰ 4s² 4p³', en: 2.18 },
  { z: 34, s: 'Se', n: 'Selenium', w: 78.971, g: 16, p: 4, cat: 'nonmetal', conf: '[Ar] 3d¹⁰ 4s² 4p⁴', en: 2.55 },
  { z: 35, s: 'Br', n: 'Bromine', w: 79.904, g: 17, p: 4, cat: 'halogen', conf: '[Ar] 3d¹⁰ 4s² 4p⁵', en: 2.96 },
  { z: 36, s: 'Kr', n: 'Krypton', w: 83.798, g: 18, p: 4, cat: 'noble', conf: '[Ar] 3d¹⁰ 4s² 4p⁶', en: 3.00 },
  { z: 37, s: 'Rb', n: 'Rubidium', w: 85.468, g: 1, p: 5, cat: 'alkali', conf: '[Kr] 5s¹', en: 0.82 },
  { z: 38, s: 'Sr', n: 'Strontium', w: 87.62, g: 2, p: 5, cat: 'alkaline', conf: '[Kr] 5s²', en: 0.95 },
  { z: 39, s: 'Y', n: 'Yttrium', w: 88.906, g: 3, p: 5, cat: 'transition', conf: '[Kr] 4d¹ 5s²', en: 1.22 },
  { z: 40, s: 'Zr', n: 'Zirconium', w: 91.224, g: 4, p: 5, cat: 'transition', conf: '[Kr] 4d² 5s²', en: 1.33 },
  { z: 41, s: 'Nb', n: 'Niobium', w: 92.906, g: 5, p: 5, cat: 'transition', conf: '[Kr] 4d⁴ 5s¹', en: 1.6 },
  { z: 42, s: 'Mo', n: 'Molybdenum', w: 95.95, g: 6, p: 5, cat: 'transition', conf: '[Kr] 4d⁵ 5s¹', en: 2.16 },
  { z: 43, s: 'Tc', n: 'Technetium', w: 98.0, g: 7, p: 5, cat: 'transition', conf: '[Kr] 4d⁵ 5s²', en: 1.9 },
  { z: 44, s: 'Ru', n: 'Ruthenium', w: 101.07, g: 8, p: 5, cat: 'transition', conf: '[Kr] 4d⁷ 5s¹', en: 2.2 },
  { z: 45, s: 'Rh', n: 'Rhodium', w: 102.91, g: 9, p: 5, cat: 'transition', conf: '[Kr] 4d⁸ 5s¹,', en: 2.28 },
  { z: 46, s: 'Pd', n: 'Palladium', w: 106.42, g: 10, p: 5, cat: 'transition', conf: '[Kr] 4d¹⁰', en: 2.20 },
  { z: 47, s: 'Ag', n: 'Silver', w: 107.87, g: 11, p: 5, cat: 'transition', conf: '[Kr] 4d¹⁰ 5s¹', en: 1.93 },
  { z: 48, s: 'Cd', n: 'Cadmium', w: 112.41, g: 12, p: 5, cat: 'transition', conf: '[Kr] 4d¹⁰ 5s²', en: 1.69 },
  { z: 49, s: 'In', n: 'Indium', w: 114.82, g: 13, p: 5, cat: 'post-transition', conf: '[Kr] 4d¹⁰ 5s² 5p¹', en: 1.78 },
  { z: 50, s: 'Sn', n: 'Tin', w: 118.71, g: 14, p: 5, cat: 'post-transition', conf: '[Kr] 4d¹⁰ 5s² 5p²', en: 1.96 },
  { z: 51, s: 'Sb', n: 'Antimony', w: 121.76, g: 15, p: 5, cat: 'metalloid', conf: '[Kr] 4d¹⁰ 5s² 5p³', en: 2.05 },
  { z: 52, s: 'Te', n: 'Tellurium', w: 127.60, g: 16, p: 5, cat: 'metalloid', conf: '[Kr] 4d¹⁰ 5s² 5p⁴', en: 2.1 },
  { z: 53, s: 'I', n: 'Iodine', w: 126.90, g: 17, p: 5, cat: 'halogen', conf: '[Kr] 4d¹⁰ 5s² 5p⁵', en: 2.66 },
  { z: 54, s: 'Xe', n: 'Xenon', w: 131.29, g: 18, p: 5, cat: 'noble', conf: '[Kr] 4d¹⁰ 5s² 5p⁶', en: 2.6 },
  { z: 55, s: 'Cs', n: 'Caesium', w: 132.91, g: 1, p: 6, cat: 'alkali', conf: '[Xe] 6s¹', en: 0.79 },
  { z: 56, s: 'Ba', n: 'Barium', w: 137.33, g: 2, p: 6, cat: 'alkaline', conf: '[Xe] 6s²', en: 0.89 },
  { z: 57, s: 'La', n: 'Lanthanum', w: 138.91, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 5d¹ 6s²', en: 1.10 },
  { z: 58, s: 'Ce', n: 'Cerium', w: 140.12, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f¹ 5d¹ 6s²', en: 1.12 },
  { z: 59, s: 'Pr', n: 'Praseodymium', w: 140.91, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f³ 6s²', en: 1.13 },
  { z: 60, s: 'Nd', n: 'Neodymium', w: 144.24, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f⁴ 6s²', en: 1.14 },
  { z: 61, s: 'Pm', n: 'Promethium', w: 145.0, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f⁵ 6s²', en: 1.13 },
  { z: 62, s: 'Sm', n: 'Samarium', w: 150.36, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f⁶ 6s²', en: 1.17 },
  { z: 63, s: 'Eu', n: 'Europium', w: 151.96, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f⁷ 6s²', en: 1.2 },
  { z: 64, s: 'Gd', n: 'Gadolinium', w: 157.25, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f⁷ 5d¹ 6s²', en: 1.20 },
  { z: 65, s: 'Tb', n: 'Terbium', w: 158.93, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f⁹ 6s²', en: 1.2 },
  { z: 66, s: 'Dy', n: 'Dysprosium', w: 162.50, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f¹⁰ 6s²', en: 1.22 },
  { z: 67, s: 'Ho', n: 'Holmium', w: 164.93, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f¹¹ 6s²', en: 1.23 },
  { z: 68, s: 'Er', n: 'Erbium', w: 167.26, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f¹² 6s²', en: 1.24 },
  { z: 69, s: 'Tm', n: 'Thulium', w: 168.93, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f¹³ 6s²', en: 1.25 },
  { z: 70, s: 'Yb', n: 'Ytterbium', w: 173.05, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f¹⁴ 6s²', en: 1.1 },
  { z: 71, s: 'Lu', n: 'Lutetium', w: 174.97, g: 3, p: 6, cat: 'lanthanide', conf: '[Xe] 4f¹⁴ 5d¹ 6s²', en: 1.27 },
  { z: 72, s: 'Hf', n: 'Hafnium', w: 178.49, g: 4, p: 6, cat: 'transition', conf: '[Xe] 4f¹⁴ 5d² 6s²', en: 1.3 },
  { z: 73, s: 'Ta', n: 'Tantalum', w: 180.95, g: 5, p: 6, cat: 'transition', conf: '[Xe] 4f¹⁴ 5d³ 6s²', en: 1.5 },
  { z: 74, s: 'W', n: 'Tungsten', w: 183.84, g: 6, p: 6, cat: 'transition', conf: '[Xe] 4f¹⁴ 5d⁴ 6s²', en: 2.36 },
  { z: 75, s: 'Re', n: 'Rhenium', w: 186.21, g: 7, p: 6, cat: 'transition', conf: '[Xe] 4f¹⁴ 5d⁵ 6s²', en: 1.9 },
  { z: 76, s: 'Os', n: 'Osmium', w: 190.23, g: 8, p: 6, cat: 'transition', conf: '[Xe] 4f¹⁴ 5d⁶ 6s²', en: 2.2 },
  { z: 77, s: 'Ir', n: 'Iridium', w: 192.22, g: 9, p: 6, cat: 'transition', conf: '[Xe] 4f¹⁴ 5d⁷ 6s²', en: 2.20 },
  { z: 78, s: 'Pt', n: 'Platinum', w: 195.08, g: 10, p: 6, cat: 'transition', conf: '[Xe] 4f¹⁴ 5d⁹ 6s¹', en: 2.28 },
  { z: 79, s: 'Au', n: 'Gold', w: 196.97, g: 11, p: 6, cat: 'transition', conf: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', en: 2.54 },
  { z: 80, s: 'Hg', n: 'Mercury', w: 200.59, g: 12, p: 6, cat: 'transition', conf: '[Xe] 4f¹⁴ 5d¹⁰ 6s²', en: 2.00 },
  { z: 81, s: 'Tl', n: 'Thallium', w: 204.38, g: 13, p: 6, cat: 'post-transition', conf: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹', en: 1.62 },
  { z: 82, s: 'Pb', n: 'Lead', w: 207.2, g: 14, p: 6, cat: 'post-transition', conf: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', en: 2.33 },
  { z: 83, s: 'Bi', n: 'Bismuth', w: 208.98, g: 15, p: 6, cat: 'post-transition', conf: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³', en: 2.02 },
  { z: 84, s: 'Po', n: 'Polonium', w: 209.0, g: 16, p: 6, cat: 'post-transition', conf: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴', en: 2.0 },
  { z: 85, s: 'At', n: 'Astatine', w: 210.0, g: 17, p: 6, cat: 'halogen', conf: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵', en: 2.2 },
  { z: 86, s: 'Rn', n: 'Radon', w: 222.0, g: 18, p: 6, cat: 'noble', conf: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶', en: 2.2 },
  { z: 87, s: 'Fr', n: 'Francium', w: 223.0, g: 1, p: 7, cat: 'alkali', conf: '[Rn] 7s¹', en: 0.7 },
  { z: 88, s: 'Ra', n: 'Radium', w: 226.0, g: 2, p: 7, cat: 'alkaline', conf: '[Rn] 7s²', en: 0.9 },
  { z: 89, s: 'Ac', n: 'Actinium', w: 227.0, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 6d¹ 7s²', en: 1.1 },
  { z: 90, s: 'Th', n: 'Thorium', w: 232.04, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 6d² 7s²', en: 1.3 },
  { z: 91, s: 'Pa', n: 'Protactinium', w: 231.04, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f² 6d¹ 7s²', en: 1.5 },
  { z: 92, s: 'U', n: 'Uranium', w: 238.03, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f³ 6d¹ 7s²', en: 1.38 },
  { z: 93, s: 'Np', n: 'Neptunium', w: 237.0, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f⁴ 6d¹ 7s²', en: 1.36 },
  { z: 94, s: 'Pu', n: 'Plutonium', w: 244.0, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f⁶ 7s²', en: 1.28 },
  { z: 95, s: 'Am', n: 'Americium', w: 243.0, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f⁷ 7s²', en: 1.3 },
  { z: 96, s: 'Cm', n: 'Curium', w: 247.0, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f⁷ 6d¹ 7s²', en: 1.3 },
  { z: 97, s: 'Bk', n: 'Berkelium', w: 247.0, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f⁹ 7s²', en: 1.3 },
  { z: 98, s: 'Cf', n: 'Californium', w: 251.0, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f¹⁰ 7s²', en: 1.3 },
  { z: 99, s: 'Es', n: 'Einsteinium', w: 252.0, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f¹¹ 7s²', en: 1.3 },
  { z: 100, s: 'Fm', n: 'Fermium', w: 257.0, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f¹² 7s²', en: 1.3 },
  { z: 101, s: 'Md', n: 'Mendelevium', w: 258.0, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f¹³ 7s²', en: 1.3 },
  { z: 102, s: 'No', n: 'Nobelium', w: 259.0, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f¹⁴ 7s²', en: 1.3 },
  { z: 103, s: 'Lr', n: 'Lawrencium', w: 266.0, g: 3, p: 7, cat: 'actinide', conf: '[Rn] 5f¹⁴ 7s² 7p¹', en: 1.3 },
  { z: 104, s: 'Rf', n: 'Rutherfordium', w: 267.0, g: 4, p: 7, cat: 'transition', conf: '[Rn] 5f¹⁴ 6d² 7s²', en: null },
  { z: 105, s: 'Db', n: 'Dubnium', w: 268.0, g: 5, p: 7, cat: 'transition', conf: '[Rn] 5f¹⁴ 6d³ 7s²', en: null },
  { z: 106, s: 'Sg', n: 'Seaborgium', w: 269.0, g: 6, p: 7, cat: 'transition', conf: '[Rn] 5f¹⁴ 6d⁴ 7s²', en: null },
  { z: 107, s: 'Bh', n: 'Bohrium', w: 270.0, g: 7, p: 7, cat: 'transition', conf: '[Rn] 5f¹⁴ 6d⁵ 7s²', en: null },
  { z: 108, s: 'Hs', n: 'Hassium', w: 269.0, g: 8, p: 7, cat: 'transition', conf: '[Rn] 5f¹⁴ 6d⁶ 7s²', en: null },
  { z: 109, s: 'Mt', n: 'Meitnerium', w: 278.0, g: 9, p: 7, cat: 'transition', conf: '[Rn] 5f¹⁴ 6d⁷ 7s²', en: null },
  { z: 110, s: 'Ds', n: 'Darmstadtium', w: 281.0, g: 10, p: 7, cat: 'transition', conf: '[Rn] 5f¹⁴ 6d⁸ 7s²', en: null },
  { z: 111, s: 'Rg', n: 'Roentgenium', w: 282.0, g: 11, p: 7, cat: 'transition', conf: '[Rn] 5f¹⁴ 6d⁹ 7s²', en: null },
  { z: 112, s: 'Cn', n: 'Copernicium', w: 285.0, g: 12, p: 7, cat: 'transition', conf: '[Rn] 5f¹⁴ 6d¹⁰ 7s²', en: null },
  { z: 113, s: 'Nh', n: 'Nihonium', w: 286.0, g: 13, p: 7, cat: 'post-transition', conf: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹', en: null },
  { z: 114, s: 'Fl', n: 'Flerovium', w: 289.0, g: 14, p: 7, cat: 'post-transition', conf: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²', en: null },
  { z: 115, s: 'Mc', n: 'Moscovium', w: 290.0, g: 15, p: 7, cat: 'post-transition', conf: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³', en: null },
  { z: 116, s: 'Lv', n: 'Livermorium', w: 293.0, g: 16, p: 7, cat: 'post-transition', conf: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴', en: null },
  { z: 117, s: 'Ts', n: 'Tennessine', w: 294.0, g: 17, p: 7, cat: 'halogen', conf: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵', en: null },
  { z: 118, s: 'Og', n: 'Oganesson', w: 294.0, g: 18, p: 7, cat: 'noble', conf: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶', en: null }
];

export class PeriodicTableModal {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.selectedElement = ELEMENTS_DATA.find((e) => e.s === 'Fe') || ELEMENTS_DATA[0];
  }

  show() {
    if (this.container) this.container.remove();

    const overlay = document.createElement('div');
    overlay.className = 'periodic-table-modal-overlay';
    overlay.innerHTML = `
      <div class="periodic-modal-card">
        <div class="periodic-modal-header">
          <div class="periodic-modal-title">
            <span class="modal-icon">🧪</span>
            <span>${t('Interactive Periodic Table of Elements')}</span>
          </div>
          <button class="periodic-modal-close" title="${t('Close (Esc)')}">✕</button>
        </div>
        <div class="periodic-modal-toolbar">
          <input type="text" class="periodic-search-input" placeholder="${t('Search element by symbol, name, or number (e.g. Fe, Iron, 26)...')}">
          <div class="periodic-legend">
            <span class="cat-pill alkali">Alkali</span>
            <span class="cat-pill alkaline">Alkaline</span>
            <span class="cat-pill transition">Transition</span>
            <span class="cat-pill metalloid">Metalloid</span>
            <span class="cat-pill nonmetal">Nonmetal</span>
            <span class="cat-pill halogen">Halogen</span>
            <span class="cat-pill noble">Noble Gas</span>
          </div>
        </div>
        <div class="periodic-modal-content">
          <div class="periodic-grid-container">
            <!-- Dynamic elements grid rendered here -->
          </div>
          <div class="periodic-inspector-pane">
            <!-- Selected element inspector rendered here -->
          </div>
        </div>
      </div>
    `;

    overlay.querySelector('.periodic-modal-close').addEventListener('click', () => this.hide());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hide();
    });

    const searchInput = overlay.querySelector('.periodic-search-input');
    searchInput.addEventListener('input', (e) => {
      this.filterElements(e.target.value.trim().toLowerCase());
    });

    document.body.appendChild(overlay);
    this.container = overlay;

    this.renderGrid(ELEMENTS_DATA);
    this.renderInspector(this.selectedElement);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        this.hide();
        window.removeEventListener('keydown', onKey);
      }
    };
    window.addEventListener('keydown', onKey);
  }

  hide() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  renderGrid(elements) {
    const grid = this.container?.querySelector('.periodic-grid-container');
    if (!grid) return;
    grid.innerHTML = '';

    elements.forEach((el) => {
      const cell = document.createElement('div');
      cell.className = `element-cell ${el.cat} ${this.selectedElement.z === el.z ? 'selected' : ''}`;
      cell.innerHTML = `
        <span class="elem-z">${el.z}</span>
        <span class="elem-symbol">${el.s}</span>
        <span class="elem-name">${el.n}</span>
      `;
      cell.addEventListener('click', () => {
        this.selectedElement = el;
        grid.querySelectorAll('.element-cell').forEach((c) => c.classList.remove('selected'));
        cell.classList.add('selected');
        this.renderInspector(el);
      });
      grid.appendChild(cell);
    });
  }

  renderInspector(el) {
    const pane = this.container?.querySelector('.periodic-inspector-pane');
    if (!pane || !el) return;

    const shells = getBohrShells(el.z);
    const shellsStr = shells.join(', ');

    // Generate concentric Bohr SVG rings
    const svgRings = shells.map((cnt, idx) => {
      const r = 18 + (idx + 1) * 12;
      return `<circle cx="100" cy="80" r="${r}" fill="none" stroke="rgba(56,189,248,0.3)" stroke-width="1" stroke-dasharray="2,2"/>`;
    }).join('');

    pane.innerHTML = `
      <div class="inspector-badge ${el.cat}">
        <div class="inspector-z">${el.z}</div>
        <div class="inspector-symbol">${el.s}</div>
        <div class="inspector-name">${el.n}</div>
        <div class="inspector-weight">${el.w} u</div>
      </div>
      <div class="inspector-details">
        <div class="detail-row"><span>${t('Category')}:</span><strong>${el.cat}</strong></div>
        <div class="detail-row"><span>${t('Configuration')}:</span><strong>${el.conf}</strong></div>
        <div class="detail-row"><span>${t('Bohr Shells')}:</span><strong style="color:#38bdf8;">${shellsStr}</strong></div>
        <div class="detail-row"><span>${t('Electronegativity')}:</span><strong>${el.en !== null ? el.en : '—'}</strong></div>
        <div class="detail-row"><span>${t('Group / Period')}:</span><strong>Group ${el.g}, Period ${el.p}</strong></div>
      </div>

      <div class="bohr-diagram-box" style="text-align:center;margin:8px 0;background:rgba(0,0,0,0.25);border-radius:8px;padding:4px;">
        <svg viewBox="0 0 200 160" width="100%" height="90">
          ${svgRings}
          <circle cx="100" cy="80" r="12" fill="#38bdf8"/>
          <text x="100" y="84" text-anchor="middle" font-size="10" font-weight="bold" fill="#0f172a">${el.s}</text>
        </svg>
      </div>

      <button class="stamp-elem-btn">
        <span>📌</span>
        <span>${t('Insert Element Tile to Canvas')}</span>
      </button>

      <div class="molar-calc-box" style="margin-top:10px;padding:10px;background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
        <h5 style="margin:0 0 6px 0;font-size:12px;color:#38bdf8;">⚗️ ${t('Formula Molar Mass Calculator')}</h5>
        <div style="display:flex;gap:4px;">
          <input type="text" class="molar-input" placeholder="${t('e.g. H2SO4, Ca(OH)2...')}" value="${el.s}2O" style="flex:1;background:#1e293b;border:1px solid #475569;border-radius:4px;color:#fff;padding:4px 8px;font-size:12px;">
          <button class="molar-calc-btn" style="background:#0284c7;color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-weight:bold;">${t('Calc')}</button>
        </div>
        <div class="molar-result" style="font-size:12px;color:#10b981;margin-top:6px;min-height:18px;"></div>
      </div>
    `;

    pane.querySelector('.stamp-elem-btn').addEventListener('click', () => {
      this.stampElementCard(el);
    });

    const molarInput = pane.querySelector('.molar-input');
    const molarBtn = pane.querySelector('.molar-calc-btn');
    const molarResult = pane.querySelector('.molar-result');

    const runMolarCalc = () => {
      const val = molarInput.value.trim();
      const res = calculateMolarMass(val);
      if (res.ok) {
        molarResult.innerHTML = `<b>${res.molarMass} g/mol</b> &bull; ${res.composition.slice(0, 3).map((c) => `${c.elem}:${c.percent}%`).join(' ')}`;
      } else {
        molarResult.innerHTML = `<span style="color:#ef4444;">${res.error || t('Invalid formula')}</span>`;
      }
    };

    molarBtn.addEventListener('click', runMolarCalc);
    molarInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runMolarCalc();
    });
    runMolarCalc();
  }

  stampElementCard(el) {
    const cam = this.app.surface?.cam;
    const sw = this.app.surface?.width || 800;
    const sh = this.app.surface?.height || 600;
    const view = (cam && typeof cam.viewport === 'function')
      ? cam.viewport(sw, sh)
      : (cam?.viewport && typeof cam.viewport.x === 'number' ? cam.viewport : { x: 200, y: 200, w: sw, h: sh });
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;

    const cardText = `🧪 **${el.n} (${el.s})** — Atomic #${el.z}\n\n` +
      `• **${t('Atomic Weight')}**: ${el.w} g/mol\n` +
      `• **${t('Series')}**: ${el.cat}\n` +
      `• **${t('Electron Config')}**: \`${el.conf}\`\n` +
      `• **${t('Electronegativity')}**: ${el.en !== null ? el.en : 'N/A'}\n` +
      `• **${t('Position')}**: Group ${el.g}, Period ${el.p}`;

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

    this.app.store.add(note, 'stamp element card');
    this.app.surface.selection?.clear?.();
    this.app.surface.selection?.add?.(note.id);
    this.app.surface.invalidate?.();
    this.app.toast?.(t('Inserted {element} element card to whiteboard.', { element: el.n }));
    this.hide();
  }

  filterElements(query) {
    if (!query) {
      this.renderGrid(ELEMENTS_DATA);
      return;
    }
    const filtered = ELEMENTS_DATA.filter((e) =>
      e.s.toLowerCase().includes(query) ||
      e.n.toLowerCase().includes(query) ||
      String(e.z).includes(query) ||
      e.cat.toLowerCase().includes(query)
    );
    this.renderGrid(filtered);
  }
}
