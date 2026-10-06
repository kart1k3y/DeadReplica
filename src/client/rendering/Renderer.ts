import { BuildingType, ResourceType } from '../../game/config/GameConfig';
import { EntityId, Position } from '../../game/entities/EntityTypes';
import { GameState } from '../../game/state/GameState';
import { UpgradeSystem } from '../../game/systems/UpgradeSystem';
import { Camera } from '../camera/Camera';
import { ParticleSystem } from './ParticleSystem';
import { SpriteFactory } from './SpriteFactory';

export interface PlacementGhost {
  type: BuildingType;
  position: Position;
  minerResource?: ResourceType;
  valid: boolean;
  turretRange?: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private spriteFactory: SpriteFactory;
  public particleSystem: ParticleSystem;
  private upgradeSystem: UpgradeSystem;

  public showHitboxes = false; // toggleable via debug overlay
  public placementGhost: PlacementGhost | null = null;

  constructor(canvas: HTMLCanvasElement, upgradeSystem: UpgradeSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.spriteFactory = new SpriteFactory();
    this.particleSystem = new ParticleSystem();
    this.upgradeSystem = upgradeSystem;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Pure render method: Takes GameState and Camera and draws pixels.
   * Does NOT alter or mutate state!
   */
  public render(state: GameState, camera: Camera, localPlayerId?: EntityId, dt = 0.016): void {
    const { ctx, canvas } = this;
    const { width: viewW, height: viewH } = canvas;

    camera.setViewport(viewW, viewH);

    // Clear screen
    ctx.clearRect(0, 0, viewW, viewH);

    // Camera transform
    ctx.save();
    ctx.translate(viewW / 2, viewH / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 1. Draw Garden Tiling Background
    this.drawBackground(state.world.width, state.world.height);

    // 2. Draw World Boundaries
    this.drawWorldBorder(state.world.width, state.world.height);

    // 3. Draw Dropped Items
    this.drawDroppedItems(state);

    // 4. Draw Natural Resources (Trees, Rocks, Gold)
    this.drawResources(state);

    // 5. Draw Buildings (Walls, Turrets, Miners)
    this.drawBuildings(state);

    // 6. Draw Zombies
    this.drawZombies(state);

    // 7. Draw Players
    this.drawPlayers(state, localPlayerId);

    // 8. Draw Projectiles (Arrows, Turret shots)
    this.drawProjectiles(state);

    // 9. Draw Particle System
    this.particleSystem.update(dt);
    this.particleSystem.draw(ctx);

    // 10. Draw Building Placement Ghost
    if (this.placementGhost) {
      this.drawPlacementGhost(this.placementGhost);
    }

    // 11. Optional Debug Hitbox Overlay
    if (this.showHitboxes) {
      this.drawDebugHitboxes(state);
    }

    // 12. Draw Floating Combat Text
    this.drawFloatingTexts(state);

    ctx.restore();
  }

  private drawBackground(worldW: number, worldH: number): void {
    const { ctx } = this;
    const pattern = this.spriteFactory.createGrassTile(ctx);

    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, worldW, worldH);
    } else {
      ctx.fillStyle = '#4fa348';
      ctx.fillRect(0, 0, worldW, worldH);
    }
  }

  private drawWorldBorder(worldW: number, worldH: number): void {
    const { ctx } = this;

    // Glowing clean garden fence/boundary
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, worldW - 8, worldH - 8);

    // Corner decorative corner stones
    ctx.fillStyle = '#2c3e50';
    const corners = [
      [8, 8],
      [worldW - 8, 8],
      [8, worldH - 8],
      [worldW - 8, worldH - 8],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawDroppedItems(state: GameState): void {
    const { ctx } = this;

    for (const item of state.droppedItems.values()) {
      ctx.save();
      // Gentle floating bob animation
      const bob = Math.sin(performance.now() * 0.006 + item.position.x) * 4;
      ctx.translate(item.position.x, item.position.y + bob);

      // Shadow
      ctx.fillStyle = 'rgba(20, 45, 18, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      if (item.itemType) {
        this.spriteFactory.drawItem(ctx, item.itemType);
      } else if (item.resourceType) {
        if (item.resourceType === 'WOOD') {
          ctx.fillStyle = '#8c531b';
          ctx.beginPath();
          ctx.roundRect(-6, -6, 12, 12, 3);
          ctx.fill();
        } else if (item.resourceType === 'STONE') {
          ctx.fillStyle = '#95a5a6';
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.resourceType === 'GOLD') {
          ctx.fillStyle = '#f1c40f';
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  private drawResources(state: GameState): void {
    const { ctx } = this;

    for (const obj of state.objects.values()) {
      if (obj.isDead) continue;

      ctx.save();
      ctx.translate(obj.position.x, obj.position.y);
      ctx.scale(obj.scale, obj.scale);

      const flash = obj.damageFlashTime > 0;

      if (obj.type === 'TREE') {
        this.spriteFactory.drawTree(ctx, flash);
      } else if (obj.type === 'STONE') {
        this.spriteFactory.drawStone(ctx, flash);
      } else if (obj.type === 'GOLD') {
        this.spriteFactory.drawGold(ctx, flash);
      }

      // Health bar when damaged
      if (obj.health < obj.maxHealth) {
        this.drawHealthBar(ctx, 0, -obj.hitbox.radius - 12, obj.health, obj.maxHealth, 36, '#2ed573');
      }

      ctx.restore();
    }
  }

  private drawBuildings(state: GameState): void {
    const { ctx } = this;

    for (const b of state.buildings.values()) {
      if (b.isDead) continue;

      ctx.save();
      ctx.translate(b.position.x, b.position.y);

      const flash = b.damageFlashTime > 0;
      const upgradeVisual = this.upgradeSystem.getUpgradeVisual(b.upgradeLevel);

      this.spriteFactory.drawBuilding(
        ctx,
        b.type,
        b.turretAngle ?? 0,
        b.minerResource ?? 'GOLD',
        0,
        upgradeVisual,
        flash
      );

      // Building Upgrade Badge if > 1
      if (b.upgradeLevel > 1) {
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`★ Lv.${b.upgradeLevel}`, 0, b.hitbox.radius + 15);
      }

      // Health Bar
      this.drawHealthBar(ctx, 0, -b.hitbox.radius - 12, b.health, b.maxHealth, 44, '#2ed573');

      ctx.restore();
    }
  }

  private drawZombies(state: GameState): void {
    const { ctx } = this;

    for (const zombie of state.zombies.values()) {
      if (zombie.isDead) continue;

      ctx.save();
      ctx.translate(zombie.position.x, zombie.position.y);
      ctx.rotate(zombie.rotation);

      const flash = zombie.damageFlashTime > 0;
      const upgVisual = this.upgradeSystem.getUpgradeVisual(zombie.upgradeLevel);

      this.spriteFactory.drawCharacter(
        ctx,
        true, // isZombie = true
        '#558b2f',
        zombie.heldTool,
        zombie.isAttacking,
        zombie.attackProgress,
        upgVisual,
        flash
      );

      ctx.restore();

      // Health bar (draw unrotated above zombie)
      ctx.save();
      ctx.translate(zombie.position.x, zombie.position.y);
      this.drawHealthBar(ctx, 0, -zombie.hitbox.radius - 14, zombie.health, zombie.maxHealth, 36, '#e74c3c');

      // Tag
      ctx.fillStyle = '#ff7675';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(zombie.upgradeLevel > 1 ? `Zombie (Lv.${zombie.upgradeLevel})` : 'Zombie', 0, -zombie.hitbox.radius - 18);
      ctx.restore();
    }
  }

  private drawPlayers(state: GameState, localPlayerId?: EntityId): void {
    const { ctx } = this;

    for (const player of state.players.values()) {
      ctx.save();
      ctx.translate(player.position.x, player.position.y);

      if (player.isDead) {
        // Downed player representation (tombstone / ghost with revive ring)
        ctx.fillStyle = 'rgba(20, 45, 18, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 10, 24, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#95a5a6';
        ctx.beginPath();
        ctx.roundRect(-16, -26, 32, 36, 12);
        ctx.fill();
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#c0392b';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DOWNED', 0, -32);
        ctx.fillText('(Use Revive)', 0, 24);

        ctx.restore();
        continue;
      }

      // Alive player: rotate towards aim direction
      ctx.rotate(player.rotation);

      const flash = player.damageFlashTime > 0;
      let heldTool = 'AXE' as any;
      let upgVisual = undefined;

      if (player.activeSlot.kind === 'tool') {
        heldTool = player.activeSlot.tool;
        const lvl = player.toolLevels[player.activeSlot.tool] ?? 1;
        upgVisual = this.upgradeSystem.getUpgradeVisual(lvl);
      }

      this.spriteFactory.drawCharacter(
        ctx,
        false, // isZombie = false
        player.color,
        heldTool,
        player.isAttacking,
        player.attackProgress,
        upgVisual,
        flash
      );

      ctx.restore();

      // Name & Health Bar (drawn unrotated above player)
      ctx.save();
      ctx.translate(player.position.x, player.position.y);

      // Name & Local indicator
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = player.id === localPlayerId ? '#00e5ff' : '#ffffff';
      ctx.fillText(player.id === localPlayerId ? `▲ ${player.name}` : player.name, 0, -player.hitbox.radius - 20);

      this.drawHealthBar(ctx, 0, -player.hitbox.radius - 12, player.health, player.maxHealth, 40, '#2ecc71');
      ctx.restore();
    }
  }

  private drawProjectiles(state: GameState): void {
    const { ctx } = this;

    for (const proj of state.projectiles.values()) {
      ctx.save();
      ctx.translate(proj.position.x, proj.position.y);

      if (proj.sourceType === 'turret') {
        this.spriteFactory.drawTurretShot(ctx, proj.velocity.vx, proj.velocity.vy);
      } else {
        this.spriteFactory.drawArrow(ctx, proj.velocity.vx, proj.velocity.vy);
      }

      ctx.restore();
    }
  }

  private drawPlacementGhost(ghost: PlacementGhost): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(ghost.position.x, ghost.position.y);

    const color = ghost.valid ? 'rgba(46, 204, 113, 0.45)' : 'rgba(231, 76, 60, 0.5)';
    const strokeColor = ghost.valid ? '#2ecc71' : '#e74c3c';

    // Turret range circle preview
    if (ghost.type === 'TURRET' && ghost.turretRange) {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ghost.turretRange, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Ghost circular footprint
    ctx.fillStyle = color;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Ghost building model with transparency
    ctx.globalAlpha = 0.7;
    this.spriteFactory.drawBuilding(ctx, ghost.type, 0, ghost.minerResource ?? 'GOLD', 0);

    ctx.restore();
  }

  private drawDebugHitboxes(state: GameState): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.7)';
    ctx.lineWidth = 1.5;

    // Objects hitboxes
    for (const obj of state.objects.values()) {
      ctx.beginPath();
      ctx.arc(obj.position.x, obj.position.y, obj.hitbox.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Buildings
    for (const b of state.buildings.values()) {
      ctx.beginPath();
      ctx.arc(b.position.x, b.position.y, b.hitbox.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Players
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
    for (const p of state.players.values()) {
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.hitbox.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Zombies
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
    for (const z of state.zombies.values()) {
      ctx.beginPath();
      ctx.arc(z.position.x, z.position.y, z.hitbox.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawFloatingTexts(state: GameState): void {
    const { ctx } = this;
    ctx.save();

    for (const ft of state.floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';

      // Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      ctx.strokeText(ft.text, ft.x, ft.y);

      // Fill
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }

    ctx.restore();
  }

  private drawHealthBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    health: number,
    maxHealth: number,
    width: number,
    fillColor: string
  ): void {
    const height = 5;
    const ratio = Math.max(0, Math.min(1, health / maxHealth));

    // Dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y, width, height, 2);
    ctx.fill();

    // Health fill
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y, width * ratio, height, 2);
    ctx.fill();
  }
}
