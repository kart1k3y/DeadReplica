import { EntityId, Position } from '../../game/entities/EntityTypes';
import { GameState } from '../../game/state/GameState';

export type CameraMode = 'FOLLOW_TARGET' | 'MULTIPLAYER_SHARED';

export class Camera {
  public x = 0;
  public y = 0;
  public zoom = 1.0;
  public targetZoom = 1.0;

  public viewportWidth = window.innerWidth;
  public viewportHeight = window.innerHeight;

  public mode: CameraMode = 'FOLLOW_TARGET';
  public targetPlayerId?: EntityId;
  public smoothing = 0.12;

  constructor(targetPlayerId?: EntityId) {
    this.targetPlayerId = targetPlayerId;
  }

  public setViewport(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public update(state: GameState, dt: number): void {
    const { width: worldW, height: worldH } = state.world;

    if (this.mode === 'FOLLOW_TARGET' && this.targetPlayerId) {
      const targetPlayer = state.players.get(this.targetPlayerId);
      if (targetPlayer) {
        // Smooth lerp toward player position
        const targetX = targetPlayer.position.x;
        const targetY = targetPlayer.position.y;
        this.x += (targetX - this.x) * this.smoothing;
        this.y += (targetY - this.y) * this.smoothing;
      }
    } else if (this.mode === 'MULTIPLAYER_SHARED') {
      // Find bounding box of all active players
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let count = 0;

      for (const p of state.players.values()) {
        if (p.isDead) continue;
        minX = Math.min(minX, p.position.x);
        maxX = Math.max(maxX, p.position.x);
        minY = Math.min(minY, p.position.y);
        maxY = Math.max(maxY, p.position.y);
        count++;
      }

      if (count > 0) {
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        this.x += (centerX - this.x) * this.smoothing;
        this.y += (centerY - this.y) * this.smoothing;

        // Auto zoom adjustment
        const spanX = (maxX - minX) + 300;
        const spanY = (maxY - minY) + 300;
        const reqZoomX = this.viewportWidth / spanX;
        const reqZoomY = this.viewportHeight / spanY;
        this.targetZoom = Math.min(1.2, Math.max(0.65, Math.min(reqZoomX, reqZoomY)));
      }
    }

    // Zoom lerp
    this.zoom += (this.targetZoom - this.zoom) * 0.1;

    // Clamp camera within world boundaries
    const halfW = (this.viewportWidth / 2) / this.zoom;
    const halfH = (this.viewportHeight / 2) / this.zoom;

    if (worldW > halfW * 2) {
      this.x = Math.max(halfW, Math.min(worldW - halfW, this.x));
    } else {
      this.x = worldW / 2;
    }

    if (worldH > halfH * 2) {
      this.y = Math.max(halfH, Math.min(worldH - halfH, this.y));
    } else {
      this.y = worldH / 2;
    }
  }

  public screenToWorld(screenX: number, screenY: number): Position {
    const worldX = (screenX - this.viewportWidth / 2) / this.zoom + this.x;
    const worldY = (screenY - this.viewportHeight / 2) / this.zoom + this.y;
    return { x: worldX, y: worldY };
  }

  public worldToScreen(worldX: number, worldY: number): Position {
    const screenX = (worldX - this.x) * this.zoom + this.viewportWidth / 2;
    const screenY = (worldY - this.y) * this.zoom + this.viewportHeight / 2;
    return { x: screenX, y: screenY };
  }
}
