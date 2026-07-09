// troy-ielts backend
// This server holds the real Gemini API key and proxies requests from the
// frontend so the key is never exposed in browser-side JavaScript.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); // in production, restrict this to your own domain only
app.use(express.json({ limit: '2mb' }));
app.use(express.static('public'));

const TROY_API_KEY = process.env.GEMINI_API_KEY; // set this in your hosting provider's env vars
// Flash / Flash-Lite are the models available on Gemini's free tier.
// Flash-Lite has the most generous free-tier quota (15 RPM / 1,000 requests
// per day vs Flash's 10 RPM / 250 RPD), so it's the safer default while testing.
// Check https://ai.google.dev/gemini-api/docs/rate-limits for current limits before deploying.
const TROY_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

if (!TROY_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY is not set. Requests will fail.');
}
console.log(`Using Gemini model: ${TROY_MODEL}`);

// Gemini's JSON mode sometimes still emits raw/un-escaped newline or tab
// characters INSIDE a JSON string value (e.g. inside a multi-paragraph essay).
// That's invalid JSON and breaks JSON.parse() on the frontend with errors like
// "Unterminated string in JSON". This walks the text character by character,
// tracking whether we're inside a quoted string, and escapes control
// characters only when they appear inside a string — leaving the actual JSON
// structure (braces, commas, real whitespace between tokens) untouched.
function sanitizeJsonControlChars(text) {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        result += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        result += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        result += ch;
        continue;
      }
      if (ch === '\n') { result += '\\n'; continue; }
      if (ch === '\r') { continue; }
      if (ch === '\t') { result += '\\t'; continue; }
      result += ch;
    } else {
      if (ch === '"') { inString = true; }
      result += ch;
    }
  }
  return result;
}

app.post('/api/troy-generate', async (req, res) => {
  try {
    const { system, userText, maxTokens } = req.body;
    if (!userText) {
      return res.status(400).json({ error: 'Missing userText' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${TROY_MODEL}:generateContent?key=${TROY_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        generationConfig: {
          maxOutputTokens: maxTokens || 1500,
          temperature: 0.7,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Upstream error:', errText);
      // 429 = hit the free-tier RPM/RPD limit; 503 = Google's model temporarily overloaded
      if (response.status === 429) {
        return res.status(429).json({ error: 'RATE_LIMITED' });
      }
      if (response.status === 503) {
        return res.status(503).json({ error: 'OVERLOADED' });
      }
      return res.status(502).json({ error: 'Upstream request failed' });
    }

    const data = await response.json();
    const candidate = data.candidates && data.candidates[0];
    const text = candidate && candidate.content && candidate.content.parts
      ? candidate.content.parts.map(p => p.text || '').join('')
      : null;

    if (!text) {
      return res.status(502).json({ error: 'Empty response' });
    }
    res.json({ text: sanitizeJsonControlChars(text) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`troy-ielts backend running on port ${PORT}`));