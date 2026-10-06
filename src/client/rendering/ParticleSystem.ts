export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  public emit(x: number, y: number, color: string, count = 8, speed = 80, size = 3): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.7) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: size * (0.6 + Math.random() * 0.8),
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
      });
    }
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
