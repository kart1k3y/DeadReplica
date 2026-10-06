import { LocalGameDriver } from '../../driver/LocalGameDriver';
import { BuildingType, GameConfig, ItemType, ResourceType, ToolType } from '../config/GameConfig';
import {
  ActiveSlotType,
  BuildingState,
  EntityId,
  PlayerState,
  Position,
  WorldObjectState,
  WorldObjectType,
  ZombieState,
} from '../entities/EntityTypes';
import { GameState } from '../state/GameState';

export interface ObjectsApi {
  place: (type: WorldObjectType, position: Position, id?: EntityId) => WorldObjectState;
  remove: (id: EntityId) => boolean;
  update: (id: EntityId, patch: Partial<WorldObjectState>) => boolean;
  get: (id: EntityId) => WorldObjectState | undefined;
  damage: (id: EntityId, amount: number) => boolean;
}

export interface PlayersApi {
  spawn: (id: EntityId, position: Position, name?: string, color?: string) => PlayerState;
  remove: (id: EntityId) => boolean;
  move: (id: EntityId, position: Position) => boolean;
  update: (id: EntityId, patch: Partial<PlayerState>) => boolean;
  get: (id: EntityId) => PlayerState | undefined;
  heal: (id: EntityId, amount: number) => boolean;
  damage: (id: EntityId, amount: number) => boolean;
  giveItem: (id: EntityId, item: ItemType, count?: number) => boolean;
  removeItem: (id: EntityId, item: ItemType, count?: number) => boolean;
  giveResource: (id: EntityId, resource: ResourceType, count: number) => boolean;
  upgradeTool: (id: EntityId, tool: ToolType) => boolean;
  selectSlot: (id: EntityId, slot: ActiveSlotType) => boolean;
}

export interface ZombiesApi {
  spawn: (position: Position, heldTool?: ToolType, id?: EntityId) => ZombieState;
  remove: (id: EntityId) => boolean;
  update: (id: EntityId, patch: Partial<ZombieState>) => boolean;
  get: (id: EntityId) => ZombieState | undefined;
  damage: (id: EntityId, amount: number) => boolean;
  upgrade: (id: EntityId, level: number) => boolean;
}

export interface BuildingsApi {
  place: (
    type: BuildingType,
    position: Position,
    ownerPlayerId: EntityId,
    minerResource?: ResourceType,
    id?: EntityId
  ) => BuildingState | null;
  remove: (id: EntityId) => boolean;
  update: (id: EntityId, patch: Partial<BuildingState>) => boolean;
  get: (id: EntityId) => BuildingState | undefined;
  damage: (id: EntityId, amount: number) => boolean;
  upgrade: (id: EntityId, playerId?: EntityId) => boolean;
  repair: (id: EntityId, playerId?: EntityId) => boolean;
}

export class GameApi {
  private driver: LocalGameDriver;

  public objects: ObjectsApi;
  public players: PlayersApi;
  public zombies: ZombiesApi;
  public buildings: BuildingsApi;

  constructor(driver: LocalGameDriver) {
    this.driver = driver;

    // --- Objects API Subsystem ---
    this.objects = {
      place: (type: WorldObjectType, position: Position, id?: EntityId): WorldObjectState => {
        const obj = this.driver.worldSystem.createResourceObject(type, position, id);
        this.driver.getState().objects.set(obj.id, obj);
        return obj;
      },
      remove: (id: EntityId): boolean => {
        return this.driver.getState().objects.delete(id);
      },
      update: (id: EntityId, patch: Partial<WorldObjectState>): boolean => {
        const obj = this.driver.getState().objects.get(id);
        if (!obj) return false;
        Object.assign(obj, patch);
        return true;
      },
      get: (id: EntityId): WorldObjectState | undefined => {
        return this.driver.getState().objects.get(id);
      },
      damage: (id: EntityId, amount: number): boolean => {
        const obj = this.driver.getState().objects.get(id);
        if (!obj) return false;
        obj.health -= amount;
        obj.damageFlashTime = 120;
        if (obj.health <= 0) {
          this.driver.getState().objects.delete(id);
        }
        return true;
      },
    };

    // --- Players API Subsystem ---
    this.players = {
      spawn: (id: EntityId, position: Position, name = 'Survivor', color = '#3498db'): PlayerState => {
        const player: PlayerState = {
          id,
          name,
          color,
          position: { ...position },
          rotation: 0,
          velocity: { vx: 0, vy: 0 },
          hitbox: { type: 'circle', radius: 24 },
          health: this.driver.getConfig().player.maxHealth,
          maxHealth: this.driver.getConfig().player.maxHealth,
          isDead: false,
          damageFlashTime: 0,
          inventory: {
            wood: 80,
            stone: 40,
            gold: 25,
            arrows: 15,
            apples: 3,
            wrenches: 1,
            revives: 1,
          },
          activeSlot: { kind: 'tool', tool: 'AXE' },
          toolLevels: {
            AXE: 1,
            PICKAXE: 1,
            SWORD: 1,
            BOW: 1,
          },
          isAttacking: false,
          attackCooldown: 0,
          attackProgress: 0,
        };
        this.driver.getState().players.set(id, player);
        return player;
      },
      remove: (id: EntityId): boolean => {
        return this.driver.getState().players.delete(id);
      },
      move: (id: EntityId, position: Position): boolean => {
        const p = this.driver.getState().players.get(id);
        if (!p) return false;
        p.position = { ...position };
        return true;
      },
      update: (id: EntityId, patch: Partial<PlayerState>): boolean => {
        const p = this.driver.getState().players.get(id);
        if (!p) return false;
        Object.assign(p, patch);
        return true;
      },
      get: (id: EntityId): PlayerState | undefined => {
        return this.driver.getState().players.get(id);
      },
      heal: (id: EntityId, amount: number): boolean => {
        const p = this.driver.getState().players.get(id);
        if (!p) return false;
        p.health = Math.min(p.maxHealth, p.health + amount);
        return true;
      },
      damage: (id: EntityId, amount: number): boolean => {
        const p = this.driver.getState().players.get(id);
        if (!p) return false;
        this.driver.combatSystem.damagePlayer(this.driver.getState(), p, amount);
        return true;
      },
      giveItem: (id: EntityId, item: ItemType, count = 1): boolean => {
        const p = this.driver.getState().players.get(id);
        if (!p) return false;
        if (item === 'APPLE') p.inventory.apples += count;
        if (item === 'WRENCH') p.inventory.wrenches += count;
        if (item === 'REVIVE') p.inventory.revives += count;
        return true;
      },
      removeItem: (id: EntityId, item: ItemType, count = 1): boolean => {
        const p = this.driver.getState().players.get(id);
        if (!p) return false;
        if (item === 'APPLE') p.inventory.apples = Math.max(0, p.inventory.apples - count);
        if (item === 'WRENCH') p.inventory.wrenches = Math.max(0, p.inventory.wrenches - count);
        if (item === 'REVIVE') p.inventory.revives = Math.max(0, p.inventory.revives - count);
        return true;
      },
      giveResource: (id: EntityId, resource: ResourceType, count: number): boolean => {
        const p = this.driver.getState().players.get(id);
        if (!p) return false;
        if (resource === 'WOOD') p.inventory.wood += count;
        if (resource === 'STONE') p.inventory.stone += count;
        if (resource === 'GOLD') p.inventory.gold += count;
        return true;
      },
      upgradeTool: (id: EntityId, tool: ToolType): boolean => {
        return this.driver.upgradeSystem.upgradeTool(this.driver.getState(), id, tool);
      },
      selectSlot: (id: EntityId, slot: ActiveSlotType): boolean => {
        const p = this.driver.getState().players.get(id);
        if (!p) return false;
        p.activeSlot = slot;
        return true;
      },
    };

    // --- Zombies API Subsystem ---
    this.zombies = {
      spawn: (position: Position, heldTool: ToolType = 'SWORD', id?: EntityId): ZombieState => {
        const zombieId = id ?? `zombie-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
        const zombie: ZombieState = {
          id: zombieId,
          position: { ...position },
          velocity: { vx: 0, vy: 0 },
          rotation: Math.random() * Math.PI * 2,
          hitbox: { type: 'circle', radius: 24 },
          health: this.driver.getConfig().zombie.baseHealth,
          maxHealth: this.driver.getConfig().zombie.baseHealth,
          isDead: false,
          damageFlashTime: 0,
          heldTool,
          upgradeLevel: 1,
          isAttacking: false,
          attackCooldown: 0,
          attackProgress: 0,
        };
        this.driver.getState().zombies.set(zombieId, zombie);
        return zombie;
      },
      remove: (id: EntityId): boolean => {
        return this.driver.getState().zombies.delete(id);
      },
      update: (id: EntityId, patch: Partial<ZombieState>): boolean => {
        const z = this.driver.getState().zombies.get(id);
        if (!z) return false;
        Object.assign(z, patch);
        return true;
      },
      get: (id: EntityId): ZombieState | undefined => {
        return this.driver.getState().zombies.get(id);
      },
      damage: (id: EntityId, amount: number): boolean => {
        const z = this.driver.getState().zombies.get(id);
        if (!z) return false;
        this.driver.combatSystem.damageZombie(this.driver.getState(), z, amount);
        return true;
      },
      upgrade: (id: EntityId, level: number): boolean => {
        const z = this.driver.getState().zombies.get(id);
        if (!z) return false;
        z.upgradeLevel = level;
        return true;
      },
    };

    // --- Buildings API Subsystem ---
    this.buildings = {
      place: (
        type: BuildingType,
        position: Position,
        ownerPlayerId: EntityId,
        minerResource?: ResourceType,
        id?: EntityId
      ): BuildingState | null => {
        return this.driver.buildingSystem.placeBuilding(
          this.driver.getState(),
          ownerPlayerId,
          type,
          position,
          minerResource,
          id
        );
      },
      remove: (id: EntityId): boolean => {
        return this.driver.getState().buildings.delete(id);
      },
      update: (id: EntityId, patch: Partial<BuildingState>): boolean => {
        const b = this.driver.getState().buildings.get(id);
        if (!b) return false;
        Object.assign(b, patch);
        return true;
      },
      get: (id: EntityId): BuildingState | undefined => {
        return this.driver.getState().buildings.get(id);
      },
      damage: (id: EntityId, amount: number): boolean => {
        const b = this.driver.getState().buildings.get(id);
        if (!b) return false;
        b.health -= amount;
        b.damageFlashTime = 120;
        if (b.health <= 0) {
          b.health = 0;
          b.isDead = true;
          this.driver.getState().buildings.delete(id);
        }
        return true;
      },
      upgrade: (id: EntityId, playerId?: EntityId): boolean => {
        const b = this.driver.getState().buildings.get(id);
        if (!b) return false;
        const ownerId = playerId ?? b.ownerPlayerId;
        return this.driver.buildingSystem.upgradeBuilding(this.driver.getState(), ownerId, id);
      },
      repair: (id: EntityId, playerId?: EntityId): boolean => {
        const b = this.driver.getState().buildings.get(id);
        if (!b) return false;
        const ownerId = playerId ?? b.ownerPlayerId;
        return this.driver.buildingSystem.repairBuilding(this.driver.getState(), ownerId, id);
      },
    };
  }

  // --- Convenient Root Wrappers ---

  public placeTree(position: Position, id?: EntityId): WorldObjectState {
    return this.objects.place('TREE', position, id);
  }

  public placeObject(object: WorldObjectState): WorldObjectState {
    this.driver.getState().objects.set(object.id, object);
    return object;
  }

  public removeObject(id: EntityId): boolean {
    return this.objects.remove(id);
  }

  public moveObject(id: EntityId, position: Position): boolean {
    return this.objects.update(id, { position: { ...position } });
  }

  public updateObject(id: EntityId, patch: Partial<WorldObjectState>): boolean {
    return this.objects.update(id, patch);
  }

  public spawnPlayer(id: EntityId, position: Position, name?: string, color?: string): PlayerState {
    return this.players.spawn(id, position, name, color);
  }

  public removePlayer(id: EntityId): boolean {
    return this.players.remove(id);
  }

  public spawnZombie(position: Position, heldTool: ToolType = 'SWORD', id?: EntityId): ZombieState {
    return this.zombies.spawn(position, heldTool, id);
  }

  public damageObject(id: EntityId, amount: number): boolean {
    return this.objects.damage(id, amount);
  }

  public healPlayer(id: EntityId, amount: number): boolean {
    return this.players.heal(id, amount);
  }

  public upgradeObject(id: EntityId): boolean {
    if (this.driver.getState().buildings.has(id)) {
      return this.buildings.upgrade(id);
    }
    if (this.driver.getState().zombies.has(id)) {
      const z = this.driver.getState().zombies.get(id)!;
      return this.zombies.upgrade(id, z.upgradeLevel + 1);
    }
    return false;
  }

  public giveItem(playerId: EntityId, item: ItemType, count = 1): boolean {
    return this.players.giveItem(playerId, item, count);
  }

  public removeItem(playerId: EntityId, item: ItemType, count = 1): boolean {
    return this.players.removeItem(playerId, item, count);
  }

  public initializeConfig(config: GameConfig): void {
    this.driver.initializeConfig(config);
  }

  public getConfig(): GameConfig {
    return this.driver.getConfig();
  }

  public getState(): GameState {
    return this.driver.getState();
  }
}
