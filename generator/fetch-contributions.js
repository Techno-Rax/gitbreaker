/**
 * Fetch GitHub contributions via GraphQL API
 * Requires GITHUB_TOKEN environment variable
 *
 * Usage: node generator/fetch-contributions.js [username]
 */

const GITHUB_API = 'https://api.github.com/graphql';

// Generate dynamic query for up to 5 years
function buildMultiYearQuery(yearsStr) {
    let query = `query($username: String!) { user(login: $username) { `;
    for (const [alias, from, to] of yearsStr) {
        query += `${alias}: contributionsCollection(from: "${from}", to: "${to}") { contributionCalendar { totalContributions weeks { contributionDays { contributionCount date contributionLevel } } } } `;
    }
    query += `} }`;
    return query;
}

/**
 * Fetch contribution data from GitHub GraphQL API
 */
export async function fetchContributions(username, token = process.env.GITHUB_TOKEN) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearsToFetch = [];
    
    // We will fetch this year and the previous 4 years (max 5)
    for (let i = 0; i < 5; i++) {
        const y = currentYear - i;
        const from = `${y}-01-01T00:00:00Z`;
        const to = i === 0 ? now.toISOString() : `${y}-12-31T23:59:59Z`;
        yearsToFetch.push([`y${y}`, from, to]);
    }

    const query = buildMultiYearQuery(yearsToFetch);
    const variables = { username };

    const response = await fetch(GITHUB_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}: ${await response.text()}`);
    }

    const json = await response.json();
    if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);

    const user = json.data?.user;
    if (!user) throw new Error(`No contribution data found for user "${username}"`);

    const yearsData = [];
    let totalAllTime = 0;

    for (let i = 0; i < 5; i++) {
        const y = currentYear - i;
        const calendar = user[`y${y}`]?.contributionCalendar;
        if (calendar && calendar.totalContributions > 0) {
            yearsData.push({
                year: y,
                weeks: calendar.weeks,
                totalContributions: calendar.totalContributions,
                grid: weeksToGrid(calendar.weeks)
            });
            totalAllTime += calendar.totalContributions;
        } else if (i === 0 && calendar) {
            // Include current year even if 0 manually
             yearsData.push({
                year: y,
                weeks: calendar.weeks,
                totalContributions: calendar.totalContributions,
                grid: weeksToGrid(calendar.weeks)
            });
        } else {
             // Stop fetching older years if a full year is entirely empty (likely beyond account creation)
             // Actually, some users have gap years. We'll include it if it's empty but limit arrays.
             break;
        }
    }

    // Default return structure for backward compatibility picks the first (current) year
    // but adds 'years' array for the new multi-timeline logic
    const current = yearsData[0] || { weeks: [], totalContributions: 0, grid: [] };
    
    return { 
        weeks: current.weeks, 
        totalContributions: current.totalContributions, 
        grid: current.grid,
        years: yearsData,
        totalAllTime
    };
}

/**
 * Map contribution level string to HP
 */
function levelToHp(level) {
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
 * Convert GitHub API weeks data to 7×N grid format
 */
function weeksToGrid(weeks) {
    if (!weeks || weeks.length === 0) return [];
    const grid = Array.from({ length: 7 }, () => []);

    for (const week of weeks) {
        // Pre-fill days to ensure alignment if week starts mid-way
        // Actually, GitHub API usually provides the day index (0=sun) inside week mapping, but they just list them.
        for (let day = 0; day < 7; day++) {
            const dayData = week.contributionDays.find(d => new Date(d.date).getDay() === day);
            if (dayData) {
                grid[day].push(levelToHp(dayData.contributionLevel));
            } else {
                 // Important: if no day data, we inject an empty space to maintain column alignment
                grid[day].push(0);
            }
        }
    }

    return grid;
}

/**
 * Generate a fallback demo grid
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

// CLI entry point
if (process.argv[1]?.includes('fetch-contributions')) {
    (async () => {
        const username = process.argv[2] || process.env.GITHUB_USERNAME || 'techno-rax';
        const token = process.env.GITHUB_TOKEN;

        if (!token) {
            console.error('Error: GITHUB_TOKEN environment variable is required');
            console.error('Usage: GITHUB_TOKEN=ghp_xxx node generator/fetch-contributions.js [username]');
            process.exit(1);
        }

        try {
            const result = await fetchContributions(username, token);
            console.log(`✅ Fetched ${result.totalContributions} contributions for ${username}`);
            console.log(`   Grid: ${result.grid.length} rows × ${result.grid[0].length} cols`);
            const brickCount = result.grid.flat().filter(hp => hp > 0).length;
            console.log(`   Bricks: ${brickCount}`);

            // Output grid JSON
            const fs = await import('fs');
            const { join, dirname } = await import('path');
            const { fileURLToPath } = await import('url');
            const __dirname = dirname(fileURLToPath(import.meta.url));
            const outputDir = join(__dirname, '..', 'output');
            fs.mkdirSync(outputDir, { recursive: true });
            fs.writeFileSync(join(outputDir, 'contributions.json'), JSON.stringify(result, null, 2));
            console.log(`   Saved to output/contributions.json`);
        } catch (err) {
            console.error('❌', err.message);
            process.exit(1);
        }
    })();
}
