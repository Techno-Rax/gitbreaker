import { fetchContributions, generateDemoGrid } from '../generator/fetch-contributions.js';
import { simulate } from '../generator/simulate.js';
import { renderSVG } from '../generator/render-svg.js';

const SIZE_PRESETS = {
    full: { width: 1200, height: 190, sidePadding: 36 },
    half: { width: 800, height: 170, sidePadding: 28 },
    compact: { width: 680, height: 160, sidePadding: 20 },
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function parseNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveDimensions(query) {
    const presetName = typeof query.size === 'string' ? query.size.toLowerCase() : 'half';
    const preset = SIZE_PRESETS[presetName] || SIZE_PRESETS.half;

    const width = Math.round(clamp(parseNumber(query.width, preset.width), 640, 1600));
    const height = Math.round(clamp(parseNumber(query.height, preset.height), 140, 320));
    const sidePadding = Math.round(clamp(parseNumber(query.sidePadding, preset.sidePadding), 0, 100));
    const watermarkOpacity = clamp(parseNumber(query.watermarkOpacity, NaN), 0.04, 0.35);

    return {
        width,
        height,
        sidePadding,
        watermarkOpacity: Number.isFinite(watermarkOpacity) ? watermarkOpacity : undefined,
        compact: presetName === 'compact' || query.compact === 'true',
    };
}

export default async function handler(req, res) {
    let username = req.query.username || req.query.user || 'techno-rax';
    let theme = req.query.theme || 'github-dark';
    const dimensions = resolveDimensions(req.query);

    try {
        let grids;
        if (username === 'demo') {
            const data = generateDemoGrid();
            grids = data.years.map(y => y.grid);
        } else {
            const data = await fetchContributions(username);
            grids = data.years.map(y => y.grid);
        }

        const simResult = simulate(grids, { 
            width: dimensions.width,
            height: dimensions.height,
            sidePadding: dimensions.sidePadding,
            framesPerLevel: 120 
        });

        const svgString = renderSVG(simResult, dimensions.width, dimensions.height, grids, {
            username,
            theme,
            compact: dimensions.compact,
            watermarkOpacity: dimensions.watermarkOpacity,
        });

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
        return res.status(200).send(svgString);

    } catch (err) {
        console.error('Error generating SVG:', err);
        const data = generateDemoGrid();
        const grids = data.years.map(y => y.grid);
        const simResult = simulate(grids, {
            width: dimensions.width,
            height: dimensions.height,
            sidePadding: dimensions.sidePadding,
            framesPerLevel: 120,
        });
        const svgString = renderSVG(simResult, dimensions.width, dimensions.height, grids, {
            username: 'Error - Demo',
            theme,
            compact: dimensions.compact,
            watermarkOpacity: dimensions.watermarkOpacity,
        });
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, s-maxage=60');
        return res.status(200).send(svgString);
    }
}
