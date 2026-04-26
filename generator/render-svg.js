const THEMES = {
    'github-dark': {
        bg: '#0d1117',
        lines: 'rgba(255,255,255,0.02)',
        watermarkRgb: '201,209,217',
        watermarkOpacity: 0.1,
        text: '#c9d1d9',
        accent: '#58a6ff',
        paddle: '#58a6ff',
        ball: '#3fb950',
        palette: { 1: '#0e4429', 2: '#006d32', 3: '#26a641', 4: '#39d353' }
    }
};

export function renderSVG(simResult, width, height, grids, options = {}) {
    const { fps = 30, username = '', theme = 'github-dark' } = options;
    const { frames, levelSequence, brickLayout } = simResult;
    const { rows, cols, brickW, brickH, brickGap, startX } = brickLayout;

    const t = THEMES[theme];
    const duration = frames.length / fps;

    const ballR = 5;
    const paddleH = 10;
    const paddleY = height - 25;

    // 🧠 Detect bounce frames (inflection points)
    const ballKeyframes = [];

    for (let i = 0; i < frames.length; i++) {
        if (i === 0 || i === frames.length - 1) {
            ballKeyframes.push({ ...frames[i], frameIndex: i });
            continue;
        }

        const prev = frames[i - 1];
        const curr = frames[i];
        const next = frames[i + 1];

        const dx1 = curr.ballX - prev.ballX;
        const dy1 = curr.ballY - prev.ballY;
        const dx2 = next.ballX - curr.ballX;
        const dy2 = next.ballY - curr.ballY;

        // detect direction change
        if (Math.sign(dx1) !== Math.sign(dx2) || Math.sign(dy1) !== Math.sign(dy2)) {
            ballKeyframes.push({ ...curr, frameIndex: i });
        }
    }

    let svg = '';
    svg += `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `<style>\n`;

    // Ball animation (inflection-based)
    svg += `@keyframes ballMove {\n`;
    for (const f of ballKeyframes) {
        const pct = ((f.frameIndex / (frames.length - 1)) * 100).toFixed(2);
        svg += `${pct}% { cx:${f.ballX.toFixed(1)}px; cy:${f.ballY.toFixed(1)}px; }\n`;
    }
    svg += `}\n`;

    // Paddle animation (sampled)
    const paddleStep = Math.max(1, Math.floor(frames.length / 100));
    svg += `@keyframes paddleMove {\n`;
    for (let i = 0; i < frames.length; i += paddleStep) {
        const pct = ((i / (frames.length - 1)) * 100).toFixed(2);
        svg += `${pct}% { x:${frames[i].paddleX.toFixed(1)}px; }\n`;
    }
    const lf = frames[frames.length - 1];
    svg += `100% { x:${lf.paddleX.toFixed(1)}px; }\n`;
    svg += `}\n`;

    svg += `.ball { animation: ballMove ${duration}s linear infinite; }\n`;
    svg += `.paddle { animation: paddleMove ${duration}s linear infinite; }\n`;

    svg += `</style>\n`;

    // Background
    svg += `<rect width="100%" height="100%" fill="${t.bg}"/>\n`;

    // Bricks
    for (let seqIndex = 0; seqIndex < levelSequence.length; seqIndex++) {
        const grid = grids[levelSequence[seqIndex]];
        if (!grid) continue;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hp = grid[r][c];
                if (hp <= 0) continue;

                const x = startX + c * (brickW + brickGap);
                const y = 20 + r * (brickH + brickGap);

                const color = t.palette[Math.min(hp, 4)];

                svg += `<rect x="${x}" y="${y}" width="${brickW}" height="${brickH}" rx="2" fill="${color}"/>\n`;
            }
        }
    }

    // Paddle
    svg += `<rect class="paddle" x="${frames[0].paddleX}" y="${paddleY}" width="${frames[0].paddleW}" height="${paddleH}" rx="5" fill="${t.paddle}"/>\n`;

    // Ball
    svg += `<circle class="ball" cx="${frames[0].ballX}" cy="${frames[0].ballY}" r="${ballR}" fill="${t.ball}"/>\n`;

    svg += `</svg>`;
    return svg;
}