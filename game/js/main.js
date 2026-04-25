/**
 * Main — Game loop, state machine, orchestrator
 * @module main
 */

import { Ball } from './ball.js';
import { Paddle } from './paddle.js';
import { generateGrid, generateDemoGrid } from './grid.js';
import { ballPaddle, ballBricks, laserBricks, powerupPaddle } from './collision.js';
import { PowerUpManager } from './powerups.js';
import { ParticleSystem } from './particles.js';
import { SoundEngine } from './sound.js';
import { fetchContributions } from './contributions.js';
import * as UI from './ui.js';

// ── Game States ──
const State = {
    MENU: 'MENU',
    LOADING: 'LOADING',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
    WIN: 'WIN',
};

// ── Game Instance ──
class Game {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Sizing
        this._resize();
        window.addEventListener('resize', () => this._resize());

        // State
        this.state = State.MENU;
        this.username = 'anoojshete';

        // Game objects
        /** @type {Ball[]} */
        this.balls = [];
        this.paddle = null;
        /** @type {import('./brick.js').Brick[]} */
        this.bricks = [];

        // Systems
        this.powerUps = new PowerUpManager();
        this.particles = new ParticleSystem();
        this.sound = new SoundEngine();

        // Score & stats
        this.score = 0;
        this.lives = 3;
        this.combo = 0;
        this.maxCombo = 0;
        this.bricksDestroyedCount = 0;
        this.totalBricks = 0;
        this.startTime = 0;
        this.comboTimer = 0;

        // Screen shake
        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;

        // Timing
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedDt = 1 / 120; // Physics at 120Hz

        // Win confetti timer
        this.confettiTimer = 0;

        // Init
        UI.initUI();
        this._bindEvents();
        this._startLoop();
    }

    /** Resize canvas to fit container */
    _resize() {
        const wrapper = document.getElementById('game-wrapper');
        const maxW = 900;
        const w = Math.min(window.innerWidth - 20, maxW);
        const h = Math.min(window.innerHeight - 20, w * 0.65);

        this.canvas.width = w;
        this.canvas.height = h;

        // Re-position paddle if active
        if (this.paddle) {
            this.paddle.canvasWidth = w;
            this.paddle.canvasHeight = h;
            this.paddle.y = h - 40;
        }
    }

    /** Bind UI event listeners */
    _bindEvents() {
        // Play button — with contributions
        document.getElementById('play-btn')?.addEventListener('click', () => {
            this.sound.init();
            this.username = UI.getUsername();
            this._startWithContributions(this.username);
        });

        // Demo button — with static grid
        document.getElementById('demo-btn')?.addEventListener('click', () => {
            this.sound.init();
            this.username = 'Demo Mode';
            this._startGame(generateDemoGrid(), true);
        });

        // Restart buttons
        document.getElementById('restart-btn')?.addEventListener('click', () => {
            this._restartGame();
        });
        document.getElementById('win-restart-btn')?.addEventListener('click', () => {
            this._restartGame();
        });

        // Resume
        document.getElementById('resume-btn')?.addEventListener('click', () => {
            this.state = State.PLAYING;
            UI.hideAllScreens();
        });

        // Sound toggle
        document.getElementById('sound-toggle')?.addEventListener('click', () => {
            this.sound.init();
            const muted = this.sound.toggleMute();
            UI.updateSoundButton(muted);
        });

        // Pause (Escape key)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.state === State.PLAYING) {
                    this.state = State.PAUSED;
                    UI.showScreen('pause-screen');
                } else if (this.state === State.PAUSED) {
                    this.state = State.PLAYING;
                    UI.hideAllScreens();
                }
            }

            // Launch ball on space/click
            if ((e.key === ' ' || e.code === 'Space') && this.state === State.PLAYING) {
                this._tryLaunchBall();
            }
        });

        // Launch ball on canvas click/touch
        this.canvas.addEventListener('click', () => {
            if (this.state === State.PLAYING) {
                this._tryLaunchBall();
            }
        });

        // Enter key on username input
        document.getElementById('username-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('play-btn')?.click();
            }
        });
    }

    /** Try to launch any unlaunched ball */
    _tryLaunchBall() {
        const unlaunchedBall = this.balls.find(b => !b.active);
        if (unlaunchedBall) {
            unlaunchedBall.launch();
            this.sound.launch();
        }
    }

    /** Start game with fetched contributions */
    async _startWithContributions(username) {
        this.state = State.LOADING;
        UI.showLoading();

        try {
            const { grid, totalContributions } = await fetchContributions(username);
            console.log(`Loaded ${totalContributions} contributions for ${username}`);
            this._startGame(grid, true);
        } catch (err) {
            console.warn('Failed to fetch contributions, using demo grid:', err.message);
            // Fallback to demo
            this._startGame(generateDemoGrid(), true);
        }
    }

    /**
     * Initialize and start the game
     * @param {number[][]} gridData - 7×N grid of HP values
     * @param {boolean} isHpData - Whether data is already HP values
     */
    _startGame(gridData, isHpData = false) {
        this.state = State.PLAYING;

        // Reset stats
        this.score = 0;
        this.lives = 3;
        this.combo = 0;
        this.maxCombo = 0;
        this.bricksDestroyedCount = 0;
        this.startTime = performance.now();
        this.comboTimer = 0;

        // Create game objects
        this.paddle = new Paddle(this.canvas.width, this.canvas.height);

        this.balls = [];
        const ball = this.createBall();
        ball.attachTo(this.paddle);
        this.balls.push(ball);

        this.bricks = generateGrid(gridData, this.canvas.width, this.canvas.height, {
            isHpData,
            topPadding: 60,
        });
        this.totalBricks = this.bricks.length;

        // Reset systems
        this.powerUps.reset();
        this.particles.reset();

        // UI
        UI.hideAllScreens();
        UI.updateScore(0);
        UI.updateLives(this.lives);
        UI.updateUsername(this.username);
    }

    /** Create a new ball instance */
    createBall() {
        return new Ball(this.canvas.width / 2, this.canvas.height - 60, 6);
    }

    /** Restart with same grid */
    _restartGame() {
        // Re-fetch or re-use demo
        if (this.username === 'Demo Mode') {
            this._startGame(generateDemoGrid(), true);
        } else {
            this._startWithContributions(this.username);
        }
    }

    /** Main game loop */
    _startLoop() {
        const loop = (timestamp) => {
            const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // Cap at 50ms
            this.lastTime = timestamp;

            if (this.state === State.PLAYING) {
                this._update(dt);
            }

            this._render();
            requestAnimationFrame(loop);
        };

        requestAnimationFrame((timestamp) => {
            this.lastTime = timestamp;
            requestAnimationFrame(loop);
        });
    }

    /**
     * Update all game logic
     * @param {number} dt - Delta time in seconds
     */
    _update(dt) {
        // ── Paddle ──
        this.paddle.update(dt);

        // ── Balls ──
        for (const ball of this.balls) {
            if (!ball.active) {
                // Attached to paddle
                ball.attachTo(this.paddle);
                continue;
            }

            const result = ball.update(dt, this.canvas.width, this.canvas.height);

            if (result === 'bottom') {
                ball.active = false;

                // Remove this ball
                const activeBalls = this.balls.filter(b => b.active);

                if (activeBalls.length === 0) {
                    // All balls lost
                    this.lives--;
                    UI.updateLives(this.lives);
                    this.sound.ballLost();
                    this.combo = 0;
                    UI.showCombo(0);

                    if (this.lives <= 0) {
                        // Game over
                        this.state = State.GAME_OVER;
                        this.sound.gameOver();
                        UI.showGameOver(this.score, this.bricksDestroyedCount, this.maxCombo);
                        return;
                    }

                    // Reset to single ball on paddle
                    this.balls = [];
                    const newBall = this.createBall();
                    newBall.attachTo(this.paddle);
                    this.balls.push(newBall);
                }
            }

            // Ball ↔ Paddle
            if (ballPaddle(ball, this.paddle)) {
                this.sound.paddleHit();
            }

            // Ball ↔ Bricks
            const hitBrick = ballBricks(ball, this.bricks);
            if (hitBrick) {
                this._onBrickHit(hitBrick, ball);
            }
        }

        // Clean up inactive balls (but keep at least attached ones)
        this.balls = this.balls.filter(b => b.active || !this.balls.some(ob => ob.active));

        // ── Lasers ↔ Bricks ──
        const laserHits = laserBricks(this.paddle.lasers, this.bricks);
        for (const { brick } of laserHits) {
            this._onBrickHit(brick, null);
        }

        // ── Power-ups ──
        this.powerUps.update(dt, this.canvas.height, this);

        // Check power-up collection
        for (const powerup of this.powerUps.falling) {
            if (powerup.active && powerupPaddle(powerup, this.paddle)) {
                powerup.active = false;
                this.powerUps.activate(powerup, this);
                this.sound.powerUp();
                this.particles.emitSparkle(
                    powerup.x + powerup.size / 2,
                    powerup.y + powerup.size / 2,
                    powerup.type.color
                );
            }
        }

        // ── Bricks ──
        for (const brick of this.bricks) {
            brick.update(dt);
        }

        // ── Particles ──
        this.particles.update(dt);

        // ── Combo timer ──
        if (this.combo > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                UI.showCombo(0);
            }
        }

        // ── Screen shake ──
        if (this.shakeIntensity > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= 0.9;
            if (this.shakeIntensity < 0.5) {
                this.shakeIntensity = 0;
                this.shakeX = 0;
                this.shakeY = 0;
            }
        }

        // ── Win check ──
        const aliveBricks = this.bricks.filter(b => b.alive).length;
        if (aliveBricks === 0 && this.totalBricks > 0) {
            this.state = State.WIN;
            this.sound.win();
            const elapsed = (performance.now() - this.startTime) / 1000;
            UI.showWin(this.score, elapsed);
            this.confettiTimer = 3;
        }

        // ── Win confetti ──
        if (this.state === State.WIN && this.confettiTimer > 0) {
            this.confettiTimer -= dt;
            if (Math.random() > 0.7) {
                this.particles.emitConfetti(this.canvas.width, this.canvas.height);
            }
        }
    }

    /**
     * Handle brick being hit
     * @param {import('./brick.js').Brick} brick
     * @param {Ball|null} ball
     */
    _onBrickHit(brick, ball) {
        const destroyed = brick.hit();

        // Combo
        this.combo++;
        this.comboTimer = 1.5; // Reset combo timer
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        UI.showCombo(this.combo);

        // Score: base 10 × HP × combo multiplier
        const points = 10 * (brick.maxHp) * Math.min(this.combo, 10);
        this.score += points;
        UI.updateScore(this.score);

        if (destroyed) {
            // Brick fully destroyed
            this.bricksDestroyedCount++;
            this.sound.brickHit(true, brick.maxHp);

            // Particles
            this.particles.emitBrickBreak(
                brick.centerX, brick.centerY,
                brick.colors.fill,
                8 + brick.maxHp * 3
            );

            // Screen shake (stronger for higher HP bricks)
            this.shakeIntensity = Math.max(this.shakeIntensity, 3 + brick.maxHp * 2);

            // Power-up chance
            this.powerUps.trySpawn(brick);

            // Notify ball
            if (ball) ball.onBrickDestroyed();

            // Combo sound
            if (this.combo > 1) {
                this.sound.comboHit(this.combo);
            }
        } else {
            // Brick damaged but alive
            this.sound.brickHit(false, brick.hp);
            this.particles.emitBrickHit(
                brick.centerX, brick.centerY,
                brick.colors.fill
            );
            this.shakeIntensity = Math.max(this.shakeIntensity, 2);
        }
    }

    /** Render everything */
    _render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = '#0d1230';
        ctx.fillRect(0, 0, w, h);

        // Subtle grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        const gridSize = 30;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        if (this.state === State.MENU || this.state === State.LOADING) {
            return; // Don't render game objects on menu
        }

        // Apply screen shake
        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        // ── Bricks ──
        for (const brick of this.bricks) {
            brick.render(ctx);
        }

        // ── Paddle ──
        if (this.paddle) {
            this.paddle.render(ctx);
        }

        // ── Balls ──
        for (const ball of this.balls) {
            ball.render(ctx);
        }

        // ── Power-ups ──
        this.powerUps.render(ctx, w);

        // ── Particles ──
        this.particles.render(ctx);

        ctx.restore(); // Remove shake transform

        // ── Active power-up indicators at bottom ──
        this._renderPowerUpTimers(ctx, w, h);

        // ── "Click to launch" text ──
        if (this.state === State.PLAYING) {
            const hasUnlaunched = this.balls.some(b => !b.active);
            if (hasUnlaunched) {
                ctx.save();
                ctx.font = '14px Inter';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.textAlign = 'center';
                const pulse = Math.sin(performance.now() / 500) * 0.3 + 0.7;
                ctx.globalAlpha = pulse;
                ctx.fillText('Click or press Space to launch', w / 2, h - 70);
                ctx.restore();
            }
        }
    }

    /** Render active power-up timer bars */
    _renderPowerUpTimers(ctx, w, h) {
        let i = 0;
        for (const [effect, time] of this.powerUps.activeEffects) {
            const type = Object.values(
                { MULTIBALL: { id: 'multiball', color: '#ff4444', label: '⊕', duration: 0 },
                  WIDE_PADDLE: { id: 'wide', color: '#fbbf24', label: '⬌', duration: 8 },
                  LASER: { id: 'laser', color: '#ff0066', label: '⚡', duration: 6 },
                  SLOW_BALL: { id: 'slow', color: '#00d4ff', label: '◎', duration: 6 } }
            ).find(t => t.id === effect);

            if (!type || type.duration === 0) continue;

            const barW = 80;
            const barH = 6;
            const x = w - barW - 12;
            const y = h - 20 - i * 14;
            const progress = time / type.duration;

            ctx.save();
            // Background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(x, y, barW, barH);
            // Progress
            ctx.fillStyle = type.color;
            ctx.shadowColor = type.color;
            ctx.shadowBlur = 6;
            ctx.fillRect(x, y, barW * progress, barH);
            // Label
            ctx.font = '10px JetBrains Mono';
            ctx.fillStyle = type.color;
            ctx.textAlign = 'right';
            ctx.shadowBlur = 0;
            ctx.fillText(type.label, x - 4, y + barH);
            ctx.restore();

            i++;
        }
    }
}

// ── Boot ──
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
