export interface KeyBindings {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
  attack: string[];
  slot1: string[];
  slot2: string[];
  slot3: string[];
  slot4: string[];
  slot5: string[];
  slot6: string[];
  slot7: string[];
  slot8: string[];
  slot9: string[];
  slot0: string[];
  upgrade: string[];
  cycleMiner: string[];
  debugToggle: string[];
}

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  attack: ['Space'],
  slot1: ['Digit1'],
  slot2: ['Digit2'],
  slot3: ['Digit3'],
  slot4: ['Digit4'],
  slot5: ['Digit5'],
  slot6: ['Digit6'],
  slot7: ['Digit7'],
  slot8: ['Digit8'],
  slot9: ['Digit9'],
  slot0: ['Digit0'],
  upgrade: ['KeyU', 'KeyE'],
  cycleMiner: ['KeyR'],
  debugToggle: ['Backquote', 'F1'],
};
