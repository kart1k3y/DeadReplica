import { BuildingConfigItem, BuildingType, GameConfig, ResourceType } from '../config/GameConfig';
import { evaluateCurve } from '../config/Curves';
import { BuildingState, EntityId, PlayerState, Position } from '../entities/EntityTypes';
import { FloatingText, GameState } from '../state/GameState';

export class BuildingSystem {
  private config: GameConfig;
  private nextBuildingId = 1;
  private nextFloatingTextId = 1;

  constructor(config: GameConfig) {
    this.config = config;
  }

  public setConfig(config: GameConfig): void {
    this.config = config;
  }

  private addFloatingText(state: GameState, text: string, x: number, y: number, color: string): void {
    const ft: FloatingText = {
      id: `build-ft-${this.nextFloatingTextId++}`,
      text,
      x,
      y: y - 15,
      color,
      life: 0.9,
      maxLife: 0.9,
    };
    state.floatingTexts.push(ft);
  }

  public getBuildingCost(type: BuildingType, level: number = 1): { wood: number; stone: number; gold: number } {
    const bConfig = this.config.buildings[type];
    const wood = Math.round(evaluateCurve(bConfig.baseCost.wood, level, bConfig.costCurve));
    const stone = Math.round(evaluateCurve(bConfig.baseCost.stone, level, bConfig.costCurve));
    const gold = Math.round(evaluateCurve(bConfig.baseCost.gold, level, bConfig.costCurve));
    return { wood, stone, gold };
  }

  /**
   * Validates if a building can be placed at the given continuous position
   */
  public validatePlacement(
    state: GameState,
    type: BuildingType,
    position: Position,
    player: PlayerState
  ): { valid: boolean; reason?: string } {
    const bConfig = this.config.buildings[type];
    const radius = bConfig.radius;
    const { width, height } = state.world;

    // 1. World bounds check
    if (
      position.x - radius < 20 ||
      position.x + radius > width - 20 ||
      position.y - radius < 20 ||
      position.y + radius > height - 20
    ) {
      return { valid: false, reason: 'Outside world boundaries' };
    }

    // 2. Resource cost check
    const cost = this.getBuildingCost(type, 1);
    if (
      player.inventory.wood < cost.wood ||
      player.inventory.stone < cost.stone ||
      player.inventory.gold < cost.gold
    ) {
      return { valid: false, reason: 'Insufficient resources' };
    }

    // 3. Collision with existing buildings
    for (const b of state.buildings.values()) {
      const dist = Math.hypot(b.position.x - position.x, b.position.y - position.y);
      if (dist < b.hitbox.radius + radius) {
        return { valid: false, reason: 'Overlaps existing structure' };
      }
    }

    // 4. Overlap with natural resources
    for (const obj of state.objects.values()) {
      const dist = Math.hypot(obj.position.x - position.x, obj.position.y - position.y);
      if (dist < obj.hitbox.radius + radius) {
        return { valid: false, reason: 'Obstructed by natural resource' };
      }
    }

    // 5. Overlap with players
    for (const p of state.players.values()) {
      const dist = Math.hypot(p.position.x - position.x, p.position.y - position.y);
      if (dist < p.hitbox.radius + radius) {
        return { valid: false, reason: 'Obstructed by player' };
      }
    }

    return { valid: true };
  }

  /**
   * Places a building authoritatively
   */
  public placeBuilding(
    state: GameState,
    playerId: EntityId,
    type: BuildingType,
    position: Position,
    minerResource?: ResourceType,
    customId?: EntityId
  ): BuildingState | null {
    const player = state.players.get(playerId);
    if (!player) return null;

    const validation = this.validatePlacement(state, type, position, player);
    if (!validation.valid) {
      this.addFloatingText(state, validation.reason ?? 'Cannot build here!', position.x, position.y, '#e74c3c');
      return null;
    }

    const bConfig = this.config.buildings[type];
    const cost = this.getBuildingCost(type, 1);

    // Deduct cost
    player.inventory.wood -= cost.wood;
    player.inventory.stone -= cost.stone;
    player.inventory.gold -= cost.gold;

    const id = customId ?? `building-${type.toLowerCase()}-${this.nextBuildingId++}`;
    const baseHealth = bConfig.baseHealth;

    const building: BuildingState = {
      id,
      type,
      ownerPlayerId: playerId,
      position: { ...position },
      rotation: 0,
      hitbox: { type: 'circle', radius: bConfig.radius },
      health: baseHealth,
      maxHealth: baseHealth,
      upgradeLevel: 1,
      isDead: false,
      damageFlashTime: 0,
    };

    if (type === 'TURRET') {
      building.turretAngle = 0;
      building.turretCooldown = 0;
    } else if (type === 'MINER') {
      building.minerResource = minerResource ?? 'GOLD';
      building.minerCooldown = bConfig.productionIntervalMs ?? 2500;
      building.totalProduced = 0;
    }

    state.buildings.set(id, building);
    this.addFloatingText(state, `Built ${type}!`, position.x, position.y - 20, '#2ecc71');
    return building;
  }

  /**
   * Upgrades an existing building using infinite curve formulas
   */
  public upgradeBuilding(state: GameState, playerId: EntityId, buildingId: EntityId): boolean {
    const player = state.players.get(playerId);
    const building = state.buildings.get(buildingId);
    if (!player || !building) return false;

    const nextLevel = building.upgradeLevel + 1;
    const cost = this.getBuildingCost(building.type, nextLevel);

    if (
      player.inventory.wood < cost.wood ||
      player.inventory.stone < cost.stone ||
      player.inventory.gold < cost.gold
    ) {
      this.addFloatingText(
        state,
        `Upgrade needs W:${cost.wood} S:${cost.stone} G:${cost.gold}`,
        building.position.x,
        building.position.y - 30,
        '#e74c3c'
      );
      return false;
    }

    player.inventory.wood -= cost.wood;
    player.inventory.stone -= cost.stone;
    player.inventory.gold -= cost.gold;

    const bConfig = this.config.buildings[building.type];
    building.upgradeLevel = nextLevel;

    // Scale health
    const newMaxHealth = Math.round(evaluateCurve(bConfig.baseHealth, nextLevel, bConfig.statCurve));
    const healthBonus = newMaxHealth - building.maxHealth;
    building.maxHealth = newMaxHealth;
    building.health = Math.min(newMaxHealth, building.health + healthBonus);

    this.addFloatingText(
      state,
      `Upgraded to Lvl ${nextLevel}!`,
      building.position.x,
      building.position.y - 30,
      '#f39c12'
    );
    return true;
  }

  /**
   * Repairs a damaged building using player resources
   */
  public repairBuilding(state: GameState, playerId: EntityId, buildingId: EntityId): boolean {
    const player = state.players.get(playerId);
    const building = state.buildings.get(buildingId);
    if (!player || !building) return false;

    if (building.health >= building.maxHealth) {
      this.addFloatingText(state, 'Fully Repaired', building.position.x, building.position.y - 20, '#3498db');
      return false;
    }

    const bConfig = this.config.buildings[building.type];
    const wrenchConfig = this.config.items.WRENCH;
    const missingHp = building.maxHealth - building.health;
    const repairAmount = Math.min(missingHp, wrenchConfig.repairAmount);

    const woodNeeded = Math.ceil(repairAmount * bConfig.repairCostPerHp.wood);
    const stoneNeeded = Math.ceil(repairAmount * bConfig.repairCostPerHp.stone);

    if (player.inventory.wood < woodNeeded || player.inventory.stone < stoneNeeded) {
      this.addFloatingText(
        state,
        `Need ${woodNeeded}W, ${stoneNeeded}S to repair`,
        building.position.x,
        building.position.y - 20,
        '#e74c3c'
      );
      return false;
    }

    player.inventory.wood -= woodNeeded;
    player.inventory.stone -= stoneNeeded;
    building.health = Math.min(building.maxHealth, building.health + repairAmount);

    this.addFloatingText(
      state,
      `+${Math.round(repairAmount)} HP Repaired`,
      building.position.x,
      building.position.y - 20,
      '#2ecc71'
    );
    return true;
  }
}
