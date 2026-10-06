import { CurveConfig } from './Curves';

export type ToolType = 'AXE' | 'PICKAXE' | 'SWORD' | 'BOW';
export type ItemType = 'APPLE' | 'WRENCH' | 'REVIVE';
export type ResourceType = 'WOOD' | 'STONE' | 'GOLD';
export type BuildingType = 'WALL' | 'TURRET' | 'MINER';

export interface ResourceCost {
  wood: number;
  stone: number;
  gold: number;
}

export interface PlayerStats {
  maxHealth: number;
  passiveHealSpeed: number;
  bodyDamage: number;
  movementSpeed: number;
  attackSpeed: number;
  mineSpeed: number;
}

export interface ToolConfig {
  baseDamage: number;
  attackRange: number;
  cooldownMs: number;
  multipliers: {
    attack: number;
    wood: number;
    stone: number;
    gold: number;
  };
  statCurve: CurveConfig;
  costCurve: CurveConfig;
  baseCost: ResourceCost;
}

export interface BowConfig extends ToolConfig {
  projectileSpeed: number;
  maxRange: number;
  arrowMaxCount: number;
  arrowRegenSeconds: number;
}

export interface BuildingConfigItem {
  baseHealth: number;
  radius: number;
  baseCost: ResourceCost;
  costCurve: CurveConfig;
  statCurve: CurveConfig;
  repairCostPerHp: {
    wood: number;
    stone: number;
  };
  // Specific to turret
  attackDamage?: number;
  attackRange?: number;
  attackRateMs?: number;
  // Specific to miner
  productionIntervalMs?: number;
  productionAmount?: number;
}

export interface VisualUpgradeConfig {
  hueShiftRate: number; // degrees per level
  saturationRamp: number;
  brightnessRamp: number;
  glintIntensityCurve: CurveConfig;
  glowIntensityCurve: CurveConfig;
}

export interface WorldScalingConfig {
  baseWidth: number;
  baseHeight: number;
  playerCountMultiplier: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

export interface ResourceSpawnConfig {
  treeRatio: number;
  stoneRatio: number;
  goldRatio: number;
  densityPerSquareUnit: number; // spawns per 1,000,000 px^2
  minSpacing: number;
  respawnIntervalMs: number;
  maxNaturalObjects: number;
}

export interface ZombieConfig {
  baseHealth: number;
  movementSpeed: number;
  attackDamage: number;
  attackRange: number;
  attackCooldownMs: number;
  spawnIntervalMs: number;
  maxActiveZombies: number;
  dropChance: number;
}

export interface GameConfig {
  world: WorldScalingConfig;
  player: PlayerStats;
  resources: ResourceSpawnConfig;
  tools: {
    AXE: ToolConfig;
    PICKAXE: ToolConfig;
    SWORD: ToolConfig;
    BOW: BowConfig;
  };
  buildings: Record<BuildingType, BuildingConfigItem>;
  items: {
    APPLE: { healAmount: number; cooldownMs: number };
    WRENCH: { repairRange: number; repairAmount: number; cooldownMs: number };
    REVIVE: { reviveRange: number; reviveHealthPercent: number; cooldownMs: number };
  };
  visualUpgrade: VisualUpgradeConfig;
  zombie: ZombieConfig;
  combat: {
    knockbackStrength: number;
    invulnerabilityWindowMs: number;
  };
  limits: {
    maxBuildingsPerPlayer: number;
    maxProjectiles: number;
  };
}
