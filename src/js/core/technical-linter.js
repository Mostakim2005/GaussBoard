/**
 * @file technical-linter.js
 * @description Lightweight Offline ESL & Technical Writing Linter (GazBoard Phase 5 / v6.5.0)
 *
 * Implements Document 6 Section 7.2:
 * - Pure JavaScript rule-based linting for engineering notebooks and technical documentation
 * - Detects passive voice constructions, redundant phrases, duplicate words, and common spelling slips
 * - Provides immediate active voice suggestions and concise technical phrasing
 * - 100% offline, zero external background processes, sub-millisecond execution
 */

import { t } from '../i18n.js';

export const REDUNDANT_PHRASES = [
  { match: /\bin order to\b/gi, suggestion: 'to', rule: 'wordiness' },
  { match: /\bdue to the fact that\b/gi, suggestion: 'because', rule: 'wordiness' },
  { match: /\bat this point in time\b/gi, suggestion: 'now', rule: 'wordiness' },
  { match: /\ba large number of\b/gi, suggestion: 'many', rule: 'wordiness' },
  { match: /\bcompletely eliminate\b/gi, suggestion: 'eliminate', rule: 'redundancy' },
  { match: /\bfuture plans\b/gi, suggestion: 'plans', rule: 'redundancy' },
  { match: /\bclose proximity\b/gi, suggestion: 'near', rule: 'redundancy' },
  { match: /\bperiod of time\b/gi, suggestion: 'period', rule: 'redundancy' },
  { match: /\bhas the ability to\b/gi, suggestion: 'can', rule: 'wordiness' },
  { match: /\bprior to\b/gi, suggestion: 'before', rule: 'wordiness' },
  { match: /\bsubsequent to\b/gi, suggestion: 'after', rule: 'wordiness' }
];

export const ACADEMIC_TONE_RULES = [
  { match: /\ba lot of\b/gi, suggestion: 'numerous', rule: 'colloquialism' },
  { match: /\bget\b/gi, suggestion: 'obtain', rule: 'colloquialism' },
  { match: /\bgot\b/gi, suggestion: 'acquired', rule: 'colloquialism' },
  { match: /\blook into\b/gi, suggestion: 'investigate', rule: 'colloquialism' },
  { match: /\bfind out\b/gi, suggestion: 'determine', rule: 'colloquialism' },
  { match: /\bset up\b/gi, suggestion: 'configure', rule: 'colloquialism' },
  { match: /\bbad\b/gi, suggestion: 'detrimental', rule: 'colloquialism' },
  { match: /\bbig\b/gi, suggestion: 'substantial', rule: 'colloquialism' },
  { match: /\bthing\b/gi, suggestion: 'factor', rule: 'colloquialism' },
  { match: /\bthings\b/gi, suggestion: 'aspects', rule: 'colloquialism' }
];

export const GRAMMAR_AGREEMENT_RULES = [
  { match: /\bthe number of\s+([a-zA-Z]+)\s+are\b/gi, suggestion: 'the number of $1 is', rule: 'subject-verb-agreement' },
  { match: /\ba variety of\s+([a-zA-Z]+)\s+is\b/gi, suggestion: 'a variety of $1 are', rule: 'subject-verb-agreement' },
  { match: /\beach of the\s+([a-zA-Z]+)\s+are\b/gi, suggestion: 'each of the $1 is', rule: 'subject-verb-agreement' }
];

export const CITATION_RULES = [
  { match: /\([A-Z][a-z]+,\s*\)/g, rule: 'incomplete-citation', message: 'Incomplete parenthetical citation: missing publication year.' },
  { match: /\([A-Z][a-z]+\s+\d{1,3}\)/g, rule: 'malformed-citation', message: 'Malformed citation: standard academic style requires comma and 4-digit year, e.g. (Author, 2024).' }
];

export const PASSIVE_CONSTRUCTIONS = [
  { match: /\b(?:is|are|was|were|been|being)\s+(?:calculated|measured|observed|determined|analyzed|computed|implemented)\s+by\b/gi, rule: 'passive-voice' }
];

export const COMMON_TYPOS = [
  { match: /\brecieve\b/gi, suggestion: 'receive' },
  { match: /\bseperate\b/gi, suggestion: 'separate' },
  { match: /\boccurance\b/gi, suggestion: 'occurrence' },
  { match: /\bimpedence\b/gi, suggestion: 'impedance' },
  { match: /\bcapacitence\b/gi, suggestion: 'capacitance' },
  { match: /\bresistence\b/gi, suggestion: 'resistance' }
];

/**
 * Identify ranges of code blocks and LaTeX math formulas that must be protected from linter mutation
 * @param {string} text
 * @returns {Array<{start: number, end: number}>}
 */
export function getProtectedRanges(text) {
  if (!text || typeof text !== 'string') return [];
  const ranges = [];
  // 1. Fenced code blocks ```...```
  const fenceRe = /```[\s\S]*?```/g;
  let m;
  while ((m = fenceRe.exec(text)) !== null) {
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  // 2. Inline code `...`
  const inlineCodeRe = /`[^`\n]+`/g;
  while ((m = inlineCodeRe.exec(text)) !== null) {
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  // 3. Display math $$...$$
  const displayMathRe = /\$\$[\s\S]*?\$\$/g;
  while ((m = displayMathRe.exec(text)) !== null) {
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  // 4. Inline math $...$
  const inlineMathRe = /(?<!\$)\$[^$\n]+\$(?!\$)/g;
  while ((m = inlineMathRe.exec(text)) !== null) {
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  return ranges;
}

export function isInsideProtected(index, length, ranges) {
  const end = index + length;
  for (const r of ranges) {
    if (index < r.end && end > r.start) return true;
  }
  return false;
}

export class TechnicalLinter {
  /**
   * Lint a text string and return diagnostic issues
   * @param {string} text
   * @returns {Array<{index: number, length: number, match: string, rule: string, suggestion?: string, message: string}>}
   */
  static lint(text) {
    if (!text || typeof text !== 'string') return [];
    const issues = [];
    const protectedRanges = getProtectedRanges(text);

    // 1. Redundant / Wordy phrases
    for (const item of REDUNDANT_PHRASES) {
      let m;
      const re = new RegExp(item.match.source, item.match.flags);
      while ((m = re.exec(text)) !== null) {
        if (isInsideProtected(m.index, m[0].length, protectedRanges)) continue;
        issues.push({
          index: m.index,
          length: m[0].length,
          match: m[0],
          rule: item.rule,
          suggestion: item.suggestion,
          message: t('Consider replacing "{word}" with "{suggestion}" for concise technical style.', {
            word: m[0],
            suggestion: item.suggestion
          })
        });
      }
    }

    // 2. Passive Voice
    for (const item of PASSIVE_CONSTRUCTIONS) {
      let m;
      const re = new RegExp(item.match.source, item.match.flags);
      while ((m = re.exec(text)) !== null) {
        if (isInsideProtected(m.index, m[0].length, protectedRanges)) continue;
        issues.push({
          index: m.index,
          length: m[0].length,
          match: m[0],
          rule: item.rule,
          message: t('Passive voice detected: "{phrase}". Consider rephrasing with an active subject.', {
            phrase: m[0]
          })
        });
      }
    }

    // 3. Repeated / Duplicate Consecutive Words ("the the")
    const dupRegex = /\b([a-zA-Z]{2,})\s+\1\b/gi;
    let dm;
    while ((dm = dupRegex.exec(text)) !== null) {
      if (isInsideProtected(dm.index, dm[0].length, protectedRanges)) continue;
      issues.push({
        index: dm.index,
        length: dm[0].length,
        match: dm[0],
        rule: 'duplicate-word',
        suggestion: dm[1],
        message: t('Duplicate word "{word}" repeated consecutively.', { word: dm[1] })
      });
    }

    // 4. Common Technical Typos
    for (const item of COMMON_TYPOS) {
      let m;
      const re = new RegExp(item.match.source, item.match.flags);
      while ((m = re.exec(text)) !== null) {
        if (isInsideProtected(m.index, m[0].length, protectedRanges)) continue;
        issues.push({
          index: m.index,
          length: m[0].length,
          match: m[0],
          rule: 'spelling',
          suggestion: item.suggestion,
          message: t('Possible misspelling "{word}". Did you mean "{suggestion}"?', {
            word: m[0],
            suggestion: item.suggestion
          })
        });
      }
    }

    // 5. Academic Tone & Colloquialisms
    for (const item of ACADEMIC_TONE_RULES) {
      let m;
      const re = new RegExp(item.match.source, item.match.flags);
      while ((m = re.exec(text)) !== null) {
        if (isInsideProtected(m.index, m[0].length, protectedRanges)) continue;
        issues.push({
          index: m.index,
          length: m[0].length,
          match: m[0],
          rule: item.rule,
          suggestion: item.suggestion,
          message: t('Colloquial term "{word}". Consider formal academic alternative: "{suggestion}".', {
            word: m[0],
            suggestion: item.suggestion
          })
        });
      }
    }

    // 6. Subject-Verb Agreement
    for (const item of GRAMMAR_AGREEMENT_RULES) {
      let m;
      const re = new RegExp(item.match.source, item.match.flags);
      while ((m = re.exec(text)) !== null) {
        if (isInsideProtected(m.index, m[0].length, protectedRanges)) continue;
        const replacement = m[0].replace(re, item.suggestion);
        issues.push({
          index: m.index,
          length: m[0].length,
          match: m[0],
          rule: item.rule,
          suggestion: replacement,
          message: t('Subject-verb agreement error: "{phrase}". Standard academic usage: "{suggestion}".', {
            phrase: m[0],
            suggestion: replacement
          })
        });
      }
    }

    // 7. Citation Integrity
    for (const item of CITATION_RULES) {
      let m;
      const re = new RegExp(item.match.source, item.match.flags);
      while ((m = re.exec(text)) !== null) {
        if (isInsideProtected(m.index, m[0].length, protectedRanges)) continue;
        issues.push({
          index: m.index,
          length: m[0].length,
          match: m[0],
          rule: item.rule,
          message: item.message
        });
      }
    }

    return issues.sort((a, b) => a.index - b.index);
  }

  /**
   * Format issues into a Markdown report
   * @param {string} originalText
   * @param {Array} issues
   * @returns {string}
   */
  static formatReport(originalText, issues) {
    if (!issues.length) {
      return `### ✍️ ${t('Technical Writing Review')}\n\n✅ ${t('No style or grammatical issues found! Excellent technical clarity.')}`;
    }

    let md = `### ✍️ ${t('Technical Writing Review')} (${issues.length} ${t('suggestions')})\n\n`;
    md += '| # | Context Phrase | Category | Suggestion |\n';
    md += '| :--- | :--- | :--- | :--- |\n';
    issues.forEach((iss, i) => {
      const cat = iss.rule.toUpperCase();
      const sug = iss.suggestion ? `\`${iss.suggestion}\`` : t('Active Voice');
      md += `| ${i + 1} | "${iss.match}" | \`${cat}\` | ${sug} |\n`;
    });
    return md;
  }

  /**
   * Automatically apply all safe suggestions (wordiness, redundancy, typos)
   * @param {string} text
   * @returns {{ text: string, count: number }}
   */
  static fixAll(text) {
    if (!text || typeof text !== 'string') return { text, count: 0 };
    const issues = TechnicalLinter.lint(text).filter((i) => Boolean(i.suggestion));
    if (!issues.length) return { text, count: 0 };

    // Sort descending by index so offsets don't invalidate subsequent edits
    issues.sort((a, b) => b.index - a.index);
    let result = text;
    let count = 0;
    for (const iss of issues) {
      result = result.slice(0, iss.index) + iss.suggestion + result.slice(iss.index + iss.length);
      count++;
    }
    return { text: result, count };
  }

  /**
   * Evaluate Academic Style Score (0-100%) and style diagnostics
   * @param {string} text
   * @returns {{ score: number, rating: string, deductions: Array<{rule: string, penalty: number, count: number, message: string}>, issueCount: number }}
   */
  static evaluateAcademicStyle(text) {
    return calculateAcademicStyleScore(text);
  }

  /**
   * Replace colloquialisms and informal language with formal academic equivalents
   * @param {string} text
   * @returns {string}
   */
  static applyAcademicTone(text) {
    return applyAcademicTone(text);
  }
}

/**
 * Compute an Academic Style Score (0-100%) reflecting tone, conciseness, and precision
 * @param {string} text
 * @returns {{ score: number, rating: string, deductions: Array<{rule: string, penalty: number, count: number, message: string}>, issueCount: number }}
 */
export function calculateAcademicStyleScore(text) {
  if (!text || typeof text !== 'string') return { score: 100, rating: 'Exemplary', deductions: [], issueCount: 0 };
  const issues = TechnicalLinter.lint(text);
  const words = text.trim().match(/\b[a-zA-Z0-9'-]+\b/g) || [];
  if (words.length === 0) return { score: 100, rating: 'Exemplary', deductions: [], issueCount: 0 };

  let score = 100;
  const deductions = [];

  const colloquialCount = issues.filter((i) => i.rule === 'colloquialism').length;
  if (colloquialCount > 0) {
    const penalty = Math.min(30, colloquialCount * 6);
    score -= penalty;
    deductions.push({ rule: 'colloquialism', penalty, count: colloquialCount, message: `${colloquialCount} informal/colloquial terms` });
  }

  const grammarCount = issues.filter((i) => i.rule === 'subject-verb-agreement').length;
  if (grammarCount > 0) {
    const penalty = Math.min(25, grammarCount * 10);
    score -= penalty;
    deductions.push({ rule: 'subject-verb-agreement', penalty, count: grammarCount, message: `${grammarCount} grammatical agreement errors` });
  }

  const passiveCount = issues.filter((i) => i.rule === 'passive-voice').length;
  if (passiveCount > 0) {
    const penalty = Math.min(15, passiveCount * 3);
    score -= penalty;
    deductions.push({ rule: 'passive-voice', penalty, count: passiveCount, message: `${passiveCount} passive constructions` });
  }

  const typoCount = issues.filter((i) => i.rule === 'spelling').length;
  if (typoCount > 0) {
    const penalty = Math.min(20, typoCount * 5);
    score -= penalty;
    deductions.push({ rule: 'spelling', penalty, count: typoCount, message: `${typoCount} spelling errors` });
  }

  const wordinessCount = issues.filter((i) => i.rule === 'wordiness' || i.rule === 'redundancy').length;
  if (wordinessCount > 0) {
    const penalty = Math.min(15, wordinessCount * 3);
    score -= penalty;
    deductions.push({ rule: 'wordiness', penalty, count: wordinessCount, message: `${wordinessCount} wordy or redundant phrases` });
  }

  const citationCount = issues.filter((i) => i.rule === 'incomplete-citation' || i.rule === 'malformed-citation').length;
  if (citationCount > 0) {
    const penalty = Math.min(20, citationCount * 8);
    score -= penalty;
    deductions.push({ rule: 'citation', penalty, count: citationCount, message: `${citationCount} citation integrity issues` });
  }

  score = Math.max(0, Math.min(100, score));
  let rating = 'Exemplary';
  if (score >= 90) rating = 'Exemplary';
  else if (score >= 75) rating = 'Proficient';
  else if (score >= 60) rating = 'Developing';
  else rating = 'Needs Revision';

  return { score, rating, deductions, issueCount: issues.length };
}

/**
 * Replace colloquial and informal expressions with academic equivalents,
 * safely preserving embedded code blocks and KaTeX equations.
 * @param {string} text
 * @returns {string}
 */
export function applyAcademicTone(text) {
  if (!text || typeof text !== 'string') return text;

  // 1. Stash code blocks and KaTeX equations
  const stash = [];
  const placeholderRe = /```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]*?\$\$|(?<!\$)\$[^$\n]+\$(?!\$)/g;
  const clean = text.replace(placeholderRe, (match) => {
    const key = `__PROTECTED_STASH_${stash.length}__`;
    stash.push({ key, match });
    return key;
  });

  // 2. Apply academic tone replacements
  let res = clean;
  for (const item of ACADEMIC_TONE_RULES) {
    res = res.replace(item.match, item.suggestion);
  }

  // 3. Restore equations and code blocks (using callback to avoid '$' pattern substitution)
  for (const { key, match } of stash) {
    res = res.replace(key, () => match);
  }
  return res;
}

/**
 * Estimate syllable count for an English word
 * @param {string} word
 * @returns {number}
 */
export function countSyllables(word) {
  if (!word) return 0;
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]|ed|es|e)$/, '');
  w = w.replace(/^y/, '');
  const matches = w.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Compute Flesch Reading Ease and Flesch-Kincaid Grade Level
 * @param {string} text
 * @returns {{ score: number, grade: number, level: string, words: number, sentences: number, syllables: number }}
 */
export function calculateReadability(text) {
  if (!text || typeof text !== 'string') {
    return { score: 100, grade: 0, level: 'Very Easy', words: 0, sentences: 0, syllables: 0 };
  }
  const words = text.trim().match(/\b[a-zA-Z0-9'-]+\b/g) || [];
  const sentences = text.trim().split(/[.!?]+/).filter((s) => s.trim().length > 0) || [];
  const wCount = words.length;
  const sCount = Math.max(1, sentences.length);
  if (wCount === 0) {
    return { score: 100, grade: 0, level: 'Very Easy', words: 0, sentences: 0, syllables: 0 };
  }

  let totalSyllables = 0;
  for (const w of words) {
    totalSyllables += countSyllables(w);
  }

  // Flesch Reading Ease: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
  const score = Math.max(0, Math.min(100, 206.835 - 1.015 * (wCount / sCount) - 84.6 * (totalSyllables / wCount)));

  // Flesch-Kincaid Grade Level: 0.39*(words/sentences) + 11.8*(syllables/words) - 15.59
  const grade = Math.max(0, 0.39 * (wCount / sCount) + 11.8 * (totalSyllables / wCount) - 15.59);

  let level = 'Standard';
  if (score >= 90) level = 'Very Easy (5th Grade)';
  else if (score >= 80) level = 'Easy (6th Grade)';
  else if (score >= 70) level = 'Fairly Easy (7th Grade)';
  else if (score >= 60) level = 'Standard (8th-9th Grade)';
  else if (score >= 50) level = 'Fairly Difficult (High School)';
  else if (score >= 30) level = 'Difficult (College)';
  else level = 'Very Difficult (Academic/Professional)';

  return {
    score: Math.round(score * 10) / 10,
    grade: Math.round(grade * 10) / 10,
    level,
    words: wCount,
    sentences: sCount,
    syllables: totalSyllables
  };
}

