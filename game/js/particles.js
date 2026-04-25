/**
 * Particles — Particle effects engine with object pooling
 * @module particles
 */

const MAX_PARTICLES = 300;

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
        this.size = 2;
        this.color = '#ffffff';
        this.life = 0;
        this.maxLife = 1;
        this.active = false;
        this.gravity = 0;
        this.friction = 0.98;
        this.shape = 'square'; // 'square' | 'circle'
        this.rotation = 0;
        this.rotationSpeed = 0;
    }

    /**
     * Initialize particle with properties
     * @param {object} props
     */
    init(props) {
        this.x = props.x || 0;
        this.y = props.y || 0;
        this.dx = props.dx || 0;
        this.dy = props.dy || 0;
        this.size = props.size || 3;
        this.color = props.color || '#ffffff';
        this.life = props.life || 1;
        this.maxLife = this.life;
        this.active = true;
        this.gravity = props.gravity || 200;
        this.friction = props.friction || 0.98;
        this.shape = props.shape || 'square';
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 8;
    }

    /**
     * Update particle
     * @param {number} dt
     */
    update(dt) {
        if (!this.active) return;

        this.x += this.dx * dt;
        this.y += this.dy * dt;
        this.dy += this.gravity * dt;
        this.dx *= this.friction;
        this.dy *= this.friction;
        this.rotation += this.rotationSpeed * dt;
        this.life -= dt;

        if (this.life <= 0) {
            this.active = false;
        }
    }

    /**
     * Render particle
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.active) return;

        const alpha = Math.max(0, this.life / this.maxLife);
        const size = this.size * alpha;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(-size / 2, -size / 2, size, size);
        }

        ctx.restore();
    }
}

/**
 * Particle system with object pooling
 */
export class ParticleSystem {
    constructor() {
        /** @type {Particle[]} */
        this.pool = [];
        for (let i = 0; i < MAX_PARTICLES; i++) {
            this.pool.push(new Particle());
        }
    }

    /** Get an inactive particle from the pool */
    _getParticle() {
        for (const p of this.pool) {
            if (!p.active) return p;
        }
        return null; // Pool exhausted
    }

    /**
     * Emit brick destruction particles
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {string} color - Brick color
     * @param {number} [count=12]
     */
    emitBrickBreak(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const p = this._getParticle();
            if (!p) return;

            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 200;

            p.init({
                x,
                y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed - 100,
                size: 2 + Math.random() * 4,
                color,
                life: 0.4 + Math.random() * 0.5,
                gravity: 300,
                friction: 0.96,
                shape: 'square',
            });
        }
    }

    /**
     * Emit brick hit particles (smaller, for damage)
     * @param {number} x
     * @param {number} y
     * @param {string} color
     */
    emitBrickHit(x, y, color) {
        for (let i = 0; i < 5; i++) {
            const p = this._getParticle();
            if (!p) return;

            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
            const speed = 60 + Math.random() * 80;

            p.init({
                x,
                y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                size: 1.5 + Math.random() * 2,
                color,
                life: 0.2 + Math.random() * 0.3,
                gravity: 200,
                shape: 'square',
            });
        }
    }

    /**
     * Emit sparkle burst (power-up pickup)
     * @param {number} x
     * @param {number} y
     * @param {string} color
     */
    emitSparkle(x, y, color) {
        for (let i = 0; i < 16; i++) {
            const p = this._getParticle();
            if (!p) return;

            const angle = (i / 16) * Math.PI * 2;
            const speed = 100 + Math.random() * 100;

            p.init({
                x,
                y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                color,
                life: 0.5 + Math.random() * 0.3,
                gravity: 0,
                friction: 0.95,
                shape: 'circle',
            });
        }
    }

    /**
     * Emit confetti (win celebration)
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    emitConfetti(canvasWidth, canvasHeight) {
        const colors = ['#00ff88', '#00d4ff', '#ff0066', '#fbbf24', '#a855f7', '#39d353'];

        for (let i = 0; i < 50; i++) {
            const p = this._getParticle();
            if (!p) return;

            p.init({
                x: Math.random() * canvasWidth,
                y: -20 - Math.random() * 100,
                dx: (Math.random() - 0.5) * 200,
                dy: 50 + Math.random() * 100,
                size: 3 + Math.random() * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 2 + Math.random() * 2,
                gravity: 80,
                friction: 0.99,
                shape: Math.random() > 0.5 ? 'square' : 'circle',
            });
        }
    }

    /**
     * Update all active particles
     * @param {number} dt
     */
    update(dt) {
        for (const p of this.pool) {
            if (p.active) p.update(dt);
        }
    }

    /**
     * Render all active particles
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        for (const p of this.pool) {
            if (p.active) p.render(ctx);
        }
    }

    /** Count active particles */
    get activeCount() {
        return this.pool.filter(p => p.active).length;
    }

    /** Reset all particles */
    reset() {
        for (const p of this.pool) {
            p.reset();
        }
    }
}
