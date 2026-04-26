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
    const { brickW, brickH, startX, topPaddingBase, gridWidth, gridHeight } = brickLayout;

    const t = THEMES[theme] || THEMES['github-dark'];
    
    const watermarkColor = theme === 'github-light' 
        ? `rgba(0,0,0,${watermarkOpacity + 0.02})` 
        : `rgba(255,255,255,${watermarkOpacity})`;

    const duration = frames.length / fps;
    const totalFrames = frames.length - 1;

    const ballR = 1.2; 
    const paddleH = 2; 
    const paddleY = height - 8;

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

    // Main ball
    svg += `@keyframes ballMove {\n`;
    for (const f of ballKeyframes) {
        const pct = ((f.frameIndex / totalFrames) * 100).toFixed(2);
        svg += `  ${pct}% { cx:${f.ballX.toFixed(1)}px; cy:${f.ballY.toFixed(1)}px; }\n`;
    }
    svg += `}\n`;

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

    // Brick State Animations (Disappear instantly & Cracks)
    for (const brick of finalBricks) {
        if (brick.deathFrame !== undefined) {
            const animName = `b_${brick.id.replace(/-/g, '_')}`;
            const pct = ((brick.deathFrame / totalFrames) * 100).toFixed(2);
            svg += `@keyframes ${animName} { 
                0%, ${pct}% { opacity: 1; } 
                ${Math.min(100, parseFloat(pct) + 0.01)}%, 100% { opacity: 0; } 
            }\n`;
            svg += `.brick-${brick.id} { animation: ${animName} ${duration}s linear infinite; }\n`;
        }

        // Damage Cracks Activation
        if (brick.maxHp > 1 && brick.damageFrames?.length > 0) {
            if (brick.damageFrames.length >= 1) {
                const c1Anim = `c1_${brick.id.replace(/-/g, '_')}`;
                const dmgPct = ((brick.damageFrames[0] / totalFrames) * 100).toFixed(2);
                const deathPct = brick.deathFrame ? ((brick.deathFrame / totalFrames) * 100).toFixed(2) : 100;
                svg += `@keyframes ${c1Anim} {
                    0%, ${dmgPct}% { opacity: 0; }
                    ${Math.min(100, parseFloat(dmgPct) + 0.01)}%, ${deathPct}% { opacity: 1; }
                    ${Math.min(100, parseFloat(deathPct) + 0.01)}%, 100% { opacity: 0; }
                }\n`;
                svg += `.c1-${brick.id} { animation: ${c1Anim} ${duration}s linear infinite; opacity: 0; }\n`;
            }

            if (brick.damageFrames.length >= 2) {
                const c2Anim = `c2_${brick.id.replace(/-/g, '_')}`;
                const dmgPct = ((brick.damageFrames[1] / totalFrames) * 100).toFixed(2);
                const deathPct = brick.deathFrame ? ((brick.deathFrame / totalFrames) * 100).toFixed(2) : 100;
                svg += `@keyframes ${c2Anim} {
                    0%, ${dmgPct}% { opacity: 0; }
                    ${Math.min(100, parseFloat(dmgPct) + 0.01)}%, ${deathPct}% { opacity: 1; }
                    ${Math.min(100, parseFloat(deathPct) + 0.01)}%, 100% { opacity: 0; }
                }\n`;
                svg += `.c2-${brick.id} { animation: ${c2Anim} ${duration}s linear infinite; opacity: 0; }\n`;
            }
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
    const currentYear = new Date().getFullYear();
    const watermarkX = startX + gridWidth / 2;
    const watermarkY = topPaddingBase + gridHeight / 2;
    // Mathematically scales the font so it fits strictly within the grid area
    const fontSize = Math.floor(gridHeight * 1.4); 
    
    svg += `<text x="${watermarkX}" y="${watermarkY}" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="900" text-anchor="middle" fill="${watermarkColor}" style="pointer-events: none; user-select: none;">${currentYear}</text>\n`;

    // Render Bricks
    for (const brick of finalBricks) {
        const color = t.palette[Math.min(brick.maxHp, 4)];
        const cls = brick.deathFrame !== undefined ? `brick-${brick.id}` : '';
        svg += `<rect class="${cls}" x="${brick.x}" y="${brick.y}" width="${brickW}" height="${brickH}" rx="1.5" fill="${color}"/>\n`;

        // Render Cracks
        if (brick.maxHp > 1) {
            const cx = brick.x + brickW * 0.5;
            const cy = brick.y + brickH * 0.5;
            const dmgColor = `rgba(0,0,0,0.5)`; 
            
            const c1_cls = `c1-${brick.id}`;
            svg += `<path class="${c1_cls}" d="M ${cx} ${cy} L ${cx + brickW * 0.3} ${cy - brickH * 0.35}" stroke="${dmgColor}" stroke-width="0.7" fill="none" />\n`;
            
            if (brick.maxHp > 2) {
                const c2_cls = `c2-${brick.id}`;
                svg += `<path class="${c2_cls}" d="M ${cx} ${cy} L ${cx - brickW * 0.25} ${cy + brickH * 0.3}" stroke="${dmgColor}" stroke-width="0.7" fill="none" />\n`;
            }
        }
    }

    // Render Paddle
    svg += `<rect class="paddle" x="${frames[0].paddleX}" y="${paddleY}" width="${frames[0].paddleW}" height="${paddleH}" rx="1" fill="${t.paddle}"/>\n`;
    
    // Render Main Ball
    svg += `<circle class="ball" cx="${frames[0].ballX}" cy="${frames[0].ballY}" r="${ballR}" fill="${t.ball}"/>\n`;

    svg += `</svg>`;
    return svg;
}