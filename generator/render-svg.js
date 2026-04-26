const THEMES = {
    'github-dark': {
        bg: '#0d1117',
        lines: 'rgba(255,255,255,0.02)',
        watermarkRgb: '201,209,217',
        watermarkOpacity: 0.1,
        text: '#c9d1d9',
        accent: '#58a6ff',
        paddle: '#58a6ff',
        ball: '#ff2a5f', // Neon Red/Pink
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

    const ballR = 4;
    const paddleH = 6;
    const paddleY = height - 15;

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

    // Ball Animation
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

    // Disappearing Brick Animations
    for (const brick of finalBricks) {
        if (brick.deathFrame !== undefined) {
            const animName = `b_${brick.id.replace(/-/g, '_')}`;
            const pct = ((brick.deathFrame / totalFrames) * 100).toFixed(2);
            // Opacity drops instantly immediately after the collision frame
            svg += `@keyframes ${animName} { 0%, ${pct}% { opacity: 1; } ${Math.min(100, parseFloat(pct) + 0.1)}%, 100% { opacity: 0; } }\n`;
            svg += `.brick-${brick.id} { animation: ${animName} ${duration}s linear infinite; }\n`;
        }
    }

    svg += `</style>\n`;
    svg += `<rect width="100%" height="100%" fill="${t.bg}"/>\n`;

    // Render Bricks
    for (const brick of finalBricks) {
        const color = t.palette[Math.min(brick.maxHp, 4)];
        const cls = brick.deathFrame !== undefined ? `brick-${brick.id}` : '';
        svg += `<rect class="${cls}" x="${brick.x}" y="${brick.y}" width="${brickW}" height="${brickH}" rx="2" fill="${color}"/>\n`;
    }

    // Render Paddle & Ball
    svg += `<rect class="paddle" x="${frames[0].paddleX}" y="${paddleY}" width="${frames[0].paddleW}" height="${paddleH}" rx="3" fill="${t.paddle}"/>\n`;
    svg += `<circle class="ball" cx="${frames[0].ballX}" cy="${frames[0].ballY}" r="${ballR}" fill="${t.ball}"/>\n`;

    svg += `</svg>`;
    return svg;
}