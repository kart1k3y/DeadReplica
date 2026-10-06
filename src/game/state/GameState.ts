import {
  BuildingState,
  DroppedItemState,
  EntityId,
  PlayerState,
  ProjectileState,
  WorldObjectState,
  WorldState,
  ZombieState,
} from '../entities/EntityTypes';

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number; // 0 to 1
  maxLife: number;
}

export interface GameState {
  world: WorldState;
  players: Map<EntityId, PlayerState>;
  zombies: Map<EntityId, ZombieState>;
  objects: Map<EntityId, WorldObjectState>;
  buildings: Map<EntityId, BuildingState>;
  projectiles: Map<string, ProjectileState>;
  droppedItems: Map<string, DroppedItemState>;
  floatingTexts: FloatingText[];
}

export function createEmptyGameState(width = 2600, height = 2600, playerCount = 1): GameState {
  return {
    world: {
      width,
      height,
      playerCount,
      timeOfDay: 12.0, // High noon garden sun
    },
    players: new Map(),
    zombies: new Map(),
    objects: new Map(),
    buildings: new Map(),
    projectiles: new Map(),
    droppedItems: new Map(),
    floatingTexts: [],
  };
}
