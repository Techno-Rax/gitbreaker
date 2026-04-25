/**
 * Paddle — Velocity-reactive glow, anti-gravity support
 * @module paddle
 */

export class Paddle {
    /**
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    constructor(canvasWidth, canvasHeight) {
        this.width = 100;
        this.height = 12;
        this.x = (canvasWidth - this.width) / 2;
        this.y = canvasHeight - 36;
        this.targetX = this.x;
        this.baseWidth = this.width;

        // Movement
        this.speed = 650;
        this.velocity = 0; // Track velocity for glow effect
        this.prevX = this.x;

        // Input
        this.moveLeft = false;
        this.moveRight = false;
        this.useMouseControl = false;
        this.mouseX = this.x + this.width / 2;

        // Visual
        this.hitFlash = 0;
        this.widthMultiplier = 1;
        this.velocityGlow = 0; // 0–1 based on speed

        // Bounds
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Gravity
        this.gravityDir = 1; // 1 = bottom, -1 = top

        // Laser mode
        this.laserMode = false;
        this.laserCooldown = 0;
        this.lasers = [];

        this._bindEvents();
    }

    _bindEvents() {
        this._onKeyDown = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.moveLeft = true;
                this.useMouseControl = false;
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.moveRight = true;
                this.useMouseControl = false;
            }
        };
        this._onKeyUp = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.moveLeft = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.moveRight = false;
        };

        this._onMouseMove = (e) => {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.useMouseControl = true;
        };

        this._onTouchMove = (e) => {
            e.preventDefault();
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            this.mouseX = (e.touches[0].clientX - rect.left) * scaleX;
            this.useMouseControl = true;
        };

        this._onTouchStart = (e) => { this._onTouchMove(e); };

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('touchmove', this._onTouchMove, { passive: false });
        document.addEventListener('touchstart', this._onTouchStart, { passive: false });
    }

    destroy() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('touchmove', this._onTouchMove);
        document.removeEventListener('touchstart', this._onTouchStart);
    }

    /**
     * Update paddle
     * @param {number} dt
     */
    update(dt) {
        this.prevX = this.x;

        // Width transition
        const targetWidth = this.baseWidth * this.widthMultiplier;
        this.width += (targetWidth - this.width) * 0.12;

        if (this.useMouseControl) {
            this.targetX = this.mouseX - this.width / 2;
        } else {
            if (this.moveLeft) this.targetX -= this.speed * dt;
            if (this.moveRight) this.targetX += this.speed * dt;
        }

        this.targetX = Math.max(0, Math.min(this.canvasWidth - this.width, this.targetX));
        this.x += (this.targetX - this.x) * 0.18;
        this.x = Math.max(0, Math.min(this.canvasWidth - this.width, this.x));

        // Y based on gravity
        this.y = this.gravityDir > 0
            ? this.canvasHeight - 36
            : 24;

        // Velocity tracking for glow
        this.velocity = (this.x - this.prevX) / dt;
        this.velocityGlow = Math.min(1, Math.abs(this.velocity) / 800);

        // Decay flash
        if (this.hitFlash > 0) {
            this.hitFlash = Math.max(0, this.hitFlash - dt * 5);
        }

        // Lasers
        if (this.laserMode) {
            this.laserCooldown -= dt;
            if (this.laserCooldown <= 0) {
                const laserDir = this.gravityDir > 0 ? -1 : 1;
                this.lasers.push(
                    { x: this.x + 6, y: this.y + (laserDir > 0 ? this.height : 0), dy: laserDir, active: true },
                    { x: this.x + this.width - 6, y: this.y + (laserDir > 0 ? this.height : 0), dy: laserDir, active: true }
                );
                this.laserCooldown = 0.3;
            }
        }

        for (const laser of this.lasers) {
            if (laser.active) {
                laser.y += laser.dy * 600 * dt;
                if (laser.y < -10 || laser.y > this.canvasHeight + 10) laser.active = false;
            }
        }
        this.lasers = this.lasers.filter(l => l.active);
    }

    /**
     * Render — velocity-reactive glow, no heavy shadows
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        const r = this.height / 2;

        // Velocity glow — rendered as semi-transparent underline
        if (this.velocityGlow > 0.1) {
            const glowAlpha = this.velocityGlow * 0.4;
            const glowColor = this.laserMode ? `rgba(255,0,102,${glowAlpha})` : `rgba(0,212,255,${glowAlpha})`;
            ctx.fillStyle = glowColor;
            const spread = this.velocityGlow * 8;
            ctx.fillRect(
                this.x - spread, this.y - spread * 0.5,
                this.width + spread * 2, this.height + spread
            );
        }

        // Paddle body (rounded rect)
        ctx.beginPath();
        ctx.moveTo(this.x + r, this.y);
        ctx.lineTo(this.x + this.width - r, this.y);
        ctx.arcTo(this.x + this.width, this.y, this.x + this.width, this.y + r, r);
        ctx.arcTo(this.x + this.width, this.y + this.height, this.x + this.width - r, this.y + this.height, r);
        ctx.lineTo(this.x + r, this.y + this.height);
        ctx.arcTo(this.x, this.y + this.height, this.x, this.y + r, r);
        ctx.arcTo(this.x, this.y, this.x + r, this.y, r);
        ctx.closePath();

        if (this.hitFlash > 0) {
            ctx.fillStyle = '#ffffff';
        } else if (this.laserMode) {
            ctx.fillStyle = '#ff3388';
        } else {
            ctx.fillStyle = '#00b8d4';
        }
        ctx.fill();

        // Top highlight
        ctx.beginPath();
        ctx.moveTo(this.x + r + 4, this.y + 1.5);
        ctx.lineTo(this.x + this.width - r - 4, this.y + 1.5);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Lasers
        for (const laser of this.lasers) {
            ctx.fillStyle = '#ff0066';
            ctx.fillRect(laser.x - 1, laser.y, 2, 10);
        }
    }

    flash() { this.hitFlash = 1; }

    reset(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.width = this.baseWidth;
        this.x = (canvasWidth - this.width) / 2;
        this.y = canvasHeight - 36;
        this.targetX = this.x;
        this.hitFlash = 0;
        this.laserMode = false;
        this.lasers = [];
        this.laserCooldown = 0;
        this.widthMultiplier = 1;
        this.gravityDir = 1;
        this.velocity = 0;
        this.velocityGlow = 0;
    }
}
