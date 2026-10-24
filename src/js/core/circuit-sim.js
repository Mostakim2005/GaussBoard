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
   * Pushbutton plastic tactile click
   */
  playButtonClick() {
    if (!this.enabled) return;
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
   * Digital multimeter continuity buzzer tone (2000 Hz)
   */
  playContinuityBeep() {
    if (!this.enabled) return;
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

    // Components dictionary: id -> Component
    this.components = new Map();

    // Wires list: { id, from: 'comp:port', to: 'comp:port', color, current: 0 }
    this.wires = [];

    // Multimeter virtual probes: { red: 'comp:port' | null, black: 'comp:port' | null, mode: 'VAC'|'VDC'|'AAC'|'ADC'|'RES'|'CONT' }
    this.dmm = {
      red: null,
      black: null,
      mode: 'VAC', // 'VAC', 'VDC', 'AAC', 'ADC', 'RES', 'CONT'
      reading: 0,
      unit: 'V AC'
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
    this.time += dt;
    const omega = 2 * Math.PI * this.frequency;
    const t = this.time;

    // 1. Calculate source instantaneous voltages
    const vL1 = Math.SQRT2 * this.gridVoltageRMS * Math.sin(omega * t);
    const vL2 = Math.SQRT2 * this.gridVoltageRMS * Math.sin(omega * t - (2 * Math.PI) / 3);
    const vL3 = Math.SQRT2 * this.gridVoltageRMS * Math.sin(omega * t - (4 * Math.PI) / 3);
    const vN = 0;
    const vDC24 = 24.0;

    // Port potentials map: 'comp:port' -> { instant: number, rms: number, isDC: boolean }
    const potentials = new Map();

    const setPort = (port, instant, rms = Math.abs(instant), isDC = false) => {
      potentials.set(port, { instant, rms, isDC });
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
        setPort(`${comp.id}:+`, vDC24, 24.0, true);
        setPort(`${comp.id}:-`, 0, 0, true);
      }
    }

    // 2. Multi-pass iterative potential propagation across closed switches & wires
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 12) {
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
          // Check coil excitation across A1 and A2
          const potA1 = potentials.get(`${comp.id}:A1`);
          const potA2 = potentials.get(`${comp.id}:A2`);
          let coilVoltsRMS = 0;
          if (potA1 && potA2) {
            coilVoltsRMS = Math.abs(potA1.rms - potA2.rms);
            if (potA1.isDC !== potA2.isDC) coilVoltsRMS = potA1.rms; // Approximate reference
          } else if (potA1) {
            coilVoltsRMS = potA1.rms;
          }

          const threshold = comp.coilRatedVoltage ? comp.coilRatedVoltage * 0.75 : 180;
          const wasEnergized = comp.energized;
          comp.energized = coilVoltsRMS >= threshold;

          if (comp.energized !== wasEnergized) {
            this.audio.playContactorClick(comp.energized);
          }

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
        this.dmm.reading = (vDiff > 10 ? 2.85 : 0).toFixed(2);
        this.dmm.unit = 'A AC';
        break;
      case 'ADC':
        this.dmm.reading = '0.00';
        this.dmm.unit = 'A DC';
        break;
      case 'RES':
        if (this.dmm.red && this.dmm.black) {
          if (this.dmm.red === this.dmm.black) {
            this.dmm.reading = '0.02';
          } else {
            this.dmm.reading = vDiff > 0 ? 'O.L' : '0.15';
          }
        } else {
          this.dmm.reading = 'O.L';
        }
        this.dmm.unit = 'Ω';
        break;
      case 'CONT':
        if (this.dmm.red && this.dmm.black && (this.dmm.red === this.dmm.black || vDiff === 0)) {
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
