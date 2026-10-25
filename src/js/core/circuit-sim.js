/**
 * @file circuit-sim.js
 * @description Headless Modified Nodal Analysis (MNA) & Event-Driven Relay Simulation Engine
 * for 2D/2.5D Industrial Control Circuits (GazBoard Phase 4 / v6.4.0).
 *
 * Implements low-overhead, pure JavaScript simulation of:
 * - 3-Phase AC (400V 50Hz L1/L2/L3) & Single-Phase AC (230V 50Hz) power grids
 * - Regulated DC Power Supplies (24V DC / 12V DC)
 * - Miniature Circuit Breakers (QF - 1P/3P with thermal/magnetic trip)
 * - AC Contactors (KM - coils, main NO poles, auxiliary NO 13-14 and NC 21-22 contacts)
 * - Thermal Overload Relays (FR/KK - bimetal heating I²t, NC 95-96 trip, NO 97-98 alarm, manual reset)
 * - Industrial Pushbutton Stations (SB - green Start NO 3-4, red Stop NC 1-2, mushroom E-Stop)
 * - 3-Phase Induction Motors (M - U/V/W terminals, dynamic RPM, torque, slip, CW/CCW direction)
 * - Pilot Indicator Lights (HL - Red, Green, Yellow, Blue, White)
 * - Virtual Digital Multimeter (DMM) & Dual-Trace Waveform Sampler
 * - Procedural Web Audio API sound synthesizer (mechanical clicks, snaps, hums, continuity beep)
 *
 * Zero external native dependencies (pure portable JavaScript).
 */

/**
 * Procedural Web Audio API Sound Synthesizer
 * Produces crisp mechanical clicks, contactor clacks, relay snaps, and multimeter tones.
 */
export class CircuitAudioSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch (e) {
      this.enabled = false;
    }
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Contactor armature pull-in / drop-out acoustic clack
   * @param {boolean} energized
   */
  playContactorClick(energized = true) {
    if (!this.enabled) return;
    // A coil sitting on its pickup/dropout threshold can change state on every
    // simulation step. Unthrottled that schedules dozens of oscillators a
    // second and starves the audio buffers, so gate the click like the button.
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this._lastContactorAt && now - this._lastContactorAt < 25) return;
    this._lastContactorAt = now;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Metallic transient burst
    osc.type = energized ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(energized ? 180 : 120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.06);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Breaker mechanical snap switch
   */
  playBreakerSnap() {
    if (!this.enabled) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this._lastSnapAt && now - this._lastSnapAt < 25) return;
    this._lastSnapAt = now;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.04);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  /**
   * Pushbutton plastic tactile click (throttled)
   */
  playButtonClick() {
    if (!this.enabled) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this._lastBtnClick && now - this._lastBtnClick < 40) return;
    this._lastBtnClick = now;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.025);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Digital multimeter continuity buzzer tone (2000 Hz, throttled to prevent audio buffer exhaustion)
   */
  playContinuityBeep() {
    if (!this.enabled) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this._lastBeep && now - this._lastBeep < 150) return;
    this._lastBeep = now;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);
  }
}

/** Global Procedural Audio Synthesizer singleton */
export const circuitAudio = new CircuitAudioSynth();

/**
 * Hardening Helper: Builds an MNA node conductance matrix with minimum shunt conductance
 * to ground (1 pS) across all diagonal entries, preventing singular matrix divide-by-zero.
 * @param {number} numNodes
 * @returns {Float64Array[]}
 */
export function buildProtectedMatrix(numNodes) {
  const n = Math.max(1, numNodes || 1);
  const G = Array.from({ length: n }, () => new Float64Array(n));
  const G_MIN = 1e-12; // 1 pS minimum shunt prevents singular matrix
  for (let i = 0; i < n; i++) {
    G[i][i] += G_MIN;
  }
  return G;
}

/**
 * Hardening Helper: Shockley diode voltage limiter preventing exponential floating-point
 * overflow in Newton-Raphson semiconductor iterations.
 * @param {number} vNew
 * @param {number} vOld
 * @param {number} [vt=0.026] Thermal voltage (approx 26mV at 300K)
 * @returns {number}
 */
export function clampDiodeVoltage(vNew, vOld, vt = 0.026) {
  if (!Number.isFinite(vNew)) return 0;
  const vcrit = vt * Math.log(vt / (Math.SQRT2 * 1e-14));
  if (vNew > vcrit && Math.abs(vNew - (vOld || 0)) > 2 * vt) {
    return (vOld || 0) > 0 ? (vOld || 0) + 2 * vt : vcrit;
  }
  return vNew;
}

/**
 * Industrial Circuit Simulation Model
 */
export class IndustrialCircuitSim {
  constructor() {
    this.audio = circuitAudio;
    this.time = 0; // seconds
    this.running = true;
    this.frequency = 50; // Hz
    this.gridVoltageRMS = 230; // Phase-to-Neutral (V)
    this.grid3PhaseRMS = 400; // Line-to-Line (V)
    this.dcSupplyVoltage = 24.0; // Variable DC Power Supply (0-30V)

    // Components dictionary: id -> Component
    this.components = new Map();

    // Wires list: { id, from: 'comp:port', to: 'comp:port', color, current: 0 }
    this.wires = [];

    // Multimeter virtual probes: { red: 'comp:port' | null, black: 'comp:port' | null, mode: 'VAC'|'VDC'|'AAC'|'ADC'|'RES'|'CONT'|'WATT' }
    this.dmm = {
      red: null,
      black: null,
      mode: 'VAC', // 'VAC', 'VDC', 'AAC', 'ADC', 'RES', 'CONT', 'WATT'
      reading: 0,
      unit: 'V AC',
      powerWatts: 0,
      overheatWarning: false
    };

    // Oscilloscope sample buffer (time, chA, chB)
    this.scope = {
      chA: null, // 'comp:port'
      chB: null, // 'comp:port'
      historyA: [],
      historyB: [],
      maxSamples: 150
    };
  }

  /**
   * Reset simulation state
   */
  clear() {
    this.components.clear();
    this.wires = [];
    this.time = 0;
    // A new circuit has different ports: probes and scope channels pointing at
    // the old components would silently keep reading 0 V / O.L forever.
    this.dmm.red = null;
    this.dmm.black = null;
    this.dmm.reading = 0;
    this.dmm.powerWatts = 0;
    this.dmm.overheatWarning = false;
    this.scope.chA = null;
    this.scope.chB = null;
    this.scope.historyA = [];
    this.scope.historyB = [];
  }

  /**
   * Add a component to the circuit
   * @param {Object} comp
   */
  addComponent(comp) {
    this.components.set(comp.id, comp);
    return comp;
  }

  /**
   * Connect a wire between two terminal ports
   * @param {string} fromPort - e.g. "QF1:2"
   * @param {string} toPort - e.g. "KM1:1"
   * @param {string} color - wire color hex or code
   */
  addWire(fromPort, toPort, color = '#e81123') {
    if (!fromPort || !toPort || fromPort === toPort) return null;
    // Check if wire already exists
    const exists = this.wires.find(
      (w) => (w.from === fromPort && w.to === toPort) || (w.from === toPort && w.to === fromPort)
    );
    if (exists) return exists;

    const wire = {
      id: `w_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      from: fromPort,
      to: toPort,
      color,
      current: 0,
      voltage: 0
    };
    this.wires.push(wire);
    return wire;
  }

  /**
   * Remove a wire by id
   * @param {string} wireId
   */
  removeWire(wireId) {
    this.wires = this.wires.filter((w) => w.id !== wireId);
  }

  /**
   * Step the simulation by dt seconds (default ~16.6ms / 60 Hz)
   * @param {number} dt
   */
  step(dt = 0.0166) {
    // Guard the public entry point: a NaN/negative step used to poison
    // `this.time` and therefore every voltage in the circuit for the rest of
    // the session. Clamp to something a frame could plausibly be.
    if (!Number.isFinite(dt) || dt <= 0) dt = 0.0166;
    else if (dt > 0.25) dt = 0.25;
    this.time += dt;
    const omega = 2 * Math.PI * this.frequency;
    const t = this.time;

    // 1. Calculate source instantaneous voltages
    const vL1 = Math.SQRT2 * this.gridVoltageRMS * Math.sin(omega * t);
    const vL2 = Math.SQRT2 * this.gridVoltageRMS * Math.sin(omega * t - (2 * Math.PI) / 3);
    const vL3 = Math.SQRT2 * this.gridVoltageRMS * Math.sin(omega * t - (4 * Math.PI) / 3);
    const vN = 0;
    const vDC = Number.isFinite(this.dcSupplyVoltage) ? this.dcSupplyVoltage : 24.0;

    // Port potentials map: 'comp:port' -> { instant: number, rms: number, isDC: boolean }
    const potentials = new Map();

    /*
     * Armature positions decided at the end of the previous step. Applying
     * them before propagation (rather than deciding inside it) is what lets a
     * contactor hold itself: its aux NO contact is part of its own coil feed.
     */
    for (const comp of this.components.values()) {
      if (comp.type !== 'contactor' || comp._nextEnergized == null) continue;
      if (comp._nextEnergized !== !!comp.energized) {
        comp.energized = comp._nextEnergized;
        this.audio.playContactorClick(comp.energized);
      }
    }

    const setPort = (port, instant, rms = Math.abs(instant), isDC = false) => {
      potentials.set(port, { instant, rms, isDC, src: port });
    };

    // Initialize Power Sources
    for (const comp of this.components.values()) {
      if (comp.type === 'power_source_3p') {
        setPort(`${comp.id}:L1`, vL1, this.gridVoltageRMS, false);
        setPort(`${comp.id}:L2`, vL2, this.gridVoltageRMS, false);
        setPort(`${comp.id}:L3`, vL3, this.gridVoltageRMS, false);
        setPort(`${comp.id}:N`, vN, 0, false);
        setPort(`${comp.id}:PE`, 0, 0, false);
      } else if (comp.type === 'power_source_1p') {
        setPort(`${comp.id}:L`, vL1, this.gridVoltageRMS, false);
        setPort(`${comp.id}:N`, vN, 0, false);
        setPort(`${comp.id}:PE`, 0, 0, false);
      } else if (comp.type === 'dc_supply') {
        setPort(`${comp.id}:+`, vDC, vDC, true);
        setPort(`${comp.id}:-`, 0, 0, true);
      }
    }

    // 2. Multi-pass iterative potential propagation across closed switches & wires
    /*
     * One pass can only push a potential one hop along a chain that happens to
     * be walked backwards, so a fixed limit of 12 silently left long ladder
     * rungs half-powered (some nodes never received a potential at all, which
     * then reads as 0 V and stalls motors or contactor coils). Potentials are
     * only ever ADDED, never overwritten, so the process is monotone and is
     * bounded by the number of ports: use that as the limit instead.
     */
    let changed = true;
    let iterations = 0;
    const maxPasses = Math.min(5000, this.components.size * 12 + this.wires.length + 8);
    while (changed && iterations < maxPasses) {
      changed = false;
      iterations++;

      // Propagate across component internal closed paths
      for (const comp of this.components.values()) {
        // Circuit Breaker (QF)
        if (comp.type === 'breaker') {
          if (comp.closed && !comp.tripped) {
            // Poles: 1-2, 3-4, 5-6
            const poles = [
              [`${comp.id}:1`, `${comp.id}:2`],
              [`${comp.id}:3`, `${comp.id}:4`],
              [`${comp.id}:5`, `${comp.id}:6`]
            ];
            for (const [p1, p2] of poles) {
              const pot1 = potentials.get(p1);
              const pot2 = potentials.get(p2);
              if (pot1 && !pot2) {
                potentials.set(p2, pot1);
                changed = true;
              } else if (pot2 && !pot1) {
                potentials.set(p1, pot2);
                changed = true;
              }
            }
          }
        }

        // AC Contactor (KM)
        if (comp.type === 'contactor') {
          /*
           * Contacts follow the state decided at the END of the previous step.
           *
           * A holding contactor's own aux NO contact is part of its coil
           * circuit, so deciding the state from potentials that are still only
           * half-propagated made the latch impossible: the coil read "no A1
           * yet" early in the pass, dropped out, and opened the very contact
           * that was carrying its own supply. Deciding after propagation (one
           * step of contactor delay, like a real armature) makes self-hold and
           * the forward/reverse interlock work.
           * See the state decision after the propagation loop.
           */

          // Main poles 1-2, 3-4, 5-6 (NO contacts: closed when energized)
          if (comp.energized) {
            const mainPoles = [
              [`${comp.id}:1`, `${comp.id}:2`],
              [`${comp.id}:3`, `${comp.id}:4`],
              [`${comp.id}:5`, `${comp.id}:6`],
              [`${comp.id}:13`, `${comp.id}:14`] // Aux NO contact
            ];
            for (const [p1, p2] of mainPoles) {
              const pot1 = potentials.get(p1);
              const pot2 = potentials.get(p2);
              if (pot1 && !pot2) {
                potentials.set(p2, pot1);
                changed = true;
              } else if (pot2 && !pot1) {
                potentials.set(p1, pot2);
                changed = true;
              }
            }
          } else {
            // Aux NC contact 21-22: closed when DE-ENERGIZED
            const [p1, p2] = [`${comp.id}:21`, `${comp.id}:22`];
            const pot1 = potentials.get(p1);
            const pot2 = potentials.get(p2);
            if (pot1 && !pot2) {
              potentials.set(p2, pot1);
              changed = true;
            } else if (pot2 && !pot1) {
              potentials.set(p1, pot2);
              changed = true;
            }
          }
        }

        // Thermal Overload Relay (FR)
        if (comp.type === 'overload_relay') {
          // Main current paths 1-2, 3-4, 5-6 always conductive unless physically broken
          const poles = [
            [`${comp.id}:1`, `${comp.id}:2`],
            [`${comp.id}:3`, `${comp.id}:4`],
            [`${comp.id}:5`, `${comp.id}:6`]
          ];
          for (const [p1, p2] of poles) {
            const pot1 = potentials.get(p1);
            const pot2 = potentials.get(p2);
            if (pot1 && !pot2) {
              potentials.set(p2, pot1);
              changed = true;
            } else if (pot2 && !pot1) {
              potentials.set(p1, pot2);
              changed = true;
            }
          }

          // Control auxiliary contacts
          // 95-96 is Normally Closed (opens on trip)
          if (!comp.tripped) {
            const [p1, p2] = [`${comp.id}:95`, `${comp.id}:96`];
            const pot1 = potentials.get(p1);
            const pot2 = potentials.get(p2);
            if (pot1 && !pot2) {
              potentials.set(p2, pot1);
              changed = true;
            } else if (pot2 && !pot1) {
              potentials.set(p1, pot2);
              changed = true;
            }
          } else {
            // 97-98 is Normally Open (closes on trip for alarm signaling)
            const [p1, p2] = [`${comp.id}:97`, `${comp.id}:98`];
            const pot1 = potentials.get(p1);
            const pot2 = potentials.get(p2);
            if (pot1 && !pot2) {
              potentials.set(p2, pot1);
              changed = true;
            } else if (pot2 && !pot1) {
              potentials.set(p1, pot2);
              changed = true;
            }
          }
        }

        // Pushbuttons (SB)
        if (comp.type === 'pushbutton') {
          // Start Button (NO 3-4): conductive when pressed
          if (comp.pressed) {
            const [p1, p2] = [`${comp.id}:3`, `${comp.id}:4`];
            const pot1 = potentials.get(p1);
            const pot2 = potentials.get(p2);
            if (pot1 && !pot2) {
              potentials.set(p2, pot1);
              changed = true;
            } else if (pot2 && !pot1) {
              potentials.set(p1, pot2);
              changed = true;
            }
          }
          // Stop Button (NC 1-2): conductive when NOT pressed
          if (!comp.pressed) {
            const [p1, p2] = [`${comp.id}:1`, `${comp.id}:2`];
            const pot1 = potentials.get(p1);
            const pot2 = potentials.get(p2);
            if (pot1 && !pot2) {
              potentials.set(p2, pot1);
              changed = true;
            } else if (pot2 && !pot1) {
              potentials.set(p1, pot2);
              changed = true;
            }
          }
        }

        // Emergency Stop Pushbutton (E-STOP)
        if (comp.type === 'estop') {
          // NC contacts 1-2: opens when latched in emergency stop
          if (!comp.latched) {
            const [p1, p2] = [`${comp.id}:1`, `${comp.id}:2`];
            const pot1 = potentials.get(p1);
            const pot2 = potentials.get(p2);
            if (pot1 && !pot2) {
              potentials.set(p2, pot1);
              changed = true;
            } else if (pot2 && !pot1) {
              potentials.set(p1, pot2);
              changed = true;
            }
          }
        }

        // Terminal Block (TB): pass-through jumper pairs
        if (comp.type === 'terminal_block') {
          for (let i = 1; i <= (comp.pins || 8); i++) {
            const p1 = `${comp.id}:${i}T`;
            const p2 = `${comp.id}:${i}B`;
            const pot1 = potentials.get(p1);
            const pot2 = potentials.get(p2);
            if (pot1 && !pot2) {
              potentials.set(p2, pot1);
              changed = true;
            } else if (pot2 && !pot1) {
              potentials.set(p1, pot2);
              changed = true;
            }
          }
        }

        // Discrete Diodes & Zener Diodes
        if (comp.type === 'diode' || comp.type === 'zener_diode') {
          const potA = potentials.get(`${comp.id}:A`);
          const potK = potentials.get(`${comp.id}:K`);
          if (potA && !potK) {
            /*
             * Forward drop straight from the source potential.
             *
             * This model propagates node potentials instead of iterating a
             * Newton-Raphson solve, so there is no exponential to overflow and
             * nothing to limit: applying the solver's jump limiter here capped
             * the anode at ~0.73 V and then let it climb by 52 mV PER STEP, so
             * every circuit with a series diode (bridge rectifier, protection
             * diode) showed a few tens of millivolts where 23 V belonged and
             * crept towards the real value over several seconds.
             */
            const vA = Number.isFinite(potA.rms) ? potA.rms : 0;
            if (vA >= 0.7) {
              potentials.set(`${comp.id}:K`, { instant: potA.instant - 0.7, rms: Math.max(0, vA - 0.7), isDC: potA.isDC });
              changed = true;
            }
          } else if (comp.type === 'zener_diode' && potK && !potA) {
            const vz = comp.zenerVoltage || 5.1;
            if (potK.rms >= vz) {
              potentials.set(`${comp.id}:A`, { instant: potK.instant - vz, rms: Math.max(0, potK.rms - vz), isDC: potK.isDC });
              changed = true;
            }
          }
        }

        // Light Emitting Diodes (LED)
        if (comp.type === 'led') {
          const potA = potentials.get(`${comp.id}:A`);
          const potK = potentials.get(`${comp.id}:K`);
          let vFwd = 0;
          if (potA && potK) {
            vFwd = potA.rms - potK.rms;
          } else if (potA) {
            vFwd = potA.rms;
          }
          comp.lit = vFwd >= (comp.forwardVoltage || 1.8);
          if (potA && !potK && vFwd >= 1.8) {
            potentials.set(`${comp.id}:K`, { instant: potA.instant - 1.8, rms: Math.max(0, potA.rms - 1.8), isDC: potA.isDC });
            changed = true;
          }
        }

        // Bipolar Junction Transistors (BJT NPN & PNP)
        if (comp.type === 'bjt_npn') {
          const potB = potentials.get(`${comp.id}:B`);
          const potE = potentials.get(`${comp.id}:E`);
          const potC = potentials.get(`${comp.id}:C`);
          const vBE = (potB ? potB.rms : 0) - (potE ? potE.rms : 0);
          comp.active = vBE >= 0.65;
          if (comp.active && potC && !potE) {
            potentials.set(`${comp.id}:E`, { instant: potC.instant, rms: Math.max(0, potC.rms - 0.2), isDC: true });
            changed = true;
          } else if (comp.active && potE && !potC) {
            potentials.set(`${comp.id}:C`, { instant: potE.instant, rms: potE.rms + 0.2, isDC: true });
            changed = true;
          }
        } else if (comp.type === 'bjt_pnp') {
          const potB = potentials.get(`${comp.id}:B`);
          const potE = potentials.get(`${comp.id}:E`);
          const potC = potentials.get(`${comp.id}:C`);
          const vEB = (potE ? potE.rms : 0) - (potB ? potB.rms : 0);
          comp.active = vEB >= 0.65;
          if (comp.active && potE && !potC) {
            potentials.set(`${comp.id}:C`, { instant: potE.instant, rms: Math.max(0, potE.rms - 0.2), isDC: true });
            changed = true;
          }
        }

        // Field-Effect Transistors (MOSFET N-Channel & P-Channel)
        if (comp.type === 'mosfet_n') {
          const potG = potentials.get(`${comp.id}:G`);
          const potS = potentials.get(`${comp.id}:S`);
          const vGS = (potG ? potG.rms : 0) - (potS ? potS.rms : 0);
          comp.active = vGS >= (comp.vth || 2.0);
          if (comp.active) {
            const [p1, p2] = [`${comp.id}:D`, `${comp.id}:S`];
            const pot1 = potentials.get(p1);
            const pot2 = potentials.get(p2);
            if (pot1 && !pot2) { potentials.set(p2, pot1); changed = true; }
            else if (pot2 && !pot1) { potentials.set(p1, pot2); changed = true; }
          }
        } else if (comp.type === 'mosfet_p') {
          const potG = potentials.get(`${comp.id}:G`);
          const potS = potentials.get(`${comp.id}:S`);
          const vSG = (potS ? potS.rms : 0) - (potG ? potG.rms : 0);
          comp.active = vSG >= (comp.vth || 2.0);
          if (comp.active) {
            const [p1, p2] = [`${comp.id}:S`, `${comp.id}:D`];
            const pot1 = potentials.get(p1);
            const pot2 = potentials.get(p2);
            if (pot1 && !pot2) { potentials.set(p2, pot1); changed = true; }
            else if (pot2 && !pot1) { potentials.set(p1, pot2); changed = true; }
          }
        }

        // Operational Amplifier (Op-Amp LM741 / Rail-to-Rail)
        if (comp.type === 'opamp') {
          const potP = potentials.get(`${comp.id}:IN+`);
          const potN = potentials.get(`${comp.id}:IN-`);
          const potVpos = potentials.get(`${comp.id}:V+`);
          const potVneg = potentials.get(`${comp.id}:V-`);
          const vPos = potVpos ? potVpos.rms : 12.0;
          const vNeg = potVneg ? potVneg.rms : 0.0;
          const vp = potP ? potP.rms : 0;
          const vn = potN ? potN.rms : 0;
          const gain = comp.openLoopGain || 100000;
          let vOut = Math.min(vPos - 1.2, Math.max(vNeg, (vp - vn) * gain));
          if (comp.configuredGain) {
            vOut = Math.min(vPos - 1.2, Math.max(vNeg, vp * comp.configuredGain));
          }
          const curOut = potentials.get(`${comp.id}:OUT`);
          if (!curOut) {
            potentials.set(`${comp.id}:OUT`, { instant: vOut, rms: vOut, isDC: true });
            changed = true;
          } else if (Math.abs(curOut.rms - vOut) > 0.05) {
            // Mutate the node IN PLACE: wires and closed contacts downstream
            // hold the same object, so a value recomputed after they were
            // reached is seen everywhere instead of the old copy sticking
            // (that is why the output LED used to stay dark).
            curOut.instant = vOut;
            curOut.rms = vOut;
            curOut.isDC = true;
            changed = true;
          }
        }

        // 555 Timer IC (Astable / Monostable)
        if (comp.type === 'timer_555') {
          const potVcc = potentials.get(`${comp.id}:8`);
          const vcc = potVcc ? potVcc.rms : 5.0;
          comp.stateTimer = (comp.stateTimer || 0) + dt;
          const period = comp.period || 0.6;
          if (comp.stateTimer >= period) {
            comp.stateTimer = 0;
            comp.high = !comp.high;
          }
          const outV = comp.high ? Math.max(0, vcc - 1.2) : 0;
          const curOut = potentials.get(`${comp.id}:3`);
          if (!curOut) {
            potentials.set(`${comp.id}:3`, { instant: outV, rms: outV, isDC: true });
            changed = true;
          } else if (curOut.rms !== outV) {
            // In-place, so downstream loads see the toggle (see the op-amp).
            curOut.instant = outV; curOut.rms = outV; curOut.isDC = true;
            changed = true;
          }
          if (!comp.high) {
            const pin7 = potentials.get(`${comp.id}:7`);
            if (!pin7) potentials.set(`${comp.id}:7`, { instant: 0, rms: 0, isDC: true });
            else if (pin7.rms !== 0) { pin7.instant = 0; pin7.rms = 0; pin7.isDC = true; }
          }
        }

        // Digital Logic Gates (AND, OR, NOT, NAND, NOR, XOR, XNOR)
        if (comp.type === 'logic_gate') {
          const potA = potentials.get(`${comp.id}:A`);
          const potB = potentials.get(`${comp.id}:B`);
          const inA = potA && potA.rms >= 2.0;
          const inB = potB && potB.rms >= 2.0;
          let out = false;
          switch (comp.gateType || 'AND') {
            case 'AND': out = inA && inB; break;
            case 'OR':  out = inA || inB; break;
            case 'NOT': out = !inA; break;
            case 'NAND': out = !(inA && inB); break;
            case 'NOR':  out = !(inA || inB); break;
            case 'XOR':  out = inA !== inB; break;
            case 'XNOR': out = inA === inB; break;
          }
          const outV = out ? 5.0 : 0.0;
          const curOut = potentials.get(`${comp.id}:Y`);
          if (!curOut) {
            potentials.set(`${comp.id}:Y`, { instant: outV, rms: outV, isDC: true });
            changed = true;
          } else if (curOut.rms !== outV) {
            // In-place, so a gate whose inputs arrived after the wire to its
            // LED was already filled still updates that LED.
            curOut.instant = outV; curOut.rms = outV; curOut.isDC = true;
            changed = true;
          }
        }

        // 7-Segment Display (Common Cathode)
        if (comp.type === 'display_7seg') {
          const segs = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP'];
          comp.litSegs = {};
          for (const s of segs) {
            const pot = potentials.get(`${comp.id}:${s}`);
            comp.litSegs[s] = pot && pot.rms >= 2.0;
          }
        }

        // Capacitors (Transient Voltage State)
        if (comp.type === 'capacitor') {
          const p1 = `${comp.id}:1`;
          const p2 = `${comp.id}:2`;
          const pot1 = potentials.get(p1);
          const pot2 = potentials.get(p2);
          const vApplied = (pot1 ? pot1.rms : 0) - (pot2 ? pot2.rms : 0);
          const tau = comp.capacitance ? comp.capacitance * 1000 : 0.15;
          comp.vCap = (comp.vCap || 0) + (vApplied - (comp.vCap || 0)) * Math.min(1, dt / tau);
          if (pot1 && !pot2) {
            potentials.set(p2, { instant: pot1.instant - comp.vCap, rms: Math.max(0, pot1.rms - comp.vCap), isDC: pot1.isDC });
            changed = true;
          }
        }

        // Inductors (Transient Current Continuity)
        if (comp.type === 'inductor') {
          const p1 = `${comp.id}:1`;
          const p2 = `${comp.id}:2`;
          const pot1 = potentials.get(p1);
          const pot2 = potentials.get(p2);
          if (pot1 && !pot2) {
            potentials.set(p2, pot1);
            changed = true;
          } else if (pot2 && !pot1) {
            potentials.set(p1, pot2);
            changed = true;
          }
        }
      }

      // Propagate across external connecting wires
      for (const wire of this.wires) {
        const potFrom = potentials.get(wire.from);
        const potTo = potentials.get(wire.to);
        if (potFrom && !potTo) {
          potentials.set(wire.to, potFrom);
          changed = true;
        } else if (potTo && !potFrom) {
          potentials.set(wire.from, potTo);
          changed = true;
        }
      }
    }

    /*
     * Decide each contactor's armature position from the COMPLETED potentials.
     * It takes effect at the start of the next step (see above), giving the
     * coil circuit one armature delay - the same order a real contactor has.
     */
    for (const comp of this.components.values()) {
      if (comp.type !== 'contactor') continue;
      const potA1 = potentials.get(`${comp.id}:A1`);
      const potA2 = potentials.get(`${comp.id}:A2`);
      let coilVoltsRMS = 0;
      if (potA1 && potA2) {
        coilVoltsRMS = Math.abs(potA1.rms - potA2.rms);
        if (potA1.isDC !== potA2.isDC) coilVoltsRMS = potA1.rms; // Approximate reference
      } else if (potA1) {
        coilVoltsRMS = potA1.rms;
      } else if (potA2) {
        coilVoltsRMS = potA2.rms;
      }
      const threshold = comp.coilRatedVoltage ? comp.coilRatedVoltage * 0.75 : 180;
      comp._nextEnergized = coilVoltsRMS >= threshold;
    }

    // 3. Evaluate Loads: Motors, Pilot Lights, and Branch Currents
    for (const comp of this.components.values()) {
      // 3-Phase Induction Motor (M)
      if (comp.type === 'motor') {
        const potU = potentials.get(`${comp.id}:U1`);
        const potV = potentials.get(`${comp.id}:V1`);
        const potW = potentials.get(`${comp.id}:W1`);

        const hasU = potU && potU.rms > 100;
        const hasV = potV && potV.rms > 100;
        const hasW = potW && potW.rms > 100;

        if (hasU && hasV && hasW) {
          // Full 3-phase power present: motor accelerates towards nominal 1440 RPM
          comp.targetRpm = 1440;
          comp.running = true;
          comp.phaseLoss = false;
        } else if ((hasU && hasV) || (hasU && hasW) || (hasV && hasW)) {
          // Single-phasing fault: stalls and draws excessive current!
          comp.targetRpm = 0;
          comp.running = false;
          comp.phaseLoss = true;
        } else {
          comp.targetRpm = 0;
          comp.running = false;
          comp.phaseLoss = false;
        }

        // Smooth mechanical inertia
        comp.rpm = (comp.rpm || 0) + (comp.targetRpm - (comp.rpm || 0)) * 0.08;
        if (comp.rpm < 5) comp.rpm = 0;
      }

      // Pilot Indicator Light (HL)
      if (comp.type === 'pilot_light') {
        const pot1 = potentials.get(`${comp.id}:X1`);
        const pot2 = potentials.get(`${comp.id}:X2`);
        let vDrop = 0;
        if (pot1 && pot2) {
          vDrop = Math.abs(pot1.rms - pot2.rms);
        } else if (pot1) {
          vDrop = pot1.rms;
        }
        comp.lit = vDrop >= (comp.ratedVoltage ? comp.ratedVoltage * 0.7 : 180);
      }
    }

    // 4. Update wire current visualization magnitudes
    for (const wire of this.wires) {
      const pot1 = potentials.get(wire.from);
      const pot2 = potentials.get(wire.to);
      if (pot1) {
        wire.voltage = pot1.rms;
        // If wire is feeding an active load, assign realistic operating current
        wire.current = pot1.rms > 10 ? 2.8 : 0;
      } else {
        wire.voltage = 0;
        wire.current = 0;
      }
    }

    // 5. Update Digital Multimeter (DMM) Readout
    this.updateDMMReadout(potentials);

    // 6. Update Oscilloscope Trace Buffer
    if (this.scope.chA) {
      const pot = potentials.get(this.scope.chA);
      this.scope.historyA.push(pot ? pot.instant : 0);
      if (this.scope.historyA.length > this.scope.maxSamples) this.scope.historyA.shift();
    }
    if (this.scope.chB) {
      const pot = potentials.get(this.scope.chB);
      this.scope.historyB.push(pot ? pot.instant : 0);
      if (this.scope.historyB.length > this.scope.maxSamples) this.scope.historyB.shift();
    }
  }

  /**
   * Calculate real-time reading on the virtual DMM
   * @param {Map} potentials
   */
  updateDMMReadout(potentials) {
    const potRed = this.dmm.red ? potentials.get(this.dmm.red) : null;
    const potBlack = this.dmm.black ? potentials.get(this.dmm.black) : null;

    let vRed = potRed ? potRed.rms : 0;
    let vBlack = potBlack ? potBlack.rms : 0;
    let vDiff = Math.abs(vRed - vBlack);
    // A probe on a dead/unconnected port has NO potential, which is not the
    // same thing as a 0 V node. Treating the two alike made every pair of
    // isolated terminals read as a dead short in RES/CONT mode.
    const bothProbed = !!(this.dmm.red && this.dmm.black);
    const bothLive = !!(potRed && potBlack);

    // Calculate approximate branch current and power dissipation P = V * I
    const branchResistance = 35; // typical industrial load impedance (Ohms)
    const branchCurrent = vDiff > 0.5 ? vDiff / branchResistance : 0;
    this.dmm.powerWatts = Math.round(vDiff * branchCurrent * 10) / 10;
    this.dmm.overheatWarning = this.dmm.powerWatts > 120;

    switch (this.dmm.mode) {
      case 'VAC':
        this.dmm.reading = vDiff.toFixed(1);
        this.dmm.unit = 'V AC';
        break;
      case 'VDC':
        this.dmm.reading = (potRed && potRed.isDC ? vDiff : 0).toFixed(2);
        this.dmm.unit = 'V DC';
        break;
      case 'AAC':
        this.dmm.reading = (vDiff > 10 ? branchCurrent : 0).toFixed(2);
        this.dmm.unit = 'A AC';
        break;
      case 'ADC':
        this.dmm.reading = (potRed && potRed.isDC ? branchCurrent : 0).toFixed(2);
        this.dmm.unit = 'A DC';
        break;
      case 'WATT':
        this.dmm.reading = this.dmm.powerWatts.toFixed(1);
        this.dmm.unit = 'W (Power)';
        break;
      case 'RES':
        if (bothProbed) {
          if (this.dmm.red === this.dmm.black) {
            this.dmm.reading = '0.02';
          } else if (bothLive && vDiff === 0) {
            this.dmm.reading = '0.15';
          } else {
            this.dmm.reading = 'O.L';
          }
        } else {
          this.dmm.reading = 'O.L';
        }
        this.dmm.unit = 'Ω';
        break;
      case 'CONT':
        if (bothProbed && (this.dmm.red === this.dmm.black || (bothLive && vDiff === 0))) {
          this.dmm.reading = '0.0';
          this.audio.playContinuityBeep();
        } else {
          this.dmm.reading = 'O.L';
        }
        this.dmm.unit = 'Ω';
        break;
      default:
        this.dmm.reading = '0.0';
        this.dmm.unit = 'V';
        break;
    }
  }

  /**
   * Load Standard Industrial Circuit Preset: Direct-On-Line (DOL) Motor Starter
   */
  loadPresetDOL() {
    this.clear();

    // 1. Grid Power Source (3-Phase + N + PE)
    this.addComponent({
      id: 'L_GRID',
      type: 'power_source_3p',
      name: '400V 3Φ+N Grid',
      x: 60,
      y: 60
    });

    // 2. 3-Phase Circuit Breaker (QF1)
    this.addComponent({
      id: 'QF1',
      type: 'breaker',
      name: 'QF1 (3P 16A MCB)',
      closed: true,
      tripped: false,
      ratedCurrent: 16,
      x: 230,
      y: 60
    });

    // 3. Main Contactor (KM1)
    this.addComponent({
      id: 'KM1',
      type: 'contactor',
      name: 'KM1 (9A Contactor)',
      energized: false,
      coilRatedVoltage: 230,
      x: 420,
      y: 60
    });

    // 4. Thermal Overload Relay (FR1)
    this.addComponent({
      id: 'FR1',
      type: 'overload_relay',
      name: 'FR1 (Overload Relay)',
      tripped: false,
      ratedRange: '7-10A',
      x: 610,
      y: 60
    });

    // 5. 3-Phase Induction Motor (M1)
    this.addComponent({
      id: 'M1',
      type: 'motor',
      name: 'M1 (2.2kW 3Φ Motor)',
      rpm: 0,
      running: false,
      x: 800,
      y: 60
    });

    // 6. Pushbutton Station (SB1 Stop, SB2 Start)
    this.addComponent({
      id: 'SB1',
      type: 'pushbutton',
      name: 'SB1 (Stop Red NC)',
      pressed: false,
      buttonType: 'stop',
      x: 250,
      y: 330
    });

    this.addComponent({
      id: 'SB2',
      type: 'pushbutton',
      name: 'SB2 (Start Green NO)',
      pressed: false,
      buttonType: 'start',
      x: 420,
      y: 330
    });

    // 7. Pilot Lights
    this.addComponent({
      id: 'HL1',
      type: 'pilot_light',
      name: 'HL1 (Run Green)',
      color: '#107c41',
      lit: false,
      x: 630,
      y: 330
    });

    this.addComponent({
      id: 'HL2',
      type: 'pilot_light',
      name: 'HL2 (Trip Yellow)',
      color: '#ffb900',
      lit: false,
      x: 770,
      y: 330
    });

    // 8. Connect Main Power Circuit Wires
    // Grid -> QF1
    this.addWire('L_GRID:L1', 'QF1:1', '#8b4513'); // L1 Brown
    this.addWire('L_GRID:L2', 'QF1:3', '#201f1e'); // L2 Black
    this.addWire('L_GRID:L3', 'QF1:5', '#605e5c'); // L3 Grey
    // QF1 -> KM1
    this.addWire('QF1:2', 'KM1:1', '#8b4513');
    this.addWire('QF1:4', 'KM1:3', '#201f1e');
    this.addWire('QF1:6', 'KM1:5', '#605e5c');
    // KM1 -> FR1
    this.addWire('KM1:2', 'FR1:1', '#8b4513');
    this.addWire('KM1:4', 'FR1:3', '#201f1e');
    this.addWire('KM1:6', 'FR1:5', '#605e5c');
    // FR1 -> Motor M1
    this.addWire('FR1:2', 'M1:U1', '#8b4513');
    this.addWire('FR1:4', 'M1:V1', '#201f1e');
    this.addWire('FR1:6', 'M1:W1', '#605e5c');

    // 9. Connect Control Circuit Wires (DOL Self-Holding Latch)
    // Control Phase supply from QF1:2 to FR1:95 (NC overload contact)
    this.addWire('QF1:2', 'FR1:95', '#e81123'); // Control Red
    // From FR1:96 to SB1:1 (Stop Button NC input)
    this.addWire('FR1:96', 'SB1:1', '#e81123');
    // From SB1:2 to SB2:3 (Start Button NO input)
    this.addWire('SB1:2', 'SB2:3', '#e81123');
    // Auxiliary Self-Holding Contact KM1:13-14 in parallel with Start PB SB2:3-4
    this.addWire('SB2:3', 'KM1:13', '#e81123');
    this.addWire('SB2:4', 'KM1:14', '#e81123');
    // From SB2:4 / KM1:14 to Contactor Coil KM1:A1
    this.addWire('KM1:14', 'KM1:A1', '#e81123');
    // From Contactor Coil KM1:A2 to Grid Neutral
    this.addWire('KM1:A2', 'L_GRID:N', '#0078d4'); // Neutral Blue

    // Run Light HL1 in parallel with KM1 coil
    this.addWire('KM1:A1', 'HL1:X1', '#e81123');
    this.addWire('L_GRID:N', 'HL1:X2', '#0078d4');

    // Trip Light HL2 from FR1:98 (NO alarm contact)
    this.addWire('FR1:95', 'FR1:97', '#e81123'); // jumper to alarm pole
    this.addWire('FR1:98', 'HL2:X1', '#e81123');
    this.addWire('L_GRID:N', 'HL2:X2', '#0078d4');

    // Set initial DMM probe points
    this.dmm.red = 'KM1:A1';
    this.dmm.black = 'KM1:A2';
  }

  /**
   * Load Standard Industrial Circuit Preset: Forward-Reverse Interlock Starter
   */
  loadPresetForwardReverse() {
    this.clear();
    // Builds forward and reverse dual contactors KM1, KM2 with auxiliary NC cross-interlock
    this.loadPresetDOL(); // Base topology

    // Add Reverse Contactor KM2
    this.addComponent({
      id: 'KM2',
      type: 'contactor',
      name: 'KM2 (Reverse Contactor)',
      energized: false,
      coilRatedVoltage: 230,
      x: 420,
      y: 200
    });

    // Add Reverse Start Button SB3
    this.addComponent({
      id: 'SB3',
      type: 'pushbutton',
      name: 'SB3 (Start Rev NO)',
      pressed: false,
      buttonType: 'start',
      x: 520,
      y: 330
    });

    /*
     * Wire the reverse half. Until now this preset added the contactor and the
     * button and then stopped: choosing "Forward-Reverse Interlock" gave a DOL
     * starter with two unconnected parts, and nothing reversed or interlocked.
     */
    // Interlock: the forward coil now returns through KM2's NC aux contact
    // instead of straight to A1, so the two coils can never both pull in.
    this.wires = this.wires.filter((w) => !(
      (w.from === 'KM1:14' && w.to === 'KM1:A1') || (w.from === 'KM1:A1' && w.to === 'KM1:14')
    ));
    this.addWire('KM1:14', 'KM2:21', '#e81123');
    this.addWire('KM2:22', 'KM1:A1', '#e81123');

    // Reverse control circuit: same node after the Stop button, own start
    // button, own self-hold aux contact, and the forward contactor's NC in the
    // return path.
    this.addWire('SB2:3', 'SB3:3', '#e81123');
    this.addWire('SB3:3', 'KM2:13', '#e81123');
    this.addWire('SB3:4', 'KM2:14', '#e81123');
    this.addWire('KM2:14', 'KM1:21', '#e81123');
    this.addWire('KM1:22', 'KM2:A1', '#e81123');
    this.addWire('KM2:A2', 'L_GRID:N', '#0078d4');

    // Reverse main circuit: fed from the same breaker, L1/L2 swapped at the
    // motor so the field rotates the other way.
    this.addWire('QF1:2', 'KM2:1', '#8b4513');
    this.addWire('QF1:4', 'KM2:3', '#201f1e');
    this.addWire('QF1:6', 'KM2:5', '#605e5c');
    this.addWire('KM2:2', 'FR1:3', '#8b4513');
    this.addWire('KM2:4', 'FR1:1', '#201f1e');
    this.addWire('KM2:6', 'FR1:5', '#605e5c');
  }

  /**
   * Load Analog/Digital Preset: 555 Timer Astable LED Flasher
   */
  loadPreset555Flasher() {
    this.clear();
    this.addComponent({ id: 'VDC1', type: 'dc_supply', name: '9V Battery DC', x: 60, y: 80 });
    this.addComponent({ id: 'IC1', type: 'timer_555', name: 'NE555 Timer IC', period: 0.5, x: 260, y: 70 });
    this.addComponent({ id: 'LED1', type: 'led', name: 'LED1 (Red Pulse)', forwardVoltage: 1.8, color: '#ef4444', x: 460, y: 90 });
    this.addComponent({ id: 'C1', type: 'capacitor', name: 'C1 (10µF Timing)', capacitance: 0.00001, x: 260, y: 260 });
    this.addComponent({ id: 'R1', type: 'terminal_block', name: 'R1/R2 Resistor Array', x: 460, y: 260 });

    this.addWire('VDC1:+', 'IC1:8', '#e81123'); // VCC
    this.addWire('VDC1:-', 'IC1:1', '#0078d4'); // GND
    this.addWire('IC1:3', 'LED1:A', '#e81123'); // OUT -> LED Anode
    this.addWire('LED1:K', 'VDC1:-', '#0078d4'); // LED Cathode -> GND
    this.dmm.red = 'IC1:3';
    this.dmm.black = 'IC1:1';
  }

  /**
   * Load Analog Preset: LM741 Op-Amp Inverting Amplifier (10x Gain)
   */
  loadPresetOpAmp() {
    this.clear();
    this.addComponent({ id: 'VDC1', type: 'dc_supply', name: '±12V Dual Supply', x: 60, y: 80 });
    this.addComponent({ id: 'OA1', type: 'opamp', name: 'LM741 Op-Amp', configuredGain: 10, x: 280, y: 80 });
    // The button is the signal gate: pressing it feeds the supply into IN+
    // through its NO contact. Previously pressed:true used the NC contact and
    // port 1 was fed by nothing at all, so the amplifier input was floating at
    // 0 V and the preset could never show a gain or light its output LED.
    this.addComponent({ id: 'POT1', type: 'pushbutton', name: 'Input AC/DC Signal (1V)', pressed: false, x: 60, y: 260 });
    this.addComponent({ id: 'LED1', type: 'led', name: 'Output Saturation LED', forwardVoltage: 2.0, color: '#22c55e', x: 500, y: 90 });

    this.addWire('VDC1:+', 'OA1:V+', '#e81123');
    this.addWire('VDC1:-', 'OA1:V-', '#0078d4');
    this.addWire('VDC1:+', 'POT1:3', '#ffd94a');
    this.addWire('POT1:4', 'OA1:IN+', '#ffd94a');
    this.addWire('OA1:OUT', 'LED1:A', '#ffd94a');
    this.addWire('LED1:K', 'VDC1:-', '#0078d4');
    this.dmm.red = 'OA1:OUT';
    this.dmm.black = 'VDC1:-';
  }

  /**
   * Load Semiconductor Preset: BJT Common Emitter Switch
   */
  loadPresetBJT() {
    this.clear();
    this.addComponent({ id: 'VDC1', type: 'dc_supply', name: '12V DC Supply', x: 60, y: 80 });
    this.addComponent({ id: 'Q1', type: 'bjt_npn', name: '2N3904 NPN BJT', x: 290, y: 90 });
    this.addComponent({ id: 'SW1', type: 'pushbutton', name: 'Base Trigger Switch', pressed: false, x: 100, y: 260 });
    this.addComponent({ id: 'LED1', type: 'led', name: 'Collector Load LED', forwardVoltage: 1.8, color: '#3b82f6', x: 500, y: 90 });

    this.addWire('VDC1:+', 'LED1:A', '#e81123');
    this.addWire('LED1:K', 'Q1:C', '#e81123');
    this.addWire('Q1:E', 'VDC1:-', '#0078d4');
    this.addWire('SW1:2', 'Q1:B', '#ffd94a');
    this.addWire('VDC1:+', 'SW1:1', '#e81123');
    this.dmm.red = 'Q1:C';
    this.dmm.black = 'Q1:E';
  }

  /**
   * Load Digital Logic Preset: Full Adder Circuit
   */
  loadPresetLogicAdder() {
    this.clear();
    this.addComponent({ id: 'VDC1', type: 'dc_supply', name: '5V VCC Supply', x: 50, y: 60 });
    this.addComponent({ id: 'IN_A', type: 'pushbutton', name: 'Bit Input A', pressed: true, x: 50, y: 190 });
    this.addComponent({ id: 'IN_B', type: 'pushbutton', name: 'Bit Input B', pressed: false, x: 50, y: 310 });
    this.addComponent({ id: 'G_XOR', type: 'logic_gate', gateType: 'XOR', name: 'XOR (Sum Bit)', x: 280, y: 120 });
    this.addComponent({ id: 'G_AND', type: 'logic_gate', gateType: 'AND', name: 'AND (Carry Bit)', x: 280, y: 280 });
    this.addComponent({ id: 'LED_S', type: 'led', name: 'Sum Output LED', color: '#22c55e', x: 500, y: 120 });
    this.addComponent({ id: 'LED_C', type: 'led', name: 'Carry Output LED', color: '#ef4444', x: 500, y: 280 });

    // The input buttons are logic levels: pressed = 1. Their NO contact (3-4)
    // is the one that closes when pressed - wiring 1-2 used the NC contact, so
    // pressing a bit DISCONNECTED it and neither LED could ever light.
    this.addWire('VDC1:+', 'IN_A:3', '#e81123');
    this.addWire('VDC1:+', 'IN_B:3', '#e81123');
    this.addWire('IN_A:4', 'G_XOR:A', '#ffd94a');
    this.addWire('IN_A:4', 'G_AND:A', '#ffd94a');
    this.addWire('IN_B:4', 'G_XOR:B', '#00e5ff');
    this.addWire('IN_B:4', 'G_AND:B', '#00e5ff');
    this.addWire('G_XOR:Y', 'LED_S:A', '#22c55e');
    this.addWire('G_AND:Y', 'LED_C:A', '#ef4444');
    this.addWire('LED_S:K', 'VDC1:-', '#0078d4');
    this.addWire('LED_C:K', 'VDC1:-', '#0078d4');
    this.dmm.red = 'G_XOR:Y';
    this.dmm.black = 'VDC1:-';
  }

  /**
   * Load Rectifier Preset: Bridge Rectifier & RC Filter
   */
  loadPresetBridgeRectifier() {
    this.clear();
    this.addComponent({ id: 'AC1', type: 'power_source_1p', name: '230V AC Mains', x: 60, y: 80 });
    this.addComponent({ id: 'D1', type: 'diode', name: '1N4007 Bridge D1', x: 260, y: 80 });
    this.addComponent({ id: 'D2', type: 'diode', name: '1N4007 Bridge D2', x: 260, y: 200 });
    this.addComponent({ id: 'C1', type: 'capacitor', name: '470µF Filter Cap', capacitance: 0.00047, x: 420, y: 140 });
    this.addComponent({ id: 'HL1', type: 'pilot_light', name: 'DC Output Lamp', ratedVoltage: 24, x: 600, y: 140 });

    this.addWire('AC1:L', 'D1:A', '#8b4513');
    this.addWire('D1:K', 'C1:1', '#e81123');
    this.addWire('C1:1', 'HL1:X1', '#e81123');
    this.addWire('C1:2', 'AC1:N', '#0078d4');
    this.addWire('HL1:X2', 'AC1:N', '#0078d4');
    this.dmm.red = 'C1:1';
    this.dmm.black = 'C1:2';
  }

  /**
   * Generate Bill of Materials (BOM) Table
   * @returns {string} Markdown table
   */
  generateBOM() {
    let md = '| Ref Des | Component Description | Specs & Rating | Status |\n';
    md += '| :--- | :--- | :--- | :--- |\n';
    for (const comp of this.components.values()) {
      let status = 'Standby';
      if (comp.type === 'breaker') status = comp.closed ? 'CLOSED (ON)' : 'OPEN (OFF)';
      else if (comp.type === 'contactor') status = comp.energized ? 'ENERGIZED (ON)' : 'DROPPED OUT';
      else if (comp.type === 'motor') status = comp.running ? `RUNNING (${Math.round(comp.rpm)} RPM)` : 'STOPPED';
      else if (comp.type === 'pilot_light') status = comp.lit ? 'ILLUMINATED' : 'OFF';

      md += `| **${comp.id}** | ${comp.name} | ${comp.ratedRange || comp.ratedCurrent || comp.coilRatedVoltage || 'Standard'} | \`${status}\` |\n`;
    }
    return md;
  }
}
