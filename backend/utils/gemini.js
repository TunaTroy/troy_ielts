// Gemini API utility functions

const TROY_API_KEY = process.env.GEMINI_API_KEY;
const TROY_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'].filter(m => m !== TROY_MODEL);
const MODEL_ATTEMPT_ORDER = [TROY_MODEL, ...FALLBACK_MODELS];

if (!TROY_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY is not set. Requests will fail.');
}
console.log(`Using Gemini model: ${TROY_MODEL} (fallback order: ${MODEL_ATTEMPT_ORDER.join(' -> ')})`);

// Sanitize JSON control characters to prevent parse errors
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

// Strip markdown code fences if present
function stripCodeFences(text) {
  let t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const m = t.match(fence);
  if (m) t = m[1].trim();
  return t;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callGemini(model, system, userText, maxTokens, schema) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${TROY_API_KEY}`;
  const generationConfig = {
    maxOutputTokens: maxTokens || 1500,
    temperature: 0.7,
    responseMimeType: 'application/json'
  };
  
  if (schema) {
    generationConfig.responseSchema = schema;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      generationConfig
    })
  });
  return response;
}

// Main function to call Gemini with fallback and retry logic
export async function callGeminiWithFallback(system, userText, maxTokens, schema) {
  let lastStatus = null;

  for (const model of MODEL_ATTEMPT_ORDER) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await callGemini(model, system, stripCodeFences(userText), maxTokens, schema);

      if (response.ok) {
        const data = await response.json();
        const candidate = data.candidates && data.candidates[0];
        const text = candidate && candidate.content && candidate.content.parts
          ? candidate.content.parts.map(p => p.text || '').join('')
          : null;
        if (!text) {
          throw new Error('Empty response');
        }
        return { text: sanitizeJsonControlChars(text), modelUsed: model };
      }

      const errText = await response.text();
      console.error(`Upstream error [model=${model}, attempt=${attempt + 1}]:`, errText);
      lastStatus = response.status;

      if (response.status === 429) {
        // Rate/quota limited on this model — no point retrying it, move to next model.
        break;
      }
      if (response.status === 503 && attempt === 0) {
        // Transient overload — brief backoff, then retry the same model once.
        await sleep(2500);
        continue;
      }
      // Other errors, or second failed attempt: move on to the next fallback model.
      break;
    }
  }

  // All models/attempts exhausted.
  if (lastStatus === 429) {
    throw new Error('RATE_LIMITED');
  }
  if (lastStatus === 503) {
    throw new Error('OVERLOADED');
  }
  throw new Error('Upstream request failed');
}
