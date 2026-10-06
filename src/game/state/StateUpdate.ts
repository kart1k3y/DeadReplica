import {
  BuildingState,
  DroppedItemState,
  EntityId,
  PlayerState,
  Position,
  ProjectileState,
  WorldObjectState,
  WorldState,
  ZombieState,
} from '../entities/EntityTypes';

export type StateUpdate =
  | { type: 'SNAPSHOT'; state: Partial<WorldState> }
  | { type: 'PLAYER_SPAWN'; player: PlayerState }
  | { type: 'PLAYER_UPDATE'; playerId: EntityId; patch: Partial<PlayerState> }
  | { type: 'PLAYER_REMOVE'; playerId: EntityId }
  | { type: 'ZOMBIE_SPAWN'; zombie: ZombieState }
  | { type: 'ZOMBIE_UPDATE'; zombieId: EntityId; patch: Partial<ZombieState> }
  | { type: 'ZOMBIE_REMOVE'; zombieId: EntityId }
  | { type: 'OBJECT_SPAWN'; object: WorldObjectState }
  | { type: 'OBJECT_UPDATE'; objectId: EntityId; patch: Partial<WorldObjectState> }
  | { type: 'OBJECT_REMOVE'; objectId: EntityId }
  | { type: 'BUILDING_SPAWN'; building: BuildingState }
  | { type: 'BUILDING_UPDATE'; buildingId: EntityId; patch: Partial<BuildingState> }
  | { type: 'BUILDING_REMOVE'; buildingId: EntityId }
  | { type: 'PROJECTILE_SPAWN'; projectile: ProjectileState }
  | { type: 'PROJECTILE_REMOVE'; projectileId: string }
  | { type: 'ITEM_SPAWN'; item: DroppedItemState }
  | { type: 'ITEM_REMOVE'; itemId: string }
  | { type: 'GENERIC_ENTITY_UPDATE'; entityId: EntityId; patch: { x?: number; y?: number; health?: number; [key: string]: any } };
