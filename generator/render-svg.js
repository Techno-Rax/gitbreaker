/**
 * Render SVG — Generate animated SVG from simulation frames
 *
 * Uses CSS @keyframes to animate ball movement, paddle movement,
 * and brick destruction with opacity transitions.
 *
 * @module render-svg
 */

/** GitHub green palette for brick HP */
const HP_COLORS = {
    1: '#0e4429',
    2: '#006d32',
    3: '#26a641',
    4: '#39d353',
};

/**
 * Render an animated SVG from simulation data
 *
 * @param {object} simResult - Output from simulate()
 * @param {number} width - SVG width
 * @param {number} height - SVG height
 * @param {number[][]} grid - Original HP grid for initial brick state
 * @param {object} [options]
 * @param {number} [options.fps=30]
 * @param {string} [options.username='']
 * @returns {string} SVG markup
 */
export function renderSVG(simResult, width, height, grid, options = {}) {
    const { fps = 30, username = '' } = options;
    const { frames, brickLayout } = simResult;
    const { rows, cols, brickW, brickH, brickGap, gridPadding, topPadding } = brickLayout;

    const totalDuration = frames.length / fps;
    const ballR = 5;
    const paddleH = 12;
    const paddleY = height - 35;

    // ── Build brick destruction timeline ──
    // Track when each brick changes HP and when it dies
    const brickEvents = new Map(); // key: "row-col" → [{frame, hp}]

    for (let i = 0; i < frames.length; i++) {
        for (const change of frames[i].brickChanges) {
            const key = `${change.row}-${change.col}`;
            if (!brickEvents.has(key)) brickEvents.set(key, []);
            brickEvents.get(key).push({ frame: i, hp: change.hp });
        }
    }

    // ── Build SVG ──
    let svg = '';

    // Header
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;

    // Metadata
    svg += `  <title>GitBreaker — ${username}'s Contribution Breaker</title>\n`;
    svg += `  <desc>Animated brick breaker game visualization of GitHub contributions</desc>\n`;

    // Styles
    svg += `  <defs>\n`;
    svg += `    <style>\n`;

    // Reduced motion support
    svg += `      @media (prefers-reduced-motion: reduce) {\n`;
    svg += `        * { animation: none !important; }\n`;
    svg += `      }\n`;

    // Ball animation — keyframes from position data
    svg += `      @keyframes ballMove {\n`;
    const ballKeyframeStep = Math.max(1, Math.floor(frames.length / 150)); // Limit keyframes
    for (let i = 0; i < frames.length; i += ballKeyframeStep) {
        const pct = ((i / (frames.length - 1)) * 100).toFixed(2);
        const f = frames[i];
        svg += `        ${pct}% { cx: ${f.ballX}px; cy: ${f.ballY}px; }\n`;
    }
    // Ensure 100%
    const lastFrame = frames[frames.length - 1];
    svg += `        100% { cx: ${lastFrame.ballX}px; cy: ${lastFrame.ballY}px; }\n`;
    svg += `      }\n`;

    // Paddle animation
    svg += `      @keyframes paddleMove {\n`;
    for (let i = 0; i < frames.length; i += ballKeyframeStep) {
        const pct = ((i / (frames.length - 1)) * 100).toFixed(2);
        const f = frames[i];
        svg += `        ${pct}% { x: ${f.paddleX}px; }\n`;
    }
    svg += `        100% { x: ${lastFrame.paddleX}px; }\n`;
    svg += `      }\n`;

    // Score animation
    svg += `      @keyframes scoreCount {\n`;
    const scoreStep = Math.max(1, Math.floor(frames.length / 50));
    for (let i = 0; i < frames.length; i += scoreStep) {
        const pct = ((i / (frames.length - 1)) * 100).toFixed(2);
        // We can't animate text content with CSS, so we'll use multiple text elements
    }
    svg += `      }\n`;

    // Brick destruction animations
    for (const [key, events] of brickEvents) {
        const deathEvent = events.find(e => e.hp <= 0);
        if (deathEvent) {
            const deathPct = ((deathEvent.frame / frames.length) * 100).toFixed(2);
            const preDeath = Math.max(0, parseFloat(deathPct) - 0.5).toFixed(2);
            svg += `      @keyframes brick_${key.replace('-', '_')} {\n`;
            svg += `        0% { opacity: 1; transform: scale(1); }\n`;
            svg += `        ${preDeath}% { opacity: 1; transform: scale(1); }\n`;
            svg += `        ${deathPct}% { opacity: 0; transform: scale(1.3); }\n`;
            svg += `        100% { opacity: 0; transform: scale(1.3); }\n`;
            svg += `      }\n`;
        }
    }

    // General styles
    svg += `      .ball {\n`;
    svg += `        animation: ballMove ${totalDuration}s linear infinite;\n`;
    svg += `        filter: drop-shadow(0 0 6px #00ff88);\n`;
    svg += `      }\n`;
    svg += `      .paddle {\n`;
    svg += `        animation: paddleMove ${totalDuration}s linear infinite;\n`;
    svg += `        filter: drop-shadow(0 0 4px #00d4ff);\n`;
    svg += `      }\n`;

    // Grid dropping animation
    svg += `      @keyframes gridDescend {\n`;
    svg += `        0% { transform: translateY(0px); }\n`;
    svg += `        100% { transform: translateY(${brickLayout.topPaddingOffset.toFixed(1)}px); }\n`;
    svg += `      }\n`;
    svg += `      .grid-layer {\n`;
    svg += `        animation: gridDescend ${totalDuration}s forwards;\n`;
    svg += `      }\n`;

    // Brick styles with destruction animation
    for (const [key, events] of brickEvents) {
        const deathEvent = events.find(e => e.hp <= 0);
        if (deathEvent) {
            svg += `      .brick-${key.replace('-', '_')} {\n`;
            svg += `        animation: brick_${key.replace('-', '_')} ${totalDuration}s linear infinite;\n`;
            svg += `        transform-origin: center;\n`;
            svg += `      }\n`;
        }
    }

    svg += `    </style>\n`;

    // Glow filters
    svg += `    <filter id="glow-green">\n`;
    svg += `      <feGaussianBlur stdDeviation="3" result="blur"/>\n`;
    svg += `      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>\n`;
    svg += `    </filter>\n`;
    svg += `    <filter id="glow-blue">\n`;
    svg += `      <feGaussianBlur stdDeviation="2" result="blur"/>\n`;
    svg += `      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>\n`;
    svg += `    </filter>\n`;

    svg += `  </defs>\n`;

    // Background
    svg += `  <rect width="${width}" height="${height}" fill="#0d1230" rx="8"/>\n`;

    // Subtle grid pattern
    for (let x = 0; x < width; x += 30) {
        svg += `  <line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(255,255,255,0.02)" stroke-width="1"/>\n`;
    }
    for (let y = 0; y < height; y += 30) {
        svg += `  <line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(255,255,255,0.02)" stroke-width="1"/>\n`;
    }

    // Title bar
    svg += `  <text x="${width / 2}" y="20" fill="#e2e8f0" font-family="'Inter', sans-serif" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="0.05em">`;
    svg += `<tspan fill="#e2e8f0">Git</tspan><tspan fill="#00ff88">Breaker</tspan>`;
    if (username) svg += ` <tspan fill="#64748b" font-size="10">— ${username}</tspan>`;
    svg += `</text>\n`;

    // Score display
    svg += `  <text x="${width - 15}" y="20" fill="#00ff88" font-family="'JetBrains Mono', monospace" font-size="10" text-anchor="end" opacity="0.7">`;
    svg += `SCORE: ${simResult.finalScore}`;
    svg += `</text>\n`;

    // ── Bricks ──
    const originalTopPadding = 50;
    svg += `  <g class="grid-layer">\n`;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const hp = grid[r][c];
            if (hp <= 0) continue;

            const x = brickLayout.startX + c * (brickW + brickGap);
            const y = originalTopPadding + r * (brickH + brickGap);
            const color = HP_COLORS[Math.min(hp, 4)] || HP_COLORS[1];
            const key = `${r}-${c}`;
            const className = brickEvents.has(key) ? `brick-${key.replace('-', '_')}` : '';

            svg += `    <rect class="${className}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${brickW.toFixed(1)}" height="${brickH.toFixed(1)}" fill="${color}" rx="2" opacity="0.9"/>\n`;
        }
    }
    svg += `  </g>\n`;

    // ── Paddle ──
    svg += `  <rect class="paddle" x="${frames[0].paddleX}" y="${paddleY}" width="${frames[0].paddleW}" height="${paddleH}" fill="#00d4ff" rx="${paddleH / 2}" filter="url(#glow-blue)"/>\n`;

    // ── Ball ──
    svg += `  <circle class="ball" cx="${frames[0].ballX}" cy="${frames[0].ballY}" r="${ballR}" fill="#00ff88" filter="url(#glow-green)"/>\n`;

    // ── "Play the game" link ──
    svg += `  <a href="https://anoojshete.github.io/gitbreaker/game/" target="_blank">\n`;
    svg += `    <rect x="${width / 2 - 55}" y="${height - 22}" width="110" height="18" rx="9" fill="rgba(0,255,136,0.15)" stroke="#00ff88" stroke-width="0.5"/>\n`;
    svg += `    <text x="${width / 2}" y="${height - 10}" fill="#00ff88" font-family="'Inter', sans-serif" font-size="9" font-weight="600" text-anchor="middle">▶ Play the Game</text>\n`;
    svg += `  </a>\n`;

    svg += `</svg>\n`;

    return svg;
}
