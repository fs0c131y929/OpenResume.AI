/ api/analyze.js — Vercel serverless function
// Proxies requests to the Anthropic API so your key stays server-side

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY environment variable is not set.' });
  }

  try {
    const { system, messages, tools } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body: messages array required.' });
    }

    const payload = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 5000,
      system,
      messages,
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Enable web search beta if tools include it
        ...(tools && tools.some(t => t.type === 'web_search_20250305')
          ? { 'anthropic-beta': 'web-search-2025-03-05' }
          : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return res.status(anthropicRes.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
