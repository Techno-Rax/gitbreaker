/**
 * Grid — Generate brick grid from contribution data
 * @module grid
 */

import { Brick } from './brick.js';

/**
 * Map contribution count to brick HP
 * @param {number} count - Contribution count for a day
 * @returns {number} HP value (0 = no brick)
 */
function countToHp(count) {
    if (count === 0) return 0;
    if (count <= 3) return 1;
    if (count <= 7) return 2;
    if (count <= 12) return 3;
    return 4; // heavy contributor day
}

/**
 * Map GitHub contribution level string to HP
 * @param {string} level - NONE, FIRST_QUARTILE, etc.
 * @returns {number} HP value
 */
export function levelToHp(level) {
    switch (level) {
        case 'NONE': return 0;
        case 'FIRST_QUARTILE': return 1;
        case 'SECOND_QUARTILE': return 2;
        case 'THIRD_QUARTILE': return 3;
        case 'FOURTH_QUARTILE': return 4;
        default: return 0;
    }
}

/**
 * Generate a brick grid from a 2D contribution data array
 * @param {number[][]} data - 7-row × N-col grid of contribution counts (or HP values)
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {object} [options]
 * @param {boolean} [options.isHpData=false] - If true, data is already HP values
 * @param {number} [options.topPadding=60] - Top padding for HUD
 * @returns {Brick[]} Array of brick instances
 */
export function generateGrid(data, canvasWidth, canvasHeight, options = {}) {
    const { isHpData = false, topPadding = 60 } = options;
    const bricks = [];

    const rows = data.length;        // Should be 7 (days of week)
    const cols = data[0]?.length || 0; // Should be ~52 (weeks)

    if (rows === 0 || cols === 0) return bricks;

    // Calculate brick dimensions
    const gridPadding = 20;
    const brickGap = 2;
    const availableWidth = canvasWidth - gridPadding * 2;
    const availableHeight = (canvasHeight * 0.45); // Use top 45% for bricks
    const brickWidth = (availableWidth - (cols - 1) * brickGap) / cols;
    const brickHeight = (availableHeight - (rows - 1) * brickGap) / rows;

    const startX = gridPadding;
    const startY = topPadding;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const value = data[row][col] || 0;
            const hp = isHpData ? value : countToHp(value);

            if (hp <= 0) continue; // No brick for empty cells

            const x = startX + col * (brickWidth + brickGap);
            const y = startY + row * (brickHeight + brickGap);

            bricks.push(new Brick(x, y, brickWidth, brickHeight, hp));
        }
    }

    return bricks;
}

/**
 * Generate a demo grid (no API needed)
 * Creates a pattern that mimics a realistic GitHub contribution heatmap
 * @returns {number[][]} 7×52 grid of HP values
 */
export function generateDemoGrid() {
    const grid = [];

    for (let row = 0; row < 7; row++) {
        const rowData = [];
        for (let col = 0; col < 52; col++) {
            // Create a realistic-looking contribution pattern
            const random = Math.random();
            const dayFactor = (row === 0 || row === 6) ? 0.6 : 1; // Less on weekends
            const timeFactor = Math.sin((col / 52) * Math.PI * 2 + 1) * 0.3 + 0.7; // Seasonal
            const streakFactor = (col > 20 && col < 35) ? 1.3 : 1; // Active period

            const probability = random * dayFactor * timeFactor * streakFactor;

            let hp = 0;
            if (probability > 0.8) hp = 4;
            else if (probability > 0.6) hp = 3;
            else if (probability > 0.4) hp = 2;
            else if (probability > 0.2) hp = 1;
            else hp = 0;

            rowData.push(hp);
        }
        grid.push(rowData);
    }

    return grid;
}

/**
 * Convert GitHub API weeks data to grid format
 * @param {Array} weeks - Array of week objects from GitHub API
 * @returns {number[][]} 7×N grid of HP values
 */
export function weeksToGrid(weeks) {
    // Initialize 7 rows (Sun–Sat)
    const grid = Array.from({ length: 7 }, () => []);

    for (const week of weeks) {
        for (let day = 0; day < 7; day++) {
            const dayData = week.contributionDays[day];
            if (dayData) {
                const hp = levelToHp(dayData.contributionLevel);
                grid[day].push(hp);
            }
        }
    }

    return grid;
}
