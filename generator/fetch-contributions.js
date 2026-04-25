/**
 * Fetch GitHub contributions via GraphQL API
 * Requires GITHUB_TOKEN environment variable
 *
 * Usage: node generator/fetch-contributions.js [username]
 */

const GITHUB_API = 'https://api.github.com/graphql';

const QUERY = `
query($username: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $username) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
            contributionLevel
          }
        }
      }
    }
  }
}
`;

/**
 * Fetch contribution data from GitHub GraphQL API
 * @param {string} username - GitHub username
 * @param {string} token - GitHub PAT
 * @returns {Promise<{weeks: Array, totalContributions: number, grid: number[][]}>}
 */
export async function fetchContributions(username, token) {
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const variables = {
        username,
        from: oneYearAgo.toISOString(),
        to: now.toISOString(),
    };

    const response = await fetch(GITHUB_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query: QUERY, variables }),
    });

    if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}: ${await response.text()}`);
    }

    const json = await response.json();

    if (json.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    }

    const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) {
        throw new Error(`No contribution data found for user "${username}"`);
    }

    const weeks = calendar.weeks;
    const totalContributions = calendar.totalContributions;
    const grid = weeksToGrid(weeks);

    return { weeks, totalContributions, grid };
}

/**
 * Map contribution level string to HP
 * @param {string} level
 * @returns {number}
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
 * @param {Array} weeks
 * @returns {number[][]}
 */
function weeksToGrid(weeks) {
    const grid = Array.from({ length: 7 }, () => []);

    for (const week of weeks) {
        for (let day = 0; day < 7; day++) {
            const dayData = week.contributionDays[day];
            if (dayData) {
                grid[day].push(levelToHp(dayData.contributionLevel));
            } else {
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
    const grid = [];
    for (let row = 0; row < 7; row++) {
        const rowData = [];
        for (let col = 0; col < 52; col++) {
            const r = Math.random();
            const dayFactor = (row === 0 || row === 6) ? 0.6 : 1;
            const timeFactor = Math.sin((col / 52) * Math.PI * 2 + 1) * 0.3 + 0.7;
            const p = r * dayFactor * timeFactor;
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

// CLI entry point
if (process.argv[1]?.includes('fetch-contributions')) {
    (async () => {
        const username = process.argv[2] || process.env.GITHUB_USERNAME || 'anoojshete';
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
