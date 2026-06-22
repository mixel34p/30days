// api/igdb.js — Serverless proxy for IGDB API (Vercel)
// Keeps Twitch credentials server-side, never exposed to the frontend.

export default async function handler(req, res) {
  // CORS headers — allow the frontend to call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, query } = req.body || {};

  if (!endpoint || !query) {
    return res.status(400).json({ error: 'Missing endpoint or query' });
  }

  // Allowed endpoints to prevent abuse
  const ALLOWED_ENDPOINTS = ['games', 'characters', 'covers'];
  if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
    return res.status(400).json({ error: 'Endpoint not allowed' });
  }

  const CLIENT_ID = process.env.IGDB_CLIENT_ID;
  const CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'IGDB credentials not configured' });
  }

  try {
    // Step 1 — Get OAuth token from Twitch
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
      { method: 'POST' }
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Twitch token error:', err);
      return res.status(502).json({ error: 'Failed to obtain access token' });
    }

    const { access_token } = await tokenRes.json();

    // Step 2 — Query IGDB
    const igdbRes = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': CLIENT_ID,
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'text/plain',
      },
      body: query,
    });

    if (!igdbRes.ok) {
      const err = await igdbRes.text();
      console.error('IGDB error:', err);
      return res.status(502).json({ error: 'IGDB request failed', detail: err });
    }

    const data = await igdbRes.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal proxy error', detail: err.message });
  }
}
