const THEMES = {
    'github-dark': {
        bg: '#080810', // Matched play mode background
        lines: 'rgba(255,255,255,0.025)', // Matched play mode grid lines
        paddle: '#00b8d4', // Play mode neon cyan
        ball: '#ff2a5f',   // Play mode neon red/pink
        palette: { 1: '#0e4429', 2: '#006d32', 3: '#26a641', 4: '#39d353' }
    }
};

export function renderSVG(simResult, width, height, grids, options = {}) {
    const { fps = 30, theme = 'github-dark' } = options;
    const { frames, finalBricks, brickLayout } = simResult;
    const { brickW, brickH } = brickLayout;

    const t = THEMES[theme];
    const duration = frames.length / fps;
    const totalFrames = frames.length - 1;

    const ballR = 2.5; // Shrunk ball
    const paddleH = 5; // Shrunk paddle
    const paddleY = height - 15;

    // Filter to only inflection points to save massive amounts of file size
    const ballKeyframes = [];
    for (let i = 0; i < frames.length; i++) {
        if (i === 0 || i === frames.length - 1) {
            ballKeyframes.push(frames[i]);
            continue;
        }
        const prev = frames[i - 1], curr = frames[i], next = frames[i + 1];
        if (Math.sign(curr.ballX - prev.ballX) !== Math.sign(next.ballX - curr.ballX) || 
            Math.sign(curr.ballY - prev.ballY) !== Math.sign(next.ballY - curr.ballY)) {
            ballKeyframes.push(curr);
        }
    }

    let svg = '';
    svg += `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `<style>\n`;

    // Trail Keyframe Generator
    // This creates perfect trails that follow the ball's exact mathematical path but delayed
    function createTrail(offsetFrames, opacity, className) {
        let kfs = `@keyframes ${className} {\n`;
        kfs += `  0% { cx:${frames[0].ballX.toFixed(1)}px; cy:${frames[0].ballY.toFixed(1)}px; opacity: 0; }\n`;
        
        const startPct = ((offsetFrames / totalFrames) * 100).toFixed(2);
        kfs += `  ${startPct}% { cx:${frames[0].ballX.toFixed(1)}px; cy:${frames[0].ballY.toFixed(1)}px; opacity: 0; }\n`;
        kfs += `  ${Math.min(100, parseFloat(startPct) + 0.1).toFixed(2)}% { opacity: ${opacity}; }\n`;

        for (const f of ballKeyframes) {
            let shiftedFrame = f.frameIndex + offsetFrames;
            if (shiftedFrame > totalFrames || shiftedFrame === 0) continue;
            const pct = ((shiftedFrame / totalFrames) * 100).toFixed(2);
            kfs += `  ${pct}% { cx:${f.ballX.toFixed(1)}px; cy:${f.ballY.toFixed(1)}px; }\n`;
        }
        kfs += `  100% { cx:${frames[totalFrames].ballX.toFixed(1)}px; cy:${frames[totalFrames].ballY.toFixed(1)}px; opacity: 0; }\n`;
        kfs += `}\n`;
        return kfs;
    }

    // Main ball
    svg += `@keyframes ballMove {\n`;
    for (const f of ballKeyframes) {
        const pct = ((f.frameIndex / totalFrames) * 100).toFixed(2);
        svg += `  ${pct}% { cx:${f.ballX.toFixed(1)}px; cy:${f.ballY.toFixed(1)}px; }\n`;
    }
    svg += `}\n`;

    // Trail components (Delayed by 2, 4, and 6 frames)
    svg += createTrail(2, 0.6, 'trail1');
    svg += createTrail(4, 0.3, 'trail2');
    svg += createTrail(6, 0.1, 'trail3');

    // Paddle Animation
    const paddleStep = Math.max(1, Math.floor(frames.length / 100));
    svg += `@keyframes paddleMove {\n`;
    for (let i = 0; i < frames.length; i += paddleStep) {
        const pct = ((i / totalFrames) * 100).toFixed(2);
        svg += `  ${pct}% { x:${frames[i].paddleX.toFixed(1)}px; }\n`;
    }
    svg += `  100% { x:${frames[frames.length - 1].paddleX.toFixed(1)}px; }\n`;
    svg += `}\n`;

    // Bind animations to classes
    svg += `.ball { animation: ballMove ${duration}s linear infinite; }\n`;
    svg += `.t1 { animation: trail1 ${duration}s linear infinite; }\n`;
    svg += `.t2 { animation: trail2 ${duration}s linear infinite; }\n`;
    svg += `.t3 { animation: trail3 ${duration}s linear infinite; }\n`;
    svg += `.paddle { animation: paddleMove ${duration}s linear infinite; }\n`;

    // Disappearing Brick Animations
    for (const brick of finalBricks) {
        if (brick.deathFrame !== undefined) {
            const animName = `b_${brick.id.replace(/-/g, '_')}`;
            const pct = ((brick.deathFrame / totalFrames) * 100).toFixed(2);
            svg += `@keyframes ${animName} { 0%, ${pct}% { opacity: 1; } ${Math.min(100, parseFloat(pct) + 0.1)}%, 100% { opacity: 0; } }\n`;
            svg += `.brick-${brick.id} { animation: ${animName} ${duration}s linear infinite; }\n`;
        }
    }

    svg += `</style>\n`;
    
    // Background Definitions
    svg += `<defs>\n`;
    svg += `  <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">\n`;
    svg += `    <rect x="0" y="0" width="1" height="1" fill="${t.lines}"/>\n`;
    svg += `  </pattern>\n`;
    svg += `</defs>\n`;

    // Background Layers
    svg += `<rect width="100%" height="100%" fill="${t.bg}"/>\n`;
    svg += `<rect width="100%" height="100%" fill="url(#dotGrid)"/>\n`;

    // Render Bricks
    for (const brick of finalBricks) {
        const color = t.palette[Math.min(brick.maxHp, 4)];
        const cls = brick.deathFrame !== undefined ? `brick-${brick.id}` : '';
        svg += `<rect class="${cls}" x="${brick.x}" y="${brick.y}" width="${brickW}" height="${brickH}" rx="1.5" fill="${color}"/>\n`;
    }

    // Render Paddle
    svg += `<rect class="paddle" x="${frames[0].paddleX}" y="${paddleY}" width="${frames[0].paddleW}" height="${paddleH}" rx="2.5" fill="${t.paddle}"/>\n`;
    
    // Render Trail
    const sr = ballR * 0.8; // Trails are slightly smaller
    svg += `<circle class="t3" cx="${frames[0].ballX}" cy="${frames[0].ballY}" r="${sr}" fill="${t.ball}"/>\n`;
    svg += `<circle class="t2" cx="${frames[0].ballX}" cy="${frames[0].ballY}" r="${sr}" fill="${t.ball}"/>\n`;
    svg += `<circle class="t1" cx="${frames[0].ballX}" cy="${frames[0].ballY}" r="${sr}" fill="${t.ball}"/>\n`;
    
    // Render Main Ball
    svg += `<circle class="ball" cx="${frames[0].ballX}" cy="${frames[0].ballY}" r="${ballR}" fill="${t.ball}"/>\n`;

    svg += `</svg>`;
    return svg;
}