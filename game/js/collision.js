/**
 * Collision — Optimized with spatial partitioning
 * @module collision
 */

import { nearbyBricks } from './grid.js';

/**
 * Ball ↔ Paddle collision with angle reflection
 * @param {import('./ball.js').Ball} ball
 * @param {import('./paddle.js').Paddle} paddle
 * @returns {boolean}
 */
export function ballPaddle(ball, paddle) {
    if (!ball.active) return false;

    if (
        ball.x + ball.radius < paddle.x ||
        ball.x - ball.radius > paddle.x + paddle.width ||
        ball.y + ball.radius < paddle.y ||
        ball.y - ball.radius > paddle.y + paddle.height
    ) return false;

    // Normal gravity: ball goes down → bounce up
    // Inverted gravity: ball goes up → bounce down
    const goingTowardPaddle = paddle.gravityDir > 0 ? ball.dy > 0 : ball.dy < 0;
    if (!goingTowardPaddle) return false;

    const hitPos = (ball.x - paddle.x) / paddle.width;
    const clamped = Math.max(0, Math.min(1, hitPos));
    const maxAngle = Math.PI / 3;

    let angle;
    if (paddle.gravityDir > 0) {
        angle = -Math.PI / 2 + (clamped - 0.5) * 2 * maxAngle;
    } else {
        angle = Math.PI / 2 + (clamped - 0.5) * 2 * maxAngle;
    }

    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    ball.dx = Math.cos(angle) * speed;
    ball.dy = Math.sin(angle) * speed;

    // Push out
    ball.y = paddle.gravityDir > 0
        ? paddle.y - ball.radius - 1
        : paddle.y + paddle.height + ball.radius + 1;

    ball.hitFlash = 0.1;
    paddle.flash();
    return true;
}

/**
 * Ball ↔ Bricks collision — SPATIALLY OPTIMIZED
 * Only checks nearby bricks (3×3 grid neighborhood)
 * @param {import('./ball.js').Ball} ball
 * @param {object} gridInfo
 * @param {import('./brick.js').Brick[][]} spatialGrid
 * @returns {import('./brick.js').Brick|null}
 */
export function ballBricksSpatial(ball, gridInfo, spatialGrid) {
    if (!ball.active) return null;

    const nearby = nearbyBricks(ball.x, ball.y, ball.radius, gridInfo, spatialGrid);

    for (const brick of nearby) {
        if (
            ball.x + ball.radius < brick.x ||
            ball.x - ball.radius > brick.x + brick.width ||
            ball.y + ball.radius < brick.y ||
            ball.y - ball.radius > brick.y + brick.height
        ) continue;

        // Side detection
        const overlapLeft = (ball.x + ball.radius) - brick.x;
        const overlapRight = (brick.x + brick.width) - (ball.x - ball.radius);
        const overlapTop = (ball.y + ball.radius) - brick.y;
        const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);
        const minX = Math.min(overlapLeft, overlapRight);
        const minY = Math.min(overlapTop, overlapBottom);

        if (minX < minY) {
            ball.dx = -ball.dx;
            ball.x += overlapLeft < overlapRight ? -minX : minX;
        } else {
            ball.dy = -ball.dy;
            ball.y += overlapTop < overlapBottom ? -minY : minY;
        }

        ball.hitFlash = 0.08;
        return brick;
    }

    return null;
}

/**
 * Laser ↔ Bricks collision — spatially optimized
 * @param {Array} lasers
 * @param {object} gridInfo
 * @param {import('./brick.js').Brick[][]} spatialGrid
 * @returns {Array<{laser: object, brick: import('./brick.js').Brick}>}
 */
export function laserBricksSpatial(lasers, gridInfo, spatialGrid) {
    const hits = [];
    const { startX, startY, brickWidth, brickHeight, brickGap, rows, cols } = gridInfo;
    const cellW = brickWidth + brickGap;
    const cellH = brickHeight + brickGap;

    for (const laser of lasers) {
        if (!laser.active) continue;

        const col = Math.floor((laser.x - startX) / cellW);
        const row = Math.floor((laser.y - startY) / cellH);

        if (row >= 0 && row < rows && col >= 0 && col < cols) {
            const brick = spatialGrid[row]?.[col];
            if (brick?.alive) {
                laser.active = false;
                hits.push({ laser, brick });
            }
        }
    }

    return hits;
}

/**
 * PowerUp ↔ Paddle
 * @param {import('./powerups.js').PowerUp} powerup
 * @param {import('./paddle.js').Paddle} paddle
 * @returns {boolean}
 */
export function powerupPaddle(powerup, paddle) {
    return (
        powerup.x + powerup.size > paddle.x &&
        powerup.x < paddle.x + paddle.width &&
        powerup.y + powerup.size > paddle.y &&
        powerup.y < paddle.y + paddle.height
    );
}
