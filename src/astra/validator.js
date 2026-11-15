// Astra answer validator (Plan §5.4).
// 1. Every number in the answer must trace to a tool output, the reviewed fact
//    sheet, or the user's own question.
// 2. Scientific boundaries (no watts, no guaranteed link, no universal best
//    site, no measured ice, no glaciers) are enforced on the answer text.
// Offending sentences are removed; if nothing survives, a safe message is used.

import { BOUNDARIES, KNOWLEDGE, VIEWS, CONTROLS, STATIC_FACTS } from './facts.js';

const NEGATION = /\b(not|no|never|isn'?t|aren'?t|doesn'?t|don'?t|cannot|can'?t|without|nor|neither)\b/i;
const SKIP_KEYS =new Set(['path', 'intervals', 'blocked', 'bins', 'rawElev', 'sha256', 'solarProfile', 'earthProfile']);

function numbersInText(text) {
  const cleaned = String(text)
    .replace(/\b\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?\b/g, ' ')   // dates / ISO times
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ')             // clock times
    .replace(/\b[a-f0-9]{16,}\b/gi, ' ')                        // hashes
    .replace(/(\d),(\d{3})/g, '$1$2');                          // 8,760 → 8760
  return (cleaned.match(/-?\d+(?:\.\d+)?/g) ?? []).map((s) => ({ raw: s, value: Number(s), decimals: (s.split('.')[1] ?? '').length }));
}

function walk(value, out, depth = 0) {
  if (depth > 8 || value == null) return;
  if (typeof value === 'number') { if (Number.isFinite(value)) out.add(value); return; }
  if (typeof value === 'string') { for (const n of numbersInText(value)) out.add(n.value); return; }
  if (Array.isArray(value)) { value.slice(0, 64).forEach((v) => walk(v, out, depth + 1)); return; }
  if (typeof value === 'object') for (const [k, v] of Object.entries(value)) if (!SKIP_KEYS.has(k)) walk(v, out, depth + 1);
}

let approvedCache = null;
function approvedNumbers() {
  if (approvedCache) return approvedCache;
  approvedCache = new Set();
  walk([KNOWLEDGE, VIEWS, CONTROLS, STATIC_FACTS], approvedCache);
  return approvedCache;
}

/** Build the evidence set from tool results (and the question). */
export function collectEvidence(...sources) {
  const set = new Set(approvedNumbers());
  for (const s of sources) walk(s, set);
  return set;
}

function supported(token, evidence) {
  const v = Math.abs(token.value);
  // Small counting words in digit form (e.g. "1 site", "2 cases") are always fine.
  if (token.decimals === 0 && v <= 12) return true;
  const f = 10 ** token.decimals;
  for (const e of evidence) {
    const a = Math.abs(e);
    if (Math.round(a * f) / f === v) return true;
    if (token.decimals === 0 && Math.round(a) === v) return true;
  }
  return false;
}

function splitSentences(text) {
  // Split only at terminal punctuation followed by whitespace, so "37.39 h" and "DATA_SOURCES.md" stay intact.
  return String(text).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * @returns {{ok:boolean, text:string, issues:Array<{type:string, detail:string}>}}
 */
export function validateText(text, evidence) {
  const issues = [];
  const kept = [];
  for (const sentence of splitSentences(text)) {
    const bad = numbersInText(sentence).filter((t) => !supported(t, evidence));
    // Negated sentences ("is not a working link") state the boundary rather than break it.
    const boundary = NEGATION.test(sentence) ? null : BOUNDARIES.find((b) => b.pattern.test(sentence));
    if (bad.length) { issues.push({ type: 'unsupported-number', detail: `${bad.map((b) => b.raw).join(', ')} in “${sentence}”` }); continue; }
    if (boundary) { issues.push({ type: 'boundary', detail: `${boundary.id}: ${boundary.note}` }); continue; }
    kept.push(sentence);
  }
  return { ok: issues.length === 0, text: kept.join(' '), issues };
}

/** Validate a full structured answer in place (quick + why). */
export function validateAnswer(answer, evidence) {
  const issues = [];
  const q = validateText(answer.quick, evidence);
  issues.push(...q.issues);
  const why = [];
  for (const point of answer.why ?? []) {
    const r = validateText(point, evidence);
    issues.push(...r.issues);
    if (r.text) why.push(r.text);
  }
  const safeQuick = q.text || 'I could not produce an answer that I can fully back with Awilix data, so I am not going to guess. Try asking about this page, a control, or the calculated values.';
  return { answer: { ...answer, quick: safeQuick, why }, issues };
}
