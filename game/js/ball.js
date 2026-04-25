/**
 * Ball — Physics with anti-gravity support, optimized trail
 * @module ball
 */

export class Ball {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     */
    constructor(x, y, radius = 6) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.baseSpeed = 380;
        this.speed = this.baseSpeed;
        this.dx = 0;
        this.dy = 0;
        this.active = false;

        // Trail (ring buffer for perf)
        this.trail = new Float32Array(24); // 12 positions × (x, y)
        this.trailHead = 0;
        this.trailLen = 0;
        this.maxTrail = 12;

        // Anti-gravity
        this.gravity = 0; // 0 = no gravity, positive = down, negative = up
        this.orbitalCurve = 0; // Slight curve from gravity

        // Visual
        this.hitFlash = 0;
        this.color = '#00ff88';

        // Speed scaling
        this.bricksDestroyed = 0;
        this.speedMultiplier = 1;

        // Slow-mo
        this.slowMo = 1; // 1 = normal, < 1 = slow motion
    }

    /** Launch ball at an angle */
    launch(gravityDir = 1) {
        const angle = gravityDir > 0
            ? -Math.PI / 2 + (Math.random() - 0.5) * 0.6
            : Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
        this.active = true;
    }

    /** Attach ball to paddle */
    attachTo(paddle, gravityDir = 1) {
        this.x = paddle.x + paddle.width / 2;
        if (gravityDir > 0) {
            this.y = paddle.y - this.radius - 2;
        } else {
            this.y = paddle.y + paddle.height + this.radius + 2;
        }
        this.active = false;
        this.dx = 0;
        this.dy = 0;
    }

    /**
     * Update ball position
     * @param {number} dt
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @param {number} gravityDir — 1 = normal, -1 = inverted
     * @returns {string|null} 'lost' if ball fell off screen
     */
    update(dt, canvasWidth, canvasHeight, gravityDir = 1) {
        if (!this.active) return null;

        const sDt = dt * this.slowMo;

        // Store trail
        const idx = this.trailHead * 2;
        this.trail[idx] = this.x;
        this.trail[idx + 1] = this.y;
        this.trailHead = (this.trailHead + 1) % this.maxTrail;
        if (this.trailLen < this.maxTrail) this.trailLen++;

        // Apply gravity (orbital curve effect)
        if (this.gravity !== 0) {
            this.dy += this.gravity * gravityDir * sDt;
            this.dx += this.orbitalCurve * gravityDir * sDt;
        }

        // Clamp speed
        const effectiveSpeed = this.speed * this.speedMultiplier;
        const mag = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if (mag > effectiveSpeed * 1.5) {
            this.dx = (this.dx / mag) * effectiveSpeed;
            this.dy = (this.dy / mag) * effectiveSpeed;
        }

        // Move
        this.x += this.dx * sDt;
        this.y += this.dy * sDt;

        // Wall collisions
        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.dx = Math.abs(this.dx);
            this.hitFlash = 0.1;
        }
        if (this.x + this.radius >= canvasWidth) {
            this.x = canvasWidth - this.radius;
            this.dx = -Math.abs(this.dx);
            this.hitFlash = 0.1;
        }

        // Top/bottom boundaries — depends on gravity
        if (gravityDir > 0) {
            if (this.y - this.radius <= 0) {
                this.y = this.radius;
                this.dy = Math.abs(this.dy);
                this.hitFlash = 0.1;
            }
            if (this.y - this.radius > canvasHeight) return 'lost';
        } else {
            if (this.y + this.radius >= canvasHeight) {
                this.y = canvasHeight - this.radius;
                this.dy = -Math.abs(this.dy);
                this.hitFlash = 0.1;
            }
            if (this.y + this.radius < 0) return 'lost';
        }

        // Decay flash
        if (this.hitFlash > 0) {
            this.hitFlash = Math.max(0, this.hitFlash - dt * 5);
        }

        return null;
    }

    /** Speed up after brick destruction */
    onBrickDestroyed() {
        this.bricksDestroyed++;
        this.speedMultiplier = Math.min(1.8, 1 + Math.floor(this.bricksDestroyed / 10) * 0.03);
    }

    /**
     * Render ball — optimized, no shadowBlur
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        // Trail — render from buffer
        if (this.trailLen > 0) {
            for (let i = 0; i < this.trailLen; i++) {
                const ri = ((this.trailHead - this.trailLen + i + this.maxTrail) % this.maxTrail) * 2;
                const alpha = (i + 1) / this.trailLen;
                ctx.globalAlpha = alpha * 0.2;
                ctx.fillStyle = this.color;
                ctx.fillRect(
                    this.trail[ri] - this.radius * 0.4 * alpha,
                    this.trail[ri + 1] - this.radius * 0.4 * alpha,
                    this.radius * 0.8 * alpha,
                    this.radius * 0.8 * alpha
                );
            }
            ctx.globalAlpha = 1;
        }

        // Ball — simple radial draw, no shadowBlur
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        if (this.hitFlash > 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = this.color;
        }
        ctx.fill();

        // Inner highlight (cheaper than gradient)
        ctx.beginPath();
        ctx.arc(this.x - 1.5, this.y - 1.5, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fill();
    }

    /** Reset */
    reset() {
        this.trailLen = 0;
        this.trailHead = 0;
        this.active = false;
        this.dx = 0;
        this.dy = 0;
        this.bricksDestroyed = 0;
        this.speedMultiplier = 1;
        this.speed = this.baseSpeed;
        this.hitFlash = 0;
        this.gravity = 0;
        this.orbitalCurve = 0;
        this.slowMo = 1;
    }
}
