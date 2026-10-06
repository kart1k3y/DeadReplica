import { GameDriver } from '../../driver/GameDriver';
import { ActiveSlotType, EntityId, Position, ResourceType } from '../../game/entities/EntityTypes';
import { Camera } from '../camera/Camera';
import { DEFAULT_KEY_BINDINGS, KeyBindings } from './InputConfig';

export class InputManager {
  private driver: GameDriver;
  private camera: Camera;
  private localPlayerId: EntityId;
  private bindings: KeyBindings;

  private activeKeys: Set<string> = new Set();
  public mouseScreenPos: Position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  public mouseWorldPos: Position = { x: 0, y: 0 };
  public isMouseDown = false;
  private currentMinerResource: ResourceType = 'GOLD';
  private onToggleDebug?: () => void;

  constructor(
    driver: GameDriver,
    camera: Camera,
    localPlayerId: EntityId,
    bindings: KeyBindings = DEFAULT_KEY_BINDINGS,
    onToggleDebug?: () => void
  ) {
    this.driver = driver;
    this.camera = camera;
    this.localPlayerId = localPlayerId;
    this.bindings = bindings;
    this.onToggleDebug = onToggleDebug;

    this.bindEvents();
  }

  public setLocalPlayerId(id: EntityId): void {
    this.localPlayerId = id;
  }

  public getMinerResource(): ResourceType {
    return this.currentMinerResource;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    window.addEventListener('contextmenu', (e) => e.preventDefault()); // prevent right click menu
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.activeKeys.has(e.code)) return;
    this.activeKeys.add(e.code);

    const matches = (keys: string[]) => keys.includes(e.code);

    // Debug toggle
    if (matches(this.bindings.debugToggle)) {
      if (this.onToggleDebug) this.onToggleDebug();
      return;
    }

    // Number keys / Slot Selection
    if (matches(this.bindings.slot1)) {
      this.selectSlot({ kind: 'tool', tool: 'AXE' });
    } else if (matches(this.bindings.slot2)) {
      this.selectSlot({ kind: 'tool', tool: 'PICKAXE' });
    } else if (matches(this.bindings.slot3)) {
      this.selectSlot({ kind: 'tool', tool: 'SWORD' });
    } else if (matches(this.bindings.slot4)) {
      this.selectSlot({ kind: 'tool', tool: 'BOW' });
    } else if (matches(this.bindings.slot5)) {
      this.selectSlot({ kind: 'item', item: 'APPLE' });
    } else if (matches(this.bindings.slot6)) {
      this.selectSlot({ kind: 'item', item: 'WRENCH' });
    } else if (matches(this.bindings.slot7)) {
      this.selectSlot({ kind: 'item', item: 'REVIVE' });
    } else if (matches(this.bindings.slot8)) {
      this.selectSlot({ kind: 'building', building: 'WALL' });
    } else if (matches(this.bindings.slot9)) {
      this.selectSlot({ kind: 'building', building: 'TURRET' });
    } else if (matches(this.bindings.slot0)) {
      this.selectSlot({
        kind: 'building',
        building: 'MINER',
        minerResource: this.currentMinerResource,
      });
    }

    // Upgrade key
    if (matches(this.bindings.upgrade)) {
      this.triggerUpgradeHeldTool();
    }

    // Cycle Miner resource
    if (matches(this.bindings.cycleMiner)) {
      const order: ResourceType[] = ['GOLD', 'WOOD', 'STONE'];
      const nextIdx = (order.indexOf(this.currentMinerResource) + 1) % order.length;
      this.currentMinerResource = order[nextIdx];

      const p = this.driver.getState().players.get(this.localPlayerId);
      if (p && p.activeSlot.kind === 'building' && p.activeSlot.building === 'MINER') {
        this.selectSlot({
          kind: 'building',
          building: 'MINER',
          minerResource: this.currentMinerResource,
        });
      }
    }

    // Spacebar attack/action
    if (matches(this.bindings.attack)) {
      this.triggerPrimaryAction();
    }

    this.sendMovementCommand();
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.activeKeys.delete(e.code);
    this.sendMovementCommand();
  }

  private handleMouseMove(e: MouseEvent): void {
    this.mouseScreenPos = { x: e.clientX, y: e.clientY };
    this.mouseWorldPos = this.camera.screenToWorld(e.clientX, e.clientY);

    // Calculate aiming angle from player to mouse position
    const player = this.driver.getState().players.get(this.localPlayerId);
    if (player) {
      const dx = this.mouseWorldPos.x - player.position.x;
      const dy = this.mouseWorldPos.y - player.position.y;
      const rotation = Math.atan2(dy, dx);

      this.driver.sendCommand({
        type: 'PLAYER_AIM',
        playerId: this.localPlayerId,
        rotation,
      });
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isMouseDown = true;
      this.triggerPrimaryAction();
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.isMouseDown = false;
    }
  }

  public selectSlot(slot: ActiveSlotType): void {
    this.driver.sendCommand({
      type: 'PLAYER_SELECT_SLOT',
      playerId: this.localPlayerId,
      slot,
    });
  }

  public triggerUpgradeHeldTool(): void {
    const player = this.driver.getState().players.get(this.localPlayerId);
    if (!player) return;

    if (player.activeSlot.kind === 'tool') {
      this.driver.sendCommand({
        type: 'PLAYER_UPGRADE_TOOL',
        playerId: this.localPlayerId,
        tool: player.activeSlot.tool,
      });
    }
  }

  public triggerPrimaryAction(): void {
    const player = this.driver.getState().players.get(this.localPlayerId);
    if (!player || player.isDead) return;

    const slot = player.activeSlot;

    if (slot.kind === 'tool') {
      if (slot.tool === 'AXE' || slot.tool === 'PICKAXE') {
        // Mine or attack
        this.driver.sendCommand({
          type: 'PLAYER_MINE',
          playerId: this.localPlayerId,
        });
      } else {
        // Sword or Bow
        this.driver.sendCommand({
          type: 'PLAYER_ATTACK',
          playerId: this.localPlayerId,
        });
      }
    } else if (slot.kind === 'item') {
      this.driver.sendCommand({
        type: 'PLAYER_USE_ITEM',
        playerId: this.localPlayerId,
        item: slot.item,
      });
    } else if (slot.kind === 'building') {
      this.driver.sendCommand({
        type: 'PLAYER_PLACE_BUILDING',
        playerId: this.localPlayerId,
        building: slot.building,
        position: { ...this.mouseWorldPos },
        minerResource: slot.minerResource ?? this.currentMinerResource,
      });
    }
  }

  /**
   * Continuous update called in game loop (for hold-to-mine/attack and movement recalculation)
   */
  public update(): void {
    // If mouse is held down, continually trigger attack/mine when cooldown is ready
    if (this.isMouseDown) {
      const player = this.driver.getState().players.get(this.localPlayerId);
      if (player && player.attackCooldown <= 0) {
        if (player.activeSlot.kind === 'tool') {
          if (player.activeSlot.tool === 'AXE' || player.activeSlot.tool === 'PICKAXE') {
            this.driver.sendCommand({ type: 'PLAYER_MINE', playerId: this.localPlayerId });
          } else {
            this.driver.sendCommand({ type: 'PLAYER_ATTACK', playerId: this.localPlayerId });
          }
        }
      }
    }
  }

  private sendMovementCommand(): void {
    const isUp = this.bindings.up.some((k) => this.activeKeys.has(k));
    const isDown = this.bindings.down.some((k) => this.activeKeys.has(k));
    const isLeft = this.bindings.left.some((k) => this.activeKeys.has(k));
    const isRight = this.bindings.right.some((k) => this.activeKeys.has(k));

    let dx = 0;
    let dy = 0;
    if (isUp) dy -= 1;
    if (isDown) dy += 1;
    if (isLeft) dx -= 1;
    if (isRight) dx += 1;

    let vx = 0;
    let vy = 0;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const speed = this.driver.getConfig().player.movementSpeed;
      vx = (dx / len) * speed;
      vy = (dy / len) * speed;
    }

    this.driver.sendCommand({
      type: 'PLAYER_MOVE',
      playerId: this.localPlayerId,
      velocity: { vx, vy },
    });
  }
}
