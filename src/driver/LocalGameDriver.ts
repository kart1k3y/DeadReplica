import { GameDriver } from './GameDriver';
import { GameCommand } from '../game/commands/GameCommand';
import { DEFAULT_GAME_CONFIG } from '../game/config/DefaultConfig';
import { GameConfig } from '../game/config/GameConfig';
import {
  BuildingState,
  EntityId,
  PlayerState,
  WorldObjectState,
  ZombieState,
} from '../game/entities/EntityTypes';
import { createEmptyGameState, GameState } from '../game/state/GameState';
import { StateUpdate } from '../game/state/StateUpdate';
import { BuildingSystem } from '../game/systems/BuildingSystem';
import { CombatSystem } from '../game/systems/CombatSystem';
import { ItemSystem } from '../game/systems/ItemSystem';
import { MiningSystem } from '../game/systems/MiningSystem';
import { MovementSystem } from '../game/systems/MovementSystem';
import { TurretMinerSystem } from '../game/systems/TurretMinerSystem';
import { UpgradeSystem } from '../game/systems/UpgradeSystem';
import { WorldSystem } from '../game/systems/WorldSystem';
import { OutgoingCommandQueue } from '../networking/OutgoingCommandQueue';

export class LocalGameDriver implements GameDriver {
  private config: GameConfig;
  private state: GameState;
  private listeners: Set<(state: GameState) => void> = new Set();
  private commandQueue: OutgoingCommandQueue;

  // Game Systems
  public worldSystem: WorldSystem;
  public movementSystem: MovementSystem;
  public combatSystem: CombatSystem;
  public miningSystem: MiningSystem;
  public buildingSystem: BuildingSystem;
  public itemSystem: ItemSystem;
  public upgradeSystem: UpgradeSystem;
  public turretMinerSystem: TurretMinerSystem;

  private isRunning = false;
  private lastTickTime = performance.now();
  private animationFrameId?: number;
  private respawnTimer = 0;
  private zombieSpawnTimer = 0;
  private arrowRegenTimer = 0;

  constructor(initialConfig?: GameConfig) {
    this.config = initialConfig ?? DEFAULT_GAME_CONFIG;

    // Instantiate systems with configuration
    this.worldSystem = new WorldSystem(this.config);
    this.movementSystem = new MovementSystem(this.config);
    this.combatSystem = new CombatSystem(this.config);
    this.miningSystem = new MiningSystem(this.config);
    this.buildingSystem = new BuildingSystem(this.config);
    this.itemSystem = new ItemSystem(this.config, this.buildingSystem);
    this.upgradeSystem = new UpgradeSystem(this.config);
    this.turretMinerSystem = new TurretMinerSystem(this.config);

    // Initial world dimensions from player count
    const { width, height } = this.worldSystem.calculateWorldDimensions(1);
    this.state = createEmptyGameState(width, height, 1);

    // Setup command queue with immediate local execution
    this.commandQueue = new OutgoingCommandQueue({
      logToConsole: true,
      onCommandDispatched: (cmd) => this.executeCommandDirectly(cmd),
    });

    this.startLoop();
  }

  public getCommandQueue(): OutgoingCommandQueue {
    return this.commandQueue;
  }

  public initializeConfig(config: GameConfig): void {
    this.config = config;
    this.worldSystem.setConfig(config);
    this.movementSystem.setConfig(config);
    this.combatSystem.setConfig(config);
    this.miningSystem.setConfig(config);
    this.buildingSystem.setConfig(config);
    this.itemSystem.setConfig(config);
    this.upgradeSystem.setConfig(config);
    this.turretMinerSystem.setConfig(config);
    console.log('[LOCAL DRIVER] Game configuration initialized from server definition.');
  }

  public getConfig(): GameConfig {
    return this.config;
  }

  public getState(): GameState {
    return this.state;
  }

  public subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * High-level command submission via the OutgoingCommandQueue
   */
  public sendCommand(command: GameCommand): void {
    this.commandQueue.enqueue(command);
  }

  /**
   * Internal authoritative command execution
   */
  private executeCommandDirectly(command: GameCommand): void {
    switch (command.type) {
      case 'PLAYER_MOVE': {
        const player = this.state.players.get(command.playerId);
        if (player && !player.isDead) {
          player.velocity = command.velocity;
          if (command.position) {
            player.position = { ...command.position };
          }
        }
        break;
      }

      case 'PLAYER_AIM': {
        const player = this.state.players.get(command.playerId);
        if (player && !player.isDead) {
          player.rotation = command.rotation;
        }
        break;
      }

      case 'PLAYER_SELECT_SLOT': {
        const player = this.state.players.get(command.playerId);
        if (player && !player.isDead) {
          player.activeSlot = command.slot;
        }
        break;
      }

      case 'PLAYER_ATTACK': {
        const player = this.state.players.get(command.playerId);
        if (!player || player.isDead) break;

        if (player.activeSlot.kind === 'tool') {
          this.combatSystem.playerAttack(this.state, command.playerId);
        } else if (player.activeSlot.kind === 'item') {
          this.itemSystem.useItem(this.state, command.playerId, player.activeSlot.item);
        }
        break;
      }

      case 'PLAYER_MINE': {
        this.miningSystem.mine(this.state, command.playerId, command.resourceId);
        break;
      }

      case 'PLAYER_USE_ITEM': {
        this.itemSystem.useItem(this.state, command.playerId, command.item, command.targetEntityId);
        break;
      }

      case 'PLAYER_PLACE_BUILDING': {
        this.buildingSystem.placeBuilding(
          this.state,
          command.playerId,
          command.building,
          command.position,
          command.minerResource
        );
        break;
      }

      case 'PLAYER_UPGRADE_TOOL': {
        this.upgradeSystem.upgradeTool(this.state, command.playerId, command.tool);
        break;
      }

      case 'PLAYER_UPGRADE_BUILDING': {
        this.buildingSystem.upgradeBuilding(this.state, command.playerId, command.buildingId);
        break;
      }

      case 'PLAYER_REPAIR_BUILDING': {
        this.buildingSystem.repairBuilding(this.state, command.playerId, command.buildingId);
        break;
      }

      case 'PLAYER_REVIVE': {
        this.itemSystem.useItem(this.state, command.playerId, 'REVIVE', command.targetPlayerId);
        break;
      }
    }
  }

  /**
   * Applies external authoritative state updates directly to GameState
   */
  public applyStateUpdate(update: StateUpdate): void {
    switch (update.type) {
      case 'SNAPSHOT':
        Object.assign(this.state.world, update.state);
        break;
      case 'PLAYER_SPAWN':
        this.state.players.set(update.player.id, update.player);
        break;
      case 'PLAYER_UPDATE': {
        const p = this.state.players.get(update.playerId);
        if (p) Object.assign(p, update.patch);
        break;
      }
      case 'PLAYER_REMOVE':
        this.state.players.delete(update.playerId);
        break;
      case 'ZOMBIE_SPAWN':
        this.state.zombies.set(update.zombie.id, update.zombie);
        break;
      case 'ZOMBIE_UPDATE': {
        const z = this.state.zombies.get(update.zombieId);
        if (z) Object.assign(z, update.patch);
        break;
      }
      case 'ZOMBIE_REMOVE':
        this.state.zombies.delete(update.zombieId);
        break;
      case 'OBJECT_SPAWN':
        this.state.objects.set(update.object.id, update.object);
        break;
      case 'OBJECT_UPDATE': {
        const obj = this.state.objects.get(update.objectId);
        if (obj) Object.assign(obj, update.patch);
        break;
      }
      case 'OBJECT_REMOVE':
        this.state.objects.delete(update.objectId);
        break;
      case 'BUILDING_SPAWN':
        this.state.buildings.set(update.building.id, update.building);
        break;
      case 'BUILDING_UPDATE': {
        const b = this.state.buildings.get(update.buildingId);
        if (b) Object.assign(b, update.patch);
        break;
      }
      case 'BUILDING_REMOVE':
        this.state.buildings.delete(update.buildingId);
        break;
      case 'PROJECTILE_SPAWN':
        this.state.projectiles.set(update.projectile.id, update.projectile);
        break;
      case 'PROJECTILE_REMOVE':
        this.state.projectiles.delete(update.projectileId);
        break;
      case 'ITEM_SPAWN':
        this.state.droppedItems.set(update.item.id, update.item);
        break;
      case 'ITEM_REMOVE':
        this.state.droppedItems.delete(update.itemId);
        break;
      case 'GENERIC_ENTITY_UPDATE': {
        const id = update.entityId;
        if (this.state.players.has(id)) {
          const p = this.state.players.get(id)!;
          if (update.patch.x !== undefined) p.position.x = update.patch.x;
          if (update.patch.y !== undefined) p.position.y = update.patch.y;
          if (update.patch.health !== undefined) p.health = update.patch.health;
        } else if (this.state.zombies.has(id)) {
          const z = this.state.zombies.get(id)!;
          if (update.patch.x !== undefined) z.position.x = update.patch.x;
          if (update.patch.y !== undefined) z.position.y = update.patch.y;
          if (update.patch.health !== undefined) z.health = update.patch.health;
        } else if (this.state.objects.has(id)) {
          const o = this.state.objects.get(id)!;
          if (update.patch.health !== undefined) o.health = update.patch.health;
        } else if (this.state.buildings.has(id)) {
          const b = this.state.buildings.get(id)!;
          if (update.patch.health !== undefined) b.health = update.patch.health;
        }
        break;
      }
    }
  }

  private startLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTickTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - this.lastTickTime) / 1000);
      this.lastTickTime = currentTime;

      this.tick(dt);

      // Notify listeners (UI, Renderer)
      for (const listener of this.listeners) {
        listener(this.state);
      }

      if (this.isRunning) {
        if (typeof requestAnimationFrame !== 'undefined') {
          this.animationFrameId = requestAnimationFrame(loop) as unknown as number;
        } else {
          this.animationFrameId = setTimeout(() => loop(performance.now()), 16) as unknown as number;
        }
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(loop) as unknown as number;
    } else {
      this.animationFrameId = setTimeout(() => loop(performance.now()), 16) as unknown as number;
    }
  }

  public stopLoop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== undefined) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animationFrameId);
      } else {
        clearTimeout(this.animationFrameId);
      }
    }
  }

  /**
   * Main simulation tick running authoritative local systems
   */
  private tick(dt: number): void {
    // 1. Movement & physics
    this.movementSystem.update(this.state, dt);

    // 2. Projectile collisions
    this.combatSystem.updateProjectileHits(this.state);

    // 3. Zombie behaviors & attacks
    this.combatSystem.updateZombieBehaviors(this.state, dt);

    // 4. Automated Turrets and Miners
    this.turretMinerSystem.update(this.state, dt);

    // 5. Arrow passive regeneration for players
    this.arrowRegenTimer += dt;
    const arrowInterval = this.config.tools.BOW.arrowRegenSeconds;
    if (this.arrowRegenTimer >= arrowInterval) {
      this.arrowRegenTimer = 0;
      for (const player of this.state.players.values()) {
        if (!player.isDead && player.inventory.arrows < this.config.tools.BOW.arrowMaxCount) {
          player.inventory.arrows++;
        }
      }
    }

    // 6. Natural resource respawning
    this.respawnTimer += dt * 1000;
    if (this.respawnTimer >= this.config.resources.respawnIntervalMs) {
      this.respawnTimer = 0;
      this.worldSystem.respawnNaturalResource(this.state);
    }

    // 7. Zombie spawner
    this.zombieSpawnTimer += dt * 1000;
    if (
      this.zombieSpawnTimer >= this.config.zombie.spawnIntervalMs &&
      this.state.zombies.size < this.config.zombie.maxActiveZombies
    ) {
      this.zombieSpawnTimer = 0;
      this.spawnRandomZombie();
    }

    // 8. Dropped items collection
    for (const [id, item] of this.state.droppedItems.entries()) {
      item.lifetime -= dt;
      if (item.lifetime <= 0) {
        this.state.droppedItems.delete(id);
        continue;
      }

      // Check pickup by nearby living players
      for (const player of this.state.players.values()) {
        if (player.isDead) continue;
        const dist = Math.hypot(player.position.x - item.position.x, player.position.y - item.position.y);
        if (dist < player.hitbox.radius + 20) {
          if (item.resourceType === 'WOOD') player.inventory.wood += item.amount;
          if (item.resourceType === 'STONE') player.inventory.stone += item.amount;
          if (item.resourceType === 'GOLD') player.inventory.gold += item.amount;
          if (item.itemType === 'APPLE') player.inventory.apples += item.amount;

          this.combatSystem.addFloatingText(
            this.state,
            `+${item.amount} ${item.resourceType ?? item.itemType}`,
            item.position.x,
            item.position.y - 15,
            '#2ed573'
          );

          this.state.droppedItems.delete(id);
          break;
        }
      }
    }
  }

  private spawnRandomZombie(): void {
    const { width, height } = this.state.world;
    const padding = 60;
    const x = padding + Math.random() * (width - padding * 2);
    const y = padding + Math.random() * (height - padding * 2);

    const id = `zombie-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const heldTools = ['SWORD', 'AXE', 'PICKAXE'] as const;
    const heldTool = heldTools[Math.floor(Math.random() * heldTools.length)];

    const zombie: ZombieState = {
      id,
      position: { x, y },
      velocity: { vx: 0, vy: 0 },
      rotation: Math.random() * Math.PI * 2,
      hitbox: { type: 'circle', radius: 24 },
      health: this.config.zombie.baseHealth,
      maxHealth: this.config.zombie.baseHealth,
      isDead: false,
      damageFlashTime: 0,
      heldTool,
      upgradeLevel: 1,
      isAttacking: false,
      attackCooldown: 0,
      attackProgress: 0,
    };

    this.state.zombies.set(id, zombie);
  }
}
