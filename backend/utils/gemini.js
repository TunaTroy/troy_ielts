// AI API utility functions - supports three-tier fallback: Gemini (primary) -> Cloudflare (fallback 1) -> OpenRouter (fallback 2)

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

// OpenRouter models (fallback 2)
// 'openrouter/free' is OpenRouter's own auto-router (launched Feb 2026): it always
// picks *some* currently-live free model for you, so it survives the constant
// rotation/retirement of individual ":free" model IDs (the old default,
// 'google/gemini-2.5-flash:free', no longer exists as a free variant).
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
const OPENROUTER_FALLBACK_MODELS = ['meta-llama/llama-3.3-70b-instruct:free'].filter(m => m !== OPENROUTER_MODEL);
const OPENROUTER_MODELS = [OPENROUTER_MODEL, ...OPENROUTER_FALLBACK_MODELS];

// Cloudflare models (fallback 1)
// '@cf/meta/llama-3-8b-instruct' is deprecated; use the current Llama 3.1 model.
const CLOUDFLARE_MODEL = process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.1-8b-instruct';
const CLOUDFLARE_FALLBACK_MODELS = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/mistral/mistral-7b-instruct-v0.1'].filter(m => m !== CLOUDFLARE_MODEL);
const CLOUDFLARE_MODELS = [CLOUDFLARE_MODEL, ...CLOUDFLARE_FALLBACK_MODELS];

// Gemini models (primary)
// NOTE: Gemini 1.0, 1.5, 2.0-flash and 2.0-flash-lite have all been shut down by
// Google (404 on every request) - the old fallback list below was 4 dead models
// that got tried (and burned time) on every single request before falling through
// to Cloudflare/OpenRouter. Replaced with the current 2.5-series models.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro'].filter(m => m !== GEMINI_MODEL);
const GEMINI_MODELS = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS];

// Model attempt order: Gemini (primary) -> Cloudflare (fallback 1) -> OpenRouter (fallback 2)
const MODEL_ATTEMPT_ORDER = GEMINI_API_KEY && GEMINI_MODELS.length > 0
  ? [...GEMINI_MODELS, ...(CLOUDFLARE_API_TOKEN && CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_MODELS.length > 0 ? CLOUDFLARE_MODELS : []), ...(OPENROUTER_API_KEY && OPENROUTER_MODELS.length > 0 ? OPENROUTER_MODELS : [])]
  : CLOUDFLARE_API_TOKEN && CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_MODELS.length > 0
    ? [...CLOUDFLARE_MODELS, ...(OPENROUTER_API_KEY && OPENROUTER_MODELS.length > 0 ? OPENROUTER_MODELS : [])]
    : OPENROUTER_API_KEY && OPENROUTER_MODELS.length > 0
      ? OPENROUTER_MODELS
      : [];

if (!OPENROUTER_API_KEY && !GEMINI_API_KEY && !CLOUDFLARE_API_TOKEN) {
  console.warn('WARNING: Neither OPENROUTER_API_KEY, GEMINI_API_KEY, nor CLOUDFLARE_API_TOKEN is set. Requests will fail.');
}

if (MODEL_ATTEMPT_ORDER.length === 0) {
  console.warn('WARNING: No AI models configured. Please set at least one API provider.');
}

console.log(`Using AI provider: ${GEMINI_API_KEY && GEMINI_MODELS.length > 0 ? 'Gemini (primary)' : ''}${CLOUDFLARE_API_TOKEN && CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_MODELS.length > 0 ? ' + Cloudflare (fallback 1)' : ''}${OPENROUTER_API_KEY && OPENROUTER_MODELS.length > 0 ? ' + OpenRouter (fallback 2)' : ''}`);
console.log(`Model attempt order: ${MODEL_ATTEMPT_ORDER.length > 0 ? MODEL_ATTEMPT_ORDER.join(' -> ') : 'None configured'}`);

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

// Helper to detect if model is OpenRouter, Cloudflare, or Gemini
function isOpenRouterModel(model) {
  return model.includes('/') || model.includes(':free');
}

function isCloudflareModel(model) {
  return model.startsWith('@cf/');
}

// Call OpenRouter API (OpenAI-compatible format)
async function callOpenRouter(model, system, userText, maxTokens, schema) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  const messages = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: userText });

  const requestBody = {
    model: model,
    messages: messages,
    max_tokens: maxTokens || 1500,
    temperature: 0.7
  };
  
  // OpenRouter supports JSON mode via response_format
  // Try with response_format first, fallback to without if it fails
  let useJsonFormat = false;
  if (schema) {
    requestBody.response_format = { type: 'json_object' };
    useJsonFormat = true;
  }

  let response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
      'X-Title': 'Troy IELTS' // Required by OpenRouter
    },
    body: JSON.stringify(requestBody)
  });

  // If response_format caused a 400 error, retry without it
  if (useJsonFormat && response.status === 400) {
    console.warn(`OpenRouter model ${model} does not support response_format, retrying without JSON mode...`);
    delete requestBody.response_format;
    response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Troy IELTS'
      },
      body: JSON.stringify(requestBody)
    });
  }

  return response;
}

// Call Cloudflare Workers AI API (OpenAI-compatible format)
async function callCloudflare(model, system, userText, maxTokens, schema) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;
  
  const messages = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: userText });

  const requestBody = {
    messages: messages,
    max_tokens: maxTokens || 1500,
    temperature: 0.7
  };
  
  // Cloudflare supports JSON mode via response_format
  // Try with response_format first, fallback to without if it fails
  let useJsonFormat = false;
  if (schema) {
    requestBody.response_format = { type: 'json_object' };
    useJsonFormat = true;
  }

  let response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`
    },
    body: JSON.stringify(requestBody)
  });

  // If response_format caused a 400 error, retry without it
  if (useJsonFormat && response.status === 400) {
    console.warn(`Cloudflare model ${model} does not support response_format, retrying without JSON mode...`);
    delete requestBody.response_format;
    response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`
      },
      body: JSON.stringify(requestBody)
    });
  }

  return response;
}

// Call Gemini API (with v1/v1beta endpoint fallback)
async function callGemini(model, system, userText, maxTokens, schema, useV1 = false) {
  const apiVersion = useV1 ? 'v1' : 'v1beta';
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
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

// Main function to call AI with fallback and retry logic
export async function callGeminiWithFallback(system, userText, maxTokens, schema) {
  let lastStatus = null;
  let lastError = null;
  const TOTAL_TIMEOUT_MS = 25000; // 25 seconds total timeout for entire fallback chain
  
  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), TOTAL_TIMEOUT_MS);
  });

  // Create the actual fallback logic promise
  const fallbackPromise = (async () => {
    for (const model of MODEL_ATTEMPT_ORDER) {
      const isOpenRouter = isOpenRouterModel(model);
      const isCloudflare = isCloudflareModel(model);
      const isGemini = !isOpenRouter && !isCloudflare;
      
      const apiKey = isOpenRouter ? OPENROUTER_API_KEY : (isCloudflare ? CLOUDFLARE_API_TOKEN : GEMINI_API_KEY);
      
      // Skip if no API key for this provider
      if (!apiKey) {
        console.log(`Skipping ${model} - no API key available`);
        continue;
      }

      const maxAttempts = isOpenRouter ? 1 : 2; // Reduced OpenRouter retry from 2 to 1 for faster fallback
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          let response;
          if (isOpenRouter) {
            response = await callOpenRouter(model, system, userText, maxTokens, schema);
          } else if (isCloudflare) {
            response = await callCloudflare(model, system, userText, maxTokens, schema);
          } else {
            // Gemini: try v1beta first, then v1 if 404
            response = await callGemini(model, system, userText, maxTokens, schema, false);
            if (response.status === 404 && attempt === 0) {
              console.log(`Gemini model ${model} not found in v1beta, trying v1 endpoint...`);
              response = await callGemini(model, system, userText, maxTokens, schema, true);
            }
          }

          if (response.ok) {
            const data = await response.json();
            let text = null;

            if (isOpenRouter || isCloudflare) {
              // OpenRouter and Cloudflare response format (OpenAI-compatible)
              const choice = data.choices && data.choices[0];
              text = choice && choice.message ? choice.message.content : null;
            } else {
              // Gemini response format
              const candidate = data.candidates && data.candidates[0];
              text = candidate && candidate.content && candidate.content.parts
                ? candidate.content.parts.map(p => p.text || '').join('')
                : null;
            }

            if (!text) {
              console.error(`Empty response from ${model}`);
              // Try next model on empty response
              break;
            }
            
            // Strip code fences for OpenRouter/Cloudflare if not using JSON mode
            if ((isOpenRouter || isCloudflare) && text) {
              text = stripCodeFences(text);
            }
            
            console.log(`✅ Success with model: ${model}`);
            return { text: sanitizeJsonControlChars(text), modelUsed: model };
          }

          const errText = await response.text();
          console.error(`Upstream error [model=${model}, attempt=${attempt + 1}]:`, errText);
          lastStatus = response.status;
          lastError = errText;

          if (response.status === 429) {
            // Rate/quota limited on this model.
            // NOTE: previously this slept up to 15s before retrying OpenRouter, but
            // OpenRouter's maxAttempts is 1, so that retry never actually happened -
            // it just burned time out of the TOTAL_TIMEOUT_MS budget for nothing.
            // Skip straight to the next model/provider instead.
            const provider = isGemini ? 'Gemini' : (isCloudflare ? 'Cloudflare' : 'OpenRouter');
            console.warn(`⚠️ ${provider} rate limited (429), switching to next provider...`);
            break;
          }
          if (response.status === 503 && attempt === 0) {
            // Transient overload — brief backoff, then retry the same model once.
            console.log(`Overloaded on ${model}, retrying with backoff...`);
            await sleep(2500);
            continue;
          }
          // Other errors, or second failed attempt: move on to the next fallback model.
          const provider = isGemini ? 'Gemini' : (isCloudflare ? 'Cloudflare' : 'OpenRouter');
          console.warn(`⚠️ ${provider} failed (${response.status}), switching to next provider...`);
          break;
        } catch (error) {
          console.error(`Exception calling ${model}:`, error.message);
          lastError = error.message;
          
          // Network errors or other exceptions - move to next provider
          const provider = isGemini ? 'Gemini' : (isCloudflare ? 'Cloudflare' : 'OpenRouter');
          console.warn(`⚠️ ${provider} encountered error (${error.message}), switching to next provider...`);
          break;
        }
      }
    }

    // All models/attempts exhausted.
    if (lastStatus === 429) {
      throw new Error('RATE_LIMITED');
    }
    if (lastStatus === 503) {
      throw new Error('OVERLOADED');
    }
    throw new Error(`All AI services are currently unavailable. Last error: ${lastError || 'Unknown error'}`);
  })();

  // Race between fallback logic and timeout
  try {
    return await Promise.race([fallbackPromise, timeoutPromise]);
  } catch (error) {
    if (error.message === 'TIMEOUT') {
      console.error(`⏱️ Total timeout exceeded (${TOTAL_TIMEOUT_MS}ms)`);
      throw new Error('TIMEOUT');
    }
    throw error;
  }
}