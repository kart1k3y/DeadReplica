import { Camera } from './client/camera/Camera';
import { InputManager } from './client/input/InputManager';
import { Renderer } from './client/rendering/Renderer';
import { DebugOverlay } from './client/ui/DebugOverlay';
import { HUD } from './client/ui/HUD';
import { LocalGameDriver } from './driver/LocalGameDriver';
import { GameApi } from './game/api/GameApi';
import { DEFAULT_GAME_CONFIG } from './game/config/DefaultConfig';
import { EntityId } from './game/entities/EntityTypes';

class GameApplication {
  private driver: LocalGameDriver;
  public api: GameApi;
  private renderer: Renderer;
  private camera: Camera;
  private inputManager: InputManager;
  private hud: HUD;
  private debugOverlay: DebugOverlay;

  private localPlayerId: EntityId = 'player-1';
  private canvas: HTMLCanvasElement;
  private lastTime = performance.now();

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    // 1. Initialize Local Driver with Centralized Configuration
    this.driver = new LocalGameDriver(DEFAULT_GAME_CONFIG);

    // 2. Initialize Game Programmatic API facade
    this.api = new GameApi(this.driver);

    // 3. Renderer setup
    this.renderer = new Renderer(this.canvas, this.driver.upgradeSystem);

    // 4. Camera setup (follows local player)
    this.camera = new Camera(this.localPlayerId);

    // 5. HUD Setup
    this.hud = new HUD(
      this.driver,
      this.localPlayerId,
      (slot) => this.inputManager.selectSlot(slot),
      () => this.inputManager.triggerUpgradeHeldTool(),
      () => this.debugOverlay.toggle()
    );

    // 6. Debug Overlay & API
    this.debugOverlay = new DebugOverlay(this.api, this.driver, this.renderer, this.localPlayerId);

    // 7. Input Manager (Pure command creator -> enqueues to driver)
    this.inputManager = new InputManager(
      this.driver,
      this.camera,
      this.localPlayerId,
      undefined,
      () => this.debugOverlay.toggle()
    );

    // 8. Start with Empty World -> World Generation -> Natural Resources -> Spawn Player
    this.initializeWorld();

    // 9. Start Client Render Loop
    this.startLoop();
  }

  /**
   * Requirement 5: Start With an Empty World
   * Open empty world -> Generate world -> Spawn resources -> Spawn player
   */
  private initializeWorld(): void {
    const state = this.driver.getState();

    // 1. Calculate continuous world dimensions for 1 player
    const { width, height } = this.driver.worldSystem.calculateWorldDimensions(1);
    state.world.width = width;
    state.world.height = height;

    // 2. Spawn spacious natural resources (Trees, Rocks, Gold)
    this.driver.worldSystem.generateNaturalResources(state);

    // 3. Spawn Local Player in center
    const spawnX = Math.round(width / 2);
    const spawnY = Math.round(height / 2);
    this.api.players.spawn(this.localPlayerId, { x: spawnX, y: spawnY }, 'Survivor (You)', '#3498db');

    // 4. Spawn a couple of roaming zombies at a moderate distance for immediate testing
    this.api.zombies.spawn({ x: spawnX + 320, y: spawnY - 260 }, 'SWORD');
    this.api.zombies.spawn({ x: spawnX - 380, y: spawnY + 280 }, 'AXE');

    // Position camera on player immediately
    this.camera.x = spawnX;
    this.camera.y = spawnY;

    console.log(
      `%c[WORLD INITIALIZED] Continuous dimensions: ${width}x${height}px. Natural resources: ${state.objects.size}. Local Player: ${this.localPlayerId}`,
      'color: #2ecc71; font-weight: bold;'
    );
  }

  private startLoop(): void {
    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
      this.lastTime = currentTime;

      this.update(dt);
      this.render(dt);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    const state = this.driver.getState();
    const localPlayer = state.players.get(this.localPlayerId);

    // Update continuous input actions (e.g. hold-to-attack / mouse world recalculation)
    this.inputManager.update();

    // Camera follow lerp
    this.camera.update(state, dt);

    // Placement preview ghost when building slot is selected
    if (localPlayer && localPlayer.activeSlot.kind === 'building') {
      const bType = localPlayer.activeSlot.building;
      const bPos = this.inputManager.mouseWorldPos;
      const validation = this.driver.buildingSystem.validatePlacement(state, bType, bPos, localPlayer);
      const bConfig = this.driver.getConfig().buildings[bType];

      this.renderer.placementGhost = {
        type: bType,
        position: bPos,
        minerResource: localPlayer.activeSlot.minerResource ?? this.inputManager.getMinerResource(),
        valid: validation.valid,
        turretRange: bConfig.attackRange,
      };
    } else {
      this.renderer.placementGhost = null;
    }

    // Update HUD
    this.hud.update(localPlayer);

    // Update Debug telemetry if visible
    this.debugOverlay.updateTelemetry();
  }

  private render(dt: number): void {
    const state = this.driver.getState();
    this.renderer.render(state, this.camera, this.localPlayerId, dt);
  }
}

// Start application once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApplication();
});
