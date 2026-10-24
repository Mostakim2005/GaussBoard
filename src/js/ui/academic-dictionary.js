/**
 * @file academic-dictionary.js
 * @description Offline WordNet Academic Lexicon & Thesaurus Modal (GazBoard Phase 8 / v6.8.0)
 *
 * Implements:
 * - Comprehensive Academic Word List (AWL) and STEM vocabulary database
 * - Rich lexical metadata: Definition, Part of Speech, IPA Phonetics, Synonyms, Antonyms, Collocations, Example Sentences
 * - 1-click Web Speech API audio pronunciation
 * - Interactive Thesaurus chip navigation (click any synonym/antonym to lookup immediately)
 * - 1-click Whiteboard Definition Card stamping
 * - Sublist and Part-of-Speech filtering
 */

import { t } from '../i18n.js';
import { uid } from '../core/util.js';

export const ACADEMIC_LEXICON = {
  analyze: {
    word: 'analyze',
    ipa: 'ˈæn.ə.laɪz',
    pos: 'verb',
    sublist: 1,
    def: 'To examine methodically and in detail the constitution or structure of an item, typically for purposes of explanation and interpretation.',
    synonyms: ['examine', 'investigate', 'evaluate', 'scrutinize', 'dissect'],
    antonyms: ['synthesize', 'assemble', 'ignore'],
    collocations: ['analyze data', 'critical analysis', 'statistically analyze', 'analyze trends'],
    example: 'Researchers analyze the collected sensor data to detect subtle thermodynamic fluctuations.'
  },
  approach: {
    word: 'approach',
    ipa: 'əˈproʊtʃ',
    pos: 'noun',
    sublist: 1,
    def: 'A way of dealing with something, or a methodical conceptual strategy adopted for problem-solving.',
    synonyms: ['methodology', 'strategy', 'technique', 'procedure'],
    antonyms: ['departure', 'retreat', 'avoidance'],
    collocations: ['empirical approach', 'novel approach', 'interdisciplinary approach', 'systematic approach'],
    example: 'The team adopted a rigorous algorithmic approach to solve the non-linear circuit equations.'
  },
  assess: {
    word: 'assess',
    ipa: 'əˈsɛs',
    pos: 'verb',
    sublist: 1,
    def: 'To evaluate or estimate the nature, ability, value, or quality of a phenomenon or experimental variable.',
    synonyms: ['appraise', 'evaluate', 'judge', 'gauge', 'quantify'],
    antonyms: ['neglect', 'disregard'],
    collocations: ['assess impact', 'assess viability', 'quantitatively assess', 'assess risk'],
    example: 'Engineers assessed the structural integrity of the composite beam under cyclic shear loading.'
  },
  assume: {
    word: 'assume',
    ipa: 'əˈsuːm',
    pos: 'verb',
    sublist: 1,
    def: 'To suppose to be the case, without proof, as a working theoretical postulate or initial hypothesis.',
    synonyms: ['postulate', 'presume', 'hypothesize', 'suppose'],
    antonyms: ['verify', 'prove', 'demonstrate'],
    collocations: ['safely assume', 'assume constancy', 'working assumption', 'implicit assumption'],
    example: 'In laminar flow regimes, we assume that fluid viscosity remains homogeneous across the channel.'
  },
  authority: {
    word: 'authority',
    ipa: 'əˈθɔːr.ə.ti',
    pos: 'noun',
    sublist: 1,
    def: 'The power or right to give orders, or a recognized expert source of scholarly and scientific credibility.',
    synonyms: ['jurisdiction', 'specialist', 'expert', 'preeminence'],
    antonyms: ['amateur', 'subordinate'],
    collocations: ['recognized authority', 'statutory authority', 'cite authority', 'lead authority'],
    example: 'The journal is regarded as the definitive authority on semiconductor solid-state physics.'
  },
  benefit: {
    word: 'benefit',
    ipa: 'ˈbɛn.ə.fɪt',
    pos: 'noun',
    sublist: 1,
    def: 'An advantage or profit gained from something, or a positive functional outcome of an engineering intervention.',
    synonyms: ['advantage', 'merit', 'asset', 'gain'],
    antonyms: ['detriment', 'disadvantage', 'drawback'],
    collocations: ['mutual benefit', 'therapeutic benefit', 'cost-benefit analysis', 'tangible benefit'],
    example: 'A primary benefit of gallium nitride transistors is superior efficiency at radio frequencies.'
  },
  concept: {
    word: 'concept',
    ipa: 'ˈkɒn.sɛpt',
    pos: 'noun',
    sublist: 1,
    def: 'An abstract idea or general notion conceived in the mind to represent observed reality.',
    synonyms: ['notion', 'theory', 'paradigm', 'hypothesis', 'construct'],
    antonyms: ['concreteness', 'entity'],
    collocations: ['fundamental concept', 'theoretical concept', 'proof of concept', 'key concept'],
    example: 'The concept of entropy describes the statistical degree of microscopic disorder.'
  },
  consist: {
    word: 'consist',
    ipa: 'kənˈsɪst',
    pos: 'verb',
    sublist: 1,
    def: 'To be composed or made up of specific constituents or structural members.',
    synonyms: ['comprise', 'contain', 'include', 'incorporate'],
    antonyms: ['exclude', 'lack'],
    collocations: ['consist of', 'largely consist', 'essentially consist'],
    example: 'The operational amplifier circuit consists of a differential input and push-pull output stage.'
  },
  constitute: {
    word: 'constitute',
    ipa: 'ˈkɒn.stɪ.tjuːt',
    pos: 'verb',
    sublist: 1,
    def: 'To be a part of a whole, or to establish something in accordance with formal principles.',
    synonyms: ['compose', 'form', 'establish', 'represent'],
    antonyms: ['dissolve', 'disband', 'destroy'],
    collocations: ['constitute evidence', 'constitute a majority', 'formally constitute'],
    example: 'These five fundamental axioms constitute the foundation of Newtonian classical mechanics.'
  },
  context: {
    word: 'context',
    ipa: 'ˈkɒn.tɛkst',
    pos: 'noun',
    sublist: 1,
    def: 'The circumstances that form the setting for an event, statement, or idea, and in terms of which it can be understood.',
    synonyms: ['environment', 'framework', 'setting', 'perspective'],
    antonyms: ['isolation', 'abstraction'],
    collocations: ['historical context', 'in this context', 'broader context', 'contextual factor'],
    example: 'Results must be interpreted within the context of finite-element boundary approximations.'
  },
  derive: {
    word: 'derive',
    ipa: 'dɪˈraɪv',
    pos: 'verb',
    sublist: 1,
    def: 'To obtain or deduce something from a specified origin, source, or mathematical postulate.',
    synonyms: ['deduce', 'infer', 'extract', 'obtain', 'formulate'],
    antonyms: ['originate', 'create', 'invent'],
    collocations: ['derive equation', 'derive conclusions', 'theoretically derive', 'derive from'],
    example: 'Maxwell derived electromagnetic wave propagation directly from Gauss and Ampere laws.'
  },
  distribute: {
    word: 'distribute',
    ipa: 'dɪˈstrɪb.juːt',
    pos: 'verb',
    sublist: 1,
    def: 'To allocate, disperse, or spread elements over a given area, network, or domain.',
    synonyms: ['disperse', 'allocate', 'diffuse', 'scatter', 'partition'],
    antonyms: ['concentrate', 'gather', 'collect'],
    collocations: ['evenly distributed', 'normal distribution', 'distribute load', 'spatial distribution'],
    example: 'The electric charge is evenly distributed across the outer conducting spherical surface.'
  },
  estimate: {
    word: 'estimate',
    ipa: 'ˈɛs.tɪ.meɪt',
    pos: 'verb',
    sublist: 1,
    def: 'Roughly calculate or judge the numerical value, magnitude, or quantity of a parameter.',
    synonyms: ['approximate', 'gauge', 'evaluate', 'compute'],
    antonyms: ['measure', 'ascertain'],
    collocations: ['conservative estimate', 'estimate parameters', 'accurately estimate', 'initial estimate'],
    example: 'We estimated the activation energy of the catalytic reaction using an Arrhenius plot.'
  },
  evident: {
    word: 'evident',
    ipa: 'ˈɛv.ɪ.dənt',
    pos: 'adj',
    sublist: 1,
    def: 'Plain or obvious to the eye or mind, supported by clear empirical manifestation.',
    synonyms: ['apparent', 'manifest', 'palpable', 'conspicuous'],
    antonyms: ['obscure', 'concealed', 'ambiguous'],
    collocations: ['self-evident', 'readily evident', 'evident from', 'empirically evident'],
    example: 'The onset of resonance is evident from the sharp peak in the frequency response spectrum.'
  },
  factor: {
    word: 'factor',
    ipa: 'ˈfæk.tər',
    pos: 'noun',
    sublist: 1,
    def: 'A circumstance, fact, or influence that contributes to a result or experimental outcome.',
    synonyms: ['determinant', 'variable', 'component', 'element'],
    antonyms: ['whole', 'consequence'],
    collocations: ['limiting factor', 'safety factor', 'key factor', 'confounding factor'],
    example: 'Thermal dissipation remains a dominant limiting factor in high-density integrated packaging.'
  },
  formula: {
    word: 'formula',
    ipa: 'ˈfɔːr.mjə.lə',
    pos: 'noun',
    sublist: 1,
    def: 'A mathematical relationship or rule expressed in symbols, or a chemical proportion recipe.',
    synonyms: ['equation', 'prescription', 'expression', 'algorithm'],
    antonyms: ['chaos', 'randomness'],
    collocations: ['empirical formula', 'molecular formula', 'general formula', 'apply formula'],
    example: 'The quadratic formula yields two distinct roots when the discriminant is positive.'
  },
  function: {
    word: 'function',
    ipa: 'ˈfʌŋk.ʃən',
    pos: 'noun',
    sublist: 1,
    def: 'A relationship or expression involving one or more variables, or the specific purpose of an organ or mechanism.',
    synonyms: ['role', 'purpose', 'mapping', 'utility'],
    antonyms: ['dysfunction', 'malfunction'],
    collocations: ['continuous function', 'primary function', 'step function', 'transfer function'],
    example: 'The transfer function of the low-pass filter exhibits an attenuation slope of 20 dB per decade.'
  },
  indicate: {
    word: 'indicate',
    ipa: 'ˈɪn.dɪ.keɪt',
    pos: 'verb',
    sublist: 1,
    def: 'To point out, show, or serve as a valid empirical sign or symptom of a physical condition.',
    synonyms: ['signify', 'demonstrate', 'denote', 'evince'],
    antonyms: ['conceal', 'mask', 'refute'],
    collocations: ['indicate presence', 'clearly indicate', 'results indicate', 'strong evidence indicates'],
    example: 'High absorbance at 260 nm indicates high concentrations of nucleic acids in the sample.'
  },
  interpret: {
    word: 'interpret',
    ipa: 'ɪnˈtɜːr.prɪt',
    pos: 'verb',
    sublist: 1,
    def: 'To explain the meaning of information, words, or scientific data in a rigorous context.',
    synonyms: ['elucidate', 'decipher', 'construe', 'explicate'],
    antonyms: ['misconstrue', 'obfuscate'],
    collocations: ['interpret findings', 'cautiously interpret', 'interpret data', 'physically interpret'],
    example: 'Spectroscopic peaks were interpreted as stretching vibrations of carbonyl double bonds.'
  },
  method: {
    word: 'method',
    ipa: 'ˈmɛθ.əd',
    pos: 'noun',
    sublist: 1,
    def: 'A particular procedure for accomplishing or approaching something, especially a systematic one.',
    synonyms: ['technique', 'procedure', 'protocol', 'process'],
    antonyms: ['improvisation', 'disorder'],
    collocations: ['scientific method', 'computational method', 'analytical method', 'rigorous method'],
    example: 'Chromatography is a standard analytical method for isolating active pharmaceutical compounds.'
  },
  occur: {
    word: 'occur',
    ipa: 'əˈkɜːr',
    pos: 'verb',
    sublist: 1,
    def: 'To happen, take place, or be found to exist within a given physical medium or interval.',
    synonyms: ['happen', 'transpire', 'manifest', 'arise'],
    antonyms: ['cease', 'vanish'],
    collocations: ['frequently occur', 'occur spontaneously', 'likely to occur', 'occur simultaneously'],
    example: 'Phase transitions occur when latent heat is exchanged at constant temperature.'
  },
  principle: {
    word: 'principle',
    ipa: 'ˈprɪn.sə.pəl',
    pos: 'noun',
    sublist: 1,
    def: 'A fundamental truth or proposition that serves as the foundation for a system of belief or reasoning.',
    synonyms: ['tenet', 'axiom', 'law', 'doctrine', 'precept'],
    antonyms: ['corollary', 'anomaly'],
    collocations: ['first principles', 'fundamental principle', 'uncertainty principle', 'conservation principle'],
    example: 'The conservation of energy is a bedrock principle underlying all thermodynamic equations.'
  },
  procedure: {
    word: 'procedure',
    ipa: 'prəˈsiː.dʒər',
    pos: 'noun',
    sublist: 1,
    def: 'An established or official way of doing something, especially a series of distinct experimental steps.',
    synonyms: ['protocol', 'methodology', 'routine', 'course of action'],
    antonyms: ['deviation', 'irregularity'],
    collocations: ['experimental procedure', 'standard operating procedure', 'calibration procedure'],
    example: 'Researchers adhered strictly to the aseptic sterilization procedure prior to inoculation.'
  },
  require: {
    word: 'require',
    ipa: 'rɪˈkwaɪər',
    pos: 'verb',
    sublist: 1,
    def: 'To need for a particular purpose, or make necessary as a prerequisite condition.',
    synonyms: ['necessitate', 'demand', 'entail', 'stipulate'],
    antonyms: ['waive', 'relinquish'],
    collocations: ['require verification', 'require maintenance', 'strictly require', 'require attention'],
    example: 'Solving Navier-Stokes equations in turbulent regimes requires high-performance parallel computing.'
  },
  significant: {
    word: 'significant',
    ipa: 'sɪɡˈnɪf.ɪ.kənt',
    pos: 'adj',
    sublist: 1,
    def: 'Sufficiently great or important to be worthy of attention; statistically unlikely to have occurred by chance.',
    synonyms: ['substantial', 'consequential', 'momentous', 'noteworthy'],
    antonyms: ['insignificant', 'negligible', 'trivial'],
    collocations: ['statistically significant', 'significant difference', 'significant impact', 'significant correlation'],
    example: 'The test revealed a statistically significant increase in yield (p < 0.001) over the control group.'
  },
  structure: {
    word: 'structure',
    ipa: 'ˈstrʌk.tʃər',
    pos: 'noun',
    sublist: 1,
    def: 'The arrangement of and relations between the parts or elements of something complex.',
    synonyms: ['architecture', 'configuration', 'framework', 'organization'],
    antonyms: ['disorganization', 'chaos'],
    collocations: ['atomic structure', 'molecular structure', 'hierarchical structure', 'crystalline structure'],
    example: 'X-ray crystallography determined the double-helix structure of genomic DNA.'
  },
  theory: {
    word: 'theory',
    ipa: 'ˈθɪə.ri',
    pos: 'noun',
    sublist: 1,
    def: 'A coherent group of tested general propositions, regarded as correct, that can be used as principles of explanation.',
    synonyms: ['hypothesis', 'model', 'paradigm', 'doctrine'],
    antonyms: ['fact', 'practice', 'reality'],
    collocations: ['quantum theory', 'general theory', 'supported by theory', 'in theory'],
    example: 'Special relativity theory harmonized Newtonian mechanics with electromagnetic invariance.'
  },
  vary: {
    word: 'vary',
    ipa: 'ˈvɛə.ri',
    pos: 'verb',
    sublist: 1,
    def: 'To differ in size, amount, degree, or nature from something else of the same general class.',
    synonyms: ['fluctuate', 'differ', 'alternate', 'diverge'],
    antonyms: ['remain constant', 'conform'],
    collocations: ['vary widely', 'vary inversely', 'vary with temperature', 'spatially vary'],
    example: 'Capacitive reactance varies inversely with the frequency of the applied AC voltage.'
  },
  acquire: {
    word: 'acquire',
    ipa: 'əˈkwaɪər',
    pos: 'verb',
    sublist: 2,
    def: 'To gain or obtain possession of an asset, data stream, or functional characteristic.',
    synonyms: ['obtain', 'attain', 'procure', 'secure'],
    antonyms: ['forfeit', 'lose', 'relinquish'],
    collocations: ['acquire data', 'acquire expertise', 'newly acquired', 'rapidly acquire'],
    example: 'The oscilloscope acquired 10,000 voltage samples per second with 16-bit analog resolution.'
  },
  complex: {
    word: 'complex',
    ipa: 'ˈkɒm.plɛks',
    pos: 'adj',
    sublist: 2,
    def: 'Consisting of many different and connected parts; mathematically involving real and imaginary components.',
    synonyms: ['intricate', 'sophisticated', 'multifaceted', 'elaborate'],
    antonyms: ['simple', 'elementary', 'straightforward'],
    collocations: ['complex system', 'complex numbers', 'complex impedance', 'highly complex'],
    example: 'AC circuit calculations utilize complex numbers to represent both magnitude and phase shifts.'
  },
  evaluate: {
    word: 'evaluate',
    ipa: 'ɪˈvæl.ju.eɪt',
    pos: 'verb',
    sublist: 2,
    def: 'To form an idea of the amount, number, or value of; assess critically.',
    synonyms: ['appraise', 'assess', 'calculate', 'gauge'],
    antonyms: ['guess', 'neglect'],
    collocations: ['evaluate performance', 'critically evaluate', 'evaluate integral', 'experimentally evaluate'],
    example: 'We evaluated the aerodynamic drag coefficient inside a low-turbulence supersonic wind tunnel.'
  },
  potential: {
    word: 'potential',
    ipa: 'pəˈtɛn.ʃəl',
    pos: 'noun',
    sublist: 2,
    def: 'Latent qualities or abilities that may be developed; the quantity determining the energy of mass or charge in a field.',
    synonyms: ['capability', 'capacity', 'voltage', 'latency'],
    antonyms: ['impotence', 'kinetic'],
    collocations: ['potential difference', 'electric potential', 'potential barrier', 'full potential'],
    example: 'The electric potential drop across the 100-ohm resistor was measured as 5.0 volts.'
  },
  component: {
    word: 'component',
    ipa: 'kəmˈpoʊ.nənt',
    pos: 'noun',
    sublist: 3,
    def: 'A constituent part or element of a larger system or electronic schematic.',
    synonyms: ['constituent', 'element', 'part', 'module'],
    antonyms: ['composite', 'aggregate'],
    collocations: ['discrete component', 'key component', 'component failure', 'vector component'],
    example: 'Surface-mount passive components offer reduced parasitic inductance compared to through-hole parts.'
  },
  constant: {
    word: 'constant',
    ipa: 'ˈkɒn.stənt',
    pos: 'noun',
    sublist: 3,
    def: 'A situation or state that does not change; a quantity or parameter that is known to be invariant.',
    synonyms: ['invariant', 'fixed quantity', 'steady state'],
    antonyms: ['variable', 'fluctuation'],
    collocations: ['time constant', 'Planck constant', 'dielectric constant', 'universal constant'],
    example: 'The RC time constant dictates the charging velocity of the filtering capacitor.'
  },
  framework: {
    word: 'framework',
    ipa: 'ˈfreɪm.wɜːrk',
    pos: 'noun',
    sublist: 3,
    def: 'A basic structure underlying a system, concept, or text; a supportive conceptual scaffolding.',
    synonyms: ['infrastructure', 'architecture', 'schema', 'scaffolding'],
    antonyms: ['disarray', 'formlessness'],
    collocations: ['theoretical framework', 'regulatory framework', 'computational framework'],
    example: 'Thermodynamics provides the formal framework connecting macroscopic heat to microscopic states.'
  },
  valid: {
    word: 'valid',
    ipa: 'ˈvæl.ɪd',
    pos: 'adj',
    sublist: 3,
    def: 'Having a sound basis in logic or fact; legally or officially acceptable and binding.',
    synonyms: ['legitimate', 'authentic', 'sound', 'well-grounded'],
    antonyms: ['invalid', 'spurious', 'null'],
    collocations: ['valid argument', 'statistically valid', 'valid conclusion', 'valid hypothesis'],
    example: 'The linear approximation remains valid provided that perturbation amplitudes stay below 5%.'
  },
  hypothesis: {
    word: 'hypothesis',
    ipa: 'haɪˈpɒθ.ə.sɪs',
    pos: 'noun',
    sublist: 4,
    def: 'A proposed explanation made on the basis of limited evidence as a starting point for further scientific investigation.',
    synonyms: ['postulate', 'theory', 'conjecture', 'premise', 'proposition'],
    antonyms: ['fact', 'proof', 'certainty'],
    collocations: ['null hypothesis', 'test a hypothesis', 'formulate a hypothesis', 'support the hypothesis'],
    example: 'The null hypothesis posited that the semiconductor dopant concentration had no effect on carrier mobility.'
  },
  theorem: {
    word: 'theorem',
    ipa: 'ˈθɪə.rəm',
    pos: 'noun',
    sublist: 4,
    def: 'A general proposition not self-evident but proved by a chain of reasoning; a truth established by means of accepted truths.',
    synonyms: ['proposition', 'rule', 'formula', 'axiom', 'principle'],
    antonyms: ['conjecture', 'assumption'],
    collocations: ['prove a theorem', 'fundamental theorem', 'sampling theorem', 'binomial theorem'],
    example: 'Nyquist theorem establishes the minimum sampling rate required to avoid frequency aliasing.'
  },
  entropy: {
    word: 'entropy',
    ipa: 'ˈɛn.trə.pi',
    pos: 'noun',
    sublist: 5,
    def: 'A thermodynamic quantity representing the unavailability of a system thermal energy for conversion into mechanical work, often interpreted as the degree of disorder.',
    synonyms: ['disorder', 'randomness', 'uncertainty', 'degradation'],
    antonyms: ['order', 'structure', 'equilibrium'],
    collocations: ['entropy generation', 'increase of entropy', 'Shannon entropy', 'residual entropy'],
    example: 'The second law of thermodynamics mandates that the entropy of an isolated system cannot decrease over time.'
  },
  equilibrium: {
    word: 'equilibrium',
    ipa: 'ˌiː.kwɪˈlɪb.ri.əm',
    pos: 'noun',
    sublist: 5,
    def: 'A state in which opposing forces or influences are balanced.',
    synonyms: ['balance', 'symmetry', 'homeostasis', 'stability'],
    antonyms: ['imbalance', 'disequilibrium', 'instability'],
    collocations: ['thermal equilibrium', 'chemical equilibrium', 'dynamic equilibrium', 'mechanical equilibrium'],
    example: 'At chemical equilibrium, the rates of the forward and reverse reactions are equal.'
  },
  catalyst: {
    word: 'catalyst',
    ipa: 'ˈkæt.əl.ɪst',
    pos: 'noun',
    sublist: 5,
    def: 'A substance that increases the rate of a chemical reaction without itself undergoing any permanent chemical change.',
    synonyms: ['accelerator', 'stimulant', 'promoter', 'agent'],
    antonyms: ['inhibitor', 'retardant'],
    collocations: ['solid catalyst', 'homogeneous catalyst', 'catalyst deactivation', 'enzyme catalyst'],
    example: 'Platinum nanoparticles act as an efficient catalyst in low-temperature proton-exchange membrane fuel cells.'
  },
  gradient: {
    word: 'gradient',
    ipa: 'ˈɡreɪ.di.ənt',
    pos: 'noun',
    sublist: 5,
    def: 'An inclined part of a road or railway; a slope. In mathematics and physics, a vector representing the rate of greatest change of a scalar quantity.',
    synonyms: ['slope', 'incline', 'vector derivative', 'rate of change'],
    antonyms: ['plateau', 'flat'],
    collocations: ['temperature gradient', 'potential gradient', 'concentration gradient', 'gradient descent'],
    example: 'Diffusion flux is proportional to the negative spatial concentration gradient according to Fick law.'
  },
  vector: {
    word: 'vector',
    ipa: 'ˈvɛk.tər',
    pos: 'noun',
    sublist: 5,
    def: 'A quantity having direction as well as magnitude, especially as determining the position of one point in space relative to another.',
    synonyms: ['directed magnitude', 'array', 'pointer', 'trajectory'],
    antonyms: ['scalar'],
    collocations: ['unit vector', 'eigenvector', 'displacement vector', 'Poynting vector'],
    example: 'The electric field is a vector quantity pointing radially outward from a positive point charge.'
  },
  matrix: {
    word: 'matrix',
    ipa: 'ˈmeɪ.trɪks',
    pos: 'noun',
    sublist: 5,
    def: 'A rectangular array of quantities or expressions in rows and columns that is treated as a single mathematical object.',
    synonyms: ['array', 'grid', 'lattice', 'determinant'],
    antonyms: ['scalar'],
    collocations: ['identity matrix', 'sparse matrix', 'covariance matrix', 'orthogonal matrix'],
    example: 'State-space control systems represent dynamic multivariable plants using a state-transition matrix.'
  },
  algorithm: {
    word: 'algorithm',
    ipa: 'ˈæl.ɡə.rɪð.əm',
    pos: 'noun',
    sublist: 4,
    def: 'A process or set of rules to be followed in calculations or other problem-solving operations, especially by a computer.',
    synonyms: ['procedure', 'routine', 'protocol', 'formula'],
    antonyms: ['heuristic', 'randomness'],
    collocations: ['genetic algorithm', 'optimization algorithm', 'asymptotic algorithm', 'fast Fourier algorithm'],
    example: 'The Runge-Kutta fourth-order algorithm achieves excellent numerical stability when simulating stiff circuits.'
  },
  empirical: {
    word: 'empirical',
    ipa: 'ɪmˈpɪr.ɪ.kəl',
    pos: 'adj',
    sublist: 3,
    def: 'Based on, concerned with, or verifiable by observation or experience rather than theory or pure logic.',
    synonyms: ['observational', 'experimental', 'practical', 'firsthand'],
    antonyms: ['theoretical', 'speculative', 'hypothetical'],
    collocations: ['empirical evidence', 'empirical formula', 'empirical validation', 'empirical law'],
    example: 'Ohm law is an empirical relation that holds accurately for metals at constant temperature.'
  },
  paradigm: {
    word: 'paradigm',
    ipa: 'ˈpær.ə.daɪm',
    pos: 'noun',
    sublist: 4,
    def: 'A typical example or pattern of something; a model or distinct conceptual framework.',
    synonyms: ['framework', 'archetype', 'prototype', 'model'],
    antonyms: ['anomaly', 'aberration'],
    collocations: ['paradigm shift', 'dominant paradigm', 'programming paradigm', 'scientific paradigm'],
    example: 'The transition from Newtonian mechanics to quantum electrodynamics represented a historic paradigm shift.'
  },
  quantum: {
    word: 'quantum',
    ipa: 'ˈkwɒn.təm',
    pos: 'noun',
    sublist: 5,
    def: 'A discrete quantity of energy proportional in magnitude to the frequency of the radiation it represents.',
    synonyms: ['discrete unit', 'quanta', 'photon', 'packet'],
    antonyms: ['continuum'],
    collocations: ['quantum mechanics', 'quantum efficiency', 'quantum entanglement', 'quantum tunneling'],
    example: 'Electrons tunnel through thin dielectric barriers due to their wave-like quantum probability distribution.'
  },
  synthesis: {
    word: 'synthesis',
    ipa: 'ˈsɪn.θə.sɪs',
    pos: 'noun',
    sublist: 4,
    def: 'The combination of ideas or substances to form a connected whole or new compound.',
    synonyms: ['integration', 'composition', 'assembly', 'amalgamation'],
    antonyms: ['analysis', 'decomposition', 'breakdown'],
    collocations: ['chemical synthesis', 'frequency synthesis', 'novel synthesis', 'organic synthesis'],
    example: 'The chemical synthesis of high-temperature superconductors requires precise oxygen stoichiometry control.'
  },
  variable: {
    word: 'variable',
    ipa: 'ˈvɛər.i.ə.bəl',
    pos: 'noun',
    sublist: 1,
    def: 'An element, feature, or factor that is liable to vary or change.',
    synonyms: ['parameter', 'factor', 'attribute', 'metric'],
    antonyms: ['constant', 'invariant'],
    collocations: ['independent variable', 'state variable', 'random variable', 'dependent variable'],
    example: 'Temperature was held constant so that the electric voltage remained the sole independent variable.'
  },
  parameter: {
    word: 'parameter',
    ipa: 'pəˈræm.ɪ.tər',
    pos: 'noun',
    sublist: 4,
    def: 'A numerical or other measurable factor forming one of a set that defines a system or sets the conditions of its operation.',
    synonyms: ['criterion', 'specification', 'guideline', 'limit'],
    antonyms: ['variable', 'unknown'],
    collocations: ['lumped parameter', 'operational parameter', 'scattering parameters', 'distributed parameter'],
    example: 'The transistor hybrid-pi model requires five key parameters to accurately predict high-frequency gain.'
  },
  deviation: {
    word: 'deviation',
    ipa: 'ˌdiː.viˈeɪ.ʃən',
    pos: 'noun',
    sublist: 4,
    def: 'The action of departing from an established course or accepted standard; difference between an observed value and the expected mean.',
    synonyms: ['discrepancy', 'divergence', 'aberration', 'variance'],
    antonyms: ['conformity', 'alignment', 'regularity'],
    collocations: ['standard deviation', 'frequency deviation', 'mean deviation', 'allowable deviation'],
    example: 'A low standard deviation confirms that the measurement sensors exhibited minimal thermal drift.'
  },
  flux: {
    word: 'flux',
    ipa: 'flʌks',
    pos: 'noun',
    sublist: 5,
    def: 'The action or process of flowing or flowing out; in physics, the rate of flow of a fluid, radiant energy, or field lines through a given area.',
    synonyms: ['flow', 'stream', 'discharge', 'current'],
    antonyms: ['stagnation', 'halt'],
    collocations: ['magnetic flux', 'heat flux', 'luminous flux', 'flux density'],
    example: 'Faraday law states that an electromotive force is induced by a time-varying magnetic flux linkage.'
  },
  resonance: {
    word: 'resonance',
    ipa: 'ˈrɛz.ən.əns',
    pos: 'noun',
    sublist: 5,
    def: 'The reinforcement or prolongation of sound by reflection or by the synchronous vibration of a neighboring object.',
    synonyms: ['vibration', 'synchrony', 'oscillation', 'reverberation'],
    antonyms: ['damping', 'attenuation'],
    collocations: ['resonant frequency', 'series resonance', 'magnetic resonance', 'acoustic resonance'],
    example: 'At series resonance, the inductive and capacitive reactances cancel, yielding purely resistive impedance.'
  },
  conductance: {
    word: 'conductance',
    ipa: 'kənˈdʌk.təns',
    pos: 'noun',
    sublist: 5,
    def: 'The degree to which an object or material conducts electricity, calculated as the reciprocal of electrical resistance.',
    synonyms: ['conductivity', 'transmittance', 'admittance real part'],
    antonyms: ['resistance', 'insulation'],
    collocations: ['specific conductance', 'transconductance', 'mutual conductance', 'differential conductance'],
    example: 'MOSFET transconductance determines the small-signal voltage amplification capability in common-source amplifiers.'
  },
  stochastic: {
    word: 'stochastic',
    ipa: 'stəˈkæs.tɪk',
    pos: 'adj',
    sublist: 5,
    def: 'Having a random probability distribution or pattern that may be analyzed statistically but may not be predicted precisely.',
    synonyms: ['probabilistic', 'random', 'statistical', 'aleatory'],
    antonyms: ['deterministic', 'predictable'],
    collocations: ['stochastic process', 'stochastic differential equation', 'stochastic noise', 'stochastic gradient'],
    example: 'Thermal Johnson-Nyquist noise in passive resistors is modeled as a stationary Gaussian stochastic process.'
  }
};

export class AcademicDictionaryModal {
  constructor(app) {
    this.app = app;
    this.modal = null;
    this.activeFilter = 'all'; // 'all' | 'verb' | 'noun' | 'adj'
    this.searchQuery = '';
    this.selectedWord = 'analyze';
  }

  show(initialWord = null) {
    if (initialWord && ACADEMIC_LEXICON[initialWord.toLowerCase()]) {
      this.selectedWord = initialWord.toLowerCase();
    }
    if (!this.modal) {
      this.buildModal();
    }
    this.modal.classList.add('visible');
    this.render();
    const searchInput = this.modal.querySelector('#dict-search-input');
    if (searchInput) {
      searchInput.value = this.searchQuery;
      setTimeout(() => searchInput.focus(), 100);
    }
  }

  close() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    if (this.modal) {
      this.modal.classList.remove('visible');
    }
  }

  buildModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'academic-dictionary-backdrop';

    const container = document.createElement('div');
    container.className = 'academic-dictionary-modal glass-card';
    container.innerHTML = `
      <div class="dict-modal-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:22px;">📚</span>
          <div>
            <h4 style="margin:0;font-size:16px;color:#f8fafc;">${t('Academic Dictionary & Thesaurus')}</h4>
            <span style="font-size:11px;color:#94a3b8;">${t('WordNet 3.1 Lexical Database & Academic Word List (AWL)')}</span>
          </div>
        </div>
        <button class="dict-close-btn" style="background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer;">✕</button>
      </div>

      <div class="dict-modal-search-bar" style="padding:10px 16px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;gap:10px;align-items:center;">
        <input type="text" id="dict-search-input" placeholder="${t('Search academic words, synonyms, collocations...')}" style="flex:1;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 12px;color:#f8fafc;font-size:13px;outline:none;">
        <div class="dict-pos-filters" style="display:flex;gap:4px;">
          <button class="pos-filter-btn active" data-pos="all">${t('All')}</button>
          <button class="pos-filter-btn" data-pos="verb">${t('Verbs')}</button>
          <button class="pos-filter-btn" data-pos="noun">${t('Nouns')}</button>
          <button class="pos-filter-btn" data-pos="adj">${t('Adjectives')}</button>
        </div>
      </div>

      <div class="dict-modal-body" style="display:flex;flex:1;overflow:hidden;">
        <!-- Left: Word List -->
        <div class="dict-word-list-panel" style="width:240px;border-right:1px solid rgba(255,255,255,0.08);overflow-y:auto;background:rgba(0,0,0,0.15);">
          <div id="dict-words-container" style="padding:6px;"></div>
        </div>

        <!-- Right: Lexicon & Thesaurus Detail Card -->
        <div class="dict-detail-panel" style="flex:1;padding:20px;overflow-y:auto;">
          <div id="dict-detail-content"></div>
        </div>
      </div>
    `;

    backdrop.appendChild(container);
    document.body.appendChild(backdrop);
    this.modal = backdrop;

    // Event handlers
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });
    container.querySelector('.dict-close-btn').addEventListener('click', () => this.close());

    const searchInput = container.querySelector('#dict-search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderWordList();
    });

    const posBtns = container.querySelectorAll('.pos-filter-btn');
    posBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        posBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.pos;
        this.renderWordList();
      });
    });
  }

  render() {
    this.renderWordList();
    this.renderDetail();
  }

  renderWordList() {
    const container = this.modal.querySelector('#dict-words-container');
    if (!container) return;

    const words = Object.keys(ACADEMIC_LEXICON).filter((key) => {
      const entry = ACADEMIC_LEXICON[key];
      if (this.activeFilter !== 'all' && entry.pos !== this.activeFilter) return false;
      if (!this.searchQuery) return true;
      return (
        entry.word.includes(this.searchQuery) ||
        entry.def.toLowerCase().includes(this.searchQuery) ||
        entry.synonyms.some((s) => s.includes(this.searchQuery)) ||
        entry.collocations.some((c) => c.includes(this.searchQuery))
      );
    });

    if (words.length === 0) {
      container.innerHTML = `<div style="padding:16px;color:#64748b;font-size:12px;text-align:center;">${t('No matching words found.')}</div>`;
      return;
    }

    container.innerHTML = words
      .map(
        (w) => `
        <div class="dict-list-item ${w === this.selectedWord ? 'active' : ''}" data-word="${w}" style="padding:8px 12px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;font-size:13px;color:#e2e8f0;">
          <span style="font-weight:600;">${w}</span>
          <span style="font-size:10px;padding:2px 5px;border-radius:3px;background:rgba(255,255,255,0.06);color:#94a3b8;">${ACADEMIC_LEXICON[w].pos}</span>
        </div>
      `
      )
      .join('');

    container.querySelectorAll('.dict-list-item').forEach((item) => {
      item.addEventListener('click', () => {
        this.selectedWord = item.dataset.word;
        container.querySelectorAll('.dict-list-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        this.renderDetail();
      });
    });
  }

  renderDetail() {
    const detailContent = this.modal.querySelector('#dict-detail-content');
    if (!detailContent) return;

    const entry = ACADEMIC_LEXICON[this.selectedWord];
    if (!entry) {
      detailContent.innerHTML = `<div style="color:#64748b;">${t('Select a word to inspect its definition and synonyms.')}</div>`;
      return;
    }

    detailContent.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="display:flex;align-items:center;gap:12px;">
            <h2 style="margin:0;font-size:26px;color:#f8fafc;font-family:serif;">${entry.word}</h2>
            <button id="btn-speak-word" title="${t('Pronounce word')}" style="background:#0284c7;border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:white;font-size:14px;">🔊</button>
            <span style="color:#38bdf8;font-size:14px;font-family:monospace;">/${entry.ipa}/</span>
            <span style="background:rgba(56,189,248,0.15);color:#38bdf8;font-size:11px;font-weight:bold;padding:2px 7px;border-radius:4px;text-transform:uppercase;">${entry.pos}</span>
            ${entry.sublist ? `<span style="background:rgba(168,85,247,0.15);color:#c084fc;font-size:11px;font-weight:bold;padding:2px 7px;border-radius:4px;">AWL Sublist ${entry.sublist}</span>` : ''}
          </div>
        </div>
        <button id="btn-stamp-dict-card" class="btn-stamp-action" style="background:#059669;color:white;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;display:flex;align-items:center;gap:6px;">
          <span>📸</span> ${t('Stamp Definition Card')}
        </button>
      </div>

      <div style="margin-bottom:20px;padding:12px 16px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:3px solid #38bdf8;">
        <div style="font-size:11px;color:#94a3b8;font-weight:bold;margin-bottom:4px;text-transform:uppercase;">${t('Academic Definition')}</div>
        <div style="font-size:14px;color:#f1f5f9;line-height:1.5;">${entry.def}</div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:11px;color:#94a3b8;font-weight:bold;margin-bottom:8px;text-transform:uppercase;">📖 ${t('Academic Thesaurus & Synonyms')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${entry.synonyms
            .map(
              (syn) =>
                `<span class="thesaurus-chip syn-chip" data-word="${syn}" style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);padding:3px 9px;border-radius:14px;font-size:12px;cursor:pointer;">${syn}</span>`
            )
            .join('')}
        </div>
      </div>

      ${
        entry.antonyms && entry.antonyms.length
          ? `
        <div style="margin-bottom:20px;">
          <div style="font-size:11px;color:#94a3b8;font-weight:bold;margin-bottom:8px;text-transform:uppercase;">⚡ ${t('Antonyms')}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${entry.antonyms
              .map(
                (ant) =>
                  `<span class="thesaurus-chip ant-chip" data-word="${ant}" style="background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);padding:3px 9px;border-radius:14px;font-size:12px;cursor:pointer;">${ant}</span>`
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }

      <div style="margin-bottom:20px;">
        <div style="font-size:11px;color:#94a3b8;font-weight:bold;margin-bottom:8px;text-transform:uppercase;">🔗 ${t('Scholarly Collocations')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${entry.collocations
            .map(
              (col) =>
                `<span style="background:rgba(255,255,255,0.06);color:#e2e8f0;padding:3px 8px;border-radius:4px;font-size:12px;">${col}</span>`
            )
            .join('')}
        </div>
      </div>

      <div style="padding:12px 16px;background:rgba(0,0,0,0.25);border-radius:8px;">
        <div style="font-size:11px;color:#94a3b8;font-weight:bold;margin-bottom:4px;text-transform:uppercase;">💬 ${t('Corpus Example')}</div>
        <div style="font-size:13px;color:#cbd5e1;font-style:italic;line-height:1.5;">"${entry.example}"</div>
      </div>
    `;

    // Audio TTS button
    detailContent.querySelector('#btn-speak-word').addEventListener('click', () => {
      this.speakWord(entry.word);
    });

    // Stamp Card button
    detailContent.querySelector('#btn-stamp-dict-card').addEventListener('click', () => {
      this.stampCard(entry);
    });

    // Thesaurus chips clickable navigation
    detailContent.querySelectorAll('.thesaurus-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const target = chip.dataset.word;
        if (ACADEMIC_LEXICON[target]) {
          this.selectedWord = target;
          this.render();
        } else {
          this.searchQuery = target;
          const searchInput = this.modal.querySelector('#dict-search-input');
          if (searchInput) searchInput.value = target;
          this.renderWordList();
        }
      });
    });
  }

  speakWord(word) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.app.toast?.(t('Speech synthesis not supported in this environment.'));
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.88; // slightly measured academic cadence

      // Fallback timer: prevents speech queue lockup if Windows N or audio driver stalls
      const timer = setTimeout(() => {
        try { window.speechSynthesis.cancel(); } catch {}
      }, 4000);

      utterance.onend = () => clearTimeout(timer);
      utterance.onerror = () => clearTimeout(timer);
      window.speechSynthesis.speak(utterance);
    } catch {
      this.app.toast?.(t('Speech synthesis not supported in this environment.'));
    }
  }

  stampCard(entry) {
    const cam = this.app.surface?.cam;
    const sw = this.app.surface?.width || 800;
    const sh = this.app.surface?.height || 600;
    const view = (cam && typeof cam.viewport === 'function')
      ? cam.viewport(sw, sh)
      : (cam?.viewport && typeof cam.viewport.x === 'number' ? cam.viewport : { x: 200, y: 200, w: sw, h: sh });
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;

    const note = {
      id: uid(),
      type: 'note',
      x: cx - 180,
      y: cy - 120,
      w: 360,
      h: 240,
      color: '#0f172a',
      markdown: true,
      text: [
        `### 📚 **${entry.word}** \`/${entry.ipa}/\``,
        `*${entry.pos.toUpperCase()}* | **AWL Sublist ${entry.sublist || 1}**`,
        `---`,
        `**Definition:** ${entry.def}`,
        ``,
        `**Synonyms:** ${(entry.synonyms || []).join(', ')}`,
        `**Collocations:** ${(entry.collocations || []).join(' • ')}`,
        ``,
        `> _"${entry.example}"_`
      ].join('\n')
    };

    this.app.store.add(note, 'stamp academic definition card');
    this.app.toast?.(t('Academic definition card stamped to whiteboard.'));
    this.close();
  }
}
