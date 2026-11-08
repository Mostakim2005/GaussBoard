/**
 * Hold / Long-Press Gesture Manager
 *
 * Centralized arbitration for competing dwell/hold gestures in GaussBoard:
 * - Domain Component Interaction (Circuit workbench, answer covers) takes Priority 1.
 * - Inking travel detection (> HOLD_TRAVEL = 18px) guarantees active handwriting is never interrupted.
 * - Split Dual-Timer Architecture:
 *   1. Stationary Hold Timer (starts on pointerdown, aborted if path > 18px):
 *      Triggers Component Modal, Study Cover Inspect, Radial Ring, or Context Menu.
 *   2. Post-Stroke Dwell Timer (starts on pointermove pause after path >= 24px):
 *      Triggers holdToShape exclusively.
 * - Hardware role separation: Stylus on empty canvas triggers Radial Shortcut Ring;
 *   Mouse triggers standard context menu.
 */

export class HoldGestureManager {
  constructor(app, interaction = null) {
    this.app = app;
    this.interaction = interaction;
  }

  get mode() {
    return this.app.settings?.holdGestureMode || 'radial';
  }

  setMode(nextMode) {
    const validModes = ['radial', 'classic', 'off'];
    const chosen = validModes.includes(nextMode) ? nextMode : 'radial';
    this.app.settings.holdGestureMode = chosen;
    this.app.saveSettings();
    return chosen;
  }

  cycleMode() {
    const modes = ['radial', 'classic', 'off'];
    const cur = this.mode;
    const next = modes[(modes.indexOf(cur) + 1) % modes.length];
    return this.setMode(next);
  }

  /**
   * Determine whether a stationary pointer-down dwell should open a hold menu or trigger an action.
   * Returns: { type: 'radial' | 'context' | 'component' | 'cover' | 'none', target?: any, wp?: any, sp?: any }
   */
  evaluateHold(e, wp, sp) {
    if (this.app.viewMode) return { type: 'none' };
    if (this.mode === 'off') return { type: 'none' };

    // 1. Check if pointer is over an interactive circuit terminal or component (Priority 1)
    const circuitComp = (this.app.circuitWorkbench?.isOpen && this.app.circuitWorkbench?.hitComponent?.(wp))
      || (this.app.circuitWorkbenchModal?.isOpen && this.app.circuitWorkbenchModal?.hitComponent?.(wp))
      || this.app.hitCircuitComponent?.(wp)
      || this.interaction?.hitCircuitComponent?.(wp);
    if (circuitComp) {
      return { type: 'component', target: circuitComp };
    }

    // 2. Check if pointer is over a study cover or tape (Priority 1)
    const cover = this.interaction?.hitCover?.(wp) || this.app.hitCover?.(wp);
    if (cover) {
      return { type: 'cover', target: cover };
    }

    // 3. Empty board hold: evaluate based on hardware pointer type
    const isPen = e.pointerType === 'pen';
    if (isPen) {
      if (this.mode === 'radial') {
        return { type: 'radial', wp, sp };
      } else {
        return { type: 'context', wp, sp };
      }
    } else {
      // Mouse or Touch on empty canvas gets classic context menu
      return { type: 'context', wp, sp };
    }
  }
}
