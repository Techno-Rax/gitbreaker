/**
 * Generate — Orchestrator for SVG animation generation
 *
 * Usage: GITHUB_TOKEN=xxx node generator/generate.js
 *
 * Steps:
 * 1. Fetch contributions from GitHub API
 * 2. Build grid
 * 3. Run simulation
 * 4. Render SVG
 * 5. Write to output/game.svg
 */

import { fetchContributions, generateDemoGrid } from './fetch-contributions.js';
import { simulate } from './simulate.js';
import { renderSVG } from './render-svg.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'output');

// ── Configuration ──
const CONFIG = {
    username: process.env.GITHUB_USERNAME || 'anoojshete',
    token: process.env.GITHUB_TOKEN || '',
    width: 800,
    height: 450,
    totalFrames: 300,
    fps: 30,
};

async function main() {
    console.log('🎮 GitBreaker SVG Generator');
    console.log('═'.repeat(40));

    let grid;
    let totalContributions = 0;

    // ── Step 1: Fetch contributions ──
    if (CONFIG.token) {
        console.log(`\n📊 Fetching contributions for @${CONFIG.username}...`);
        try {
            const result = await fetchContributions(CONFIG.username, CONFIG.token);
            grid = result.grid;
            totalContributions = result.totalContributions;
            console.log(`   ✅ ${totalContributions} contributions loaded`);
            console.log(`   📐 Grid: ${grid.length} rows × ${grid[0].length} cols`);
        } catch (err) {
            console.warn(`   ⚠️  Failed to fetch: ${err.message}`);
            console.log('   Using demo grid instead...');
            grid = generateDemoGrid();
        }
    } else {
        console.log('\n⚠️  No GITHUB_TOKEN set — using demo grid');
        grid = generateDemoGrid();
    }

    const brickCount = grid.flat().filter(hp => hp > 0).length;
    console.log(`   🧱 ${brickCount} bricks to break`);

    // ── Step 2: Run simulation ──
    console.log('\n🏃 Running simulation...');
    const simResult = simulate(grid, {
        width: CONFIG.width,
        height: CONFIG.height,
        totalFrames: CONFIG.totalFrames,
        fps: CONFIG.fps,
    });
    console.log(`   📸 ${simResult.frames.length} frames generated`);
    console.log(`   🏆 Final score: ${simResult.finalScore}`);

    const destroyedCount = [...simResult.brickStates.values()].filter(b => !b.alive).length;
    console.log(`   💥 ${destroyedCount}/${brickCount} bricks destroyed`);

    // ── Step 3: Render SVG ──
    console.log('\n🎨 Rendering SVG...');
    const svg = renderSVG(simResult, CONFIG.width, CONFIG.height, grid, {
        fps: CONFIG.fps,
        username: CONFIG.username,
    });

    // ── Step 4: Write output ──
    if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const outputPath = join(OUTPUT_DIR, 'game.svg');
    writeFileSync(outputPath, svg, 'utf-8');

    const sizeKB = (Buffer.byteLength(svg, 'utf-8') / 1024).toFixed(1);
    console.log(`   ✅ Saved to ${outputPath}`);
    console.log(`   📦 Size: ${sizeKB} KB`);

    console.log('\n' + '═'.repeat(40));
    console.log('✨ Done! SVG animation generated successfully.');
}

main().catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});
