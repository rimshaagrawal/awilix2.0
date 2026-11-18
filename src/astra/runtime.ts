// Browser wiring for Astra: injects the real Awilix science worker, ephemeris,
// terrain products and packaged data into the tool contract.
//
// Backend hand-off point: to serve Astra from a server instead, implement the
// same `deps` (or the tool functions in tools.js) behind an HTTP API and swap
// them in here. The agent, UI and validator do not need to change.

import { sites } from '@/data/sites';
import { DEFAULT_SCENARIO, getSummary } from '@/lib/scenarioCalculations';
import { requestScenarios } from '@/lib/scienceClient.js';
import { computePositions, loadMoonInfo2026 } from '@/lib/ephemeris.js';
import prospectivity from '@/data/ice-prospectivity.json';
import { createAstraTools } from './tools.js';
import { createAstraAgent } from './agent.js';
import { createPhraser } from './phraser.js';
import type { Scenario, View } from '@/types';

export type HorizonMode = 'reference' | 'terrain';

export interface AstraAppState {
  activeView: View;
  selectedSiteId: string;
  compareIds: string[];
  scenario: Scenario;
  horizonMode: HorizonMode;
  analysisTab: 'charts' | 'terrain';
  terrainHour: number;
}

export type AstraAction =
  | { type: 'navigate'; view: View; anchor?: string | null; label: string }
  | { type: 'highlight'; anchor: string; label: string }
  | { type: 'ask'; question: string; label: string }
  | { type: 'tour'; label: string }
  | { type: 'inspect'; label: string }
  | { type: 'explain-control'; control: string; label: string }
  | { type: 'predict'; id: string; label: string }
  | { type: 'preview-scenario'; changes: Partial<Scenario>; label: string; summary: string }
  | { type: 'set-compare'; siteIds: string[]; label: string }
  | { type: 'select-site'; siteId: string; label: string }
  | { type: 'set-terrain-hour'; hour: number; view?: View; label?: string };

export interface AstraSource { label: string; href?: string; kind?: string }

export interface AstraAnswer {
  id: string;
  intent: string;
  quick: string;
  why: string[];
  sources: AstraSource[];
  quality: string[];
  actions: AstraAction[];
  pose: 'idle' | 'waving' | 'pointing' | 'thinking' | 'celebrating' | 'puzzled';
  predict: null | { id: string; options: { id: string; label: string }[]; context: Record<string, number> };
  autoAction: AstraAction | null;
  startTour: boolean;
  validation?: { issues: { type: string; detail: string }[]; phrasedBy: string | null };
}

const terrainCache = new Map<string, Promise<any>>();
function fetchTerrain(id: string) {
  if (!terrainCache.has(id)) {
    terrainCache.set(id, fetch(`/science-terrain/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(`Terrain HTTP ${r.status}`);
      return r.json();
    }).catch((e) => { terrainCache.delete(id); throw e; }));
  }
  return terrainCache.get(id)!;
}

/** Loads the NASA 2026 table on the main thread (also used by the globe and terrain renderers). */
export const ensureEphemeris = (): Promise<boolean> => loadMoonInfo2026().then((data: unknown) => Boolean(data));

const tools = createAstraTools({
  sites,
  getSummary,
  defaultScenario: DEFAULT_SCENARIO,
  requestScenarios,
  fetchTerrain,
  prospectivity,
  computePositions,
  ensureEphemeris,
});

// Model backend at /api/astra (server/astra-llm.js). Set VITE_ASTRA_MODEL=off to force deterministic-only.
const env = (import.meta as any).env ?? {};
const phraser = createPhraser({ url: env.VITE_ASTRA_API_URL || 'https://awilix.onrender.com/api/astra', disabled: env.VITE_ASTRA_MODEL === 'off' });

const agent = createAstraAgent({ tools, phraser });

export const astra = {
  ask: (q: string, s: AstraAppState) => agent.ask(q, s) as Promise<AstraAnswer>,
  predict: (id: string, s: AstraAppState) => agent.predict(id, s) as AstraAnswer,
  reveal: (id: string, choice: string, ctx: Record<string, number>, s: AstraAppState) => agent.reveal(id, choice, ctx, s) as Promise<AstraAnswer>,
  explainControl: (id: string, s: AstraAppState) => agent.explainControl(id, s) as Promise<AstraAnswer>,
  explainPage: (s: AstraAppState) => agent.explainPage(s) as Promise<AstraAnswer>,
  get modelName() { return phraser?.enabled ? phraser.name : null; },
};

/** Asks the backend whether a model is configured (GET /api/astra). */
export async function probeAstraBackend(): Promise<{ enabled: boolean; model: string | null }> {
  try {
    const r = await fetch(env.VITE_ASTRA_API_URL || 'https://awilix.onrender.com/api/astra');
    if (!r.ok) return { enabled: false, model: null };
    return await r.json();
  } catch { return { enabled: false, model: null }; }
}

// ── tiny event bus so any component can hand Astra a question ───────────────
export type AstraRequest = { kind: 'ask'; question: string } | { kind: 'control'; id: string } | { kind: 'page' } | { kind: 'tour' } | { kind: 'inspect' };
const EVENT = 'astra:request';
export function requestAstra(detail: AstraRequest) {
  window.dispatchEvent(new CustomEvent<AstraRequest>(EVENT, { detail }));
}
export function onAstraRequest(handler: (r: AstraRequest) => void) {
  const fn = (e: Event) => handler((e as CustomEvent<AstraRequest>).detail);
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
