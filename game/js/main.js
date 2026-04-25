/**
 * Main — Game loop with anti-gravity, spatial collisions, slow-mo
 * @module main
 */

import { Ball } from './ball.js';
import { Paddle } from './paddle.js';
import { generateGrid, generateDemoGrid, brickAtPosition } from './grid.js';
import { ballPaddle, ballBricksSpatial, laserBricksSpatial, powerupPaddle } from './collision.js';
import { PowerUpManager } from './powerups.js';
import { ParticleSystem } from './particles.js';
import { SoundEngine } from './sound.js';
import { fetchContributions } from './contributions.js';
import * as UI from './ui.js';

const State = { MENU: 0, LOADING: 1, PLAYING: 2, PAUSED: 3, GAME_OVER: 4, WIN: 5 };

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this._resize();
        window.addEventListener('resize', () => this._resize());

        this.state = State.MENU;
        this.username = 'anoojshete';

        /** @type {Ball[]} */
        this.balls = [];
        this.paddle = null;
        /** @type {import('./brick.js').Brick[]} */
        this.bricks = [];
        this.spatialGrid = [];
        this.gridInfo = {};

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
        this.streakCombo = 0; // Consecutive bricks without miss

        // Screen shake
        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;

        // --- Anti-Gravity ---
        this.gravityDir = 1; // 1 = normal (paddle bottom), -1 = inverted (paddle top)
        this.baseGravity = 50; // Subtle gravity pull
        this.gravityLocked = false; // Prevent spam

        // --- Slow-mo on last life ---
        this.slowMoActive = false;
        this.slowMoFactor = 1;

        // Timing
        this.lastTime = 0;
        this.gameTime = 0; // Global time for animations

        // FPS cap
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        this.accumulator = 0;

        // Win confetti
        this.confettiTimer = 0;

        // Tooltip
        this._hoveredBrick = null;
        this._setupTooltip();

        UI.initUI();
        this._bindEvents();
        this._startLoop();
    }

    _resize() {
        const maxW = 1100;
        const w = Math.min(window.innerWidth - 48, maxW);
        const h = Math.min(window.innerHeight - 160, w * 0.55);
        this.canvas.width = w;
        this.canvas.height = h;
        if (this.paddle) {
            this.paddle.canvasWidth = w;
            this.paddle.canvasHeight = h;
        }
    }

    _setupTooltip() {
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.state !== State.PLAYING || !this.gridInfo.rows) return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            const brick = brickAtPosition(mx, my, this.gridInfo, this.spatialGrid);

            // Reset previous hover
            if (this._hoveredBrick && this._hoveredBrick !== brick) {
                this._hoveredBrick.isHovered = false;
            }

            if (brick) {
                brick.isHovered = true;
                this._hoveredBrick = brick;
                UI.showBrickTooltip(brick, rect, scaleX, scaleY);
            } else {
                this._hoveredBrick = null;
                UI.hideBrickTooltip();
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            if (this._hoveredBrick) {
                this._hoveredBrick.isHovered = false;
                this._hoveredBrick = null;
            }
            UI.hideBrickTooltip();
        });
    }

    _bindEvents() {
        document.getElementById('play-btn')?.addEventListener('click', () => {
            this.sound.init();
            this.username = UI.getUsername();
            this._startWithContributions(this.username);
        });

        document.getElementById('demo-btn')?.addEventListener('click', () => {
            this.sound.init();
            this.username = 'demo';
            this._startGame(generateDemoGrid(), true);
        });

        document.getElementById('restart-btn')?.addEventListener('click', () => this._restartGame());
        document.getElementById('win-restart-btn')?.addEventListener('click', () => this._restartGame());
        document.getElementById('resume-btn')?.addEventListener('click', () => {
            this.state = State.PLAYING;
            UI.hideAllScreens();
            UI.setStatus('running');
        });

        document.getElementById('sound-toggle')?.addEventListener('click', () => {
            this.sound.init();
            UI.updateSoundButton(this.sound.toggleMute());
        });

        document.addEventListener('keydown', (e) => {
            // Pause
            if (e.key === 'Escape') {
                if (this.state === State.PLAYING) {
                    this.state = State.PAUSED;
                    UI.showScreen('pause-screen');
                    UI.setStatus('paused');
                } else if (this.state === State.PAUSED) {
                    this.state = State.PLAYING;
                    UI.hideAllScreens();
                    UI.setStatus('running');
                }
            }

            // Launch
            if ((e.key === ' ' || e.code === 'Space') && this.state === State.PLAYING) {
                e.preventDefault();
                this._tryLaunch();
            }

            // Gravity flip (G key)
            if ((e.key === 'g' || e.key === 'G') && this.state === State.PLAYING) {
                if (!this.gravityLocked) {
                    this.flipGravity();
                    this.gravityLocked = true;
                    setTimeout(() => { this.gravityLocked = false; }, 600);
                }
            }
        });

        this.canvas.addEventListener('click', () => {
            if (this.state === State.PLAYING) this._tryLaunch();
        });

        document.getElementById('username-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('play-btn')?.click();
        });
    }

    /** Flip gravity direction */
    flipGravity() {
        this.gravityDir *= -1;
        this.paddle.gravityDir = this.gravityDir;

        // Reposition paddle
        for (const ball of this.balls) {
            if (!ball.active) ball.attachTo(this.paddle, this.gravityDir);
            ball.gravity = this.baseGravity;
        }

        // Visual + audio feedback
        this.sound.gravityFlip();
        UI.updateGravity(this.gravityDir);
        UI.triggerGravityFlip(this.gravityDir < 0);

        // Particles — burst at paddle
        this.particles.emitSparkle(
            this.paddle.x + this.paddle.width / 2,
            this.paddle.y + this.paddle.height / 2,
            this.gravityDir > 0 ? '#00ff88' : '#00ffd5'
        );

        // Shift particle gravity direction
        this.shakeIntensity = Math.max(this.shakeIntensity, 6);
    }

    _tryLaunch() {
        const unlaunched = this.balls.find(b => !b.active);
        if (unlaunched) {
            unlaunched.launch(this.gravityDir);
            this.sound.launch();
        }
    }

    async _startWithContributions(username) {
        this.state = State.LOADING;
        UI.showLoading();
        UI.setStatus('fetching...');

        try {
            const { grid, totalContributions } = await fetchContributions(username);
            console.log(`Loaded ${totalContributions} contributions`);
            this._startGame(grid, true);
        } catch (err) {
            console.warn('API failed, using demo:', err.message);
            this._startGame(generateDemoGrid(), true);
        }
    }

    _startGame(gridData, isHpData = false) {
        this.state = State.PLAYING;
        UI.setStatus('running');

        // Reset
        this.score = 0;
        this.lives = 3;
        this.combo = 0;
        this.maxCombo = 0;
        this.bricksDestroyedCount = 0;
        this.startTime = performance.now();
        this.comboTimer = 0;
        this.streakCombo = 0;
        this.gravityDir = 1;
        this.slowMoActive = false;
        this.slowMoFactor = 1;
        this.shakeIntensity = 0;
        this.confettiTimer = 0;

        // Paddle
        this.paddle = new Paddle(this.canvas.width, this.canvas.height);
        this.paddle.gravityDir = 1;

        // Ball
        this.balls = [];
        const ball = this.createBall();
        ball.gravity = this.baseGravity;
        ball.attachTo(this.paddle, this.gravityDir);
        this.balls.push(ball);

        // Bricks — with spatial grid
        const result = generateGrid(gridData, this.canvas.width, this.canvas.height, {
            isHpData,
            topPadding: 50,
        });
        this.bricks = result.bricks;
        this.spatialGrid = result.spatialGrid;
        this.gridInfo = result.gridInfo;
        this.totalBricks = this.bricks.length;

        // Reset systems
        this.powerUps.reset();
        this.particles.reset();

        // UI
        UI.hideAllScreens();
        UI.updateScore(0);
        UI.updateLives(this.lives);
        UI.updateUsername(this.username);
        UI.updateGravity(1);
    }

    createBall() {
        return new Ball(this.canvas.width / 2, this.canvas.height - 50, 5);
    }

    _restartGame() {
        if (this.username === 'demo') {
            this._startGame(generateDemoGrid(), true);
        } else {
            this._startWithContributions(this.username);
        }
    }

    // ── Game Loop (FPS capped) ──
    _startLoop() {
        const loop = (timestamp) => {
            const rawDt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
            this.lastTime = timestamp;

            if (this.state === State.PLAYING) {
                const dt = rawDt * this.slowMoFactor;
                this.gameTime += dt;
                this._update(dt);
            }

            this._render();
            requestAnimationFrame(loop);
        };

        requestAnimationFrame((t) => {
            this.lastTime = t;
            requestAnimationFrame(loop);
        });
    }

    _update(dt) {
        // Slow-mo on last life
        if (this.lives === 1 && !this.slowMoActive) {
            this.slowMoActive = true;
            this.slowMoFactor = 0.75;
            for (const b of this.balls) b.slowMo = 0.8;
        } else if (this.lives > 1 && this.slowMoActive) {
            this.slowMoActive = false;
            this.slowMoFactor = 1;
            for (const b of this.balls) b.slowMo = 1;
        }

        // ── Grid Descending Logic (Soft Floor + Pressure Zone) ──
        const dropSpeedBase = Math.min(25, 3 + this.bricksDestroyedCount * 0.1);
        let closestDist = 9999;
        let dangerCount = 0;

        for (const brick of this.bricks) {
            if (!brick.alive) continue;
            const dist = this.gravityDir > 0 
                ? this.paddle.y - (brick.y + brick.height)
                : brick.y - (this.paddle.y + this.paddle.height);
                
            if (dist < closestDist) closestDist = dist;
            if (dist < 30) dangerCount++;
        }

        let actualSpeed = dropSpeedBase;
        // Soft Floor: slow down when getting close to paddle
        if (closestDist < 120) {
            actualSpeed *= Math.max(0.05, (closestDist - 10) / 110);
        }

        const dy = actualSpeed * this.gravityDir * dt;
        if (dy !== 0) {
            this.gridInfo.startY += dy;
            for (const brick of this.bricks) {
                brick.y += dy;
            }
        }

        // Pressure Zone: Game Over if stacked too much
        if (dangerCount > 15) {
            this.state = State.GAME_OVER;
            this.sound.gameOver();
            import('./ui.js').then(UI => {
                UI.showGameOver(this.score, this.bricksDestroyedCount, this.maxCombo);
            });
            return;
        }

        // ── Paddle ──
        this.paddle.update(dt);

        // ── Balls ──
        for (const ball of this.balls) {
            if (!ball.active) {
                ball.attachTo(this.paddle, this.gravityDir);
                continue;
            }

            const result = ball.update(dt, this.canvas.width, this.canvas.height, this.gravityDir);

            if (result === 'lost') {
                ball.active = false;
                const activeBalls = this.balls.filter(b => b.active);

                if (activeBalls.length === 0) {
                    this.lives--;
                    UI.updateLives(this.lives);
                    this.sound.ballLost();
                    this.combo = 0;
                    this.streakCombo = 0;
                    UI.showCombo(0);

                    if (this.lives <= 0) {
                        this.state = State.GAME_OVER;
                        this.sound.gameOver();
                        UI.showGameOver(this.score, this.bricksDestroyedCount, this.maxCombo);
                        return;
                    }

                    // Reset to single ball
                    this.balls = [];
                    const nb = this.createBall();
                    nb.gravity = this.baseGravity;
                    nb.attachTo(this.paddle, this.gravityDir);
                    this.balls.push(nb);
                }
            }

            // Ball ↔ Paddle
            if (ballPaddle(ball, this.paddle)) {
                this.sound.paddleHit();
            }

            // Ball ↔ Bricks (SPATIAL)
            const hitBrick = ballBricksSpatial(ball, this.gridInfo, this.spatialGrid);
            if (hitBrick) this._onBrickHit(hitBrick, ball);
        }

        // Clean inactive balls
        this.balls = this.balls.filter(b => b.active || !this.balls.some(ob => ob.active));

        // ── Lasers ↔ Bricks (SPATIAL) ──
        const laserHits = laserBricksSpatial(this.paddle.lasers, this.gridInfo, this.spatialGrid);
        for (const { brick } of laserHits) this._onBrickHit(brick, null);

        // ── Power-ups ──
        this.powerUps.update(dt, this.canvas.height, this);
        for (const pu of this.powerUps.falling) {
            if (pu.active && powerupPaddle(pu, this.paddle)) {
                pu.active = false;
                this.powerUps.activate(pu, this);
                this.sound.powerUp();
                this.particles.emitSparkle(pu.x + pu.size / 2, pu.y + pu.size / 2, pu.type.color);
            }
        }

        // ── Bricks ──
        for (const brick of this.bricks) brick.update(dt, this.gameTime);

        // ── Particles ──
        this.particles.update(dt);

        // ── Combo decay ──
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
            this.shakeIntensity *= 0.88;
            if (this.shakeIntensity < 0.3) {
                this.shakeIntensity = 0;
                this.shakeX = 0;
                this.shakeY = 0;
            }
        }

        // ── Win check ──
        const alive = this.bricks.filter(b => b.alive).length;
        if (alive === 0 && this.totalBricks > 0) {
            this.state = State.WIN;
            this.sound.win();
            UI.showWin(this.score, (performance.now() - this.startTime) / 1000);
            this.confettiTimer = 3;
        }

        // ── Win confetti ──
        if (this.state === State.WIN && this.confettiTimer > 0) {
            this.confettiTimer -= dt;
            if (Math.random() > 0.6) this.particles.emitConfetti(this.canvas.width, this.canvas.height);
        }
    }

    _onBrickHit(brick, ball) {
        const destroyed = brick.hit();

        // Combo
        this.combo++;
        this.streakCombo++;
        this.comboTimer = 1.5;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        UI.showCombo(this.combo);

        // Score: base × HP × combo × streak bonus
        const streakBonus = 1 + Math.floor(this.streakCombo / 20) * 0.5;
        const points = Math.round(10 * brick.maxHp * Math.min(this.combo, 10) * streakBonus);
        this.score += points;
        UI.updateScore(this.score);

        const speedMul = ball ? ball.speedMultiplier : 1;

        if (destroyed) {
            this.bricksDestroyedCount++;
            this.sound.brickHit(true, brick.maxHp, speedMul);
            this.particles.emitBrickBreak(brick.centerX, brick.centerY, brick.colors.fill, 6 + brick.maxHp * 2);
            this.shakeIntensity = Math.max(this.shakeIntensity, 2 + brick.maxHp * 1.5);
            this.powerUps.trySpawn(brick, this.gravityDir);
            if (ball) ball.onBrickDestroyed();
            if (this.combo > 1) this.sound.comboHit(this.combo);

            // Clear spatial grid cell
            if (this.spatialGrid[brick.gridRow]) {
                this.spatialGrid[brick.gridRow][brick.gridCol] = null;
            }
        } else {
            this.sound.brickHit(false, brick.hp, speedMul);
            this.particles.emitBrickHit(brick.centerX, brick.centerY, brick.colors.fill);
            this.shakeIntensity = Math.max(this.shakeIntensity, 1.5);
        }
    }

    _render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Background — pure dark
        ctx.fillStyle = '#080810';
        ctx.fillRect(0, 0, w, h);

        // Subtle dot grid (cheaper than line grid)
        ctx.fillStyle = 'rgba(255,255,255,0.025)';
        const gridStep = 24;
        for (let x = gridStep; x < w; x += gridStep) {
            for (let y = gridStep; y < h; y += gridStep) {
                ctx.fillRect(x, y, 1, 1);
            }
        }

        if (this.state === State.MENU || this.state === State.LOADING) return;

        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        // ── Bricks ──
        for (const brick of this.bricks) {
            brick.render(ctx, this.gameTime);
        }

        // ── Paddle ──
        if (this.paddle) this.paddle.render(ctx);

        // ── Balls ──
        for (const ball of this.balls) ball.render(ctx);

        // ── Power-ups ──
        this.powerUps.render(ctx, w);

        // ── Particles ──
        this.particles.render(ctx);

        ctx.restore();

        // ── Launch prompt ──
        if (this.state === State.PLAYING) {
            const hasUnlaunched = this.balls.some(b => !b.active);
            if (hasUnlaunched) {
                const pulse = Math.sin(this.gameTime * 4) * 0.2 + 0.5;
                ctx.globalAlpha = pulse;
                ctx.font = '11px JetBrains Mono';
                ctx.fillStyle = '#8b949e';
                ctx.textAlign = 'center';
                ctx.fillText('click or space to launch', w / 2, h / 2 + 40);
                ctx.globalAlpha = 1;
            }
        }

        // ── Slow-mo vignette on last life ──
        if (this.slowMoActive) {
            const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(255,0,50,0.08)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
        }

        // ── Gravity direction indicator (arrow at edge) ──
        if (this.state === State.PLAYING) {
            const arrowY = this.gravityDir > 0 ? h - 6 : 6;
            ctx.fillStyle = this.gravityDir > 0 ? 'rgba(0,255,136,0.15)' : 'rgba(0,255,213,0.15)';
            ctx.beginPath();
            ctx.moveTo(w / 2 - 8, arrowY);
            ctx.lineTo(w / 2, arrowY + (this.gravityDir > 0 ? 4 : -4));
            ctx.lineTo(w / 2 + 8, arrowY);
            ctx.fill();
        }
    }
}

// ── Boot ──
window.addEventListener('DOMContentLoaded', () => { new Game(); });
