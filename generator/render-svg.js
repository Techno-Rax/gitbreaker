const THEMES = {
    'github-dark': {
        bg: '#080810',
        lines: 'rgba(255,255,255,0.025)',
        paddle: '#00b8d4',
        ball: '#ff2a5f', 
        palette: { 1: '#0e4429', 2: '#006d32', 3: '#26a641', 4: '#39d353' }
    },
    'github-light': {
        bg: '#ffffff',
        lines: 'rgba(0,0,0,0.03)',
        paddle: '#0969da',
        ball: '#ff2a5f',
        palette: { 1: '#9be9a8', 2: '#40c463', 3: '#30a14e', 4: '#216e39' }
    }
};

export function renderSVG(simResult, width, height, grids, options = {}) {
    const { fps = 30, theme = 'github-dark', watermarkOpacity = 0.05 } = options;
    const { frames, finalBricks, brickLayout } = simResult;
    const { brickW, brickH } = brickLayout;

    const t = THEMES[theme] || THEMES['github-dark'];
    
    // Dynamic watermark color based on theme
    const watermarkColor = theme === 'github-light' 
        ? `rgba(0,0,0,${watermarkOpacity + 0.02})` 
        : `rgba(255,255,255,${watermarkOpacity})`;

    const duration = frames.length / fps;
    const totalFrames = frames.length - 1;

    const ballR = 1.5; 
    const paddleH = 4; 
    const paddleY = height - 10;

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

    // ── Comet Trail Generator ──
    function createTrail(offsetFrames, opacity, className) {
        let kfs = `@keyframes ${className} {\n`;
        kfs += `  0% { cx:${frames[0].ballX.toFixed(1)}px; cy:${frames[0].ballY.toFixed(1)}px; opacity: 0; }\n`;
        
        const startPct = ((offsetFrames / totalFrames) * 100).toFixed(2);
        kfs += `  ${startPct}% { cx:${frames[0].ballX.toFixed(1)}px; cy:${frames[0].ballY.toFixed(1)}px; opacity: 0; }\n`;
        kfs += `  ${Math.min(100, parseFloat(startPct) + 0.1).toFixed(2)}% { opacity: ${opacity}; }\n`;

        for (const f of ballKeyframes) {
            let shiftedFrame = f.frameIndex + offsetFrames;
            if (shiftedFrame > totalFrames) continue;
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

    // Generate 6 packed trail segments to look like a solid comet line
    const trailCount = 6;
    for (let i = 1; i <= trailCount; i++) {
        const offset = i * 2; 
        const opacity = (1 - (i / (trailCount + 1))) * 0.8;
        svg += createTrail(offset, opacity, `trail${i}`);
        svg += `.t${i} { animation: trail${i} ${duration}s linear infinite; }\n`;
    }

    // Paddle Animation
    const paddleStep = Math.max(1, Math.floor(frames.length / 100));
    svg += `@keyframes paddleMove {\n`;
    for (let i = 0; i < frames.length; i += paddleStep) {
        const pct = ((i / totalFrames) * 100).toFixed(2);
        svg += `  ${pct}% { x:${frames[i].paddleX.toFixed(1)}px; }\n`;
    }
    svg += `  100% { x:${frames[frames.length - 1].paddleX.toFixed(1)}px; }\n`;
    svg += `}\n`;

    svg += `.ball { animation: ballMove ${duration}s linear infinite; }\n`;
    svg += `.paddle { animation: paddleMove ${duration}s linear infinite; }\n`;

    // Exact Brick Disappearance
    for (const brick of finalBricks) {
        if (brick.deathFrame !== undefined) {
            const animName = `b_${brick.id.replace(/-/g, '_')}`;
            const pct = ((brick.deathFrame / totalFrames) * 100).toFixed(2);
            svg += `@keyframes ${animName} { 0%, ${pct}% { opacity: 1; } ${Math.min(100, parseFloat(pct) + 0.1)}%, 100% { opacity: 0; } }\n`;
            svg += `.brick-${brick.id} { animation: ${animName} ${duration}s linear infinite; }\n`;
        }
    }

    svg += `</style>\n`;
    
    // Dot Grid Pattern
    svg += `<defs>\n`;
    svg += `  <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">\n`;
    svg += `    <rect x="0" y="0" width="1" height="1" fill="${t.lines}"/>\n`;
    svg += `  </pattern>\n`;
    svg += `</defs>\n`;

    svg += `<rect width="100%" height="100%" fill="${t.bg}"/>\n`;
    svg += `<rect width="100%" height="100%" fill="url(#dotGrid)"/>\n`;

    // ── Render Watermark ──
    const currentYear = new Date().getFullYear(); // Using the current year for the single-year simulation
    svg += `<text x="${width / 2}" y="${height / 2 + 10}" dominant-baseline="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="90" font-weight="900" text-anchor="middle" fill="${watermarkColor}" style="pointer-events: none; user-select: none;">${currentYear}</text>\n`;

    // Render Bricks
    for (const brick of finalBricks) {
        const color = t.palette[Math.min(brick.maxHp, 4)];
        const cls = brick.deathFrame !== undefined ? `brick-${brick.id}` : '';
        svg += `<rect class="${cls}" x="${brick.x}" y="${brick.y}" width="${brickW}" height="${brickH}" rx="1.5" fill="${color}"/>\n`;
    }

    // Render Paddle
    svg += `<rect class="paddle" x="${frames[0].paddleX}" y="${paddleY}" width="${frames[0].paddleW}" height="${paddleH}" rx="2" fill="${t.paddle}"/>\n`;
    
    // Render Trail (back to front)
    for (let i = trailCount; i >= 1; i--) {
        const r = ballR * (1 - (i * 0.12)); // Trails narrow out into a tail
        svg += `<circle class="t${i}" cx="${frames[0].ballX}" cy="${frames[0].ballY}" r="${r}" fill="${t.ball}"/>\n`;
    }
    
    // Render Main Ball
    svg += `<circle class="ball" cx="${frames[0].ballX}" cy="${frames[0].ballY}" r="${ballR}" fill="${t.ball}"/>\n`;

    svg += `</svg>`;
    return svg;
}