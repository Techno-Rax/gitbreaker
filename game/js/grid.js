/**
 * Grid — Brick grid with spatial partitioning for fast collision
 * @module grid
 */

import { Brick } from './brick.js';

/**
 * Map contribution level string to HP
 * @param {string} level
 * @returns {number}
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
 * Generate bricks from grid data with spatial lookup
 * @param {number[][]} data - 7×N grid of HP values
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {object} [options]
 * @param {boolean} [options.isHpData=false]
 * @param {number} [options.topPadding=50]
 * @param {Array<Array<{date:string,count:number}>>} [options.metadata] - Per-cell metadata
 * @returns {{bricks: Brick[], spatialGrid: Brick[][], gridInfo: object}}
 */
export function generateGrid(data, canvasWidth, canvasHeight, options = {}) {
    const { isHpData = false, topPadding = 50, metadata = null } = options;
    const bricks = [];

    const rows = data.length;
    const cols = data[0]?.length || 0;
    if (rows === 0 || cols === 0) return { bricks, spatialGrid: [], gridInfo: {} };

    // Force exact GitHub-style dimensions
    const brickSize = 11;
    const brickGap = 2; 
    const brickWidth = brickSize;
    const brickHeight = brickSize;
    
    // Center the grid horizontally
    const totalWidth = cols * brickSize + (cols - 1) * brickGap;
    const startX = (canvasWidth - totalWidth) / 2;
    const startY = topPadding;

    // Spatial grid for O(1) collision lookup
    const spatialGrid = Array.from({ length: rows }, () => Array(cols).fill(null));

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const value = data[row][col] || 0;
            const hp = isHpData ? value : countToHp(value);
            if (hp <= 0) continue;

            const x = startX + col * (brickWidth + brickGap);
            const y = startY + row * (brickHeight + brickGap);

            // Extract metadata if available
            const meta = metadata?.[row]?.[col] || null;

            const brick = new Brick(x, y, brickWidth, brickHeight, hp, meta);
            brick.gridRow = row;
            brick.gridCol = col;
            bricks.push(brick);
            spatialGrid[row][col] = brick;
        }
    }

    const gridInfo = {
        rows, cols, brickWidth, brickHeight, brickGap,
        gridPadding, topPadding, startX, startY,
    };

    return { bricks, spatialGrid, gridInfo };
}

/** Map count → HP */
function countToHp(count) {
    if (count === 0) return 0;
    if (count <= 3) return 1;
    if (count <= 7) return 2;
    if (count <= 12) return 3;
    return 4;
}

/**
 * Find brick at canvas position using spatial lookup
 * @param {number} px - Canvas X
 * @param {number} py - Canvas Y
 * @param {object} gridInfo
 * @param {Brick[][]} spatialGrid
 * @returns {Brick|null}
 */
export function brickAtPosition(px, py, gridInfo, spatialGrid) {
    const col = Math.floor((px - gridInfo.startX) / (gridInfo.brickWidth + gridInfo.brickGap));
    const row = Math.floor((py - gridInfo.startY) / (gridInfo.brickHeight + gridInfo.brickGap));

    if (row < 0 || row >= gridInfo.rows || col < 0 || col >= gridInfo.cols) return null;

    const brick = spatialGrid[row]?.[col];
    return brick?.alive ? brick : null;
}

/**
 * Get nearby bricks for collision (check 3×3 neighborhood)
 * @param {number} bx - Ball X
 * @param {number} by - Ball Y
 * @param {number} br - Ball radius
 * @param {object} gridInfo
 * @param {Brick[][]} spatialGrid
 * @returns {Brick[]}
 */
export function nearbyBricks(bx, by, br, gridInfo, spatialGrid) {
    const { startX, startY, brickWidth, brickHeight, brickGap, rows, cols } = gridInfo;
    const cellW = brickWidth + brickGap;
    const cellH = brickHeight + brickGap;

    const col = Math.floor((bx - startX) / cellW);
    const row = Math.floor((by - startY) / cellH);

    const result = [];

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < rows && c >= 0 && c < cols) {
                const brick = spatialGrid[r]?.[c];
                if (brick?.alive) result.push(brick);
            }
        }
    }

    return result;
}

/**
 * Generate demo grid with realistic heatmap pattern
 * @returns {number[][]}
 */
export function generateDemoGrid() {
    function generateSingleYear(y) {
        const grid = [];
        for (let row = 0; row < 7; row++) {
            const rowData = [];
            for (let col = 0; col < 52; col++) {
                const r = Math.random();
                const dayFactor = (row === 0 || row === 6) ? 0.6 : 1;
                const timeFactor = Math.sin((col / 52) * Math.PI * 2 + (y * 0.5)) * 0.4 + 0.6;
                const streakFactor = (col > 20 && col < 35) ? 1.3 : 1;
                const p = r * dayFactor * timeFactor * streakFactor;
                let hp = 0;
                if (p > 0.8) hp = 4;
                else if (p > 0.6) hp = 3;
                else if (p > 0.4) hp = 2;
                else if (p > 0.2) hp = 1;
                rowData.push(hp);
            }
            grid.push(rowData);
        }
        return grid;
    }

    const currentYear = new Date().getFullYear();
    const yearsData = [];
    for (let i = 0; i < 5; i++) {
        yearsData.push({
            year: currentYear - i,
            totalContributions: 800 - i * 50,
            grid: generateSingleYear(currentYear - i)
        });
    }

    return { 
        grid: yearsData[0].grid, 
        totalContributions: yearsData[0].totalContributions,
        years: yearsData,
        totalAllTime: 3500
    };
}

/**
 * Convert GitHub API weeks to grid
 * @param {Array} weeks
 * @returns {{grid: number[][], metadata: Array<Array<{date:string,count:number}>>}}
 */
export function weeksToGrid(weeks) {
    const grid = Array.from({ length: 7 }, () => []);
    const metadata = Array.from({ length: 7 }, () => []);

    for (const week of weeks) {
        for (let day = 0; day < 7; day++) {
            const dayData = week.contributionDays[day];
            if (dayData) {
                grid[day].push(levelToHp(dayData.contributionLevel));
                metadata[day].push({
                    date: dayData.date,
                    count: dayData.contributionCount,
                });
            }
        }
    }

    return { grid, metadata };
}
