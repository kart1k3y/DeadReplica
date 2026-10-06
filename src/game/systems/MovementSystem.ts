import { GameConfig } from '../config/GameConfig';
import { GameState } from '../state/GameState';

export class MovementSystem {
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  public setConfig(config: GameConfig): void {
    this.config = config;
  }

  public update(state: GameState, dt: number): void {
    const { width, height } = state.world;

    // 1. Update players
    for (const player of state.players.values()) {
      if (player.isDead) continue;

      // Passive healing
      if (player.health < player.maxHealth) {
        player.health = Math.min(player.maxHealth, player.health + this.config.player.passiveHealSpeed * dt);
      }

      // Damage flash decay
      if (player.damageFlashTime > 0) {
        player.damageFlashTime = Math.max(0, player.damageFlashTime - dt * 1000);
      }

      // Attack cooldown & animation decay
      if (player.attackCooldown > 0) {
        player.attackCooldown = Math.max(0, player.attackCooldown - dt * 1000);
      }
      if (player.isAttacking) {
        player.attackProgress += dt * 4.5;
        if (player.attackProgress >= 1) {
          player.isAttacking = false;
          player.attackProgress = 0;
        }
      }

      // Position update from velocity
      player.position.x += player.velocity.vx * dt;
      player.position.y += player.velocity.vy * dt;

      // Boundary clamp
      const r = player.hitbox.radius;
      player.position.x = Math.max(r, Math.min(width - r, player.position.x));
      player.position.y = Math.max(r, Math.min(height - r, player.position.y));

      // Resolve collision with buildings (walls, miners, turrets)
      for (const building of state.buildings.values()) {
        const dx = player.position.x - building.position.x;
        const dy = player.position.y - building.position.y;
        const dist = Math.hypot(dx, dy);
        const minDist = player.hitbox.radius + building.hitbox.radius;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          player.position.x += (dx / dist) * overlap;
          player.position.y += (dy / dist) * overlap;
        }
      }
    }

    // 2. Update zombies
    for (const zombie of state.zombies.values()) {
      if (zombie.isDead) continue;

      // Damage flash decay
      if (zombie.damageFlashTime > 0) {
        zombie.damageFlashTime = Math.max(0, zombie.damageFlashTime - dt * 1000);
      }

      // Attack cooldown & animation
      if (zombie.attackCooldown > 0) {
        zombie.attackCooldown = Math.max(0, zombie.attackCooldown - dt * 1000);
      }
      if (zombie.isAttacking) {
        zombie.attackProgress += dt * 4.0;
        if (zombie.attackProgress >= 1) {
          zombie.isAttacking = false;
          zombie.attackProgress = 0;
        }
      }

      // Position update
      zombie.position.x += zombie.velocity.vx * dt;
      zombie.position.y += zombie.velocity.vy * dt;

      // Boundary clamp
      const r = zombie.hitbox.radius;
      zombie.position.x = Math.max(r, Math.min(width - r, zombie.position.x));
      zombie.position.y = Math.max(r, Math.min(height - r, zombie.position.y));

      // Resolve collision with buildings
      for (const building of state.buildings.values()) {
        const dx = zombie.position.x - building.position.x;
        const dy = zombie.position.y - building.position.y;
        const dist = Math.hypot(dx, dy);
        const minDist = zombie.hitbox.radius + building.hitbox.radius;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          zombie.position.x += (dx / dist) * overlap;
          zombie.position.y += (dy / dist) * overlap;
        }
      }
    }

    // 3. Update projectiles (arrows, turret shots)
    for (const [id, proj] of state.projectiles.entries()) {
      const stepX = proj.velocity.vx * dt;
      const stepY = proj.velocity.vy * dt;
      proj.position.x += stepX;
      proj.position.y += stepY;
      proj.distanceTraveled += Math.hypot(stepX, stepY);

      // Check range or out of bounds
      if (
        proj.distanceTraveled >= proj.maxRange ||
        proj.position.x < 0 ||
        proj.position.x > width ||
        proj.position.y < 0 ||
        proj.position.y > height
      ) {
        state.projectiles.delete(id);
      }
    }

    // 4. Update floating combat texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.life -= dt;
      ft.y -= dt * 30; // Float upwards
      if (ft.life <= 0) {
        state.floatingTexts.splice(i, 1);
      }
    }

    // 5. Update object damage flash
    for (const obj of state.objects.values()) {
      if (obj.damageFlashTime > 0) {
        obj.damageFlashTime = Math.max(0, obj.damageFlashTime - dt * 1000);
      }
    }

    // 6. Update building damage flash
    for (const building of state.buildings.values()) {
      if (building.damageFlashTime > 0) {
        building.damageFlashTime = Math.max(0, building.damageFlashTime - dt * 1000);
      }
    }
  }
}
