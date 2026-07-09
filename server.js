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
// If the primary model is overloaded (503), automatically fall back to trying
// these other free-tier models before giving up.
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'].filter(m => m !== TROY_MODEL);
const MODEL_ATTEMPT_ORDER = [TROY_MODEL, ...FALLBACK_MODELS];

// Minimum time between requests to avoid hitting RPM limits (10-15 RPM => ~4-6s)
const MIN_INTERVAL_MS = 6500;
let lastRequestTimestamp = 0;

if (!TROY_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY is not set. Requests will fail.');
}
console.log(`Using Gemini model: ${TROY_MODEL} (fallback order: ${MODEL_ATTEMPT_ORDER.join(' -> ')})`);

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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callGemini(model, system, userText, maxTokens) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${TROY_API_KEY}`;
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
  return response;
}

app.post('/api/troy-generate', async (req, res) => {
  try {
    const { system, userText, maxTokens } = req.body;
    if (!userText) {
      return res.status(400).json({ error: 'Missing userText' });
    }

    const MAX_TOTAL_ATTEMPTS = 6;
    let attemptCount = 0;
    let lastStatus = null;
    let lastError = null;

    while (attemptCount < MAX_TOTAL_ATTEMPTS) {
      // Throttle requests to respect free-tier RPM limits
      const now = Date.now();
      const waitTime = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestTimestamp));
      if (waitTime > 0) await sleep(waitTime);
      lastRequestTimestamp = Date.now();

      const model = MODEL_ATTEMPT_ORDER[attemptCount % MODEL_ATTEMPT_ORDER.length];
      try {
        const response = await callGemini(model, system, userText, maxTokens);

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates && data.candidates[0];
          const text = candidate && candidate.content && candidate.content.parts
            ? candidate.content.parts.map(p => p.text || '').join('')
            : null;
          if (!text) {
            lastStatus = 502;
            lastError = 'Empty response from model';
            // fall through to retry with next model
          } else {
            return res.json({ text: sanitizeJsonControlChars(text), modelUsed: model });
          }
        } else {
          lastStatus = response.status;
          const errText = await response.text();
          console.error(`Upstream error [model=${model}, attempt=${attemptCount + 1}]:`, errText);
          if (response.status === 429 || response.status === 503) {
            // exponential backoff for rate limits / overload
            const backoff = Math.min(30000, 2000 * Math.pow(2, attemptCount));
            await sleep(backoff);
          } else {
            await sleep(500); // small delay before trying another model
          }
        }
      } catch (fetchErr) {
        console.error(`Fetch error [model=${model}, attempt=${attemptCount + 1}]:`, fetchErr);
        lastStatus = 500;
        lastError = fetchErr.message;
        await sleep(1000);
      }
      attemptCount++;
    }

    // All attempts exhausted
    if (lastStatus === 429) {
      return res.status(429).json({ error: 'RATE_LIMITED' });
    }
    if (lastStatus === 503) {
      return res.status(503).json({ error: 'OVERLOADED' });
    }
    return res.status(502).json({ error: 'Upstream request failed', detail: lastError });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`troy-ielts backend running on port ${PORT}`));
