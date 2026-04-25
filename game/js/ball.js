/**
 * Ball — Physics, movement, trail rendering
 * @module ball
 */

export class Ball {
    /**
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {number} radius - Ball radius
     */
    constructor(x, y, radius = 6) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.baseSpeed = 400; // pixels per second
        this.speed = this.baseSpeed;
        this.dx = 0;
        this.dy = 0;
        this.active = false;

        // Trail
        this.trail = [];
        this.maxTrailLength = 12;

        // Visual
        this.glowIntensity = 1;
        this.color = '#00ff88';
        this.hitFlash = 0;

        // Speed scaling
        this.bricksDestroyed = 0;
        this.speedMultiplier = 1;
    }

    /** Launch ball at an angle */
    launch() {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6; // roughly upward
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
        this.active = true;
    }

    /** Attach ball to paddle */
    attachTo(paddle) {
        this.x = paddle.x + paddle.width / 2;
        this.y = paddle.y - this.radius - 2;
        this.active = false;
        this.dx = 0;
        this.dy = 0;
    }

    /**
     * Update ball position
     * @param {number} dt - Delta time in seconds
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @returns {string|null} - 'bottom' if ball fell off, null otherwise
     */
    update(dt, canvasWidth, canvasHeight) {
        if (!this.active) return null;

        // Store trail position
        this.trail.push({ x: this.x, y: this.y, alpha: 1 });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        // Fade trail
        for (let i = 0; i < this.trail.length; i++) {
            this.trail[i].alpha = (i + 1) / this.trail.length;
        }

        // Apply speed multiplier
        const effectiveSpeed = this.speed * this.speedMultiplier;
        const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if (magnitude > 0) {
            this.dx = (this.dx / magnitude) * effectiveSpeed;
            this.dy = (this.dy / magnitude) * effectiveSpeed;
        }

        // Move
        this.x += this.dx * dt;
        this.y += this.dy * dt;

        // Wall collisions
        // Left wall
        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.dx = Math.abs(this.dx);
            this.hitFlash = 0.15;
        }
        // Right wall
        if (this.x + this.radius >= canvasWidth) {
            this.x = canvasWidth - this.radius;
            this.dx = -Math.abs(this.dx);
            this.hitFlash = 0.15;
        }
        // Top wall
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.dy = Math.abs(this.dy);
            this.hitFlash = 0.15;
        }
        // Bottom — ball lost
        if (this.y - this.radius > canvasHeight) {
            return 'bottom';
        }

        // Decay hit flash
        if (this.hitFlash > 0) {
            this.hitFlash -= dt * 3;
            if (this.hitFlash < 0) this.hitFlash = 0;
        }

        return null;
    }

    /** Notify ball a brick was destroyed (for speed scaling) */
    onBrickDestroyed() {
        this.bricksDestroyed++;
        // Increase speed by 3% every 10 bricks, max 1.8x
        this.speedMultiplier = Math.min(1.8, 1 + Math.floor(this.bricksDestroyed / 10) * 0.03);
    }

    /**
     * Render ball on canvas
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        // Trail
        for (const t of this.trail) {
            ctx.beginPath();
            ctx.arc(t.x, t.y, this.radius * 0.6 * t.alpha, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 136, ${t.alpha * 0.3})`;
            ctx.fill();
        }

        // Glow
        ctx.save();
        ctx.shadowColor = this.hitFlash > 0 ? '#ffffff' : this.color;
        ctx.shadowBlur = 15 + this.hitFlash * 30;

        // Ball
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        // Gradient fill
        const gradient = ctx.createRadialGradient(
            this.x - this.radius * 0.3, this.y - this.radius * 0.3, 0,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, this.hitFlash > 0 ? '#ffffff' : '#88ffcc');
        gradient.addColorStop(1, this.color);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
    }

    /** Reset ball state */
    reset() {
        this.trail = [];
        this.active = false;
        this.dx = 0;
        this.dy = 0;
        this.bricksDestroyed = 0;
        this.speedMultiplier = 1;
        this.speed = this.baseSpeed;
        this.hitFlash = 0;
    }
}
