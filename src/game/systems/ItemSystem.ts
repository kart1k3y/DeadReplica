import { GameConfig, ItemType } from '../config/GameConfig';
import { EntityId, PlayerState } from '../entities/EntityTypes';
import { FloatingText, GameState } from '../state/GameState';
import { BuildingSystem } from './BuildingSystem';

export class ItemSystem {
  private config: GameConfig;
  private buildingSystem: BuildingSystem;
  private nextFloatingTextId = 1;

  constructor(config: GameConfig, buildingSystem: BuildingSystem) {
    this.config = config;
    this.buildingSystem = buildingSystem;
  }

  public setConfig(config: GameConfig): void {
    this.config = config;
    this.buildingSystem.setConfig(config);
  }

  private addFloatingText(state: GameState, text: string, x: number, y: number, color: string): void {
    const ft: FloatingText = {
      id: `item-ft-${this.nextFloatingTextId++}`,
      text,
      x,
      y: y - 20,
      color,
      life: 0.9,
      maxLife: 0.9,
    };
    state.floatingTexts.push(ft);
  }

  /**
   * Consumes or activates an item in the player's active inventory
   */
  public useItem(state: GameState, playerId: EntityId, item: ItemType, targetEntityId?: EntityId): boolean {
    const player = state.players.get(playerId);
    if (!player) return false;

    // 1. APPLE: Restore Health
    if (item === 'APPLE') {
      if (player.isDead) return false;
      if (player.inventory.apples <= 0) {
        this.addFloatingText(state, 'No apples left!', player.position.x, player.position.y, '#e74c3c');
        return false;
      }
      if (player.health >= player.maxHealth) {
        this.addFloatingText(state, 'Health already full!', player.position.x, player.position.y, '#3498db');
        return false;
      }

      player.inventory.apples--;
      const healAmount = this.config.items.APPLE.healAmount;
      player.health = Math.min(player.maxHealth, player.health + healAmount);
      this.addFloatingText(state, `+${healAmount} HP`, player.position.x, player.position.y - 15, '#2ecc71');
      return true;
    }

    // 2. WRENCH: Repair Building
    if (item === 'WRENCH') {
      if (player.isDead) return false;
      const wrenchConfig = this.config.items.WRENCH;
      const range = wrenchConfig.repairRange;

      // Find nearby damaged building
      let candidate = null;
      let minDistance = Infinity;

      if (targetEntityId && state.buildings.has(targetEntityId)) {
        candidate = state.buildings.get(targetEntityId)!;
      } else {
        for (const b of state.buildings.values()) {
          if (b.health < b.maxHealth) {
            const dist = Math.hypot(b.position.x - player.position.x, b.position.y - player.position.y);
            if (dist <= range + b.hitbox.radius && dist < minDistance) {
              minDistance = dist;
              candidate = b;
            }
          }
        }
      }

      if (!candidate) {
        this.addFloatingText(state, 'No damaged building nearby', player.position.x, player.position.y, '#bdc3c7');
        return false;
      }

      return this.buildingSystem.repairBuilding(state, playerId, candidate.id);
    }

    // 3. REVIVE ITEM: Revive Downed Teammate
    if (item === 'REVIVE') {
      if (player.isDead) return false;
      if (player.inventory.revives <= 0) {
        this.addFloatingText(state, 'No revive kits left!', player.position.x, player.position.y, '#e74c3c');
        return false;
      }

      const reviveConfig = this.config.items.REVIVE;
      const range = reviveConfig.reviveRange;

      let target: PlayerState | null = null;
      if (targetEntityId && state.players.has(targetEntityId)) {
        target = state.players.get(targetEntityId)!;
      } else {
        for (const other of state.players.values()) {
          if (other.id !== player.id && other.isDead) {
            const dist = Math.hypot(other.position.x - player.position.x, other.position.y - player.position.y);
            if (dist <= range) {
              target = other;
              break;
            }
          }
        }
      }

      if (!target || !target.isDead) {
        this.addFloatingText(state, 'No downed teammate in range', player.position.x, player.position.y, '#bdc3c7');
        return false;
      }

      player.inventory.revives--;
      target.isDead = false;
      target.health = Math.round(target.maxHealth * reviveConfig.reviveHealthPercent);
      target.deathTimer = undefined;

      this.addFloatingText(state, 'REVIVED!', target.position.x, target.position.y - 30, '#2ecc71');
      return true;
    }

    return false;
  }
}
