/**
 * Particles — Optimized with ring buffer pool, no shadows
 * @module particles
 */

const MAX_PARTICLES = 250;

class Particle {
    constructor() { this.active = false; }

    init(p) {
        this.x = p.x || 0;
        this.y = p.y || 0;
        this.dx = p.dx || 0;
        this.dy = p.dy || 0;
        this.size = p.size || 3;
        this.color = p.color || '#ffffff';
        this.life = p.life || 1;
        this.maxLife = this.life;
        this.active = true;
        this.gravity = p.gravity || 200;
        this.friction = p.friction || 0.97;
    }

    update(dt) {
        if (!this.active) return;
        this.x += this.dx * dt;
        this.y += this.dy * dt;
        this.dy += this.gravity * dt;
        this.dx *= this.friction;
        this.life -= dt;
        if (this.life <= 0) this.active = false;
    }

    render(ctx) {
        if (!this.active) return;
        const a = this.life / this.maxLife;
        const s = this.size * a;
        ctx.globalAlpha = a;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - s * 0.5, this.y - s * 0.5, s, s);
        ctx.globalAlpha = 1;
    }
}

export class ParticleSystem {
    constructor() {
        this.pool = Array.from({ length: MAX_PARTICLES }, () => new Particle());
        this.nextIdx = 0;
    }

    _get() {
        // Ring buffer — reuse oldest if full
        const p = this.pool[this.nextIdx];
        this.nextIdx = (this.nextIdx + 1) % MAX_PARTICLES;
        return p;
    }

    emitBrickBreak(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 60 + Math.random() * 180;
            this._get().init({
                x, y,
                dx: Math.cos(a) * sp,
                dy: Math.sin(a) * sp - 80,
                size: 2 + Math.random() * 3,
                color,
                life: 0.3 + Math.random() * 0.4,
                gravity: 250,
            });
        }
    }

    emitBrickHit(x, y, color) {
        for (let i = 0; i < 4; i++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
            this._get().init({
                x, y,
                dx: Math.cos(a) * 60,
                dy: Math.sin(a) * 60,
                size: 1.5 + Math.random() * 2,
                color,
                life: 0.15 + Math.random() * 0.2,
                gravity: 150,
            });
        }
    }

    emitSparkle(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            this._get().init({
                x, y,
                dx: Math.cos(a) * 80,
                dy: Math.sin(a) * 80,
                size: 2 + Math.random() * 2,
                color,
                life: 0.4 + Math.random() * 0.2,
                gravity: 0,
                friction: 0.94,
            });
        }
    }

    emitConfetti(canvasWidth, canvasHeight) {
        const colors = ['#00ff88', '#00d4ff', '#ff0066', '#fbbf24', '#a855f7', '#39d353'];
        for (let i = 0; i < 30; i++) {
            this._get().init({
                x: Math.random() * canvasWidth,
                y: -10 - Math.random() * 60,
                dx: (Math.random() - 0.5) * 150,
                dy: 40 + Math.random() * 80,
                size: 2.5 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.5 + Math.random() * 1.5,
                gravity: 60,
                friction: 0.99,
            });
        }
    }

    update(dt) {
        for (const p of this.pool) if (p.active) p.update(dt);
    }

    render(ctx) {
        for (const p of this.pool) if (p.active) p.render(ctx);
    }

    reset() {
        for (const p of this.pool) p.active = false;
        this.nextIdx = 0;
    }
}
