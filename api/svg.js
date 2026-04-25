import { fetchContributions, generateDemoGrid } from '../generator/fetch-contributions.js';
import { simulate } from '../generator/simulate.js';
import { renderSVG } from '../generator/render-svg.js';

export default async function handler(req, res) {
    let username = req.query.username || req.query.user || 'techno-rax';
    let theme = req.query.theme || 'github-dark';
    let compact = req.query.compact === 'true';

    try {
        let grids;
        if (username === 'demo') {
            const data = generateDemoGrid();
            grids = data.years.map(y => y.grid);
        } else {
            const data = await fetchContributions(username);
            grids = data.years.map(y => y.grid);
        }

        const height = 170;

        const simResult = simulate(grids, { 
            width: 800, 
            height: height, 
            framesPerLevel: 120 
        });

        const svgString = renderSVG(simResult, 800, height, grids, { 
            username,
            theme,
        });

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
        return res.status(200).send(svgString);

    } catch (err) {
        console.error('Error generating SVG:', err);
        const data = generateDemoGrid();
        const grids = data.years.map(y => y.grid);
        const height = 170;
        const simResult = simulate(grids, { width: 800, height, framesPerLevel: 120 });
        const svgString = renderSVG(simResult, 800, height, grids, { username: 'Error - Demo', theme });
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, s-maxage=60');
        return res.status(200).send(svgString);
    }
}
