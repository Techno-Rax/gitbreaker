/**
 * Contributions — Fetch GitHub contribution data
 * @module contributions
 */

import { weeksToGrid } from './grid.js';

/**
 * Fetch contribution data for a GitHub user
 * Uses a serverless proxy to avoid CORS/auth issues
 * Falls back to scraping the public profile page
 *
 * @param {string} username - GitHub username
 * @returns {Promise<{grid: number[][], totalContributions: number}>}
 */
export async function fetchContributions(username) {
    // Try multiple strategies in order
    const strategies = [
        () => fetchFromProxy(username),
        () => fetchFromPublicPage(username),
    ];

    for (const strategy of strategies) {
        try {
            const result = await strategy();
            const normalized = normalizeContributionResult(result);
            if (normalized) {
                return normalized;
            }
        } catch (err) {
            console.warn('Fetch strategy failed:', err.message);
        }
    }

    throw new Error(`Could not fetch contributions for "${username}"`);
}

/**
 * Strategy 1: Fetch from GitHub's public contribution page
 * Scrapes the contribution data from the user's profile page
 * @param {string} username
 */
async function fetchFromPublicPage(username) {
    // GitHub exposes contribution data in JSON at this endpoint
    const url = `https://github-contributions-api.jogruber.de/v4/${username}?y=last`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const data = await response.json();

    if (!data.contributions || data.contributions.length === 0) {
        throw new Error('No contribution data returned');
    }

    // Convert flat array to 7×52 grid
    const grid = contributionsToGrid(data.contributions);

    return {
        grid,
        totalContributions: data.total?.lastYear || countTotal(grid),
        years: [{ year: new Date().getFullYear(), grid }]
    };
}

/**
 * Strategy 2: Fetch from our serverless proxy
 * This handles GitHub GraphQL auth server-side
 * @param {string} username
 */
async function fetchFromProxy(username) {
    const proxyUrl = `/api/contributions?username=${encodeURIComponent(username)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Proxy returned ${response.status}`);

        const data = await response.json();

        // New V2.3 format with years array
        if (Array.isArray(data.years) && data.years.length > 0) {
            const years = [];
            for (const entry of data.years) {
                if (!entry) continue;

                let yearGrid = entry.grid;
                if (!isValidGrid(yearGrid) && Array.isArray(entry.weeks) && entry.weeks.length > 0) {
                    const converted = weeksToGrid(entry.weeks);
                    yearGrid = Array.isArray(converted?.grid) ? converted.grid : converted;
                }

                if (!isValidGrid(yearGrid)) continue;

                years.push({
                    year: entry.year,
                    grid: yearGrid,
                    totalContributions: entry.totalContributions || countTotal(yearGrid),
                });
            }

            const fallbackGrid = isValidGrid(data.grid) ? data.grid : pickPrimaryGrid(years);
            return {
                grid: fallbackGrid,
                totalContributions: data.totalContributions || countTotal(fallbackGrid || []),
                years,
                totalAllTime: data.totalAllTime,
            };
        }

        // Backward compatibility
        if (data.weeks) {
            const converted = weeksToGrid(data.weeks);
            const grid = Array.isArray(converted?.grid) ? converted.grid : converted;
            return {
                grid,
                totalContributions: data.totalContributions || 0,
                years: [{ year: new Date().getFullYear(), grid }]
            };
        }

        if (data.grid) {
            return {
                grid: data.grid,
                totalContributions: data.totalContributions || 0,
                years: [{ year: new Date().getFullYear(), grid: data.grid }]
            };
        }

        throw new Error('Invalid proxy response format');
    } catch(err) {
        throw err;
    }
}

/**
 * Convert flat contributions array [{date, count, level}] to 7×52 grid
 * @param {Array<{date: string, count: number, level: number}>} contributions
 * @returns {number[][]} 7×52 grid of HP values
 */
function contributionsToGrid(contributions) {
    // Sort by date
    contributions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Take last 364 days (52 weeks × 7 days)
    const recent = contributions.slice(-364);

    // Initialize grid: 7 rows (days) × 52 cols (weeks)
    const grid = Array.from({ length: 7 }, () => []);

    for (let i = 0; i < recent.length; i++) {
        const dayOfWeek = new Date(recent[i].date).getDay(); // 0=Sun, 6=Sat
        const hp = levelToHpFromCount(recent[i].count);
        grid[dayOfWeek].push(hp);
    }

    // Pad columns to 52 if needed
    const maxCols = Math.max(...grid.map(r => r.length));
    for (const row of grid) {
        while (row.length < maxCols) {
            row.push(0);
        }
    }

    return grid;
}

/**
 * Map contribution count to HP
 * @param {number} count
 * @returns {number} HP (0–4)
 */
function levelToHpFromCount(count) {
    if (count === 0) return 0;
    if (count <= 3) return 1;
    if (count <= 7) return 2;
    if (count <= 12) return 3;
    return 4;
}

/**
 * Count total contributions from grid
 * @param {number[][]} grid
 * @returns {number}
 */
function countTotal(grid) {
    let total = 0;
    for (const row of grid) {
        for (const hp of row) {
            total += hp;
        }
    }
    return total;
}

function isValidGrid(grid) {
    return Array.isArray(grid) && grid.length > 0 && grid.every(row => Array.isArray(row));
}

function pickPrimaryGrid(years) {
    if (!Array.isArray(years)) return null;

    for (const year of years) {
        if (isValidGrid(year?.grid) && countTotal(year.grid) > 0) {
            return year.grid;
        }
    }

    for (const year of years) {
        if (isValidGrid(year?.grid)) {
            return year.grid;
        }
    }

    return null;
}

function normalizeContributionResult(result) {
    if (!result) return null;

    const years = Array.isArray(result.years)
        ? result.years.filter(y => isValidGrid(y?.grid))
        : [];

    let grid = isValidGrid(result.grid) ? result.grid : pickPrimaryGrid(years);
    if (!isValidGrid(grid)) {
        return null;
    }

    const safeYears = years.length > 0
        ? years
        : [{ year: new Date().getFullYear(), grid, totalContributions: countTotal(grid) }];

    const totalAllTime = result.totalAllTime || safeYears.reduce((acc, y) => {
        const value = Number(y.totalContributions);
        return acc + (Number.isFinite(value) ? value : countTotal(y.grid));
    }, 0);

    return {
        grid,
        years: safeYears,
        totalContributions: result.totalContributions || countTotal(grid),
        totalAllTime,
    };
}
