import { fetchContributions, generateDemoGrid } from '../generator/fetch-contributions.js';
import { simulate } from '../generator/simulate.js';
import { renderSVG } from '../generator/render-svg.js';

export default async function handler(req, res) {
    let username = req.query.username || req.query.user;
    
    if (!username) {
        username = 'demo';
    }

    try {
        let grid;
        if (username === 'demo') {
            grid = generateDemoGrid();
        } else {
            const data = await fetchContributions(username);
            grid = data.grid;
        }

        // Run simulation with optimal length (fast server rendering)
        // We use 300 frames. For server context, simulating 300 frames takes ~50ms.
        console.time(`Simulate SVG for ${username}`);
        const { frames, brickStates, brickLayout } = simulate(grid, { 
            width: 800, 
            height: 500, 
            totalFrames: 300 
        });
        console.timeEnd(`Simulate SVG for ${username}`);

        // Render to SVG
        const svgString = renderSVG(frames, brickStates, brickLayout, { 
            width: 800, 
            height: 500 
        });

        // Set caching headers: cache aggressively on CDN (24 hours), revalidate in background
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
        
        return res.status(200).send(svgString);

    } catch (err) {
        console.error('Error generating SVG:', err);
        // Fallback to demo grid on error
        const grid = generateDemoGrid();
        const { frames, brickStates, brickLayout } = simulate(grid, { width: 800, height: 500, totalFrames: 300 });
        const svgString = renderSVG(frames, brickStates, brickLayout, { width: 800, height: 500 });
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, s-maxage=60'); // short cache for fallback
        return res.status(200).send(svgString);
    }
}
