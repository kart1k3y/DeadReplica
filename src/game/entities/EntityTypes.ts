import { BuildingType, ItemType, ResourceType, ToolType } from '../config/GameConfig';
export type { BuildingType, ItemType, ResourceType, ToolType };

export type EntityId = string;

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface CircleHitbox {
  type: 'circle';
  radius: number;
}

export interface Inventory {
  wood: number;
  stone: number;
  gold: number;
  arrows: number;
  apples: number;
  wrenches: number;
  revives: number;
}

export interface ToolItemState {
  type: ToolType;
  level: number;
}

export type ActiveSlotType =
  | { kind: 'tool'; tool: ToolType }
  | { kind: 'item'; item: ItemType }
  | { kind: 'building'; building: BuildingType; minerResource?: ResourceType };

export interface BaseEntityState {
  id: EntityId;
  position: Position;
  rotation: number; // in radians
  hitbox: CircleHitbox;
  health: number;
  maxHealth: number;
  isDead: boolean;
}

export interface PlayerState extends BaseEntityState {
  name: string;
  color: string;
  velocity: Velocity;
  inventory: Inventory;
  activeSlot: ActiveSlotType;
  toolLevels: Record<ToolType, number>;
  // Animation / Action state
  isAttacking: boolean;
  attackCooldown: number; // ms remaining
  attackProgress: number; // 0 to 1 during swing
  damageFlashTime: number; // ms remaining for flash effect
  deathTimer?: number;
}

export interface ZombieState extends BaseEntityState {
  velocity: Velocity;
  targetPlayerId?: string;
  heldTool: ToolType;
  upgradeLevel: number;
  isAttacking: boolean;
  attackCooldown: number;
  attackProgress: number;
  damageFlashTime: number;
}

export type WorldObjectType = 'TREE' | 'STONE' | 'GOLD';

export interface WorldObjectState extends BaseEntityState {
  type: WorldObjectType;
  resourceType: ResourceType;
  resourceYield: number;
  scale: number;
  damageFlashTime: number;
}

export interface BuildingState extends BaseEntityState {
  type: BuildingType;
  ownerPlayerId: string;
  upgradeLevel: number;
  damageFlashTime: number;
  // Specific to turret
  turretAngle?: number;
  lastTargetId?: string;
  turretCooldown?: number;
  // Specific to miner
  minerResource?: ResourceType;
  minerCooldown?: number;
  totalProduced?: number;
}

export interface ProjectileState {
  id: string;
  sourceEntityId: string;
  sourceType: 'player' | 'zombie' | 'turret';
  position: Position;
  velocity: Velocity;
  damage: number;
  distanceTraveled: number;
  maxRange: number;
  hitbox: CircleHitbox;
}

export interface DroppedItemState {
  id: string;
  position: Position;
  resourceType?: ResourceType;
  itemType?: ItemType;
  amount: number;
  lifetime: number; // seconds left
}

export interface WorldState {
  width: number;
  height: number;
  playerCount: number;
  timeOfDay: number; // 0 to 24h cycle for gentle atmosphere
}
