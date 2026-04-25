/**
 * Brick — Optimized rendering, contribution metadata, hover pulse
 * @module brick
 */

/** Color palette by HP (GitHub greens) */
const HP_COLORS = {
    1: { fill: '#0e4429', border: '#1a5c38' },
    2: { fill: '#006d32', border: '#008c41' },
    3: { fill: '#26a641', border: '#33cc55' },
    4: { fill: '#39d353', border: '#55ee66' },
};

export class Brick {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number} hp
     * @param {object} [meta] - Contribution metadata
     * @param {string} [meta.date] - e.g. "2025-08-12"
     * @param {number} [meta.count] - e.g. 5
     */
    constructor(x, y, width, height, hp, meta = null) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.hp = hp;
        this.maxHp = hp;
        this.alive = true;
        this.meta = meta;

        // Grid position (set externally for spatial lookup)
        this.gridRow = 0;
        this.gridCol = 0;

        // Visual state
        this.flashTimer = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.pulsePhase = Math.random() * Math.PI * 2; // Stagger pulses
        this.isHovered = false;

        // Colors
        this.colors = HP_COLORS[Math.min(hp, 4)] || HP_COLORS[1];
        this.isSpecial = hp >= 4;
    }

    /** Hit brick → reduce HP, return true if destroyed */
    hit() {
        if (!this.alive) return false;
        this.hp--;
        this.flashTimer = 0.1;
        this.shakeX = (Math.random() - 0.5) * 3;
        this.shakeY = (Math.random() - 0.5) * 3;

        if (this.hp > 0) {
            this.colors = HP_COLORS[Math.min(this.hp, 4)] || HP_COLORS[1];
        }
        if (this.hp <= 0) {
            this.alive = false;
            return true;
        }
        return false;
    }

    /**
     * Update brick
     * @param {number} dt
     * @param {number} time - Global time for pulse
     */
    update(dt, time) {
        if (this.flashTimer > 0) {
            this.flashTimer = Math.max(0, this.flashTimer - dt);
        }
        // Shake decay
        this.shakeX *= 0.8;
        this.shakeY *= 0.8;
        if (Math.abs(this.shakeX) < 0.05) this.shakeX = 0;
        if (Math.abs(this.shakeY) < 0.05) this.shakeY = 0;
    }

    /**
     * Render — optimized: no shadowBlur, no gradients, simple fill
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} time - For hover pulse
     */
    render(ctx, time) {
        if (!this.alive) return;

        const dx = this.x + this.shakeX;
        const dy = this.y + this.shakeY;

        // Hover pulse effect
        let scale = 1;
        if (this.isHovered) {
            scale = 1 + Math.sin(time * 6 + this.pulsePhase) * 0.04;
        }

        const w = this.width * scale;
        const h = this.height * scale;
        const ox = dx - (w - this.width) / 2;
        const oy = dy - (h - this.height) / 2;

        // Fill and Stroke (Rounded GitHub style)
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(ox, oy, w, h, 2);
        } else {
            // Fallback for older browsers
            ctx.rect(ox, oy, w, h);
        }
        
        ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : this.colors.fill;
        ctx.fill();

        // Border (Top and left for light source effect, but simple stroke looks cleaner for rounded rects)
        ctx.strokeStyle = this.flashTimer > 0 ? '#ffffff' : this.colors.border;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Crack lines for damaged bricks
        if (this.hp < this.maxHp && this.hp > 0) {
            const damage = 1 - this.hp / this.maxHp;
            ctx.strokeStyle = `rgba(0,0,0,${0.3 + damage * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            const cx = ox + w * 0.5;
            const cy = oy + h * 0.5;
            if (damage >= 0.25) {
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + w * 0.3, cy - h * 0.35);
            }
            if (damage >= 0.5) {
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx - w * 0.25, cy + h * 0.3);
            }
            ctx.stroke();
        }

        // Special brick indicator (bright dot)
        if (this.isSpecial) {
            const sparkle = Math.sin(time * 4 + this.pulsePhase) * 0.4 + 0.6;
            ctx.globalAlpha = sparkle;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ox + w * 0.3, oy + h * 0.3, 2, 2);
            ctx.globalAlpha = 1;
        }
    }

    get centerX() { return this.x + this.width / 2; }
    get centerY() { return this.y + this.height / 2; }
}
