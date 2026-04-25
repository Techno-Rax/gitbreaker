export function simulate(grids, options = {}) {
    let {
        width = 800,
        height = 340,
        framesPerLevel = 200,
        fps = 30,
    } = options;

    const dt = 1 / fps;
    const brickW = 11;
    const brickH = 11;
    const brickGap = 2;
    const gridPadding = 16;
    const topPaddingBase = 15;

    // Ping-pong index sequence: 0, 1, 2, 3, 4, 3, 2, 1
    // (Assuming max 5 levels, if less, adjust)
    const levelSequence = [];
    for (let i = 0; i < grids.length; i++) levelSequence.push(i);
    for (let i = grids.length - 2; i > 0; i--) levelSequence.push(i);
    if (levelSequence.length === 0) levelSequence.push(0);

    const totalFrames = levelSequence.length * framesPerLevel;
    const frames = [];
    const allBrickEvents = []; 
    // We'll track events per level. allBrickEvents[lvlIndex] = [{row, col, hp}]

    let ballR = 5;
    let ballX = width / 2;
    let ballY = height - 50;
    let paddleW = 80;
    const paddleH = 10;
    const paddleY = height - 25;
    let paddleX = ballX - paddleW / 2;

    let totalScore = 0;
    
    // We also need to return layout info
    const cols = grids[0]?.[0]?.length || 52;
    const rows = 7;
    const totalWidth = cols * brickW + (cols - 1) * brickGap;
    const startX = (width - totalWidth) / 2;

    for (let seqIndex = 0; seqIndex < levelSequence.length; seqIndex++) {
        const gridIndex = levelSequence[seqIndex];
        const grid = grids[gridIndex];
        
        let topPadding = topPaddingBase;
        const bricks = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hp = grid[r][c] || 0;
                if (hp > 0) {
                    bricks.push({
                        id: `${seqIndex}-${r}-${c}`, // Unique per sequence so it can respawn
                        gridIndex,
                        row: r, col: c,
                        x: startX + c * (brickW + brickGap),
                        y: topPadding + r * (brickH + brickGap),
                        w: brickW, h: brickH,
                        hp, maxHp: hp, alive: true,
                    });
                }
            }
        }

        const totalBricks = bricks.length;
        let bricksDestroyed = 0;
        let baseSpeed = 500;
        let speed = baseSpeed;
        let angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        let ballDx = Math.cos(angle) * speed;
        let ballDy = Math.sin(angle) * speed;

        // Simulate one level
        for (let frame = 0; frame < framesPerLevel; frame++) {
            const brickChanges = [];

            if (bricksDestroyed < totalBricks) {
                const dropSpeedBase = 10 + (frame / framesPerLevel) * 30; 
                let closestDist = 9999;
                for (const brick of bricks) {
                    if (!brick.alive) continue;
                    const dist = paddleY - (brick.y + brick.h);
                    if (dist < closestDist) closestDist = dist;
                }

                let actualSpeed = dropSpeedBase;
                if (closestDist < 80) actualSpeed *= Math.max(0.01, (closestDist - 15) / 65); 
                
                const dy = actualSpeed * dt;
                topPadding += dy;
                for (const brick of bricks) { brick.y += dy; }
            }

            if (frame > framesPerLevel * 0.4) {
                speed *= 1.05; 
            }
            const piercingMode = frame > (framesPerLevel * 0.8) && bricksDestroyed < totalBricks;
            
            const steps = Math.ceil(speed * dt / (brickW * 0.8));
            const subDt = dt / steps;

            for (let s = 0; s < steps; s++) {
                ballX += ballDx * subDt;
                ballY += ballDy * subDt;

                paddleX = ballX - paddleW / 2;
                paddleX = Math.max(0, Math.min(width - paddleW, paddleX));

                if (ballX - ballR <= 0) { ballX = ballR; ballDx = Math.abs(ballDx); }
                if (ballX + ballR >= width) { ballX = width - ballR; ballDx = -Math.abs(ballDx); }
                if (ballY - ballR <= 0) { ballY = ballR; ballDy = Math.abs(ballDy); }

                if (ballY + ballR >= paddleY) {
                    ballY = paddleY - ballR - 1;
                    const hitPos = (ballX - paddleX) / paddleW;
                    const reflectAngle = -Math.PI / 2 + (hitPos - 0.5) * 2 * (Math.PI / 3) + (Math.random() - 0.5) * 0.1;
                    ballDx = Math.cos(reflectAngle) * speed;
                    ballDy = -Math.abs(Math.sin(reflectAngle) * speed); 
                }

                for (const brick of bricks) {
                    if (!brick.alive) continue;

                    if (
                        ballX + ballR > brick.x && ballX - ballR < brick.x + brick.w &&
                        ballY + ballR > brick.y && ballY - ballR < brick.y + brick.h
                    ) {
                        if (!piercingMode) {
                            const overlapX = ballDx > 0 ? (ballX + ballR) - brick.x : (brick.x + brick.w) - (ballX - ballR);
                            const overlapY = ballDy > 0 ? (ballY + ballR) - brick.y : (brick.y + brick.h) - (ballY - ballR);
                            if (overlapX < overlapY) ballDx *= -1; else ballDy *= -1;
                        }

                        const damage = piercingMode ? brick.hp : 1;
                        brick.hp -= damage;
                        totalScore += 10 * damage;

                        if (brick.hp <= 0) {
                            brick.alive = false;
                            bricksDestroyed++;
                        }
                        brickChanges.push({ id: brick.id, hp: brick.hp });
                        if (!piercingMode) break; 
                    }
                }
            }

            frames.push({
                activeLevel: seqIndex,
                gridIndex, // 0 to max 4
                ballX: Math.round(ballX * 10) / 10,
                ballY: Math.round(ballY * 10) / 10,
                paddleX: Math.round(paddleX * 10) / 10,
                paddleW,
                score: totalScore,
                brickChanges,
                levelProgress: frame / framesPerLevel,
                topPaddingOffset: topPadding - topPaddingBase
            });

            if (bricksDestroyed >= totalBricks) {
                ballDx *= 0.95;
                ballDy *= 0.95;
                speed = Math.max(200, speed * 0.95);
            }
        }
    }

    return {
        frames,
        levelSequence,
        finalScore: totalScore,
        brickLayout: { rows, cols, brickW, brickH, brickGap, gridPadding: 16, topPaddingBase, startX },
    };
}
