export function simulate(grids, options = {}) {
    let {
        height = 140, 
        framesPerLevel = 2500, // Increased to account for slow speed
        fps = 30,
    } = options;

    const dt = 1 / fps;
    const cols = grids[0]?.[0]?.length || 52;
    const rows = 7;

    const brickW = 5;
    const brickGap = 1.5;
    const topPaddingBase = 15; 
    const ballR = 1.5;

    const sidePadding = 20; 
    const gridWidth = cols * brickW + (cols - 1) * brickGap;
    const gridHeight = rows * brickW + (rows - 1) * brickGap;
    const width = gridWidth + (sidePadding * 2);
    const startX = sidePadding;

    const levelSequence = [0];

    const frames = [];
    const finalBricks = []; 
    let totalScore = 0;

    let ballX = width / 2;
    let ballY = height - 40;
    let paddleW = 30; 
    const paddleH = 4;
    const paddleY = height - 10; 
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
        
        // Drastically reduced speed
        let baseSpeed = 50; 
        let speed = baseSpeed;
        let angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        let ballDx = Math.cos(angle) * speed;
        let ballDy = Math.sin(angle) * speed;

        const maxFrames = 6000; // Allows plenty of time for the slow ball to clear the board

        for (let frame = 0; frame < maxFrames; frame++) {
            let frameBounced = false; 
            
            // Escalating damage so heavy bricks eventually break
            let damage = 1;
            if (frame > 2000) damage = 2;
            if (frame > 3000) damage = 4;
            if (frame > 4000) damage = 100;

            if (frame > 2500) speed = baseSpeed * 1.5;
            if (frame > 4000) speed = baseSpeed * 2.5;

            const steps = Math.ceil(speed * dt / (brickW * 0.5));
            const subDt = dt / steps;

            for (let s = 0; s < steps; s++) {
                ballX += ballDx * subDt;
                ballY += ballDy * subDt;

                const targetPaddleX = ballX - paddleW / 2;
                const waveWander = Math.sin(frame * 0.1) * (paddleW * 0.3);
                paddleX += (targetPaddleX + waveWander - paddleX) * 0.15;
                paddleX = Math.max(0, Math.min(width - paddleW, paddleX));

                if (ballX - ballR <= 0) { ballX = ballR; ballDx = Math.abs(ballDx); frameBounced = true; }
                if (ballX + ballR >= width) { ballX = width - ballR; ballDx = -Math.abs(ballDx); frameBounced = true; }
                if (ballY - ballR <= 0) { ballY = ballR; ballDy = Math.abs(ballDy); frameBounced = true; }

                if (ballY + ballR >= paddleY) {
                    ballY = paddleY - ballR - 1;
                    const hitPos = (ballX - paddleX) / paddleW;
                    const reflectAngle = -Math.PI / 2 + (hitPos - 0.5) * 2 * (Math.PI / 3);
                    ballDx = Math.cos(reflectAngle) * speed;
                    ballDy = -Math.abs(Math.sin(reflectAngle) * speed);
                    frameBounced = true;
                }

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
                            brick.deathFrame = frames.length; 
                            bricksDestroyed++;
                        }
                        break; 
                    }
                }
            }

            frames.push({
                frameIndex: frames.length,
                isBallBounce: frameBounced, 
                ballX: Math.round(ballX * 10) / 10,
                ballY: Math.round(ballY * 10) / 10,
                paddleX: Math.round(paddleX * 10) / 10,
                paddleW
            });

            if (bricksDestroyed >= totalBricks) {
                break;
            }
        }
        
        finalBricks.push(...bricks);
    }

    return {
        frames, finalBricks, levelSequence, finalScore: totalScore,
        brickLayout: { width, height, rows, cols, brickW, brickH: brickW, brickGap, topPaddingBase, startX, gridWidth, gridHeight },
    };
}