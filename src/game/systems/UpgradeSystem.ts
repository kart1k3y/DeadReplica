import { GameConfig, ToolType } from '../config/GameConfig';
import { evaluateCurve } from '../config/Curves';
import { EntityId, PlayerState } from '../entities/EntityTypes';
import { FloatingText, GameState } from '../state/GameState';

export interface VisualUpgradeResult {
  hueShift: number; // degrees
  saturationMultiplier: number;
  brightnessMultiplier: number;
  glintIntensity: number; // 0 to 1
  glowColor: string;
  glowBlur: number;
}

export class UpgradeSystem {
  private config: GameConfig;
  private nextFloatingTextId = 1;

  constructor(config: GameConfig) {
    this.config = config;
  }

  public setConfig(config: GameConfig): void {
    this.config = config;
  }

  private addFloatingText(state: GameState, text: string, x: number, y: number, color: string): void {
    const ft: FloatingText = {
      id: `upg-ft-${this.nextFloatingTextId++}`,
      text,
      x,
      y: y - 25,
      color,
      life: 1.0,
      maxLife: 1.0,
    };
    state.floatingTexts.push(ft);
  }

  public getToolUpgradeCost(tool: ToolType, currentLevel: number): { wood: number; stone: number; gold: number } {
    const toolCfg = this.config.tools[tool];
    const targetLevel = currentLevel + 1;
    const wood = Math.round(evaluateCurve(toolCfg.baseCost.wood, targetLevel, toolCfg.costCurve));
    const stone = Math.round(evaluateCurve(toolCfg.baseCost.stone, targetLevel, toolCfg.costCurve));
    const gold = Math.round(evaluateCurve(toolCfg.baseCost.gold, targetLevel, toolCfg.costCurve));
    return { wood, stone, gold };
  }

  /**
   * Upgrades a player's tool to the next infinite tier
   */
  public upgradeTool(state: GameState, playerId: EntityId, tool: ToolType): boolean {
    const player = state.players.get(playerId);
    if (!player) return false;

    const currentLevel = player.toolLevels[tool] ?? 1;
    const cost = this.getToolUpgradeCost(tool, currentLevel);

    if (
      player.inventory.wood < cost.wood ||
      player.inventory.stone < cost.stone ||
      player.inventory.gold < cost.gold
    ) {
      this.addFloatingText(
        state,
        `Upgrade cost: W:${cost.wood} S:${cost.stone} G:${cost.gold}`,
        player.position.x,
        player.position.y - 30,
        '#e74c3c'
      );
      return false;
    }

    // Deduct cost
    player.inventory.wood -= cost.wood;
    player.inventory.stone -= cost.stone;
    player.inventory.gold -= cost.gold;

    const newLevel = currentLevel + 1;
    player.toolLevels[tool] = newLevel;

    this.addFloatingText(
      state,
      `✨ ${tool} Upgraded to Level ${newLevel}! ✨`,
      player.position.x,
      player.position.y - 35,
      '#f1c40f'
    );
    return true;
  }

  /**
   * Generates dynamic visual upgrade effects for any entity, tool, or building
   * with hue shift, glint, saturation, and auras based on configurable curves
   */
  public getUpgradeVisual(upgradeLevel: number): VisualUpgradeResult {
    if (upgradeLevel <= 1) {
      return {
        hueShift: 0,
        saturationMultiplier: 1.0,
        brightnessMultiplier: 1.0,
        glintIntensity: 0,
        glowColor: 'transparent',
        glowBlur: 0,
      };
    }

    const { hueShiftRate, saturationRamp, brightnessRamp, glintIntensityCurve, glowIntensityCurve } =
      this.config.visualUpgrade;

    const levelDelta = upgradeLevel - 1;
    const hueShift = (levelDelta * hueShiftRate) % 360;
    const saturationMultiplier = 1.0 + Math.min(0.8, levelDelta * saturationRamp);
    const brightnessMultiplier = 1.0 + Math.min(0.5, levelDelta * brightnessRamp);

    const glintIntensity = Math.min(1.0, evaluateCurve(0.15, upgradeLevel, glintIntensityCurve));
    const glowBlur = Math.min(24, evaluateCurve(4, upgradeLevel, glowIntensityCurve));

    // Dynamic glow color matching the shifted hue
    const glowColor = `hsla(${hueShift + 45}, 90%, 60%, ${Math.min(0.75, 0.2 + levelDelta * 0.08)})`;

    return {
      hueShift,
      saturationMultiplier,
      brightnessMultiplier,
      glintIntensity,
      glowColor,
      glowBlur,
    };
  }
}
