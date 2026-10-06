import { GameConfig } from '../config/GameConfig';
import { evaluateCurve } from '../config/Curves';
import { EntityId, PlayerState, ProjectileState, ZombieState } from '../entities/EntityTypes';
import { FloatingText, GameState } from '../state/GameState';

export class CombatSystem {
  private config: GameConfig;
  private nextProjectileId = 1;
  private nextFloatingTextId = 1;

  constructor(config: GameConfig) {
    this.config = config;
  }

  public setConfig(config: GameConfig): void {
    this.config = config;
  }

  public addFloatingText(state: GameState, text: string, x: number, y: number, color: string): void {
    const ft: FloatingText = {
      id: `ft-${this.nextFloatingTextId++}`,
      text,
      x: x + (Math.random() - 0.5) * 20,
      y: y - 10 + (Math.random() - 0.5) * 10,
      color,
      life: 0.85,
      maxLife: 0.85,
    };
    state.floatingTexts.push(ft);
  }

  /**
   * Performs an attack from a player holding their currently active tool
   */
  public playerAttack(state: GameState, playerId: EntityId): void {
    const player = state.players.get(playerId);
    if (!player || player.isDead || player.attackCooldown > 0) return;

    if (player.activeSlot.kind !== 'tool') return;

    const toolType = player.activeSlot.tool;
    const toolLevel = player.toolLevels[toolType] ?? 1;

    // Trigger swing animation & cooldown
    player.isAttacking = true;
    player.attackProgress = 0;

    if (toolType === 'BOW') {
      const bowConfig = this.config.tools.BOW;
      if (player.inventory.arrows <= 0) {
        this.addFloatingText(state, 'Out of Arrows!', player.position.x, player.position.y - 30, '#ff4444');
        return;
      }

      player.inventory.arrows--;
      player.attackCooldown = bowConfig.cooldownMs;

      // Spawn arrow projectile
      const speed = bowConfig.projectileSpeed;
      const vx = Math.cos(player.rotation) * speed;
      const vy = Math.sin(player.rotation) * speed;
      const scaledDamage = evaluateCurve(bowConfig.baseDamage, toolLevel, bowConfig.statCurve);

      const proj: ProjectileState = {
        id: `arrow-${this.nextProjectileId++}`,
        sourceEntityId: player.id,
        sourceType: 'player',
        position: {
          x: player.position.x + Math.cos(player.rotation) * 35,
          y: player.position.y + Math.sin(player.rotation) * 35,
        },
        velocity: { vx, vy },
        damage: scaledDamage,
        distanceTraveled: 0,
        maxRange: bowConfig.maxRange,
        hitbox: { type: 'circle', radius: 8 },
      };

      state.projectiles.set(proj.id, proj);
      return;
    }

    // Melee attack: Axe, Pickaxe, Sword
    const toolConfig = this.config.tools[toolType as 'AXE' | 'PICKAXE' | 'SWORD'];
    player.attackCooldown = toolConfig.cooldownMs;

    const baseDmg = evaluateCurve(toolConfig.baseDamage, toolLevel, toolConfig.statCurve);
    const range = toolConfig.attackRange;
    const swingAngle = player.rotation;

    // 1. Check hitting zombies
    for (const zombie of state.zombies.values()) {
      if (zombie.isDead) continue;

      const dx = zombie.position.x - player.position.x;
      const dy = zombie.position.y - player.position.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= range + zombie.hitbox.radius) {
        // Check angle cone (+- 65 degrees)
        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToTarget - swingAngle);
        while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

        if (angleDiff <= Math.PI * 0.45) {
          const finalDamage = baseDmg * toolConfig.multipliers.attack;
          this.damageZombie(state, zombie, finalDamage, player.position);
        }
      }
    }
  }

  public damageZombie(
    state: GameState,
    zombie: ZombieState,
    damage: number,
    sourcePosition?: { x: number; y: number }
  ): void {
    if (zombie.isDead) return;

    zombie.health -= damage;
    zombie.damageFlashTime = 140;

    // Knockback
    if (sourcePosition) {
      const dx = zombie.position.x - sourcePosition.x;
      const dy = zombie.position.y - sourcePosition.y;
      const dist = Math.hypot(dx, dy) || 1;
      const knock = this.config.combat.knockbackStrength;
      zombie.position.x += (dx / dist) * (knock * 0.1);
      zombie.position.y += (dy / dist) * (knock * 0.1);
    }

    this.addFloatingText(state, `-${Math.round(damage)}`, zombie.position.x, zombie.position.y - 20, '#ff4757');

    if (zombie.health <= 0) {
      zombie.health = 0;
      zombie.isDead = true;
      this.addFloatingText(state, 'DEFEATED!', zombie.position.x, zombie.position.y - 35, '#ffd32a');

      // Drop loot (chance to drop Gold / Apples / Arrows)
      if (Math.random() < this.config.zombie.dropChance) {
        const itemType = Math.random() < 0.5 ? 'APPLE' : undefined;
        const resType = itemType ? undefined : 'GOLD';
        const dropId = `drop-${Date.now()}-${Math.random()}`;

        state.droppedItems.set(dropId, {
          id: dropId,
          position: { ...zombie.position },
          itemType,
          resourceType: resType,
          amount: resType ? Math.floor(5 + Math.random() * 8) : 1,
          lifetime: 30,
        });
      }
    }
  }

  public damagePlayer(
    state: GameState,
    player: PlayerState,
    damage: number,
    sourcePosition?: { x: number; y: number }
  ): void {
    if (player.isDead) return;

    player.health -= damage;
    player.damageFlashTime = 160;

    if (sourcePosition) {
      const dx = player.position.x - sourcePosition.x;
      const dy = player.position.y - sourcePosition.y;
      const dist = Math.hypot(dx, dy) || 1;
      const knock = this.config.combat.knockbackStrength;
      player.position.x += (dx / dist) * (knock * 0.08);
      player.position.y += (dy / dist) * (knock * 0.08);
    }

    this.addFloatingText(state, `-${Math.round(damage)}`, player.position.x, player.position.y - 20, '#ff3838');

    if (player.health <= 0) {
      player.health = 0;
      player.isDead = true;
      player.deathTimer = 0;
      this.addFloatingText(state, 'DOWNED!', player.position.x, player.position.y - 40, '#e74c3c');
    }
  }

  /**
   * Zombie AI simple behaviors (chasing players/buildings, attack cooldowns)
   */
  public updateZombieBehaviors(state: GameState, dt: number): void {
    const { movementSpeed, attackDamage, attackRange, attackCooldownMs } = this.config.zombie;

    for (const zombie of state.zombies.values()) {
      if (zombie.isDead) continue;

      // Find nearest living player or target building
      let nearestDist = Infinity;
      let targetX = 0;
      let targetY = 0;
      let targetPlayer: PlayerState | null = null;

      for (const player of state.players.values()) {
        if (player.isDead) continue;
        const d = Math.hypot(player.position.x - zombie.position.x, player.position.y - zombie.position.y);
        if (d < nearestDist) {
          nearestDist = d;
          targetX = player.position.x;
          targetY = player.position.y;
          targetPlayer = player;
        }
      }

      // Check buildings if closer
      let targetBuilding = null;
      for (const b of state.buildings.values()) {
        const d = Math.hypot(b.position.x - zombie.position.x, b.position.y - zombie.position.y);
        if (d < nearestDist) {
          nearestDist = d;
          targetX = b.position.x;
          targetY = b.position.y;
          targetBuilding = b;
          targetPlayer = null;
        }
      }

      if (nearestDist < 900) {
        // Move towards target
        const dx = targetX - zombie.position.x;
        const dy = targetY - zombie.position.y;
        const dist = Math.hypot(dx, dy) || 1;

        zombie.rotation = Math.atan2(dy, dx);

        if (dist > attackRange) {
          zombie.velocity.vx = (dx / dist) * movementSpeed;
          zombie.velocity.vy = (dy / dist) * movementSpeed;
        } else {
          zombie.velocity.vx = 0;
          zombie.velocity.vy = 0;

          // Attack
          if (zombie.attackCooldown <= 0) {
            zombie.isAttacking = true;
            zombie.attackProgress = 0;
            zombie.attackCooldown = attackCooldownMs;

            if (targetPlayer) {
              this.damagePlayer(state, targetPlayer, attackDamage, zombie.position);
            } else if (targetBuilding) {
              targetBuilding.health -= attackDamage;
              targetBuilding.damageFlashTime = 120;
              this.addFloatingText(state, `-${attackDamage}`, targetBuilding.position.x, targetBuilding.position.y - 20, '#ff6348');
              if (targetBuilding.health <= 0) {
                targetBuilding.health = 0;
                targetBuilding.isDead = true;
                this.addFloatingText(state, 'DESTROYED', targetBuilding.position.x, targetBuilding.position.y - 30, '#ff4757');
                state.buildings.delete(targetBuilding.id);
              }
            }
          }
        }
      } else {
        // Idle wandering
        zombie.velocity.vx = 0;
        zombie.velocity.vy = 0;
      }
    }
  }

  /**
   * Projectile collisions against entities and buildings
   */
  public updateProjectileHits(state: GameState): void {
    for (const [projId, proj] of state.projectiles.entries()) {
      if (proj.sourceType === 'player' || proj.sourceType === 'turret') {
        // Check hitting zombies
        for (const zombie of state.zombies.values()) {
          if (zombie.isDead) continue;
          const dist = Math.hypot(zombie.position.x - proj.position.x, zombie.position.y - proj.position.y);
          if (dist <= zombie.hitbox.radius + proj.hitbox.radius) {
            this.damageZombie(state, zombie, proj.damage, proj.position);
            state.projectiles.delete(projId);
            break;
          }
        }
      }
    }
  }
}
