/**
 * Collision — All collision detection logic
 * @module collision
 */

/**
 * Check ball ↔ paddle collision
 * @param {import('./ball.js').Ball} ball
 * @param {import('./paddle.js').Paddle} paddle
 * @returns {boolean} true if collision occurred
 */
export function ballPaddle(ball, paddle) {
    if (!ball.active) return false;

    // Simple AABB check first
    if (
        ball.x + ball.radius < paddle.x ||
        ball.x - ball.radius > paddle.x + paddle.width ||
        ball.y + ball.radius < paddle.y ||
        ball.y - ball.radius > paddle.y + paddle.height
    ) {
        return false;
    }

    // Only bounce if ball is moving downward
    if (ball.dy <= 0) return false;

    // Calculate hit position (0 = left edge, 1 = right edge)
    const hitPosition = (ball.x - paddle.x) / paddle.width;
    const clampedHit = Math.max(0, Math.min(1, hitPosition));

    // Map hit position to angle (-60° to -120°, i.e., upper-left to upper-right)
    const maxAngle = Math.PI / 3; // 60 degrees from vertical
    const angle = -Math.PI / 2 + (clampedHit - 0.5) * 2 * maxAngle;

    // Set new velocity
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    ball.dx = Math.cos(angle) * speed;
    ball.dy = Math.sin(angle) * speed;

    // Ensure ball is above paddle (prevent sticking)
    ball.y = paddle.y - ball.radius - 1;

    // Visual feedback
    ball.hitFlash = 0.15;
    paddle.flash();

    return true;
}

/**
 * Check ball ↔ bricks collision
 * @param {import('./ball.js').Ball} ball
 * @param {import('./brick.js').Brick[]} bricks
 * @returns {import('./brick.js').Brick|null} The brick that was hit, or null
 */
export function ballBricks(ball, bricks) {
    if (!ball.active) return null;

    for (const brick of bricks) {
        if (!brick.alive) continue;

        // AABB broadphase
        if (
            ball.x + ball.radius < brick.x ||
            ball.x - ball.radius > brick.x + brick.width ||
            ball.y + ball.radius < brick.y ||
            ball.y - ball.radius > brick.y + brick.height
        ) {
            continue;
        }

        // Determine which side was hit
        const overlapLeft = (ball.x + ball.radius) - brick.x;
        const overlapRight = (brick.x + brick.width) - (ball.x - ball.radius);
        const overlapTop = (ball.y + ball.radius) - brick.y;
        const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);

        // Find minimum overlap to determine collision side
        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
            // Horizontal collision
            ball.dx = -ball.dx;
            if (overlapLeft < overlapRight) {
                ball.x = brick.x - ball.radius;
            } else {
                ball.x = brick.x + brick.width + ball.radius;
            }
        } else {
            // Vertical collision
            ball.dy = -ball.dy;
            if (overlapTop < overlapBottom) {
                ball.y = brick.y - ball.radius;
            } else {
                ball.y = brick.y + brick.height + ball.radius;
            }
        }

        ball.hitFlash = 0.1;
        return brick;
    }

    return null;
}

/**
 * Check laser ↔ bricks collision
 * @param {Array} lasers - Array of laser objects {x, y, active}
 * @param {import('./brick.js').Brick[]} bricks
 * @returns {Array<{laser: object, brick: import('./brick.js').Brick}>} Array of hits
 */
export function laserBricks(lasers, bricks) {
    const hits = [];

    for (const laser of lasers) {
        if (!laser.active) continue;

        for (const brick of bricks) {
            if (!brick.alive) continue;

            if (
                laser.x >= brick.x &&
                laser.x <= brick.x + brick.width &&
                laser.y >= brick.y &&
                laser.y <= brick.y + brick.height
            ) {
                laser.active = false;
                hits.push({ laser, brick });
                break;
            }
        }
    }

    return hits;
}

/**
 * Check powerup ↔ paddle collision
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
