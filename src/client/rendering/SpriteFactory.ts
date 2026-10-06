import { BuildingType, ItemType, ResourceType, ToolType } from '../../game/config/GameConfig';
import { VisualUpgradeResult } from '../../game/systems/UpgradeSystem';

/**
 * Creates high-detail, stylized cartoon sprites and textures
 * using Canvas 2D offscreen rendering.
 */
export class SpriteFactory {
  private grassTilePattern: CanvasPattern | null = null;

  /**
   * Generates a seamless, organic cartoon garden/grass tile
   */
  public createGrassTile(ctx: CanvasRenderingContext2D): CanvasPattern | null {
    if (this.grassTilePattern) return this.grassTilePattern;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const c = canvas.getContext('2d')!;

    // Base rich garden green
    c.fillStyle = '#4fa348';
    c.fillRect(0, 0, size, size);

    // Subtle soft grass tone variations (no hard square seams)
    const tones = ['#479a40', '#56ad4f', '#44923d', '#51a64a'];
    for (let i = 0; i < 40; i++) {
      c.fillStyle = tones[i % tones.length];
      c.beginPath();
      const x = (i * 37) % size;
      const y = (i * 73) % size;
      const r = 18 + (i % 14);
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }

    // Cartoon grass tufts / blades
    c.fillStyle = '#68c560';
    for (let i = 0; i < 28; i++) {
      const x = ((i * 47) + 13) % size;
      const y = ((i * 89) + 29) % size;
      c.beginPath();
      c.ellipse(x, y, 3, 7, -0.2 + (i % 3) * 0.2, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.ellipse(x + 4, y + 2, 2.5, 6, 0.3, 0, Math.PI * 2);
      c.fill();
    }

    // Tiny cute garden blossoms / clovers
    for (let i = 0; i < 10; i++) {
      const x = ((i * 79) + 21) % size;
      const y = ((i * 103) + 47) % size;

      if (i % 3 === 0) {
        // Clover
        c.fillStyle = '#3a8335';
        for (let pet = 0; pet < 3; pet++) {
          const ang = (pet * Math.PI * 2) / 3;
          c.beginPath();
          c.arc(x + Math.cos(ang) * 3, y + Math.sin(ang) * 3, 2.5, 0, Math.PI * 2);
          c.fill();
        }
      } else {
        // Little white/yellow flower
        c.fillStyle = i % 2 === 0 ? '#ffffff' : '#fff385';
        c.beginPath();
        c.arc(x, y, 2.8, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#f39c12';
        c.beginPath();
        c.arc(x, y, 1.2, 0, Math.PI * 2);
        c.fill();
      }
    }

    this.grassTilePattern = ctx.createPattern(canvas, 'repeat');
    return this.grassTilePattern;
  }

  /**
   * Draws a stylized cartoon Tree with lush leaf clumps, shadow, and wood trunk
   */
  public drawTree(ctx: CanvasRenderingContext2D, flash = false): void {
    // Drop shadow
    ctx.fillStyle = 'rgba(20, 45, 18, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 48, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = flash ? '#ffffff' : '#795548';
    ctx.beginPath();
    ctx.roundRect(-10, -2, 20, 26, 4);
    ctx.fill();

    // Trunk detail
    if (!flash) {
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(-7, 4, 4, 16);
    }

    // Foliage Clumps (Cartoon multi-layer canopy)
    const baseGreen = flash ? '#ffffff' : '#2ecc71';
    const darkGreen = flash ? '#f1f2f6' : '#27ae60';
    const lightGreen = flash ? '#ffffff' : '#55efc4';

    // Back foliage
    ctx.fillStyle = darkGreen;
    ctx.beginPath();
    ctx.arc(-22, -18, 26, 0, Math.PI * 2);
    ctx.arc(22, -18, 26, 0, Math.PI * 2);
    ctx.arc(0, -32, 28, 0, Math.PI * 2);
    ctx.fill();

    // Main foliage
    ctx.fillStyle = baseGreen;
    ctx.beginPath();
    ctx.arc(-16, -16, 25, 0, Math.PI * 2);
    ctx.arc(16, -16, 25, 0, Math.PI * 2);
    ctx.arc(0, -26, 27, 0, Math.PI * 2);
    ctx.fill();

    // Highlight puffs
    if (!flash) {
      ctx.fillStyle = lightGreen;
      ctx.beginPath();
      ctx.arc(-14, -26, 12, 0, Math.PI * 2);
      ctx.arc(8, -32, 14, 0, Math.PI * 2);
      ctx.fill();

      // Apples in tree
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(-18, -12, 4, 0, Math.PI * 2);
      ctx.arc(18, -20, 4, 0, Math.PI * 2);
      ctx.arc(2, -8, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draws a stylized cartoon Rock with facets and highlights
   */
  public drawStone(ctx: CanvasRenderingContext2D, flash = false): void {
    // Drop shadow
    ctx.fillStyle = 'rgba(20, 45, 18, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 40, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boulder body
    ctx.fillStyle = flash ? '#ffffff' : '#7f8c8d';
    ctx.beginPath();
    ctx.moveTo(-32, 4);
    ctx.lineTo(-24, -20);
    ctx.lineTo(8, -28);
    ctx.lineTo(34, -12);
    ctx.lineTo(30, 12);
    ctx.lineTo(-14, 18);
    ctx.closePath();
    ctx.fill();

    // Facet shading
    if (!flash) {
      // Dark underside
      ctx.fillStyle = '#636e72';
      ctx.beginPath();
      ctx.moveTo(-32, 4);
      ctx.lineTo(-14, 18);
      ctx.lineTo(30, 12);
      ctx.lineTo(16, 2);
      ctx.lineTo(-18, -2);
      ctx.closePath();
      ctx.fill();

      // Top light facet
      ctx.fillStyle = '#b2bec3';
      ctx.beginPath();
      ctx.moveTo(-24, -20);
      ctx.lineTo(8, -28);
      ctx.lineTo(18, -14);
      ctx.lineTo(-4, -10);
      ctx.closePath();
      ctx.fill();

      // Cracks
      ctx.strokeStyle = '#2d3436';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-6, -10);
      ctx.lineTo(4, 2);
      ctx.lineTo(-1, 9);
      ctx.stroke();
    }
  }

  /**
   * Draws a cartoon Gold Ore cluster with glowing crystal veins
   */
  public drawGold(ctx: CanvasRenderingContext2D, flash = false): void {
    // Shadow
    ctx.fillStyle = 'rgba(20, 45, 18, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 36, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark ore rock base
    ctx.fillStyle = flash ? '#ffffff' : '#57606f';
    ctx.beginPath();
    ctx.moveTo(-28, 6);
    ctx.lineTo(-18, -20);
    ctx.lineTo(14, -24);
    ctx.lineTo(28, -8);
    ctx.lineTo(22, 14);
    ctx.lineTo(-10, 16);
    ctx.closePath();
    ctx.fill();

    // Brilliant Gold crystals jutting out
    const goldColor = flash ? '#ffffff' : '#f1c40f';
    const goldHighlight = flash ? '#ffffff' : '#ffeaa7';
    const goldDeep = flash ? '#ffffff' : '#d35400';

    ctx.fillStyle = goldColor;

    // Crystal 1
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.lineTo(-10, -28);
    ctx.lineTo(2, -18);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();

    // Crystal 2
    ctx.beginPath();
    ctx.moveTo(2, -12);
    ctx.lineTo(16, -32);
    ctx.lineTo(24, -14);
    ctx.lineTo(10, 2);
    ctx.closePath();
    ctx.fill();

    if (!flash) {
      // Shading on crystals
      ctx.fillStyle = goldDeep;
      ctx.beginPath();
      ctx.moveTo(-16, -6);
      ctx.lineTo(-10, -28);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();

      // Shimmer highlights
      ctx.fillStyle = goldHighlight;
      ctx.beginPath();
      ctx.arc(-8, -22, 2.5, 0, Math.PI * 2);
      ctx.arc(15, -24, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draws a Tool (Axe, Pickaxe, Sword, Bow) with rotation and upgrade visuals
   */
  public drawTool(
    ctx: CanvasRenderingContext2D,
    tool: ToolType,
    upgradeVisual?: VisualUpgradeResult
  ): void {
    ctx.save();

    // Apply upgrade visual filters
    if (upgradeVisual && upgradeVisual.glowBlur > 0) {
      ctx.shadowColor = upgradeVisual.glowColor;
      ctx.shadowBlur = upgradeVisual.glowBlur;
    }

    switch (tool) {
      case 'AXE': {
        // Wood Handle
        ctx.fillStyle = '#8c531b';
        ctx.fillRect(-3, -22, 6, 32);

        // Axe Head Blade
        ctx.fillStyle = upgradeVisual?.hueShift
          ? `hsl(${190 + upgradeVisual.hueShift}, 85%, 60%)`
          : '#bdc3c7';
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.bezierCurveTo(16, -26, 22, -14, 18, -4);
        ctx.lineTo(2, -12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      case 'PICKAXE': {
        // Handle
        ctx.fillStyle = '#8c531b';
        ctx.fillRect(-3, -22, 6, 32);

        // Pickaxe Curved Head
        ctx.fillStyle = upgradeVisual?.hueShift
          ? `hsl(${200 + upgradeVisual.hueShift}, 85%, 60%)`
          : '#7f8c8d';
        ctx.beginPath();
        ctx.moveTo(-18, -14);
        ctx.quadraticCurveTo(0, -26, 18, -14);
        ctx.lineTo(16, -18);
        ctx.quadraticCurveTo(0, -29, -16, -18);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      case 'SWORD': {
        // Blade
        ctx.fillStyle = upgradeVisual?.hueShift
          ? `hsl(${210 + upgradeVisual.hueShift}, 90%, 65%)`
          : '#ecf0f1';
        ctx.beginPath();
        ctx.moveTo(-4, -10);
        ctx.lineTo(0, -38);
        ctx.lineTo(4, -10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Crossguard
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(-12, -10, 24, 4);

        // Grip & Pommel
        ctx.fillStyle = '#795548';
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.arc(0, 8, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'BOW': {
        // Curved wooden stave
        ctx.strokeStyle = '#8c531b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 16, -Math.PI * 0.45, Math.PI * 0.45, false);
        ctx.stroke();

        // Bowstring
        ctx.strokeStyle = '#dfe4ea';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(11, -12);
        ctx.lineTo(11, 12);
        ctx.stroke();
        break;
      }
    }

    // Sparkle glint on upgraded tools
    if (upgradeVisual && upgradeVisual.glintIntensity > 0) {
      const glintAlpha = 0.5 + Math.sin(performance.now() * 0.008) * 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${glintAlpha * upgradeVisual.glintIntensity})`;
      ctx.beginPath();
      ctx.arc(6, -18, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Draws cute items: Apple, Wrench, Revive kit
   */
  public drawItem(ctx: CanvasRenderingContext2D, item: ItemType): void {
    switch (item) {
      case 'APPLE': {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();

        // Leaf
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.ellipse(3, -11, 3.5, 6, 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'WRENCH': {
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-8, 8);
        ctx.lineTo(6, -6);
        ctx.stroke();

        // Jaw
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.arc(8, -8, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#34495e';
        ctx.beginPath();
        ctx.arc(8, -8, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'REVIVE': {
        // Glowing heart/cross kit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-10, -10, 20, 20, 5);
        ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-3, -7, 6, 14);
        ctx.fillRect(-7, -3, 14, 6);
        break;
      }
    }
  }

  /**
   * Draws a Player Character (or Zombie)
   * Cute circular cartoon body, cartoon eyes, small hands holding tool
   */
  public drawCharacter(
    ctx: CanvasRenderingContext2D,
    isZombie: boolean,
    color: string,
    heldTool: ToolType,
    isAttacking: boolean,
    attackProgress: number,
    upgradeVisual?: VisualUpgradeResult,
    flash = false
  ): void {
    ctx.save();

    // Upgrade glow
    if (upgradeVisual && upgradeVisual.glowBlur > 0) {
      ctx.shadowColor = upgradeVisual.glowColor;
      ctx.shadowBlur = upgradeVisual.glowBlur;
    }

    // Shadow
    ctx.fillStyle = 'rgba(20, 45, 18, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const bodyColor = flash
      ? '#ffffff'
      : isZombie
      ? '#558b2f' // Zombie green
      : color;

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isZombie ? '#2e491a' : '#1e3799';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Eyes
    if (!flash) {
      if (isZombie) {
        // Glowing yellow/red undead eyes
        ctx.fillStyle = '#ff3838';
        ctx.beginPath();
        ctx.arc(7, -6, 4, 0, Math.PI * 2);
        ctx.arc(7, 6, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fffa65';
        ctx.beginPath();
        ctx.arc(8, -6, 2, 0, Math.PI * 2);
        ctx.arc(8, 6, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Cute cartoon friendly eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(8, -6, 5, 0, Math.PI * 2);
        ctx.arc(8, 6, 5, 0, Math.PI * 2);
        ctx.fill();

        // Pupils looking forward
        ctx.fillStyle = '#2f3542';
        ctx.beginPath();
        ctx.arc(10, -6, 2.5, 0, Math.PI * 2);
        ctx.arc(10, 6, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Eye glint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(11, -7, 1.2, 0, Math.PI * 2);
        ctx.arc(11, 5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hands and Tool
    // Swing animation calculation
    let swingAngle = 0;
    if (isAttacking) {
      // Windup -> forward slash -> return arc
      swingAngle = Math.sin(attackProgress * Math.PI) * 1.35;
    }

    // Left hand
    ctx.fillStyle = flash ? '#ffffff' : isZombie ? '#689f38' : '#fed330';
    ctx.beginPath();
    ctx.arc(14, -13, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right hand (holding tool)
    ctx.save();
    ctx.translate(14, 13);
    ctx.rotate(swingAngle);

    // Hand circle
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tool attached to right hand
    ctx.save();
    ctx.translate(4, -2);
    ctx.rotate(-Math.PI * 0.25);
    this.drawTool(ctx, heldTool, upgradeVisual);
    ctx.restore();

    ctx.restore();

    ctx.restore();
  }

  /**
   * Draws a Building: Wall, Turret, Miner
   */
  public drawBuilding(
    ctx: CanvasRenderingContext2D,
    type: BuildingType,
    turretAngle = 0,
    minerResource: ResourceType = 'GOLD',
    minerProgress = 0,
    upgradeVisual?: VisualUpgradeResult,
    flash = false
  ): void {
    ctx.save();

    if (upgradeVisual && upgradeVisual.glowBlur > 0) {
      ctx.shadowColor = upgradeVisual.glowColor;
      ctx.shadowBlur = upgradeVisual.glowBlur;
    }

    switch (type) {
      case 'WALL': {
        // Wooden palisade wall with stone foundation
        ctx.fillStyle = 'rgba(20, 45, 18, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 16, 32, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stone foundation
        ctx.fillStyle = flash ? '#ffffff' : '#7f8c8d';
        ctx.beginPath();
        ctx.roundRect(-28, -26, 56, 52, 8);
        ctx.fill();

        // Planks / Palisade beams
        ctx.fillStyle = flash ? '#ffffff' : '#a0522d';
        for (let i = -24; i < 24; i += 12) {
          ctx.beginPath();
          ctx.roundRect(i, -24, 10, 48, 3);
          ctx.fill();
          if (!flash) {
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(i + 2, -18, 6, 36);
            ctx.fillStyle = '#a0522d';
          }
        }
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.strokeRect(-28, -26, 56, 52);
        break;
      }

      case 'TURRET': {
        // Base mount
        ctx.fillStyle = 'rgba(20, 45, 18, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 16, 34, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = flash ? '#ffffff' : '#34495e';
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e272e';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Rotating head
        ctx.save();
        ctx.rotate(turretAngle);

        // Dual barrels
        ctx.fillStyle = flash ? '#ffffff' : '#2c3e50';
        ctx.fillRect(10, -7, 26, 5);
        ctx.fillRect(10, 2, 26, 5);

        // Core turret dome
        ctx.fillStyle = flash ? '#ffffff' : '#00d2d3';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#01a3a4';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
        break;
      }

      case 'MINER': {
        // Automatic resource extractor
        ctx.fillStyle = 'rgba(20, 45, 18, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 18, 36, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Miner body
        ctx.fillStyle = flash ? '#ffffff' : '#e67e22';
        ctx.beginPath();
        ctx.roundRect(-26, -26, 52, 52, 10);
        ctx.fill();
        ctx.strokeStyle = '#d35400';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Spinning gear / extraction drill in center
        ctx.save();
        ctx.rotate(performance.now() * 0.003);
        ctx.fillStyle = '#2c3e50';
        for (let g = 0; g < 4; g++) {
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-14, -4, 28, 8);
        }
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Small indicator dome showing extracted resource
        const resColor =
          minerResource === 'WOOD' ? '#27ae60' : minerResource === 'STONE' ? '#95a5a6' : '#f1c40f';
        ctx.fillStyle = resColor;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  /**
   * Draws an Arrow projectile
   */
  public drawArrow(ctx: CanvasRenderingContext2D, vx: number, vy: number): void {
    ctx.save();
    const angle = Math.atan2(vy, vx);
    ctx.rotate(angle);

    // Arrow shaft
    ctx.strokeStyle = '#8c531b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();

    // Arrow head
    ctx.fillStyle = '#bdc3c7';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(6, -4);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fill();

    // Feathers fletching
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(-12, -4);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draws a Turret energy projectile
   */
  public drawTurretShot(ctx: CanvasRenderingContext2D, vx: number, vy: number): void {
    ctx.save();
    const angle = Math.atan2(vy, vx);
    ctx.rotate(angle);

    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(2, 0, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
