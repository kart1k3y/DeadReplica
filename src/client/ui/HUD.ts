import { LocalGameDriver } from '../../driver/LocalGameDriver';
import { ActiveSlotType, EntityId, PlayerState } from '../../game/entities/EntityTypes';

export class HUD {
  private container: HTMLElement;
  private driver: LocalGameDriver;
  private localPlayerId: EntityId;
  private onSelectSlot: (slot: ActiveSlotType) => void;
  private onUpgradeHeldTool: () => void;
  private onToggleDebug: () => void;

  constructor(
    driver: LocalGameDriver,
    localPlayerId: EntityId,
    onSelectSlot: (slot: ActiveSlotType) => void,
    onUpgradeHeldTool: () => void,
    onToggleDebug: () => void
  ) {
    this.driver = driver;
    this.localPlayerId = localPlayerId;
    this.onSelectSlot = onSelectSlot;
    this.onUpgradeHeldTool = onUpgradeHeldTool;
    this.onToggleDebug = onToggleDebug;

    this.container = document.createElement('div');
    this.container.id = 'game-hud';
    document.body.appendChild(this.container);

    this.renderInitialStructure();
  }

  public setLocalPlayerId(id: EntityId): void {
    this.localPlayerId = id;
  }

  private renderInitialStructure(): void {
    this.container.innerHTML = `
      <!-- Top Left: Player Status -->
      <div class="hud-panel hud-status">
        <div class="hud-player-header">
          <span class="hud-player-name" id="hud-name">Survivor</span>
          <span class="hud-player-badge" id="hud-hp-text">100 / 100 HP</span>
        </div>
        <div class="hud-bar-container">
          <div class="hud-bar-fill hp-bar" id="hud-hp-bar" style="width: 100%;"></div>
        </div>
      </div>

      <!-- Top Right: Inventory Resources -->
      <div class="hud-panel hud-resources">
        <div class="resource-pill wood-pill" title="Wood">
          <span class="resource-icon">🌲</span>
          <span class="resource-val" id="res-wood">0</span>
        </div>
        <div class="resource-pill stone-pill" title="Stone">
          <span class="resource-icon">🪨</span>
          <span class="resource-val" id="res-stone">0</span>
        </div>
        <div class="resource-pill gold-pill" title="Gold">
          <span class="resource-icon">🪙</span>
          <span class="resource-val" id="res-gold">0</span>
        </div>
        <button class="hud-btn debug-toggle-btn" id="btn-toggle-debug" title="Toggle Developer Panel (~ or F1)">
          🛠️ Dev API
        </button>
      </div>

      <!-- Bottom Center: Hotbar & Upgrade Bar -->
      <div class="hud-bottom-center">
        <!-- Upgrade Banner / Action Bar -->
        <div class="hud-upgrade-bar" id="hud-upgrade-bar" style="display: none;">
          <span id="upgrade-info-text">Upgrade Axe to Lvl 2</span>
          <button class="hud-upgrade-btn" id="btn-upgrade-now">Upgrade [U]</button>
        </div>

        <!-- Hotbar Slots -->
        <div class="hud-hotbar" id="hud-hotbar">
          <div class="hotbar-slot active" data-slot="1" title="1: Wood Axe">
            <span class="slot-key">1</span>
            <span class="slot-icon">🪓</span>
            <span class="slot-badge" id="badge-axe">Lv.1</span>
          </div>
          <div class="hotbar-slot" data-slot="2" title="2: Mining Pickaxe">
            <span class="slot-key">2</span>
            <span class="slot-icon">⛏️</span>
            <span class="slot-badge" id="badge-pickaxe">Lv.1</span>
          </div>
          <div class="hotbar-slot" data-slot="3" title="3: Combat Sword">
            <span class="slot-key">3</span>
            <span class="slot-icon">🗡️</span>
            <span class="slot-badge" id="badge-sword">Lv.1</span>
          </div>
          <div class="hotbar-slot" data-slot="4" title="4: Hunting Bow">
            <span class="slot-key">4</span>
            <span class="slot-icon">🏹</span>
            <span class="slot-badge" id="badge-bow">15</span>
          </div>
          <div class="hotbar-slot" data-slot="5" title="5: Fresh Apple (Heal)">
            <span class="slot-key">5</span>
            <span class="slot-icon">🍎</span>
            <span class="slot-badge" id="badge-apple">0</span>
          </div>
          <div class="hotbar-slot" data-slot="6" title="6: Wrench (Repair Building)">
            <span class="slot-key">6</span>
            <span class="slot-icon">🔧</span>
            <span class="slot-badge" id="badge-wrench">0</span>
          </div>
          <div class="hotbar-slot" data-slot="7" title="7: Revive Kit (Revive Teammate)">
            <span class="slot-key">7</span>
            <span class="slot-icon">❤️‍🩹</span>
            <span class="slot-badge" id="badge-revive">0</span>
          </div>
          <div class="hotbar-slot" data-slot="8" title="8: Wooden Wall (Defense)">
            <span class="slot-key">8</span>
            <span class="slot-icon">🪵</span>
            <span class="slot-badge">Wall</span>
          </div>
          <div class="hotbar-slot" data-slot="9" title="9: Auto Turret (Anti-Zombie)">
            <span class="slot-key">9</span>
            <span class="slot-icon">🎯</span>
            <span class="slot-badge">Turret</span>
          </div>
          <div class="hotbar-slot" data-slot="0" title="0: Auto Miner (Extracts Wood/Stone/Gold)">
            <span class="slot-key">0</span>
            <span class="slot-icon">⚙️</span>
            <span class="slot-badge" id="badge-miner">Gold [R]</span>
          </div>
        </div>
      </div>
    `;

    // Bind click events on hotbar
    const slots = this.container.querySelectorAll('.hotbar-slot');
    slots.forEach((slotEl) => {
      slotEl.addEventListener('click', () => {
        const slotNum = slotEl.getAttribute('data-slot');
        this.handleSlotClick(slotNum);
      });
    });

    const upgradeBtn = this.container.querySelector('#btn-upgrade-now') as HTMLButtonElement;
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => this.onUpgradeHeldTool());
    }

    const devBtn = this.container.querySelector('#btn-toggle-debug') as HTMLButtonElement;
    if (devBtn) {
      devBtn.addEventListener('click', () => this.onToggleDebug());
    }
  }

  private handleSlotClick(slotNum: string | null): void {
    if (!slotNum) return;
    switch (slotNum) {
      case '1':
        this.onSelectSlot({ kind: 'tool', tool: 'AXE' });
        break;
      case '2':
        this.onSelectSlot({ kind: 'tool', tool: 'PICKAXE' });
        break;
      case '3':
        this.onSelectSlot({ kind: 'tool', tool: 'SWORD' });
        break;
      case '4':
        this.onSelectSlot({ kind: 'tool', tool: 'BOW' });
        break;
      case '5':
        this.onSelectSlot({ kind: 'item', item: 'APPLE' });
        break;
      case '6':
        this.onSelectSlot({ kind: 'item', item: 'WRENCH' });
        break;
      case '7':
        this.onSelectSlot({ kind: 'item', item: 'REVIVE' });
        break;
      case '8':
        this.onSelectSlot({ kind: 'building', building: 'WALL' });
        break;
      case '9':
        this.onSelectSlot({ kind: 'building', building: 'TURRET' });
        break;
      case '0':
        this.onSelectSlot({ kind: 'building', building: 'MINER' });
        break;
    }
  }

  public update(player?: PlayerState): void {
    if (!player) return;

    // HP Bar
    const hpBar = document.getElementById('hud-hp-bar');
    const hpText = document.getElementById('hud-hp-text');
    const nameText = document.getElementById('hud-name');
    if (hpBar && hpText && nameText) {
      const pct = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
      hpBar.style.width = `${pct}%`;
      hpText.textContent = `${Math.ceil(player.health)} / ${player.maxHealth} HP`;
      nameText.textContent = player.name;
    }

    // Resources
    const woodEl = document.getElementById('res-wood');
    const stoneEl = document.getElementById('res-stone');
    const goldEl = document.getElementById('res-gold');
    if (woodEl) woodEl.textContent = player.inventory.wood.toString();
    if (stoneEl) stoneEl.textContent = player.inventory.stone.toString();
    if (goldEl) goldEl.textContent = player.inventory.gold.toString();

    // Hotbar active highlight
    const slots = this.container.querySelectorAll('.hotbar-slot');
    slots.forEach((s) => s.classList.remove('active'));

    const slotKind = player.activeSlot;
    let activeIndex = '1';

    if (slotKind.kind === 'tool') {
      if (slotKind.tool === 'AXE') activeIndex = '1';
      else if (slotKind.tool === 'PICKAXE') activeIndex = '2';
      else if (slotKind.tool === 'SWORD') activeIndex = '3';
      else if (slotKind.tool === 'BOW') activeIndex = '4';
    } else if (slotKind.kind === 'item') {
      if (slotKind.item === 'APPLE') activeIndex = '5';
      else if (slotKind.item === 'WRENCH') activeIndex = '6';
      else if (slotKind.item === 'REVIVE') activeIndex = '7';
    } else if (slotKind.kind === 'building') {
      if (slotKind.building === 'WALL') activeIndex = '8';
      else if (slotKind.building === 'TURRET') activeIndex = '9';
      else if (slotKind.building === 'MINER') activeIndex = '0';
    }

    const currentSlotEl = this.container.querySelector(`.hotbar-slot[data-slot="${activeIndex}"]`);
    if (currentSlotEl) currentSlotEl.classList.add('active');

    // Badges & Counters
    const axBadge = document.getElementById('badge-axe');
    if (axBadge) axBadge.textContent = `Lv.${player.toolLevels.AXE ?? 1}`;

    const pickBadge = document.getElementById('badge-pickaxe');
    if (pickBadge) pickBadge.textContent = `Lv.${player.toolLevels.PICKAXE ?? 1}`;

    const swdBadge = document.getElementById('badge-sword');
    if (swdBadge) swdBadge.textContent = `Lv.${player.toolLevels.SWORD ?? 1}`;

    const bowBadge = document.getElementById('badge-bow');
    if (bowBadge) bowBadge.textContent = `${player.inventory.arrows} 🏹`;

    const appleBadge = document.getElementById('badge-apple');
    if (appleBadge) appleBadge.textContent = `${player.inventory.apples}`;

    const wrenchBadge = document.getElementById('badge-wrench');
    if (wrenchBadge) wrenchBadge.textContent = `${player.inventory.wrenches}`;

    const reviveBadge = document.getElementById('badge-revive');
    if (reviveBadge) reviveBadge.textContent = `${player.inventory.revives}`;

    const minerBadge = document.getElementById('badge-miner');
    if (minerBadge && slotKind.kind === 'building' && slotKind.building === 'MINER') {
      minerBadge.textContent = `${slotKind.minerResource ?? 'GOLD'} [R]`;
    }

    // Upgrade bar preview
    const upgradeBar = document.getElementById('hud-upgrade-bar');
    const upgradeInfo = document.getElementById('upgrade-info-text');

    if (upgradeBar && upgradeInfo) {
      if (slotKind.kind === 'tool') {
        const tool = slotKind.tool;
        const currentLvl = player.toolLevels[tool] ?? 1;
        const cost = this.driver.upgradeSystem.getToolUpgradeCost(tool, currentLvl);

        const canAfford =
          player.inventory.wood >= cost.wood &&
          player.inventory.stone >= cost.stone &&
          player.inventory.gold >= cost.gold;

        upgradeBar.style.display = 'flex';
        upgradeInfo.innerHTML = `<strong>Upgrade ${tool}</strong> to Lv.${currentLvl + 1} &bull; Cost: <span style="color:#2ecc71">${cost.wood}W</span> <span style="color:#bdc3c7">${cost.stone}S</span> <span style="color:#f1c40f">${cost.gold}G</span>`;

        const btn = document.getElementById('btn-upgrade-now') as HTMLButtonElement;
        if (btn) {
          btn.disabled = !canAfford;
          btn.style.opacity = canAfford ? '1' : '0.5';
        }
      } else {
        upgradeBar.style.display = 'none';
      }
    }
  }
}
