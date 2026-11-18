// Astra model client (Plan §5 "Local-model and deployment boundary").
//
// Talks to Astra's own backend at /api/astra (server/astra-llm.js), which holds
// the OpenAI key server-side. The browser never sees the key.
//
// The model never computes numbers. Every reply is re-validated by validator.js
// in the agent; unsupported numbers or boundary violations are dropped and the
// deterministic answer is kept. If the backend is not configured (no
// OPENAI_API_KEY), it answers 503 and Astra silently stays deterministic.

async function post(url, payload, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(json.error || `Astra backend HTTP ${res.status}`), { status: res.status });
    return json;
  } finally {
    clearTimeout(timer);
  }
}

export function createPhraser(config = {}) {
  const url = (config.url || '/api/astra').replace(/\/$/, '');
  if (config.disabled) return null;
  let disabled = false; // flips on 503 so we stop calling an unconfigured backend
  let model = null;

  const guard = async (payload, timeoutMs) => {
    if (disabled) return null;
    try {
      const json = await post(url, payload, timeoutMs);
      model = json.model ?? model;
      return typeof json.text === 'string' ? json.text.trim() : null;
    } catch (e) {
      if (e.status === 503 || e.status === 404) { disabled = true; return null; }
      throw e;
    }
  };

  return {
    get name() { return model ? `openai:${model}` : 'model'; },
    get enabled() { return !disabled; },
    rephrase: (text, { timeoutMs = 8000 } = {}) => guard({ mode: 'phrase', text }, timeoutMs),
    answer: (question, context, history = [], { timeoutMs = 60000 } = {}) => guard({ mode: 'answer', question, context, history }, timeoutMs),
  };
}
