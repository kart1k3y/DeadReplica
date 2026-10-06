import { LocalGameDriver } from '../../driver/LocalGameDriver';
import { GameApi } from '../../game/api/GameApi';
import { EntityId, Position, WorldObjectType } from '../../game/entities/EntityTypes';
import { Renderer } from '../rendering/Renderer';

export class DebugOverlay {
  private container: HTMLElement;
  private api: GameApi;
  private driver: LocalGameDriver;
  private renderer: Renderer;
  private localPlayerId: EntityId;
  public isVisible = false;

  constructor(api: GameApi, driver: LocalGameDriver, renderer: Renderer, localPlayerId: EntityId) {
    this.api = api;
    this.driver = driver;
    this.renderer = renderer;
    this.localPlayerId = localPlayerId;

    this.container = document.createElement('div');
    this.container.id = 'debug-overlay';
    this.container.className = 'debug-overlay hidden';
    document.body.appendChild(this.container);

    this.exposeGlobalDebugApi();
    this.render();
  }

  public setLocalPlayerId(id: EntityId): void {
    this.localPlayerId = id;
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.container.classList.remove('hidden');
    } else {
      this.container.classList.add('hidden');
    }
  }

  private exposeGlobalDebugApi(): void {
    const debug = {
      spawnTree: (pos?: Position) => {
        const p = pos ?? this.getRandomNearPlayer();
        const tree = this.api.objects.place('TREE', p);
        console.log('[DEBUG] Spawned Tree at', tree.position);
        return tree;
      },
      spawnGold: (pos?: Position) => {
        const p = pos ?? this.getRandomNearPlayer();
        const gold = this.api.objects.place('GOLD', p);
        console.log('[DEBUG] Spawned Gold node at', gold.position);
        return gold;
      },
      spawnStone: (pos?: Position) => {
        const p = pos ?? this.getRandomNearPlayer();
        const stone = this.api.objects.place('STONE', p);
        console.log('[DEBUG] Spawned Stone node at', stone.position);
        return stone;
      },
      spawnPlayer: (id?: string, pos?: Position) => {
        const pid = id ?? `player-${Date.now().toString(36)}`;
        const p = pos ?? this.getRandomNearPlayer();
        const player = this.api.players.spawn(pid, p, `Ally ${pid.slice(-3)}`, '#2ecc71');
        console.log('[DEBUG] Spawned Co-op Player', player);
        return player;
      },
      spawnZombie: (pos?: Position) => {
        const p = pos ?? this.getRandomNearPlayer();
        const zombie = this.api.zombies.spawn(p);
        console.log('[DEBUG] Spawned Zombie at', zombie.position);
        return zombie;
      },
      giveResources: (res: { wood?: number; stone?: number; gold?: number }) => {
        const p = this.driver.getState().players.get(this.localPlayerId);
        if (p) {
          p.inventory.wood += res.wood ?? 1000;
          p.inventory.stone += res.stone ?? 1000;
          p.inventory.gold += res.gold ?? 1000;
          p.inventory.arrows += 50;
          p.inventory.apples += 10;
          p.inventory.wrenches += 5;
          p.inventory.revives += 5;
          console.log('[DEBUG] Granted resources to player:', p.inventory);
        }
      },
      upgradeEntity: (id: EntityId) => {
        const success = this.api.upgradeObject(id);
        console.log('[DEBUG] Upgrade entity', id, success ? 'SUCCESS' : 'FAILED');
        return success;
      },
      damageEntity: (id: EntityId, amount = 30) => {
        let done = false;
        if (this.driver.getState().zombies.has(id)) {
          done = this.api.zombies.damage(id, amount);
        } else if (this.driver.getState().players.has(id)) {
          done = this.api.players.damage(id, amount);
        } else if (this.driver.getState().objects.has(id)) {
          done = this.api.objects.damage(id, amount);
        } else if (this.driver.getState().buildings.has(id)) {
          done = this.api.buildings.damage(id, amount);
        }
        console.log('[DEBUG] Damaged entity', id, amount, 'HP. Success:', done);
        return done;
      },
      killEntity: (id: EntityId) => {
        return debug.damageEntity(id, 99999);
      },
      toggleHitboxes: () => {
        this.renderer.showHitboxes = !this.renderer.showHitboxes;
        console.log('[DEBUG] Hitboxes overlay:', this.renderer.showHitboxes);
      },
      getState: () => this.driver.getState(),
      getConfig: () => this.driver.getConfig(),
    };

    // Attach to global window
    (window as any).debug = debug;
    (window as any).game = this.api;
    console.log(
      '%c[GAME CLIENT INITIALIZED] Window APIs: "window.game" (GameApi) and "window.debug" (DebugApi) are ready.',
      'color: #00ff88; font-weight: bold; background: #011627; padding: 4px;'
    );
  }

  private getRandomNearPlayer(): Position {
    const p = this.driver.getState().players.get(this.localPlayerId);
    const baseX = p ? p.position.x : 500;
    const baseY = p ? p.position.y : 500;
    const ang = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 80;
    return {
      x: Math.round(baseX + Math.cos(ang) * dist),
      y: Math.round(baseY + Math.sin(ang) * dist),
    };
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="debug-header">
        <h3>Developer API & Debug Console</h3>
        <button class="debug-close-btn" id="btn-close-debug">&times;</button>
      </div>
      <div class="debug-body">
        <div class="debug-section">
          <h4>Authoritative Spawning API</h4>
          <div class="debug-btn-group">
            <button class="dbg-btn" id="dbg-spawn-tree">🌲 Spawn Tree</button>
            <button class="dbg-btn" id="dbg-spawn-stone">🪨 Spawn Stone</button>
            <button class="dbg-btn" id="dbg-spawn-gold">🪙 Spawn Gold</button>
            <button class="dbg-btn" id="dbg-spawn-zombie">🧟 Spawn Zombie</button>
            <button class="dbg-btn" id="dbg-spawn-player">🧑 Spawn Co-op Player</button>
          </div>
        </div>

        <div class="debug-section">
          <h4>Player Testing & Inventory</h4>
          <div class="debug-btn-group">
            <button class="dbg-btn dbg-gold-btn" id="dbg-give-res">💰 +1000 All Resources</button>
            <button class="dbg-btn" id="dbg-heal-player">💚 Full Heal</button>
            <button class="dbg-btn" id="dbg-hurt-player">💔 -30 HP</button>
            <button class="dbg-btn" id="dbg-upg-tool">✨ Upgrade Held Tool</button>
          </div>
        </div>

        <div class="debug-section">
          <h4>Inspection & Diagnostics</h4>
          <div class="debug-btn-group">
            <button class="dbg-btn" id="dbg-toggle-hitboxes">📐 Toggle Hitboxes</button>
            <button class="dbg-btn" id="dbg-clear-zombies">🧹 Clear All Zombies</button>
            <button class="dbg-btn" id="dbg-log-state">📋 Log GameState</button>
          </div>
        </div>

        <div class="debug-section">
          <h4>Live Entity Telemetry</h4>
          <div class="debug-telemetry" id="dbg-telemetry">
            <div>Players: <span id="tele-players">0</span></div>
            <div>Zombies: <span id="tele-zombies">0</span></div>
            <div>Resources: <span id="tele-resources">0</span></div>
            <div>Buildings: <span id="tele-buildings">0</span></div>
            <div>Projectiles: <span id="tele-projectiles">0</span></div>
          </div>
        </div>
      </div>
    `;

    // Event Bindings
    this.container.querySelector('#btn-close-debug')?.addEventListener('click', () => this.toggle());

    this.container.querySelector('#dbg-spawn-tree')?.addEventListener('click', () => (window as any).debug.spawnTree());
    this.container.querySelector('#dbg-spawn-stone')?.addEventListener('click', () => (window as any).debug.spawnStone());
    this.container.querySelector('#dbg-spawn-gold')?.addEventListener('click', () => (window as any).debug.spawnGold());
    this.container.querySelector('#dbg-spawn-zombie')?.addEventListener('click', () => (window as any).debug.spawnZombie());
    this.container.querySelector('#dbg-spawn-player')?.addEventListener('click', () => (window as any).debug.spawnPlayer());
    this.container.querySelector('#dbg-give-res')?.addEventListener('click', () => (window as any).debug.giveResources({}));
    this.container.querySelector('#dbg-heal-player')?.addEventListener('click', () => (window as any).debug.damageEntity(this.localPlayerId, -100));
    this.container.querySelector('#dbg-hurt-player')?.addEventListener('click', () => (window as any).debug.damageEntity(this.localPlayerId, 30));
    this.container.querySelector('#dbg-upg-tool')?.addEventListener('click', () => {
      const p = this.driver.getState().players.get(this.localPlayerId);
      if (p && p.activeSlot.kind === 'tool') {
        this.api.players.upgradeTool(this.localPlayerId, p.activeSlot.tool);
      }
    });
    this.container.querySelector('#dbg-toggle-hitboxes')?.addEventListener('click', () => (window as any).debug.toggleHitboxes());
    this.container.querySelector('#dbg-clear-zombies')?.addEventListener('click', () => {
      this.driver.getState().zombies.clear();
      console.log('[DEBUG] Cleared all zombies');
    });
    this.container.querySelector('#dbg-log-state')?.addEventListener('click', () => {
      console.log('[DEBUG] Current GameState:', this.driver.getState());
    });
  }

  public updateTelemetry(): void {
    if (!this.isVisible) return;
    const st = this.driver.getState();
    const pEl = document.getElementById('tele-players');
    const zEl = document.getElementById('tele-zombies');
    const rEl = document.getElementById('tele-resources');
    const bEl = document.getElementById('tele-buildings');
    const prEl = document.getElementById('tele-projectiles');

    if (pEl) pEl.textContent = st.players.size.toString();
    if (zEl) zEl.textContent = st.zombies.size.toString();
    if (rEl) rEl.textContent = st.objects.size.toString();
    if (bEl) bEl.textContent = st.buildings.size.toString();
    if (prEl) prEl.textContent = st.projectiles.size.toString();
  }
}
