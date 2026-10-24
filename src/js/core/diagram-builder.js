/**
 * @file diagram-builder.js
 * @description Visual Builder for Mermaid Diagrams & Industrial Relay Ladder Logic (GazBoard Phase 4 / v6.4.0)
 *
 * Implements Document 6 Section 8.1:
 * - Visual Form Assistant for Process Blocks, Decision Diamonds, Summing Junctions, and Transfer Functions
 * - Industrial Relay Ladder Logic (RLL) Generator: DOL starter rungs, interlocks, timer relays
 * - 1-Click insertion as Markdown / KaTeX cards on the whiteboard canvas
 */

import { t } from '../i18n.js';

export const LADDER_PRESETS = [
  {
    id: 'dol_latch',
    title: 'DOL Self-Holding Latch Rung',
    description: 'Stop PB (NC) in series with parallel Start PB (NO) and Contactor Aux (NO 13-14), feeding Coil KM1.',
    diagram: `|---[ SB1:Stop NC ]---+---[ SB2:Start NO ]---+---( KM1:Coil )---|
|                     |                      |
|                     +---[ KM1:13-14 NO ]---+`
  },
  {
    id: 'interlock',
    title: 'Forward / Reverse Electrical Interlock Rungs',
    description: 'Mutual NC cross-interlocking between KM1 and KM2 preventing phase dead-shorts.',
    diagram: `|---[ SB1:Stop ]---[ SB2:Fwd ]---[ KM2:21-22 NC ]---( KM1:Fwd Coil )---|
|---[ SB1:Stop ]---[ SB3:Rev ]---[ KM1:21-22 NC ]---( KM2:Rev Coil )---|`
  },
  {
    id: 'star_delta',
    title: 'Star-Delta (Y-Δ) Timer Transition Rung',
    description: 'On-delay timer relay KT1 energizes Star KM3 first, then cuts KM3 and locks Delta KM2.',
    diagram: `|---[ Start ]---+---( KM1:Main )---|
|               +---( KT1:Timer )--|
|---[ KT1:NC ]------( KM3:Star )---|
|---[ KT1:NO ]------( KM2:Delta )--|`
  },
  {
    id: 'estop_safety',
    title: 'Emergency Stop & Safety Relay Rung',
    description: 'Dual-channel E-Stop with manual reset pushbutton monitoring.',
    diagram: `|---[ E-STOP 1 ]---[ E-STOP 2 ]---+---[ Reset PB ]---( K1:Safety Coil )---|
|                                 +---[ K1:Aux NO ]----+`
  }
];

export const MERMAID_PRESETS = [
  {
    id: 'control_loop',
    title: 'Closed-Loop PID Control System',
    type: 'flowchart',
    code: `graph LR
    R[Reference Input r\\(t\\)] --> E((+ -))
    E -->|Error e\\(t\\)| C[PID Controller]
    C -->|Control u\\(t\\)| P[Plant / Motor]
    P -->|Output y\\(t\\)| S[Sensor / Encoder]
    S -->|-Feedback| E`
  },
  {
    id: 'state_machine',
    title: 'Industrial Motor State Machine',
    type: 'state',
    code: `stateDiagram-v2
    [*] --> Standby
    Standby --> Starting: Start PB Pressed [QF ON]
    Starting --> Running: Auxiliary Latch KM1:13-14
    Running --> Tripped: Overcurrent I > 10A [FR1 Trip]
    Running --> Standby: Stop PB Pressed
    Tripped --> Standby: Manual Blue Reset Button`
  },
  {
    id: 'dol_sequence',
    title: 'Direct-On-Line Sequence Diagram',
    type: 'sequence',
    code: `sequenceDiagram
    autonumber
    actor Operator
    participant SB2 as Start Button
    participant KM1 as Contactor Coil
    participant Aux as KM1 Aux (13-14)
    participant M as 3Φ Motor
    Operator->>SB2: Press Start (NO Closes)
    SB2->>KM1: Energize 230V Coil (A1-A2)
    KM1->>Aux: Close 13-14 (Self-Holding)
    KM1->>M: Close Main Poles (1-2, 3-4, 5-6)
    M-->>Operator: Motor Spins at 1440 RPM`
  }
];

/**
 * Visual Form Assistant for generating customized Mermaid Block Diagrams
 */
export class VisualDiagramBuilder {
  /**
   * Builds Mermaid Flowchart code from node and connection definitions
   * @param {Array<{id: string, label: string, shape: string}>} nodes
   * @param {Array<{from: string, to: string, text: string}>} links
   * @param {'LR'|'TD'} direction
   */
  static buildFlowchart(nodes = [], links = [], direction = 'LR') {
    let out = `graph ${direction}\n`;
    for (const node of nodes) {
      const id = node.id || 'N';
      const label = node.label || id;
      switch (node.shape) {
        case 'round':
          out += `    ${id}("${label}")\n`;
          break;
        case 'diamond':
          out += `    ${id}{"${label}"}\n`;
          break;
        case 'circle':
          out += `    ${id}(("${label}"))\n`;
          break;
        case 'subroutine':
          out += `    ${id}[["${label}"]]\n`;
          break;
        default:
          out += `    ${id}["${label}"]\n`;
          break;
      }
    }
    for (const link of links) {
      if (link.text) {
        out += `    ${link.from} -->|"${link.text}"| ${link.to}\n`;
      } else {
        out += `    ${link.from} --> ${link.to}\n`;
      }
    }
    return out;
  }
}
