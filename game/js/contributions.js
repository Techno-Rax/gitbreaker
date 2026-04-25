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
            if (result && result.grid && result.grid.length > 0) {
                return result;
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
    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const proxyUrl = isLocal 
        ? `http://localhost:3000/api/contributions?username=${encodeURIComponent(username)}`
        : `https://gitbreaker-api.vercel.app/api/contributions?username=${encodeURIComponent(username)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Proxy returned ${response.status}`);

        const data = await response.json();

        // New V2.3 format with years array
        if (data.years && data.years.length > 0) {
            return {
                grid: data.grid,
                totalContributions: data.totalAllTime || countTotal(data.grid),
                years: data.years
            };
        }

        // Backward compatibility
        if (data.weeks) {
            const grid = weeksToGrid(data.weeks);
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
