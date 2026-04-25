/**
 * PowerUps — Extended with anti-gravity types
 * @module powerups
 */

export const POWERUP_TYPES = {
    MULTIBALL: {
        id: 'multiball', label: '⊕', color: '#ff4444',
        description: 'Multi-Ball', duration: 0,
    },
    WIDE_PADDLE: {
        id: 'wide', label: '⬌', color: '#fbbf24',
        description: 'Wide Paddle', duration: 8,
    },
    LASER: {
        id: 'laser', label: '⚡', color: '#ff0066',
        description: 'Laser', duration: 6,
    },
    SLOW_BALL: {
        id: 'slow', label: '◎', color: '#00d4ff',
        description: 'Slow Ball', duration: 6,
    },
    ANTIGRAV: {
        id: 'antigrav', label: '⇅', color: '#00ffd5',
        description: 'Anti-Gravity', duration: 5,
    },
    ZEROG: {
        id: 'zerog', label: '○', color: '#a855f7',
        description: 'Zero-G', duration: 4,
    },
    HEAVY: {
        id: 'heavy', label: '▼', color: '#ff6600',
        description: 'Heavy Mode', duration: 4,
    },
};

const POWERUP_LIST = Object.values(POWERUP_TYPES);
const DROP_CHANCE = 0.13;

export class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = 16;
        this.speed = 110;
        this.active = true;
        this.pulse = 0;
        this.fallDir = 1; // Can be -1 for inverted gravity
    }

    update(dt, canvasHeight) {
        this.y += this.speed * this.fallDir * dt;
        this.pulse += dt * 4;
        if (this.y > canvasHeight + 20 || this.y < -20) this.active = false;
    }

    render(ctx) {
        if (!this.active) return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const r = this.size / 2;

        // Simple circle + letter (no shadows)
        ctx.strokeStyle = this.type.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Background fill
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = this.type.color;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Symbol
        ctx.font = `bold ${this.size * 0.55}px 'JetBrains Mono'`;
        ctx.fillStyle = this.type.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.label, cx, cy);
    }
}

export class PowerUpManager {
    constructor() {
        /** @type {PowerUp[]} */
        this.falling = [];
        /** @type {Map<string, number>} */
        this.activeEffects = new Map();
        this.notifications = [];
    }

    trySpawn(brick, gravityDir = 1) {
        if (Math.random() > DROP_CHANCE) return;
        const type = POWERUP_LIST[Math.floor(Math.random() * POWERUP_LIST.length)];
        const pu = new PowerUp(
            brick.x + brick.width / 2 - 8,
            brick.y + brick.height / 2 - 8,
            type
        );
        pu.fallDir = gravityDir;
        this.falling.push(pu);
    }

    activate(powerup, game) {
        const type = powerup.type;
        this.notifications.push({ text: type.description, color: type.color, timer: 1.2 });

        switch (type.id) {
            case 'multiball':
                this._multiball(game);
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
                for (const b of game.balls) b.speedMultiplier = Math.max(0.5, b.speedMultiplier * 0.7);
                this.activeEffects.set('slow', type.duration);
                break;
            case 'antigrav':
                game.flipGravity();
                this.activeEffects.set('antigrav', type.duration);
                break;
            case 'zerog':
                for (const b of game.balls) {
                    b.gravity = 0;
                    b.slowMo = 0.5;
                }
                this.activeEffects.set('zerog', type.duration);
                break;
            case 'heavy':
                for (const b of game.balls) {
                    b.gravity = 400;
                    b.speedMultiplier = Math.min(2, b.speedMultiplier * 1.4);
                }
                this.activeEffects.set('heavy', type.duration);
                break;
        }
    }

    _multiball(game) {
        const primary = game.balls.find(b => b.active);
        if (!primary) return;
        for (let i = 0; i < 2; i++) {
            const nb = game.createBall();
            nb.x = primary.x;
            nb.y = primary.y;
            nb.active = true;
            const angle = -Math.PI / 2 + (i === 0 ? -0.5 : 0.5);
            const speed = Math.sqrt(primary.dx ** 2 + primary.dy ** 2);
            nb.dx = Math.cos(angle) * speed;
            nb.dy = Math.sin(angle) * speed;
            nb.speedMultiplier = primary.speedMultiplier;
            game.balls.push(nb);
        }
    }

    update(dt, canvasHeight, game) {
        for (const p of this.falling) p.update(dt, canvasHeight);
        this.falling = this.falling.filter(p => p.active);

        for (const [effect, time] of this.activeEffects) {
            const remaining = time - dt;
            if (remaining <= 0) {
                this.activeEffects.delete(effect);
                this._deactivate(effect, game);
            } else {
                this.activeEffects.set(effect, remaining);
            }
        }

        for (const n of this.notifications) n.timer -= dt;
        this.notifications = this.notifications.filter(n => n.timer > 0);
    }

    _deactivate(effect, game) {
        switch (effect) {
            case 'wide':
                game.paddle.widthMultiplier = 1;
                break;
            case 'laser':
                game.paddle.laserMode = false;
                break;
            case 'slow':
                for (const b of game.balls) {
                    b.speedMultiplier = Math.min(1.8, 1 + Math.floor(b.bricksDestroyed / 10) * 0.03);
                }
                break;
            case 'antigrav':
                game.flipGravity(); // Flip back
                break;
            case 'zerog':
                for (const b of game.balls) {
                    b.gravity = game.baseGravity;
                    b.slowMo = 1;
                }
                break;
            case 'heavy':
                for (const b of game.balls) {
                    b.gravity = game.baseGravity;
                    b.speedMultiplier = Math.min(1.8, 1 + Math.floor(b.bricksDestroyed / 10) * 0.03);
                }
                break;
        }
    }

    render(ctx, canvasWidth) {
        for (const p of this.falling) p.render(ctx);

        // Active effect timers (bottom-right)
        let i = 0;
        for (const [effect, time] of this.activeEffects) {
            const type = POWERUP_LIST.find(t => t.id === effect);
            if (!type || type.duration === 0) continue;

            const barW = 60;
            const barH = 4;
            const x = canvasWidth - barW - 8;
            const y = 12 + i * 12;
            const progress = time / type.duration;

            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(x, y, barW, barH);
            ctx.fillStyle = type.color;
            ctx.fillRect(x, y, barW * progress, barH);

            ctx.font = '9px JetBrains Mono';
            ctx.fillStyle = type.color;
            ctx.textAlign = 'right';
            ctx.fillText(type.label, x - 4, y + barH);
            i++;
        }

        // Center notifications
        for (const n of this.notifications) {
            ctx.globalAlpha = Math.min(1, n.timer * 2);
            ctx.font = 'bold 13px JetBrains Mono';
            ctx.fillStyle = n.color;
            ctx.textAlign = 'center';
            ctx.fillText(n.text, canvasWidth / 2, 85 - (1.2 - n.timer) * 25);
            ctx.globalAlpha = 1;
        }
    }

    reset() {
        this.falling = [];
        this.activeEffects.clear();
        this.notifications = [];
    }
}
