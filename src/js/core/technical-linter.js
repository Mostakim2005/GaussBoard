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

export class TechnicalLinter {
  /**
   * Lint a text string and return diagnostic issues
   * @param {string} text
   * @returns {Array<{index: number, length: number, match: string, rule: string, suggestion?: string, message: string}>}
   */
  static lint(text) {
    if (!text || typeof text !== 'string') return [];
    const issues = [];

    // 1. Redundant / Wordy phrases
    for (const item of REDUNDANT_PHRASES) {
      let m;
      const re = new RegExp(item.match.source, item.match.flags);
      while ((m = re.exec(text)) !== null) {
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
}
