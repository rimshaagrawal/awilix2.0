// Astra model backend (server-side only).
//
// Holds the OpenAI key and talks to the model so the key never reaches the
// browser bundle. Used by the Vite dev server (vite.config.ts) and by the
// Vercel function in api/astra.js.
//
// The model is a phrasing and conversation layer, not a source of science:
//  - "phrase": rewrite a deterministic Astra answer more naturally.
//  - "answer": answer a question the deterministic router could not handle,
//    using ONLY the reviewed fact sheet plus the live app snapshot sent by the
//    client. The browser re-validates the reply (numbers + scientific boundaries)
//    and drops anything it cannot trace.
//
// Env: OPENAI_API_KEY (required), OPENAI_MODEL (default gpt-4o-mini),
//      OPENAI_BASE_URL (default https://api.openai.com/v1; any OpenAI-compatible
//      endpoint works, e.g. Ollama at http://localhost:11434/v1).

import { VIEWS, KNOWLEDGE, STATIC_FACTS, BOUNDARIES } from '../src/astra/facts.js';

const MAX_BODY = 24_000;

const RULES = [
  'You are Astra, the guide inside Awilix, a lunar south-pole landing-site explorer for students aged 15-18.',
  'Answer ONLY from the FACT SHEET and LIVE APP STATE below. If they do not contain the answer, say you do not have a grounded answer and suggest what the user can ask or open in the app instead.',
  'Never invent numbers. Only use numbers that appear in the fact sheet or live state, copied exactly.',
  'Never state power in watts, never promise a guaranteed radio link, never name a single best site (sites are compared for a chosen priority), never claim ice is measured or confirmed at a site, never transfer Chandrayaan-3 results to the six Awilix sites.',
  'Say whether a number is calculated (science worker) or illustrative when it matters.',
  'Be concise: at most 4 short sentences, plain text, no markdown headings or lists.',
].join(' ');

const PHRASE_RULES = [
  'You rewrite short explanations for students aged 15-18.',
  'Keep every number, unit and caveat exactly; add no new facts or numbers;',
  'never claim watts, guaranteed radio links, a best site, or measured ice;',
  'at most 3 sentences. Return only the rewritten text.',
].join(' ');

function factSheet() {
  const views = Object.entries(VIEWS).map(([id, v]) => `- View "${v.label}" (${id}): ${v.purpose} ${v.explain ?? ''}`).join('\n');
  const knowledge = KNOWLEDGE.map((k) => `- [${k.status}] ${k.text}${k.detail ? ` ${k.detail}` : ''}`).join('\n');
  const statics = STATIC_FACTS.map((f) => `- ${typeof f === 'string' ? f : f.text ?? JSON.stringify(f)}`).join('\n');
  const bounds = BOUNDARIES.map((b) => `- ${b.note}`).join('\n');
  return `VIEWS\n${views}\n\nKNOWLEDGE\n${knowledge}\n\nOTHER FACTS\n${statics}\n\nBOUNDARIES\n${bounds}`;
}

let cachedSheet = null;

export function astraConfig(env = {}) {
  return {
    apiKey: env.OPENAI_API_KEY || '',
    model: env.OPENAI_MODEL || 'gemini-3-flash-preview',
    baseUrl: (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
  };
}

async function chat(cfg, messages, { temperature = 0.2, timeoutMs = 60_000 } = {}) {
  const maxRetries = 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({ model: cfg.model, temperature, max_tokens: 350, messages }),
        signal: ctrl.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 503 && attempt < maxRetries) {
          clearTimeout(timer);
          const delay = (attempt + 1) * 2000;
          console.error('RETRY', attempt, 'delay', delay);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw Object.assign(new Error(json?.error?.message || `Model HTTP ${res.status}`), { status: 502 });
      }
      const out = json?.choices?.[0]?.message?.content;
      return typeof out === 'string' ? out.trim() : '';
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Model unavailable after retries');
}

/** Returns { status, body } so both the Vite middleware and Vercel can use it. */
export async function handleAstra(method, rawBody, cfg = astraConfig()) {
  if (method === 'GET') return { status: 200, body: { enabled: Boolean(cfg.apiKey), model: cfg.apiKey ? cfg.model : null } };
  if (method !== 'POST') return { status: 405, body: { error: 'Method not allowed' } };
  if (!cfg.apiKey) return { status: 503, body: { error: 'Astra model backend is not configured (OPENAI_API_KEY missing).' } };

  const text = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody ?? {});
  if (text.length > MAX_BODY) return { status: 413, body: { error: 'Request too large' } };
  let body;
  try { body = JSON.parse(text || '{}'); } catch { return { status: 400, body: { error: 'Invalid JSON' } }; }

  const mode = body.mode;
  try {
    if (mode === 'phrase') {
      const draft = String(body.text ?? '').slice(0, 2000);
      if (!draft) return { status: 400, body: { error: 'text required' } };
      const out = await chat(cfg, [{ role: 'system', content: PHRASE_RULES }, { role: 'user', content: draft }], { timeoutMs: 8000 });
      return { status: 200, body: { text: out, model: cfg.model } };
    }
    if (mode === 'answer') {
      const question = String(body.question ?? '').slice(0, 600);
      if (!question) return { status: 400, body: { error: 'question required' } };
      cachedSheet ??= factSheet();
      const live = JSON.stringify(body.context ?? {}).slice(0, 8000);
      const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
      const messages = [
        { role: 'system', content: `${RULES}\n\nFACT SHEET\n${cachedSheet}\n\nLIVE APP STATE (JSON)\n${live}` },
        ...history
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m) => ({ role: m.role, content: m.content.slice(0, 800) })),
        { role: 'user', content: question },
      ];
      const out = await chat(cfg, messages, { temperature: 0.3, timeoutMs: 60_000 });
      return { status: 200, body: { text: out, model: cfg.model } };
    }
    return { status: 400, body: { error: 'mode must be "phrase" or "answer"' } };
  } catch (e) {
    const aborted = e?.name === 'AbortError';
    return { status: aborted ? 504 : e.status ?? 502, body: { error: aborted ? 'Model timed out' : e.message } };
  }
}
