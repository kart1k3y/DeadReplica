import { GameConfig } from '../config/GameConfig';
import { CircleHitbox, EntityId, Position, WorldObjectState, WorldObjectType } from '../entities/EntityTypes';
import { GameState } from '../state/GameState';

export class WorldSystem {
  private config: GameConfig;
  private nextObjectId = 1;

  constructor(config: GameConfig) {
    this.config = config;
  }

  public setConfig(config: GameConfig): void {
    this.config = config;
  }

  /**
   * Calculates world size based on player count scaling configuration
   */
  public calculateWorldDimensions(playerCount: number): { width: number; height: number } {
    const { baseWidth, baseHeight, playerCountMultiplier, minWidth, maxWidth, minHeight, maxHeight } =
      this.config.world;

    const scale = Math.pow(playerCountMultiplier, Math.max(0, playerCount - 1));
    const width = Math.min(maxWidth, Math.max(minWidth, Math.round(baseWidth * scale)));
    const height = Math.min(maxHeight, Math.max(minHeight, Math.round(baseHeight * scale)));

    return { width, height };
  }

  /**
   * Generates natural resources across continuous 2D coordinates
   * with minimum spacing and circular hitboxes
   */
  public generateNaturalResources(state: GameState): void {
    const { width, height } = state.world;
    const { densityPerSquareUnit, treeRatio, stoneRatio, minSpacing, maxNaturalObjects } =
      this.config.resources;

    const area = (width * height) / 1000000;
    const targetCount = Math.min(maxNaturalObjects, Math.floor(area * densityPerSquareUnit));

    // Clear existing objects
    state.objects.clear();

    const padding = 120;
    const attempts = targetCount * 12;

    for (let i = 0; i < attempts && state.objects.size < targetCount; i++) {
      const x = padding + Math.random() * (width - padding * 2);
      const y = padding + Math.random() * (height - padding * 2);

      // Determine object type based on configured ratios
      const rand = Math.random();
      let type: WorldObjectType = 'TREE';
      if (rand < treeRatio) {
        type = 'TREE';
      } else if (rand < treeRatio + stoneRatio) {
        type = 'STONE';
      } else {
        type = 'GOLD';
      }

      const radius = type === 'TREE' ? 42 : type === 'STONE' ? 36 : 32;

      // Check collision/spacing against all existing objects
      let valid = true;
      for (const obj of state.objects.values()) {
        const dx = obj.position.x - x;
        const dy = obj.position.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < minSpacing + obj.hitbox.radius + radius) {
          valid = false;
          break;
        }
      }

      if (valid) {
        const obj = this.createResourceObject(type, { x, y });
        state.objects.set(obj.id, obj);
      }
    }
  }

  public createResourceObject(type: WorldObjectType, position: Position, customId?: EntityId): WorldObjectState {
    const id = customId ?? `resource-${type.toLowerCase()}-${this.nextObjectId++}`;
    let radius = 38;
    let maxHealth = 100;
    let resourceYield = 10;

    switch (type) {
      case 'TREE':
        radius = 42;
        maxHealth = 80;
        resourceYield = 12;
        break;
      case 'STONE':
        radius = 36;
        maxHealth = 130;
        resourceYield = 10;
        break;
      case 'GOLD':
        radius = 32;
        maxHealth = 160;
        resourceYield = 8;
        break;
    }

    return {
      id,
      type,
      resourceType: type === 'TREE' ? 'WOOD' : type === 'STONE' ? 'STONE' : 'GOLD',
      position: { ...position },
      rotation: Math.random() * Math.PI * 2,
      hitbox: { type: 'circle', radius },
      health: maxHealth,
      maxHealth,
      resourceYield,
      scale: 0.9 + Math.random() * 0.25,
      isDead: false,
      damageFlashTime: 0,
    };
  }

  /**
   * Spawns a single natural resource if current count is below limit
   */
  public respawnNaturalResource(state: GameState): WorldObjectState | null {
    if (state.objects.size >= this.config.resources.maxNaturalObjects) {
      return null;
    }

    const { width, height } = state.world;
    const padding = 120;
    const { treeRatio, stoneRatio, minSpacing } = this.config.resources;

    for (let attempts = 0; attempts < 25; attempts++) {
      const x = padding + Math.random() * (width - padding * 2);
      const y = padding + Math.random() * (height - padding * 2);

      const rand = Math.random();
      const type: WorldObjectType = rand < treeRatio ? 'TREE' : rand < treeRatio + stoneRatio ? 'STONE' : 'GOLD';
      const radius = type === 'TREE' ? 42 : type === 'STONE' ? 36 : 32;

      let valid = true;
      for (const obj of state.objects.values()) {
        const dist = Math.hypot(obj.position.x - x, obj.position.y - y);
        if (dist < minSpacing + obj.hitbox.radius + radius) {
          valid = false;
          break;
        }
      }

      if (valid) {
        const obj = this.createResourceObject(type, { x, y });
        state.objects.set(obj.id, obj);
        return obj;
      }
    }

    return null;
  }
}
