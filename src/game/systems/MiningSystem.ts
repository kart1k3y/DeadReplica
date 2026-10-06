import { GameConfig } from '../config/GameConfig';
import { evaluateCurve } from '../config/Curves';
import { EntityId, PlayerState, WorldObjectState } from '../entities/EntityTypes';
import { FloatingText, GameState } from '../state/GameState';

export class MiningSystem {
  private config: GameConfig;
  private nextFloatingTextId = 1;

  constructor(config: GameConfig) {
    this.config = config;
  }

  public setConfig(config: GameConfig): void {
    this.config = config;
  }

  private addFloatingText(state: GameState, text: string, x: number, y: number, color: string): void {
    const ft: FloatingText = {
      id: `mine-ft-${this.nextFloatingTextId++}`,
      text,
      x: x + (Math.random() - 0.5) * 16,
      y: y - 15 + (Math.random() - 0.5) * 10,
      color,
      life: 0.9,
      maxLife: 0.9,
    };
    state.floatingTexts.push(ft);
  }

  /**
   * Performs mining action with the player's active tool against a resource node
   */
  public mine(state: GameState, playerId: EntityId, resourceId?: EntityId): void {
    const player = state.players.get(playerId);
    if (!player || player.isDead || player.attackCooldown > 0) return;

    if (player.activeSlot.kind !== 'tool') return;

    const toolType = player.activeSlot.tool;
    if (toolType === 'BOW') return; // Bow is for ranged combat

    const toolConfig = this.config.tools[toolType as 'AXE' | 'PICKAXE' | 'SWORD'];
    const toolLevel = player.toolLevels[toolType] ?? 1;

    // Trigger swing animation & cooldown
    player.isAttacking = true;
    player.attackProgress = 0;
    player.attackCooldown = toolConfig.cooldownMs;

    const range = toolConfig.attackRange;
    const baseDamage = evaluateCurve(toolConfig.baseDamage, toolLevel, toolConfig.statCurve);

    // Target specific resource if given, or find best candidate in facing direction
    let targetNode: WorldObjectState | null = null;
    if (resourceId && state.objects.has(resourceId)) {
      targetNode = state.objects.get(resourceId)!;
    } else {
      let nearestDist = Infinity;
      const aimAngle = player.rotation;

      for (const obj of state.objects.values()) {
        const dx = obj.position.x - player.position.x;
        const dy = obj.position.y - player.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= range + obj.hitbox.radius) {
          const angleToNode = Math.atan2(dy, dx);
          let diff = Math.abs(angleToNode - aimAngle);
          while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

          if (diff <= Math.PI * 0.5 && dist < nearestDist) {
            nearestDist = dist;
            targetNode = obj;
          }
        }
      }
    }

    if (!targetNode) return;

    // Apply multiplier based on tool and resource
    let multiplier = 1.0;
    let resourceColor = '#2ecc71';

    if (targetNode.type === 'TREE') {
      multiplier = toolConfig.multipliers.wood;
      resourceColor = '#27ae60';
    } else if (targetNode.type === 'STONE') {
      multiplier = toolConfig.multipliers.stone;
      resourceColor = '#7f8c8d';
    } else if (targetNode.type === 'GOLD') {
      multiplier = toolConfig.multipliers.gold;
      resourceColor = '#f1c40f';
    }

    const calculatedDamage = Math.max(1, Math.round(baseDamage * multiplier));
    targetNode.health -= calculatedDamage;
    targetNode.damageFlashTime = 130;

    // Harvested yield per strike based on damage ratio
    const yieldAmount = Math.max(1, Math.round((calculatedDamage / targetNode.maxHealth) * targetNode.resourceYield * 2.5));

    if (targetNode.resourceType === 'WOOD') {
      player.inventory.wood += yieldAmount;
      this.addFloatingText(state, `+${yieldAmount} Wood`, targetNode.position.x, targetNode.position.y - 15, '#2ecc71');
    } else if (targetNode.resourceType === 'STONE') {
      player.inventory.stone += yieldAmount;
      this.addFloatingText(state, `+${yieldAmount} Stone`, targetNode.position.x, targetNode.position.y - 15, '#bdc3c7');
    } else if (targetNode.resourceType === 'GOLD') {
      player.inventory.gold += yieldAmount;
      this.addFloatingText(state, `+${yieldAmount} Gold`, targetNode.position.x, targetNode.position.y - 15, '#f1c40f');
    }

    // Node depleted
    if (targetNode.health <= 0) {
      targetNode.isDead = true;
      state.objects.delete(targetNode.id);
      this.addFloatingText(
        state,
        `+${targetNode.resourceYield} Bonus!`,
        targetNode.position.x,
        targetNode.position.y - 30,
        '#e67e22'
      );

      if (targetNode.resourceType === 'WOOD') player.inventory.wood += targetNode.resourceYield;
      if (targetNode.resourceType === 'STONE') player.inventory.stone += targetNode.resourceYield;
      if (targetNode.resourceType === 'GOLD') player.inventory.gold += targetNode.resourceYield;
    }
  }
}
