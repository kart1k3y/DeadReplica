import { GameCommand } from '../game/commands/GameCommand';
import { GameConfig } from '../game/config/GameConfig';
import { GameState } from '../game/state/GameState';
import { StateUpdate } from '../game/state/StateUpdate';

export interface GameDriver {
  sendCommand(command: GameCommand): void;
  getState(): GameState;
  applyStateUpdate(update: StateUpdate): void;
  initializeConfig(config: GameConfig): void;
  getConfig(): GameConfig;
  subscribe(listener: (state: GameState) => void): () => void;
}
