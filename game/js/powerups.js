/**
 * PowerUps — Power-up system with types, spawning, and rendering
 * @module powerups
 */

/** Power-up type definitions */
export const POWERUP_TYPES = {
    MULTIBALL: {
        id: 'multiball',
        label: '⊕',
        color: '#ff4444',
        glow: 'rgba(255, 68, 68, 0.5)',
        description: 'Multi-Ball',
        duration: 0, // Instant
    },
    WIDE_PADDLE: {
        id: 'wide',
        label: '⬌',
        color: '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.5)',
        description: 'Wide Paddle',
        duration: 8,
    },
    LASER: {
        id: 'laser',
        label: '⚡',
        color: '#ff0066',
        glow: 'rgba(255, 0, 102, 0.5)',
        description: 'Laser',
        duration: 6,
    },
    SLOW_BALL: {
        id: 'slow',
        label: '◎',
        color: '#00d4ff',
        glow: 'rgba(0, 212, 255, 0.5)',
        description: 'Slow Ball',
        duration: 6,
    },
};

const POWERUP_LIST = Object.values(POWERUP_TYPES);
const DROP_CHANCE = 0.12; // 12% chance per brick

export class PowerUp {
    /**
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {object} type - POWERUP_TYPES entry
     */
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = 18;
        this.speed = 120; // fall speed
        this.active = true;
        this.pulse = 0;
    }

    /**
     * Update power-up position
     * @param {number} dt
     * @param {number} canvasHeight
     */
    update(dt, canvasHeight) {
        this.y += this.speed * dt;
        this.pulse += dt * 4;

        // Off screen
        if (this.y > canvasHeight + this.size) {
            this.active = false;
        }
    }

    /**
     * Render power-up
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.active) return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const pulseScale = 1 + Math.sin(this.pulse) * 0.1;
        const r = (this.size / 2) * pulseScale;

        ctx.save();

        // Glow
        ctx.shadowColor = this.type.color;
        ctx.shadowBlur = 12;

        // Background circle
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = this.type.color;
        ctx.globalAlpha = 0.2;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Border
        ctx.strokeStyle = this.type.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Symbol
        ctx.font = `bold ${this.size * 0.6}px 'Inter'`;
        ctx.fillStyle = this.type.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.label, cx, cy);

        ctx.restore();
    }
}

/**
 * Power-up manager — handles spawning, active effects, and timers
 */
export class PowerUpManager {
    constructor() {
        /** @type {PowerUp[]} */
        this.falling = [];

        /** @type {Map<string, number>} Active effect timers */
        this.activeEffects = new Map();

        /** Notification queue */
        this.notifications = [];
    }

    /**
     * Try to spawn a power-up from a destroyed brick
     * @param {import('./brick.js').Brick} brick
     */
    trySpawn(brick) {
        if (Math.random() > DROP_CHANCE) return;

        const type = POWERUP_LIST[Math.floor(Math.random() * POWERUP_LIST.length)];
        const powerup = new PowerUp(
            brick.x + brick.width / 2 - 9,
            brick.y + brick.height / 2 - 9,
            type
        );
        this.falling.push(powerup);
    }

    /**
     * Activate a collected power-up
     * @param {PowerUp} powerup
     * @param {object} game - Game context with ball, paddle, etc.
     */
    activate(powerup, game) {
        const type = powerup.type;

        this.notifications.push({
            text: type.description,
            color: type.color,
            timer: 1.5,
        });

        switch (type.id) {
            case 'multiball':
                this._activateMultiBall(game);
                break;
            case 'wide':
                game.paddle.widthMultiplier = 1.5;
                this.activeEffects.set('wide', type.duration);
                break;
            case 'laser':
                game.paddle.laserMode = true;
                this.activeEffects.set('laser', type.duration);
                break;
            case 'slow':
                for (const ball of game.balls) {
                    ball.speedMultiplier = Math.max(0.5, ball.speedMultiplier * 0.7);
                }
                this.activeEffects.set('slow', type.duration);
                break;
        }
    }

    _activateMultiBall(game) {
        const primaryBall = game.balls.find(b => b.active);
        if (!primaryBall) return;

        // Create 2 extra balls
        for (let i = 0; i < 2; i++) {
            const newBall = game.createBall();
            newBall.x = primaryBall.x;
            newBall.y = primaryBall.y;
            newBall.active = true;
            const angle = -Math.PI / 2 + (i === 0 ? -0.5 : 0.5);
            const speed = Math.sqrt(primaryBall.dx ** 2 + primaryBall.dy ** 2);
            newBall.dx = Math.cos(angle) * speed;
            newBall.dy = Math.sin(angle) * speed;
            newBall.speedMultiplier = primaryBall.speedMultiplier;
            game.balls.push(newBall);
        }
    }

    /**
     * Update power-ups and effect timers
     * @param {number} dt
     * @param {number} canvasHeight
     * @param {object} game
     */
    update(dt, canvasHeight, game) {
        // Update falling power-ups
        for (const p of this.falling) {
            p.update(dt, canvasHeight);
        }
        this.falling = this.falling.filter(p => p.active);

        // Update effect timers
        for (const [effect, time] of this.activeEffects) {
            const remaining = time - dt;
            if (remaining <= 0) {
                this.activeEffects.delete(effect);
                this._deactivateEffect(effect, game);
            } else {
                this.activeEffects.set(effect, remaining);
            }
        }

        // Update notifications
        for (const n of this.notifications) {
            n.timer -= dt;
        }
        this.notifications = this.notifications.filter(n => n.timer > 0);
    }

    _deactivateEffect(effect, game) {
        switch (effect) {
            case 'wide':
                game.paddle.widthMultiplier = 1;
                break;
            case 'laser':
                game.paddle.laserMode = false;
                break;
            case 'slow':
                for (const ball of game.balls) {
                    ball.speedMultiplier = Math.min(1.8, 1 + Math.floor(ball.bricksDestroyed / 10) * 0.03);
                }
                break;
        }
    }

    /**
     * Render falling power-ups and notifications
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvasWidth
     */
    render(ctx, canvasWidth) {
        // Falling power-ups
        for (const p of this.falling) {
            p.render(ctx);
        }

        // Active effect indicators (bottom-left)
        let indicatorY = 20;
        for (const [effect, time] of this.activeEffects) {
            const type = POWERUP_LIST.find(t => t.id === effect);
            if (!type) continue;

            ctx.save();
            ctx.font = '12px JetBrains Mono';
            ctx.fillStyle = type.color;
            ctx.textAlign = 'left';
            ctx.fillText(`${type.label} ${time.toFixed(1)}s`, 8, canvasWidth ? indicatorY : 20);
            ctx.restore();
            indicatorY += 18;
        }

        // Notifications (center-top)
        for (const n of this.notifications) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, n.timer * 2);
            ctx.font = 'bold 16px Inter';
            ctx.fillStyle = n.color;
            ctx.textAlign = 'center';
            ctx.shadowColor = n.color;
            ctx.shadowBlur = 10;
            ctx.fillText(n.text, canvasWidth / 2, 100 - (1.5 - n.timer) * 30);
            ctx.restore();
        }
    }

    /** Reset all power-ups and effects */
    reset() {
        this.falling = [];
        this.activeEffects.clear();
        this.notifications = [];
    }
}
