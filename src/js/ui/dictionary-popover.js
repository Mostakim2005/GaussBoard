/**
 * GazBoard - Offline Technical Engineering Dictionary & Pronunciation Popover
 * Curated STEM engineering definitions, IPA phonetics, technical collocations,
 * native zero-download Web Speech TTS, and 1-click whiteboard card stamping.
 */

import { t } from '../i18n.js';
import { uid } from '../core/util.js';

export const DICTIONARY_DATABASE = {
  dielectric: {
    word: 'dielectric',
    ipa: 'ˌdaɪ.ɪˈlɛk.trɪk',
    pos: 'noun',
    def: 'An electrical insulator that can be polarized by an applied electric field, allowing capacitive electrostatic charge storage.',
    collocations: ['dielectric breakdown', 'dielectric constant', 'dielectric loss', 'dielectric strength']
  },
  inductance: {
    word: 'inductance',
    ipa: 'ɪnˈdʌk.təns',
    pos: 'noun',
    def: 'The tendency of an electrical conductor to oppose a change in the electric current flowing through it via induced electromotive force.',
    collocations: ['mutual inductance', 'self-inductance', 'leakage inductance', 'parasitic inductance']
  },
  impedance: {
    word: 'impedance',
    ipa: 'ɪmˈpiː.dəns',
    pos: 'noun',
    def: 'The total opposition that an electrical circuit presents to the alternating current (AC) at a given frequency, given by Z = R + jX.',
    collocations: ['characteristic impedance', 'impedance matching', 'surge impedance', 'input impedance']
  },
  capacitance: {
    word: 'capacitance',
    ipa: 'kəˈpæs.ɪ.təns',
    pos: 'noun',
    def: 'The ratio of the change in an electric charge in a system to the corresponding change in its electric potential (C = Q / V).',
    collocations: ['stray capacitance', 'junction capacitance', 'mutual capacitance']
  },
  stoichiometry: {
    word: 'stoichiometry',
    ipa: 'ˌstɔɪ.kiˈɒm.ɪ.tri',
    pos: 'noun',
    def: 'The calculation of relative quantities of reactants and products in chemical reactions based on the conservation of mass.',
    collocations: ['stoichiometric ratio', 'reaction stoichiometry', 'limiting reagent']
  },
  enthalpy: {
    word: 'enthalpy',
    ipa: 'ˈɛn.θəl.pi',
    pos: 'noun',
    def: 'A thermodynamic quantity equivalent to the total heat content of a system, equal to internal energy plus the product of pressure and volume (H = U + PV).',
    collocations: ['enthalpy of formation', 'bond enthalpy', 'enthalpy change']
  },
  entropy: {
    word: 'entropy',
    ipa: 'ˈɛn.trə.pi',
    pos: 'noun',
    def: 'A measure of the thermal energy per unit temperature unavailable for doing useful work, or the degree of disorder in a system (ΔS ≥ 0).',
    collocations: ['standard entropy', 'entropy generation', 'statistical entropy']
  },
  semiconductor: {
    word: 'semiconductor',
    ipa: 'ˌsɛm.i.kənˈdʌk.tər',
    pos: 'noun',
    def: 'A solid substance that has a conductivity between that of an insulator and that of most metals, due to the addition of impurities or temperature.',
    collocations: ['intrinsic semiconductor', 'extrinsic semiconductor', 'semiconductor bandgap']
  },
  rectifier: {
    word: 'rectifier',
    ipa: 'ˈrɛk.tɪ.faɪ.ər',
    pos: 'noun',
    def: 'An electrical device consisting of one or more diodes that converts alternating current (AC) into direct current (DC).',
    collocations: ['bridge rectifier', 'full-wave rectifier', 'half-wave rectifier']
  },
  resonance: {
    word: 'resonance',
    ipa: 'ˈrɛz.ən.əns',
    pos: 'noun',
    def: 'The phenomenon of increased amplitude that occurs when the frequency of an applied force is equal or close to a natural frequency of the system.',
    collocations: ['resonant frequency', 'parallel resonance', 'LC resonance']
  }
};

export class DictionaryPopover {
  constructor(app) {
    this.app = app;
    this.container = null;
  }

  lookup(word) {
    const clean = (word || '').trim().toLowerCase();
    const entry = DICTIONARY_DATABASE[clean] || {
      word: clean,
      ipa: '',
      pos: 'noun',
      def: t('Technical engineering term. Refer to offline textbook or datasheet.'),
      collocations: []
    };
    return entry;
  }

  show(word, at = null) {
    if (this.container) this.container.remove();

    const entry = this.lookup(word);

    const pop = document.createElement('div');
    pop.className = 'tech-dict-popover';
    pop.innerHTML = `
      <div class="dict-pop-inner">
        <div class="dict-pop-header">
          <div class="dict-pop-term">
            <span class="dict-word">${entry.word}</span>
            ${entry.ipa ? `<span class="dict-ipa">[${entry.ipa}]</span>` : ''}
            <span class="dict-pos">(${entry.pos})</span>
          </div>
          <button class="dict-speak-btn" title="${t('Pronounce (TTS)')}">🔊</button>
          <button class="dict-close-btn" title="${t('Close')}">✕</button>
        </div>
        <div class="dict-pop-body">
          <p class="dict-def">${entry.def}</p>
          ${entry.collocations.length ? `
            <div class="dict-colloc-box">
              <span class="colloc-title">${t('Collocations')}:</span>
              <span class="colloc-list">${entry.collocations.join(', ')}</span>
            </div>
          ` : ''}
        </div>
        <div class="dict-pop-footer">
          <button class="dict-stamp-btn">
            <span>📌</span>
            <span>${t('Insert Definition to Canvas')}</span>
          </button>
        </div>
      </div>
    `;

    pop.querySelector('.dict-close-btn').addEventListener('click', () => this.hide());
    pop.querySelector('.dict-speak-btn').addEventListener('click', () => {
      this.speak(entry.word);
    });
    pop.querySelector('.dict-stamp-btn').addEventListener('click', () => {
      this.stampCard(entry);
    });

    if (at && typeof at.x === 'number' && typeof at.y === 'number') {
      pop.style.left = `${Math.min(window.innerWidth - 320, Math.max(20, at.x))}px`;
      pop.style.top = `${Math.min(window.innerHeight - 240, Math.max(40, at.y))}px`;
    } else {
      pop.style.left = '50%';
      pop.style.top = '25%';
      pop.style.transform = 'translate(-50%, 0)';
    }

    document.body.appendChild(pop);
    this.container = pop;
  }

  hide() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  speak(word) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(word);
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } else {
      this.app.toast?.(t('Web Speech API is not supported in this environment.'));
    }
  }

  stampCard(entry) {
    const view = this.app.surface.cam.viewport(this.app.surface.width, this.app.surface.height);
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;

    const cardText = `📖 **${entry.word}** ${entry.ipa ? `\`[${entry.ipa}]\`` : ''} *(${entry.pos})*\n\n` +
      `${entry.def}\n\n` +
      (entry.collocations.length ? `• **${t('Collocations')}**: ${entry.collocations.join(', ')}` : '');

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

    this.app.store.add(note, 'stamp dictionary card');
    this.app.surface.selection?.clear?.();
    this.app.surface.selection?.add?.(note.id);
    this.app.surface.invalidate?.();
    this.app.toast?.(t('Inserted {word} definition card to whiteboard.', { word: entry.word }));
    this.hide();
  }
}
