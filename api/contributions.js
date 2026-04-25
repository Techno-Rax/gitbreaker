/**
 * Vercel Serverless Function — GitHub Contributions Proxy
 *
 * Fetches GitHub contribution data server-side, avoiding
 * the need for client-side auth tokens.
 *
 * Deploy on Vercel with env var GITHUB_TOKEN set.
 *
 * Endpoint: GET /api/contributions?username=<github-username>
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

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ error: 'Missing "username" query parameter' });
    }

    // Validate username (basic sanitization)
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
        return res.status(400).json({ error: 'Invalid GitHub username format' });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        return res.status(500).json({ error: 'Server misconfigured: GITHUB_TOKEN not set' });
    }

    try {
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
            const text = await response.text();
            return res.status(response.status).json({
                error: `GitHub API error: ${response.status}`,
                details: text,
            });
        }

        const json = await response.json();

        if (json.errors) {
            return res.status(400).json({
                error: 'GraphQL errors',
                details: json.errors,
            });
        }

        const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
        if (!calendar) {
            return res.status(404).json({
                error: `No contribution data found for user "${username}"`,
            });
        }

        // Cache for 1 hour
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

        return res.status(200).json({
            weeks: calendar.weeks,
            totalContributions: calendar.totalContributions,
        });
    } catch (err) {
        return res.status(500).json({
            error: 'Internal server error',
            message: err.message,
        });
    }
}
