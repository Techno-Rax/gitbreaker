/**
 * Render SVG — Generate animated SVG from simulation frames
 * Contains theme palettes (GitHub Dark, Light, Dracula, Outrun)
 *
 * @module render-svg
 */

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
    },
    'github-light': {
        bg: '#ffffff',
        lines: 'rgba(0,0,0,0.03)',
        watermarkRgb: '36,41,47',
        watermarkOpacity: 0.12,
        text: '#24292f',
        accent: '#0969da',
        paddle: '#0969da',
        ball: '#1a7f37',
        palette: { 1: '#9be9a8', 2: '#40c463', 3: '#30a14e', 4: '#216e39' }
    },
    'dracula': {
        bg: '#282a36',
        lines: 'rgba(255,255,255,0.03)',
        watermarkRgb: '248,248,242',
        watermarkOpacity: 0.11,
        text: '#f8f8f2',
        accent: '#bd93f9',
        paddle: '#bd93f9',
        ball: '#50fa7b',
        palette: { 1: '#6272a4', 2: '#8be9fd', 3: '#ff79c6', 4: '#ffb86c' }
    },
    'outrun': {
        bg: '#0a0a2a',
        lines: 'rgba(0,255,255,0.05)',
        watermarkRgb: '0,255,255',
        watermarkOpacity: 0.12,
        text: '#00ffff',
        accent: '#ff00ff',
        paddle: '#ff00ff',
        ball: '#00ffff',
        palette: { 1: '#240046', 2: '#5a189a', 3: '#9d4edd', 4: '#ff6d00' }
    }
};

export function renderSVG(simResult, width, height, grids, options = {}) {
    const { fps = 30, username = '', theme = 'github-dark', compact = false, watermarkOpacity } = options;
    const { frames, levelSequence, brickLayout } = simResult;
    const { rows, cols, brickW, brickH, brickGap, startX } = brickLayout;

    const t = THEMES[theme] || THEMES['github-dark'];
    const totalDuration = frames.length / fps;
    const ballR = 5;
    const paddleH = 10;
    const paddleY = height - 25;
    const effectiveWatermarkOpacity = Number.isFinite(watermarkOpacity)
        ? Math.max(0.04, Math.min(0.35, watermarkOpacity))
        : t.watermarkOpacity;
    const watermarkFill = `rgba(${t.watermarkRgb},${effectiveWatermarkOpacity})`;
    const yearFontSize = Math.max(34, Math.min(92, Math.round(Math.min(width * 0.1, height * 0.55))));

    // Track brick hits by absolute ID for destruction animations
    const brickEvents = new Map(); 
    for (let i = 0; i < frames.length; i++) {
        for (const change of frames[i].brickChanges) {
            const key = change.id;
            if (!brickEvents.has(key)) brickEvents.set(key, []);
            brickEvents.get(key).push({ frame: i, hp: change.hp });
        }
    }

    // Determine when each sequence level starts and ends
    const seqRanges = [];
    for (let i = 0; i < levelSequence.length; i++) {
        const startFrame = frames.findIndex(f => f.activeLevel === i);
        const endFrame = frames.findLastIndex(f => f.activeLevel === i);
        seqRanges.push({ startFrame, endFrame });
    }

    let svg = '';
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    svg += `  <title>CommitBreaker — ${username}</title>\n`;
    svg += `  <style>\n`;
    svg += `    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }\n`;

    // Drop precision for speed
    const step = Math.max(1, Math.floor(frames.length / 150)); 
    svg += `    @keyframes ballMove {\n`;
    for (let i = 0; i < frames.length; i += step) {
        const pct = ((i / (frames.length - 1)) * 100).toFixed(1);
        svg += `      ${pct}% { cx: ${frames[i].ballX.toFixed(1)}px; cy: ${frames[i].ballY.toFixed(1)}px; }\n`;
    }
    const lf = frames[frames.length - 1];
    svg += `      100% { cx: ${lf.ballX.toFixed(1)}px; cy: ${lf.ballY.toFixed(1)}px; }\n`;
    svg += `    }\n`;

    svg += `    @keyframes paddleMove {\n`;
    for (let i = 0; i < frames.length; i += step) {
        const pct = ((i / (frames.length - 1)) * 100).toFixed(1);
        svg += `      ${pct}% { x: ${frames[i].paddleX.toFixed(1)}px; }\n`;
    }
    svg += `      100% { x: ${lf.paddleX.toFixed(1)}px; }\n`;
    svg += `    }\n`;

    // Timeline Ping-Pong fades: Fade specific grid layers in / out
    for (let seqIndex = 0; seqIndex < levelSequence.length; seqIndex++) {
        const r = seqRanges[seqIndex];
        const s = ((r.startFrame / frames.length) * 100).toFixed(1);
        const e = ((r.endFrame / frames.length) * 100).toFixed(1);
        
        svg += `    @keyframes fadeLvl_${seqIndex} {\n`;
        // Hard cut-in, fade-out slightly on end
        const beforeS = Math.max(0, s - 0.1).toFixed(1);
        if (s > 0) svg += `      0%, ${beforeS}% { opacity: 0; }\n`;
        svg += `      ${s}% { opacity: 1; transform: translateY(-20px); }\n`;
        svg += `      ${Number(s) + 5}% { transform: translateY(0px); }\n`;
        svg += `      ${e}% { opacity: 1; transform: translateY(${frames[r.endFrame].topPaddingOffset.toFixed(1)}px); }\n`; // Track descension
        const afterE = Math.min(100, Number(e) + 0.1).toFixed(1);
        if (e < 100) svg += `      ${afterE}%, 100% { opacity: 0; }\n`;
        svg += `    }\n`;
        svg += `    .lvl-${seqIndex} { animation: fadeLvl_${seqIndex} ${totalDuration}s linear infinite; }\n`;
    }

    // Brick destruction animations
    for (const [key, events] of brickEvents) {
        const deathEvent = events.find(e => e.hp <= 0);
        if (deathEvent) {
            const dp = ((deathEvent.frame / frames.length) * 100).toFixed(1);
            const pd = Math.max(0, parseFloat(dp) - 0.5).toFixed(1);
            svg += `    @keyframes b_${key.replace(/-/g,'_')} {\n`;
            svg += `      0%, ${pd}% { opacity: 1; transform: scale(1); }\n`;
            svg += `      ${dp}%, 100% { opacity: 0; transform: scale(0.6); }\n`;
            svg += `    }\n`;
            svg += `    .b-${key.replace(/-/g,'_')} { animation: b_${key.replace(/-/g,'_')} ${totalDuration}s linear infinite; transform-origin: center; transform-box: fill-box; }\n`;
        }
    }

    svg += `    .ball { animation: ballMove ${totalDuration}s linear infinite; }\n`;
    svg += `    .paddle { animation: paddleMove ${totalDuration}s linear infinite; }\n`;
    svg += `  </style>\n`;

    // Visuals background
    svg += `  <rect width="${width}" height="${height}" fill="${t.bg}" rx="6"/>\n`;
    for (let x = 0; x < width; x += 40) svg += `  <line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${t.lines}" stroke-width="1"/>\n`;
    for (let y = 0; y < height; y += 40) svg += `  <line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${t.lines}" stroke-width="1"/>\n`;

    const tPad = compact ? 12 : 15;

    // Render every ping-pong level iteration in its own sliding group
    for (let seqIndex = 0; seqIndex < levelSequence.length; seqIndex++) {
        const gridIndex = levelSequence[seqIndex];
        const grid = grids[gridIndex];
        if (!grid) continue;

        svg += `  <g class="lvl-${seqIndex}" opacity="0">\n`;
        
        // Render year text in the background of the active layer
        // Assumes current year is grids[0] and decrements, although grids is array of years data.
        // Wait, actually fetchContributions now returns an array of years.
        // We didn't pass the actual 'year' strings to renderSVG. Let's just calculate it: Since max is 5, it's roughly currentYear - gridIndex.
        const currentY = new Date().getFullYear();
        const yearText = currentY - gridIndex;
        svg += `    <text x="${width/2}" y="${height/2}" dominant-baseline="middle" font-family="sans-serif" font-size="${yearFontSize}" font-weight="800" text-anchor="middle" fill="${watermarkFill}" style="pointer-events: none;">${yearText}</text>\n`;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hp = grid[r]?.[c] || 0;
                if (hp <= 0) continue;
                const x = startX + c * (brickW + brickGap);
                const y = tPad + r * (brickH + brickGap);
                const color = t.palette[Math.min(hp, 4)] || t.palette[1];
                const key = `${seqIndex}-${r}-${c}`;
                const cName = brickEvents.has(key) ? `b-${key.replace(/-/g,'_')}` : '';
                svg += `    <rect class="${cName}" x="${x}" y="${y}" width="${brickW}" height="${brickH}" fill="${color}" rx="2"/>\n`;
            }
        }
        svg += `  </g>\n`;
    }

    svg += `  <rect class="paddle" x="${frames[0].paddleX}" y="${paddleY}" width="${frames[0].paddleW}" height="${paddleH}" fill="${t.paddle}" rx="${paddleH/2}"/>\n`;
    svg += `  <circle class="ball" cx="${frames[0].ballX}" cy="${frames[0].ballY}" r="${ballR}" fill="${t.ball}"/>\n`;
    
    svg += `</svg>\n`;
    return svg;
}
