// Vercel serverless function. Keys live in Vercel environment variables, never in the page.
// AI_PROVIDER = "gemini" (default, has a free tier) or "claude"
const PROMPT =
  'You are a gentle writing editor for a personal journal. Fix spelling, grammar and punctuation, ' +
  'and replace unclear or misheard words with the right ones. Keep the writer\'s voice, meaning and ' +
  'first-person style. Do not add new ideas. Return only the corrected text, with no commentary.';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const text = (req.body && req.body.text || '').slice(0, 20000);
  if (!text.trim()) return res.status(400).json({ error: 'No text sent' });

  try {
    let out = '';
    if ((process.env.AI_PROVIDER || 'gemini') === 'claude') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-5-5',
          max_tokens: 4000,
          system: PROMPT,
          messages: [{ role: 'user', content: text }]
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error && d.error.message || 'Claude request failed');
      out = d.content.map(c => c.text || '').join('');
    } else {
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
          process.env.GEMINI_API_KEY,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: PROMPT }] },
            contents: [{ role: 'user', parts: [{ text }] }]
          })
        }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error && d.error.message || 'Gemini request failed');
      out = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    }
    return res.status(200).json({ text: out.trim() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
