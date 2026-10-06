import { GameConfig } from './GameConfig';

export const DEFAULT_GAME_CONFIG: GameConfig = {
  world: {
    baseWidth: 2600,
    baseHeight: 2600,
    playerCountMultiplier: 1.35,
    minWidth: 2200,
    maxWidth: 6000,
    minHeight: 2200,
    maxHeight: 6000,
  },
  player: {
    maxHealth: 100,
    passiveHealSpeed: 2.0, // HP per second
    bodyDamage: 5,
    movementSpeed: 260, // pixels per sec
    attackSpeed: 1.0,
    mineSpeed: 1.0,
  },
  resources: {
    treeRatio: 0.50,
    stoneRatio: 0.35,
    goldRatio: 0.15,
    densityPerSquareUnit: 35, // per 1M pixels
    minSpacing: 90,
    respawnIntervalMs: 8000,
    maxNaturalObjects: 120,
  },
  tools: {
    AXE: {
      baseDamage: 25,
      attackRange: 75,
      cooldownMs: 380,
      multipliers: {
        attack: 0.8,
        wood: 3.0,
        stone: 0.3,
        gold: 0.3,
      },
      statCurve: { type: 'polynomial', exponent: 1.3, factor: 0.25 },
      costCurve: { type: 'exponential', rate: 1.6 },
      baseCost: { wood: 40, stone: 15, gold: 0 },
    },
    PICKAXE: {
      baseDamage: 20,
      attackRange: 70,
      cooldownMs: 400,
      multipliers: {
        attack: 0.7,
        wood: 0.4,
        stone: 3.2,
        gold: 3.0,
      },
      statCurve: { type: 'polynomial', exponent: 1.3, factor: 0.25 },
      costCurve: { type: 'exponential', rate: 1.6 },
      baseCost: { wood: 25, stone: 40, gold: 0 },
    },
    SWORD: {
      baseDamage: 38,
      attackRange: 85,
      cooldownMs: 320,
      multipliers: {
        attack: 2.5,
        wood: 0.2,
        stone: 0.2,
        gold: 0.2,
      },
      statCurve: { type: 'polynomial', exponent: 1.35, factor: 0.28 },
      costCurve: { type: 'exponential', rate: 1.7 },
      baseCost: { wood: 30, stone: 30, gold: 20 },
    },
    BOW: {
      baseDamage: 32,
      attackRange: 420,
      cooldownMs: 500,
      multipliers: {
        attack: 2.0,
        wood: 0.1,
        stone: 0.1,
        gold: 0.1,
      },
      statCurve: { type: 'polynomial', exponent: 1.35, factor: 0.28 },
      costCurve: { type: 'exponential', rate: 1.75 },
      baseCost: { wood: 50, stone: 20, gold: 30 },
      projectileSpeed: 620,
      maxRange: 550,
      arrowMaxCount: 30,
      arrowRegenSeconds: 1.5,
    },
  },
  buildings: {
    WALL: {
      baseHealth: 300,
      radius: 36,
      baseCost: { wood: 25, stone: 15, gold: 0 },
      costCurve: { type: 'exponential', rate: 1.5 },
      statCurve: { type: 'linear', factor: 0.45 },
      repairCostPerHp: { wood: 0.05, stone: 0.03 },
    },
    TURRET: {
      baseHealth: 200,
      radius: 38,
      baseCost: { wood: 50, stone: 50, gold: 35 },
      costCurve: { type: 'exponential', rate: 1.65 },
      statCurve: { type: 'polynomial', exponent: 1.3, factor: 0.3 },
      repairCostPerHp: { wood: 0.08, stone: 0.08 },
      attackDamage: 22,
      attackRange: 320,
      attackRateMs: 650,
    },
    MINER: {
      baseHealth: 100, // Very low HP as specified
      radius: 40,
      baseCost: { wood: 60, stone: 40, gold: 20 },
      costCurve: { type: 'exponential', rate: 1.6 },
      statCurve: { type: 'linear', factor: 0.35 },
      repairCostPerHp: { wood: 0.1, stone: 0.1 },
      productionIntervalMs: 2500,
      productionAmount: 4,
    },
  },
  items: {
    APPLE: {
      healAmount: 35,
      cooldownMs: 800,
    },
    WRENCH: {
      repairRange: 90,
      repairAmount: 60,
      cooldownMs: 400,
    },
    REVIVE: {
      reviveRange: 100,
      reviveHealthPercent: 0.5,
      cooldownMs: 2000,
    },
  },
  visualUpgrade: {
    hueShiftRate: 42, // shifts hue by ~42 deg each level for distinct gleaming progression
    saturationRamp: 0.06,
    brightnessRamp: 0.07,
    glintIntensityCurve: { type: 'polynomial', exponent: 1.2, factor: 0.2 },
    glowIntensityCurve: { type: 'linear', factor: 0.25 },
  },
  zombie: {
    baseHealth: 75,
    movementSpeed: 130,
    attackDamage: 12,
    attackRange: 45,
    attackCooldownMs: 900,
    spawnIntervalMs: 7000,
    maxActiveZombies: 25,
    dropChance: 0.7,
  },
  combat: {
    knockbackStrength: 180,
    invulnerabilityWindowMs: 180,
  },
  limits: {
    maxBuildingsPerPlayer: 60,
    maxProjectiles: 150,
  },
};
