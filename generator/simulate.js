export function simulate(grids, options = {}) {
    let {
        height = 170,
        framesPerLevel = 1200,
        fps = 30,
    } = options;

    const dt = 1 / fps;
    const cols = grids[0]?.[0]?.length || 52;
    const rows = 7;

    // 1. Force exact GitHub dimensions
    const brickW = 10;
    const brickGap = 3;
    const topPaddingBase = 25; 
    const ballR = 5;

    // 2. Calculate the EXACT width required (Map + side padding for the ball)
    const sidePadding = 24; // Ample room for the ball to slip past
    const gridWidth = cols * brickW + (cols - 1) * brickGap;
    const width = gridWidth + (sidePadding * 2);
    const startX = sidePadding;

    const levelSequence = [];
    for (let i = 0; i < grids.length; i++) levelSequence.push(i);
    for (let i = grids.length - 2; i > 0; i--) levelSequence.push(i);
    if (levelSequence.length === 0) levelSequence.push(0);

    const frames = [];
    let totalScore = 0;

    let ballX = width / 2;
    let ballY = height - 50;
    let paddleW = 80;
    const paddleH = 10;
    const paddleY = height - 25;
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
        const maxFrames = minFrames + 600; // Allow enough time without piercing mode

        for (let frame = 0; frame < maxFrames; frame++) {
            const brickChanges = [];
            let frameBounced = false; // TRACK FOR PERFECT SVG SMOOTHNESS

            // Speed ramps up natively to clear the board, NO PIERCING MODE allowed!
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

                        brick.hp -= 1;
                        totalScore += 10;
                        frameBounced = true;

                        if (brick.hp <= 0) {
                            brick.alive = false;
                            bricksDestroyed++;
                        }
                        brickChanges.push({ id: brick.id, hp: brick.hp });
                        break; // Important: only hit one brick per sub-step
                    }
                }
            }

            frames.push({
                frameIndex: frame,       // Exact frame time
                isBallBounce: frameBounced, // Flag to create a CSS keyframe
                activeLevel: seqIndex,
                gridIndex, 
                ballX: Math.round(ballX * 10) / 10,
                ballY: Math.round(ballY * 10) / 10,
                paddleX: Math.round(paddleX * 10) / 10,
                paddleW, score: totalScore, brickChanges,
                topPaddingOffset: topPadding - topPaddingBase
            });

            if (bricksDestroyed >= totalBricks) {
                ballDx *= 0.95; ballDy *= 0.95; speed *= 0.95;
                if (frame >= minFrames) break;
            }
        }
    }

    return {
        frames, levelSequence, finalScore: totalScore,
        brickLayout: { width, rows, cols, brickW, brickH: brickW, brickGap, topPaddingBase, startX },
    };
}