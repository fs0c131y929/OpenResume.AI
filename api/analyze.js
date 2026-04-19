export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { system, messages, tools } = req.body;

  if (!system || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing system, messages, or tools in request body' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error: missing API key' });
  }

  try {
    console.log('Calling Anthropic API with web search...');
    
    const payload = {
      model: 'claude-opus-4-20250805',
      max_tokens: 4096,
      system: system,
      messages: messages,
    };

    // Add tools if provided
    if (tools && Array.isArray(tools) && tools.length > 0) {
      payload.tools = tools;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      return res.status(response.status).json({ 
        error: `Anthropic API error: ${response.status}`,
        details: errorText.substring(0, 500)
      });
    }

    const data = await response.json();
    console.log('API response received, content blocks:', data.content?.length || 0);

    // Return the full response including all content blocks
    // The frontend will filter for text blocks
    if (!data.content || data.content.length === 0) {
      console.error('No content in API response');
      return res.status(500).json({ error: 'No response content from Claude' });
    }

    // Return the complete API response so frontend can handle it
    return res.status(200).json(data);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: error.message || 'Server error',
      type: error.constructor.name
    });
  }
}
