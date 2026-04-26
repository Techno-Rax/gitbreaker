import { fetchContributions, generateDemoGrid } from '../generator/fetch-contributions.js';
import { simulate } from '../generator/simulate.js';
import { renderSVG } from '../generator/render-svg.js';

function resolveDimensions(query) {
    const width = 720;
    const height = 170;
    const sidePadding = 20;
    const watermarkOpacity = clamp(parseNumber(query.watermarkOpacity, NaN), 0.04, 0.35);

    return {
        width,
        height,
        sidePadding,
        watermarkOpacity: Number.isFinite(watermarkOpacity) ? watermarkOpacity : undefined,
        compact: false,
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
            framesPerLevel: 800 
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
            framesPerLevel: 800,
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
