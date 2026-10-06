import { GameConfig } from '../config/GameConfig';
import { evaluateCurve } from '../config/Curves';
import { ProjectileState } from '../entities/EntityTypes';
import { FloatingText, GameState } from '../state/GameState';

export class TurretMinerSystem {
  private config: GameConfig;
  private nextProjectileId = 1;
  private nextFloatingTextId = 1;

  constructor(config: GameConfig) {
    this.config = config;
  }

  public setConfig(config: GameConfig): void {
    this.config = config;
  }

  private addFloatingText(state: GameState, text: string, x: number, y: number, color: string): void {
    const ft: FloatingText = {
      id: `tm-ft-${this.nextFloatingTextId++}`,
      text,
      x: x + (Math.random() - 0.5) * 12,
      y: y - 12,
      color,
      life: 0.85,
      maxLife: 0.85,
    };
    state.floatingTexts.push(ft);
  }

  public update(state: GameState, dt: number): void {
    const dtMs = dt * 1000;

    for (const building of state.buildings.values()) {
      if (building.isDead) continue;

      // 1. TURRET LOGIC
      if (building.type === 'TURRET') {
        const turretConfig = this.config.buildings.TURRET;
        const level = building.upgradeLevel;

        const range = evaluateCurve(turretConfig.attackRange ?? 320, level, turretConfig.statCurve);
        const damage = evaluateCurve(turretConfig.attackDamage ?? 22, level, turretConfig.statCurve);
        const rateMs = turretConfig.attackRateMs ?? 650;

        building.turretCooldown = Math.max(0, (building.turretCooldown ?? 0) - dtMs);

        // Find nearest living zombie in range
        let nearestZombie = null;
        let nearestDist = Infinity;

        for (const zombie of state.zombies.values()) {
          if (zombie.isDead) continue;
          const dist = Math.hypot(zombie.position.x - building.position.x, zombie.position.y - building.position.y);
          if (dist <= range && dist < nearestDist) {
            nearestDist = dist;
            nearestZombie = zombie;
          }
        }

        if (nearestZombie) {
          // Aim turret
          const dx = nearestZombie.position.x - building.position.x;
          const dy = nearestZombie.position.y - building.position.y;
          building.turretAngle = Math.atan2(dy, dx);
          building.lastTargetId = nearestZombie.id;

          // Fire if cooled down
          if (building.turretCooldown <= 0) {
            building.turretCooldown = rateMs;

            const projSpeed = 700;
            const vx = Math.cos(building.turretAngle) * projSpeed;
            const vy = Math.sin(building.turretAngle) * projSpeed;

            const proj: ProjectileState = {
              id: `turret-shot-${this.nextProjectileId++}`,
              sourceEntityId: building.id,
              sourceType: 'turret',
              position: {
                x: building.position.x + Math.cos(building.turretAngle) * 30,
                y: building.position.y + Math.sin(building.turretAngle) * 30,
              },
              velocity: { vx, vy },
              damage,
              distanceTraveled: 0,
              maxRange: range,
              hitbox: { type: 'circle', radius: 6 },
            };

            state.projectiles.set(proj.id, proj);
          }
        }
      }

      // 2. MINER LOGIC
      if (building.type === 'MINER') {
        const minerConfig = this.config.buildings.MINER;
        const level = building.upgradeLevel;
        const intervalMs = minerConfig.productionIntervalMs ?? 2500;
        const baseAmount = minerConfig.productionAmount ?? 4;
        const yieldAmount = Math.round(evaluateCurve(baseAmount, level, minerConfig.statCurve));

        building.minerCooldown = (building.minerCooldown ?? intervalMs) - dtMs;

        if (building.minerCooldown <= 0) {
          building.minerCooldown = intervalMs;
          building.totalProduced = (building.totalProduced ?? 0) + yieldAmount;

          const res = building.minerResource ?? 'GOLD';
          const owner = state.players.get(building.ownerPlayerId);

          if (owner) {
            if (res === 'WOOD') {
              owner.inventory.wood += yieldAmount;
              this.addFloatingText(state, `+${yieldAmount} Wood`, building.position.x, building.position.y - 20, '#2ecc71');
            } else if (res === 'STONE') {
              owner.inventory.stone += yieldAmount;
              this.addFloatingText(state, `+${yieldAmount} Stone`, building.position.x, building.position.y - 20, '#bdc3c7');
            } else if (res === 'GOLD') {
              owner.inventory.gold += yieldAmount;
              this.addFloatingText(state, `+${yieldAmount} Gold`, building.position.x, building.position.y - 20, '#f1c40f');
            }
          }
        }
      }
    }
  }
}
