export function simulate(grids, options = {}) {
    let {
        height = 200, // Increased height for even more breathing room
        framesPerLevel = 1200,
        fps = 30,
    } = options;

    const dt = 1 / fps;
    const cols = grids[0]?.[0]?.length || 52;
    const rows = 7;

    // 1. Sleeker, smaller dimensions
    const brickW = 6;
    const brickGap = 2;
    const topPaddingBase = 20; 
    const ballR = 2.5;

    const sidePadding = 24; 
    const gridWidth = cols * brickW + (cols - 1) * brickGap;
    const width = gridWidth + (sidePadding * 2);
    const startX = sidePadding;

    const levelSequence = [];
    for (let i = 0; i < grids.length; i++) levelSequence.push(i);
    for (let i = grids.length - 2; i > 0; i--) levelSequence.push(i);
    if (levelSequence.length === 0) levelSequence.push(0);

    const frames = [];
    const finalBricks = []; 
    let totalScore = 0;

    let ballX = width / 2;
    let ballY = height - 50;
    let paddleW = 40; // Smaller, nimble paddle
    const paddleH = 5;
    const paddleY = height - 15; // Paddle pushed all the way down
    let paddleX = ballX - paddleW / 2;

    for (let seqIndex = 0; seqIndex < levelSequence.length; seqIndex++) {
        const gridIndex = levelSequence[seqIndex];
        const grid = grids[gridIndex];
        const bricks = [];
        let topPadding = topPaddingBase;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hp = grid[r][c] || 0;
                if (hp > 0) {
                    bricks.push({
                        id: `${seqIndex}-${r}-${c}`,
                        gridIndex, row: r, col: c,
                        x: startX + c * (brickW + brickGap),
                        y: topPadding + r * (brickW + brickGap),
                        w: brickW, h: brickW,
                        hp, maxHp: hp, alive: true,
                    });
                }
            }
        }

        const totalBricks = bricks.length;
        let bricksDestroyed = 0;
        let baseSpeed = 430;
        let speed = baseSpeed;
        let angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        let ballDx = Math.cos(angle) * speed;
        let ballDy = Math.sin(angle) * speed;

        const minFrames = Math.max(framesPerLevel, Math.ceil(totalBricks * 5));
        const maxFrames = minFrames + 600; 

        for (let frame = 0; frame < maxFrames; frame++) {
            let frameBounced = false; 
            
            // Damage scaling: Ensures heavy bricks DO break before the simulation ends
            let damage = 1;
            if (frame > minFrames * 0.3) damage = 2;
            if (frame > minFrames * 0.5) damage = 4;
            if (frame > minFrames * 0.7) damage = 100;

            if (frame > minFrames * 0.4) speed = baseSpeed * 1.5;
            if (frame > minFrames * 0.6) speed = baseSpeed * 2.5;
            if (frame > minFrames * 0.8) speed = baseSpeed * 4.0;

            const steps = Math.ceil(speed * dt / (brickW * 0.8));
            const subDt = dt / steps;

            for (let s = 0; s < steps; s++) {
                ballX += ballDx * subDt;
                ballY += ballDy * subDt;

                const targetPaddleX = ballX - paddleW / 2;
                const waveWander = Math.sin(frame * 0.22) * (paddleW * 0.5);
                paddleX += (targetPaddleX + waveWander - paddleX) * 0.22;
                paddleX = Math.max(0, Math.min(width - paddleW, paddleX));

                // Walls
                if (ballX - ballR <= 0) { ballX = ballR; ballDx = Math.abs(ballDx); frameBounced = true; }
                if (ballX + ballR >= width) { ballX = width - ballR; ballDx = -Math.abs(ballDx); frameBounced = true; }
                if (ballY - ballR <= 0) { ballY = ballR; ballDy = Math.abs(ballDy); frameBounced = true; }

                // Paddle
                if (ballY + ballR >= paddleY) {
                    ballY = paddleY - ballR - 1;
                    const hitPos = (ballX - paddleX) / paddleW;
                    const reflectAngle = -Math.PI / 2 + (hitPos - 0.5) * 2 * (Math.PI / 3);
                    ballDx = Math.cos(reflectAngle) * speed;
                    ballDy = -Math.abs(Math.sin(reflectAngle) * speed);
                    frameBounced = true;
                }

                // Bricks
                for (const brick of bricks) {
                    if (!brick.alive) continue;
                    if (
                        ballX + ballR > brick.x && ballX - ballR < brick.x + brick.w &&
                        ballY + ballR > brick.y && ballY - ballR < brick.y + brick.h
                    ) {
                        const overlapX = ballDx > 0 ? (ballX + ballR) - brick.x : (brick.x + brick.w) - (ballX - ballR);
                        const overlapY = ballDy > 0 ? (ballY + ballR) - brick.y : (brick.y + brick.h) - (ballY - ballR);
                        
                        if (overlapX < overlapY) {
                            ballDx *= -1;
                            ballX += (ballDx > 0 ? 1 : -1) * (overlapX + 0.1); 
                        } else {
                            ballDy *= -1;
                            ballY += (ballDy > 0 ? 1 : -1) * (overlapY + 0.1);
                        }

                        brick.hp -= damage;
                        totalScore += 10;
                        frameBounced = true;

                        if (brick.hp <= 0) {
                            brick.alive = false;
                            brick.deathFrame = frames.length; // Record EXACT frame of death
                            bricksDestroyed++;
                        }
                        break; 
                    }
                }
            }

            frames.push({
                frameIndex: frames.length,
                isBallBounce: frameBounced, 
                activeLevel: seqIndex,
                ballX: Math.round(ballX * 10) / 10,
                ballY: Math.round(ballY * 10) / 10,
                paddleX: Math.round(paddleX * 10) / 10,
                paddleW
            });

            if (bricksDestroyed >= totalBricks) {
                ballDx *= 0.95; ballDy *= 0.95; speed *= 0.95;
                if (frame >= minFrames) break;
            }
        }
        
        finalBricks.push(...bricks);
    }

    return {
        frames, finalBricks, levelSequence, finalScore: totalScore,
        brickLayout: { width, height, rows, cols, brickW, brickH: brickW, brickGap, topPaddingBase, startX },
    };
}