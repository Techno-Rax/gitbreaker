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
        topPadding, startX, startY,
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
    function shuffle(array) {
        const clone = [...array];
        for (let i = clone.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [clone[i], clone[j]] = [clone[j], clone[i]];
        }
        return clone;
    }

    function countWeightedContributions(grid) {
        const hpWeight = { 1: 2, 2: 6, 3: 11, 4: 17 };
        let total = 0;
        for (const row of grid) {
            for (const hp of row) {
                total += hpWeight[hp] || 0;
            }
        }
        return total;
    }

    function generateSingleYear(y, profile) {
        const grid = [];
        for (let row = 0; row < 7; row++) {
            const rowData = [];
            for (let col = 0; col < 52; col++) {
                const dayFactor = (row === 0 || row === 6) ? profile.weekendWeight : 1;
                const season = Math.sin((col / 52) * Math.PI * 2 + profile.phase + y * 0.11) * profile.seasonAmp + profile.seasonBias;
                const streak = (col >= profile.streakStart && col <= profile.streakEnd) ? profile.streakBoost : 1;
                const burst = Math.random() < profile.burstChance ? profile.burstBoost : 1;
                const noise = 0.72 + Math.random() * 0.58;
                const p = noise * dayFactor * season * streak * burst;

                let hp = 0;
                if (p > 1.08) hp = 4;
                else if (p > 0.86) hp = 3;
                else if (p > 0.62) hp = 2;
                else if (p > 0.38) hp = 1;

                rowData.push(hp);
            }
            grid.push(rowData);
        }
        return grid;
    }

    const profilePool = shuffle([
        { weekendWeight: 0.52, seasonAmp: 0.33, seasonBias: 0.52, streakStart: 8, streakEnd: 18, streakBoost: 1.18, burstChance: 0.05, burstBoost: 1.14, phase: Math.random() * Math.PI * 2 },
        { weekendWeight: 0.66, seasonAmp: 0.4, seasonBias: 0.62, streakStart: 19, streakEnd: 33, streakBoost: 1.34, burstChance: 0.08, burstBoost: 1.23, phase: Math.random() * Math.PI * 2 },
        { weekendWeight: 0.74, seasonAmp: 0.47, seasonBias: 0.7, streakStart: 30, streakEnd: 42, streakBoost: 1.42, burstChance: 0.11, burstBoost: 1.32, phase: Math.random() * Math.PI * 2 },
        { weekendWeight: 0.58, seasonAmp: 0.36, seasonBias: 0.58, streakStart: 12, streakEnd: 24, streakBoost: 1.24, burstChance: 0.06, burstBoost: 1.18, phase: Math.random() * Math.PI * 2 },
        { weekendWeight: 0.69, seasonAmp: 0.44, seasonBias: 0.66, streakStart: 24, streakEnd: 40, streakBoost: 1.38, burstChance: 0.09, burstBoost: 1.27, phase: Math.random() * Math.PI * 2 },
    ]);

    const currentYear = new Date().getFullYear();
    const yearsData = [];
    for (let i = 0; i < 5; i++) {
        const profile = profilePool[i % profilePool.length];
        const year = currentYear - i;
        const grid = generateSingleYear(year, profile);
        yearsData.push({
            year,
            totalContributions: countWeightedContributions(grid),
            grid,
        });
    }

    const totalAllTime = yearsData.reduce((sum, y) => sum + y.totalContributions, 0);

    return { 
        grid: yearsData[0].grid, 
        totalContributions: yearsData[0].totalContributions,
        years: yearsData,
        totalAllTime,
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
