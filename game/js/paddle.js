/**
 * Paddle — Movement, input handling, rendering
 * @module paddle
 */

export class Paddle {
    /**
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    constructor(canvasWidth, canvasHeight) {
        this.width = 100;
        this.height = 14;
        this.x = (canvasWidth - this.width) / 2;
        this.y = canvasHeight - 40;
        this.targetX = this.x;
        this.baseWidth = this.width;

        // Movement
        this.speed = 600; // pixels per second
        this.lerpFactor = 0.15;

        // Input state
        this.moveLeft = false;
        this.moveRight = false;
        this.useMouseControl = false;
        this.mouseX = this.x + this.width / 2;

        // Visual
        this.glowIntensity = 1;
        this.hitFlash = 0;
        this.widthMultiplier = 1;
        this.widthTransition = 1;

        // Canvas bounds
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Laser mode
        this.laserMode = false;
        this.laserCooldown = 0;
        this.lasers = [];

        this._bindEvents();
    }

    /** Bind keyboard, mouse, and touch events */
    _bindEvents() {
        // Keyboard
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

        // Mouse
        this._onMouseMove = (e) => {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.useMouseControl = true;
        };

        // Touch
        this._onTouchMove = (e) => {
            e.preventDefault();
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const touch = e.touches[0];
            this.mouseX = (touch.clientX - rect.left) * scaleX;
            this.useMouseControl = true;
        };

        this._onTouchStart = (e) => {
            this._onTouchMove(e);
        };

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('touchmove', this._onTouchMove, { passive: false });
        document.addEventListener('touchstart', this._onTouchStart, { passive: false });
    }

    /** Clean up event listeners */
    destroy() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('touchmove', this._onTouchMove);
        document.removeEventListener('touchstart', this._onTouchStart);
    }

    /**
     * Update paddle position
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Width transition
        const targetWidth = this.baseWidth * this.widthMultiplier;
        this.width += (targetWidth - this.width) * 0.1;

        if (this.useMouseControl) {
            // Mouse/touch control — lerp to mouse position
            this.targetX = this.mouseX - this.width / 2;
        } else {
            // Keyboard control
            if (this.moveLeft) this.targetX -= this.speed * dt;
            if (this.moveRight) this.targetX += this.speed * dt;
        }

        // Clamp target
        this.targetX = Math.max(0, Math.min(this.canvasWidth - this.width, this.targetX));

        // Smooth interpolation
        this.x += (this.targetX - this.x) * this.lerpFactor;

        // Clamp position
        this.x = Math.max(0, Math.min(this.canvasWidth - this.width, this.x));

        // Update y based on canvas height
        this.y = this.canvasHeight - 40;

        // Decay hit flash
        if (this.hitFlash > 0) {
            this.hitFlash -= dt * 4;
            if (this.hitFlash < 0) this.hitFlash = 0;
        }

        // Update lasers
        if (this.laserMode) {
            this.laserCooldown -= dt;
            if (this.laserCooldown <= 0) {
                this.lasers.push(
                    { x: this.x + 6, y: this.y, active: true },
                    { x: this.x + this.width - 6, y: this.y, active: true }
                );
                this.laserCooldown = 0.3; // Fire every 0.3 seconds
            }
        }

        // Move lasers
        for (const laser of this.lasers) {
            if (laser.active) {
                laser.y -= 600 * dt;
                if (laser.y < 0) laser.active = false;
            }
        }

        // Cleanup dead lasers
        this.lasers = this.lasers.filter(l => l.active);
    }

    /**
     * Render paddle on canvas
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        ctx.save();

        // Glow
        const glowColor = this.laserMode ? '#ff0066' : '#00d4ff';
        ctx.shadowColor = this.hitFlash > 0 ? '#ffffff' : glowColor;
        ctx.shadowBlur = 12 + this.hitFlash * 20;

        // Paddle body
        const r = this.height / 2;
        ctx.beginPath();
        ctx.moveTo(this.x + r, this.y);
        ctx.lineTo(this.x + this.width - r, this.y);
        ctx.arcTo(this.x + this.width, this.y, this.x + this.width, this.y + r, r);
        ctx.arcTo(this.x + this.width, this.y + this.height, this.x + this.width - r, this.y + this.height, r);
        ctx.lineTo(this.x + r, this.y + this.height);
        ctx.arcTo(this.x, this.y + this.height, this.x, this.y + r, r);
        ctx.arcTo(this.x, this.y, this.x + r, this.y, r);
        ctx.closePath();

        // Gradient
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        if (this.laserMode) {
            gradient.addColorStop(0, '#ff3388');
            gradient.addColorStop(1, '#cc0044');
        } else {
            gradient.addColorStop(0, '#33eeff');
            gradient.addColorStop(1, '#0099bb');
        }
        ctx.fillStyle = gradient;
        ctx.fill();

        // Top highlight
        ctx.beginPath();
        ctx.moveTo(this.x + r + 4, this.y + 2);
        ctx.lineTo(this.x + this.width - r - 4, this.y + 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();

        // Render lasers
        for (const laser of this.lasers) {
            ctx.save();
            ctx.shadowColor = '#ff0066';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#ff0066';
            ctx.fillRect(laser.x - 1.5, laser.y, 3, 12);
            ctx.restore();
        }
    }

    /** Trigger hit flash effect */
    flash() {
        this.hitFlash = 1;
    }

    /** Reset paddle to center */
    reset(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.width = this.baseWidth;
        this.x = (canvasWidth - this.width) / 2;
        this.y = canvasHeight - 40;
        this.targetX = this.x;
        this.hitFlash = 0;
        this.laserMode = false;
        this.lasers = [];
        this.laserCooldown = 0;
        this.widthMultiplier = 1;
    }
}
