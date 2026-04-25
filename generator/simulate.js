/**
 * Simulate — Frame-by-frame deterministic game simulation
 * Used to generate SVG animation frames
 *
 * @module simulate
 */

/**
 * @typedef {Object} SimFrame
 * @property {number} ballX
 * @property {number} ballY
 * @property {number} paddleX
 * @property {number} paddleW
 * @property {number} score
 * @property {Array<{row: number, col: number, hp: number}>} brickChanges - Bricks that changed this frame
 */

/**
 * Run a deterministic game simulation
 *
 * @param {number[][]} grid - 7×N HP grid
 * @param {object} options
 * @param {number} [options.width=800] - Canvas width
 * @param {number} [options.height=500] - Canvas height
 * @param {number} [options.totalFrames=300] - Number of frames
 * @param {number} [options.fps=30] - Frames per second (for dt calculation)
 * @returns {object} { frames: SimFrame[], brickStates: Map, finalScore: number }
 */
export function simulate(grid, options = {}) {
    const {
        width = 800,
        height = 500,
        totalFrames = 300,
        fps = 30,
    } = options;

    const dt = 1 / fps;

    // ── Build bricks ──
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const brickGap = 2;
    const gridPadding = 15;
    const topPadding = 50;
    const availableWidth = width - gridPadding * 2;
    const availableHeight = height * 0.40;
    const brickW = (availableWidth - (cols - 1) * brickGap) / cols;
    const brickH = (availableHeight - (rows - 1) * brickGap) / rows;

    const bricks = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const hp = grid[r][c];
            if (hp > 0) {
                bricks.push({
                    row: r,
                    col: c,
                    x: gridPadding + c * (brickW + brickGap),
                    y: topPadding + r * (brickH + brickGap),
                    w: brickW,
                    h: brickH,
                    hp,
                    maxHp: hp,
                    alive: true,
                });
            }
        }
    }

    // ── Ball ──
    const ballR = 5;
    let ballX = width / 2;
    let ballY = height - 50;
    const baseSpeed = 320;
    let speed = baseSpeed;
    let angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    let ballDx = Math.cos(angle) * speed;
    let ballDy = Math.sin(angle) * speed;

    // ── Paddle ──
    let paddleW = 90;
    const paddleH = 12;
    let paddleX = (width - paddleW) / 2;
    const paddleY = height - 35;

    let score = 0;

    const frames = [];

    // ── Simulation loop ──
    for (let frame = 0; frame < totalFrames; frame++) {
        const brickChanges = [];

        // — AI paddle: follow ball with slight lag —
        const targetX = ballX - paddleW / 2;
        paddleX += (targetX - paddleX) * 0.08;
        paddleX = Math.max(0, Math.min(width - paddleW, paddleX));

        // — Move ball —
        ballX += ballDx * dt;
        ballY += ballDy * dt;

        // — Wall collisions —
        if (ballX - ballR <= 0) {
            ballX = ballR;
            ballDx = Math.abs(ballDx);
        }
        if (ballX + ballR >= width) {
            ballX = width - ballR;
            ballDx = -Math.abs(ballDx);
        }
        if (ballY - ballR <= 0) {
            ballY = ballR;
            ballDy = Math.abs(ballDy);
        }

        // — Paddle collision —
        if (
            ballDy > 0 &&
            ballY + ballR >= paddleY &&
            ballY - ballR <= paddleY + paddleH &&
            ballX >= paddleX &&
            ballX <= paddleX + paddleW
        ) {
            const hitPos = (ballX - paddleX) / paddleW;
            const reflectAngle = -Math.PI / 2 + (hitPos - 0.5) * 2 * (Math.PI / 3);
            ballDx = Math.cos(reflectAngle) * speed;
            ballDy = Math.sin(reflectAngle) * speed;
            ballY = paddleY - ballR - 1;
        }

        // — Bottom reset (AI doesn't miss often, but just in case) —
        if (ballY + ballR > height) {
            ballY = height - 50;
            ballX = width / 2;
            angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
            ballDx = Math.cos(angle) * speed;
            ballDy = Math.sin(angle) * speed;
        }

        // — Brick collisions —
        for (const brick of bricks) {
            if (!brick.alive) continue;

            if (
                ballX + ballR > brick.x &&
                ballX - ballR < brick.x + brick.w &&
                ballY + ballR > brick.y &&
                ballY - ballR < brick.y + brick.h
            ) {
                // Determine side
                const overlapLeft = (ballX + ballR) - brick.x;
                const overlapRight = (brick.x + brick.w) - (ballX - ballR);
                const overlapTop = (ballY + ballR) - brick.y;
                const overlapBottom = (brick.y + brick.h) - (ballY - ballR);
                const minX = Math.min(overlapLeft, overlapRight);
                const minY = Math.min(overlapTop, overlapBottom);

                if (minX < minY) {
                    ballDx = -ballDx;
                } else {
                    ballDy = -ballDy;
                }

                brick.hp--;
                score += 10 * brick.maxHp;

                if (brick.hp <= 0) {
                    brick.alive = false;
                }

                brickChanges.push({
                    row: brick.row,
                    col: brick.col,
                    hp: brick.hp,
                });

                // Speed up slightly
                speed = Math.min(baseSpeed * 1.5, speed + 0.3);
                const mag = Math.sqrt(ballDx * ballDx + ballDy * ballDy);
                ballDx = (ballDx / mag) * speed;
                ballDy = (ballDy / mag) * speed;

                break; // One collision per frame
            }
        }

        frames.push({
            ballX: Math.round(ballX * 10) / 10,
            ballY: Math.round(ballY * 10) / 10,
            paddleX: Math.round(paddleX * 10) / 10,
            paddleW,
            score,
            brickChanges,
        });
    }

    // Build final brick state map
    const brickStates = new Map();
    for (const brick of bricks) {
        brickStates.set(`${brick.row}-${brick.col}`, {
            ...brick,
            alive: brick.alive,
            hp: brick.hp,
        });
    }

    return {
        frames,
        brickStates,
        finalScore: score,
        brickLayout: { rows, cols, brickW, brickH, brickGap, gridPadding, topPadding },
    };
}
