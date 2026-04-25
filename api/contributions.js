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

import { fetchContributions } from '../generator/fetch-contributions.js';

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
        const data = await fetchContributions(username);
        
        // Cache for 1 hour
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({
            error: 'Internal server error',
            message: err.message,
        });
    }
}
