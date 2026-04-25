/**
 * Brick — Individual brick with HP, color, and effects
 * @module brick
 */

/** Color palette for bricks based on HP (GitHub-style greens) */
const HP_COLORS = {
    1: { fill: '#0e4429', glow: '#006d32', border: '#006d32' },
    2: { fill: '#006d32', glow: '#26a641', border: '#26a641' },
    3: { fill: '#26a641', glow: '#39d353', border: '#39d353' },
    4: { fill: '#39d353', glow: '#69ff83', border: '#69ff83' },  // Special golden-green
};

export class Brick {
    /**
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Brick width
     * @param {number} height - Brick height
     * @param {number} hp - Hit points (1–4)
     */
    constructor(x, y, width, height, hp) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.hp = hp;
        this.maxHp = hp;
        this.alive = true;

        // Visual state
        this.flashTimer = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.opacity = 1;
        this.scale = 1;

        // Colors
        this.colors = HP_COLORS[Math.min(hp, 4)] || HP_COLORS[1];

        // Is this a streak/special brick?
        this.isSpecial = hp >= 4;
        this.specialPulse = 0;
    }

    /**
     * Hit this brick — reduce HP
     * @returns {boolean} true if brick was destroyed
     */
    hit() {
        if (!this.alive) return false;

        this.hp--;
        this.flashTimer = 0.15;
        this.shakeX = (Math.random() - 0.5) * 4;
        this.shakeY = (Math.random() - 0.5) * 4;

        // Update colors for new HP
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
     * Update brick state
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Decay flash
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            if (this.flashTimer < 0) this.flashTimer = 0;
        }

        // Decay shake
        this.shakeX *= 0.85;
        this.shakeY *= 0.85;
        if (Math.abs(this.shakeX) < 0.1) this.shakeX = 0;
        if (Math.abs(this.shakeY) < 0.1) this.shakeY = 0;

        // Special brick pulse
        if (this.isSpecial && this.alive) {
            this.specialPulse += dt * 3;
        }
    }

    /**
     * Render brick on canvas
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.alive) return;

        const drawX = this.x + this.shakeX;
        const drawY = this.y + this.shakeY;
        const r = 3; // corner radius

        ctx.save();

        // Glow effect
        if (this.isSpecial) {
            const pulse = Math.sin(this.specialPulse) * 0.3 + 0.7;
            ctx.shadowColor = this.colors.glow;
            ctx.shadowBlur = 10 + pulse * 8;
        } else {
            ctx.shadowColor = this.colors.glow;
            ctx.shadowBlur = this.flashTimer > 0 ? 20 : 4;
        }

        // Brick body (rounded rect)
        ctx.beginPath();
        ctx.moveTo(drawX + r, drawY);
        ctx.lineTo(drawX + this.width - r, drawY);
        ctx.arcTo(drawX + this.width, drawY, drawX + this.width, drawY + r, r);
        ctx.lineTo(drawX + this.width, drawY + this.height - r);
        ctx.arcTo(drawX + this.width, drawY + this.height, drawX + this.width - r, drawY + this.height, r);
        ctx.lineTo(drawX + r, drawY + this.height);
        ctx.arcTo(drawX, drawY + this.height, drawX, drawY + this.height - r, r);
        ctx.lineTo(drawX, drawY + r);
        ctx.arcTo(drawX, drawY, drawX + r, drawY, r);
        ctx.closePath();

        // Fill
        if (this.flashTimer > 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            const gradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + this.height);
            gradient.addColorStop(0, this.colors.fill);
            gradient.addColorStop(1, this._darken(this.colors.fill, 0.3));
            ctx.fillStyle = gradient;
        }
        ctx.fill();

        // Border
        ctx.strokeStyle = this.flashTimer > 0 ? '#ffffff' : this.colors.border;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // HP indicator — cracks for damaged bricks
        if (this.hp < this.maxHp && this.hp > 0) {
            this._renderCracks(ctx, drawX, drawY);
        }

        // Special brick sparkle
        if (this.isSpecial && this.alive) {
            this._renderSparkle(ctx, drawX, drawY);
        }

        ctx.restore();
    }

    /** Render crack lines on damaged bricks */
    _renderCracks(ctx, x, y) {
        const damage = 1 - this.hp / this.maxHp;
        ctx.save();
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.3 + damage * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();

        // Generate crack pattern based on damage level
        const cx = x + this.width * 0.5;
        const cy = y + this.height * 0.5;

        if (damage >= 0.25) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + this.width * 0.3, cy - this.height * 0.4);
        }
        if (damage >= 0.5) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - this.width * 0.25, cy + this.height * 0.35);
        }
        if (damage >= 0.75) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + this.width * 0.2, cy + this.height * 0.3);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - this.width * 0.35, cy - this.height * 0.25);
        }

        ctx.stroke();
        ctx.restore();
    }

    /** Render sparkle effect on special bricks */
    _renderSparkle(ctx, x, y) {
        const t = this.specialPulse;
        const sparkleX = x + this.width * (0.3 + Math.sin(t * 1.7) * 0.2);
        const sparkleY = y + this.height * (0.3 + Math.cos(t * 1.3) * 0.2);
        const size = 2 + Math.sin(t * 2) * 1;

        ctx.save();
        ctx.globalAlpha = 0.6 + Math.sin(t * 2) * 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();

        // Star shape
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + t;
            const sx = sparkleX + Math.cos(angle) * size;
            const sy = sparkleY + Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
            const innerAngle = angle + Math.PI / 4;
            const ix = sparkleX + Math.cos(innerAngle) * size * 0.3;
            const iy = sparkleY + Math.sin(innerAngle) * size * 0.3;
            ctx.lineTo(ix, iy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /** Darken a hex color */
    _darken(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
        const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
        const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
        return `rgb(${r},${g},${b})`;
    }

    /** Get center point of brick */
    get centerX() { return this.x + this.width / 2; }
    get centerY() { return this.y + this.height / 2; }
}
